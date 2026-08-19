import { env } from "../../config/env.js";
import { MockProvider } from "./MockProvider.js";
import { BedrockProvider } from "./BedrockProvider.js";

let provider;

/** @returns {import("./LLMProvider.js").LLMProvider} */
export function getLLMProvider() {
  if (provider) return provider;

  if (env.llmProvider === "bedrock") {
    provider = new BedrockProvider();
  } else {
    provider = new MockProvider();
  }

  return provider;
}
