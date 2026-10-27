"use client";
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import WaveSurfer from "wavesurfer.js";
import { Tooltip, Progress } from "antd";
import { useQuestionStore } from "@/stores/questionStore";
import { calculateTextSimilarity } from "@/utils/textSimilarity";
import {
  isNonCantoneseSpeechError,
  NON_CANTONESE_FEEDBACK,
  NON_CANTONESE_SCORE,
  transcribeAudioBlob,
} from "@/utils/transcribeApi";
import { IoPulseSharp } from "react-icons/io5";

const LEADERBOARD_WECHAT_QR_URL =
  "https://dimsum-utils.oss-cn-guangzhou.aliyuncs.com/leeduckgo/qr_code2.png";
// 静音判定：手机麦克风增益较低，阈值与等待时间略放宽
const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const SILENCE_THRESHOLD = isMobileDevice() ? 4 : 8;
const SILENCE_DURATION_MS = isMobileDevice() ? 3000 : 2000;
const MIN_RECORDING_MS = 1200;
const RECORDER_TIMESLICE_MS = 250;

function formatRecordingTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function sanitizeFilenamePart(text: string, maxLen = 50): string {
  return text
    .trim()
    .replace(/[/\\:*?"<>|\n\r]/g, "")
    .replace(/\s+/g, "")
    .slice(0, maxLen);
}

function buildRecordingDownloadName(
  originalText: string,
  recordedAt: Date,
  nickname?: string,
): string {
  const textPart = sanitizeFilenamePart(originalText) || "录音";
  const ts = formatRecordingTimestamp(recordedAt);
  const nickPart = nickname ? sanitizeFilenamePart(nickname, 30) : "";
  if (nickPart) return `${nickPart}_${textPart}_${ts}.wav`;
  return `${textPart}_${ts}.wav`;
}

function triggerAudioDownload(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve();
      return;
    }

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("音频加载失败"));
    };
    const cleanup = () => {
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onError);
    };

    audio.addEventListener("canplay", onReady);
    audio.addEventListener("error", onError);
    audio.load();
  });
}


interface WaveRecorderProps {
  onRecordingComplete: (
    score: number | string,
    feedback: string,
    transcript: string,
    yueText: string,
    recordingBlob?: Blob | null,
  ) => void;
  onReset: any;
}

const DEFAULT_FEEDBACK_ROWS: string[][] = [[
  "读音仲有啲偏差，再试多次啦( ´ ▽ ` )ﾉ",
  "已经唔错喇，再执一执会更好ヾ(◍°∇°◍)ﾉﾞ",
  "发音几稳阵，继续保持😊",
  "你读得好好，已经好接近完美😎",
  "劲啊你！发音几乎零瑕疵😎",
]];

const parseFeedbackCsv = (text: string): string[][] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  return lines
    .slice(1)
    .map((line) => line.split(",").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 5)
    .map((cells) => cells.slice(0, 5));
};

export interface WaveRecorderHandle {
  reset: () => void;
}

const WaveRecorder = forwardRef<WaveRecorderHandle, WaveRecorderProps>(
  ({ onRecordingComplete, onReset }, ref) => {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [feedbackRows, setFeedbackRows] = useState<string[][]>([]);
  const [countdownDisplay, setCountdownDisplay] = useState<string | null>(null);
  const [recordHintOpen, setRecordHintOpen] = useState(false);
  const [recordedAt, setRecordedAt] = useState<Date | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [leaderboardQrOpen, setLeaderboardQrOpen] = useState(false);
  const [leaderboardWhyOpen, setLeaderboardWhyOpen] = useState(false);
  const { currentQuestion } = useQuestionStore();
  const { yueText, originalText } = currentQuestion || {};

  const mediaRecorderRef = useRef<MediaRecorder>(null);
  const wavesurferRef = useRef<any>(null);
  const waveformRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const animationRef = useRef<any>(null);
  const recordingRef = useRef(false);
  const lastSoundAtRef = useRef(0);
  const hasSpeechRef = useRef(false);
  const skipTranscribeRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const countdownAbortedRef = useRef(false);
  const countdownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const countingDownRef = useRef(false);
  const wavBlobRef = useRef<Blob | null>(null);
  const recordingBlobRef = useRef<Blob | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackUrlRef = useRef("");
  const transcribingRef = useRef(false);
  const webAudioPlaybackRef = useRef<{
    ctx: AudioContext;
    source: AudioBufferSourceNode;
  } | null>(null);
  const recordingStartedAtRef = useRef(0);
  const playAfterRecordingRef = useRef(false);

  const COUNTDOWN_STEPS = ["3", "2", "1", "开始！"] as const;
  const COUNTDOWN_TICK_MS = 650;
  const COUNTDOWN_START_MS = 550; // 650×3 + 550 = 2500ms

  const pickRecorderMimeType = () => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
    return types.find((type) => MediaRecorder.isTypeSupported(type));
  };

  const TRANSCRIBE_PROGRESS_MS = 15_000;

  useEffect(() => {
    setRecordHintOpen(true);
  }, []);

  useEffect(() => {
    if (recording) {
      setRecordHintOpen(true);
    }
  }, [recording]);

  useEffect(() => {
    let mounted = true;
    const loadFeedbacks = async () => {
      try {
        const res = await fetch("/feedbacks.csv", { cache: "no-store" });
        if (!res.ok) return;
        const text = await res.text();
        const rows = parseFeedbackCsv(text);
        if (mounted && rows.length > 0) {
          setFeedbackRows(rows);
        }
      } catch {
        // Ignore CSV read errors and keep fallback feedbacks.
      }
    };
    loadFeedbacks();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!transcribing) {
      setTranscribeProgress(0);
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / TRANSCRIBE_PROGRESS_MS) * 100));
      setTranscribeProgress(pct);
      if (pct >= 100) clearInterval(interval);
    }, 100);

    return () => clearInterval(interval);
  }, [transcribing]);

  // 初始化 wavesurfer（仅波形展示；实际出声走独立 audio 元素）
  useEffect(() => {
    if (!WaveSurfer || !waveformRef.current) return;

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#8ee085",
      progressColor: "#8b5cf6",
      cursorColor: "#333",
      barWidth: 5,
      barRadius: 3,
      barGap: 2,
      height: 16,
      normalize: true,
      interact: false,
    });
    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      clearInterval(timerRef.current);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // 播放进度与波形同步
  useEffect(() => {
    const audio = playbackAudioRef.current;
    if (!audio) return;

    const syncProgress = () => {
      if (transcribingRef.current) return;
      const ws = wavesurferRef.current;
      if (!ws || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      ws.seekTo(audio.currentTime / audio.duration);
    };

    const resetProgress = () => {
      wavesurferRef.current?.seekTo(0);
    };

    audio.addEventListener("timeupdate", syncProgress);
    audio.addEventListener("ended", resetProgress);
    return () => {
      audio.removeEventListener("timeupdate", syncProgress);
      audio.removeEventListener("ended", resetProgress);
    };
  }, []);

  useEffect(() => {
    const audio = playbackAudioRef.current;
    if (!audio || !audioUrl) return;

    playbackUrlRef.current = audioUrl;
    audio.pause();
    audio.src = audioUrl;
    audio.load();

    if (!playAfterRecordingRef.current) return;
    playAfterRecordingRef.current = false;

    const startDeferredPlayback = () => {
      void startPlayback();
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      startDeferredPlayback();
    } else {
      audio.addEventListener("canplay", startDeferredPlayback, { once: true });
    }
  }, [audioUrl]);

  // 判定结束后再加载波形，避免与手机端播放争抢解码资源
  useEffect(() => {
    if (!audioUrl || !wavesurferRef.current || transcribing) return;
    void wavesurferRef.current.load(audioUrl);
  }, [audioUrl, transcribing]);

  const generateFeedback = (score: number): string => {
    let bucket = -1;
    if (score > 0 && score < 41) bucket = 0;
    else if (score > 40 && score < 61) bucket = 1;
    else if (score > 60 && score < 81) bucket = 2;
    else if (score > 80 && score < 91) bucket = 3;
    else if (score > 90 && score < 101) bucket = 4;
    if (bucket < 0) return "请重新录音";

    const pool = feedbackRows.length > 0 ? feedbackRows : DEFAULT_FEEDBACK_ROWS;
    const randomRow = pool[Math.floor(Math.random() * pool.length)];
    const selected = randomRow?.[bucket];
    if (selected) return selected;
    return "请重新录音";
  };

  // 将浏览器录制的音频（webm/opus）转换为 WAV（OpenAI 只接受 wav / mp3）
  const convertToWav = async (blob: Blob): Promise<Blob> => {
    const audioCtx = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();

    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bitDepth = 16;
    const blockAlign = numChannels * (bitDepth / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;

    const wavBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuffer);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    // RIFF header
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);         // PCM chunk size
    view.setUint16(20, 1, true);          // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);

    // Interleave channels as 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([wavBuffer], { type: "audio/wav" });
  };

  const stopWebAudioPlayback = () => {
    const playback = webAudioPlaybackRef.current;
    if (!playback) return;
    try {
      playback.source.stop();
    } catch {
      // already stopped
    }
    void playback.ctx.close().catch(() => {});
    webAudioPlaybackRef.current = null;
  };

  const playBlobViaWebAudio = async (blob: Blob) => {
    stopWebAudioPlayback();
    playbackAudioRef.current?.pause();

    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    webAudioPlaybackRef.current = { ctx, source };
    source.onended = () => {
      if (webAudioPlaybackRef.current?.source === source) {
        stopWebAudioPlayback();
      }
      wavesurferRef.current?.seekTo(0);
    };
  };

  // 调用 /api/transcribe 转录粤语音频
  const transcribeAudio = async (blob: Blob) => {
    transcribingRef.current = true;
    setTranscribing(true);
    recordingBlobRef.current = blob;

    // 给手机端一点时间释放麦克风音频会话，避免与回放冲突
    await new Promise((resolve) => setTimeout(resolve, 350));

    try {
      const transcript = await transcribeAudioBlob(blob, yueText ?? undefined);
      setTranscript(transcript);
      console.log("transcript", transcript);
      console.log("yueText", yueText);

      const finalScore = calculateTextSimilarity(transcript, yueText ?? "");
      const feedback = generateFeedback(finalScore);
      onRecordingComplete(finalScore, feedback, transcript, yueText, recordingBlobRef.current);
    } catch (err) {
      console.error("转录失败:", err);
      if (isNonCantoneseSpeechError(err)) {
        setTranscript(err.transcript);
        onRecordingComplete(
          NON_CANTONESE_SCORE,
          NON_CANTONESE_FEEDBACK,
          err.transcript,
          yueText ?? "",
          recordingBlobRef.current,
        );
      } else {
        onRecordingComplete(0, "系统错误", "", yueText ?? "", recordingBlobRef.current);
      }
    } finally {
      transcribingRef.current = false;
      setTranscribing(false);
      clearInterval(timerRef.current);
      cancelAnimationFrame(animationRef.current);
    }
  };

  const clearCountdown = () => {
    countdownAbortedRef.current = true;
    countingDownRef.current = false;
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setCountdownDisplay(null);
  };

  const waitForCountdown = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = setTimeout(resolve, ms);
      countdownTimersRef.current.push(id);
    });

  const runCountdown = async () => {
    countdownAbortedRef.current = false;
    countingDownRef.current = true;
    for (const step of COUNTDOWN_STEPS) {
      if (countdownAbortedRef.current) return false;
      setCountdownDisplay(step);
      await waitForCountdown(step === "开始！" ? COUNTDOWN_START_MS : COUNTDOWN_TICK_MS);
    }
    countingDownRef.current = false;
    if (countdownAbortedRef.current) return false;
    setCountdownDisplay(null);
    return true;
  };

  // 停止录音（静音超时、手动点击或内部调用）
  const stopRecording = () => {
    if (!mediaRecorderRef.current || !recordingRef.current) return;

    recordingRef.current = false;
    setRecording(false);
    cancelAnimationFrame(animationRef.current);
    clearInterval(timerRef.current);

    if (waveformRef.current) {
      waveformRef.current.style.boxShadow = "";
    }

    const recorder = mediaRecorderRef.current;
    if (recorder.state === "recording") {
      try {
        recorder.requestData();
      } catch {
        // requestData 在部分浏览器上不可用，忽略即可
      }
      recorder.stop();
    }
  };

  const resetState = () => {
    clearCountdown();
    if (recordingRef.current) {
      skipTranscribeRef.current = true;
      stopRecording();
    }
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setTranscript("");
    setDuration(0);
    setAudioBlob(null);
    setRecordedAt(null);
    setDownloading(false);
    wavBlobRef.current = null;
    recordingBlobRef.current = null;
    playAfterRecordingRef.current = false;
    playbackUrlRef.current = "";
    stopWebAudioPlayback();
    playbackAudioRef.current?.pause();
    onReset?.();
  };

  useImperativeHandle(ref, () => ({ reset: resetState }));

  // 开始录音（倒计时结束后调用）
  const beginRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const audioChunks: Blob[] = [];
      const mimeType = pickRecorderMimeType();
      mediaRecorderRef.current = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        audioContextRef.current?.close().catch(() => {});
        audioContextRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (skipTranscribeRef.current) {
          skipTranscribeRef.current = false;
          playAfterRecordingRef.current = false;
          return;
        }

        const blob = new Blob(audioChunks, {
          type: mimeType || mediaRecorderRef.current?.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordedAt(new Date());
        setAudioBlob(blob as any);

        void transcribeAudio(blob);
      };

      mediaRecorderRef.current.start(RECORDER_TIMESLICE_MS);
      recordingRef.current = true;
      recordingStartedAtRef.current = Date.now();
      setRecording(true);
      lastSoundAtRef.current = Date.now();
      hasSpeechRef.current = false;

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const getVolume = (samples: Uint8Array) => {
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          const v = samples[i] - 128;
          sum += v * v;
        }
        return Math.sqrt(sum / samples.length);
      };

      const drawWaveform = () => {
        if (!recordingRef.current) return;

        analyser.getByteTimeDomainData(dataArray);
        const volume = getVolume(dataArray);
        const now = Date.now();

        if (volume > SILENCE_THRESHOLD) {
          hasSpeechRef.current = true;
          lastSoundAtRef.current = now;
        } else if (
          hasSpeechRef.current &&
          now - recordingStartedAtRef.current >= MIN_RECORDING_MS &&
          now - lastSoundAtRef.current >= SILENCE_DURATION_MS
        ) {
          stopRecording();
          return;
        }

        if (waveformRef.current) {
          const level = Math.min(48, Math.round(volume * 2));
          waveformRef.current.style.boxShadow = `inset 0 -${level}px 0 rgba(142, 224, 133, 0.45)`;
        }

        animationRef.current = requestAnimationFrame(drawWaveform);
      };

      drawWaveform();
    } catch (err) {
      recordingRef.current = false;
      setRecording(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      console.error("录音启动失败:", err);

      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        alert("无法访问麦克风，请检查权限设置");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        alert("未找到麦克风设备");
      } else {
        const message = err instanceof Error ? err.message : String(err);
        alert(`录音启动失败：${message}`);
      }
    }
  };

  const startRecording = async () => {
    if (transcribing || countingDownRef.current) return;

    // 录音中再次点击 = 手动停止
    if (recordingRef.current) {
      stopRecording();
      return;
    }

    // 评分完成后再次点击录制，先重置上一轮结果（含分数模块）
    resetState();
    countdownAbortedRef.current = false;

    const ready = await runCountdown();
    if (!ready) return;

    await beginRecording();
  };

  // 点击播放录音，播完自动停止；播放中再次点击则从头重播
  const startPlayback = async () => {
    const blob = recordingBlobRef.current;

    // 判定中：走 Web Audio，绕开 iOS 隐藏 audio 元素无声播放的问题
    if (transcribingRef.current && blob) {
      if (webAudioPlaybackRef.current) {
        await playBlobViaWebAudio(blob);
        return;
      }
      try {
        await playBlobViaWebAudio(blob);
      } catch (err) {
        console.error("播放失败:", err);
      }
      return;
    }

    const audio = playbackAudioRef.current;
    if (!audio || !audioUrl) return;

    stopWebAudioPlayback();

    if (!audio.paused) {
      audio.currentTime = 0;
      wavesurferRef.current?.seekTo(0);
      return;
    }

    try {
      if (audio.ended) audio.currentTime = 0;

      if (playbackUrlRef.current !== audioUrl || !audio.src) {
        playbackUrlRef.current = audioUrl;
        audio.src = audioUrl;
      }

      audio.muted = false;
      audio.volume = 1;
      await waitForAudioReady(audio);
      await audio.play();
      wavesurferRef.current?.seekTo(0);
    } catch (err) {
      console.error("播放失败:", err);
    }
  };

  const playRecording = () => {
    if (recordingRef.current) {
      playAfterRecordingRef.current = true;
      stopRecording();
      return;
    }
    if (!audioUrl) return;
    void startPlayback();
  };

  const downloadFileName =
    recordedAt &&
    buildRecordingDownloadName(originalText?.trim() || yueText?.trim() || "录音", recordedAt);

  const handleDownload = async (nickname?: string) => {
    if (!recordedAt || transcribing || downloading) return;

    let filename: string;
    if (nickname !== undefined) {
      if (!nickname.trim()) {
        alert("昵称不能为空");
        return;
      }
      filename = buildRecordingDownloadName(
        originalText?.trim() || yueText?.trim() || "录音",
        recordedAt,
        nickname,
      );
    } else {
      filename =
        downloadFileName ||
        buildRecordingDownloadName(
          originalText?.trim() || yueText?.trim() || "录音",
          recordedAt,
        );
    }

    let wavBlob = wavBlobRef.current;
    if (!wavBlob) {
      const source = recordingBlobRef.current;
      if (!source) return;
      setDownloading(true);
      try {
        wavBlob = await convertToWav(source);
        wavBlobRef.current = wavBlob;
      } catch (err) {
        console.error("WAV 转换失败:", err);
        alert("音频处理失败，请稍后再试");
        return;
      } finally {
        setDownloading(false);
      }
    }

    const url = URL.createObjectURL(wavBlob);
    triggerAudioDownload(url, filename);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadWithNickname = async () => {
    const nickname = window.prompt("请输入你的昵称");
    if (nickname === null) return;
    await handleDownload(nickname);
  };

  return (
    <>
      <audio
        ref={playbackAudioRef}
        preload="auto"
        playsInline
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      {countdownDisplay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          aria-live="assertive"
          aria-label={`录制倒计时：${countdownDisplay}`}
        >
          <span
            key={countdownDisplay}
            className="animate-pulse text-6xl font-bold text-green-200 sm:text-7xl"
          >
            {countdownDisplay}
          </span>
        </div>
      )}
      <div className="flex min-w-0 items-center gap-1">
        {/* 录音控制面板 */}
        <div className="flex shrink-0 flex-col">
          <div className="flex space-x-4">
            <Tooltip
              title={
                transcribing
                  ? "识别中…"
                  : countdownDisplay
                    ? "准备录制…"
                    : recording
                      ? "点击停止录音"
                      : "点击录制"
              }
              color={"lime"}
              key={"lime"}
              placement="bottom"
              open={recordHintOpen}
              onOpenChange={setRecordHintOpen}
            >
              <button
                onClick={startRecording}
                disabled={transcribing || Boolean(countdownDisplay)}
                className={`px-3 py-2 rounded-full font-bold text-lg duration-300 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {recording ? (
                  <div className="flex items-center">
                    <div className="border text-green-200 rounded-full p-1 text-xl animate-pulse">
                      <IoPulseSharp />
                    </div>
                  </div>
                ) : (
                  <div className={`border rounded-full p-1 text-xl ${transcribing ? "text-yellow-400 animate-pulse" : "text-grey-200"}`}>
                    <IoPulseSharp />
                  </div>
                )}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* 波形显示区域 */}
        <div className="relative min-w-0 flex-1">
          <div
            ref={waveformRef}
            className="pointer-events-none border border-indigo-500/30 rounded-xl p-2 min-h-[10px]"
            style={{ backgroundColor: recording ? "#fff" : "#ceffce" }}
          />
          <button
            type="button"
            aria-label="播放录音"
            onClick={playRecording}
            className="absolute inset-0 rounded-xl"
          />
        </div>
      </div>
      {transcribing && (
        <div className="mt-3 px-4">
          <p className="mb-2 text-center text-sm text-green-200">AI 判定中……</p>
          <Progress
            percent={transcribeProgress}
            showInfo={false}
            strokeColor="#8ee085"
            trailColor="rgba(255,255,255,0.1)"
          />
        </div>
      )}
      {/* 音频识别结果 */}
      {transcript && (
        <p className="mt-2 break-words px-1 text-center text-sm text-white sm:text-base">
          录音识别结果：<b>{transcript}</b>
        </p>
      )}
      {audioUrl && !transcribing && (
        <div className="mt-3 flex flex-col items-stretch gap-2 px-1 sm:flex-row sm:flex-wrap sm:justify-center sm:items-center sm:gap-3 sm:px-0">
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="whitespace-nowrap rounded-full border border-white px-4 py-2 text-center text-sm text-white transition-colors duration-200 hover:bg-white hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 sm:py-1.5"
          >
            {downloading ? "处理中…" : "下载录音"}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadWithNickname()}
            disabled={downloading}
            className="whitespace-nowrap rounded-full border border-white px-4 py-2 text-center text-sm text-white transition-colors duration-200 hover:bg-white hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 sm:py-1.5"
          >
            {downloading ? "处理中…" : "带昵称下载录音"}
          </button>
          <button
            onClick={resetState}
            disabled={transcribing}
            className="whitespace-nowrap rounded-full border border-white px-4 py-2 text-center text-sm text-white transition-colors duration-200 hover:bg-white hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 sm:py-1.5"
          >
            我要重新录制！
          </button>
          <button
            type="button"
            onClick={() => setLeaderboardQrOpen(true)}
            className="whitespace-nowrap rounded-full border border-white px-4 py-2 text-center text-sm text-white transition-colors duration-200 hover:bg-white hover:text-neutral-800 sm:py-1.5"
          >
            <span className="sm:hidden">提交到排行榜 😎</span>
            <span className="hidden sm:inline">将「我的跟读」提交到排行榜&nbsp;😎</span>
          </button>
        </div>
      )}
      {audioUrl && !transcribing && (
        <div className="mt-2 px-1 text-center sm:px-0">
          <button
            type="button"
            onClick={() => setLeaderboardWhyOpen(true)}
            className="text-sm text-green-200/90 underline decoration-green-200/40 underline-offset-2 transition hover:text-green-100 hover:decoration-green-100"
          >
            🤔为什么建议将我的跟读提交到排行榜？
          </button>
        </div>
      )}
      {leaderboardWhyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="为什么建议提交到排行榜"
          onClick={() => setLeaderboardWhyOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-sm overflow-auto rounded-2xl border border-white/10 bg-[#181b1f] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-green-200">
                为什么建议提交到排行榜？
              </h2>
              <button
                type="button"
                onClick={() => setLeaderboardWhyOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="关闭"
              >
                X
              </button>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-white/80">
              <p>当前只是在通过 AI 对你的粤语发音进行评估。</p>
              <p>提交到排行榜后，粤语专家会人工对你的发音给出专业反馈。</p>
              <p>同时，还有机会赢得神秘礼物🎁！</p>
            </div>
          </div>
        </div>
      )}
      {leaderboardQrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="提交到排行榜"
          onClick={() => setLeaderboardQrOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-sm overflow-auto rounded-2xl border border-white/10 bg-[#181b1f] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-green-200">
                提交到排行榜
              </h2>
              <button
                type="button"
                onClick={() => setLeaderboardQrOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="关闭"
              >
                X
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LEADERBOARD_WECHAT_QR_URL}
              alt="微信管理员二维码"
              className="mx-auto w-full max-w-[260px] rounded-xl bg-white p-2"
            />
            <p className="mt-3 text-center text-sm text-white/80">
              扫码联系「管理员」，提交我的跟读到排行榜！
            </p>
          </div>
        </div>
      )}
    </>
  );
});

WaveRecorder.displayName = "WaveRecorder";

export default WaveRecorder;
