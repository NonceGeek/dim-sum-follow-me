"use client";

import { useState } from "react";
import Link from "next/link";
import UserProfile from "@/components/UserProfile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NAV_LINKS = [
  { href: "/", label: "主页" },
  { href: "/free_shadowing", label: "自由跟读" },
  { href: "/free_shadowing/free", label: "超自由跟读" },
  { href: "/leaderboard", label: "🏆 排行榜" },
  { href: "/whitepaper", label: "👉说明书👈" },
] as const;

export default function Header() {
  const [showMiniProgram, setShowMiniProgram] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md">
        <div className="mx-3 flex flex-col gap-2 py-3 sm:mx-5 sm:gap-3 md:flex-row md:items-center">
          <UserProfile className="py-0 mx-0 shrink-0" />
          <nav
            className="flex flex-wrap items-center gap-1.5 sm:gap-2"
            aria-label="主导航"
          >
            {NAV_LINKS.map((link) => (
              <Button key={link.href} asChild variant="outline" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
            <Button asChild variant="outline" size="sm">
              <Link
                href="https://lang-bot.aidimsum.com/pet"
                target="_blank"
                rel="noopener noreferrer"
              >
                同包仔学粤语！
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowMiniProgram(true)}
            >
              体验小程序版本
            </Button>
          </nav>
        </div>
      </header>

      <Dialog open={showMiniProgram} onOpenChange={setShowMiniProgram}>
        <DialogContent className="max-w-sm" tape="top">
          <DialogHeader>
            <DialogTitle>体验小程序版本</DialogTitle>
            <DialogDescription>微信扫码体验小程序版本</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/ywyx_0.8.jpg"
            alt="粤语小程序二维码"
            className="mx-auto w-full rounded-sm"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
