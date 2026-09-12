export type ScheduleCandidate = {
  section: string;
  teacher?: string;
  room?: string;
  day: string;
  startTime: string;
  endTime?: string;
  courseCode?: string;
};

export type Conflict = {
  type: "SECTION";
  message: string;
};

function clean(v: unknown) {
  return String(v ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

function toMinutes(value: string) {
  const m = clean(value).match(/(\d{1,2}):(\d{2})/);
  if (!m) return Number.NaN;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour >= 1 && hour <= 7) hour += 12;
  return hour * 60 + minute;
}

function parseRange(entry: ScheduleCandidate) {
  const raw = String(entry.startTime ?? "").replace(/[–—]/g, "-");
  const [a, b] = raw.split("-").map(s => s.trim());
  const start = toMinutes(a);
  const end = toMinutes(entry.endTime || b || "");
  return { start, end: Number.isFinite(end) ? end : start + 1 };
}

/** Remove repeated extraction rows before validation/import. */
export function dedupeScheduleCandidates<T extends ScheduleCandidate>(entries: T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = [clean(e.day), clean(e.section), clean(e.courseCode), clean(e.startTime), clean(e.endTime), clean(e.teacher), clean(e.room)].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Different sections can legitimately use the same teacher or room at the same
 * time in source PDFs. Exact duplicate extraction rows are automatically
 * removed, so the only blocking conflict is a real time overlap inside the
 * SAME section on the SAME day.
 */
export function detectConflicts(entries: ScheduleCandidate[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const rows = dedupeScheduleCandidates(entries).map((entry, index) => ({ entry, index, range: parseRange(entry) }));

  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    const sectionA = clean(a.entry.section);
    if (!sectionA || !Number.isFinite(a.range.start) || !Number.isFinite(a.range.end)) continue;

    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j];
      if (clean(a.entry.day) !== clean(b.entry.day)) continue;
      if (sectionA !== clean(b.entry.section)) continue;
      if (!Number.isFinite(b.range.start) || !Number.isFinite(b.range.end)) continue;

      const overlaps = a.range.start < b.range.end && b.range.start < a.range.end;
      if (overlaps) {
        conflicts.push({
          type: "SECTION",
          message: `Section ${sectionA} has overlapping classes on ${a.entry.day}: ${a.entry.startTime} and ${b.entry.startTime}.`,
        });
      }
    }
  }
  return conflicts;
}
