"use client";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import FollowItemView from "@/components/FollowItemView";
import {
  fetchCorpusItemFromAny,
  transformCorpusItemToQuestion,
} from "@/utils/corpusItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paper } from "@/components/ui/paper";

const linkClass =
  "text-link underline decoration-marker/60 underline-offset-2 hover:text-link-hover";

function FreeShadowingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uuidParam = searchParams.get("uuid")?.trim() ?? "";

  const [uuidInput, setUuidInput] = useState(uuidParam);
  const [fetchResult, setFetchResult] = useState<{
    item: Record<string, unknown>;
    source: "backend" | "wu";
  } | null>(null);
  const [loading, setLoading] = useState(!!uuidParam);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uuidParam) {
      setLoading(false);
      setFetchResult(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetchCorpusItemFromAny(uuidParam)
      .then(setFetchResult)
      .catch((err) => {
        setFetchResult(null);
        setError(err?.message || "加载失败");
      })
      .finally(() => setLoading(false));
  }, [uuidParam]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const uuid = uuidInput.trim();
    if (!uuid) return;
    router.push(`/free_shadowing?uuid=${encodeURIComponent(uuid)}`);
  };

  if (uuidParam) {
    if (loading) return <div className="p-8 text-center text-ink-soft">加载中…</div>;
    if (error) {
      return (
        <div className="p-8 text-center text-red">
          <p>{error}</p>
          <Button
            type="button"
            variant="link"
            className="mt-4"
            onClick={() => router.push("/free_shadowing")}
          >
            返回
          </Button>
        </div>
      );
    }
    if (fetchResult) {
      const question = transformCorpusItemToQuestion(fetchResult.item, {
        skipJyutpingFetch: fetchResult.source === "wu",
      });
      return <FollowItemView questions={[question]} backHref="/free_shadowing" />;
    }
  }

  return (
    <Paper
      stock="paper"
      tape="top"
      tilt={false}
      className="mx-4 my-6 max-w-2xl px-5 py-6 sm:mx-8 sm:px-8"
    >
      <h1 className="font-script text-3xl font-bold text-ink">自由跟读</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">
        1）在{" "}
        <a
          href="https://beta.search.aidimsum.com"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          AI DimSum 粤语语料库
        </a>{" "}
        找到含有音频的任意语料，复制其右上角的 ID 后粘贴到下方，点击「我要跟读」。
      </p>
      <p className="mt-3 leading-relaxed text-ink-soft">或者你想学习吴语，例如上海话？——&nbsp;
      <a
          href="https://wu.search.aidimsum.com"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          AI DimSum 吴语语料库
        </a>{" "}
      </p>
      <p className="mt-3 leading-relaxed text-ink-soft">
        2）点击{" "}
        <a href="/free_shadowing/free" className={linkClass}>
          👉此链接👈
        </a>
        ，上传自己的音频和文本进行「超自由跟读」！
      </p>
      <img
        src="/copy_uuid.png"
        alt="在语料库页面复制右上角 UUID 的示意"
        className="mt-4 w-full rounded-sm border border-pencil-mark"
      />
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Input
          type="text"
          value={uuidInput}
          onChange={(e) => setUuidInput(e.target.value)}
          placeholder="粘贴语料 UUID"
          className="flex-1"
        />
        <Button type="submit">我要跟读！</Button>
      </form>
      <p className="mt-5 font-bold leading-relaxed text-ink">
        一些例子：
      </p>
      <p className="mt-2 leading-relaxed text-ink-soft">
        * 「功夫熊猫1 」台词：<code>c48f3f34-03f8-4045-87b7-2ad48e06d161</code>
      </p>
      <p className="mt-2 leading-relaxed text-ink-soft">
        * 「大圣归来 」台词：<code>3f3b4279-de11-4536-9464-c7da505424b3</code>
      </p>
      <p className="mt-2 leading-relaxed text-ink-soft">
        * 「落花流水」歌词：<code>8db02d26-598f-436f-9eae-9db680cee90b</code>
      </p>
      <p className="mt-6 font-bold leading-relaxed text-ink">
        一些吴语的例子：
      </p>
      <p className="mt-2 leading-relaxed text-ink-soft">
        * "侬是小明对伐"：<code>fcf2c32b-2de2-4fe6-b6cf-714ff61886c8</code>
      </p>
      <p className="mt-2 leading-relaxed text-ink-soft">
        * "工作老忙额，还要自学英文"：<code>b55daabc-a46b-435a-9127-e665edbe9748</code>
      </p>
    </Paper>
  );
}

export default function FreeShadowingPage() {
  return (
    <div>
      <Header />
      <Suspense fallback={<div className="p-8 text-center text-ink-soft">加载中…</div>}>
        <FreeShadowingContent />
      </Suspense>
      <Footer />
    </div>
  );
}
