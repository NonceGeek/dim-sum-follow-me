/** Browser → Aliyun OSS PostObject upload via the Deno `/api/upload/*` APIs. */

const API_BASE = () => {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("未配置 NEXT_PUBLIC_API_URL");
  return base.replace(/\/+$/, "");
};

/** MIME types accepted by `/api/upload/get_pre_sign`. */
const ALLOWED_CONTENT_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
]);

type PreSignResponse = {
  key: string;
  upload_url: string;
  method: string;
  form_fields: Record<string, string>;
  public_url: string;
  expires_at: string;
  upload_token: string;
  max_bytes: number;
};

type CompleteResponse = {
  key: string;
  url: string;
  size: number;
  content_type: string | null;
  etag: string | null;
};

function normalizeContentType(blob: Blob): string {
  const raw = (blob.type || "").trim().toLowerCase().split(";")[0] ?? "";
  if (ALLOWED_CONTENT_TYPES.has(raw)) return raw;
  // Recordings are converted to WAV before upload; default when type is empty.
  if (!raw || raw.endsWith("wav")) return "audio/wav";
  throw new Error(
    `不支持的音频格式: ${raw || "(empty)"}. 仅支持 wav / m4a / mp3`,
  );
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes("mpeg") || contentType === "audio/mp3") return "mp3";
  if (contentType.includes("m4a") || contentType === "audio/mp4") return "m4a";
  return "wav";
}

async function readJsonError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    // ignore
  }
  return `HTTP ${res.status}`;
}

async function readOssError(res: Response): Promise<string> {
  let detail = `HTTP ${res.status}`;
  try {
    const xml = await res.text();
    const code = xml.match(/<Code>([^<]+)<\/Code>/)?.[1];
    const message = xml.match(/<Message>([^<]+)<\/Message>/)?.[1];
    if (code || message) detail = [code, message].filter(Boolean).join(": ");
  } catch {
    // ignore
  }
  return detail;
}

/**
 * Upload an audio blob to OSS (PostObject) and return the verified public URL.
 *
 * Flow (browser direct upload — no file bytes through Deno):
 * 1. POST /api/upload/get_pre_sign  → upload_url + form_fields + upload_token
 * 2. POST upload_url (OSS)          → multipart form_fields + file (last)
 * 3. POST /api/upload/complete      → verified public url
 */
export async function uploadAudioToOss(
  blob: Blob,
  options?: { onProgress?: (message: string) => void },
): Promise<string> {
  const contentType = normalizeContentType(blob);
  const report = options?.onProgress;

  // 1) get_pre_sign
  report?.("正在申请上传…");
  const preRes = await fetch(`${API_BASE()}/api/upload/get_pre_sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType, size: blob.size }),
  });
  if (!preRes.ok) {
    throw new Error(`申请上传失败: ${await readJsonError(preRes)}`);
  }
  const pre = (await preRes.json()) as PreSignResponse;
  if (!pre.upload_url || !pre.form_fields || !pre.key || !pre.upload_token) {
    throw new Error("申请上传失败: 返回数据不完整");
  }
  if (typeof pre.max_bytes === "number" && blob.size > pre.max_bytes) {
    throw new Error(`文件过大: 最大 ${pre.max_bytes} 字节`);
  }

  // 2) browser → OSS PostObject (file must be the last form field)
  report?.("正在上传音频…");
  const form = new FormData();
  for (const [name, value] of Object.entries(pre.form_fields)) {
    form.append(name, value);
  }
  const partType = pre.form_fields["Content-Type"] || contentType;
  const filename = `audio.${extensionForContentType(partType)}`;
  // OSS checks Content-Type against the file part's MIME type; filename helps browsers set Content-Disposition.
  form.append("file", new Blob([blob], { type: partType }), filename);

  let putRes: Response;
  try {
    // Do not set Content-Type manually — browser must set multipart boundary.
    putRes = await fetch(pre.upload_url, {
      method: pre.method || "POST",
      body: form,
    });
  } catch (err) {
    // Chrome reports CORS/network failures as TypeError: Failed to fetch
    throw new Error(
      `上传到 OSS 失败（网络或 CORS）: ${
        err instanceof Error ? err.message : String(err)
      }。请确认 bucket CORS 允许当前页面 Origin 的 POST，且本机代理未劫持 *.aliyuncs.com`,
    );
  }
  // OSS returns 204 No Content on success.
  if (!putRes.ok && putRes.status !== 204) {
    throw new Error(`上传到 OSS 失败: ${await readOssError(putRes)}`);
  }

  // 3) complete — server HEAD-verifies the object
  report?.("正在确认上传…");
  const completeRes = await fetch(`${API_BASE()}/api/upload/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: pre.key, upload_token: pre.upload_token }),
  });
  if (!completeRes.ok) {
    throw new Error(`确认上传失败: ${await readJsonError(completeRes)}`);
  }
  const complete = (await completeRes.json()) as CompleteResponse;
  const url = complete.url || pre.public_url;
  if (!url) throw new Error("确认上传失败: 缺少文件地址");
  return url;
}
