import { NextResponse } from "next/server";
import { getPublicRoutine } from "../../../../../lib/public-routine";
import { buildRoutinePdf } from "../../../../../lib/routine-pdf";
export const runtime="nodejs";
const normalize=(v:string)=>decodeURIComponent(v).trim().toUpperCase().replace(/[\s-]+/g,"_");
const sectionOf=(v:string)=>v.match(/\(([^)]+)\)/)?.[1]||"";
const base=(v:string)=>normalize(v).replace(/\d+$/,"");
export async function GET(_:Request,{params}:{params:{section:string}}){const section=normalize(params.section),data=await getPublicRoutine();const entries=data.entries.filter(e=>base(sectionOf(e.courseSection))===base(section));if(!entries.length)return NextResponse.json({error:"Section not found."},{status:404});const {buffer,filename}=await buildRoutinePdf({title:"Routine Hub Class Schedule",subject:section,version:data.version,entries,filename:`routine-${section}.pdf`});return new NextResponse(Uint8Array.from(buffer),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${filename}"`}});}
