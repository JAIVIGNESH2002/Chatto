/** @format */

// app/memories/[userId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit2, Check, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Memory {
  id: string;
  message: string;
}

export function MemoriesTab({ userId }: { userId: string }) {
  // const userId = params.userId || "123";
  const [memories, setMemories] = useState<Memory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newMemory, setNewMemory] = useState("");

  const fetchMemories = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/memory/${userId}`);
      const data = await res.json();
      // Adapt to new response structure
      const parsedMemories: Memory[] = data.memories.map((m: any) => ({
        id: m.id,
        message: m.message,
      }));
      setMemories(parsedMemories);
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  // Add new memory
  const addMemory = async () => {
    if (!newMemory.trim()) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/memory/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, message: newMemory }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMemories([{ id: data.memory_id, message: newMemory }, ...memories]);
        setNewMemory("");
      }
    } catch (err) {
      console.error("Failed to add memory:", err);
    }
  };

  // Edit memory
  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/memory/edit`, {
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
      }
    } catch (err) {
      console.error("Failed to edit memory:", err);
    }
  };

  // Delete memory
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/memory/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, memory_id: id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      <h1 className="text-xl font-semibold">Your Memories</h1>

      {/* Add New Memory Card */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="space-y-2">
          <p className="text-gray-500 text-sm">
            Add a new memory about yourself. Keep it short and descriptive – the
            AI will remember it!
          </p>
          <Textarea
            placeholder="E.g., Loves iced coffee, enjoys morning runs..."
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
          />
          <Button onClick={addMemory} className="flex items-center gap-1">
            <Plus size={16} /> Add Memory
          </Button>
        </CardContent>
      </Card>

      {/* List of Memories */}
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

      {memories.length === 0 && (
        <p className="text-gray-500">No memories saved yet.</p>
      )}
    </div>
  );
}
