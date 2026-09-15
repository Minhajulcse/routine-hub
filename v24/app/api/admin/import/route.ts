import { requireAdmin } from "../../../../lib/require-admin";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { dedupeScheduleCandidates, detectConflicts } from "../../../../lib/routine-validation";
import { isRegularSection } from "../../../../lib/section-filter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let versionId: string | null = null;

  try {
    await requireAdmin();
    const body = await request.json();
    const records = Array.isArray(body.records) ? body.records : [];
    const versionName = String(body.versionName || "Routine Import");
    const sourceFileName = String(body.sourceFileName || "");

    if (!records.length) {
      return NextResponse.json({ error: "No routine records supplied." }, { status: 400 });
    }

    const normalized = records
      .map((r: any) => ({
        day: String(r.day || "").trim(),
        time: String(r.time || "").replace(/[–—]/g, "-").replace(/\s+/g, ""),
        room: String(r.room || "").trim(),
        courseCode: String(r.courseCode || "").trim().toUpperCase(),
        courseName: String(r.courseName || "").trim(),
        section: String(r.section || "").trim().toUpperCase(),
        teacher: String(r.teacher || "").trim().toUpperCase()
      }))
      .filter((r: any) =>
        r.day && r.time && r.room && r.courseCode && r.section && r.teacher && isRegularSection(r.section)
      );

    const unique = dedupeScheduleCandidates(
      normalized.map((r: any) => ({ ...r, startTime: r.time }))
    ).map(({ startTime, ...r }: any) => ({ ...r, time: startTime }));

    if (!unique.length) {
      return NextResponse.json(
        { error: "No regular class records to import. RE_* sections are skipped." },
        { status: 400 }
      );
    }

    const conflicts = detectConflicts(
      unique.map((r: any) => ({
        section: r.section,
        teacher: r.teacher,
        room: r.room,
        day: r.day,
        startTime: r.time,
        courseCode: r.courseCode
      }))
    );

    if (conflicts.length) {
      return NextResponse.json(
        { error: "Resolve real section overlaps before import.", conflicts },
        { status: 409 }
      );
    }

    // Keep database round-trips low. The previous implementation performed one
    // upsert per section/course/teacher/room, which can be very slow over a hosted
    // Supabase connection. Bulk inserts plus skipDuplicates are much faster.
    const department = await prisma.department.upsert({
      where: { code: "CSE" },
      update: {},
      create: { code: "CSE", name: "Computer Science and Engineering" }
    });

    const version = await prisma.routineVersion.create({
      data: {
        name: versionName,
        sourceFile: sourceFileName || null,
        status: "REVIEW"
      }
    });
    versionId = version.id;

    const sectionValues = Array.from(new Set(unique.map((r: any) => r.section)));
    const courseMap = new Map<string, string | null>();
    for (const r of unique) {
      if (!courseMap.has(r.courseCode)) courseMap.set(r.courseCode, r.courseName || null);
    }
    const teacherValues = Array.from(new Set(unique.map((r: any) => r.teacher)));
    const roomValues = Array.from(new Set(unique.map((r: any) => r.room)));

    await Promise.all([
      prisma.section.createMany({
        data: sectionValues.map((identifier) => {
          const [batch, ...rest] = identifier.split("_");
          return {
            departmentId: department.id,
            batch: batch || identifier,
            section: rest.join("_") || "A",
            identifier
          };
        }),
        skipDuplicates: true
      }),
      prisma.course.createMany({
        data: Array.from(courseMap.entries()).map(([code, name]) => ({
          departmentId: department.id,
          code,
          name
        })),
        skipDuplicates: true
      }),
      prisma.teacher.createMany({
        data: teacherValues.map((initial) => ({
          departmentId: department.id,
          initial
        })),
        skipDuplicates: true
      }),
      prisma.room.createMany({
        data: roomValues.map((roomNumber) => ({ roomNumber })),
        skipDuplicates: true
      })
    ]);

    // Fetch all foreign-key IDs in four queries, then insert every schedule in one batch.
    const [sections, courses, teachers, rooms] = await Promise.all([
      prisma.section.findMany({ where: { identifier: { in: sectionValues } }, select: { id: true, identifier: true } }),
      prisma.course.findMany({ where: { departmentId: department.id, code: { in: Array.from(courseMap.keys()) } }, select: { id: true, code: true } }),
      prisma.teacher.findMany({ where: { departmentId: department.id, initial: { in: teacherValues } }, select: { id: true, initial: true } }),
      prisma.room.findMany({ where: { roomNumber: { in: roomValues } }, select: { id: true, roomNumber: true } })
    ]);

    const sectionId = new Map(sections.map((x) => [x.identifier, x.id]));
    const courseId = new Map(courses.map((x) => [x.code, x.id]));
    const teacherId = new Map(teachers.map((x) => [x.initial, x.id]));
    const roomId = new Map(rooms.map((x) => [x.roomNumber, x.id]));

    const schedules = unique.map((r: any) => {
      const [startTime, endTime = ""] = r.time.split("-");
      const section = sectionId.get(r.section);
      const course = courseId.get(r.courseCode);
      const teacher = teacherId.get(r.teacher);
      const room = roomId.get(r.room);

      if (!section || !course || !teacher || !room) {
        throw new Error(`Failed to resolve database IDs for ${r.courseCode} (${r.section}).`);
      }

      return {
        routineVersionId: version.id,
        courseId: course,
        sectionId: section,
        teacherId: teacher,
        roomId: room,
        day: r.day,
        startTime,
        endTime
      };
    });

    await prisma.schedule.createMany({ data: schedules });

    return NextResponse.json({
      ok: true,
      versionId: version.id,
      imported: unique.length,
      duplicatesRemoved: normalized.length - unique.length
    });
  } catch (error: any) {
    if (versionId) {
      try {
        await prisma.routineVersion.delete({ where: { id: versionId } });
      } catch {}
    }

    const message = error?.code === "P2002"
      ? "Database still has an old uniqueness rule. Run: npx prisma db push"
      : error instanceof Error
        ? error.message
        : "Database import failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
