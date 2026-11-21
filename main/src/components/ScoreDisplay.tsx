import React from "react";
import { Paper } from "@/components/ui/paper";

interface ScoreDisplayProps {
  score: number | string;
  feedback: string;
}

const ScoreDisplay = ({ score, feedback }: ScoreDisplayProps) => {
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
    </div>
  );
};

export default ScoreDisplay;
