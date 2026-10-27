import React from "react";

interface ScoreDisplayProps {
  score: number | string;
  feedback: string;
}

const ScoreDisplay = ({ score, feedback }: ScoreDisplayProps) => {
  return (
    <div className="px-2 pb-4 pt-8 text-center sm:pt-12">
      <div className="mx-auto my-0 w-22 rounded-2xl border-3 border-green-200 py-3 text-center text-4xl font-bold">
        {score}
      </div>
      <p className="mt-3 break-words px-2 text-sm text-green-200 sm:text-base">
        {feedback}
      </p>
    </div>
  );
};

export default ScoreDisplay;
