"use client";
import { useEffect, useState } from "react";
import { toJsonBody } from "@/lib/to-json-body";

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

type ResultPayload = NonNullable<ResultType>;

function mapToResultType(data: unknown): ResultPayload | null {
  if (typeof data !== "object" || data === null) return null;

  const summary =
    "summary" in data && typeof data.summary === "string"
      ? data.summary.trim()
      : "";
  const category =
    "category" in data && typeof data.category === "string"
      ? data.category.trim()
      : "";
  const priority =
    "priority" in data && typeof data.priority === "string"
      ? data.priority.trim()
      : "";

  const actionItemsRaw = "action_items" in data ? data.action_items : [];
  const action_items = Array.isArray(actionItemsRaw)
    ? actionItemsRaw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (!summary || !category || !priority) return null;

  return {
    summary,
    category,
    priority,
    action_items,
  };
}

export default function Home() {
  const [situation, setSituation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [result, setResult] = useState<ResultType>(null);
  const [showRefine, setShowRefine] = useState(false);
  const [refinement, setRefinement] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [copied, setCopied] = useState(false);

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
    setGeneratedMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: toJsonBody({ request: situation }),
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

      const mappedResult = mapToResultType(data);
      if (!mappedResult) {
        throw new Error("Unexpected response format");
      }

      setResult(mappedResult);
    } catch (error) {
      console.error("Failed to submit request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!result) return;

    setIsGenerating(true);
    setGeneratedMessage("");

    try {
      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: toJsonBody({
          request: situation,
          summary: result.summary,
          action_items: result.action_items,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error("Failed to generate message");
      }

      const message =
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
          ? data.message
          : typeof data === "object" &&
              data !== null &&
              "text" in data &&
              typeof data.text === "string"
            ? data.text
            : "";

      setGeneratedMessage(message);
    } catch (error) {
      console.error("Failed to generate message:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    const originalInput = situation.trim();
    const refineInput = refinement.trim();
    const combinedInput =
      `${originalInput}\n\nAdditional context:\n${refineInput}`.trim();

    if (!combinedInput) return;

    setIsUpdating(true);
    setGeneratedMessage("");
    setCopied(false);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request: combinedInput,
        }),
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
        throw new Error(errorMessage);
      }

      const mappedResult = mapToResultType(data);
      if (!mappedResult) {
        throw new Error("Unexpected response format");
      }

      setResult(mappedResult);
      setShowRefine(false);
      setRefinement("");
    } catch (error) {
      console.error("Failed to refine request:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!generatedMessage) return;

    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
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
          <>
            <section className="mt-8 space-y-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <p className="text-base leading-relaxed text-white">
                <span className="text-sm uppercase tracking-wide text-neutral-400 mb-2 block">
                  What’s going on
                </span>
                {result.summary}
              </p>
              <p className="text-sm">
                <span className="text-sm uppercase tracking-wide text-neutral-400 mb-2 block">
                  What matters
                </span>
                <span className="inline-block px-3 py-1 rounded-full bg-neutral-800 text-sm mr-2">
                  {result.category}
                </span>
                <span className="inline-block px-3 py-1 rounded-full bg-neutral-800 text-sm mr-2">
                  {result.priority}
                </span>
              </p>
              <div className="text-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <p className="text-sm uppercase tracking-wide text-neutral-400 mb-2">
                  What to do next
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
            <div className="space-y-4">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowRefine((current) => !current)}
                  className="px-6 py-3 rounded-xl bg-neutral-800 text-white font-medium"
                >
                  Refine this
                </button>
                {showRefine && (
                  <div className="space-y-3">
                    <textarea
                      value={refinement}
                      onChange={(e) => setRefinement(e.target.value)}
                      placeholder="Add more context or clarify..."
                      className="w-full min-h-[90px] rounded-xl bg-neutral-900 border border-neutral-800 p-3 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleRefine}
                      disabled={isUpdating || !refinement.trim()}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white disabled:opacity-60"
                    >
                      {isUpdating ? "Updating..." : "Update"}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleGenerateMessage}
                disabled={isGenerating}
                className="px-6 py-3 rounded-xl bg-neutral-800 text-white font-medium disabled:opacity-70"
              >
                {isGenerating ? "Writing..." : "Write this for me"}
              </button>
              {generatedMessage && (
                <section className="space-y-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <h2 className="text-lg font-semibold">Suggested message</h2>
                  <p className="text-sm text-neutral-200 whitespace-pre-wrap">
                    {generatedMessage}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className={`px-4 py-2 rounded-lg text-sm text-white transition-all duration-200 ${
                      copied ? "bg-green-600" : "bg-neutral-800"
                    }`}
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
