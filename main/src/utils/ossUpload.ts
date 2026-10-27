/**
 * Browser → Aliyun OSS signed PUT (direct upload).
 *
 * Flow:
 * 1. POST Deno `/api/upload/get_pre_sign` → upload_url + headers + upload_token
 * 2. PUT upload_url with Content-Type + x-oss-forbid-overwrite + raw body
 *    (same as: curl -X PUT "$upload_url" -H "Content-Type: …" -H "x-oss-forbid-overwrite: true" --data-binary @file)
 * 3. POST Deno `/api/upload/complete` → verified public url
 *
 * Requires: bucket CORS allows this page Origin (PUT), and the browser can
 * reach *.aliyuncs.com (local proxy/TUN must not hijack OSS DNS).
 */

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
  headers: Record<string, string>;
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
  if (!raw || raw.endsWith("wav")) return "audio/wav";
  throw new Error(
    `不支持的音频格式: ${raw || "(empty)"}. 仅支持 wav / m4a / mp3`,
  );
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

/** Upload an audio blob straight to OSS via signed PUT; return the verified public URL. */
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
  if (!pre.upload_url || !pre.headers || !pre.key || !pre.upload_token) {
    throw new Error("申请上传失败: 返回数据不完整");
  }
  if (typeof pre.max_bytes === "number" && blob.size > pre.max_bytes) {
    throw new Error(`文件过大: 最大 ${pre.max_bytes} 字节`);
  }

  // 2) browser → OSS signed PUT (raw body + exact signed headers)
  report?.("正在上传音频…");
  let putRes: Response;
  try {
    putRes = await fetch(pre.upload_url, {
      method: pre.method || "PUT",
      headers: pre.headers,
      body: blob,
    });
  } catch (err) {
    throw new Error(
      `上传到 OSS 失败（网络或 CORS）: ${
        err instanceof Error ? err.message : String(err)
      }。请确认 bucket CORS 允许当前 Origin 的 PUT，且代理未劫持 *.aliyuncs.com`,
    );
  }
  if (!putRes.ok) {
    throw new Error(`上传到 OSS 失败: ${await readOssError(putRes)}`);
  }

  // 3) complete
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
