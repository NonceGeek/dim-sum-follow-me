"use client";
import React, { useState } from "react";
import Category from "@/components/Category";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const CORPUS_OPTIONS = [
  { value: "shi-li-zhi", label: "广图粤语公开课测评集", description: "朗读苏轼「食荔枝」~" },
  {
    value: "shi-li-zhi-v2",
    label: "广图粤语公开课测评集2.0",
    description: "经典 20 首古诗词粤语诵读，内容由广州大学粤播专业曾老师团队提供🌹~",
  },
  { value: "wanjui", label: "粤语高频生活场景合集", description: "粤语高频生活场景合集，接地气的日常粤语对话😎~" },
  // { value: "tongyao", label: "广府童谣" },
  { value: "gfxm1", label: "功夫熊猫1",description: "来自动画「功夫熊猫1」的语料合集，适合小朋友学习😎~" },
] as const;

export default function HomePage() {
  const [corpusId, setCorpusId] = useState<(typeof CORPUS_OPTIONS)[number]["value"]>(
    CORPUS_OPTIONS[0].value
  );

  const corpusLabel = CORPUS_OPTIONS.find((opt) => opt.value === corpusId)?.label;

  const corpusDescription = CORPUS_OPTIONS.find((opt) => opt.value === corpusId)?.description;

  return (
    <div className="">
      <Header />
      {/* A selector here: 切换语料集：粤语万句多用途生活场景有声语料集、广府童谣、 小猪佩奇粤语音频语料集*/}
      <div className="mx-4 mt-5 flex items-center justify-end sm:mx-8">
        <div className="flex min-w-0 items-center gap-2">
          <Label htmlFor="corpus-select" className="shrink-0">
            切换合集：
          </Label>
          <NativeSelect
            id="corpus-select"
            className="max-w-full"
            value={corpusId}
            onChange={(e) =>
              setCorpusId(e.target.value as (typeof CORPUS_OPTIONS)[number]["value"])
            }
          >
            {CORPUS_OPTIONS.map((opt) => (
              <NativeSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
      {/* TODO: Here is the title and description of the selected corpus */}
      <Card className="mx-4 mt-4 gap-2 sm:mx-8" tape="corner" seed={corpusId}>
        <CardHeader>
          <CardTitle>{corpusLabel}</CardTitle>
          <CardDescription className="text-base">{corpusDescription}</CardDescription>
        </CardHeader>
      </Card>
      {/* A link here with emoji index finger right to [AI DimSum 粤语语料库](https://search.aidimsum.com */}
      {/* <p className="mt-3 ml-8 text-sm">
        了解更多？👉&nbsp;&nbsp;
        <a
          href="https://search.aidimsum.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 underline decoration-green-300 underline-offset-2 hover:text-green-700"
        >
          AI DimSum 粤语语料库
        </a>
      </p> */}
      <Category key={corpusId} corpusId={corpusId} />
      <Footer />
    </div>
  );
}
