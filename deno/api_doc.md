# Dim Sum Shadowing Game API

Cantonese shadowing backend (Deno + Oak). Default local base URL:

```
http://localhost:3003
```

Production example:

```
https://api.shadowing.app.aidimsum.com
```

All JSON responses use `Content-Type: application/json`. CORS is enabled on all routes.

Browse this file in the browser:

- Markdown: [`GET /docs`](#get-docs)
- HTML (GFM styled): [`GET /docs/html`](#get-docshtml)

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DASHSCOPE_API_KEY` | For transcription | DashScope API key (primary) |
| `DASHSCOPE_ASR_MODEL` | No | Default: `qwen3-asr-flash` (DashScope only) |
| `API_KEY` | For transcription | OpenRouter API key (fallback) |
| `OPENROUTER_TRANSCRIPTION_MODEL` | No | Default: `qwen/qwen3-asr-flash-2026-02-10` (OpenRouter STT; IDs differ from DashScope) |
| `OPENROUTER_HTTP_REFERER` | No | Optional OpenRouter `HTTP-Referer` header |
| `OPENROUTER_SITE_TITLE` | No | Optional OpenRouter `X-OpenRouter-Title` header |
| `SUPABASE_URL` | For `/api/libs` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For `/api/libs` | Supabase service-role key |
| `LIB_CREATE_PASSWD` | For `POST /api/libs` | Create password |
| `LIB_UPDATE_PASSWD` | For `PATCH /api/libs/:id` | Update password |
| `LIB_DELETE_PASSWD` | For `DELETE /api/libs/:id` | Delete password |
| `ALI_OSS_ACCESS_KEY_ID` | For `/api/upload/*` | Aliyun OSS AccessKey ID (needs `oss:PutObject` + `oss:GetObject` on the upload prefix) |
| `ALI_OSS_ACCESS_KEY_SECRET` | For `/api/upload/*` | Aliyun OSS AccessKey secret; also signs `upload_token` |
| `OSS_BUCKET` | No | Default: `dimsum-fo` |
| `OSS_REGION` | No | Default: `oss-cn-guangzhou` |
| `OSS_UPLOAD_PREFIX` | No | Default: `uploads` (objects go to `<prefix>/<YYYYMMDD>/<uuid>.<wav|m4a|mp3>`) |
| `OSS_UPLOAD_EXPIRES_SECONDS` | No | Default: `600` (upload policy lifetime) |
| `OSS_UPLOAD_MAX_BYTES` | No | Default: `5242880` (5 MB; enforced by OSS via the policy's `content-length-range`) |
| `PORT` | No | Default: `3003` |

---

## General

### `GET /`

Health greeting.

```bash
curl http://localhost:3003/
```

**Response** `200`

```
Dim Sum Shadowing Game API
```

---

### `GET /health`

Health check.

```bash
curl http://localhost:3003/health
```

**Response** `200`

```json
{
  "status": "healthy",
  "timestamp": "2026-06-02T12:00:00.000Z"
}
```

---

## Documentation

### `GET /docs`

Return this API reference as raw Markdown (`api_doc.md`).

```bash
curl http://localhost:3003/docs
```

**Response** `200`

- **Content-Type:** `text/plain; charset=utf-8` (Markdown source)
- Body: contents of `deno/api_doc.md`

**Errors**

| Status | Reason |
|--------|--------|
| `500` | Documentation file could not be read |

---

### `GET /docs/html`

Return this API reference rendered as HTML with GitHub-flavored Markdown styling ([@deno/gfm](https://deno.land/x/gfm)).

```bash
curl http://localhost:3003/docs/html
```

**Response** `200`

- **Content-Type:** `text/html; charset=utf-8`
- Full HTML page with GFM CSS, suitable for browser viewing

Production example:

```
https://api.shadowing.app.aidimsum.com/docs/html
```

**Errors**

| Status | Reason |
|--------|--------|
| `500` | Documentation file could not be read |

---

## Transcription

### `POST /api/transcribe`

Transcribe speech to text via DashScope Qwen-ASR (primary) or [OpenRouter](https://openrouter.ai) STT (fallback), and detect whether the audio is **Cantonese**, **Mandarin**, or **another language**.

The server accepts `multipart/form-data` with either an uploaded `file` (max **25 MB**, kept in memory for Deno Deploy) or a public `audio_url`. ASR runs **without** a forced language hint so the model can auto-detect the spoken variety.

When `audio_url` is set, DashScope fetches the audio directly (no client upload / base64). Prefer this for files already on OSS.

Legacy alias: `POST /api/trans_cantonese` (same handler).

**Content-Type:** `multipart/form-data`

| Field | Required | Description |
|-------|----------|-------------|
| `file` | One of `file` / `audio_url` | Audio file. Supported extensions / formats: `wav`, `mp3`, `m4a`, `flac`, `ogg`, `aac`, `aiff`, `webm`, `pcm16`, `pcm24` |
| `audio_url` | One of `file` / `audio_url` | Public `http(s)` URL of an audio file (e.g. OSS). Takes precedence over `file` when both are sent |
| `expected` | No | The line the speaker was asked to read. Strongly recommended — see below |
| `prompt` | No | Optional context hint (used only when `task=translate`) |
| `task` | No | `transcribe` (default) or `translate` |

**`lang` detection:** The response includes `lang` with one of:

| Value | Meaning |
|-------|---------|
| `cantonese` | 粤语 (ASR code `yue` / `zh-HK`) |
| `mandarin` | 普通话 / 国语 (ASR code `cmn`, or a `zh` decode that matched `expected` better than the Cantonese decode) |
| `other` | English or any other detected language |

DashScope documents `zh` as the whole Chinese family (普通话、四川话、闽南语、吴语…), so a `zh` annotation is **not** evidence of Mandarin — Cantonese audio is frequently labelled `zh`. The server therefore resolves `lang` in this order, and reports which step decided it in `lang_source`:

| `lang_source` | How `lang` was decided |
|---------------|------------------------|
| `asr` | The ASR returned a decisive code (`yue`, `cmn`, `en`, …) |
| `expected-match` | The code was the ambiguous `zh`, so the audio was decoded a second time with `asr_options.language = "yue"`; whichever transcript is closer to `expected` (by ≥8 similarity points) wins |
| `text` | The transcript itself is decisive — written-Cantonese particles (`嘅咗喺嚟唔係…`) mean Cantonese; **Simplified Chinese** means Mandarin (Cantonese ASR usually emits Traditional); no CJK at all means `other` |
| `unknown` | No evidence either way. `lang` defaults to `cantonese`, because classical poetry reads identically in both varieties and rejecting a correct Cantonese reading is worse than accepting a Mandarin one |

Treat `lang: "mandarin"` as actionable only when `lang_source` is `asr` or `expected-match`. `raw_language` echoes the provider's untouched code for debugging.

Passing `expected` is what makes Mandarin detection reliable: without it, a `zh` annotation can only fall through to `text` or `unknown`. It costs one extra ASR call, and only when the first annotation was ambiguous.

A client `language` form field is **not** applied; the server always auto-detects so `lang` reflects the audio rather than a hint. Files above **7 MB** skip the inline Qwen-ASR path (DashScope caps base64 payloads at 10 MB) and go straight to the `paraformer-v2` fallback, which is hinted with `language_hints: ["yue", "zh"]`.

**Default models:** DashScope `DASHSCOPE_ASR_MODEL` (default `qwen3-asr-flash`); OpenRouter fallback `OPENROUTER_TRANSCRIPTION_MODEL` (default `qwen/qwen3-asr-flash-2026-02-10`). Do not pass the DashScope short name to OpenRouter — it will 400 with `Model … does not exist`.

**`task=translate`:** The audio is transcribed first (and `lang` is taken from that step), then translated into **written Cantonese** (Traditional Chinese) via chat completions. `text` is the Cantonese translation; `lang` is still the **spoken** language of the audio.

Run from the **repository root** (sample file: `main/public/audio/yue1.m4a`).

1. Start the API server: `cd deno && deno task dev`
2. Confirm it is up: `curl --noproxy '*' http://127.0.0.1:3003/health`
3. Transcribe (use `127.0.0.1` and `--noproxy '*'` if your shell has `http_proxy` set — otherwise `localhost` may return an empty `502` with no JSON body):

```bash
curl --noproxy '*' -X POST http://127.0.0.1:3003/api/transcribe \
  -F "file=@main/public/audio/yue1.m4a" \
  -F "task=transcribe" \
  -F "expected=我唔食辣嘢"
```

If your shell cwd is `deno/`, use `../main/public/audio/yue1.m4a` instead.

Or pass a public audio URL (DashScope pulls the file itself — faster for OSS clips):

```bash
curl --noproxy '*' -X POST http://127.0.0.1:3003/api/transcribe \
  -F "audio_url=https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/gfxm1/長老。.wav" \
  -F "task=transcribe" \
  -F "prompt=Casual Cantonese conversation"
```

Translate into written Cantonese:

```bash
curl --noproxy '*' -X POST http://127.0.0.1:3003/api/transcribe \
  -F "file=@main/public/audio/yue1.m4a" \
  -F "task=translate" \
  -F "prompt=Casual Cantonese conversation"
```

**Response** `200` (`task=transcribe` or already-Cantonese audio under `task=translate`):

```json
{
  "text": "我唔食辣嘢",
  "lang": "cantonese",
  "lang_source": "asr",
  "raw_language": "yue"
}
```

Mandarin example — note that `lang_source` shows the `zh` annotation was broken by comparing both decodes against `expected`:

```json
{
  "text": "我不吃辣的东西",
  "lang": "mandarin",
  "lang_source": "expected-match",
  "raw_language": "zh"
}
```

English / other example:

```json
{
  "text": "I don't eat spicy food",
  "lang": "other",
  "lang_source": "asr",
  "raw_language": "en"
}
```

Undetermined example — a poem read aloud, where nothing in the transcript distinguishes the two varieties. Clients should **not** reject on this:

```json
{
  "text": "羅浮山下四時春，盧橘楊梅次第新。",
  "lang": "cantonese",
  "lang_source": "unknown",
  "raw_language": "zh"
}
```

**Errors**

| Status | Body | Reason |
|--------|------|--------|
| `400` | `{ "error": "multipart field 'file' or 'audio_url' is required" }` | Missing both `file` and `audio_url` |
| `400` | `{ "error": "audio_url must be a valid URL" }` / `… http(s) URL` | Invalid `audio_url` |
| `400` | `{ "error": "could not read uploaded file" }` | Upload could not be read |
| `500` | `{ "error": "Missing DASHSCOPE_API_KEY or API_KEY" }` | No transcription API key configured |
| `500` | `{ "error": "..." }` | DashScope / OpenRouter or server error (message in `error`) |

**Troubleshooting**

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| curl hangs or returns empty `502` | `http_proxy` / `https_proxy` intercepting `localhost` | Use `127.0.0.1` and `curl --noproxy '*'` |
| `fail to open/read local data from file` | Wrong path to sample audio | Run from repo root with `@main/public/audio/yue1.m4a` |
| No server response at all | API not running | `cd deno && deno task dev`, then hit `/health` |

Requires env var **`DASHSCOPE_API_KEY`** and/or **`API_KEY`** (OpenRouter). Optional: `OPENROUTER_HTTP_REFERER`, `OPENROUTER_SITE_TITLE`.

---

## Jyutping

### `GET /api/to_jyutping`

### `POST /api/to_jyutping`

Convert Cantonese text to Jyutping.

**GET** — query param `text`  
**POST** — JSON body `{ "text": "..." }`

```bash
curl "http://localhost:3003/api/to_jyutping?text=长老"

curl -X POST http://localhost:3003/api/to_jyutping \
  -H "Content-Type: application/json" \
  -d '{"text":"长老"}'
```

**Response** `200`

```json
{
  "text": "长老",
  "jyutping": "zoeng2 lou5",
  "content": "长(zoeng2)老(lou5)",
  "list": [
    { "character": "长", "jyutping": "zoeng2" },
    { "character": "老", "jyutping": "lou5" }
  ]
}
```

| Field | Description |
|-------|-------------|
| `jyutping` | Space-separated syllables |
| `content` | Inline `字(jyutping)` format used in the app |
| `list` | Per-character mapping |

**Errors**

| Status | Reason |
|--------|--------|
| `400` | Missing `text` |

---

## Upload (OSS direct upload)

Lets the browser upload audio straight to Aliyun OSS without passing bytes through this server. Flow:

1. `POST /api/upload/get_pre_sign` → get a one-time OSS PostObject form (`upload_url` + `form_fields`)
2. Browser `POST`s a `multipart/form-data` body to `upload_url`: every entry of `form_fields`, then the file as `file` (must be the last field)
3. `POST /api/upload/complete` → server confirms the object exists and returns its `url`
4. Optionally pass `url` to `POST /api/transcribe` as `audio_url`

The form uses a signed OSS **policy**, so OSS itself enforces the limits: the `key` and `Content-Type` must match exactly, and the file must be between 1 byte and `OSS_UPLOAD_MAX_BYTES` (larger uploads are rejected by OSS with `400 EntityTooLarge` and never stored). The policy expires after `OSS_UPLOAD_EXPIRES_SECONDS`. Each call generates a fresh random `key`, so clients cannot choose or overwrite paths. The form also sends `x-oss-forbid-overwrite: true`, so a second upload to the same `key` fails with `409 FileAlreadyExists`.

**OSS bucket setup:** add a CORS rule allowing `POST` from your frontend origin (allowed headers `*`). The returned `public_url` / `url` is only readable if the bucket (or prefix) is public-read.

### `POST /api/upload/get_pre_sign`

**Content-Type:** `application/json`

| Field | Required | Description |
|-------|----------|-------------|
| `content_type` | Yes | wav: `audio/wav`, `audio/x-wav`, `audio/wave`; m4a: `audio/mp4`, `audio/x-m4a`, `audio/m4a`; mp3: `audio/mpeg`, `audio/mp3`. It is locked into the signed policy, so the upload must use the returned `Content-Type` field unchanged |
| `size` | No | Bytes; rejected early with `413` if above `OSS_UPLOAD_MAX_BYTES` |

```bash
curl --noproxy '*' -X POST http://127.0.0.1:3003/api/upload/get_pre_sign \
  -H "Content-Type: application/json" \
  -d '{"content_type":"audio/wav","size":123456}'
```

**Response** `200`

```json
{
  "key": "uploads/20261024/2f1c…-…-….wav",
  "upload_url": "https://dimsum-fo.oss-cn-guangzhou.aliyuncs.com",
  "method": "POST",
  "form_fields": {
    "key": "uploads/20261024/2f1c….wav",
    "Content-Type": "audio/wav",
    "x-oss-forbid-overwrite": "true",
    "OSSAccessKeyId": "LTAI…",
    "policy": "eyJleHBpcmF0aW9uIjoi…",
    "Signature": "pW4f…="
  },
  "public_url": "https://dimsum-fo.oss-cn-guangzhou.aliyuncs.com/uploads/20261024/2f1c….wav",
  "expires_at": "2026-10-24T06:48:00.000Z",
  "upload_token": "1793170080.k3J…",
  "max_bytes": 5242880
}
```

Upload with every returned form field unchanged, followed by `file` last. OSS checks the `Content-Type` condition against the **file part's own MIME type**, so the file part must be sent with exactly `content_type` (otherwise `403 AccessDenied … Policy Condition failed`). OSS returns `204` on success:

```bash
curl -X POST "<upload_url>" \
  -F "key=<form_fields.key>" \
  -F "Content-Type=audio/wav" \
  -F "x-oss-forbid-overwrite=true" \
  -F "OSSAccessKeyId=<form_fields.OSSAccessKeyId>" \
  -F "policy=<form_fields.policy>" \
  -F "Signature=<form_fields.Signature>" \
  -F "file=@recording.wav;type=audio/wav"
```

Browser:

```js
const form = new FormData();
for (const [name, value] of Object.entries(pre.form_fields)) form.append(name, value);
// must be last; re-wrap so the part's MIME type equals the requested content_type
form.append("file", new Blob([file], { type: pre.form_fields["Content-Type"] }));
await fetch(pre.upload_url, { method: pre.method, body: form });
```

### `POST /api/upload/complete`

**Content-Type:** `application/json`

| Field | Required | Description |
|-------|----------|-------------|
| `key` | Yes | `key` from `get_pre_sign` |
| `upload_token` | Yes | `upload_token` from `get_pre_sign`; valid until 1 hour after the upload form expires |

```bash
curl --noproxy '*' -X POST http://127.0.0.1:3003/api/upload/complete \
  -H "Content-Type: application/json" \
  -d '{"key":"uploads/20261024/2f1c….wav","upload_token":"1793170080.k3J…"}'
```

**Response** `200`

```json
{
  "key": "uploads/20261024/2f1c….wav",
  "url": "https://dimsum-fo.oss-cn-guangzhou.aliyuncs.com/uploads/20261024/2f1c….wav",
  "size": 123456,
  "content_type": "audio/wav",
  "etag": "5B3C1A2E053D763E1B002CC607C5A0FE"
}
```

**Errors**

| Status | Endpoint | Reason |
|--------|----------|--------|
| `400` | both | Invalid JSON, missing fields, or `content_type` that is not wav / m4a / mp3 |
| `403` | `complete` | `upload_token` does not match `key`, or has expired |
| `404` | `complete` | Nothing has been uploaded to `key` yet |
| `413` | both | File larger than `OSS_UPLOAD_MAX_BYTES` |
| `500` | both | OSS credentials not configured, or OSS error |

Errors returned by **OSS** on the form `POST` (XML body, `<Code>`):

| Status | Code | Reason |
|--------|------|--------|
| `400` | `EntityTooLarge` | File larger than `OSS_UPLOAD_MAX_BYTES`; nothing is stored |
| `403` | `AccessDenied` | Policy expired, or the file part's MIME type / `key` differs from the form fields |
| `409` | `FileAlreadyExists` | This form was already used; call `get_pre_sign` again |

---

## Libraries (CRUD)

Backed by Supabase table `app_lib_shadowing_game`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint | Auto-generated primary key |
| `name` | text | Required |
| `description` | text | Required |
| `item_index_collection` | jsonb | Default `[]` |
| `creator_email` | text | Required |
| `user_data` | jsonb | Default `[]` |
| `data_table` | text | Default `cantonese_corpus_all` |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto on update |

Create, update, and delete require a `passwd` field matching the corresponding env var.

---

### `GET /api/libs`

List libraries.

| Query | Description |
|-------|-------------|
| `creator_email` | Filter by creator |
| `data_table` | Filter by data table |
| `limit` | Page size, 1–200, default `50` |
| `offset` | Offset, default `0` |

```bash
curl http://localhost:3003/api/libs

curl "http://localhost:3003/api/libs?creator_email=alice@example.com&limit=10&offset=0"

curl "http://localhost:3003/api/libs?data_table=cantonese_corpus_all"
```

**Response** `200`

```json
{
  "data": [
    {
      "id": 1,
      "name": "我的语料集",
      "description": "日常粤语",
      "item_index_collection": [],
      "creator_email": "alice@example.com",
      "user_data": [],
      "data_table": "cantonese_corpus_all",
      "created_at": "2026-06-02T12:00:00.000Z",
      "updated_at": "2026-06-02T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### `GET /api/libs/:id`

Get one library by id.

```bash
curl http://localhost:3003/api/libs/1
```

**Response** `200`

```json
{
  "data": { "...": "..." }
}
```

**Errors**

| Status | Reason |
|--------|--------|
| `400` | Invalid id |
| `404` | Not found |

---

### `POST /api/libs`

Create a library. Requires `passwd` = `LIB_CREATE_PASSWD`.

| Field | Required | Description |
|-------|----------|-------------|
| `passwd` | Yes | Create password |
| `name` | Yes | Library name |
| `description` | Yes | Description |
| `creator_email` | Yes | Creator email |
| `data_table` | No | Default `cantonese_corpus_all` |
| `item_index_collection` | No | Default `[]` |
| `user_data` | No | Default `[]` |

```bash
curl -X POST http://localhost:3003/api/libs \
  -H "Content-Type: application/json" \
  -d '{
    "passwd": "YOUR_LIB_CREATE_PASSWD",
    "name": "我的语料集",
    "description": "日常粤语",
    "creator_email": "alice@example.com",
    "data_table": "cantonese_corpus_all",
    "item_index_collection": [],
    "user_data": []
  }'
```

**Response** `201`

```json
{
  "data": { "...": "..." }
}
```

**Errors**

| Status | Reason |
|--------|--------|
| `401` | Invalid `passwd` |
| `400` | Missing required fields |
| `500` | Supabase not configured |

---

### `PATCH /api/libs/:id`

Update a library (partial). Requires `passwd` = `LIB_UPDATE_PASSWD`.

Updatable fields: `name`, `description`, `creator_email`, `data_table`, `item_index_collection`, `user_data`

```bash
curl -X PATCH http://localhost:3003/api/libs/1 \
  -H "Content-Type: application/json" \
  -d '{
    "passwd": "YOUR_LIB_UPDATE_PASSWD",
    "description": "更新后的描述",
    "data_table": "cantonese_corpus_all",
    "item_index_collection": [1, 2, 3]
  }'
```

**Response** `200`

```json
{
  "data": { "...": "..." }
}
```

**Errors**

| Status | Reason |
|--------|--------|
| `401` | Invalid `passwd` |
| `400` | No updatable fields |
| `404` | Not found |

---

### `DELETE /api/libs/:id`

Delete a library. Requires `passwd` = `LIB_DELETE_PASSWD`.

Pass `passwd` as query param or JSON body:

```bash
curl -X DELETE "http://localhost:3003/api/libs/1?passwd=YOUR_LIB_DELETE_PASSWD"

curl -X DELETE http://localhost:3003/api/libs/1 \
  -H "Content-Type: application/json" \
  -d '{"passwd":"YOUR_LIB_DELETE_PASSWD"}'
```

**Response** `200`

```json
{
  "success": true,
  "data": { "...": "..." }
}
```

**Errors**

| Status | Reason |
|--------|--------|
| `401` | Invalid `passwd` |
| `404` | Not found |

---

## Quick reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | API greeting |
| GET | `/health` | — | Health check |
| GET | `/docs` | — | API docs (Markdown) |
| GET | `/docs/html` | — | API docs (HTML) |
| POST | `/api/transcribe` | `DASHSCOPE_API_KEY` / `API_KEY` | Transcribe audio and return `lang` (`cantonese` / `mandarin` / `other`) plus `lang_source` |
| POST | `/api/trans_cantonese` | `DASHSCOPE_API_KEY` / `API_KEY` | Transcribe (legacy alias of `/api/transcribe`) |
| GET/POST | `/api/to_jyutping` | — | Text → Jyutping |
| POST | `/api/upload/get_pre_sign` | `ALI_OSS_ACCESS_KEY_*` | Issue a one-time OSS PostObject upload form (size-limited) |
| POST | `/api/upload/complete` | `ALI_OSS_ACCESS_KEY_*` | Verify the upload exists and return its URL |
| GET | `/api/libs` | — | List libraries |
| GET | `/api/libs/:id` | — | Get library |
| POST | `/api/libs` | `LIB_CREATE_PASSWD` | Create library |
| PATCH | `/api/libs/:id` | `LIB_UPDATE_PASSWD` | Update library |
| DELETE | `/api/libs/:id` | `LIB_DELETE_PASSWD` | Delete library |

---

## Local development

```bash
cd deno
deno task dev
```

Server runs at `http://localhost:3003` (see `deno/deno.json`).

Open **http://localhost:3003/docs/html** in a browser to read this documentation.
