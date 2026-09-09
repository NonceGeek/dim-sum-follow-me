/**
 * Cantonese shadowing game API server.
 *
 * Environment variables:
 *   DASHSCOPE_API_KEY               – DashScope API key (primary for transcription)
 *   DASHSCOPE_ASR_MODEL            – optional, default qwen3-asr-flash
 *   API_KEY                         – OpenRouter API key (fallback for transcription)
 *   OPENROUTER_TRANSCRIPTION_MODEL  – optional, default qwen/qwen3-asr-flash-2026-02-10
 *   OPENROUTER_HTTP_REFERER         – optional OpenRouter HTTP-Referer header
 *   OPENROUTER_SITE_TITLE           – optional OpenRouter X-OpenRouter-Title header
 *   SUPABASE_URL                    – Supabase project URL (required for /api/libs CRUD)
 *   SUPABASE_SERVICE_ROLE_KEY       – Supabase service-role key (required for /api/libs CRUD)
 *   LIB_CREATE_PASSWD               – password for POST /api/libs
 *   LIB_UPDATE_PASSWD               – password for PATCH /api/libs/:id
 *   LIB_DELETE_PASSWD               – password for DELETE /api/libs/:id
 *   PORT                            – optional, default 3003
 */

import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { Application, Context, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { transcribeCantoneseAudio } from "./audio_utils.ts";
import { CSS, render } from "@deno/gfm";
import {
  createLib,
  deleteLib,
  getLib,
  initSupabase,
  listLibs,
  updateLib,
} from "./lib_crud.ts";
import { handleToJyutping } from "./jyutping_utils.ts";

const DASHSCOPE_API_KEY = Deno.env.get("DASHSCOPE_API_KEY") || "";
const DASHSCOPE_ASR_MODEL =
  Deno.env.get("DASHSCOPE_ASR_MODEL") || "qwen3-asr-flash";
const OPENROUTER_KEY = Deno.env.get("API_KEY") || "";
const TRANSCRIPTION_MODEL =
  Deno.env.get("OPENROUTER_TRANSCRIPTION_MODEL") || "qwen/qwen3-asr-flash-2026-02-10";
// "openai/gpt-4o-mini-transcribe"
const OPENROUTER_HTTP_REFERER = Deno.env.get("OPENROUTER_HTTP_REFERER") || "";
const OPENROUTER_SITE_TITLE = Deno.env.get("OPENROUTER_SITE_TITLE") || "";

initSupabase();

const router = new Router();

async function handleTranscribe(context: Context) {
  if (!DASHSCOPE_API_KEY && !OPENROUTER_KEY) {
    context.response.status = 500;
    context.response.body = { error: "Missing DASHSCOPE_API_KEY or API_KEY" };
    return;
  }

  try {
    const body = context.request.body({ type: "form-data" });
    // Oak default maxSize is 0 → all files go to Deno.makeTempDir() (fails on Deno Deploy: NotSupported: tmpdir).
    // Set maxSize === maxFileSize so the whole upload stays in FormDataFile.content (in-memory only).
    const maxAudioBytes = 25 * 1024 * 1024; // 25MB
    const form = await body.value.read({
      maxFileSize: maxAudioBytes,
      maxSize: maxAudioBytes,
    });

    const fileField = form.files?.find((f) => f.name === "file") ?? form.files?.[0];
    if (!fileField) {
      context.response.status = 400;
      context.response.body = { error: "multipart field 'file' is required" };
      return;
    }

    // Oak may provide either a temporary filepath or raw content.
    let fileBytes: Uint8Array;
    if (fileField.content) {
      fileBytes = fileField.content;
    } else if (fileField.filename) {
      const path =
        (fileField as unknown as { tempfile?: string }).tempfile ?? fileField.filename;
      fileBytes = await Deno.readFile(path);
    } else {
      context.response.status = 400;
      context.response.body = { error: "could not read uploaded file" };
      return;
    }

    const filename = fileField.originalName ?? "audio";
    const mimeType = fileField.contentType ?? "application/octet-stream";
    const arrayBuffer: ArrayBuffer = Uint8Array.from(fileBytes).buffer;
    const file = new File([arrayBuffer], filename, { type: mimeType });

    // const languageRaw = form.fields?.language ?? "yue";
    const prompt = form.fields?.prompt;
    const taskRaw = form.fields?.task;
    const task = taskRaw === "translate" ? "translate" : "transcribe";
    // The line the speaker was asked to read. Optional, but without it a `zh`
    // annotation from the ASR cannot be narrowed to Cantonese vs Mandarin.
    const expected = form.fields?.expected;

    const result = await transcribeCantoneseAudio(
      {
        dashScopeApiKey: DASHSCOPE_API_KEY,
        dashScopeModel: DASHSCOPE_ASR_MODEL,
        apiKey: OPENROUTER_KEY,
        model: TRANSCRIPTION_MODEL,
        httpReferer: OPENROUTER_HTTP_REFERER,
        siteTitle: OPENROUTER_SITE_TITLE,
      },
      {
        file,
        filename,
        language: "auto",
        expected: expected ? String(expected) : undefined,
        prompt: prompt ? String(prompt) : undefined,
        task,
      },
    );

    context.response.body = {
      text: result.text,
      lang: result.lang,
      lang_source: result.langSource,
      raw_language: result.rawLanguage ?? null,
    };
  } catch (err) {
    console.error("transcribe error:", err);
    context.response.status = 500;
    context.response.body = { error: String(err) };
  }
}

router
  // curl http://localhost:3003/
  .get("/", (context) => {
    context.response.body = "Dim Sum Shadowing Game API";
  })
  // curl http://localhost:3003/health
  .get("/health", (context) => {
    context.response.body = {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  })
  // curl http://localhost:3003/docs
  .get("/docs", async (context) => {
    try {
      const readmeText = await Deno.readTextFile(
        new URL("./api_doc.md", import.meta.url),
      );
      context.response.headers.set("Content-Type", "text/markdown; charset=utf-8");
      context.response.body = readmeText;
    } catch (err) {
      console.error("Error reading README:", err);
      context.response.status = 500;
      context.response.body = { error: "Could not load documentation" };
    }
  })
  .get("/docs/html", async (context) => {
    try {
      // Read README.md file
      const readmeText = await Deno.readTextFile(
        new URL("./api_doc.md", import.meta.url),
      );

      // Render markdown to HTML with GFM styles
      const body = render(readmeText);

      // Create complete HTML document with GFM CSS
      const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dim Sum Shadowing Game API Documentation</title>
    <style>
      ${CSS}
      body {
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
      }
    </style>
  </head>
  <body>
  ${body}
  </body>
  </html>`;

      // Set response headers for HTML
      context.response.headers.set("Content-Type", "text/html; charset=utf-8");
      context.response.body = html;
    } catch (err) {
      console.error("Error reading README:", err);
      context.response.status = 500;
      context.response.body = { error: "Could not load documentation" };
    }
  })
  /* From repo root (bypass http_proxy for localhost):
     curl --noproxy '*' -X POST http://127.0.0.1:3003/api/transcribe \
       -F "file=@main/public/audio/yue1.m4a" \
       -F "task=transcribe"
  */
  // Cantonese audio via OpenRouter STT (/v1/audio/transcriptions); translate uses chat completions fallback.
  // Request: multipart/form-data with:
  // - file: audio file (required)
  // - expected: optional target line, disambiguates Cantonese vs Mandarin
  // - prompt: optional
  // - task: optional ("transcribe" | "translate")
  // Response: { text, lang, lang_source, raw_language } where lang is
  // "cantonese" | "mandarin" | "other" and lang_source says how it was decided.
  .post("/api/transcribe", handleTranscribe)
  // legacy alias (older deployments / WaveRecorder)
  .post("/api/trans_cantonese", handleTranscribe)
  // curl http://localhost:3003/api/libs
  .get("/api/libs", listLibs)
  // curl http://localhost:3003/api/libs/1
  .get("/api/libs/:id", getLib)
  /*
  curl -X POST http://localhost:3003/api/libs \
  -H "Content-Type: application/json" \
  -d '{"passwd":"YOUR_LIB_CREATE_PASSWD","name":"我的语料集","description":"日常粤语","creator_email":"alice@example.com","data_table":"cantonese_corpus_all","item_index_collection":[],"user_data":[]}'
  */
  .post("/api/libs", createLib)
  /*
  curl -X PATCH http://localhost:3003/api/libs/1 \
  -H "Content-Type: application/json" \
  -d '{"passwd":"YOUR_LIB_UPDATE_PASSWD","name":"我的语料集","description":"日常粤语","creator_email":"alice@example.com","data_table":"cantonese_corpus_all","item_index_collection":[],"user_data":[]}'
  */
  .patch("/api/libs/:id", updateLib)
  /*
  curl -X DELETE http://localhost:3003/api/libs/1 \
  -H "Content-Type: application/json" \
  -d '{"passwd":"YOUR_LIB_DELETE_PASSWD"}'
  */
  .delete("/api/libs/:id", deleteLib)
  /*
  curl -X POST http://localhost:3003/api/to_jyutping \
    -H "Content-Type: application/json" \
    -d '{"text":"长老"}'

  curl "http://localhost:3003/api/to_jyutping?text=长老"
  */
  .get("/api/to_jyutping", handleToJyutping)
  .post("/api/to_jyutping", handleToJyutping);

const app = new Application();

app.use(async (context, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Error:", err);
    context.response.status = 500;
    context.response.body = {
      success: false,
      error: "Internal server error",
    };
  }
});

app.use(async (context, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${context.request.method} ${context.request.url} - ${ms}ms`);
});

app.use(oakCors());
app.use(router.routes());

const port = Number(Deno.env.get("PORT") || "3003");

const isDeploy =
  Boolean(Deno.env.get("DENO_DEPLOYMENT_ID")) || Boolean(Deno.env.get("DENO_REGION"));

if (import.meta.main) {
  if (isDeploy) {
    console.info("Server started (Deno Deploy)");
    Deno.serve({
      handler: async (req) => {
        const resp = await app.handle(req);
        return resp ?? new Response("Not Found", { status: 404 });
      },
    });
  } else {
    console.info(`
  CORS-enabled web server listening on port ${port}

  Visit: http://localhost:${port}
  `);
    await app.listen({ port });
  }
}
