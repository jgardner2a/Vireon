"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [allowed, setAllowed] = useState(false);

  if (!allowed) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1>Vireon</h1>

        <p>Enter access code</p>

        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ padding: 8, marginRight: 10 }}
        />

        <button
          onClick={() => {
            if (input === "vireon123") setAllowed(true);
          }}
        >
          Enter
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Vireon</h1>
      <p>Housing intelligence platform is live</p>
    </main>
  );
}