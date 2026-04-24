"use client";

import { useEffect, useState } from "react";
import { type AIResponse } from "@/lib/ai-response";
import { toJsonBody } from "@/lib/to-json-body";

const loadingMessages = [
  "Reading input...",
  "Identifying constraints...",
  "Building options...",
];

type ResultType = AIResponse | null;

type ResultPayload = NonNullable<ResultType>;

function getStringArray(data: unknown, key: "constraints" | "options") {
  if (typeof data !== "object" || data === null || !(key in data)) return [];

  const value = (data as Record<string, unknown>)[key];
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function mapToResultType(data: unknown): ResultPayload | null {
  if (typeof data !== "object" || data === null) return null;

  const goal =
    "goal" in data && typeof data.goal === "string" ? data.goal.trim() : "";
  const constraints = getStringArray(data, "constraints");
  const options = getStringArray(data, "options");
  const next_step =
    "next_step" in data && typeof data.next_step === "string"
      ? data.next_step.trim()
      : "";

  if (
    !goal ||
    constraints.length === 0 ||
    options.length < 2 ||
    options.length > 3 ||
    !next_step
  ) {
    return null;
  }

  return {
    goal,
    constraints,
    options,
    next_step,
  };
}

function getErrorMessage(data: unknown, fallback: string) {
  return typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
    ? data.error
    : fallback;
}

export default function Home() {
  const [situation, setSituation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [result, setResult] = useState<ResultType>(null);
  const [showNextStep, setShowNextStep] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [refinement, setRefinement] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    setShowNextStep(false);
    setGeneratedMessage("");
    setErrorMessage("");
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
      console.log("API response:", data);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Request failed"));
      }

      const mappedResult = mapToResultType(data);
      if (!mappedResult) {
        throw new Error("Unexpected response format");
      }

      setResult(mappedResult);
    } catch (error) {
      console.error("Failed to submit request:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to process request",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!result) return;

    setIsGenerating(true);
    setGeneratedMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: toJsonBody({
          goal: result.goal,
          next_step: result.next_step,
        }),
      });

      const message = (await response.text()).trim();

      if (!response.ok) {
        throw new Error(message || "Failed to generate message");
      }

      setGeneratedMessage(message);
    } catch (error) {
      console.error("Failed to generate message:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to generate message",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    const originalInput = situation.trim();
    const refineInput = refinement.trim();
    const combinedInput = `${originalInput}\n\n${refineInput}`.trim();

    if (!combinedInput || !refineInput) return;

    const payload = { request: combinedInput };
    console.log("Refine payload:", payload);

    setIsUpdating(true);
    setGeneratedMessage("");
    setCopied(false);
    setErrorMessage("");

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: toJsonBody(payload),
      });

      const data: unknown = await response.json();
      console.log("API response:", data);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Request failed"));
      }

      const mappedResult = mapToResultType(data);
      if (!mappedResult) {
        throw new Error("Unexpected response format");
      }

      setResult(mappedResult);
      setShowNextStep(false);
      setShowRefine(false);
      setRefinement("");
    } catch (error) {
      console.error("Failed to refine request:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to refine request",
      );
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
      setErrorMessage("Failed to copy message");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
        <p className="text-center text-xl">{loadingMessages[messageIndex]}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-start justify-center px-5 py-8 sm:items-center sm:px-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-center text-3xl font-semibold">
            Decision breakdown
          </h1>
          <p className="text-center text-sm text-neutral-400">
            Enter the situation and get a structured decision view.
          </p>
        </div>

        <div>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Describe the decision or problem..."
            className="w-full min-h-[150px] rounded-2xl bg-neutral-900 border border-neutral-800 p-4 sm:p-5 text-base placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          />
          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading || !situation.trim()}
            className="mt-4 w-full min-h-[48px] rounded-xl bg-blue-600 px-6 py-3 font-medium text-white disabled:opacity-60"
          >
            Break it down
          </button>
        </div>

        {errorMessage && (
          <p className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
            {errorMessage}
          </p>
        )}

        {result && (
          <>
            <section className="mt-8 space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="space-y-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">
                  What you&apos;re trying to do
                </h2>
                <p className="text-base leading-relaxed text-white">
                  {result.goal}
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">
                  What&apos;s limiting you
                </h2>
                <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-100">
                  {result.constraints.map((constraint) => (
                    <li key={constraint}>{constraint}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">
                  Your options
                </h2>
                <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-100">
                  {result.options.map((option) => (
                    <li key={option}>{option}</li>
                  ))}
                </ul>
              </div>

              {!showNextStep ? (
                <button
                  type="button"
                  onClick={() => setShowNextStep(true)}
                  className="w-full min-h-[48px] rounded-xl bg-blue-600 px-5 py-3 font-medium text-white"
                >
                  This is accurate
                </button>
              ) : (
                <div className="space-y-2 border-t border-neutral-800 pt-5">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">
                    What to do next
                  </h2>
                  <p className="text-base leading-relaxed text-white">
                    {result.next_step}
                  </p>
                </div>
              )}
            </section>

            <div className="space-y-4">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowRefine((current) => !current)}
                  className="w-full min-h-[48px] rounded-xl bg-neutral-800 px-6 py-3 font-medium text-white"
                >
                  Refine this
                </button>

                {showRefine && (
                  <div className="space-y-3">
                    <textarea
                      value={refinement}
                      onChange={(e) => setRefinement(e.target.value)}
                      placeholder="Add constraints, missing facts, or a correction..."
                      className="w-full min-h-[110px] rounded-xl bg-neutral-900 border border-neutral-800 p-4 text-base placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleRefine}
                      disabled={isUpdating || !refinement.trim()}
                      className="w-full min-h-[48px] rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
                    >
                      {isUpdating ? "Updating..." : "Update"}
                    </button>
                  </div>
                )}
              </div>

              {showNextStep && (
                <button
                  type="button"
                  onClick={handleGenerateMessage}
                  disabled={isGenerating}
                  className="w-full min-h-[48px] rounded-xl bg-neutral-800 px-6 py-3 font-medium text-white disabled:opacity-70"
                >
                  {isGenerating ? "Writing..." : "Write this for me"}
                </button>
              )}

              {generatedMessage && (
                <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                  <h2 className="text-lg font-semibold">Suggested message</h2>
                  <p className="whitespace-pre-wrap text-sm text-neutral-200">
                    {generatedMessage}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className={`min-h-[44px] rounded-lg px-4 py-2 text-sm text-white transition-all duration-200 ${
                      copied ? "bg-green-600" : "bg-neutral-800"
                    }`}
                  >
                    {copied ? "Copied" : "Copy"}
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
