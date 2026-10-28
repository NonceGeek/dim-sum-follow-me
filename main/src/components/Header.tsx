"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UserProfile from "@/components/UserProfile";

const navLinkClass =
  "shrink-0 whitespace-nowrap rounded-lg border border-green-200/30 px-2.5 py-1.5 text-xs text-green-200 transition hover:border-green-200/60 hover:bg-green-200/10 hover:text-green-100 sm:px-3 sm:text-sm";

export default function Header() {
  const [showMiniProgram, setShowMiniProgram] = useState(false);

  useEffect(() => {
    if (!showMiniProgram) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMiniProgram(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showMiniProgram]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#181b1f]/90 backdrop-blur-md">
        <div className="mx-3 flex flex-col gap-2 py-3 sm:mx-5 sm:gap-3 md:flex-row md:items-center">
          <UserProfile className="py-0 mx-0 shrink-0" />
          <nav
            className="flex flex-wrap items-center gap-1.5 sm:gap-2"
            aria-label="主导航"
          >
            <Link href="/" className={navLinkClass}>
              主页
            </Link>
            <Link href="/free_shadowing" className={navLinkClass}>
              自由跟读
            </Link>
            <Link href="/free_shadowing/free" className={navLinkClass}>
              超自由跟读
            </Link>
            <Link href="/leaderboard" className={navLinkClass}>
              🏆 排行榜
            </Link>
            <Link href="/whitepaper" className={navLinkClass}>
              👉说明书👈
            </Link>
            <Link
              href="https://lang-bot.aidimsum.com/pet"
              target="_blank"
              rel="noopener noreferrer"
              className={navLinkClass}
            >
              同包仔学粤语！
            </Link>
            <button
              type="button"
              onClick={() => setShowMiniProgram(true)}
              className={navLinkClass}
            >
              体验小程序版本
            </button>
          </nav>
        </div>
      </header>

      {showMiniProgram && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="体验小程序版本"
          onClick={() => setShowMiniProgram(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-sm overflow-auto rounded-2xl border border-white/10 bg-[#181b1f] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-green-200">
                体验小程序版本
              </h2>
              <button
                type="button"
                onClick={() => setShowMiniProgram(false)}
                className="rounded-lg px-2 py-1 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="关闭"
              >
                X
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/ywyx_0.8.jpg"
              alt="粤语小程序二维码"
              className="mx-auto w-full rounded-xl"
            />
            <p className="mt-3 text-center text-xs text-white/60">
              微信扫码体验小程序版本
            </p>
          </div>
        </div>
      )}
    </>
  );
}
