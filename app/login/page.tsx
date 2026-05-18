"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // SIMPLE AUTH (MVP ONLY)
    localStorage.setItem("auth", JSON.stringify({ email }));

    router.push("/my-home");
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 24,
          border: "1px solid #eee",
          borderRadius: 12,
        }}
      >
        <h1 style={{ fontSize: 20 }}>Login</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />

        <button style={button} type="submit">
          Enter My Home
        </button>
      </form>
    </div>
  );
}

const input: React.CSSProperties = {
  padding: 10,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const button: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "white",
  cursor: "pointer",
};