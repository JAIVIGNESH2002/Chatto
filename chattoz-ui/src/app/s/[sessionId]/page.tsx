/** @format */
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";
import React from "react";

interface ChatMessage {
  from: string;
  original: string;
  translated: string;
  autoModeEnabled?: boolean;
  autoKey?: string;
}

export default function GuestChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = React.use(params);

  const userId = "guest";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(
      `ws://localhost:8000/api/v1/ws/${sessionId}/guest/${userId}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Guest WebSocket connected");
      ws.send(JSON.stringify({ type: "guest_joined" }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "suggestions") {
        setSuggestions(data.suggestions ?? []);
        return;
      }

      setMessages((prev) => [...prev, data]);
    };

    ws.onclose = () => console.log("Guest WebSocket disconnected");
    return () => ws.close();
  }, [sessionId]);

  const sendMessage = (msg?: string) => {
    const text = msg ?? input;
    if (!text.trim() || !wsRef.current) return;
    wsRef.current.send(
      JSON.stringify({ message: text, autoModeEnabled: false })
    );
    if (!msg) setInput("");
    setSuggestions([]);
  };

  return (
    <div className="p-4 pb-24 flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto mb-2 space-y-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg break-words max-w-[80%] ${
              m.from === "guest"
                ? "bg-blue-100 self-end ml-auto"
                : "bg-green-100 self-start mr-auto"
            }`}
          >
            <p className="text-gray-500 text-xs mb-1">|-{m.original}</p>
            <p className="font-semibold">
              {m.from === "guest" ? `You: ${m.translated}` : m.translated}
            </p>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              className="px-2 py-1 rounded-full bg-gray-200 text-sm hover:bg-gray-300"
              onClick={() => sendMessage(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input fixed at bottom */}
      <div className="flex gap-2">
        <Input
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={() => sendMessage()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
