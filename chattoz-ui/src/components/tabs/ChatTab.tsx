/** @format */
"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useUser } from "@clerk/nextjs";

interface ChatMessage {
  from: string;
  original: string;
  translated: string;
  autoModeEnabled?: boolean;
  autoKey?: string;
}

export function ChatTab() {
  const { user, isSignedIn } = useUser();
  const userId = user?.id;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [inviteText, setInviteText] = useState(
    "I would like to chat with you, can you please scan this QR"
  );
  const [sourceLang, setSourceLang] = useState("english");
  const [targetLang, setTargetLang] = useState("spanish");
  const [translatedInvite, setTranslatedInvite] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [guestJoined, setGuestJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const RENDER_API_BASE_URL = "https://chatto-f2pm.onrender.com/api/v1";
  const generateSession = async () => {
    setLoading(true);
    try {
      // Translate invite text
      const translateRes = await fetch(
        `${RENDER_API_BASE_URL}/slate/translate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            text: inviteText,
            source_lang: sourceLang,
            target_lang: targetLang,
            enrich: false,
            presets: [],
            memories: [],
          }),
        }
      );
      const translateData = await translateRes.json();
      setTranslatedInvite(translateData.guest_language ?? inviteText);

      // Create session
      const res = await fetch(`${RENDER_API_BASE_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host_language: sourceLang,
          target_language: targetLang,
          mode: "auto",
        }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setQrBase64(data.qr_base64);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = (msg?: string) => {
    const text = msg ?? input;
    if (!text.trim() || !wsRef.current) return;
    wsRef.current.send(
      JSON.stringify({ message: text, autoModeEnabled: false })
    );
    if (!msg) setInput("");
    setSuggestions([]);
  };

  useEffect(() => {
    if (!sessionId) return;
    const ws = new WebSocket(
      `ws://${RENDER_API_BASE_URL}/${sessionId}/host/${userId}`
    );
    wsRef.current = ws;

    ws.onopen = () => console.log("Host WebSocket connected");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "guest_joined") {
        setGuestJoined(true);
        return;
      }

      if (data.type === "suggestions") {
        setSuggestions(data.suggestions ?? []);
        return;
      }

      setMessages((prev) => [...prev, data]);
    };

    ws.onclose = () => console.log("Host WebSocket disconnected");
    return () => ws.close();
  }, [sessionId]);

  return (
    <div className="p-4 pb-28 flex flex-col h-screen">
      {!sessionId ? (
        <Card className="p-4 rounded-2xl shadow-md space-y-4">
          <div className="flex gap-2 p-2">
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="french">French</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="german">German</SelectItem>
                <SelectItem value="chinese">Chinese</SelectItem>
              </SelectContent>
            </Select>

            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="french">French</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="german">German</SelectItem>
                <SelectItem value="chinese">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            value={inviteText}
            onChange={(e) => setInviteText(e.target.value)}
            placeholder="Invite message"
          />
          <Button onClick={generateSession} disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin w-4 h-4 mr-2" />
            ) : (
              "Generate QR & Link"
            )}
          </Button>
        </Card>
      ) : !guestJoined ? (
        <Card className="p-4 rounded-2xl shadow-md space-y-4 text-center">
          {translatedInvite && <p className="mb-2">{translatedInvite}</p>}
          {qrBase64 && (
            <img
              src={`data:image/png;base64,${qrBase64}`}
              alt="QR code"
              className="mx-auto mb-2"
            />
          )}
          <div className="flex gap-2">
            <Input
              value={`${RENDER_API_BASE_URL}/s/${sessionId}`}
              readOnly
              className="flex-1"
            />
            <Button
              onClick={() =>
                navigator.clipboard.writeText(
                  `${RENDER_API_BASE_URL}/s/${sessionId}`
                )
              }
            >
              Copy
            </Button>
          </div>
          <p className="text-gray-500 mt-2 animate-pulse">
            Waiting for guest to join...
          </p>
        </Card>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-2 space-y-2">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg break-words max-w-[80%] ${
                  m.from === "host"
                    ? "bg-blue-100 self-end ml-auto"
                    : "bg-green-100 self-start mr-auto"
                }`}
              >
                <p className="text-gray-500 text-xs mb-1">|-{m.original}</p>
                <p className="font-semibold">
                  {m.from === "host" ? `You: ${m.translated}` : m.translated}
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

          {/* Input at bottom */}
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
      )}
    </div>
  );
}
