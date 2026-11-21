"use client";
import { useState, useRef, useEffect } from "react";
import { IoVolumeMediumSharp } from "react-icons/io5";
import { useRouter, useSearchParams } from "next/navigation";
import Game from "@/components/Game";
import { useQuestionStore } from "@/stores/questionStore";
import classNames from "classnames";
import { fetchJyutpingContent } from "@/utils/jyutpingApi";
import { buildFreeShadowingShareUrl } from "@/utils/customShadowing";
import { Button } from "@/components/ui/button";
import { Paper } from "@/components/ui/paper";

interface Question {
  content?: string;
  originalText?: string;
  yueText?: string;
  audioUrl?: string;
  videoUrl?: string;
  skipJyutpingFetch?: boolean;
}

export default function FollowItemView({
  questions,
  backHref = "/",
}: {
  questions: Question[];
  backHref?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quesNumber, setQuesNumber] = useState(0);
  const [isAudoSlowSpeed, setIsAudoSlowSpeed] = useState(false);
  const [hasResult, setResult] = useState(false);
  const [displayContent, setDisplayContent] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setCurrentQuestion } = useQuestionStore();

  useEffect(() => {
    setCurrentQuestion(questions[quesNumber] ?? null);
  }, [questions, quesNumber, setCurrentQuestion]);

  useEffect(() => {
    const q = questions[quesNumber];
    if (!q) {
      setDisplayContent("");
      return;
    }

    const sourceText = q.yueText?.trim() || q.content?.trim() || "";
    setDisplayContent(q.content ?? sourceText);

    if (!sourceText || q.skipJyutpingFetch) return;

    let cancelled = false;
    fetchJyutpingContent(q.yueText?.trim() || sourceText).then((content) => {
      if (!cancelled) setDisplayContent(content);
    });

    return () => {
      cancelled = true;
    };
  }, [questions, quesNumber]);

  const goBack = () => {
    router.push(backHref);
  };

  const currentQ = questions[quesNumber];
  const isVideoMode = Boolean(currentQ?.videoUrl);

  const playReference = () => {
    if (isVideoMode) {
      videoRef.current?.play();
      return;
    }
    audioRef.current?.play();
  };

  const changePlaybackRate = (rate: number) => {
    setIsAudoSlowSpeed(rate === 0.5);
    if (isVideoMode) {
      if (videoRef.current) videoRef.current.playbackRate = rate;
      return;
    }
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const getResult = () => {
    setResult(true);
  };

  const stParam = (searchParams.get("st") ?? searchParams.get("text"))?.trim() ?? "";
  const audioParam = searchParams.get("audio")?.trim() ?? "";
  const videoParam = searchParams.get("video")?.trim() ?? "";
  const canShareLink = Boolean(stParam && (audioParam || videoParam));

  const copyShareLink = async () => {
    if (!canShareLink) return;
    try {
      await navigator.clipboard.writeText(
        buildFreeShadowingShareUrl(
          stParam,
          videoParam || audioParam,
          videoParam ? "video" : "audio",
        ),
      );
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      alert("复制失败，请手动复制浏览器地址栏链接");
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" className="ml-3 mt-5" onClick={goBack}>
        {"<返回"}
      </Button>
      <div className="wrapper px-4 py-4">
        <div className="text-content">
          <div className="ml-1 mt-3 flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-baseline text-ink-soft">
              <span className="shrink-0">原文:&nbsp;</span>
              <p className="min-w-0 text-ink">{currentQ?.originalText}</p>
            </div>
            {canShareLink && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyShareLink}
                className="w-full sm:w-auto"
              >
                {shareCopied ? "已复制链接！" : "👉复制分享链接"}
              </Button>
            )}
          </div>
          <Paper
            key={`${quesNumber}-${displayContent}`}
            stock="pad"
            rules="ruled"
            tape="top"
            seed={`follow-${quesNumber}`}
            className="text-item relative mt-5 break-words pt-4 pr-4 pb-2 pl-14 text-lg font-bold leading-7"
          >
            {displayContent}
            {!isVideoMode && (
              <div className="audio-icon flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="播放原声"
                  onClick={playReference}
                >
                  <IoVolumeMediumSharp className="size-6" />
                </Button>
              </div>
            )}
          </Paper>

          {isVideoMode ? (
            <div className="mt-4 flex justify-center">
              <video
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                src={currentQ?.videoUrl}
                className="w-full max-w-2xl rounded-sm border border-pencil-mark"
              />
            </div>
          ) : (
            <audio ref={audioRef} muted={false} src={currentQ?.audioUrl}>
              <source type="audio/mpeg" />
            </audio>
          )}
        </div>
        <div className="setting-wrapper mt-4 flex flex-col">
          <div className="speed-setting flex mt-3">
            <div className="flex-1 text-center">
              <Button
                variant={isAudoSlowSpeed ? "ghost" : "secondary"}
                className={classNames({ "text-pencil-text": isAudoSlowSpeed })}
                onClick={() => changePlaybackRate(1)}
              >
                正常
              </Button>
            </div>
            <div className="flex-1 text-center">
              <Button
                variant={isAudoSlowSpeed ? "secondary" : "ghost"}
                className={classNames({ "text-pencil-text": !isAudoSlowSpeed })}
                onClick={() => changePlaybackRate(0.5)}
              >
                慢速
              </Button>
            </div>
          </div>
        </div>
        <Game getResult={getResult} />

        {hasResult && questions.length > 1 && (
          <div className="question-setting mb-20 flex flex-col gap-3">
            <div className="w-full">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  const num = Math.max(quesNumber - 1, 0);
                  setQuesNumber(num);
                  setCurrentQuestion(questions[num] || null);
                }}
              >
                上一题
              </Button>
            </div>
            <div className="w-full">
              <Button
                className="w-full"
                onClick={() => {
                  const num = Math.min(
                    quesNumber + 1,
                    questions.length - 1
                  );
                  setQuesNumber(num);
                  setCurrentQuestion(questions[num] || null);
                }}
              >
                下一题
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
