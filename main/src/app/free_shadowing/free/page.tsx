"use client";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import FollowItemView from "@/components/FollowItemView";
import { buildCustomShadowingQuestion, type CustomShadowingMediaType } from "@/utils/customShadowing";
import { transcribeAudioBlob, transcribeAudioUrl, transcribeVideoBlob, transcribeVideoUrl } from "@/utils/transcribeApi";
import { synthesizeCantoneseAudio, type TtsVoice } from "@/utils/ttsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Paper } from "@/components/ui/paper";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

const fieldTitleClass = "text-[15px] font-bold text-ink";
const fieldLabelClass = `flex flex-col gap-1.5 ${fieldTitleClass}`;
const linkClass =
  "text-link underline decoration-marker/60 underline-offset-2 hover:text-link-hover";

type AudioMode = "upload" | "link" | "tts";
type VideoMode = "upload" | "link";
type ShadowingMode = CustomShadowingMediaType;

function readTextParam(searchParams: URLSearchParams): string {
  return (searchParams.get("st") ?? searchParams.get("text"))?.trim() ?? "";
}

function readShadowingMode(searchParams: URLSearchParams): ShadowingMode {
  if (searchParams.get("mode") === "video" || searchParams.get("video")) {
    return "video";
  }
  return "audio";
}

function buildFreeShadowingUrl(
  st: string,
  media?: string,
  shadowingMode: ShadowingMode = "audio",
): string {
  const params = new URLSearchParams({ st });
  if (media) {
    if (shadowingMode === "video") {
      params.set("video", media);
      params.set("mode", "video");
    } else {
      params.set("audio", media);
    }
  }
  return `/free_shadowing/free?${params.toString()}`;
}

function FreeShadowingFreeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const textParam = readTextParam(searchParams);
  const audioParam = searchParams.get("audio")?.trim() ?? "";
  const videoParam = searchParams.get("video")?.trim() ?? "";
  const urlShadowingMode = readShadowingMode(searchParams);

  const [shadowingMode, setShadowingMode] = useState<ShadowingMode>("audio");
  const [textInput, setTextInput] = useState(textParam);
  const [audioMode, setAudioMode] = useState<AudioMode>("upload");
  const [videoMode, setVideoMode] = useState<VideoMode>("upload");
  const [audioLinkInput, setAudioLinkInput] = useState(audioParam);
  const [videoLinkInput, setVideoLinkInput] = useState(videoParam);
  const [ttsVoice, setTtsVoice] = useState<TtsVoice>("Kiki");
  const [sessionQuestion, setSessionQuestion] = useState<ReturnType<
    typeof buildCustomShadowingQuestion
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [videoRecognizeProgress, setVideoRecognizeProgress] = useState("");
  const [generatingTts, setGeneratingTts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const questionFromUrl =
    textParam && (audioParam || videoParam)
      ? buildCustomShadowingQuestion(
          textParam,
          videoParam || audioParam,
          urlShadowingMode,
        )
      : null;
  const question = sessionQuestion ?? questionFromUrl;
  const hasUrlParams = [...searchParams.keys()].length > 0;

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const text = textInput.trim();
    if (!text) {
      setError("请输入跟读文本");
      return;
    }

    if (shadowingMode === "video") {
      if (videoMode === "link") {
        const videoUrl = videoLinkInput.trim();
        if (!videoUrl) {
          setError("请输入视频链接");
          return;
        }
        router.push(buildFreeShadowingUrl(text, videoUrl, "video"));
        return;
      }

      const file = videoInputRef.current?.files?.[0];
      if (!file) {
        setError("请上传视频文件");
        return;
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setSessionQuestion(buildCustomShadowingQuestion(text, url, "video"));
      router.replace(buildFreeShadowingUrl(text, undefined, "video"), { scroll: false });
      return;
    }

    if (audioMode === "link" || audioMode === "tts") {
      const audioUrl = audioLinkInput.trim();
      if (!audioUrl) {
        setError(audioMode === "tts" ? "请先生成 AI 声音文件" : "请输入音频链接");
        return;
      }
      router.push(buildFreeShadowingUrl(text, audioUrl, "audio"));
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("请上传音频文件");
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSessionQuestion(buildCustomShadowingQuestion(text, url, "audio"));
    router.replace(buildFreeShadowingUrl(text, undefined, "audio"), { scroll: false });
  };

  const handleRecognizeText = async () => {
    setError(null);
    setRecognizing(true);
    try {
      let text: string;
      if (audioMode === "upload") {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
          setError("请先上传音频文件");
          return;
        }
        text = (await transcribeAudioBlob(file)).transcript;
      } else {
        const audioUrl = audioLinkInput.trim();
        if (!audioUrl) {
          setError("请先输入音频链接");
          return;
        }
        text = await transcribeAudioUrl(audioUrl);
      }

      if (!text) {
        setError("未能识别出文本");
        return;
      }
      setTextInput(text);
    } catch (err) {
      console.error("识别音频文本失败:", err);
      setError(err instanceof Error ? err.message : "识别失败");
    } finally {
      setRecognizing(false);
    }
  };

  const handleRecognizeVideoText = async () => {
    setError(null);
    setRecognizing(true);
    setVideoRecognizeProgress("正在准备…");
    const reportProgress = (message: string) => setVideoRecognizeProgress(message);
    try {
      let text: string;
      if (videoMode === "upload") {
        const file = videoInputRef.current?.files?.[0];
        if (!file) {
          setError("请先上传视频文件");
          return;
        }
        text = await transcribeVideoBlob(file, { onProgress: reportProgress });
      } else {
        const videoUrl = videoLinkInput.trim();
        if (!videoUrl) {
          setError("请先输入视频链接");
          return;
        }
        text = await transcribeVideoUrl(videoUrl, { onProgress: reportProgress });
      }

      if (!text) {
        setError("未能识别出文本");
        return;
      }
      setTextInput(text);
    } catch (err) {
      console.error("识别视频文本失败:", err);
      setError(err instanceof Error ? err.message : "识别失败");
    } finally {
      setRecognizing(false);
      setVideoRecognizeProgress("");
    }
  };

  const textInputField = (
    <label className={fieldLabelClass}>
      跟读文本
      <Textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="输入要跟读的原文，例如：行路唔好睇手机吖"
        rows={3}
        ruled
        className="font-normal"
      />
    </label>
  );

  const handleGenerateTts = async () => {
    setError(null);
    setGeneratingTts(true);
    try {
      const audioUrl = await synthesizeCantoneseAudio(textInput, ttsVoice);
      setAudioLinkInput(audioUrl);
    } catch (err) {
      console.error("AI 生成音频失败:", err);
      setError(err instanceof Error ? err.message : "AI 生成音频失败");
    } finally {
      setGeneratingTts(false);
    }
  };

  if (hasUrlParams) {
    if (question) {
      return (
        <FollowItemView questions={[question]} backHref="/free_shadowing/free" />
      );
    }

    return (
      <div className="mx-8 mt-6 max-w-2xl p-8 text-center">
        <p className="text-red">
          链接参数不完整：需要跟读文本（st）和音频链接（audio）或视频链接（video）。
        </p>
        <a href="/free_shadowing/free" className={`mt-4 inline-block ${linkClass}`}>
          返回设置
        </a>
      </div>
    );
  }

  return (
    <Paper
      stock="paper"
      tape="top"
      tilt={false}
      className="mx-4 my-6 max-w-2xl px-5 py-6 sm:mx-8 sm:px-8"
    >
      <h1 className="font-script text-3xl font-bold text-ink">超自由跟读</h1>

      <RadioGroup
        value={shadowingMode}
        onValueChange={(value) => setShadowingMode(value as ShadowingMode)}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-4"
        aria-label="跟读模式"
      >
        <label className="flex-1 cursor-pointer">
          <Paper
            stock={shadowingMode === "audio" ? "sticky-yellow" : "card"}
            seed="mode-audio"
            className="flex h-full items-center gap-3 px-4 py-3"
          >
            <RadioGroupItem value="audio" />
            <span>
              <span className="block font-bold text-ink">基于音频跟读</span>
              <span className="mt-0.5 block text-sm text-ink-soft">
                上传音频、粘贴链接，或用 AI 生成粤语声音
              </span>
            </span>
          </Paper>
        </label>
        <label className="flex-1 cursor-pointer">
          <Paper
            stock={shadowingMode === "video" ? "sticky-yellow" : "card"}
            seed="mode-video"
            className="flex h-full items-center gap-3 px-4 py-3"
          >
            <RadioGroupItem value="video" />
            <span>
              <span className="block font-bold text-ink">基于视频跟读</span>
              <span className="mt-0.5 block text-sm text-ink-soft">
                上传视频或粘贴链接，边看边跟读
              </span>
            </span>
          </Paper>
        </label>
      </RadioGroup>

      <p className="mt-4 leading-relaxed text-ink-soft">
        {shadowingMode === "audio"
          ? "自行输入跟读文本，并上传音频、粘贴音频链接，或用 AI 生成粤语声音，即可开始跟读练习。"
          : "自行输入跟读文本，并上传视频或粘贴视频链接，播放参考视频后进行跟读练习。"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-pencil-text">
        {shadowingMode === "audio"
          ? "使用音频链接或 AI 生成音频提交后，可通过 URL 分享本页；上传本地文件仅在当前浏览器会话内有效。AI 音频链接约 24 小时内有效。"
          : "上传本地视频仅在当前浏览器会话内有效。"}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
        {shadowingMode === "audio" && textInputField}

        <div className="flex flex-col gap-3">
          <span className={fieldTitleClass}>
            {shadowingMode === "audio" ? "音频来源" : "视频来源"}
          </span>
          {shadowingMode === "audio" ? (
            <RadioGroup
              value={audioMode}
              onValueChange={(value) => setAudioMode(value as AudioMode)}
              aria-label="音频来源"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="upload" id="audio-mode-upload" />
                <Label htmlFor="audio-mode-upload">上传本地音频</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="link" id="audio-mode-link" />
                <Label htmlFor="audio-mode-link">粘贴音频链接</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="tts" id="audio-mode-tts" />
                <Label htmlFor="audio-mode-tts">AI 生成声音文件</Label>
              </div>
            </RadioGroup>
          ) : (
            <RadioGroup
              value={videoMode}
              onValueChange={(value) => setVideoMode(value as VideoMode)}
              aria-label="视频来源"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="upload" id="video-mode-upload" />
                <Label htmlFor="video-mode-upload">上传本地视频</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="link" id="video-mode-link" />
                <Label htmlFor="video-mode-link">粘贴视频链接</Label>
              </div>
            </RadioGroup>
          )}
        </div>

        {shadowingMode === "audio" ? (
          audioMode === "upload" ? (
            <label className={fieldLabelClass}>
              音频文件
              <Input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                className="font-normal"
              />
            </label>
          ) : audioMode === "link" ? (
            <label className={fieldLabelClass}>
              音频链接
              <Input
                type="url"
                value={audioLinkInput}
                onChange={(e) => setAudioLinkInput(e.target.value)}
                placeholder="https://example.com/audio.mp3"
                className="font-normal"
              />
            </label>
          ) : (
            <div className="flex flex-col gap-3">
              <label className={fieldLabelClass}>
                音色
                <NativeSelect
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value as TtsVoice)}
                  className="font-normal"
                >
                  <NativeSelectOption value="Kiki">Kiki（粤语女声）</NativeSelectOption>
                  <NativeSelectOption value="Rocky">Rocky（粤语男声）</NativeSelectOption>
                </NativeSelect>
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerateTts}
                disabled={generatingTts || !textInput.trim()}
                className="self-start"
              >
                {generatingTts ? "生成中…" : "根据跟读文本生成声音"}
              </Button>
              <label className={fieldLabelClass}>
                生成的音频链接
                <Input
                  type="url"
                  value={audioLinkInput}
                  onChange={(e) => setAudioLinkInput(e.target.value)}
                  placeholder="生成后会自动填入音频链接"
                  className="font-normal"
                />
              </label>
              {audioLinkInput.trim() && (
                <audio
                  controls
                  preload="none"
                  src={audioLinkInput.trim()}
                  className="w-full max-w-md"
                />
              )}
            </div>
          )
        ) : videoMode === "upload" ? (
          <label className={fieldLabelClass}>
            视频文件
            <Input
              ref={videoInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.mov,.m4v"
              className="font-normal"
            />
          </label>
        ) : (
          <label className={fieldLabelClass}>
            视频链接
            <Input
              type="url"
              value={videoLinkInput}
              onChange={(e) => setVideoLinkInput(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="font-normal"
            />
            {videoLinkInput.trim() && (
              <video
                controls
                playsInline
                preload="metadata"
                src={videoLinkInput.trim()}
                className="mt-2 w-full max-w-md rounded-sm"
              />
            )}
          </label>
        )}

        {shadowingMode === "video" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleRecognizeVideoText}
                disabled={recognizing}
              >
                识别视频语音，自动填入跟读文本
              </Button>
              {recognizing && videoRecognizeProgress && (
                <span className="text-sm text-ink-soft" aria-live="polite">
                  {videoRecognizeProgress}
                </span>
              )}
            </div>
            {textInputField}
          </>
        )}

        {shadowingMode === "audio" && audioMode === "upload" && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleRecognizeText}
            disabled={recognizing}
            className="self-start"
          >
            {recognizing ? "识别中…" : "识别音频内容，自动填入跟读文本"}
          </Button>
        )}

        {error && <p className="text-sm text-red">{error}</p>}

        <Button type="submit" size="lg" className="self-start">
          我要跟读！
        </Button>
      </form>

      <p className="mt-6 text-sm">
        <a href="/free_shadowing" className={linkClass}>
          返回语料库自由跟读
        </a>
      </p>
    </Paper>
  );
}

export default function FreeShadowingFreePage() {
  return (
    <div>
      <Header />
      <Suspense fallback={<div className="p-8 text-center text-ink-soft">加载中…</div>}>
        <FreeShadowingFreeContent />
      </Suspense>
      <Footer />
    </div>
  );
}
