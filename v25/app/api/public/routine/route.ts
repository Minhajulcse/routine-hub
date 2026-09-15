import { NextResponse } from "next/server";
import { getPublicRoutine, listSections, getPublishedVersions } from "../../../../lib/public-routine";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const versionId = url.searchParams.get("version") || undefined;
  const data = await getPublicRoutine(versionId);
  const versions = await getPublishedVersions();

  const response = NextResponse.json({
    version: data.version,
    entries: data.entries,
    sections: listSections(data.entries),
    versions
  });

  // Let Vercel/CDN absorb repeated public routine reads.
  // The browser-side cache is the main offline layer.
  response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  return response;
}
