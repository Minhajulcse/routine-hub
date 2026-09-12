"use client";

import { useState } from "react";
import { Upload, FileText, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { EditableRecord } from "./RoutineEditor";

export default function PdfUploadReview({ onExtracted }: { onExtracted?: (records: EditableRecord[], fileName: string, sourceVersion: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function extract() {
    if (!file) return;
    setLoading(true); setResult(null);
    const form = new FormData(); form.append("file", file);
    try {
      const res = await fetch("/api/admin/extract", { method: "POST", body: form });
      const data = await res.json(); setResult(data);
      if (res.ok) onExtracted?.(data.records ?? [], file.name, String(data.sourceVersion || ""));
    } catch { setResult({ error: "Could not upload or extract this PDF." }); }
    finally { setLoading(false); }
  }

  return <section className="glass rounded-2xl p-5"><div className="mb-4 flex items-center gap-2"><Upload size={19} className="text-[#a99cff]"/><div><h2 className="font-bold">Upload Official Source Routine PDF</h2><p className="text-xs text-slate-400">Admin only • Upload → automatic extraction → review → save → publish</p></div></div>
    <label className="block cursor-pointer rounded-xl border border-dashed border-[#5a6170] bg-black/10 p-6 text-center hover:bg-white/5"><FileText className="mx-auto mb-2 text-slate-400"/><div className="text-sm font-semibold">{file ? file.name : "Choose official routine PDF"}</div><div className="mt-1 text-xs text-slate-500">PDF only • maximum 4 MB</div><input type="file" accept="application/pdf" className="hidden" onChange={e=>setFile(e.target.files?.[0] ?? null)}/></label>
    <button disabled={!file || loading} onClick={extract} className="gradient mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-50">{loading ? <><Loader2 size={17} className="animate-spin"/> Reading source PDF...</> : "Extract All Routine Data"}</button>
    {result && <div className="mt-5 space-y-3">{result.error ? <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{result.error}</div> : <><div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300"><div className="flex items-center gap-2"><CheckCircle2 size={16}/> {result.records?.length ?? 0} classes extracted</div><div className="mt-1 text-xs opacity-80">{result.pages} pages • layout-aware extraction{result.sourceVersion ? ` • Source version: ${result.sourceVersion}` : ""}</div></div>{result.warnings?.map((w:string,i:number)=><div key={i} className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200"><AlertTriangle size={15} className="shrink-0"/>{w}</div>)}</>}</div>}
  </section>;
}
