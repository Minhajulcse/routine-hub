"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LogOut, ShieldCheck, Database, Upload } from "lucide-react";
import PdfUploadReview from "../../components/admin/PdfUploadReview";
import RoutineEditor, { EditableRecord } from "../../components/admin/RoutineEditor";
import VersionManager from "../../components/admin/VersionManager";

export default function AdminPage() {
  const [records, setRecords] = useState<EditableRecord[]>([]);
  const [sourceFileName, setSourceFileName] = useState("");
  const [sourceVersion, setSourceVersion] = useState("");
  const [versionKey, setVersionKey] = useState(0);
  async function logout() { await fetch("/api/admin/logout", {method:"POST"}); window.location.href="/admin/login"; }
  return <main className="min-h-screen px-4 py-8 md:px-10"><div className="mx-auto max-w-7xl">
    <div className="mb-8 flex items-start justify-between gap-4"><div><Link href="/" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/> Public Routine</Link><div className="flex items-center gap-4"><img src="/routine-hub-logo.webp" alt="Routine Hub logo" className="h-16 w-16 rounded-full object-cover shadow-[0_0_24px_rgba(54,210,210,0.16)]"/><div><h1 className="text-3xl font-black">Routine Hub Admin</h1><p className="mt-1 text-slate-400">Only the admin can replace the source routine PDF and publish a new routine.</p></div></div></div><button onClick={logout} className="flex items-center gap-2 rounded-xl border border-[#3d4350] px-4 py-2 text-sm text-slate-300"><LogOut size={16}/> Logout</button></div>
    <div className="mb-6 grid gap-4 md:grid-cols-3"><div className="glass rounded-2xl p-5"><ShieldCheck className="mb-3 text-emerald-300"/><b>Admin Only</b><p className="mt-1 text-xs text-slate-400">Source PDF upload is protected by admin authentication.</p></div><div className="glass rounded-2xl p-5"><Upload className="mb-3 text-[#aaa5ff]"/><b>Automatic Extraction</b><p className="mt-1 text-xs text-slate-400">Read timetable columns, courses, sections, rooms and teachers.</p></div><div className="glass rounded-2xl p-5"><Database className="mb-3 text-cyan-300"/><b>Publish New Routine</b><p className="mt-1 text-xs text-slate-400">Review extracted data, save it, then publish the version.</p></div></div>
    <div className="space-y-6"><PdfUploadReview onExtracted={(data,fileName,version)=>{setRecords(data);setSourceFileName(fileName);setSourceVersion(version);}}/><RoutineEditor initialRecords={records} sourceFileName={sourceFileName} sourceVersion={sourceVersion} onSaved={()=>setVersionKey(k=>k+1)}/><VersionManager key={versionKey}/></div>
  </div></main>;
}
