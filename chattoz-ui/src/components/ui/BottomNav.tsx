/** @format */

// /** @format */

// // components/layout/BottomNav.tsx
// "use client";

// import Link from "next/link";
// import { Home, MessageCircle, Sparkles } from "lucide-react";

// export default function BottomNav() {
//   return (
//     <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-around">
//       <Link href="/slate" className="flex flex-col items-center text-sm">
//         <Sparkles size={20} />
//         Slate
//       </Link>
//       <Link href="/chat" className="flex flex-col items-center text-sm">
//         <MessageCircle size={20} />
//         Chat
//       </Link>
//       <Link href="/memories" className="flex flex-col items-center text-sm">
//         <Home size={20} />
//         Memories
//       </Link>
//     </nav>
//   );
// }
import { MessagesSquare, BrainCircuit, SquarePen } from "lucide-react";

export default function BottomNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: "chat" | "slate" | "memory") => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-md bg-white/70 backdrop-blur-md border-t shadow-lg rounded-t-2xl">
        <div className="flex justify-around items-center p-2">
          {[
            {
              key: "slate",
              icon: <SquarePen className="w-6 h-6" />,
              label: "Slate",
            },
            {
              key: "chat",
              icon: <MessagesSquare className="w-6 h-6" />,
              label: "Chat",
            },
            {
              key: "memory",
              icon: <BrainCircuit className="w-6 h-6" />,
              label: "Memories",
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key as any)}
              className={`flex flex-col items-center px-3 py-1 transition-all duration-200 ${
                activeTab === item.key
                  ? "text-blue-600 scale-110"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
