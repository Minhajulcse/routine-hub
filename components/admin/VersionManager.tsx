"use client";

import { useEffect, useState } from "react";
import { Archive, CheckCircle2, Clock3, Loader2, Rocket, RotateCcw } from "lucide-react";

type Version = {
  id: string;
  name: string;
  status: "DRAFT"|"REVIEW"|"PUBLISHED"|"ARCHIVED";
  createdAt: string;
  publishedAt?: string | null;
  _count: { schedules: number };
};

export default function VersionManager() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");

  async function load() {
    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch("/api/admin/versions", { signal: controller.signal, cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setVersions(data.versions || []);
    } catch {
      setVersions([]);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  useEffect(()=>{load()}, []);

  async function action(id:string, type:"publish"|"unpublish") {
    setWorking(id);
    try {
      await fetch(`/api/admin/versions/${id}/${type}`, {method:"POST"});
      await load();
    } finally {
      setWorking("");
    }
  }

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold">Routine Version History</h2>
          <p className="text-xs text-slate-400">Only one version can be publicly published at a time.</p>
        </div>
        <button onClick={load} className="rounded-lg border border-[#404653] p-2 text-slate-300"><RotateCcw size={16}/></button>
      </div>

      {loading ? <div className="grid place-items-center p-8 text-slate-400"><Loader2 className="animate-spin"/></div>
      : versions.length === 0 ? <div className="rounded-xl bg-black/10 p-5 text-center text-sm text-slate-400">No database versions yet. Import a reviewed routine first.</div>
      : <div className="space-y-3">
        {versions.map(v => (
          <div key={v.id} className="rounded-xl border border-[#30353d] bg-black/10 p-4 sm:flex sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                {v.status==="PUBLISHED" ? <CheckCircle2 size={16} className="text-emerald-300"/> : v.status==="ARCHIVED" ? <Archive size={16} className="text-slate-500"/> : <Clock3 size={16} className="text-amber-300"/>}
                {v.name}
              </div>
              <div className="mt-1 text-xs text-slate-400">{v._count.schedules} classes • {v.status}</div>
            </div>
            <div className="mt-3 sm:mt-0">
              {v.status === "PUBLISHED"
                ? <button disabled={working===v.id} onClick={()=>action(v.id,"unpublish")} className="rounded-lg border border-[#4b5260] px-4 py-2 text-xs text-slate-300">Unpublish</button>
                : <button disabled={working===v.id} onClick={()=>action(v.id,"publish")} className="gradient flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold"><Rocket size={14}/> {working===v.id ? "Working..." : "Publish"}</button>
              }
            </div>
          </div>
        ))}
      </div>}
    </section>
  );
}
