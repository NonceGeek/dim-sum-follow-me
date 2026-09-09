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
| `API_KEY` | For transcription | OpenRouter API key |
| `OPENROUTER_TRANSCRIPTION_MODEL` | No | Default: `qwen/qwen3-asr-flash-2026-02-10` (OpenRouter STT) |
| `OPENROUTER_HTTP_REFERER` | No | Optional OpenRouter `HTTP-Referer` header |
| `OPENROUTER_SITE_TITLE` | No | Optional OpenRouter `X-OpenRouter-Title` header |
| `SUPABASE_URL` | For `/api/libs` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For `/api/libs` | Supabase service-role key |
| `LIB_CREATE_PASSWD` | For `POST /api/libs` | Create password |
| `LIB_UPDATE_PASSWD` | For `PATCH /api/libs/:id` | Update password |
| `LIB_DELETE_PASSWD` | For `DELETE /api/libs/:id` | Delete password |
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

The server accepts your upload as `multipart/form-data`, reads the audio into memory (max **25 MB**), and runs ASR **without** a forced language hint so the model can auto-detect the spoken variety. This in-memory path works on Deno Deploy (no temp files).

Legacy alias: `POST /api/trans_cantonese` (same handler).

**Content-Type:** `multipart/form-data`

| Field | Required | Description |
|-------|----------|-------------|
| `file` | Yes | Audio file. Supported extensions / formats: `wav`, `mp3`, `m4a`, `flac`, `ogg`, `aac`, `aiff`, `webm`, `pcm16`, `pcm24` |
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

**Default models:** DashScope `DASHSCOPE_ASR_MODEL` (default `qwen3-asr-flash`); OpenRouter fallback `OPENROUTER_TRANSCRIPTION_MODEL` (default `qwen/qwen3-asr-flash-2026-02-10`).

**`task=translate`:** The audio is transcribed first (and `lang` is taken from that step), then translated to English via chat completions. `text` is the English translation; `lang` is still the **spoken** language of the audio.

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

Translate to English:

```bash
curl --noproxy '*' -X POST http://127.0.0.1:3003/api/transcribe \
  -F "file=@main/public/audio/yue1.m4a" \
  -F "task=translate" \
  -F "prompt=Casual Cantonese conversation"
```

**Response** `200`

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
| `400` | `{ "error": "multipart field 'file' is required" }` | Missing `file` |
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
