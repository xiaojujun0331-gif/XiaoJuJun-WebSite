"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("密码错误，请重新输入");
      return;
    }

    router.push("/admin/chat");
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2">Admin Login</h1>
        <p className="text-zinc-400 text-sm mb-8">
          输入密码进入 XiaoJuJun 客服后台
        </p>

        <div className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
            placeholder="输入后台密码"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 outline-none placeholder:text-zinc-500"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-white text-black rounded-2xl py-4 font-bold hover:bg-zinc-200 transition disabled:bg-zinc-600 disabled:text-zinc-300"
          >
            {loading ? "登录中..." : "进入后台"}
          </button>
        </div>
      </div>
    </main>
  );
}