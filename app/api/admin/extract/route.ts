import { requireAdmin } from "../../../../lib/require-admin";
import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import { fullCourseName } from "../../../../data/routine";
import { isRegularSection } from "../../../../lib/section-filter";

export const runtime = "nodejs";

const DAYS = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"];
const TIMES = ["08:30-10:00", "10:00-11:30", "11:30-01:00", "01:00-02:30", "02:30-04:00", "04:00-05:30"];
const TIME_RE = /\b(?:0?8:30\s*[-–—]\s*10:00|10:00\s*[-–—]\s*11:30|11:30\s*[-–—]\s*01:00|01:00\s*[-–—]\s*02:30|02:30\s*[-–—]\s*04:00|04:00\s*[-–—]\s*05:30)\b/g;
const ROOM_RE = /\b(?:KT|G1|G2|ANX1|ANX2|SH)-\d{3}(?:\s*\([^)]{1,18}\))?/g;
const COURSE_RE = /\b([A-Z]{2,5}\d{3})\((?:[^()]|\([^()]*\))*\)/g;
const TEACHER_RE = /\b[A-Z][A-Z0-9_]{1,12}\b/g;

function normalizeSection(raw: string) {
  const m = raw.match(/(\d+)\s*[_-]\s*([A-Z0-9]+)/i);
  return m ? `${m[1]}_${m[2].toUpperCase()}` : raw.replace(/[\s-]+/g, "_").toUpperCase();
}

function sectionFromCourse(value: string) {
  const m = value.match(/\((.*)\)/);
  return m ? normalizeSection(m[1]) : "";
}

function clean(value: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function extractSourceVersion(text: string) {
  // Official routine PDFs always contain a visible version label, e.g.
  // "Version V5", "Version 2.1" or "Version No: 3.0". Keep the
  // value from the source document instead of inventing our own version.
  const match = text.match(/\bversion(?:\s*(?:no\.?|number))?\s*[:#\-–—]?\s*((?:v\s*)?\d+(?:\.\d+)*(?:\s*[a-z])?)/i);
  if (!match) return "";
  return match[1].replace(/\s+/g, "").trim().toUpperCase();
}

function teacherFromTail(value: string) {
  for (const match of Array.from(value.matchAll(TEACHER_RE))) {
    const candidate = match[0].toUpperCase();
    if (!new Set(["ROOM", "COURSE", "TEACHER", "COM", "LAB", "KT", "G1", "G2", "AM", "PM"]).has(candidate)) return candidate;
  }
  return "";
}

/**
 * The routine PDF is a real six-column timetable. Never use a hard-coded
 * character width for the columns: PDF text extraction can change spacing from
 * page to page. Instead, read the actual positions of the six time headings
 * from the rendered layout and map every course/room to the nearest column.
 */
function detectTimeColumns(line: string): number[] | null {
  const normalized = line.replace(/[–—]/g, "-");
  const starts: number[] = [];
  let from = 0;
  for (const time of TIMES) {
    const index = normalized.indexOf(time, from);
    if (index < 0) return null;
    starts.push(index);
    from = index + time.length;
  }
  return starts.length === TIMES.length ? starts : null;
}

function slotAt(position: number, columns: number[]) {
  if (columns.length !== TIMES.length) {
    return Math.max(0, Math.min(5, Math.floor(position / 50)));
  }

  let bestSlot = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < columns.length; i++) {
    const distance = Math.abs(position - columns[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSlot = i;
    }
  }
  return bestSlot;
}

/**
 * Rebuild a fixed-width representation from PDF text coordinates.  This keeps
 * the six timetable columns intact, unlike ordinary PDF text extraction where
 * columns are often flattened into one sentence.
 */
async function renderLayout(pageData: any) {
  const content = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
  const rows = new Map<number, Array<{ x: number; text: string }>>();

  for (const item of content.items as any[]) {
    const text = String(item.str ?? "");
    if (!text) continue;
    const x = Number(item.transform?.[4] ?? 0);
    const y = Number(item.transform?.[5] ?? 0);
    // A small bucket groups fragments that visually belong to the same row.
    const key = Math.round(y / 2) * 2;
    const list = rows.get(key) ?? [];
    list.push({ x, text });
    rows.set(key, list);
  }

  return Array.from(rows.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, items]) => {
      items.sort((a, b) => a.x - b.x);
      let line = "";
      let cursor = 0;
      for (const item of items) {
        // ~2 PDF points per pdftotext layout character keeps the six 49-char slots aligned.
        const col = Math.max(0, Math.round(item.x / 2.0));
        if (col > cursor) line += " ".repeat(col - cursor);
        else if (line && !line.endsWith(" ")) line += " ";
        line += item.text;
        cursor = Math.max(cursor, col + item.text.length);
      }
      return line.replace(/\s+$/g, "");
    })
    .join("\n");
}

function parseLayout(text: string) {
  // Keep leading spaces: they encode the original timetable column positions.
  const lines = text.split(/\r?\n/).map(line => line.replace(/\s+$/g, "")).filter(line => line.trim().length > 0);
  const records: Array<any> = [];
  const seen = new Set<string>();
  let currentDay = "";
  let rooms = Array(6).fill("") as string[];
  // Updated whenever a page/day header contains the six printed time columns.
  let columns = [0, 50, 100, 150, 200, 250];

  const push = (day: string, time: string, room: string, courseSection: string, teacher: string) => {
    const section = sectionFromCourse(courseSection);
    const courseCode = courseSection.match(/[A-Z]{2,5}\d{3}/)?.[0] ?? "";
    if (!day || !time || !room || !courseCode || !section || !teacher) return;
    // RE_* rows are special retake/repeat entries, not regular routine classes.
    if (!isRegularSection(section)) return;
    const key = [day, time, room, courseSection, teacher].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    records.push({
      day,
      time,
      room: clean(room),
      courseCode,
      courseName: fullCourseName(courseCode),
      section,
      courseSection: clean(courseSection),
      teacher: teacher.toUpperCase(),
    });
  };

  for (const line of lines) {
    // Time headings are the authoritative column map for this PDF/page.
    const detectedColumns = detectTimeColumns(line);
    if (detectedColumns) {
      columns = detectedColumns;
      continue;
    }

    const upper = line.trim().toUpperCase();
    if (DAYS.includes(upper)) {
      currentDay = upper[0] + upper.slice(1).toLowerCase();
      rooms = Array(6).fill("");
      continue;
    }
    if (!currentDay) continue;

    // Rooms may be printed on their own physical line for LAB rows.
    for (const roomMatch of Array.from(line.matchAll(ROOM_RE))) {
      rooms[slotAt(roomMatch.index ?? 0, columns)] = clean(roomMatch[0]);
    }

    const courses = Array.from(line.matchAll(COURSE_RE));
    for (let i = 0; i < courses.length; i++) {
      const m = courses[i];
      const slot = slotAt(m.index ?? 0, columns);
      const end = i + 1 < courses.length ? (courses[i + 1].index ?? line.length) : line.length;
      const tail = line.slice((m.index ?? 0) + m[0].length, end);
      const teacher = teacherFromTail(tail);
      const room = rooms[slot];
      if (room && teacher) push(currentDay, TIMES[slot], room, m[0], teacher);
    }
  }

  return records;
}

function parseFlatFallback(text: string) {
  const records: Array<any> = [];
  let currentDay = "";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = clean(rawLine);
    if (!line) continue;
    const upper = line.trim().toUpperCase();
    if (DAYS.includes(upper)) { currentDay = upper[0] + upper.slice(1).toLowerCase(); continue; }
    if (!currentDay) continue;
    const course = line.match(/([A-Z]{2,5}\d{3})\(([^)]+)\)/);
    const room = line.match(ROOM_RE)?.[0];
    const time = line.match(TIME_RE)?.[0]?.replace(/[–—]/g, "-").replace(/\s+/g, "");
    if (!course || !room || !time) continue;
    const tail = line.slice((course.index ?? 0) + course[0].length);
    const teacher = teacherFromTail(tail);
    if (!teacher) continue;
    const section = normalizeSection(course[2]);
    if (!isRegularSection(section)) continue;
    records.push({ day: currentDay, time, room, courseCode: course[1], courseName: fullCourseName(course[1]), section, courseSection: course[0], teacher });
  }
  return records;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "PDF is too large. Maximum size is 4 MB." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdf(buffer, { pagerender: renderLayout as any });
    const layoutText = parsed.text || "";
    // Use a normal text pass for metadata such as Version. The layout-aware
    // pass is still used for the timetable because it preserves columns.
    const plain = await pdf(buffer);
    const plainText = plain.text || "";
    const sourceVersion = extractSourceVersion(plainText) || extractSourceVersion(layoutText);
    let records = parseLayout(layoutText);

    if (!records.length) {
      records = parseFlatFallback(plainText);
    }

    return NextResponse.json({
      fileName: file.name,
      pages: parsed.numpages,
      extractedCharacters: layoutText.length,
      sourceVersion,
      records,
      warnings: records.length === 0
        ? ["No structured classes were detected. This PDF may be image-only and needs OCR."]
        : ["Extraction is layout-aware. Review the table, then save and publish the new routine version."],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "PDF extraction failed." }, { status: 500 });
  }
}
