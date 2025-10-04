/** @format */
"use client";

import { useState } from "react";
import { ChatTab } from "@/components/tabs/ChatTab";
import { SlateTab } from "@/components/tabs/SlateTab";
import { MemoriesTab } from "@/components/tabs/MemoriesTab";
import BottomNav from "@/components/ui/BottomNav";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"slate" | "chat" | "memory">(
    "chat"
  );
  const userId = "123";

  return (
    <div className="h-full flex flex-col">
      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <div className={activeTab === "chat" ? "block" : "hidden"}>
          <ChatTab />
        </div>
        <div className={activeTab === "slate" ? "block" : "hidden"}>
          <SlateTab />
        </div>
        <div className={activeTab === "memory" ? "block" : "hidden"}>
          <MemoriesTab userId={userId} />
        </div>
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
