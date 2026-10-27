import { Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";

const ALI_OSS_ACCESS_KEY_ID = Deno.env.get("ALI_OSS_ACCESS_KEY_ID") || "";
const ALI_OSS_ACCESS_KEY_SECRET = Deno.env.get("ALI_OSS_ACCESS_KEY_SECRET") || "";
const OSS_BUCKET = Deno.env.get("OSS_BUCKET") || "dimsum-fo";
const OSS_REGION = Deno.env.get("OSS_REGION") || "oss-cn-guangzhou";
const OSS_UPLOAD_PREFIX = (Deno.env.get("OSS_UPLOAD_PREFIX") || "uploads").replace(
  /^\/+|\/+$/g,
  "",
);
const OSS_UPLOAD_EXPIRES_SECONDS = Number(
  Deno.env.get("OSS_UPLOAD_EXPIRES_SECONDS") || "600",
);
const OSS_UPLOAD_MAX_BYTES = Number(
  Deno.env.get("OSS_UPLOAD_MAX_BYTES") || String(5 * 1024 * 1024),
);

/** How long after the URL expires a client may still call `/complete`. */
const COMPLETE_GRACE_SECONDS = 60 * 60;

/**
 * Sent as a PostObject form field so OSS rejects a second upload to the same key —
 * this is what makes the upload form single-use.
 */
const FORBID_OVERWRITE_HEADER = "x-oss-forbid-overwrite";

/** Accepted upload MIME types → object key extension (wav, m4a, mp3 only). */
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
};

const encoder = new TextEncoder();

function ossHost(): string {
  return `${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`;
}

function encodeObjectKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function publicObjectUrl(key: string): string {
  return `https://${ossHost()}/${encodeObjectKey(key)}`;
}

async function hmacBase64(
  hash: "SHA-1" | "SHA-256",
  secret: string,
  message: string,
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** OSS V1 signature: base64(HMAC-SHA1(secret, StringToSign)). */
export function ossSignatureV1(secret: string, stringToSign: string): Promise<string> {
  return hmacBase64("SHA-1", secret, stringToSign);
}

/**
 * PostObject form for one browser upload. Unlike a pre-signed PUT URL, the signed
 * policy lets OSS itself enforce the size limit (`content-length-range`).
 */
export async function buildPostObjectForm(params: {
  key: string;
  contentType: string;
  expires: number;
  maxBytes: number;
}): Promise<Record<string, string>> {
  const policy = btoa(JSON.stringify({
    expiration: new Date(params.expires * 1000).toISOString(),
    conditions: [
      { bucket: OSS_BUCKET },
      ["eq", "$key", params.key],
      ["eq", "$Content-Type", params.contentType],
      // Required when the form also sends this field (Aliyun PostObject rule).
      ["eq", `$${FORBID_OVERWRITE_HEADER}`, "true"],
      ["content-length-range", 1, params.maxBytes],
      // 200 is more reliable for browser CORS than the default 204.
      ["eq", "$success_action_status", "200"],
    ],
  }));
  return {
    key: params.key,
    "Content-Type": params.contentType,
    [FORBID_OVERWRITE_HEADER]: "true",
    success_action_status: "200",
    OSSAccessKeyId: ALI_OSS_ACCESS_KEY_ID,
    policy,
    Signature: await ossSignatureV1(ALI_OSS_ACCESS_KEY_SECRET, policy),
  };
}

async function presignObjectUrl(params: {
  method: "PUT" | "HEAD";
  key: string;
  expires: number;
  contentType?: string;
  ossHeaders?: Record<string, string>;
}): Promise<string> {
  const canonicalHeaders = Object.entries(params.ossHeaders ?? {})
    .map(([k, v]) => [k.toLowerCase(), v.trim()] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}\n`)
    .join("");
  const stringToSign = [
    params.method,
    "",
    params.contentType ?? "",
    String(params.expires),
    `${canonicalHeaders}/${OSS_BUCKET}/${params.key}`,
  ].join("\n");
  const signature = await ossSignatureV1(ALI_OSS_ACCESS_KEY_SECRET, stringToSign);
  const query = new URLSearchParams({
    OSSAccessKeyId: ALI_OSS_ACCESS_KEY_ID,
    Expires: String(params.expires),
    Signature: signature,
  });
  return `${publicObjectUrl(params.key)}?${query}`;
}

function base64UrlEncode(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Server-side proof that `key` was issued by us, so `/complete` can't be pointed at arbitrary objects. */
export async function signUploadToken(key: string, expires: number): Promise<string> {
  const sig = await hmacBase64(
    "SHA-256",
    `upload-token:${ALI_OSS_ACCESS_KEY_SECRET}`,
    `${key}\n${expires}`,
  );
  return `${expires}.${base64UrlEncode(sig)}`;
}

export async function verifyUploadToken(key: string, token: string): Promise<boolean> {
  const [expiresRaw] = token.split(".");
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires)) return false;
  if (Date.now() / 1000 > expires + COMPLETE_GRACE_SECONDS) return false;
  const expected = await signUploadToken(key, expires);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

function buildObjectKey(extension: string): string {
  const now = new Date();
  const day = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${
    String(now.getUTCDate()).padStart(2, "0")
  }`;
  return `${OSS_UPLOAD_PREFIX}/${day}/${crypto.randomUUID()}.${extension}`;
}

async function readJsonBody(context: Context): Promise<Record<string, unknown> | null> {
  try {
    const body = await context.request.body({ type: "json" }).value;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      context.response.status = 400;
      context.response.body = { error: "JSON object body is required" };
      return null;
    }
    return body as Record<string, unknown>;
  } catch {
    context.response.status = 400;
    context.response.body = { error: "Invalid JSON body" };
    return null;
  }
}

function ensureOssConfigured(context: Context): boolean {
  if (ALI_OSS_ACCESS_KEY_ID && ALI_OSS_ACCESS_KEY_SECRET) return true;
  context.response.status = 500;
  context.response.body = {
    error: "Missing ALI_OSS_ACCESS_KEY_ID or ALI_OSS_ACCESS_KEY_SECRET",
  };
  return false;
}

/*
curl -X POST http://localhost:3003/api/upload/get_pre_sign \
  -H "Content-Type: application/json" \
  -d '{"content_type":"audio/wav","size":123456}'
*/
export async function handleGetPreSign(context: Context) {
  if (!ensureOssConfigured(context)) return;
  try {
    const body = await readJsonBody(context);
    if (!body) return;

    const contentType = typeof body.content_type === "string"
      ? body.content_type.trim().toLowerCase()
      : "";
    const size = body.size === undefined ? undefined : Number(body.size);

    const extension = Object.hasOwn(ALLOWED_CONTENT_TYPES, contentType)
      ? ALLOWED_CONTENT_TYPES[contentType]
      : undefined;
    if (!extension) {
      context.response.status = 400;
      context.response.body = {
        error: `'content_type' must be one of: ${Object.keys(ALLOWED_CONTENT_TYPES).join(", ")}`,
      };
      return;
    }
    if (size !== undefined && (!Number.isFinite(size) || size <= 0)) {
      context.response.status = 400;
      context.response.body = { error: "'size' must be a positive number of bytes" };
      return;
    }
    if (size !== undefined && size > OSS_UPLOAD_MAX_BYTES) {
      context.response.status = 413;
      context.response.body = {
        error: `File too large: max ${OSS_UPLOAD_MAX_BYTES} bytes`,
      };
      return;
    }

    const key = buildObjectKey(extension);
    const expires = Math.floor(Date.now() / 1000) + OSS_UPLOAD_EXPIRES_SECONDS;
    const headers = {
      "Content-Type": contentType,
      [FORBID_OVERWRITE_HEADER]: "true",
    };
    const uploadUrl = await presignObjectUrl({
      method: "PUT",
      key,
      expires,
      contentType,
      ossHeaders: { [FORBID_OVERWRITE_HEADER]: "true" },
    });

    context.response.body = {
      key,
      upload_url: uploadUrl,
      method: "PUT",
      headers,
      public_url: publicObjectUrl(key),
      expires_at: new Date(expires * 1000).toISOString(),
      upload_token: await signUploadToken(key, expires),
      max_bytes: OSS_UPLOAD_MAX_BYTES,
    };
  } catch (err) {
    console.error("get_pre_sign error:", err);
    context.response.status = 500;
    context.response.body = { error: String(err) };
  }
}

/*
curl -X POST http://localhost:3003/api/upload/complete \
  -H "Content-Type: application/json" \
  -d '{"key":"uploads/20261024/<uuid>.wav","upload_token":"<token>"}'
*/
export async function handleUploadComplete(context: Context) {
  if (!ensureOssConfigured(context)) return;
  try {
    const body = await readJsonBody(context);
    if (!body) return;

    const key = typeof body.key === "string" ? body.key.trim() : "";
    const token = typeof body.upload_token === "string" ? body.upload_token.trim() : "";
    if (!key || !token) {
      context.response.status = 400;
      context.response.body = { error: "'key' and 'upload_token' are required" };
      return;
    }
    if (!(await verifyUploadToken(key, token))) {
      context.response.status = 403;
      context.response.body = { error: "Invalid or expired upload_token" };
      return;
    }

    const headUrl = await presignObjectUrl({
      method: "HEAD",
      key,
      expires: Math.floor(Date.now() / 1000) + 60,
    });
    const resp = await fetch(headUrl, { method: "HEAD" });
    if (resp.status === 404) {
      context.response.status = 404;
      context.response.body = { error: "Upload not found; PUT the file first", key };
      return;
    }
    if (!resp.ok) {
      throw new Error(`OSS HEAD ${resp.status}`);
    }

    const size = Number(resp.headers.get("content-length") ?? "0");
    if (size > OSS_UPLOAD_MAX_BYTES) {
      context.response.status = 413;
      context.response.body = {
        error: `Uploaded file exceeds ${OSS_UPLOAD_MAX_BYTES} bytes`,
        key,
      };
      return;
    }

    context.response.body = {
      key,
      url: publicObjectUrl(key),
      size,
      content_type: resp.headers.get("content-type"),
      etag: resp.headers.get("etag")?.replace(/"/g, "") ?? null,
    };
  } catch (err) {
    console.error("upload complete error:", err);
    context.response.status = 500;
    context.response.body = { error: String(err) };
  }
}
