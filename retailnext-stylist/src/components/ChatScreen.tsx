import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { chatTurn } from "@/lib/pipeline";
import { parseIntent } from "@/lib/intent";
import type { ChatMessage, Intent } from "@/types";

interface Props {
  seedQuery: string;
  onIntent: (intent: Intent) => void;
  onBack: () => void;
}

export function ChatScreen({ seedQuery, onIntent, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    (async () => {
      const seed: ChatMessage = { role: "user", content: seedQuery };
      setMessages([seed]);
      setLoading(true);
      try {
        const reply = await chatTurn([], seedQuery);
        const { visible, intent } = parseIntent(reply);
        setMessages((m) => [...m, { role: "assistant", content: visible }]);
        if (intent) {
          setTimeout(() => onIntent(intent), 1000);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [seedQuery, onIntent]);

  const submit = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    try {
      const reply = await chatTurn(messages, userMsg.content);
      const { visible, intent } = parseIntent(reply);
      setMessages((m) => [...m, { role: "assistant", content: visible }]);
      if (intent) {
        setTimeout(() => onIntent(intent), 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[720px] mx-auto px-12 min-h-screen flex flex-col">
      <header className="py-8 flex items-center justify-between">
        <button onClick={onBack} className="text-xs uppercase tracking-widest text-ink/60 hover:text-ink">
          ← back
        </button>
        <h1 className="font-display text-2xl tracking-[0.2em]">RETAILNEXT</h1>
        <div className="w-12" />
      </header>

      <div className="flex-1 py-12 space-y-12">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className="text-[10px] uppercase tracking-widest text-ink/50 mb-2">{m.role === "user" ? "you" : "stylist"}</div>
            <div className={m.role === "user" ? "text-base" : "font-display text-2xl leading-snug"}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-widest text-ink/50 mb-2">stylist</div>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-ink/30 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-ink/30 animate-pulse [animation-delay:200ms]" />
              <span className="w-2 h-2 rounded-full bg-ink/30 animate-pulse [animation-delay:400ms]" />
            </div>
          </div>
        )}
      </div>

      <div className="py-8 flex gap-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type your reply…"
          disabled={loading}
          className="flex-1 h-12 bg-transparent border-ink/20 rounded-none"
        />
        <Button
          onClick={submit}
          disabled={loading}
          className="h-12 px-6 rounded-soft bg-ink text-cream hover:bg-accent disabled:bg-ink/50 disabled:text-cream/80"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
