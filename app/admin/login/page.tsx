"use client";

import { useState } from "react";
import { LockKeyhole, Mail, LogIn, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({email,password})
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Login failed.");
      setLoading(false);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <form onSubmit={login} className="glass w-full max-w-md rounded-3xl p-7">
        <div className="mb-7 text-center">
          <img src="/routine-hub-logo.webp" alt="Routine Hub logo" className="mx-auto mb-4 h-24 w-24 rounded-full object-cover shadow-[0_0_30px_rgba(54,210,210,0.18)]" />
          <h1 className="text-2xl font-black">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-400">Routine Hub administration</p>
        </div>

        <label className="mb-4 block text-sm">
          <span className="mb-2 block text-slate-400">Admin Email</span>
          <div className="flex items-center gap-3 rounded-xl border border-[#30353d] bg-black/10 px-4 py-3">
            <Mail size={18} className="text-slate-500"/>
            <input required type="email" value={email} onChange={e=>setEmail(e.target.value)}
              className="w-full bg-transparent outline-none" placeholder="admin@example.com"/>
          </div>
        </label>

        <label className="block text-sm">
          <span className="mb-2 block text-slate-400">Password</span>
          <div className="flex items-center gap-3 rounded-xl border border-[#30353d] bg-black/10 px-4 py-3">
            <LockKeyhole size={18} className="text-slate-500"/>
            <input required type="password" value={password} onChange={e=>setPassword(e.target.value)}
              className="w-full bg-transparent outline-none" placeholder="••••••••"/>
          </div>
        </label>

        {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        <button disabled={loading} className="gradient mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={18}/> : <LogIn size={18}/>}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
