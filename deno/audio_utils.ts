import OpenCC from "opencc-js";

const toSimplified = OpenCC.Converter({ from: "t", to: "cn" });
const toTraditional = OpenCC.Converter({ from: "cn", to: "t" });

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, i + CHUNK);
    parts.push(String.fromCharCode.apply(null, sub as unknown as number[]));
  }
  return btoa(parts.join(""));
}

/** Map filename / MIME to OpenRouter input_audio format (lowercase extension). */
export function inferAudioFormat(filename: string, mimeType: string): string {
  const lower = filename.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  const allowed = new Set([
    "wav",
    "mp3",
    "m4a",
    "flac",
    "ogg",
    "aac",
    "aiff",
    "webm",
    "pcm16",
    "pcm24",
  ]);
  if (ext && allowed.has(ext)) return ext;
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("webm")) return "webm";
  return "wav";
}

/** Spoken language detected from audio. */
export type SpeechLang = "cantonese" | "mandarin" | "other";

/**
 * How `lang` was decided, so callers can tell a real detection from a lenient
 * default instead of penalising the speaker on a guess.
 */
export type LangSource =
  /** ASR reported a decisive code (`yue`, `cmn`, `en`, …). */
  | "asr"
  /** Ambiguous `zh`, resolved by scoring a `yue` pass against the expected text. */
  | "expected-match"
  /** Ambiguous `zh`, resolved from written-Cantonese particles in the transcript. */
  | "text"
  /** Nothing decisive available; `lang` is the lenient default. */
  | "unknown";

export type TranscribeResult = {
  text: string;
  lang: SpeechLang;
  langSource: LangSource;
  /** Untouched language code reported by the ASR provider, for debugging. */
  rawLanguage?: string;
};

/**
 * Language classes as reported by ASR providers.
 *
 * DashScope documents `zh` as the whole Chinese family ("普通话、四川话、闽南语、吴语"),
 * so a `zh` annotation is NOT evidence of Mandarin — Cantonese audio is very often
 * labelled `zh` as well. It maps to `chinese` and needs a second decision step.
 */
export type LangCodeClass = "cantonese" | "mandarin" | "chinese" | "other";

const CANTONESE_CODES = new Set([
  "yue",
  "zh-yue",
  "zh_yue",
  "yue-hant",
  "yue-hans",
  "zh-hk",
  "粤语",
  "粵語",
  "广东话",
  "廣東話",
]);

/** Codes that name Mandarin specifically (unlike the `zh` umbrella). */
const MANDARIN_CODES = new Set([
  "cmn",
  "zh-cmn",
  "普通话",
  "普通話",
  "国语",
  "國語",
]);

/** The `zh` umbrella: Chinese, dialect unspecified. */
const CHINESE_FAMILY_CODES = new Set([
  "zh",
  "zho",
  "chi",
  "zh-cn",
  "zh-sg",
  "zh-tw",
  "zh-hans",
  "zh-hant",
  "chinese",
  "中文",
]);

/** Map an ASR / BCP-47 code onto a language class. */
export function classifyLanguageCode(
  code: string | undefined | null,
): LangCodeClass | undefined {
  if (!code) return undefined;
  const c = code.trim().toLowerCase();
  if (!c || c === "auto") return undefined;
  if (CANTONESE_CODES.has(c) || c.includes("cantonese")) return "cantonese";
  if (
    MANDARIN_CODES.has(c) ||
    c.includes("mandarin") ||
    c.includes("putonghua")
  ) {
    return "mandarin";
  }
  if (CHINESE_FAMILY_CODES.has(c)) return "chinese";
  return "other";
}

/**
 * Particles that only occur in written Cantonese. `呢` is deliberately absent:
 * it is a standard Mandarin sentence particle too and caused false positives.
 */
const YUE_CHARS = /[嘅咗喺嚟唔係哋冇喎噃啫囉喇嘞嗱嗰啲咁噉嚿嘢]/;

/** True when the transcript contains particles unique to written Cantonese. */
export function hasWrittenCantoneseMarkers(text: string): boolean {
  return YUE_CHARS.test(text);
}

/**
 * True when the transcript uses Simplified-only forms.
 *
 * Qwen-ASR tends to emit Traditional for Cantonese and Simplified for Mandarin,
 * so a Simplified transcript is a strong Mandarin signal. Shared characters
 * (人、山、春…) that look the same in both scripts do not count.
 */
export function isSimplifiedChinese(text: string): boolean {
  const han = text.replace(/[^\u4e00-\u9fff]/g, "");
  if (!han) return false;
  return toTraditional(han) !== han && toSimplified(han) === han;
}

/** Fallback when the ASR response has no language annotation. */
export function classifySpeechLangFromText(text: string): SpeechLang {
  const t = text.trim();
  if (!t) return "other";
  if (hasWrittenCantoneseMarkers(t)) return "cantonese";
  if (isSimplifiedChinese(t)) return "mandarin";
  if (/[\u4e00-\u9fff]/.test(t)) return "cantonese";
  return "other";
}

/** Pull the raw language code out of an ASR payload, wherever it is nested. */
export function rawLanguageFromAsrPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;

  const direct = obj.language ?? obj.lang;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  if (Array.isArray(obj.annotations)) {
    for (const item of obj.annotations) {
      if (item && typeof item === "object") {
        const language = (item as { language?: unknown }).language;
        if (typeof language === "string" && language.trim()) {
          return language.trim();
        }
      }
    }
  }

  if (obj.message && typeof obj.message === "object") {
    const nested = rawLanguageFromAsrPayload(obj.message);
    if (nested) return nested;
  }

  if (Array.isArray(obj.choices) && obj.choices[0]) {
    const nested = rawLanguageFromAsrPayload(obj.choices[0]);
    if (nested) return nested;
  }

  return undefined;
}

/**
 * Decide `lang` when the ASR code is missing or the ambiguous `zh` umbrella.
 *
 * Non-Chinese → `other`. Written-Cantonese particles → `cantonese`. Simplified
 * Chinese → `mandarin` (Cantonese ASR usually emits Traditional). Otherwise
 * stay `cantonese` with `langSource: "unknown"` so a Traditional poem reading
 * is not wrongly rejected.
 */
export function resolveAmbiguousLang(
  text: string,
): { lang: SpeechLang; langSource: LangSource } {
  const t = text.trim();
  if (t && !/[\u4e00-\u9fff]/.test(t)) {
    return { lang: "other", langSource: "text" };
  }
  if (hasWrittenCantoneseMarkers(t)) {
    return { lang: "cantonese", langSource: "text" };
  }
  if (isSimplifiedChinese(t)) {
    return { lang: "mandarin", langSource: "text" };
  }
  return { lang: "cantonese", langSource: "unknown" };
}

/**
 * If ASR labelled Cantonese but the transcript is Simplified, override to
 * Mandarin — Qwen-ASR writes Traditional for Cantonese audio.
 */
export function applySimplifiedMandarinOverride(
  result: TranscribeResult,
): TranscribeResult {
  if (result.lang === "cantonese" && isSimplifiedChinese(result.text)) {
    return { ...result, lang: "mandarin", langSource: "text" };
  }
  return result;
}

function normalizeForCompare(text: string): string {
  return text.replace(/[\p{P}\p{S}\s]/gu, "");
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = Array.from({ length: n + 1 }, (_, j) => j);
  const curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }

  return prev[n];
}

/** 0–100 similarity, punctuation-insensitive. */
export function textSimilarity(text1: string, text2: string): number {
  const a = normalizeForCompare(text1);
  const b = normalizeForCompare(text2);
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const distance = levenshteinDistance(a, b);
  return Math.round((1 - distance / Math.max(a.length, b.length)) * 100);
}

/**
 * Minimum similarity gap between the `yue` and auto passes before we call it.
 * Both scripts come from the same model, so the comparison is relative and a
 * traditional/simplified mismatch against `expected` penalises both equally.
 */
const LANG_MATCH_MARGIN = 8;

/** Pick the variety whose transcript better matches the expected Cantonese line. */
export function decideLangByExpected(
  expected: string,
  autoText: string,
  yueText: string,
): { lang: SpeechLang; langSource: LangSource } | undefined {
  if (!expected.trim()) return undefined;
  const autoScore = textSimilarity(autoText, expected);
  const yueScore = textSimilarity(yueText, expected);
  if (yueScore >= autoScore + LANG_MATCH_MARGIN) {
    return { lang: "cantonese", langSource: "expected-match" };
  }
  if (autoScore >= yueScore + LANG_MATCH_MARGIN) {
    return { lang: "mandarin", langSource: "expected-match" };
  }
  return undefined;
}

function textFromChatContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && typeof (part as { text?: string }).text === "string") {
        return (part as { text: string }).text;
      }
      return "";
    })
    .join("")
    .trim();
}

function inferAudioMime(filename: string, mimeType: string): string {
  if (mimeType && mimeType !== "application/octet-stream") return mimeType;
  const fmt = inferAudioFormat(filename, mimeType);
  const map: Record<string, string> = {
    wav: "audio/wav",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    aac: "audio/aac",
    flac: "audio/flac",
    webm: "audio/webm",
  };
  return map[fmt] || "audio/wav";
}

/**
 * Map BCP-47 / Cantonese hints to ISO-639-1 for OpenRouter STT `language`.
 * OpenRouter only accepts ISO-639-1, which has no Cantonese code, so `yue`
 * has to collapse to `zh` here. Use `dashScopeLanguageHints` for DashScope.
 */
export function sttLanguageHint(lang: string): string | undefined {
  const lower = lang.trim().toLowerCase();
  if (!lower || lower === "auto") return undefined;
  if (lower === "yue" || lower === "zh-yue" || lower.includes("cantonese")) return "zh";
  return lower.length <= 3 ? lower : lower.slice(0, 2);
}

/**
 * DashScope accepts `yue` directly, so keep Cantonese instead of collapsing it
 * to `zh`. For `auto` / the `zh` umbrella we hint Cantonese first so a Cantonese
 * reading is not decoded with Mandarin phonology.
 */
export function dashScopeLanguageHints(lang: string): string[] {
  const cls = classifyLanguageCode(lang);
  if (cls === "cantonese") return ["yue"];
  if (cls === "mandarin") return ["zh"];
  if (cls === "other") return [lang.trim().toLowerCase()];
  return ["yue", "zh"];
}

/**
 * DashScope caps inline (base64 data URL) audio at 10 MB. Base64 inflates by
 * 4/3, so anything above this would 400 and silently cost us the language
 * annotation, which is the only reliable Cantonese signal we get.
 */
const DASHSCOPE_INLINE_AUDIO_BYTES = 7 * 1024 * 1024;

export function openRouterHeaders(
  apiKey: string,
  httpReferer = "",
  siteTitle = "",
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (httpReferer) headers["HTTP-Referer"] = httpReferer;
  if (siteTitle) headers["X-OpenRouter-Title"] = siteTitle;
  return headers;
}

/**
 * Validate a publicly reachable audio URL for DashScope / OpenRouter.
 * Rejects empty values and non-http(s) schemes.
 */
export function parsePublicAudioUrl(raw: string | undefined | null): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("audio_url must be a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("audio_url must be an http(s) URL");
  }
  return url.toString();
}

type AudioInputParams = {
  file?: File;
  filename?: string;
  /** Public http(s) URL; DashScope can fetch it without a base64 upload. */
  audioUrl?: string;
};

async function resolveAudioDataUri(params: AudioInputParams): Promise<string> {
  if (params.audioUrl) return params.audioUrl;
  if (!params.file) throw new Error("file or audio_url is required");
  const name = params.filename ?? params.file.name ?? "audio";
  const buf = new Uint8Array(await params.file.arrayBuffer());
  const mimeType = inferAudioMime(name, params.file.type || "");
  return `data:${mimeType};base64,${uint8ArrayToBase64(buf)}`;
}

/** Download a public audio URL into a File (OpenRouter needs bytes/base64). */
async function fetchAudioUrlAsFile(audioUrl: string, filename?: string): Promise<File> {
  const resp = await fetch(audioUrl);
  if (!resp.ok) {
    throw new Error(`Failed to fetch audio_url (${resp.status})`);
  }
  const buf = new Uint8Array(await resp.arrayBuffer());
  const urlName = (() => {
    try {
      const path = new URL(audioUrl).pathname;
      const base = path.split("/").filter(Boolean).pop();
      return base ? decodeURIComponent(base) : undefined;
    } catch {
      return undefined;
    }
  })();
  const name = filename || urlName || "audio";
  const type = resp.headers.get("content-type") || inferAudioMime(name, "");
  const arrayBuffer: ArrayBuffer = Uint8Array.from(buf).buffer;
  return new File([arrayBuffer], name, { type });
}

/** One Qwen-ASR pass: transcript plus the language code the model reported. */
type QwenAsrPass = { text: string; rawLanguage?: string };

async function transcribeViaDashScopeQwenAsr(
  config: {
    apiKey: string;
    model: string;
  },
  params: AudioInputParams & {
    /** Omit to auto-detect; set to `yue` to force a Cantonese decode. */
    languageCode?: string;
  },
): Promise<QwenAsrPass> {
  const { apiKey, model } = config;
  const audioData = await resolveAudioDataUri(params);

  const asrOptions: Record<string, unknown> = { enable_itn: false };
  // Omit asr_options.language so the model auto-detects 粤语 / 普通话 / other.
  // When set, DashScope echoes the same code back, so the annotation can no
  // longer be used for detection — only the transcript is meaningful.
  if (params.languageCode) asrOptions.language = params.languageCode;

  const resp = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: { data: audioData },
              },
            ],
          },
        ],
        asr_options: asrOptions,
      }),
    },
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`DashScope Qwen-ASR ${resp.status}: ${err.slice(0, 2000)}`);
  }

  const data = await resp.json();
  const message = data.choices?.[0]?.message;
  const text = textFromChatContent(message?.content);
  const rawLanguage = rawLanguageFromAsrPayload(data);
  console.info(
    `Qwen-ASR pass (hint=${params.languageCode ?? "auto"}) language=${rawLanguage ?? "none"}`,
  );
  return { text, rawLanguage };
}

async function transcribeViaDashScope(
  config: {
    apiKey: string;
    model: string;
  },
  params: AudioInputParams & {
    language?: string;
    expected?: string;
    prompt?: string;
    task?: "transcribe" | "translate";
  },
): Promise<TranscribeResult> {
  const { apiKey, model } = config;
  const lang = (params.language ?? "auto").trim().toLowerCase();
  const task = params.task === "translate" ? "translate" : "transcribe";
  const audioSource: AudioInputParams = {
    file: params.file,
    filename: params.filename,
    audioUrl: params.audioUrl,
  };

  if (task === "translate") {
    const transcribed = await transcribeViaDashScope(config, {
      ...params,
      task: "transcribe",
    });
    const transcribedText = transcribed.text;

    let instruction =
      "把下面的文字翻译成地道的书面粤语（用繁体字）。只输出粤语译文，不要标签或解释。";
    if (params.prompt?.trim()) {
      instruction += ` 补充说明：${params.prompt.trim()}`;
    }

    const resp = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [
            {
              role: "user",
              content: `${instruction}\n\n待翻译文本：\n${transcribedText}`,
            },
          ],
        }),
      },
    );

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DashScope translation ${resp.status}: ${err.slice(0, 2000)}`);
    }

    const data = await resp.json();
    return {
      text: data.choices?.[0]?.message?.content?.trim() ?? "",
      // Translation target is Cantonese; keep spoken-audio lang from the ASR step.
      lang: transcribed.lang,
      langSource: transcribed.langSource,
      rawLanguage: transcribed.rawLanguage,
    };
  }

  const asrConfig = { apiKey, model: model || "qwen3-asr-flash" };
  const expected = params.expected?.trim() ?? "";
  // Public URLs skip the base64 size cap; uploaded files above the limit go
  // straight to Paraformer.
  const skipInlineQwen =
    !params.audioUrl &&
    Boolean(params.file && params.file.size > DASHSCOPE_INLINE_AUDIO_BYTES);

  if (skipInlineQwen) {
    console.warn(
      `Audio is ${params.file!.size} bytes, above the ${DASHSCOPE_INLINE_AUDIO_BYTES} inline limit; skipping Qwen-ASR`,
    );
  } else {
    try {
      const autoPass = await transcribeViaDashScopeQwenAsr(asrConfig, audioSource);
      const cls = classifyLanguageCode(autoPass.rawLanguage);

      // `yue`, `cmn`, `en`, … are decisive; only the `zh` umbrella is not.
      if (cls && cls !== "chinese") {
        return {
          text: autoPass.text,
          lang: cls,
          langSource: "asr",
          rawLanguage: autoPass.rawLanguage,
        };
      }

      // Ambiguous: decode again forcing Cantonese and see which transcript is
      // closer to the line the speaker was asked to read. Same characters read
      // in either variety sound very different, so the closer pass wins.
      if (expected) {
        try {
          const yuePass = await transcribeViaDashScopeQwenAsr(asrConfig, {
            ...audioSource,
            languageCode: "yue",
          });
          const decided = decideLangByExpected(
            expected,
            autoPass.text,
            yuePass.text,
          );
          if (decided) {
            return {
              text: decided.lang === "cantonese" ? yuePass.text : autoPass.text,
              lang: decided.lang,
              langSource: decided.langSource,
              rawLanguage: autoPass.rawLanguage,
            };
          }
        } catch (err) {
          console.warn("DashScope Qwen-ASR Cantonese pass failed:", err);
        }
      }

      return {
        text: autoPass.text,
        ...resolveAmbiguousLang(autoPass.text),
        rawLanguage: autoPass.rawLanguage,
      };
    } catch (err) {
      console.warn("DashScope Qwen-ASR failed, falling back to Paraformer:", err);
    }
  }

  const fileUrl = await resolveAudioDataUri(audioSource);
  const languageHints = dashScopeLanguageHints(lang);

  const submitResp = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "paraformer-v2",
        input: {
          file_urls: [fileUrl],
        },
        parameters: {
          language_hints: languageHints,
        },
      }),
    },
  );

  if (!submitResp.ok) {
    const err = await submitResp.text();
    throw new Error(`DashScope submit ${submitResp.status}: ${err.slice(0, 2000)}`);
  }

  const submitData = await submitResp.json();
  const taskId = submitData.output?.task_id;
  if (!taskId) {
    throw new Error("DashScope: no task_id in response");
  }

  let taskStatus = "PENDING";
  let transcriptionUrl = "";
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const taskResp = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );
    if (!taskResp.ok) {
      const err = await taskResp.text();
      throw new Error(`DashScope task poll ${taskResp.status}: ${err.slice(0, 2000)}`);
    }
    const taskData = await taskResp.json();
    taskStatus = taskData.output?.task_status;
    if (taskStatus === "SUCCEEDED") {
      transcriptionUrl = taskData.output?.results?.[0]?.transcription_url;
      break;
    } else if (taskStatus === "FAILED") {
      throw new Error(`DashScope task failed: ${JSON.stringify(taskData)}`);
    }
  }

  if (taskStatus !== "SUCCEEDED" || !transcriptionUrl) {
    throw new Error(`DashScope task did not complete in time (status: ${taskStatus})`);
  }

  const transcriptionResp = await fetch(transcriptionUrl);
  if (!transcriptionResp.ok) {
    const err = await transcriptionResp.text();
    throw new Error(`DashScope transcription fetch ${transcriptionResp.status}: ${err.slice(0, 2000)}`);
  }

  const transcriptionData = await transcriptionResp.json();
  const text = transcriptionData.transcripts?.[0]?.text?.trim() ?? "";
  const rawLanguage = transcriptionData.transcripts?.[0]?.sentences?.[0]?.language;
  const cls = classifyLanguageCode(rawLanguage);
  if (cls && cls !== "chinese") {
    return { text, lang: cls, langSource: "asr", rawLanguage };
  }
  return { text, ...resolveAmbiguousLang(text), rawLanguage };
}

async function transcribeViaOpenRouter(
  config: {
    apiKey: string;
    model: string;
    httpReferer?: string;
    siteTitle?: string;
  },
  params: AudioInputParams & {
    language?: string;
    prompt?: string;
    task?: "transcribe" | "translate";
  },
): Promise<TranscribeResult> {
  const { apiKey, model, httpReferer = "", siteTitle = "" } = config;
  // OpenRouter needs bytes; if only a public URL was given, download it first.
  const file = params.file ??
    (params.audioUrl
      ? await fetchAudioUrlAsFile(params.audioUrl, params.filename)
      : undefined);
  if (!file) throw new Error("file or audio_url is required");
  const name = params.filename ?? file.name ?? "audio";
  const buf = new Uint8Array(await file.arrayBuffer());
  const base64Audio = uint8ArrayToBase64(buf);
  const format = inferAudioFormat(name, file.type || "");
  const headers = openRouterHeaders(apiKey, httpReferer, siteTitle);

  const lang = (params.language ?? "auto").trim().toLowerCase();
  const task = params.task === "translate" ? "translate" : "transcribe";

  if (task === "translate") {
    const transcribed = await transcribeViaOpenRouter(config, {
      ...params,
      task: "transcribe",
    });
    let instruction =
      "Listen to this audio and translate the speech into natural written Cantonese (Traditional Chinese). Output only the Cantonese text, no labels or commentary.";
    if (params.prompt?.trim()) {
      instruction += ` Additional context: ${params.prompt.trim()}`;
    }

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: instruction },
              {
                type: "input_audio",
                input_audio: { data: base64Audio, format },
              },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OpenRouter translation ${resp.status}: ${err.slice(0, 2000)}`);
    }

    const data = await resp.json();
    return {
      text: data.choices?.[0]?.message?.content?.trim() ?? "",
      lang: transcribed.lang,
      langSource: transcribed.langSource,
      rawLanguage: transcribed.rawLanguage,
    };
  }

  const body: Record<string, unknown> = {
    model,
    input_audio: { data: base64Audio, format },
  };
  const language = sttLanguageHint(lang);
  if (language) body.language = language;

  const resp = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenRouter transcription ${resp.status}: ${err.slice(0, 2000)}`);
  }

  const data = await resp.json();
  const text = data.text?.trim() ?? "";
  // OpenRouter's transcription endpoint returns no language field, so this
  // almost always lands on the transcript-based fallback.
  const rawLanguage = rawLanguageFromAsrPayload(data);
  const cls = classifyLanguageCode(rawLanguage);
  if (cls && cls !== "chinese") {
    return { text, lang: cls, langSource: "asr", rawLanguage };
  }
  return { text, ...resolveAmbiguousLang(text), rawLanguage };
}

export async function transcribeCantoneseAudio(
  config: {
    dashScopeApiKey?: string;
    dashScopeModel?: string;
    apiKey?: string;
    model: string;
    httpReferer?: string;
    siteTitle?: string;
  },
  params: AudioInputParams & {
    language?: string;
    /** The line the speaker was asked to read; disambiguates a `zh` annotation. */
    expected?: string;
    prompt?: string;
    task?: "transcribe" | "translate";
  },
): Promise<TranscribeResult> {
  if (!params.file && !params.audioUrl) {
    throw new Error("file or audio_url is required");
  }

  if (config.dashScopeApiKey) {
    try {
      return applySimplifiedMandarinOverride(
        await transcribeViaDashScope(
          {
            apiKey: config.dashScopeApiKey,
            model: config.dashScopeModel || "qwen3-asr-flash",
          },
          params,
        ),
      );
    } catch (err) {
      console.warn("DashScope failed, falling back to OpenRouter:", err);
      if (!config.apiKey) throw err;
    }
  }

  if (!config.apiKey) throw new Error("No API key configured (DASHSCOPE_API_KEY or API_KEY)");
  return applySimplifiedMandarinOverride(
    await transcribeViaOpenRouter(
      {
        apiKey: config.apiKey,
        model: config.model,
        httpReferer: config.httpReferer,
        siteTitle: config.siteTitle,
      },
      params,
    ),
  );
}
