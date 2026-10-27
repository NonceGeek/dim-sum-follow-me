import { assertEquals } from "@std/assert";

// oss_upload.ts reads credentials at import time; HMAC needs a non-empty secret.
if (!Deno.env.get("ALI_OSS_ACCESS_KEY_SECRET")) {
  Deno.env.set("ALI_OSS_ACCESS_KEY_SECRET", "test-secret");
}
const {
  buildPostObjectForm,
  ossSignatureV1,
  publicObjectUrl,
  signUploadToken,
  verifyUploadToken,
} = await import("./oss_upload.ts");

Deno.test("ossSignatureV1 is base64 HMAC-SHA1", async () => {
  // Same output as: printf '<msg>' | openssl dgst -sha1 -hmac key -binary | base64
  assertEquals(
    await ossSignatureV1("key", "The quick brown fox jumps over the lazy dog"),
    "3nybhbi3iqa8ino29wqQcBydtNk=",
  );
});

Deno.test("publicObjectUrl percent-encodes each key segment", () => {
  assertEquals(
    publicObjectUrl("uploads/20261024/長老 1.wav"),
    "https://dimsum-fo.oss-cn-guangzhou.aliyuncs.com/uploads/20261024/%E9%95%B7%E8%80%81%201.wav",
  );
});

Deno.test("PostObject policy locks key, Content-Type and size range", async () => {
  const fields = await buildPostObjectForm({
    key: "uploads/20261024/a.m4a",
    contentType: "audio/m4a",
    expires: 1792829163,
    maxBytes: 5242880,
  });

  assertEquals(JSON.parse(atob(fields.policy)), {
    expiration: "2026-10-24T08:06:03.000Z",
    conditions: [
      { bucket: "dimsum-fo" },
      ["eq", "$key", "uploads/20261024/a.m4a"],
      ["eq", "$Content-Type", "audio/m4a"],
      ["eq", "$x-oss-forbid-overwrite", "true"],
      ["content-length-range", 1, 5242880],
      ["eq", "$success_action_status", "200"],
    ],
  });
  assertEquals(fields.key, "uploads/20261024/a.m4a");
  assertEquals(fields["Content-Type"], "audio/m4a");
  assertEquals(fields["x-oss-forbid-overwrite"], "true");
  assertEquals(fields.success_action_status, "200");
  assertEquals(
    fields.Signature,
    await ossSignatureV1(Deno.env.get("ALI_OSS_ACCESS_KEY_SECRET")!, fields.policy),
  );
});

Deno.test("upload_token is bound to its key and expiry", async () => {
  const key = "uploads/20261024/a.wav";
  const expires = Math.floor(Date.now() / 1000) + 600;
  const token = await signUploadToken(key, expires);

  assertEquals(await verifyUploadToken(key, token), true);
  assertEquals(await verifyUploadToken("uploads/20261024/b.wav", token), false);
  assertEquals(await verifyUploadToken(key, `${expires + 1}${token.slice(String(expires).length)}`), false);
  assertEquals(await verifyUploadToken(key, "garbage"), false);

  const longExpired = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
  assertEquals(await verifyUploadToken(key, await signUploadToken(key, longExpired)), false);
});
