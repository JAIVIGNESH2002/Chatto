/** @format */
"use client";

import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function AuthPage() {
  return (
    <div className="relative flex flex-col md:flex-row items-center justify-center min-h-screen bg-gradient-to-r from-purple-600 to-indigo-600 overflow-hidden">
      {/* Hero Section */}
      <div className="flex-shrink-0 text-center md:text-left px-4 md:px-10 md:w-1/2 flex flex-col justify-center items-center md:items-start">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Chatto - Breaking language barriers, one chat at a time 🚀
          <br className="hidden md:block" />
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-white max-w-md mx-auto md:mx-0 mb-4">
          Chat with anyone, in any language, from anywhere, effortlessly.
        </p>

        {/* Sponsors for desktop */}
        <div className="hidden md:flex gap-6 items-center mt-2">
          <div className="flex items-center gap-2 text-white text-lg font-semibold">
            <span>Powered by</span>
            <Image
              src="/cerebras-logo.png"
              alt="Cerebras"
              width={80}
              height={24}
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-2 text-white text-lg font-semibold">
            <span>and LLAMA by</span>
            <Image
              src="/meta-logo-no-bg.png"
              alt="Meta"
              width={80}
              height={10}
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* SignIn Form */}
      <div className="relative z-10 w-full max-w-md mt-6 md:mt-0 flex justify-center px-4">
        <SignIn routing="hash" signUpUrl="/sign-up" />
      </div>

      {/* Sponsors for mobile */}
      <div className="flex md:hidden flex-col gap-4 items-center mt-6 mb-6 px-4">
        <div className="flex items-center gap-2 text-white text-base font-semibold">
          <span>Powered by</span>
          <Image
            src="/cerebras-logo.png"
            alt="Cerebras"
            width={80}
            height={24}
            className="object-contain"
          />
        </div>
        <div className="flex items-center gap-2 text-white text-base font-semibold">
          <span>and LLAMA by</span>
          <Image
            src="/meta-logo-no-bg.png"
            alt="Meta"
            width={80}
            height={10}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
