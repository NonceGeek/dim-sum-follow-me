import { assertEquals } from "@std/assert";
import {
  applySimplifiedMandarinOverride,
  classifyLanguageCode,
  classifySpeechLangFromText,
  dashScopeLanguageHints,
  decideLangByExpected,
  inferAudioFormat,
  isSimplifiedChinese,
  rawLanguageFromAsrPayload,
  resolveAmbiguousLang,
  sttLanguageHint,
  textSimilarity,
} from "./audio_utils.ts";

Deno.test("inferAudioFormat from extension", () => {
  assertEquals(inferAudioFormat("recording.wav", ""), "wav");
  assertEquals(inferAudioFormat("recording.m4a", ""), "m4a");
});

Deno.test("inferAudioFormat from mime type", () => {
  assertEquals(inferAudioFormat("audio", "audio/wav"), "wav");
  assertEquals(inferAudioFormat("audio", "audio/webm"), "webm");
});

Deno.test("sttLanguageHint maps Cantonese to zh", () => {
  assertEquals(sttLanguageHint("yue"), "zh");
  assertEquals(sttLanguageHint("zh-yue"), "zh");
  assertEquals(sttLanguageHint("auto"), undefined);
});

Deno.test("dashScopeLanguageHints keeps Cantonese and biases auto towards yue", () => {
  assertEquals(dashScopeLanguageHints("yue"), ["yue"]);
  assertEquals(dashScopeLanguageHints("cmn"), ["zh"]);
  assertEquals(dashScopeLanguageHints("auto"), ["yue", "zh"]);
  assertEquals(dashScopeLanguageHints("zh"), ["yue", "zh"]);
  assertEquals(dashScopeLanguageHints("en"), ["en"]);
});

Deno.test("classifyLanguageCode treats zh as the ambiguous Chinese family", () => {
  assertEquals(classifyLanguageCode("yue"), "cantonese");
  assertEquals(classifyLanguageCode("zh-yue"), "cantonese");
  assertEquals(classifyLanguageCode("zh-HK"), "cantonese");
  assertEquals(classifyLanguageCode("zh"), "chinese");
  assertEquals(classifyLanguageCode("zh-CN"), "chinese");
  assertEquals(classifyLanguageCode("cmn"), "mandarin");
  assertEquals(classifyLanguageCode("en"), "other");
  assertEquals(classifyLanguageCode("ja"), "other");
  assertEquals(classifyLanguageCode(""), undefined);
  assertEquals(classifyLanguageCode("auto"), undefined);
});

Deno.test("classifySpeechLangFromText uses markers and script", () => {
  assertEquals(classifySpeechLangFromText("我唔食辣嘢"), "cantonese");
  assertEquals(classifySpeechLangFromText("我不吃辣的东西"), "mandarin");
  assertEquals(classifySpeechLangFromText("罗浮山下四时春"), "mandarin");
  assertEquals(classifySpeechLangFromText("羅浮山下四時春"), "cantonese");
  assertEquals(classifySpeechLangFromText("I don't eat spicy food"), "other");
});

Deno.test("resolveAmbiguousLang uses Simplified as Mandarin signal", () => {
  assertEquals(resolveAmbiguousLang("我唔食辣嘢"), {
    lang: "cantonese",
    langSource: "text",
  });
  // Classical poetry in Traditional stays lenient (shared/traditional forms).
  assertEquals(resolveAmbiguousLang("羅浮山下四時春"), {
    lang: "cantonese",
    langSource: "unknown",
  });
  // Simplified transcript → Mandarin (Cantonese ASR emits Traditional).
  assertEquals(resolveAmbiguousLang("罗浮山下四时春"), {
    lang: "mandarin",
    langSource: "text",
  });
  assertEquals(resolveAmbiguousLang("我不吃辣的东西"), {
    lang: "mandarin",
    langSource: "text",
  });
  assertEquals(resolveAmbiguousLang("I don't eat spicy food"), {
    lang: "other",
    langSource: "text",
  });
});

Deno.test("isSimplifiedChinese detects Simplified-only forms", () => {
  assertEquals(isSimplifiedChinese("罗浮山下四时春"), true);
  assertEquals(isSimplifiedChinese("羅浮山下四時春"), false);
  assertEquals(isSimplifiedChinese("人山春"), false);
  assertEquals(isSimplifiedChinese("hello"), false);
  assertEquals(
    applySimplifiedMandarinOverride({
      text: "罗浮山下四时春",
      lang: "cantonese",
      langSource: "asr",
      rawLanguage: "yue",
    }),
    {
      text: "罗浮山下四时春",
      lang: "mandarin",
      langSource: "text",
      rawLanguage: "yue",
    },
  );
});

Deno.test("rawLanguageFromAsrPayload reads nested annotations", () => {
  assertEquals(
    rawLanguageFromAsrPayload({
      choices: [{ message: { annotations: [{ language: "yue" }] } }],
    }),
    "yue",
  );
  assertEquals(rawLanguageFromAsrPayload({ language: " zh " }), "zh");
  assertEquals(rawLanguageFromAsrPayload({ choices: [{}] }), undefined);
});

Deno.test("textSimilarity ignores punctuation", () => {
  assertEquals(textSimilarity("羅浮山下四時春，盧橘楊梅次第新。", "羅浮山下四時春盧橘楊梅次第新"), 100);
  assertEquals(textSimilarity("", "abc"), 0);
});

Deno.test("decideLangByExpected picks the closer decode", () => {
  const expected = "羅浮山下四時春，盧橘楊梅次第新。";
  assertEquals(
    decideLangByExpected(expected, "羅浮山下四時春，蘆居羊沒次弟心。", expected),
    { lang: "cantonese", langSource: "expected-match" },
  );
  assertEquals(
    decideLangByExpected(expected, expected, "羅浮山下四時春，蘆居羊沒次弟心。"),
    { lang: "mandarin", langSource: "expected-match" },
  );
  // Both decodes agree, so there is no evidence either way.
  assertEquals(decideLangByExpected(expected, expected, expected), undefined);
  assertEquals(decideLangByExpected("", "a", "b"), undefined);
});
