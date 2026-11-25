"use client";

import React from "react";
import { Paper } from "@/components/ui/paper";

interface ScoreDisplayProps {
  score: number | string;
  feedback: string;
  /** OSS upload time; shown as a fixed Beijing-time stamp for screenshots */
  uploadedAt?: Date;
}

function formatBeijingTime(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

const ScoreDisplay = ({ score, feedback, uploadedAt }: ScoreDisplayProps) => {
  return (
    <div className="px-2 pb-4 pt-8 text-center sm:pt-12">
      <Paper
        stock="sticky-yellow"
        tape="top"
        seed={`score-${score}`}
        className="mx-auto my-0 w-28 py-4 text-center font-script text-5xl font-bold ll-num"
      >
        {score}
      </Paper>
      <p className="mt-4 break-words px-2 text-base text-ink sm:text-lg">
        {feedback}
      </p>
      {uploadedAt && (
        <p
          className="mt-6 select-none text-[10px] tracking-wide text-ink-soft/40"
          aria-hidden
        >
          {formatBeijingTime(uploadedAt)}
        </p>
      )}
    </div>
  );
};

export default ScoreDisplay;
