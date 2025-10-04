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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Gradient header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 shadow-md flex flex-col">
        <h1 className="text-2xl font-bold tracking-wide">Chatto</h1>
        <p className="text-sm text-white/80 mt-1">
          Welcome to your guest chat session! Your messages will be translated
          in real-time.
        </p>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center mt-10">
            Start the conversation by typing a message below 👇
          </p>
        )}

        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg break-words max-w-[80%] ${
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

      {/* Suggestions right above input, aligned to the right */}
      {suggestions.length > 0 && (
        <div className="flex justify-end flex-wrap gap-2 mb-2 mr-6">
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
      <div className="flex gap-2 p-4 border-t border-gray-200 bg-white">
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
