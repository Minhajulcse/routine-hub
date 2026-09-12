import { requireAdmin } from "../../../../../../lib/require-admin";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await prisma.routineVersion.update({
      where: { id: params.id },
      data: { status: "ARCHIVED" }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unpublish failed." }, { status: 500 });
  }
}
