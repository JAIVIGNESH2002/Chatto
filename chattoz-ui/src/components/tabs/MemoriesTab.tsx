/** @format */
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit2, Check, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Memory {
  id: string;
  message: string;
}

export function MemoriesTab({ userId }: { userId: string }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newMemory, setNewMemory] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const RENDER_API_BASE_URL = "https://chatto-f2pm.onrender.com/api/v1";
  const fetchMemories = async () => {
    try {
      setFetching(true);
      const res = await fetch(`${RENDER_API_BASE_URL}/memory/${userId}`);
      const data = await res.json();
      const parsedMemories: Memory[] = data.memories.map((m: any) => ({
        id: m.id,
        message: m.message,
      }));
      setMemories(parsedMemories);
    } catch (err) {
      toast.error("Failed to load memories.", {
        description: "Error",
      });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  // ✅ Add memory (reload with skeleton)
  const addMemory = async () => {
    if (!newMemory.trim()) return;
    setLoading(true);
    toast("Adding memory...", {
      description: "Please wait while we process it.",
    });

    try {
      const res = await fetch(`${RENDER_API_BASE_URL}/memory/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, message: newMemory }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setNewMemory("");
        await fetchMemories(); // refresh enriched memories
        toast.success("Added to memories.", {
          description: "Success",
        });
      }
    } catch (err) {
      toast.error("Failed to add memory.", {
        description: "Error",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit memory (optimistic)
  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`${RENDER_API_BASE_URL}/memory/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          memory_id: id,
          new_message: editText,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMemories((prev) =>
          prev.map((m) => (m.id === id ? { ...m, message: editText } : m))
        );
        setEditingId(null);
        setEditText("");
        toast.success("Memory updated.", {
          description: "Success",
        });
      }
    } catch {
      toast.error("Failed to update memory.", {
        description: "Error",
      });
    }
  };

  // ✅ Delete memory (optimistic)
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${RENDER_API_BASE_URL}/memory/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, memory_id: id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        toast.success("Memory deleted.", {
          description: "Success",
        });
      }
    } catch {
      toast.error("Failed to delete memory.", {
        description: "Error",
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 pb-20 space-y-4">
      <h1 className="text-xl font-semibold">Your Memories 🎞️</h1>

      {/* Add New Memory */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="space-y-2">
          <p className="text-gray-500 text-sm">
            Add a new memory about yourself. Keep it short and descriptive – the
            AI will enrich and remember it!
          </p>
          <Textarea
            placeholder="E.g., Loves iced coffee, enjoys morning runs..."
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
          />
          <Button
            onClick={addMemory}
            className="flex items-center gap-1"
            disabled={loading}
          >
            <Plus size={16} />
            {loading ? "Adding..." : "Add Memory"}
          </Button>
        </CardContent>
      </Card>

      {/* Memories List (whole page scrolls together) */}
      {fetching ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <AnimatePresence>
          {memories.map((memory) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="rounded-2xl shadow-md">
                <CardContent className="flex items-center justify-between space-x-3">
                  {editingId === memory.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => saveEdit(memory.id)}
                        className="flex items-center gap-1"
                      >
                        <Check size={16} /> Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1">{memory.message}</div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(memory.id);
                        setEditText(memory.message);
                      }}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(memory.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {!fetching && memories.length === 0 && (
        <p className="text-gray-500">No memories saved yet.</p>
      )}
    </div>
  );
}
