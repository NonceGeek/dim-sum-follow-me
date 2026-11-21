"use client";

import { useEffect, useRef, useState } from "react";
import { IoPause, IoPlay } from "react-icons/io5";
import { Button } from "@/components/ui/button";

/** Only one leaderboard recording plays at a time. */
let activeAudio: HTMLAudioElement | null = null;

export default function LeaderboardPlayButton({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      if (activeAudio === audio) activeAudio = null;
    };
  }, []);

  const toggle = async () => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(src);
      audio.preload = "none";
      audio.addEventListener("ended", () => setPlaying(false));
      audio.addEventListener("pause", () => setPlaying(false));
      audio.addEventListener("play", () => setPlaying(true));
      audioRef.current = audio;
    }

    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (activeAudio && activeAudio !== audio) activeAudio.pause();
    activeAudio = audio;
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch (err) {
      console.error("播放失败:", err);
      setPlaying(false);
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      className="rounded-full"
      onClick={toggle}
      aria-label={playing ? "暂停录音" : "播放录音"}
    >
      {playing ? <IoPause className="size-4" /> : <IoPlay className="ml-0.5 size-4" />}
    </Button>
  );
}
