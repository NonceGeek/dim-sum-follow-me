"use client";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import WaveRecorder, { WaveRecorderHandle } from "@/components/WaveRecorder";
import ScoreDisplay from "@/components/ScoreDisplay";
import CelebrationEffect from "@/components/CelebrationEffect";

export interface GameHandle {
  reset: () => void;
}

export interface QuestionResult {
  transcript: string;
  yueText: string;
  score: number;
  feedback: string;
  recordingBlob?: Blob | null;
}

const Game = forwardRef<
  GameHandle,
  { getResult: any; onResult?: (result: QuestionResult) => void }
>(({ getResult, onResult }, ref) => {
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showScore, setShowScore] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [yueText, setYueText] = useState("");

  const recorderRef = useRef<WaveRecorderHandle>(null);

  // 处理录音完成，记录识别结果、粤语原文和得分
  const handleRecordingComplete = (
    score: number,
    feedback: string,
    transcript: string,
    yueText: string,
    recordingBlob?: Blob | null,
  ) => {
    setScore(score);
    setFeedback(feedback);
    setTranscript(transcript);
    setYueText(yueText);
    setShowScore(true);
    getResult(score);
    onResult?.({ transcript, yueText, score, feedback, recordingBlob });
  };

  const resetDisplayState = () => {
    setScore(0);
    setFeedback("");
    setShowScore(false);
    setTranscript("");
    setYueText("");
  };

  // 重置所有状态（供父组件通过 ref 调用）
  const resetAll = () => {
    resetDisplayState();
    recorderRef.current?.reset();
  };

  useImperativeHandle(ref, () => ({ reset: resetAll }));

  return (
    <main className="container mx-auto max-w-4xl px-1 py-4 sm:px-0 sm:py-8">
      {score > 70 && (
        <CelebrationEffect type={"confetti"} message={"发音很棒"} />
      )}
      <WaveRecorder
        ref={recorderRef}
        onRecordingComplete={handleRecordingComplete}
        onReset={resetDisplayState}
      />
      {showScore && <ScoreDisplay score={score} feedback={feedback} />}
    </main>
  );
});

Game.displayName = "Game";

export default Game;
