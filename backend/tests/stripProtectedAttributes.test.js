import { test } from "node:test";
import assert from "node:assert/strict";
import { stripProtectedAttributes } from "../src/guardrails/stripProtectedAttributes.js";

test("returns empty result for null/undefined input", () => {
  assert.deepEqual(stripProtectedAttributes(undefined), {
    text: "",
    redactionCount: 0,
    redactedCategories: [],
  });
});

test("leaves neutral financial text untouched", () => {
  const text = "Gig worker on Ola, 45 trips in the last 30 days, rating 4.6.";
  const result = stripProtectedAttributes(text);
  assert.equal(result.text, text);
  assert.equal(result.redactionCount, 0);
});

test("redacts gender terms", () => {
  const result = stripProtectedAttributes("The applicant is a woman who works full time.");
  assert.equal(result.text, "The applicant is a [REDACTED] who works full time.");
  assert.equal(result.redactionCount, 1);
  assert.deepEqual(result.redactedCategories, ["gender"]);
});

test("redacts religion terms", () => {
  const result = stripProtectedAttributes("He is Hindu and works as a delivery partner.");
  assert.match(result.text, /\[REDACTED\] and works as a delivery partner\./);
  assert.equal(result.redactionCount, 1);
});

test("redacts caste terms", () => {
  const result = stripProtectedAttributes("Applicant identifies as OBC.");
  assert.ok(result.text.includes("[REDACTED]"));
  assert.equal(result.redactionCount, 1);
});

test("redacts multiple categories in one pass", () => {
  const result = stripProtectedAttributes("A married Muslim woman applied for credit.");
  assert.equal(result.redactionCount, 3);
  assert.ok(result.redactedCategories.includes("gender"));
  assert.ok(result.redactedCategories.includes("religion"));
  assert.ok(result.redactedCategories.includes("maritalStatus"));
  assert.ok(!result.text.match(/married|muslim|woman/i));
});

test("is case-insensitive", () => {
  const result = stripProtectedAttributes("HINDU applicant with strong payment history.");
  assert.equal(result.redactionCount, 1);
});
