import { env } from "../config/env.js";

export async function scoreApplicant(features) {
  const response = await fetch(`${env.modelServiceUrl}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(features),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Model service /score failed (${response.status}): ${detail}`);
  }

  return response.json();
}

export async function counterfactual(applicant, featureToPerturb, newValue) {
  const response = await fetch(`${env.modelServiceUrl}/counterfactual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant,
      feature_to_perturb: featureToPerturb,
      new_value: newValue,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Model service /counterfactual failed (${response.status}): ${detail}`);
  }

  return response.json();
}
