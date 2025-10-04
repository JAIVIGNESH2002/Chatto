/** @format */

"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  Loader2,
  Send,
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  RefreshCcw,
} from "lucide-react";

interface Memory {
  id: string;
  message: string;
}

function MemoryItem({
  memory,
  onEdit,
  onDelete,
}: {
  memory: Memory;
  onEdit: (id: string, newMessage: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(memory.message);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(memory.message);
  }, [memory.message]);

  return (
    <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-800 flex items-center gap-2">
      {editing ? (
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
        />
      ) : (
        <div className="flex-1">{memory.message}</div>
      )}

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <button
              aria-label="Save memory"
              onClick={async () => {
                setBusy(true);
                const ok = await onEdit(memory.id, value);
                setBusy(false);
                if (ok) setEditing(false);
              }}
              className="p-1 text-green-600"
              title="Save"
            >
              <Check size={16} />
            </button>
            <button
              aria-label="Cancel edit"
              onClick={() => {
                setEditing(false);
                setValue(memory.message);
              }}
              className="p-1 text-gray-500"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              aria-label="Edit memory"
              onClick={() => setEditing(true)}
              className="p-1 text-blue-600"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              aria-label="Delete memory"
              onClick={async () => {
                const ok = await onDelete(memory.id);
                if (!ok) alert("Failed to delete memory");
              }}
              className="p-1 text-red-600"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function SlateTab() {
  const [input, setInput] = useState("");
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("ja");
  const [showOutput, setShowOutput] = useState(false);
  const [hideSource, setHideSource] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sourceContent, setSourceContent] = useState("");
  const [targetContent, setTargetContent] = useState("");
  const [targetFontSize, setTargetFontSize] = useState(18);

  const [presetInput, setPresetInput] = useState("");
  const [presets, setPresets] = useState<string[]>([]);
  const [appliedPresets, setAppliedPresets] = useState<string[]>([]);

  const [memoriesUsed, setMemoriesUsed] = useState<Memory[]>([]);
  const [memoryBacked, setMemoryBacked] = useState(false);
  const [showMemoriesModal, setShowMemoriesModal] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const skipAutoRef = useRef(false);

  // --- translate (enrich flag controls whether host is enriched) ---
  const translate = async (
    text: string,
    enrich: boolean = false,
    updateSource: boolean = false,
    presetsArg?: string[]
  ) => {
    if (!text || !text.trim()) return;

    const presetsToSend = presetsArg ?? (enrich ? presets : appliedPresets);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/slate/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source_lang: source,
          target_lang: target,
          enrich,
          presets: presetsToSend,
        }),
        signal: controller.signal,
      });
      const data = await res.json();

      if (!controller.signal.aborted) {
        if (enrich || updateSource) {
          skipAutoRef.current = true;
          setSourceContent(data.host_language ?? text);
          setTimeout(() => {
            skipAutoRef.current = false;
          }, 50);
        }

        setTargetContent(data.guest_language ?? "");
        setMemoryBacked(Boolean(data.memory_backed));
        setMemoriesUsed(Array.isArray(data.memories) ? data.memories : []);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setSourceContent("Network or server error");
        setTargetContent("Network or server error");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setShowOutput(true);
    setSourceContent(input);
    await translate(input, true, true, presets);
    setAppliedPresets(presets);
    setPresets([]);
    setInput("");
  };

  // debounced auto-translate (translate-only, does not update source)
  useEffect(() => {
    if (!showOutput || !sourceContent.trim()) return;
    if (skipAutoRef.current) {
      skipAutoRef.current = false;
      return;
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      translate(sourceContent, false, false);
    }, 1200);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceContent]);

  // presets handlers
  const handlePresetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && presetInput.trim()) {
      e.preventDefault();
      const tag = presetInput.trim();
      if (!presets.includes(tag)) setPresets((p) => [...p, tag]);
      setPresetInput("");
    }
  };
  const removeFloatingPreset = (tag: string) =>
    setPresets((p) => p.filter((x) => x !== tag));
  const removeAppliedPreset = async (tag: string) => {
    const newApplied = appliedPresets.filter((p) => p !== tag);
    setAppliedPresets(newApplied);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    await translate(sourceContent, true, true, newApplied);
  };

  // Save current sourceContent to memory
  const saveToMemory = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/memory/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "123", message: sourceContent }),
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Saved to memory ✅");
      } else {
        alert("Failed to save to memory");
      }
    } catch {
      alert("Error saving memory");
    }
  };

  // memory edit/delete handlers that call backend endpoints
  const handleMemoryEdit = async (id: string, newMessage: string) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/memory/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "123",
          memory_id: id,
          new_message: newMessage,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMemoriesUsed((prev) =>
          prev.map((m) => (m.id === id ? { ...m, message: newMessage } : m))
        );
        return true;
      } else {
        alert("Edit failed");
        return false;
      }
    } catch (err) {
      console.error(err);
      alert("Edit failed");
      return false;
    }
  };

  const handleMemoryDelete = async (id: string) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/memory/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "123", memory_id: id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMemoriesUsed((prev) => prev.filter((m) => m.id !== id));
        return true;
      } else {
        alert("Delete failed");
        return false;
      }
    } catch (err) {
      console.error(err);
      alert("Delete failed");
      return false;
    }
  };

  return (
    <>
      <div className="p-4 space-y-4 pb-20">
        {/* Language selectors */}
        <div className="flex gap-3">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="From" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
            </SelectContent>
          </Select>

          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Input Box */}
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button onClick={handleSend} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Floating preset chips (pre-send) */}
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <span
                key={p}
                className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
              >
                {p}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeFloatingPreset(p)}
                />
              </span>
            ))}
          </div>
        )}

        <Input
          placeholder="Add presets (press Enter)..."
          value={presetInput}
          onChange={(e) => setPresetInput(e.target.value)}
          onKeyDown={handlePresetKeyDown}
        />

        {/* Output card */}
        {showOutput && (
          <Card className="rounded-2xl shadow-md">
            <CardContent className="space-y-3 p-4">
              {/* Source area */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">Source (editable)</p>

                  {!hideSource && appliedPresets.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {appliedPresets.map((preset) => (
                        <span
                          key={preset}
                          className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                        >
                          {preset}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeAppliedPreset(preset)}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={saveToMemory}
                  >
                    <Plus size={14} className="mr-1" />
                    Add to Memory
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={async () => {
                      if (!sourceContent.trim()) return;
                      setLoading(true);
                      await translate(
                        sourceContent,
                        true,
                        true,
                        appliedPresets
                      );
                      setLoading(false);
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : (
                      <RefreshCcw size={14} className="mr-1" />
                    )}
                    Regenerate
                  </Button>
                  {/* Memories button in source: green enabled if memoryBacked true */}
                  <Button
                    size="sm"
                    className={`text-xs ${
                      memoryBacked
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                    disabled={!memoryBacked}
                    onClick={() => memoryBacked && setShowMemoriesModal(true)}
                  >
                    Memories
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHideSource(!hideSource)}
                  >
                    {hideSource ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </div>

              {!hideSource && (
                <Textarea
                  value={loading ? "Translating..." : sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  disabled={loading}
                />
              )}

              <Separator />

              {/* Target area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">Target (translated)</p>

                    {/* Presets applied badge */}
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        appliedPresets.length > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      Presets applied
                    </span>

                    {/* Memories badge (always visible on target, green if memoryBacked) */}
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        memoryBacked
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {memoryBacked ? "Memories used" : "Based on memories"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Font size:</label>
                    <input
                      type="range"
                      min={14}
                      max={28}
                      value={targetFontSize}
                      onChange={(e) =>
                        setTargetFontSize(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div
                  className="p-4 bg-gray-50 rounded-xl text-gray-800 min-h-[50px] flex items-start"
                  style={{ fontSize: targetFontSize }}
                >
                  {loading ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Translating...
                    </div>
                  ) : (
                    <div>{targetContent}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Memories modal (opened from source Memories button) */}
      {showMemoriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMemoriesModal(false)}
          />
          <div className="relative bg-white rounded-xl p-4 w-[min(90%,600px)] shadow-lg z-10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Memories used</h3>
              <button
                className="text-xs text-gray-500"
                onClick={() => setShowMemoriesModal(false)}
              >
                Close
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-auto">
              {memoriesUsed.length === 0 ? (
                <div className="text-sm text-gray-500">No memories listed.</div>
              ) : (
                memoriesUsed.map((m) => (
                  <MemoryItem
                    key={m.id}
                    memory={m}
                    onEdit={handleMemoryEdit}
                    onDelete={handleMemoryDelete}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
