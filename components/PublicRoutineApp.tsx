"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, GraduationCap, UserRound, DoorOpen, BedDouble, Download,
  CalendarDays, CalendarRange, Clock3, MapPin, RefreshCw, Database, Palette,
  WifiOff, Sparkles, CheckCircle2
} from "lucide-react";
import { mergeConsecutiveLabEntries, routineTimeKey } from "../lib/routine-merge";
import { cacheKey, getCachedRoutine, isCacheFresh, setCachedRoutine } from "../lib/routine-cache";

type Entry = {day:string;time:string;room:string;courseSection:string;courseName?:string;teacher:string};
type Mode = "student"|"teacher"|"room"|"empty";
const days=["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
const teacherDays=["Sunday","Monday","Tuesday","Wednesday","Thursday","Saturday"];
const teacherDayIndex=Object.fromEntries(teacherDays.map((d,i)=>[d.toUpperCase(),i]));
function normalizeDay(value:string){ return value.trim().toUpperCase(); }
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
  const [suggestions,setSuggestions]=useState<string[]>([]);
  const [showSuggestions,setShowSuggestions]=useState(false);
  const [theme,setTheme]=useState("midnight");
  const [themeMenu,setThemeMenu]=useState(false);
  const [offline,setOffline]=useState(false);

  useEffect(()=>{
    const allowed=["midnight","purple","amber","charcoal"];
    const saved=localStorage.getItem("routine-hub-theme") || "midnight";
    const next=allowed.includes(saved) ? saved : "midnight";
    setTheme(next); document.documentElement.dataset.theme=next; localStorage.setItem("routine-hub-theme",next);
  },[]);

  function changeTheme(next:string){ setTheme(next); document.documentElement.dataset.theme=next; localStorage.setItem("routine-hub-theme",next); setThemeMenu(false); }

  async function fetchRoutine(version?:string, silent=false) {
    const key=cacheKey(version);
    const cached=await getCachedRoutine(key);
    if(cached){ setData({entries:cached.entries,version:cached.version,versions:cached.versions}); setLoading(false); }
    else if(!silent) setLoading(true);
    if(!version && cached && isCacheFresh(cached) && !silent) return;
    if(!navigator.onLine){ setOffline(true); if(!cached) setLoading(false); return; }
    try {
      const res=await fetch(`/api/public/routine${version?`?version=${encodeURIComponent(version)}`:""}`,{cache:"no-store"});
      if(!res.ok) throw new Error("Routine request failed");
      const json=await res.json(); setData(json); await setCachedRoutine(json,key); setOffline(false);
    } catch { setOffline(true); if(!cached) setData({entries:[],version:null,versions:[]}); }
    finally { setLoading(false); }
  }

  useEffect(()=>{
    fetchRoutine();
    const onOnline=()=>fetchRoutine(); const onOffline=()=>setOffline(true);
    window.addEventListener("online",onOnline); window.addEventListener("offline",onOffline);
    return ()=>{ window.removeEventListener("online",onOnline); window.removeEventListener("offline",onOffline); };
  },[]);

  const entries=data.entries;
  useEffect(()=>{
    if((mode==="teacher" || mode==="room") && submittedQuery.trim()) setView("week");
  },[mode,submittedQuery]);

  useEffect(()=>{
    if(mode==="empty" || !query.trim()) { setSuggestions([]); return; }
    const timer=setTimeout(()=>{
      const type=mode==="student" ? "section" : mode;
      const values=type==="teacher" ? Array.from(new Set(entries.map(e=>e.teacher))).sort() : type==="room" ? Array.from(new Set(entries.map(e=>e.room))).sort() : Array.from(new Set(entries.map(e=>sectionOf(e.courseSection)).filter(Boolean))).sort();
      const q=query.trim().toUpperCase(); setSuggestions(values.filter(v=>v.toUpperCase().includes(q)));
    },80);
    return ()=>clearTimeout(timer);
  },[query,mode,entries]);

  const [roomDay,setRoomDay]=useState("Sunday");
  const [roomTime,setRoomTime]=useState("01:00-02:30");
  const normalized=normalize(submittedQuery);
  const roomWeekEntries=useMemo(()=>{
    if(mode!=="room" || !submittedQuery.trim()) return [];
    const needle=submittedQuery.trim().toUpperCase();
    const filtered=entries.filter(e=>e.room.trim().toUpperCase().includes(needle));
    const ordered=[...filtered].sort((a,b)=>{
      const dayA=teacherDayIndex[normalizeDay(a.day)] ?? Number.MAX_SAFE_INTEGER;
      const dayB=teacherDayIndex[normalizeDay(b.day)] ?? Number.MAX_SAFE_INTEGER;
      if(dayA!==dayB) return dayA-dayB;
      const timeDiff=routineTimeKey(a.time)-routineTimeKey(b.time);
      if(timeDiff!==0) return timeDiff;
      return `${a.courseSection} ${a.teacher}`.localeCompare(`${b.courseSection} ${b.teacher}`);
    });
    return mergeConsecutiveLabEntries(ordered);
  },[entries,mode,submittedQuery]);

  const teacherWeekEntries=useMemo(()=>{
    if(mode!=="teacher" || !submittedQuery.trim()) return [];
    const needle=submittedQuery.trim().toUpperCase();
    const filtered=entries.filter(e=>e.teacher.trim().toUpperCase().includes(needle));
    const ordered=[...filtered].sort((a,b)=>{
      const dayA=teacherDayIndex[normalizeDay(a.day)] ?? Number.MAX_SAFE_INTEGER;
      const dayB=teacherDayIndex[normalizeDay(b.day)] ?? Number.MAX_SAFE_INTEGER;
      if(dayA!==dayB) return dayA-dayB;
      const timeDiff=routineTimeKey(a.time)-routineTimeKey(b.time);
      if(timeDiff!==0) return timeDiff;
      return `${a.courseSection} ${a.room}`.localeCompare(`${b.courseSection} ${b.room}`);
    });
    return mergeConsecutiveLabEntries(ordered);
  },[entries,mode,submittedQuery]);

  const result=useMemo(()=>{
    if(!submittedQuery.trim()) return [];
    let filtered:Entry[]=[];
    if(mode==="student") filtered=entries.filter(e=>baseSection(sectionOf(e.courseSection))===baseSection(normalized));
    else if(mode==="teacher") return teacherWeekEntries;
    else if(mode==="room") return roomWeekEntries;
    const sortDays = mode === "teacher" ? teacherDays : days;
    return mergeConsecutiveLabEntries([...filtered].sort((a,b)=>{
      const dayA=(sortDays.indexOf(a.day.trim())>=0?sortDays.indexOf(a.day.trim()):Number.MAX_SAFE_INTEGER);
      const dayB=(sortDays.indexOf(b.day.trim())>=0?sortDays.indexOf(b.day.trim()):Number.MAX_SAFE_INTEGER);
      return dayA!==dayB ? dayA-dayB : routineTimeKey(a.time)-routineTimeKey(b.time);
    }));
  },[entries,mode,normalized,submittedQuery,teacherWeekEntries,roomWeekEntries]);

  const rooms=useMemo(()=>{ const all=[...new Set(entries.map(e=>e.room))].sort(); const busy=new Set(entries.filter(e=>e.day===roomDay&&e.time===roomTime).map(e=>e.room)); return all.filter(r=>!busy.has(r)); },[entries,roomDay,roomTime]);

  const nav:[Mode,any,string][]=[["student",GraduationCap,"Student"],["teacher",UserRound,"Teacher"],["room",DoorOpen,"Room"],["empty",BedDouble,"Empty"]];
  const currentModeLabel=nav.find(([id])=>id===mode)?.[2] || "Student";
  const resetMode=(next:Mode)=>{setMode(next);setQuery("");setSubmittedQuery("");setSuggestions([]);setShowSuggestions(false);};

  return <main className="min-h-screen">
    <div className="app-grid">
      <aside className="desktop-sidebar">
        <div className="flex h-full flex-col">
          <div className="mb-7 px-2">
            <div className="brand-mark"><img src="/routine-hub-logo.webp" alt="Routine Hub logo" className="routine-hub-logo logo"/><div><div className="text-sm font-black tracking-[.14em]">ROUTINE <span style={{color:"var(--accent)"}}>HUB</span></div><div className="mt-1 text-[11px] text-[var(--text-muted)]">Academic schedule explorer</div></div></div>
          </div>
          <div className="space-y-1.5">
            {nav.map(([id,Icon,label])=><button key={id} onClick={()=>resetMode(id)} className={`nav-item ${mode===id?"active":""}`}><Icon size={18}/><span>{label}</span></button>)}
          </div>
          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-[var(--border)] bg-white/[.03] p-3 text-xs text-[var(--text-muted)]"><div className="mb-2 flex items-center gap-2 text-[var(--text-soft)]"><Sparkles size={14} className="text-[var(--accent)]"/> Tip</div>Search a section, teacher or room. Your recent routine is cached locally for faster access.</div>
            <div className="developer-card">
              <div className="developer-avatar"><img src="/developer-minhajul.png" alt="Minhajul Islam"/></div>
              <div className="min-w-0">
                <div className="developer-kicker">DEVELOPER</div>
                <div className="developer-name">Minhajul Islam</div>
                <div className="developer-meta">CSE · Daffodil International University</div>
                <div className="developer-meta">Dhaka, Bangladesh</div>
                <a className="developer-email" href="mailto:minhajul.cse.diu@gmail.com">minhajul.cse.diu@gmail.com</a>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section className="main-shell">
        <div className="content-width">
          <div className="topbar">
            <div className="brand-mark md:hidden"><img src="/routine-hub-logo.webp" alt="Routine Hub" className="routine-hub-logo logo"/><div className="brand-copy"><div className="text-sm font-black tracking-[.12em]">ROUTINE HUB</div></div></div>
            <div className="hidden md:block"><div className="text-xs font-bold uppercase tracking-[.14em] text-[var(--text-muted)]">Academic portal</div></div>
            <div className="relative ml-auto">
              <button onClick={()=>setThemeMenu(v=>!v)} className="theme-toggle flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"><Palette size={16}/> <span className="hidden sm:inline">Theme</span></button>
              {themeMenu&&<div className="theme-menu absolute right-0 z-20 mt-2 w-52 rounded-2xl p-2">{[["midnight","🌌","Midnight Blue"],["purple","🟣","Purple Rose"],["amber","🟠","Amber Dark"],["charcoal","⚫","Charcoal Emerald"]].map(([id,icon,label])=><button key={id} onClick={()=>changeTheme(id)} className={`theme-option flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${theme===id?"active":""}`}><span>{icon}</span><span>{label}</span>{theme===id&&<span className="ml-auto">✓</span>}</button>)}</div>}
            </div>
          </div>

          <div className="hero-surface rounded-[28px] px-6 py-7 sm:px-8 sm:py-8">
            <div className="hero-copy">
              <div className="eyebrow"><Sparkles size={13}/> LIVE ACADEMIC SCHEDULE</div>
              <h1 className="mt-4">Your routine, minus the clutter.</h1>
              <p>Find classes by section, teacher, or room in seconds. Switch between a focused day view and a full week overview.</p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/65"><span className="meta-pill">{data.version?.name || "Loading latest routine"}</span><span className="meta-pill">{offline ? <><WifiOff size={13}/> Offline cache</> : <><CheckCircle2 size={13}/> Live & cached</>}</span></div>
          </div>

          <div className="search-panel">
            {mode!=="empty" && <div className="glass search-box">
              <Search size={20} className="shrink-0 text-[var(--text-muted)]"/>
              <input value={query} onFocus={()=>query.trim()&&setShowSuggestions(true)} onChange={e=>{setQuery(e.target.value);setShowSuggestions(!!e.target.value.trim())}} onKeyDown={e=>{if(e.key==="Enter"){setSubmittedQuery(query.trim());setShowSuggestions(false)}}} placeholder={mode==="student"?"Search a section · e.g. 65_J":mode==="teacher"?"Search by teacher initials":"Search by room number"} className="w-full bg-transparent outline-none"/>
              <button onClick={()=>{setSubmittedQuery(query.trim());setShowSuggestions(false)}} className="search-submit">Search</button>
              {showSuggestions&&suggestions.length>0&&<div className="suggestions-menu absolute left-0 right-0 top-full mt-2 max-h-[min(28rem,65vh)] overflow-y-scroll overscroll-contain rounded-2xl p-1.5" onWheel={e=>e.stopPropagation()} onTouchMove={e=>e.stopPropagation()}>{suggestions.map(s=><button key={s} onClick={()=>{setQuery(s);setSubmittedQuery(s);setShowSuggestions(false)}} className="block min-h-11 w-full rounded-xl px-3.5 py-3 text-left text-sm hover:bg-white/[.05]">{s}</button>)}</div>}
            </div>}
          </div>

          <div className="section-heading"><div><h2>{mode==="empty"?"Available rooms":currentModeLabel+" schedule"}</h2><p>{mode==="empty"?"See which rooms are free at a selected slot.":submittedQuery?`Results for “${submittedQuery}”`:"Choose a search mode above and enter a query."}</p></div><div className="flex items-center gap-2">{data.versions?.length>0&&<select aria-label="Routine version" onChange={e=>fetchRoutine(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold"><option value="">Latest routine</option>{data.versions.map((v:any)=><option key={v.id} value={v.id}>{v.name}</option>)}</select>}<button aria-label="Refresh routine" onClick={()=>fetchRoutine(undefined,true)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-2.5 text-[var(--text-soft)]"><RefreshCw size={16}/></button></div></div>

          {loading ? <div className="glass empty-state"><Database className="mx-auto mb-3 animate-pulse"/><div className="font-semibold">Loading your routine…</div></div> : <>
            {mode==="empty" ? <div className="glass rounded-2xl p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-2 block text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text-muted)]">Day</label><select value={roomDay} onChange={e=>setRoomDay(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-sm">{days.map(d=><option key={d}>{d}</option>)}</select></div><div><label className="mb-2 block text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text-muted)]">Time</label><select value={roomTime} onChange={e=>setRoomTime(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-sm">{times.map(t=><option key={t}>{t}</option>)}</select></div></div><div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">{rooms.map(r=><div key={r} className="glass-soft rounded-xl p-3 text-center text-sm font-bold">{r}</div>)}</div>{rooms.length===0&&<div className="empty-state mt-3">No rooms are free at this time.</div>}</div>
            : <>
              {mode==="student"&&result.length>0&&<div className="mb-4 flex flex-wrap justify-end gap-2"><button onClick={async()=>{const url=`/api/routine/${normalized}/pdf`;const res=await fetch(url);if(!res.ok){const msg=await res.text();alert(`PDF generation failed: ${msg}`);return;}const blob=await res.blob();const href=URL.createObjectURL(blob);const a=document.createElement("a");a.href=href;a.download=`routine-${normalized}.pdf`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(href);}} className="gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"><Download size={15}/> Section PDF</button><div className="glass-soft rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-muted)]">{result.length} classes found</div></div>}
              {mode==="teacher"&&result.length>0&&<div className="mb-4 flex justify-end"><button onClick={async()=>{const teacher=encodeURIComponent(submittedQuery.trim());const url=`/api/routine/teacher/${teacher}/pdf`;const res=await fetch(url);if(!res.ok){const msg=await res.text();alert(`PDF generation failed: ${msg}`);return;}const blob=await res.blob();const href=URL.createObjectURL(blob);const a=document.createElement("a");a.href=href;a.download=`teacher-${submittedQuery.trim().toUpperCase()}.pdf`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(href);}} className="gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"><Download size={15}/> Teacher PDF</button></div>}
              {(mode==="student"||mode==="teacher"||mode==="room")&&submittedQuery&&<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="segmented"><button onClick={()=>setView("day")} className={view==="day"?"active":""}><CalendarDays className="mr-1 inline" size={14}/>Day view</button><button onClick={()=>setView("week")} className={view==="week"?"active":""}><CalendarRange className="mr-1 inline" size={14}/>Week view</button></div>{view==="day"&&<div className="segmented">{(mode==="teacher"||mode==="room"?teacherDays:days).map(d=><button key={d} onClick={()=>setDay(d)} className={day===d?"active":""}>{d.slice(0,3)}</button>)}</div>}</div>}
              {!submittedQuery ? <div className="glass empty-state"><Search className="mx-auto mb-3"/><div className="font-semibold text-[var(--text-soft)]">Start with a search</div><div className="mt-1 text-xs">Try a section like 65_J, a teacher initial, or a room number.</div></div> : (mode==="teacher" || mode==="room") && view==="week" ? <TeacherWeekSchedule entries={mode==="teacher"?teacherWeekEntries:roomWeekEntries}/> : view==="week" && mode==="student" ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{days.map(d=><div key={d} className="glass rounded-2xl p-3.5"><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">{d}</h3><span className="text-[10px] text-[var(--text-muted)]">{result.filter(e=>e.day===d).length} classes</span></div><Cards entries={result.filter(e=>e.day===d)} compact/></div>)}</div> : <Cards entries={(mode==="student"||mode==="teacher"||mode==="room")?result.filter(e=>normalizeDay(e.day)===normalizeDay(day)):result}/>} 
            </>}
          </>}
        </div>
      </section>
    </div>

    <div className="developer-footer content-width">
      <div className="developer-footer-copy">
        <div className="developer-kicker">DEVELOPER</div>
        <div className="developer-footer-name">Minhajul Islam</div>
        <div className="developer-footer-meta">CSE · Daffodil International University · Dhaka, Bangladesh</div>
        <a href="mailto:minhajul.cse.diu@gmail.com" className="developer-email">minhajul.cse.diu@gmail.com</a>
      </div>
      <div className="developer-footer-avatar"><img src="/developer-minhajul.png" alt="Minhajul Islam"/></div>
    </div>

    <div className="mobile-bottom-nav">{nav.map(([id,Icon,label])=><button key={id} onClick={()=>resetMode(id)} className={mode===id?"active":""}><Icon size={17}/><span>{label}</span></button>)}</div>
  </main>
}

function TeacherWeekSchedule({entries}:{entries:Entry[]}) {
  const grouped = teacherDays
    .map(day => ({ day, entries: entries.filter(e => normalizeDay(e.day) === normalizeDay(day)).sort((a,b)=>routineTimeKey(a.time)-routineTimeKey(b.time)) }))
    .filter(group => group.entries.length);

  if (!grouped.length) return <div className="glass empty-state">No class found for this search.</div>;

  return <div className="mx-auto max-w-4xl space-y-5">
    {grouped.map(group => (
      <section key={group.day} className="glass rounded-2xl p-3.5 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <h3 className="text-base font-black tracking-tight">{group.day}</h3>
          <span className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--text-muted)]">{group.entries.length} {group.entries.length === 1 ? "class" : "classes"}</span>
        </div>
        <Cards entries={group.entries} compact/>
      </section>
    ))}
  </div>;
}

function clockMinutes(value:string) {
  const m=value.trim().toUpperCase().match(/^(\d{1,2})\s*[:.]\s*(\d{2})\s*(AM|PM)?$/);
  if(!m) return null;
  let h=Number(m[1]); const min=Number(m[2]); const mer=m[3];
  if(mer==="PM" && h<12) h+=12;
  else if(mer==="AM" && h===12) h=0;
  else if(!mer && h>=1 && h<=4) h+=12;
  return h*60+min;
}

function rangeMinutes(value:string) {
  const parts=value.split(/\s*(?:-|–|—|to)\s*/i).filter(Boolean);
  if(parts.length<2) return null;
  const start=clockMinutes(parts[0]);
  let end=clockMinutes(parts[1]);
  if(start==null || end==null) return null;
  while(end<=start) end+=12*60;
  return {start,end};
}

function breakMinutes(previous:string,current:string) {
  const a=rangeMinutes(previous), b=rangeMinutes(current);
  if(!a || !b || b.start<=a.end) return 0;
  return b.start-a.end;
}

function formatBreak(min:number) {
  if(min<=0) return "";
  const h=Math.floor(min/60), m=min%60;
  if(h) return m ? `${h}h ${m}m break` : `${h}h break`;
  return `${m} min break`;
}

function Cards({entries,compact=false}:{entries:Entry[];compact?:boolean}) {
  if(!entries.length)return <div className="glass empty-state">No class found for this search.</div>;
  const sorted=[...entries].sort((a,b)=>routineTimeKey(a.time)-routineTimeKey(b.time));
  return <div className={compact?"space-y-2.5":"mx-auto max-w-3xl space-y-3"}>
    {sorted.map((e,i)=>{
      const prev=sorted[i-1];
      const gap=prev ? breakMinutes(prev.time,e.time) : 0;
      return <div key={`${e.day}-${e.time}-${e.courseSection}-${i}`}>
        {gap>0&&<div className="break-separator" aria-label={`${formatBreak(gap)}`}><span className="break-line"/><span className="break-badge">BREAK <em>{formatBreak(gap).replace(" break","")}</em></span><span className="break-line"/></div>}
        <div className="glass class-card"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="class-meta"><span className="meta-pill"><Clock3 size={13}/>{e.time}</span><span className="meta-pill"><CalendarDays size={13}/>{e.day}</span></div><h3 className="class-title">{e.courseName?`${e.courseName} · ${e.courseSection}`:e.courseSection}</h3><div className="class-sub">Teacher · {e.teacher}</div></div><div className="flex shrink-0 justify-end"><div className="room-chip"><MapPin size={14}/>{e.room}</div></div></div></div>
      </div>
    })}
  </div>
}
