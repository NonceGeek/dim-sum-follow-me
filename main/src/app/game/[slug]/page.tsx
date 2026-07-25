"use client";
import { use, useState, useRef, useEffect } from "react";
import { IoVolumeMediumSharp } from "react-icons/io5";
import { Table } from "antd";
import { useRouter } from "next/navigation";
import category from "@/data/category";
import categoryGfxm from "@/data/category_gfxm";
import categoryShilizi from "@/data/category_shilizi";
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

const COLLECTION_NAME_BY_SLUG: Record<string, string> = {
  "shi-li-zhi": "广图粤语公开课测评集",
  "shi-li-zhi-1": "广图粤语公开课测评集",
  "shi-li-zhi-2": "广图粤语公开课测评集",
  wanjui: "粤语高频生活场景合集",
  gfxm1: "功夫熊猫1",
};

function resolveCategoryItem(slug: string): {
  name?: string;
  questions?: unknown[];
} | undefined {
  if (slug === "gfxm1") return categoryGfxm.gfxm1;
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
    setCollectionName(COLLECTION_NAME_BY_SLUG[slug] ?? slug);
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
    <div className="">
      {showResults && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/80 flex items-start justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full my-8">
            <h2 className="text-xl font-bold text-black mb-4">游戏结果</h2>
            <Table
              columns={resultsColumns}
              dataSource={resultsData}
              pagination={false}
              size="small"
              className="[&_.ant-table]:text-black [&_.ant-table-thead_th]:bg-neutral-200 [&_.ant-table-thead_th]:text-black [&_.ant-table-tbody_td]:text-black [&_.ant-table]:border-neutral-600"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className="px-4 py-2 border border-black text-black rounded-xl"
                onClick={() => setShowResults(false)}
              >
                返回
              </button>
              <button
                type="button"
                className="px-4 py-2 border border-black text-black rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handlePackDownload()}
                disabled={packingZip}
              >
                {packingZip ? "打包中…" : "打包下载结果"}
              </button>
            </div>
          </div>
        </div>
      )}
      <button className="ml-5 mt-5" onClick={goBack}>
        {"<返回"}
      </button>
      <div className="wrapper px-4 py-4">
        <div className="text-content">
          <div className="flex ml-3 mt-3">
            <div>原文:&nbsp;</div>
            <p>{questions[quesNumber]?.originalText}</p>
          </div>
          <>
            <div
              key={questions[quesNumber]?.key}
              className="text-item mt-4 py-4 px-3 border-3 rounded-2xl border-green-200 relative text-lg leading-12 font-bold"
            >
              {questions[quesNumber]?.content}
              <div
                className="audio-icon text-2xl z-1000 h-[24px]"
                onClick={() => {
                  playAudio();
                }}
              >
                <IoVolumeMediumSharp className="float-right" />
              </div>
            </div>

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
          <div className="question-setting flex-col flex mb-20">
            <div className="w-full">
              <button
                className="px-3 py-1 w-full"
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
              </button>
            </div>

            <div className="w-full">
              <button
                className="color-grey-200 leading-8 w-full border-green-200 border-2 rounded-2xl"
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
              </button>
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
