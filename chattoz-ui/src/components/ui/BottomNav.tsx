/** @format */

// components/layout/BottomNav.tsx
"use client";

import Link from "next/link";
import { Home, MessageCircle, Sparkles } from "lucide-react";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-around">
      <Link href="/slate" className="flex flex-col items-center text-sm">
        <Sparkles size={20} />
        Slate
      </Link>
      <Link href="/chat" className="flex flex-col items-center text-sm">
        <MessageCircle size={20} />
        Chat
      </Link>
      <Link href="/memories" className="flex flex-col items-center text-sm">
        <Home size={20} />
        Memories
      </Link>
    </nav>
  );
}
