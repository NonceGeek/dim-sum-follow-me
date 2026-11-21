"use client";
import { use, useState, useRef, useEffect } from "react";
import { IoVolumeMediumSharp } from "react-icons/io5";
import { useRouter } from "next/navigation";
import category from "@/data/category";
import Game from "@/components/Game";
import Footer from "@/components/Footer";
import { useQuestionStore } from "@/stores/questionStore";
import classNames from "classnames";
import { Button } from "@/components/ui/button";
import { Paper } from "@/components/ui/paper";

export default function FolllowPageDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [questions, setQuestions]: any = useState([]);
  const [hasReult, setResult]: any = useState(false);
  let [quesNumber, setQuesNumber] = useState(0);
  const [isAudoSlowSpeed, setIsAudoSlowSpeed] = useState(false);

  const audioRef: any = useRef(null);
  const { setCurrentQuestion } = useQuestionStore();
  const goBack = () => {
    router.push("/follow");
  };

  const playAudio = () => {
    const audio = document.querySelector("audio");
    if (audio) {
      audio.play();
    }
  };

  const changePlaybackRate = (rate: any): any => {
    if (audioRef.current) {
      setIsAudoSlowSpeed(rate === 0.5);
      audioRef.current.playbackRate = rate;
    }
  };

  const getResult = (result: any) => {
    setResult(!!result ? [] : result);
  };

  useEffect(() => {
    const ques: any =
      (category as unknown as Record<string, { questions?: unknown[] }>)[slug]
        ?.questions || [];
    setQuestions(ques);
    setCurrentQuestion(ques[0] || []);
  }, [slug, setCurrentQuestion]);

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" className="ml-3 mt-5" onClick={goBack}>
        {"<返回"}
      </Button>
      <div className="wrapper px-4 py-4">
        <div className="text-content">
          <div className="ml-1 mt-3 flex text-ink-soft">
            <div className="shrink-0">原文:&nbsp;</div>
            <p className="text-ink">{questions[quesNumber]?.originalText}</p>
          </div>
          <>
            <Paper
              key={questions[quesNumber]?.key}
              stock="pad"
              rules="ruled"
              tape="top"
              seed={`follow-${slug}-${quesNumber}`}
              className="text-item relative mt-5 pt-4 pr-4 pb-2 pl-14 text-lg leading-7 font-bold"
            >
              {questions[quesNumber]?.content}
              <div className="audio-icon flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="播放原声"
                  onClick={() => {
                    playAudio();
                  }}
                >
                  <IoVolumeMediumSharp className="size-6" />
                </Button>
              </div>
            </Paper>

            <audio
              ref={audioRef}
              muted={false}
              src={questions[quesNumber]?.audioUrl}
            >
              <source type="audio/mpeg"></source>
            </audio>
          </>
        </div>
        <div className="setting-wrapper mt-4 flex flex-col ">
          <div className="speed-setting flex mt-3">
            <div className="flex-1 text-center">
              <Button
                variant={isAudoSlowSpeed ? "ghost" : "secondary"}
                className={classNames({ "text-pencil-text": isAudoSlowSpeed })}
                onClick={() => {
                  changePlaybackRate(1);
                }}
              >
                正常
              </Button>
            </div>
            <div className="flex-1 text-center">
              <Button
                variant={isAudoSlowSpeed ? "secondary" : "ghost"}
                className={classNames({ "text-pencil-text": !isAudoSlowSpeed })}
                onClick={() => {
                  changePlaybackRate(0.5);
                }}
              >
                慢速
              </Button>
            </div>
          </div>
        </div>
        <Game getResult={getResult} />

          <div className="question-setting mb-20 flex flex-col gap-3">
            <div className="w-full">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  let quesNumber_ = quesNumber - 1;
                  const num = Math.min(
                    Math.max(quesNumber_, 0),
                    questions.length - 1
                  );
                  setQuesNumber(num);
                  setCurrentQuestion(questions[num] || []);
                }}
              >
                上一题
              </Button>
            </div>

            <div className="w-full">
              <Button
                className="w-full"
                onClick={() => {
                  console.log("跟读中下一题");
                  let quesNumber_ = quesNumber + 1;
                  const num = Math.min(
                    Math.max(quesNumber_, 0),
                    questions.length - 1
                  );
                  setQuesNumber(num);
                  setCurrentQuestion(questions[num] || []);
                }}
              >
                下一题
              </Button>
            </div>
          </div>
          
      </div>
      <Footer />
    </div>
  );
}
