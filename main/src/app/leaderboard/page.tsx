import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Header from "@/components/Header";
import {
  formatLeaderboardDate,
  parseLeaderboardCsv,
  rankLabel,
  rankLeaderboardEntries,
} from "@/utils/leaderboard";

export const metadata: Metadata = {
  title: "排行榜 | 点心粤语跟读",
  description: "粤语跟读排行榜",
};

function rankRowClass(rank: number): string {
  if (rank === 1) return "border-yellow-400/40 bg-yellow-400/10";
  if (rank === 2) return "border-slate-300/30 bg-slate-300/10";
  if (rank === 3) return "border-amber-700/40 bg-amber-700/10";
  return "border-white/10 bg-white/5";
}

export default function LeaderboardPage() {
  const filePath = path.join(process.cwd(), "public", "leaderboard.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const entries = rankLeaderboardEntries(parseLeaderboardCsv(content));

  return (
    <div className="pb-12">
      <Header />
      <main className="mx-6 max-w-5xl py-8 md:mx-auto md:px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-green-200">🏆 排行榜</h1>
          <p className="mt-2 text-sm text-neutral-400">
            按专家评分排序，展示优秀跟读作品，还会不定期发放奖品和证书哦！
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-neutral-300">
            暂无排行榜数据
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-green-200">
                  <th className="px-4 py-3 font-semibold">排名</th>
                  <th className="px-4 py-3 font-semibold">用户</th>
                  <th className="px-4 py-3 font-semibold">跟读句子</th>
                  <th className="px-4 py-3 font-semibold">AI 评分</th>
                  <th className="px-4 py-3 font-semibold">专家评分</th>
                  <th className="px-4 py-3 font-semibold">专家评语</th>
                  <th className="px-4 py-3 font-semibold">录音</th>
                  <th className="px-4 py-3 font-semibold">时间</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-white/5 ${rankRowClass(entry.rank)}`}
                  >
                    <td className="px-4 py-4 text-lg font-bold text-white">
                      {rankLabel(entry.rank)}
                    </td>
                    <td className="px-4 py-4 font-medium text-green-100">
                      {entry.userName}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-white">
                      {entry.sentence}
                    </td>
                    <td className="px-4 py-4 text-neutral-200">{entry.aiScore}</td>
                    <td className="px-4 py-4 text-lg font-semibold text-green-300">
                      {entry.expertScore}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-neutral-300">
                      {entry.expertReview || "—"}
                    </td>
                    <td className="px-4 py-4">
                      {entry.audio ? (
                        <audio
                          controls
                          preload="none"
                          src={entry.audio}
                          className="h-8 w-44 max-w-full"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-400">
                      {formatLeaderboardDate(entry.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
