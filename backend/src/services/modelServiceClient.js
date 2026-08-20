import { env } from "../config/env.js";

const MODEL_SERVICE_TIMEOUT_MS = 10_000;

class ModelServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ModelServiceError";
    this.status = status;
  }
}

async function postJson(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_SERVICE_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${env.modelServiceUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ModelServiceError(`Model service ${path} timed out after ${MODEL_SERVICE_TIMEOUT_MS}ms`, 504);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new ModelServiceError(`Model service ${path} failed (${response.status}): ${detail}`, response.status);
  }

  return response.json();
}

export function scoreApplicant(features) {
  return postJson("/score", features);
}

export function counterfactual(applicant, featureToPerturb, newValue) {
  return postJson("/counterfactual", {
    applicant,
    feature_to_perturb: featureToPerturb,
    new_value: newValue,
  });
}

export { ModelServiceError };
