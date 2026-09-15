/**
 * The source routine contains special retake/repeat sections such as RE_A,
 * RE_A(2C), etc. They are not part of the regular class routine and must not
 * be shown, validated, or imported.
 */
export function normalizeSectionIdentifier(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function isRegularSection(value: unknown): boolean {
  const section = normalizeSectionIdentifier(value);
  return Boolean(section) && !section.startsWith("RE_");
}
