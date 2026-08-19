"""
Loads the trained model once and exposes scoring + SHAP + counterfactual
logic used by the API routes.
"""

import json
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
import shap

ARTIFACTS_DIR = Path(__file__).resolve().parents[2] / "artifacts"


class RiskTiers:
    def __init__(self, approve_below: float, manual_review_below: float):
        self.approve_below = approve_below
        self.manual_review_below = manual_review_below

    def classify(self, score: float) -> str:
        if score < self.approve_below:
            return "Approve"
        if score < self.manual_review_below:
            return "Manual Review"
        return "Reject"


class ScoringService:
    def __init__(self, artifacts_dir: Path = ARTIFACTS_DIR):
        self.model = joblib.load(artifacts_dir / "model.joblib")
        self.feature_names: list[str] = json.loads(
            (artifacts_dir / "feature_names.json").read_text()
        )
        risk_tiers = json.loads((artifacts_dir / "risk_tiers.json").read_text())
        self.risk_tiers = RiskTiers(
            approve_below=risk_tiers["approve_below"],
            manual_review_below=risk_tiers["manual_review_below"],
        )
        self.explainer = shap.TreeExplainer(self.model)

    def _to_frame(self, features: dict) -> pd.DataFrame:
        missing = set(self.feature_names) - set(features.keys())
        if missing:
            raise ValueError(f"Missing required features: {sorted(missing)}")
        return pd.DataFrame([{name: features[name] for name in self.feature_names}])

    def score(self, features: dict) -> dict:
        X = self._to_frame(features)
        probability = float(self.model.predict_proba(X)[0, 1])
        tier = self.risk_tiers.classify(probability)

        shap_values = self.explainer.shap_values(X)[0]
        contributions = sorted(
            (
                {"feature": name, "shap_value": float(value), "feature_value": features[name]}
                for name, value in zip(self.feature_names, shap_values)
            ),
            key=lambda c: abs(c["shap_value"]),
            reverse=True,
        )

        return {
            "probability_of_default": probability,
            "risk_tier": tier,
            "top_contributing_features": contributions[:5],
        }

    def counterfactual(self, features: dict, feature_to_perturb: str, new_value: float) -> dict:
        if feature_to_perturb not in self.feature_names:
            raise ValueError(f"Unknown feature: {feature_to_perturb}")

        original = self.score(features)

        perturbed_features = dict(features)
        perturbed_features[feature_to_perturb] = new_value
        perturbed = self.score(perturbed_features)

        return {
            "feature_perturbed": feature_to_perturb,
            "original_value": features[feature_to_perturb],
            "new_value": new_value,
            "original_probability": original["probability_of_default"],
            "original_tier": original["risk_tier"],
            "new_probability": perturbed["probability_of_default"],
            "new_tier": perturbed["risk_tier"],
            "tier_changed": original["risk_tier"] != perturbed["risk_tier"],
        }


_service: Optional[ScoringService] = None


def get_scoring_service() -> ScoringService:
    global _service
    if _service is None:
        _service = ScoringService()
    return _service
