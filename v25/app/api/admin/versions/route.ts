import { requireAdmin } from "../../../../lib/require-admin";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const versions = await prisma.routineVersion.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { schedules: true } } }
    });
    return NextResponse.json({ versions });
  } catch (error) {
    return NextResponse.json({ error: "Database unavailable.", versions: [] }, { status: 500 });
  }
}
