import { convertArabicDigitsToChinese } from "@/utils/chineseNumerals";
import { uploadAudioToOss } from "@/utils/ossUpload";

const TRANS_API = `${process.env.NEXT_PUBLIC_API_URL}/api/transcribe`;
const RECORDER_TIMESLICE_MS = 250;

export const NON_CANTONESE_FEEDBACK =
  "你讲嘅好似唔系粤语喔，再试多次啦~";

export const NON_CANTONESE_SCORE = "🤔";

export class NonCantoneseSpeechError extends Error {
  readonly lang: string;
  readonly transcript: string;

  constructor(lang: string, transcript: string) {
    super(NON_CANTONESE_FEEDBACK);
    this.name = "NonCantoneseSpeechError";
    this.lang = lang;
    this.transcript = transcript;
  }
}

export function isNonCantoneseSpeechError(
  err: unknown,
): err is NonCantoneseSpeechError {
  if (err instanceof NonCantoneseSpeechError) return true;
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "NonCantoneseSpeechError" &&
    typeof (err as { transcript?: unknown }).transcript === "string"
  );
}

/** ASR 标成 `yue` 或 `zh` 都按粤语处理；缺失 / 其他语种一律按非粤语处理。 
 * TODO: 未来有对语言判断更加准确的垂直模型。
 * 
*/
function isYueRawLanguage(rawLanguage: unknown): boolean {
  if (typeof rawLanguage !== "string") return false;
  const code = rawLanguage.trim().toLowerCase();
  return code === "yue" || code === "zh";
}

export type TranscribeProgressReporter = (message: string) => void;

export type TranscribeVideoOptions = {
  onProgress?: TranscribeProgressReporter;
};

function pickRecorderMimeType(): string | undefined {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type));
}

/** 将浏览器音频 Blob 转为 WAV，供转录 API 使用。 */
export async function convertBlobToWav(blob: Blob): Promise<Blob> {
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

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: "audio/wav" });
}

async function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return;

  await new Promise<void>((resolve, reject) => {
    const onMeta = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("无法加载视频"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("error", onErr);
    };
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("error", onErr);
  });
}

/**
 * 用 <video> + Web Audio 播放视频并录制音轨，再转为 WAV。
 * 需在用户点击等手势后调用（内部会 video.play()）。
 */
async function extractAudioWavFromVideoSource(
  src: string,
  options?: { crossOrigin?: boolean; onProgress?: TranscribeProgressReporter },
): Promise<Blob> {
  const report = options?.onProgress;
  report?.("正在加载视频…");

  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  if (options?.crossOrigin) {
    video.crossOrigin = "anonymous";
  }
  video.src = src;

  await waitForVideoMetadata(video);

  const durationMs = video.duration * 1000;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("无法获取视频时长");
  }

  const audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  const source = audioCtx.createMediaElementSource(video);
  const destination = audioCtx.createMediaStreamDestination();
  source.connect(destination);

  const mimeType = pickRecorderMimeType();
  const recorder = mimeType
    ? new MediaRecorder(destination.stream, { mimeType })
    : new MediaRecorder(destination.stream);

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
    };
    recorder.onerror = () => reject(new Error("抽取视频音轨失败"));
  });

  const onTimeUpdate = () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const pct = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
    report?.(`正在抽取音轨… ${pct}%`);
  };
  video.addEventListener("timeupdate", onTimeUpdate);

  recorder.start(RECORDER_TIMESLICE_MS);
  video.currentTime = 0;
  report?.("正在抽取音轨… 0%");
  await video.play();

  await Promise.race([
    new Promise<void>((resolve) => {
      video.addEventListener("ended", () => resolve(), { once: true });
    }),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, durationMs + 1500);
    }),
  ]);

  video.removeEventListener("timeupdate", onTimeUpdate);
  video.pause();
  if (recorder.state === "recording") {
    try {
      recorder.requestData();
    } catch {
      // requestData 在部分浏览器上不可用
    }
    recorder.stop();
  }

  const audioBlob = await recorded;
  source.disconnect();
  await audioCtx.close();

  if (audioBlob.size === 0) {
    throw new Error("视频中没有可识别的音轨");
  }

  report?.("正在转换音频格式…");
  return convertBlobToWav(audioBlob);
}

async function extractAudioWavFromVideoFile(
  file: File,
  onProgress?: TranscribeProgressReporter,
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    return await extractAudioWavFromVideoSource(url, { onProgress });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function extractAudioWavFromVideoUrl(
  url: string,
  onProgress?: TranscribeProgressReporter,
): Promise<Blob> {
  try {
    return await extractAudioWavFromVideoSource(url, {
      crossOrigin: true,
      onProgress,
    });
  } catch {
    onProgress?.("正在下载视频…");
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("无法加载视频链接，请检查链接或改用本地上传");
    }
    const blob = await res.blob();
    const ext = videoFileExtension(url, blob.type);
    const file = new File([blob], `video.${ext}`, {
      type: blob.type || `video/${ext}`,
    });
    return extractAudioWavFromVideoFile(file, onProgress);
  }
}

function parseTranscribeResponse(data: {
  text?: unknown;
  raw_language?: unknown;
}): string {
  console.log("data", data);
  const text = typeof data.text === "string" ? data.text.trim() : "";
  const transcript = convertArabicDigitsToChinese(text);
  const rawLanguage =
    typeof data.raw_language === "string" ? data.raw_language.trim() : "";
  if (!isYueRawLanguage(rawLanguage)) {
    throw new NonCantoneseSpeechError(rawLanguage || "unknown", transcript);
  }
  return transcript;
}

/** Upload audio to OSS, then call /api/transcribe with `audio_url`. */
async function transcribeViaOssAudioUrl(
  blob: Blob,
  expected?: string,
  onProgress?: TranscribeProgressReporter,
): Promise<string> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error("未配置 NEXT_PUBLIC_API_URL");
  }

  const audioUrl = await uploadAudioToOss(blob, { onProgress });

  onProgress?.("正在 AI 语音识别…");
  const formData = new FormData();
  formData.append("audio_url", audioUrl);
  formData.append("task", "transcribe");
  // 目标句子。后端遇到含糊的 zh 语种标注时，用它区分粤语与普通话。
  if (expected?.trim()) formData.append("expected", expected.trim());

  const res = await fetch(TRANS_API, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`转录请求失败: ${res.status}`);
  }

  return parseTranscribeResponse(await res.json());
}

/**
 * Multipart `file` upload fallback (e.g. video when OSS only accepts audio).
 * Prefer `transcribeViaOssAudioUrl` for wav / m4a / mp3.
 */
async function transcribeMediaFile(
  file: File,
  expected?: string,
): Promise<string> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error("未配置 NEXT_PUBLIC_API_URL");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("task", "transcribe");
  // 目标句子。后端遇到含糊的 zh 语种标注时，用它区分粤语与普通话。
  if (expected?.trim()) formData.append("expected", expected.trim());

  const res = await fetch(TRANS_API, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`转录请求失败: ${res.status}`);
  }

  return parseTranscribeResponse(await res.json());
}

function videoFileExtension(name: string, mimeType: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".webm")) return "webm";
  if (lower.endsWith(".mov")) return "mov";
  if (lower.endsWith(".m4v")) return "m4v";
  if (mimeType.includes("webm")) return "webm";
  return "mp4";
}

async function transcribeWavBlob(
  wavBlob: Blob,
  onProgress?: TranscribeProgressReporter,
  expected?: string,
): Promise<string> {
  return transcribeViaOssAudioUrl(
    new Blob([wavBlob], { type: "audio/wav" }),
    expected,
    onProgress,
  );
}

/** 上传到 OSS 后调用 /api/transcribe（audio_url）。非粤语时抛出 NonCantoneseSpeechError。 */
export async function transcribeAudioBlob(
  blob: Blob,
  expected?: string,
): Promise<string> {
  const wavBlob = await convertBlobToWav(blob);
  return transcribeWavBlob(wavBlob, undefined, expected);
}

/** 上传视频文件并转录其中的语音（浏览器抽取音轨后转 WAV）。 */
export async function transcribeVideoBlob(
  file: File,
  options?: TranscribeVideoOptions,
): Promise<string> {
  const onProgress = options?.onProgress;
  try {
    const wavBlob = await extractAudioWavFromVideoFile(file, onProgress);
    const text = await transcribeWavBlob(wavBlob, onProgress);
    onProgress?.("识别完成");
    return text;
  } catch (err) {
    console.warn("浏览器抽取视频音轨失败，回退上传原视频:", err);
    onProgress?.("抽取失败，正在上传原视频识别…");
    const ext = videoFileExtension(file.name, file.type);
    const text = await transcribeMediaFile(
      new File([file], `video.${ext}`, {
        type: file.type || `video/${ext}`,
      }),
    );
    onProgress?.("识别完成");
    return text;
  }
}

/** 从视频 URL 拉取并转录（受 CORS 限制）。 */
export async function transcribeVideoUrl(
  url: string,
  options?: TranscribeVideoOptions,
): Promise<string> {
  const onProgress = options?.onProgress;
  try {
    const wavBlob = await extractAudioWavFromVideoUrl(url, onProgress);
    const text = await transcribeWavBlob(wavBlob, onProgress);
    onProgress?.("识别完成");
    return text;
  } catch (err) {
    console.warn("浏览器抽取视频音轨失败，回退下载原视频:", err);
    onProgress?.("正在下载视频…");
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("无法加载视频链接，请检查链接或改用本地上传");
    }
    const blob = await res.blob();
    const ext = videoFileExtension(url, blob.type);
    const file = new File([blob], `video.${ext}`, {
      type: blob.type || `video/${ext}`,
    });
    return transcribeVideoBlob(file, options);
  }
}

/** 用公开音频 URL 直接调用 /api/transcribe（`audio_url`，无需再上传）。 */
export async function transcribeAudioUrl(url: string): Promise<string> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error("未配置 NEXT_PUBLIC_API_URL");
  }
  const trimmed = url.trim();
  if (!trimmed) throw new Error("音频链接为空");

  const formData = new FormData();
  formData.append("audio_url", trimmed);
  formData.append("task", "transcribe");

  const res = await fetch(TRANS_API, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`转录请求失败: ${res.status}`);
  }
  return parseTranscribeResponse(await res.json());
}
