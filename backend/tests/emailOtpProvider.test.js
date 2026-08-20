import { test } from "node:test";
import assert from "node:assert/strict";
import { MockEmailOtpProvider } from "../src/services/emailOtp/MockEmailOtpProvider.js";

test("MockEmailOtpProvider.sendCode resolves without making a network call", async () => {
  const provider = new MockEmailOtpProvider();
  await assert.doesNotReject(provider.sendCode({ email: "test@example.com", code: "123456" }));
});

test("MockEmailOtpProvider has a stable name used to gate dev-only responses", () => {
  const provider = new MockEmailOtpProvider();
  assert.equal(provider.name, "mock");
});
