import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { env } from "../../config/env.js";
import { buildExplanationPrompt } from "./explanationPrompt.js";

/**
 * Real AWS Bedrock calls. Only instantiated when LLM_PROVIDER=bedrock --
 * requires AWS_REGION and standard AWS credential resolution (env vars,
 * shared config file, or an execution role) to be in place.
 * @implements {import("./LLMProvider.js").LLMProvider}
 */
export class BedrockProvider {
  name = "bedrock";

  constructor() {
    this.client = new BedrockRuntimeClient({ region: env.awsRegion });
  }

  async generateExplanation({ probability, riskTier, topFeatures }) {
    const prompt = buildExplanationPrompt({ probability, riskTier, topFeatures });

    const command = new InvokeModelCommand({
      modelId: env.bedrockExplanationModelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const response = await this.client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const explanation = body.content?.[0]?.text?.trim() ?? "";

    return { explanation, modelId: env.bedrockExplanationModelId };
  }

  async embed(text) {
    const command = new InvokeModelCommand({
      modelId: env.bedrockEmbeddingModelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputText: text }),
    });

    const response = await this.client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));

    return { embedding: body.embedding, modelId: env.bedrockEmbeddingModelId };
  }
}
