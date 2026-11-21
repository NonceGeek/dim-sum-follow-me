import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Header from "@/components/Header";
import LeaderboardPlayButton from "@/components/LeaderboardPlayButton";
import { Paper } from "@/components/ui/paper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  if (rank === 1) return "bg-hi/35";
  if (rank === 2) return "bg-sticky-blue/40";
  if (rank === 3) return "bg-sticky-orange/35";
  return "";
}

export default function LeaderboardPage() {
  const filePath = path.join(process.cwd(), "public", "leaderboard.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const entries = rankLeaderboardEntries(parseLeaderboardCsv(content));

  return (
    <div className="pb-12">
      <Header />
      <main className="mx-4 max-w-5xl py-8 sm:mx-6 md:mx-auto md:px-4">
        <div className="mb-8 text-center">
          <h1 className="font-script text-4xl font-bold text-ink">🏆 排行榜</h1>
          <p className="mt-2 text-ink-soft">
            按专家评分排序，展示优秀跟读作品，还会不定期发放奖品和证书哦！
          </p>
        </div>

        {entries.length === 0 ? (
          <Paper stock="card" className="px-6 py-10 text-center text-ink-soft">
            暂无排行榜数据
          </Paper>
        ) : (
          <Paper stock="paper" tape="both" tilt={false} className="px-2 py-4 sm:px-4">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>排名</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>跟读句子</TableHead>
                  <TableHead>AI 评分</TableHead>
                  <TableHead>专家评分</TableHead>
                  <TableHead>专家评语</TableHead>
                  <TableHead>录音</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className={rankRowClass(entry.rank)}>
                    <TableCell className="text-lg font-bold">
                      {rankLabel(entry.rank)}
                    </TableCell>
                    <TableCell className="font-bold">{entry.userName}</TableCell>
                    <TableCell className="max-w-xs whitespace-normal">
                      {entry.sentence}
                    </TableCell>
                    <TableCell className="ll-num text-ink-soft">{entry.aiScore}</TableCell>
                    <TableCell className="ll-num text-lg font-bold text-orange-text">
                      {entry.expertScore}
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-ink-soft">
                      {entry.expertReview || "—"}
                    </TableCell>
                    <TableCell>
                      {entry.audio ? (
                        <LeaderboardPlayButton src={entry.audio} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-pencil-text">
                      {formatLeaderboardDate(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </main>
    </div>
  );
}
