/** @format */
"use client";

import { useState } from "react";
import { ChatTab } from "@/components/tabs/ChatTab";
import { SlateTab } from "@/components/tabs/SlateTab";
import { MemoriesTab } from "@/components/tabs/MemoriesTab";
import BottomNav from "@/components/ui/BottomNav";
import { useUser } from "@clerk/nextjs";
import { Toaster } from "sonner";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"slate" | "chat" | "memory">(
    "chat"
  );
  const { user, isSignedIn } = useUser();
  const userId = user?.id || "";
  return (
    <div className="h-full flex flex-col">
      {/* Main content */}
      <Toaster position="top-right" />
      <div className="flex-1">
        <div className={activeTab === "chat" ? "block" : "hidden"}>
          <ChatTab />
        </div>
        <div className={activeTab === "slate" ? "block" : "hidden"}>
          <SlateTab />
        </div>
        {activeTab === "memory" && <MemoriesTab userId={userId} />}
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
