"use client";
import { useState } from "react";

export default function Home() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    request: "",
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    await fetch("/api/submit", {
      method: "POST",
      body: JSON.stringify(form),
    });

    alert("Submitted!");
  };

  return (
    <main style={{ padding: "40px" }}>
      <h1>HarisFlow Intake</h1>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <br /><br />

        <input
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <br /><br />

        <textarea
          placeholder="What do you need help with?"
          onChange={(e) => setForm({ ...form, request: e.target.value })}
        />
        <br /><br />

        <button type="submit">Submit</button>
      </form>
    </main>
  );
}