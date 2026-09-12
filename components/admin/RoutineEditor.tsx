"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Database, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { dedupeScheduleCandidates, detectConflicts } from "../../lib/routine-validation";
import { fullCourseName } from "../../data/routine";
import { isRegularSection } from "../../lib/section-filter";

export type EditableRecord = {
  day: string; time: string; room: string; courseCode: string; courseName?: string; section: string; teacher: string;
};

const blank: EditableRecord = { day:"Sunday", time:"08:30-10:00", room:"", courseCode:"", courseName:"", section:"", teacher:"" };

export default function RoutineEditor({ initialRecords = [], sourceFileName = "", sourceVersion = "", onSaved }: { initialRecords?: EditableRecord[]; sourceFileName?: string; sourceVersion?: string; onSaved?: ()=>void }) {
  const [records, setRecords] = useState<EditableRecord[]>(initialRecords);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Important: a newly extracted PDF arrives after this component has mounted.
  // Synchronise the editor so the admin immediately sees every extracted class.
  useEffect(() => {
    const regularRecords = initialRecords.filter(r => isRegularSection(r.section));
    setRecords(dedupeScheduleCandidates(regularRecords.map(r => ({ ...r, startTime: r.time }))).map(({ startTime, ...r }) => ({ ...r, time: startTime })));
    setMessage("");
  }, [initialRecords]);

  const conflicts = useMemo(() => detectConflicts(records.map(r=>({ section:r.section, teacher:r.teacher, room:r.room, day:r.day, startTime:r.time, courseCode:r.courseCode })).filter(r=>r.section && r.day && r.startTime)), [records]);

  function update(i:number, key:keyof EditableRecord, value:string) {
    setRecords(rows => rows.map((row,index)=> {
      if (index !== i) return row;
      const next = { ...row, [key]: value };
      if (key === "courseCode") next.courseName = fullCourseName(value);
      return next;
    }));
  }
  function add() { setRecords(r=>[...r, {...blank}]); }
  function remove(i:number) { setRecords(r=>r.filter((_,index)=>index!==i)); }

  async function save() {
    if (!records.length || saving) return;
    setMessage("");
    const regularRecords = records.filter(r => isRegularSection(r.section));
    if (!regularRecords.length) {
      setMessage("No regular class sections to import. RE_* sections are skipped.");
      return;
    }

    setSaving(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch("/api/admin/import", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ versionName: sourceVersion ? `Version ${sourceVersion}` : `Routine Import ${new Date().toLocaleDateString()}`, sourceFileName, records: regularRecords }),
        signal: controller.signal
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(`Imported ${data.imported} classes successfully. Now publish this version from Version History.`);
        onSaved?.();
      } else {
        const details = Array.isArray(data.conflicts) && data.conflicts.length
          ? ` ${data.conflicts.slice(0, 2).map((c:any) => c.message).join(" ")}`
          : "";
        setMessage((data.error || "Import failed.") + details);
      }
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError"
        ? "Saving took too long and was stopped. Please try again."
        : "Could not save the routine. Please check the server and database connection.");
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  }

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-bold">Extracted Routine Review</h2><p className="text-xs text-slate-400">Every detected class is editable. Correct anything before saving the new routine version.</p>{sourceVersion && <div className="mt-2 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">Source PDF Version: {sourceVersion}</div>}</div>
        <button onClick={add} className="flex items-center justify-center gap-2 rounded-xl border border-[#434955] px-4 py-2 text-sm"><Plus size={16}/> Add Class</button>
      </div>
      {conflicts.length > 0 && <div className="mb-4 flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200"><AlertTriangle size={16} className="shrink-0"/> {conflicts.length} section/duplicate conflict(s) detected. Different sections at the same time are allowed.</div>}
      <div className="scrollbar max-h-[500px] overflow-auto rounded-xl border border-[#30353d]">
        <table className="w-full min-w-[1180px] text-xs"><thead className="sticky top-0 bg-[#25282e] text-slate-400"><tr>{["Day","Time","Course Code","Course Name","Section","Teacher","Room",""].map(h=><th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
          <tbody>{records.map((r,i)=><tr key={i} className="border-t border-[#30353d]">{(["day","time","courseCode","courseName","section","teacher","room"] as (keyof EditableRecord)[]).map(key=><td key={key} className="p-1.5"><input value={r[key] ?? ""} onChange={e=>update(i,key,e.target.value)} className="w-full rounded-lg border border-transparent bg-black/10 px-2 py-2 outline-none focus:border-[#7868dd]"/></td>)}<td className="p-1.5"><button onClick={()=>remove(i)} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"><Trash2 size={15}/></button></td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className={`text-sm ${message.startsWith("Imported") ? "text-emerald-300" : message ? "text-amber-300" : "text-slate-400"}`}>{message && <span className="inline-flex items-center gap-2"><CheckCircle2 size={16}/>{message}</span>}</div><button disabled={!records.length || conflicts.length>0 || saving} onClick={save} className="gradient flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50"><Database size={17}/> {saving ? <><Loader2 size={17} className="animate-spin"/> Saving to database...</> : "Save Extracted Routine"}</button></div>
    </section>
  );
}
