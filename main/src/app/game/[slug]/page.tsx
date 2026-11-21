"use client";
import { use, useState, useRef, useEffect } from "react";
import { IoVolumeMediumSharp } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Paper } from "@/components/ui/paper";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import category from "@/data/category";
import categoryGfxm from "@/data/categoryGfxm";
import categoryShilizi, { categoryShiliziV2 } from "@/data/categoryShilizi";
import Game, { GameHandle, QuestionResult } from "@/components/Game";
import Footer from "@/components/Footer";
import { useQuestionStore } from "@/stores/questionStore";
import { convertBlobToWav } from "@/utils/transcribeApi";
import { createZipBlob } from "@/utils/zip";

function sanitizeFilenamePart(text: string, maxLen = 50): string {
  return text
    .trim()
    .replace(/[/\\:*?"<>|\n\r]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

function formatRecordingTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function triggerDownload(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

const SHILIZI_COLLECTION_NAME = "广图粤语公开课测评集";
const SHILIZI_V2_COLLECTION_NAME = "广图粤语公开课测评集2.0";

const COLLECTION_NAME_BY_SLUG: Record<string, string> = {
  "shi-li-zhi": SHILIZI_COLLECTION_NAME,
  "shi-li-zhi-v2": SHILIZI_V2_COLLECTION_NAME,
  wanjui: "粤语高频生活场景合集",
  gfxm1: "功夫熊猫1",
};

function resolveCollectionName(slug: string): string {
  if (
    slug === "shi-li-zhi-v2" ||
    categoryShiliziV2.some((item) => String(item.key) === slug)
  ) {
    return SHILIZI_V2_COLLECTION_NAME;
  }
  if (
    slug === "shi-li-zhi" ||
    categoryShilizi.some((item) => String(item.key) === slug)
  ) {
    return SHILIZI_COLLECTION_NAME;
  }
  return COLLECTION_NAME_BY_SLUG[slug] ?? slug;
}

function resolveCategoryItem(slug: string): {
  name?: string;
  questions?: unknown[];
} | undefined {
  const gfxmItem = categoryGfxm.find((item) => String(item.key) === slug);
  if (gfxmItem) return gfxmItem;
  const shiliziV2Item = categoryShiliziV2.find((item) => String(item.key) === slug);
  if (shiliziV2Item) return shiliziV2Item;
  const shiliziItem = categoryShilizi.find((item) => String(item.key) === slug);
  if (shiliziItem) return shiliziItem;
  return category.find((item) => String(item.key) === slug);
}

export default function FolllowPageDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [questions, setQuestions]: any = useState([]);
  const [collectionName, setCollectionName] = useState("");
  const [subCollectionName, setSubCollectionName] = useState("");
  const [hasReult, setResult]: any = useState(false);

  let [quesNumber, setQuesNumber] = useState(0);
  const [results, setResults] = useState<Record<number, QuestionResult>>({});
  const [showResults, setShowResults] = useState(false);
  const [packingZip, setPackingZip] = useState(false);

  const audioRef: any = useRef(null);
  const gameRef = useRef<GameHandle>(null);
  const { setCurrentQuestion } = useQuestionStore();
  const goBack = () => {
    router.push("/game");
  };

  const playAudio = () => {
    const audio = document.querySelector("audio");
    if (audio) {
      audio.play();
    }
  };

  const getResult = (result: any) => {
    setResult(!!result ? [] : result);
  };

  useEffect(() => {
    const categoryItem = resolveCategoryItem(slug);
    const ques: any = categoryItem?.questions || [];
    setQuestions(ques);
    setCollectionName(resolveCollectionName(slug));
    setSubCollectionName(categoryItem?.name ?? slug);
    setCurrentQuestion(ques[0] || []);
  }, [slug, setCurrentQuestion]);

  const resultsColumns = [
    { title: "题目", dataIndex: "index", key: "index", width: 60 },
    { title: "识别结果", dataIndex: "transcript", key: "transcript" },
    { title: "粤语原文", dataIndex: "yueText", key: "yueText" },
    { title: "分数", dataIndex: "score", key: "score", width: 80 },
    { title: "评语", dataIndex: "feedback", key: "feedback" },
  ];

  const resultsData = questions.map((q: any, i: number) => ({
    key: i,
    index: i + 1,
    transcript: results[i]?.transcript ?? "—",
    yueText: results[i]?.yueText ?? q?.yueText ?? "—",
    score: results[i]?.score ?? "—",
    feedback: results[i]?.feedback ?? "—",
  }));

  const handlePackDownload = async () => {
    const recordings = Object.entries(results)
      .map(([index, result]) => ({
        index: Number(index),
        blob: result.recordingBlob,
        yueText: result.yueText || questions[Number(index)]?.yueText || "",
        originalText:
          questions[Number(index)]?.originalText ||
          result.yueText ||
          `第${Number(index) + 1}题`,
      }))
      .filter((item) => item.blob && item.blob.size > 0)
      .sort((a, b) => a.index - b.index);

    if (recordings.length === 0) {
      alert("暂无可用的录制音频");
      return;
    }

    const nickname = window.prompt("请输入你的昵称");
    if (nickname === null) return;
    if (!nickname.trim()) {
      alert("昵称不能为空");
      return;
    }

    setPackingZip(true);
    try {
      const entries = await Promise.all(
        recordings.map(async (item) => {
          const wav = await convertBlobToWav(item.blob!);
          const textPart =
            sanitizeFilenamePart(item.originalText || item.yueText || "录音") ||
            "录音";
          const name = `${String(item.index + 1).padStart(2, "0")}_${textPart}.wav`;
          return { name, data: wav };
        }),
      );

      const zipBlob = await createZipBlob(entries);
      const nickPart = sanitizeFilenamePart(nickname, 30);
      const collectionPart =
        sanitizeFilenamePart(collectionName || slug, 40) || "合集";
      const subCollectionPart =
        sanitizeFilenamePart(subCollectionName || slug, 40) || "子合集";
      const filename = `${nickPart}_${collectionPart}_${subCollectionPart}_${formatRecordingTimestamp(new Date())}.zip`;
      const url = URL.createObjectURL(zipBlob);
      triggerDownload(url, filename);
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error("打包下载失败:", err);
      alert(err instanceof Error ? err.message : "打包下载失败");
    } finally {
      setPackingZip(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-4xl" tape="both">
          <DialogHeader>
            <DialogTitle>游戏结果</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60dvh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {resultsColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      style={col.width ? { width: col.width } : undefined}
                    >
                      {col.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultsData.map((row: any) => (
                  <TableRow key={row.key}>
                    {resultsColumns.map((col) => (
                      <TableCell key={col.key} className="whitespace-normal">
                        {row[col.dataIndex]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResults(false)}>
              返回
            </Button>
            <Button
              type="button"
              onClick={() => void handlePackDownload()}
              disabled={packingZip}
            >
              {packingZip ? "打包中…" : "打包下载结果"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              seed={`game-${slug}-${quesNumber}`}
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
              key={questions[quesNumber]?.audioUrl}
            >
              <source
                src={questions[quesNumber]?.audioUrl}
                type="audio/mpeg"
              ></source>
            </audio>
          </>
        </div>
        <Game
          key={quesNumber}
          ref={gameRef}
          getResult={getResult}
          onResult={(r) => setResults((prev) => ({ ...prev, [quesNumber]: r }))}
        />
        {hasReult ? (
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
                  gameRef.current?.reset();
                }}
              >
                上一题
              </Button>
            </div>

            <div className="w-full">
              <Button
                className="w-full"
                onClick={() => {
                  const isLastQuestion =
                    quesNumber === questions.length - 1;
                  if (isLastQuestion) {
                    setShowResults(true);
                    return;
                  }
                  let quesNumber_ = quesNumber + 1;
                  const num = Math.min(
                    Math.max(quesNumber_, 0),
                    questions.length - 1
                  );
                  setQuesNumber(num);
                  setCurrentQuestion(questions[num] || []);
                  gameRef.current?.reset();
                }}
              >
                {quesNumber === questions.length - 1 ? "查看结果" : "下一题"}
              </Button>
            </div>
          </div>
        ) : (
          <></>
        )}
      </div>
      <Footer />
    </div>
  );
}
