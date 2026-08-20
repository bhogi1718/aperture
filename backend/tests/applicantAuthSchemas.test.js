import { test } from "node:test";
import assert from "node:assert/strict";
import { requestOtpSchema, verifyOtpSchema } from "../src/routes/applicantAuth.js";

test("requestOtpSchema accepts a valid international phone number", () => {
  const result = requestOtpSchema.safeParse({ phone: "+919876543210", name: "Priya Sharma" });
  assert.equal(result.success, true);
});

test("requestOtpSchema rejects a phone number missing the + prefix", () => {
  const result = requestOtpSchema.safeParse({ phone: "919876543210", name: "Priya Sharma" });
  assert.equal(result.success, false);
});

test("requestOtpSchema rejects a phone number that is too short", () => {
  const result = requestOtpSchema.safeParse({ phone: "+9198", name: "Priya Sharma" });
  assert.equal(result.success, false);
});

test("requestOtpSchema rejects an empty name", () => {
  const result = requestOtpSchema.safeParse({ phone: "+919876543210", name: "" });
  assert.equal(result.success, false);
});

test("requestOtpSchema rejects a name over 100 characters", () => {
  const result = requestOtpSchema.safeParse({ phone: "+919876543210", name: "a".repeat(101) });
  assert.equal(result.success, false);
});

test("verifyOtpSchema accepts a valid 6-digit code", () => {
  const result = verifyOtpSchema.safeParse({ phone: "+919876543210", name: "Priya Sharma", code: "123456" });
  assert.equal(result.success, true);
});

test("verifyOtpSchema rejects a code that is not 6 digits", () => {
  const result = verifyOtpSchema.safeParse({ phone: "+919876543210", name: "Priya Sharma", code: "123" });
  assert.equal(result.success, false);
});

test("verifyOtpSchema rejects a non-numeric code", () => {
  const result = verifyOtpSchema.safeParse({ phone: "+919876543210", name: "Priya Sharma", code: "abcdef" });
  assert.equal(result.success, false);
});
