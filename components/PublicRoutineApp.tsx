"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, GraduationCap, UserRound, DoorOpen, BedDouble, Download,
  CalendarDays, CalendarRange, Clock3, MapPin, Menu, X, RefreshCw, Database, Palette
} from "lucide-react";
import { mergeConsecutiveLabEntries, routineTimeKey } from "../lib/routine-merge";
import { cacheKey, getCachedRoutine, isCacheFresh, setCachedRoutine } from "../lib/routine-cache";

type Entry = {day:string;time:string;room:string;courseSection:string;courseName?:string;teacher:string};
type Mode = "student"|"teacher"|"room"|"empty";
const days=["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
const times=["08:30-10:00","10:00-11:30","11:30-01:00","01:00-02:30","02:30-04:00","04:00-05:30"];

function sectionOf(cs:string) { return cs.match(/\(([^)]+)\)/)?.[1] || ""; }
function normalize(s:string) { return s.trim().toUpperCase().replace(/[\s-]+/g,"_"); }
function baseSection(s:string) { return normalize(s).replace(/\d+$/, ""); }

export default function PublicRoutineApp() {
  const [data,setData]=useState<{entries:Entry[];version:any;versions:any[]}>({entries:[],version:null,versions:[]});
  const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState<Mode>("student");
  const [query,setQuery]=useState("");
  const [submittedQuery,setSubmittedQuery]=useState("");
  const [day,setDay]=useState("Sunday");
  const [view,setView]=useState<"day"|"week">("day");
  const [menu,setMenu]=useState(false);
  const [roomDay,setRoomDay]=useState("Sunday");
  const [roomTime,setRoomTime]=useState("01:00-02:30");
  const [suggestions,setSuggestions]=useState<string[]>([]);
  const [showSuggestions,setShowSuggestions]=useState(false);
  const [theme,setTheme]=useState("midnight");
  const [themeMenu,setThemeMenu]=useState(false);

  useEffect(()=>{
    const allowed=["midnight","purple","amber","charcoal"];
    const saved=localStorage.getItem("routine-hub-theme") || "midnight";
    const next=allowed.includes(saved) ? saved : "midnight";
    setTheme(next);
    document.documentElement.dataset.theme=next;
    localStorage.setItem("routine-hub-theme",next);
  },[]);

  function changeTheme(next:string){
    setTheme(next);
    document.documentElement.dataset.theme=next;
    localStorage.setItem("routine-hub-theme",next);
    setThemeMenu(false);
  }

  const [offline,setOffline]=useState(false);

  async function fetchRoutine(version?:string, silent=false) {
    const key=cacheKey(version);
    const cached=await getCachedRoutine(key);

    if(cached){
      setData({entries:cached.entries,version:cached.version,versions:cached.versions});
      setLoading(false);
    } else if(!silent) {
      setLoading(true);
    }

    // A cached routine is considered fresh for 6 hours. This prevents
    // every page open from hitting the database/API.
    if(!version && cached && isCacheFresh(cached) && !silent) return;

    if(!navigator.onLine) {
      setOffline(true);
      if(!cached) setLoading(false);
      return;
    }

    try {
      const res=await fetch(`/api/public/routine${version?`?version=${encodeURIComponent(version)}`:""}`, {
        cache:"no-store"
      });
      if(!res.ok) throw new Error("Routine request failed");
      const json=await res.json();
      setData(json);
      await setCachedRoutine(json,key);
      setOffline(false);
    } catch {
      setOffline(true);
      if(!cached) setData({entries:[],version:null,versions:[]});
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{
    fetchRoutine();
    const onOnline=()=>fetchRoutine();
    const onOffline=()=>setOffline(true);
    window.addEventListener("online",onOnline);
    window.addEventListener("offline",onOffline);
    return ()=>{
      window.removeEventListener("online",onOnline);
      window.removeEventListener("offline",onOffline);
    };
  },[]);

  const entries=data.entries;

  useEffect(()=>{
    if(mode==="empty" || !query.trim()) { setSuggestions([]); return; }

    // Suggestions now come from the locally cached routine instead of
    // calling the server on every keystroke.
    const timer=setTimeout(()=>{
      const type=mode==="student" ? "section" : mode;
      const values=type==="teacher"
        ? Array.from(new Set(entries.map(e=>e.teacher))).sort()
        : type==="room"
          ? Array.from(new Set(entries.map(e=>e.room))).sort()
          : Array.from(new Set(entries.map(e=>sectionOf(e.courseSection)).filter(Boolean))).sort();
      const q=query.trim().toUpperCase();
      setSuggestions(values.filter(v=>v.toUpperCase().includes(q)).slice(0,12));
    },80);
    return ()=>clearTimeout(timer);
  },[query,mode,entries]);

  const normalized=normalize(submittedQuery);
  const result=useMemo(()=>{
    if(!submittedQuery.trim()) return [];
    let filtered:Entry[]=[];
    if(mode==="student") filtered=entries.filter(e=>baseSection(sectionOf(e.courseSection))===baseSection(normalized));
    else if(mode==="teacher") filtered=entries.filter(e=>e.teacher.toUpperCase().includes(submittedQuery.trim().toUpperCase()));
    else if(mode==="room") filtered=entries.filter(e=>e.room.toUpperCase().includes(submittedQuery.trim().toUpperCase()));
    // Consecutive duplicate LAB slots are shown as one continuous class.
    return mergeConsecutiveLabEntries([...filtered].sort((a,b)=>{
      if(a.day!==b.day) return days.indexOf(a.day)-days.indexOf(b.day);
      return routineTimeKey(a.time)-routineTimeKey(b.time);
    }));
  },[entries,mode,normalized,submittedQuery]);

  const rooms=useMemo(()=>{
    const all=[...new Set(entries.map(e=>e.room))].sort();
    const busy=new Set(entries.filter(e=>e.day===roomDay&&e.time===roomTime).map(e=>e.room));
    return all.filter(r=>!busy.has(r));
  },[entries,roomDay,roomTime]);

  const nav:[Mode,any,string][]=[
    ["student",GraduationCap,"Student"],["teacher",UserRound,"Teacher"],
    ["room",DoorOpen,"Room"],["empty",BedDouble,"Empty"]
  ];

  const sidebar=(
    <div className="flex h-full flex-col">
      <div className="mb-8 flex flex-col items-center text-center">
        <img src="/routine-hub-logo.webp" alt="Routine Hub logo" className="mb-3 h-28 w-28 rounded-full object-cover shadow-[0_0_28px_rgba(54,210,210,0.18)]" />
        <div className="text-lg font-black tracking-wide text-white">ROUTINE <span className="text-[var(--accent)]">HUB</span></div>
      </div>
      <div className="space-y-2">
        {nav.map(([id,Icon,label])=><button key={id} onClick={()=>{setMode(id);setMenu(false);setQuery("");setSubmittedQuery("");setSuggestions([]);setShowSuggestions(false)}}
          className={`mx-auto flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm ${mode===id?"bg-[var(--accent)] text-[var(--accent-contrast)] shadow-lg shadow-[var(--accent)]/20":"text-[var(--text-muted)] hover:bg-white/10"}`}><Icon size={20}/>{label}</button>)}
      </div>
      <div className="mt-auto text-center text-[11px] text-[var(--text-muted)]">Academic Routine Explorer</div>
    </div>
  );

  return <main className="min-h-screen">
    <button onClick={()=>setMenu(true)} className="fixed left-4 top-4 z-30 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 md:hidden"><Menu size={20}/></button>
    {menu&&<><div onClick={()=>setMenu(false)} className="fixed inset-0 z-40 bg-black/60 md:hidden"/><aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[var(--surface-2)] p-5 md:hidden">{sidebar}<button onClick={()=>setMenu(false)} className="absolute right-4 top-4"><X/></button></aside></>}
    <div className="flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/10 bg-[var(--sidebar)] p-5 md:block">{sidebar}</aside>
      <section className="min-w-0 flex-1 px-4 py-8 pt-20 md:px-10 md:pt-8">
        <div className="fixed right-4 top-4 z-30">
          <button onClick={()=>setThemeMenu(v=>!v)} className="theme-toggle flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"><Palette size={17}/> Theme</button>
          {themeMenu&&<div className="theme-menu absolute right-0 mt-2 w-52 rounded-2xl p-2 shadow-2xl">
            {[
              ["midnight","🌌","Midnight Blue"],
              ["purple","🟣","Purple Rose"],
              ["amber","🟠","Amber Dark"],
              ["charcoal","⚫","Charcoal Emerald"]
            ].map(([id,icon,label])=><button key={id} onClick={()=>changeTheme(id)} className={`theme-option flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${theme===id?"active":""}`}><span>{icon}</span><span>{label}</span>{theme===id&&<span className="ml-auto">✓</span>}</button>)}
          </div>}
        </div>
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 overflow-hidden rounded-3xl border border-white/10 hero-surface p-6 shadow-2xl sm:p-8">
            <div className="max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--accent-soft)]"><CalendarDays size={14}/> LIVE ACADEMIC SCHEDULE</div><h2 className="text-3xl font-black tracking-tight sm:text-4xl">Find your classes without the clutter.</h2><p className="mt-3 text-sm leading-6 text-slate-200/80">Search sections, instructors and rooms from one clean academic dashboard.</p></div>
          </div>
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h1 className="text-2xl font-black">Academic Schedule Portal</h1><p className="text-sm text-[var(--text-muted)]">{data.version?.name||"Loading routine..."}</p>{data.version&&<p className="mt-1 text-[11px] text-[var(--text-muted)]">{offline?"Offline • using cached routine":"Online • routine cached locally"}</p>}</div>
            <div className="flex gap-2">
              {data.versions?.length>0&&<select onChange={e=>fetchRoutine(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"><option value="">Latest published</option>{data.versions.map((v:any)=><option key={v.id} value={v.id}>{v.name}</option>)}</select>}
              <button onClick={()=>fetchRoutine(undefined,true)} className="rounded-xl border border-[var(--border)] p-2"><RefreshCw size={17}/></button>
            </div>
          </div>

          {loading?<div className="glass rounded-2xl p-12 text-center text-[var(--text-muted)]"><Database className="mx-auto mb-3 animate-pulse"/>Loading routine...</div>:<>
            {mode!=="empty"&&<div className="relative mx-auto mb-6 max-w-2xl">
              <div className="glass flex items-center gap-3 rounded-xl px-4 py-3"><Search size={20} className="text-[var(--text-muted)]"/><input value={query} onFocus={()=>query.trim()&&setShowSuggestions(true)} onChange={e=>{setQuery(e.target.value);setShowSuggestions(!!e.target.value.trim())}} onKeyDown={e=>{if(e.key==="Enter"){setSubmittedQuery(query.trim());setShowSuggestions(false)}}} placeholder={mode==="student"?"Enter section e.g. 65_J (press Enter)":mode==="teacher"?"Enter teacher initial (press Enter)": "Enter room (press Enter)"} className="w-full bg-transparent outline-none"/><button onClick={()=>{setSubmittedQuery(query.trim());setShowSuggestions(false)}} className="rounded-lg px-2 text-sm text-[var(--accent-soft)]">Search</button></div>
              {showSuggestions&&suggestions.length>0&&<div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200/20 bg-[var(--surface-2)] shadow-2xl">{suggestions.map(s=><button key={s} onClick={()=>{setQuery(s);setSubmittedQuery(s);setShowSuggestions(false)}} className="block w-full px-4 py-3 text-left text-sm hover:bg-white/5">{s}</button>)}</div>}
            </div>}

            {mode==="empty"?<div className="glass mx-auto max-w-3xl rounded-2xl p-5"><h2 className="mb-4 text-xl font-bold">Find an Available Room</h2><div className="grid gap-3 sm:grid-cols-2"><select value={roomDay} onChange={e=>setRoomDay(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">{days.map(d=><option key={d}>{d}</option>)}</select><select value={roomTime} onChange={e=>setRoomTime(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">{times.map(t=><option key={t}>{t}</option>)}</select></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{rooms.map(r=><div key={r} className="rounded-xl border border-[var(--border)] bg-black/10 p-3 text-center text-sm font-semibold">{r}</div>)}</div></div>
            :<>
              {mode==="student"&&result.length>0&&<div className="mb-5 flex justify-center"><button onClick={()=>window.open(`/api/routine/${normalized}/pdf`,"_blank")} className="gradient flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"><Download size={16}/> Download Section PDF</button></div>}
              {mode==="teacher"&&result.length>0&&<div className="mb-5 flex justify-center"><button onClick={()=>window.open(`/api/routine/teacher/${encodeURIComponent(submittedQuery.trim())}/pdf`,"_blank")} className="gradient flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"><Download size={16}/> Download Teacher PDF</button></div>}
              {mode==="student"&&<div className="mb-5 flex justify-center gap-2"><button onClick={()=>setView("day")} className={`rounded-xl px-4 py-2 text-sm ${view==="day"?"gradient":"border border-[var(--border)]"}`}><CalendarDays className="mr-1 inline" size={15}/>Day</button><button onClick={()=>setView("week")} className={`rounded-xl px-4 py-2 text-sm ${view==="week"?"gradient":"border border-[var(--border)]"}`}><CalendarRange className="mr-1 inline" size={15}/>Week</button></div>}
              {mode==="student"&&view==="day"&&<div className="mb-5 flex flex-wrap justify-center gap-2">{days.map(d=><button key={d} onClick={()=>setDay(d)} className={`rounded-xl px-3 py-2 text-xs ${day===d?"bg-[var(--accent)] text-[var(--accent-contrast)]":"border border-[var(--border)] text-[var(--text-muted)]"}`}>{d.slice(0,3)}</button>)}</div>}
              {mode==="student"&&view==="week"?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{days.map(d=><div key={d} className="glass rounded-2xl p-4"><h3 className="mb-3 font-bold">{d}</h3><Cards entries={result.filter(e=>e.day===d)} compact/></div>)}</div>:<Cards entries={mode==="student"?result.filter(e=>e.day===day):result}/>}
            </>}
          </>}
        </div>
      </section>
    </div>
  </main>
}

function Cards({entries,compact=false}:{entries:Entry[];compact?:boolean}) {
  if(!entries.length)return <div className="glass mx-auto max-w-3xl rounded-2xl p-10 text-center text-[var(--text-muted)]">No class found for this search.</div>;
  return <div className={compact?"space-y-2":"mx-auto max-w-3xl space-y-4"}>{[...entries].sort((a,b)=>routineTimeKey(a.time)-routineTimeKey(b.time)).map((e,i)=><div key={i} className="glass rounded-2xl p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Clock3 size={14}/>{e.time} • {e.day}</div><h3 className="mt-2 text-lg font-bold">{e.courseName ? `${e.courseName} - ${e.courseSection}` : e.courseSection}</h3><div className="mt-2 text-sm text-[var(--accent-soft)]">Teacher: {e.teacher}</div></div><div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><MapPin size={16}/> {e.room}</div></div></div>)}</div>
}
