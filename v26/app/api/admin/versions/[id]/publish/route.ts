import { requireAdmin } from "../../../../../../lib/require-admin";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await prisma.$transaction([
      prisma.routineVersion.updateMany({
        where: { status: "PUBLISHED" },
        data: { status: "ARCHIVED" }
      }),
      prisma.routineVersion.update({
        where: { id: params.id },
        data: { status: "PUBLISHED", publishedAt: new Date() }
      })
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Publish failed." }, { status: 500 });
  }
}
