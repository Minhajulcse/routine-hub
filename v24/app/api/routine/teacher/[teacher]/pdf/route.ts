import { NextResponse } from "next/server";
import { getPublicRoutine } from "../../../../../../lib/public-routine";
import { buildRoutinePdf } from "../../../../../../lib/routine-pdf";
export const runtime="nodejs";
export async function GET(_:Request,{params}:{params:{teacher:string}}){const teacher=decodeURIComponent(params.teacher).trim().toUpperCase(),data=await getPublicRoutine();const entries=data.entries.filter(e=>e.teacher.toUpperCase().includes(teacher));if(!entries.length)return NextResponse.json({error:"Teacher not found."},{status:404});const {buffer,filename}=await buildRoutinePdf({title:"Teaching Schedule",subject:`Faculty: ${teacher}`,version:data.version,entries,filename:`teacher-${teacher}.pdf`,teacherMode:true});return new NextResponse(Uint8Array.from(buffer),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${filename}"`}});}
