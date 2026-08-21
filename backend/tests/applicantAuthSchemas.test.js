import { test } from "node:test";
import assert from "node:assert/strict";
import { requestOtpSchema, verifyOtpSchema } from "../src/routes/applicantAuth.js";

test("requestOtpSchema accepts a valid email address", () => {
  const result = requestOtpSchema.safeParse({ email: "priya@example.com" });
  assert.equal(result.success, true);
});

test("requestOtpSchema lowercases and trims the email", () => {
  const result = requestOtpSchema.safeParse({ email: "  Priya@Example.com  " });
  assert.equal(result.success, true);
  assert.equal(result.data.email, "priya@example.com");
});

test("requestOtpSchema rejects a malformed email", () => {
  const result = requestOtpSchema.safeParse({ email: "not-an-email" });
  assert.equal(result.success, false);
});

test("verifyOtpSchema accepts a valid 6-digit code", () => {
  const result = verifyOtpSchema.safeParse({ email: "priya@example.com", code: "123456" });
  assert.equal(result.success, true);
});

test("verifyOtpSchema rejects a code that is not 6 digits", () => {
  const result = verifyOtpSchema.safeParse({ email: "priya@example.com", code: "123" });
  assert.equal(result.success, false);
});

test("verifyOtpSchema rejects a non-numeric code", () => {
  const result = verifyOtpSchema.safeParse({ email: "priya@example.com", code: "abcdef" });
  assert.equal(result.success, false);
});
