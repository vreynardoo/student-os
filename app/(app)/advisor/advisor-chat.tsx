"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "What should I work on first?",
  "I have 3 hours tonight. What should I do?",
  "Why is this task high priority?",
];

const FALLBACK_ERROR_MESSAGE =
  "Sorry, the AI advisor is temporarily unavailable. You can still use your dashboard and priority list.";

export function AdvisorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, error]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    setError(null);
    const history = messages;
    setMessages([...history, { role: "user", content: trimmed }]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(typeof data?.error === "string" ? data.error : FALLBACK_ERROR_MESSAGE);
        return;
      }

      setMessages([...history, { role: "user", content: trimmed }, { role: "assistant", content: data.reply }]);
    } catch {
      setError(FALLBACK_ERROR_MESSAGE);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await sendMessage(input);
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <Button key={prompt} variant="outline" size="sm" onClick={() => sendMessage(prompt)} disabled={isSending}>
              {prompt}
            </Button>
          ))}
        </div>
      )}

      <div className="flex min-h-80 flex-col gap-3 rounded-lg border p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask about your tasks, deadlines, and study priorities to get started.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "max-w-[85%] self-end rounded-lg bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground"
                  : "max-w-[85%] self-start rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap"
              }
            >
              {message.content}
            </div>
          ))
        )}
        {isSending && <p className="self-start text-sm text-muted-foreground">Thinking...</p>}
        {error && <p className="self-start text-sm text-destructive">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your advisor..."
          disabled={isSending}
          aria-label="Message"
        />
        <Button type="submit" disabled={isSending || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
