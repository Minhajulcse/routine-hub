import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "routine-hub",
    timestamp: new Date().toISOString()
  });
}
