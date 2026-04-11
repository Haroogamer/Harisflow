"use client";
import { useEffect, useState } from "react";

const loadingMessages = [
  "Understanding your situation...",
  "Identifying key issues...",
  "Building a plan...",
];

type ResultType = {
  summary: string;
  category: string;
  priority: string;
  action_items: string[];
} | null;

export default function Home() {
  const [situation, setSituation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [result, setResult] = useState<ResultType>(null);

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1500);

    return () => {
      clearInterval(interval);
    };
  }, [isLoading]);

  const handleStart = async () => {
    setMessageIndex(0);
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ request: situation }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Request failed";
        throw new Error(
          errorMessage,
        );
      }

      const typedResult = data as NonNullable<ResultType>;
      setResult(typedResult);
    } catch (error) {
      console.error("Failed to submit request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="w-full max-w-2xl px-6">
          <p className="text-center text-xl">{loadingMessages[messageIndex]}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
      <div className="w-full max-w-2xl px-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-center">
            Make sense of your situation
          </h1>
          <p className="text-sm text-neutral-400 text-center">
            Write what's on your mind. We'll help you break it down.
          </p>
        </div>
        <textarea
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder="I’m not sure what to do about..."
          className="w-full min-h-[140px] rounded-2xl bg-neutral-900 border border-neutral-800 p-4 text-base placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
        />
        <button
          type="button"
          onClick={handleStart}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium"
        >
          Make sense of it
        </button>
        {result && (
          <section className="mt-8 space-y-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <p className="text-base leading-relaxed text-white">
              <span className="text-sm uppercase tracking-wide text-neutral-400 mb-2 block">
                Summary:
              </span>
              {result.summary}
            </p>
            <p className="text-sm">
              <span className="text-sm uppercase tracking-wide text-neutral-400 mb-2 block">
                Category:
              </span>
              <span className="inline-block px-3 py-1 rounded-full bg-neutral-800 text-sm mr-2">
                {result.category}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-sm uppercase tracking-wide text-neutral-400 mb-2 block">
                Priority:
              </span>
              <span className="inline-block px-3 py-1 rounded-full bg-neutral-800 text-sm mr-2">
                {result.priority}
              </span>
            </p>
            <div className="text-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <p className="text-sm uppercase tracking-wide text-neutral-400 mb-2">
                Action items:
              </p>
              {result.action_items.length > 0 ? (
                <ul className="space-y-2">
                  {result.action_items.map((item) => (
                    <li
                      key={item}
                      className="bg-neutral-800 rounded-lg px-3 py-2 text-sm"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>None</p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
