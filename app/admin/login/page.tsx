"use client";

import { useState } from "react";
import { LockKeyhole, Mail, LogIn, Loader2, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const res=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    if(!res.ok){const data=await res.json();setError(data.error||"Login failed.");setLoading(false);return;}
    window.location.href="/admin";
  }
  return <main className="grid min-h-screen place-items-center px-4 py-8">
    <div className="w-full max-w-md">
      <div className="mb-5 text-center"><div className="eyebrow mx-auto w-fit"><ShieldCheck size={13}/> SECURE ADMIN AREA</div></div>
      <form onSubmit={login} className="glass form-shell mx-auto">
        <div className="mb-7 text-center"><img src="/routine-hub-logo.webp" alt="Routine Hub logo" className="routine-hub-logo mx-auto mb-4 h-20 w-20 rounded-2xl object-cover"/><h1 className="text-2xl font-black">Welcome back</h1><p className="mt-2 text-sm text-[var(--text-muted)]">Sign in to manage Routine Hub.</p></div>
        <div className="form-field"><label>ADMIN EMAIL</label><div className="form-control"><Mail size={17} className="text-[var(--text-muted)]"/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-transparent outline-none text-sm" placeholder="admin@example.com"/></div></div>
        <div className="form-field"><label>PASSWORD</label><div className="form-control"><LockKeyhole size={17} className="text-[var(--text-muted)]"/><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-transparent outline-none text-sm" placeholder="••••••••"/></div></div>
        {error&&<div className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/10 p-3 text-sm text-rose-300">{error}</div>}
        <button disabled={loading} className="gradient mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-50">{loading?<><Loader2 className="animate-spin" size={17}/> Signing in…</>:<><LogIn size={17}/> Sign in</>}</button>
      </form>
      <p className="mt-4 text-center text-[11px] text-[var(--text-muted)]">Routine Hub · Academic schedule management</p>
    </div>
  </main>;
}
