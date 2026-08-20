import { test } from "node:test";
import assert from "node:assert/strict";
import { MockOtpProvider } from "../src/services/otp/MockOtpProvider.js";

test("MockOtpProvider.sendCode resolves without making a network call", async () => {
  const provider = new MockOtpProvider();
  await assert.doesNotReject(provider.sendCode({ phone: "+919876543210", code: "123456" }));
});

test("MockOtpProvider has a stable name used to gate dev-only responses", () => {
  const provider = new MockOtpProvider();
  assert.equal(provider.name, "mock");
});
