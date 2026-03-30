"use client";
import { FormEvent, useState } from "react";

export default function Home() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    request: "",
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const response = await fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      alert("Failed to submit. Please try again.");
      return;
    }

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
