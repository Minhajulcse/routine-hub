import { NextResponse } from "next/server";
import { getPublicRoutine, listSections } from "../../../../lib/public-routine";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = (url.searchParams.get("type") || "section").toLowerCase();
  const q = (url.searchParams.get("q") || "").trim().toUpperCase();

  if (!q) return NextResponse.json({ suggestions: [] });

  const data = await getPublicRoutine();

  let values: string[] = [];

  if (type === "teacher") {
    values = Array.from(new Set(data.entries.map(e => e.teacher))).sort();
  } else if (type === "room") {
    values = Array.from(new Set(data.entries.map(e => e.room))).sort();
  } else {
    values = listSections(data.entries);
  }

  const filtered = q
    ? values.filter(v => v.toUpperCase().includes(q))
    : values;

  return NextResponse.json({ suggestions: filtered.slice(0, 12) });
}
