"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, LogOut, ShieldCheck, Database, Upload, Sparkles } from "lucide-react";
import PdfUploadReview from "../../components/admin/PdfUploadReview";
import RoutineEditor, { EditableRecord } from "../../components/admin/RoutineEditor";
import VersionManager from "../../components/admin/VersionManager";

export default function AdminPage() {
  const [records, setRecords] = useState<EditableRecord[]>([]);
  const [sourceFileName, setSourceFileName] = useState("");
  const [sourceVersion, setSourceVersion] = useState("");
  const [versionKey, setVersionKey] = useState(0);
  async function logout() { await fetch("/api/admin/logout", {method:"POST"}); window.location.href="/admin/login"; }

  return <main className="admin-shell"><div className="admin-width">
    <header className="admin-top">
      <div>
        <Link href="/" className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15}/> Public Routine</Link>
        <div className="brand-mark"><img src="/routine-hub-logo.webp" alt="Routine Hub logo" className="routine-hub-logo logo"/><div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Routine Hub Admin</h1><p className="admin-description mt-1 text-sm text-[var(--text-muted)]">Import, review and publish the official academic routine.</p></div></div>
      </div>
      <button onClick={logout} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[.03] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-soft)]"><LogOut size={15}/> Logout</button>
    </header>

    <div className="admin-cards mb-4">
      {[[ShieldCheck,"Protected workflow","Only authenticated admins can change the routine."],[Upload,"PDF extraction","Turn the official source PDF into editable schedule rows."],[Database,"Versioned publishing","Review, save and publish without replacing history."]].map(([Icon,title,desc]:any)=><div key={title} className="glass admin-card"><Icon size={18} className="mb-3 text-[var(--accent)]"/><div className="font-bold text-sm">{title}</div><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{desc}</p></div>)}
    </div>

    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/[.025] px-4 py-3 text-xs text-[var(--text-muted)]"><Sparkles size={15} className="text-[var(--accent)]"/>Recommended flow: upload PDF → inspect extracted rows → save draft → publish the approved version.</div>

    <div className="space-y-4">
      <PdfUploadReview onExtracted={(data,fileName,version)=>{setRecords(data);setSourceFileName(fileName);setSourceVersion(version);}}/>
      <RoutineEditor initialRecords={records} sourceFileName={sourceFileName} sourceVersion={sourceVersion} onSaved={()=>setVersionKey(k=>k+1)}/>
      <VersionManager key={versionKey}/>
    </div>
  </div></main>;
}
