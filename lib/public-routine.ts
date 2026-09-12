import { prisma } from "./prisma";
import { routineEntries, sectionFromCourse, fullCourseName } from "../data/routine";

export async function getPublishedVersions() {
  try {
    return await prisma.routineVersion.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: { id: true, name: true, publishedAt: true, createdAt: true }
    });
  } catch {
    return [];
  }
}

export async function getPublishedRoutine(versionId?: string) {
  try {
    const version = versionId
      ? await prisma.routineVersion.findFirst({
          where: { id: versionId, status: "PUBLISHED" }
        })
      : await prisma.routineVersion.findFirst({
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" }
        });

    if (!version) return null;

    const schedules = await prisma.schedule.findMany({
      where: { routineVersionId: version.id },
      include: { course: true, section: true, teacher: true, room: true },
      orderBy: [{ day: "asc" }, { startTime: "asc" }]
    });

    return {
      version,
      entries: schedules.map(s => ({
        day: s.day,
        time: `${s.startTime}-${s.endTime}`,
        room: s.room.roomNumber,
        courseSection: `${s.course.code}(${s.section.identifier})`,
        courseName: fullCourseName(s.course.code, s.course.name || undefined),
        teacher: s.teacher.initial
      }))
    };
  } catch {
    return null;
  }
}

export async function getPublicRoutine(versionId?: string) {
  const published = await getPublishedRoutine(versionId);
  if (published?.entries.length) return published;

  // Demo fallback while no PostgreSQL published version exists.
  return {
    version: { id: "demo-v5", name: "Routine V5 (Demo Dataset)", publishedAt: null },
    entries: routineEntries.map(e => ({
      ...e,
      courseName: fullCourseName(e.courseSection)
    }))
  };
}

export function listSections(entries: {courseSection:string}[]) {
  return Array.from(new Set(entries.map(e => sectionFromCourse(e.courseSection)).filter(Boolean))).sort();
}
