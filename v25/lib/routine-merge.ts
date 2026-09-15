export type RoutineLikeEntry = {
  day: string;
  time: string;
  room: string;
  courseSection: string;
  courseName?: string;
  teacher: string;
};

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

function clockToMinutes(value: string): number | null {
  const m = clean(value).toUpperCase().match(/(\d{1,2})\s*[:.]\s*(\d{2})\s*(AM|PM)?/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const meridiem = m[3];

  if (meridiem === "PM" && hour < 12) hour += 12;
  else if (meridiem === "AM" && hour === 12) hour = 0;
  // DIU routine PDFs commonly write afternoon slots as 01:00-04:00 without PM.
  else if (!meridiem && hour >= 1 && hour <= 4) hour += 12;

  return hour * 60 + minute;
}

function parseRange(time: string) {
  const parts = clean(time).split(/\s*(?:-|–|—|to)\s*/i).filter(Boolean);
  if (parts.length < 2) return null;
  const start = clockToMinutes(parts[0]);
  let end = clockToMinutes(parts[1]);
  if (start == null || end == null) return null;
  while (end <= start) end += 12 * 60;
  return { start, end, startText: clean(parts[0]), endText: clean(parts[1]) };
}

function isLab(entry: RoutineLikeEntry) {
  return /\blab\b/i.test(`${entry.courseName ?? ""} ${entry.courseSection ?? ""}`);
}

function sameClass(a: RoutineLikeEntry, b: RoutineLikeEntry) {
  return clean(a.day).toLowerCase() === clean(b.day).toLowerCase()
    && clean(a.courseSection).toLowerCase() === clean(b.courseSection).toLowerCase()
    && clean(a.courseName).toLowerCase() === clean(b.courseName).toLowerCase()
    && clean(a.room).toLowerCase() === clean(b.room).toLowerCase()
    && clean(a.teacher).toLowerCase() === clean(b.teacher).toLowerCase();
}

/**
 * Some lab classes are extracted as consecutive slot rows (for example
 * 08:30-10:00 and 10:00-11:30).  For display/export, collapse only
 * consecutive LAB rows that have the same day, course, room and teacher.
 */
export function mergeConsecutiveLabEntries<T extends RoutineLikeEntry>(entries: T[]): T[] {
  const result: T[] = [];

  for (const original of entries) {
    const current = { ...original } as T;
    const previous = result[result.length - 1];

    if (!previous || !isLab(previous) || !isLab(current) || !sameClass(previous, current)) {
      result.push(current);
      continue;
    }

    const prevRange = parseRange(previous.time);
    const currentRange = parseRange(current.time);
    if (!prevRange || !currentRange) {
      result.push(current);
      continue;
    }

    // Merge only adjacent/continuous slots. A gap means two different classes.
    if (prevRange.end === currentRange.start) {
      previous.time = `${prevRange.startText}-${currentRange.endText}`;
    } else if (currentRange.end === prevRange.start) {
      previous.time = `${currentRange.startText}-${prevRange.endText}`;
    } else {
      result.push(current);
    }
  }

  return result;
}

export function routineTimeKey(value: string) {
  return parseRange(value)?.start ?? Number.MAX_SAFE_INTEGER;
}
