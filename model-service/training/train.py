"""
Trains the Aperture credit-risk model on the cleaned + alt-data-enriched
dataset and persists everything the FastAPI service needs at inference time.

Run from the model-service directory:
    python training/train.py
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    precision_recall_curve,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = REPO_ROOT / "data" / "processed" / "aperture_training.csv"
ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"

TARGET_COL = "SeriousDlqin2yrs"
RANDOM_STATE = 42

# Manual review should catch a meaningful slice of applicants without
# flooding a human reviewer's queue -- 25% of the validation set is the
# working assumption for this prototype.
MANUAL_REVIEW_BAND_SIZE = 0.25


def load_features(path: Path) -> tuple[pd.DataFrame, pd.Series, list[str]]:
    df = pd.read_csv(path)
    feature_names = [c for c in df.columns if c != TARGET_COL]
    return df[feature_names], df[TARGET_COL], feature_names


def train_model(X_train: pd.DataFrame, y_train: pd.Series) -> XGBClassifier:
    neg, pos = (y_train == 0).sum(), (y_train == 1).sum()
    scale_pos_weight = neg / pos

    model = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        eval_metric="aucpr",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model


def evaluate(model: XGBClassifier, X_val: pd.DataFrame, y_val: pd.Series) -> dict:
    scores = model.predict_proba(X_val)[:, 1]
    auc = roc_auc_score(y_val, scores)
    ap = average_precision_score(y_val, scores)

    precision, recall, thresholds = precision_recall_curve(y_val, scores)
    # F1 at each threshold to report one balanced operating point alongside AUC/AP.
    f1 = 2 * precision * recall / (precision + recall + 1e-9)
    best_idx = np.argmax(f1[:-1])  # last precision/recall point has no matching threshold

    return {
        "roc_auc": float(auc),
        "average_precision": float(ap),
        "best_f1": float(f1[best_idx]),
        "best_f1_threshold": float(thresholds[best_idx]),
        "best_f1_precision": float(precision[best_idx]),
        "best_f1_recall": float(recall[best_idx]),
        "validation_rows": int(len(y_val)),
        "validation_positive_rate": float(y_val.mean()),
    }


def derive_risk_tiers(model: XGBClassifier, X_val: pd.DataFrame) -> dict:
    """
    Derives Approve / Manual Review / Reject thresholds from the validation
    score distribution rather than guessing fixed cutoffs. The reject
    threshold is set so the top decile of riskiest applicants (by score)
    lands in Reject; manual review takes the next MANUAL_REVIEW_BAND_SIZE
    slice; everyone else is auto-approved.
    """
    scores = model.predict_proba(X_val)[:, 1]
    reject_threshold = float(np.quantile(scores, 1 - 0.10))
    review_threshold = float(np.quantile(scores, 1 - 0.10 - MANUAL_REVIEW_BAND_SIZE))

    return {
        "approve_below": review_threshold,
        "manual_review_below": reject_threshold,
        "reject_at_or_above": reject_threshold,
        "score_distribution": {
            "p50": float(np.quantile(scores, 0.50)),
            "p75": float(np.quantile(scores, 0.75)),
            "p90": float(np.quantile(scores, 0.90)),
            "p99": float(np.quantile(scores, 0.99)),
        },
    }


def main() -> None:
    print(f"Loading {DATA_PATH}")
    X, y, feature_names = load_features(DATA_PATH)
    print(f"Features ({len(feature_names)}): {feature_names}")

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )
    print(f"Train: {len(X_train)} rows | Validation: {len(X_val)} rows")

    model = train_model(X_train, y_train)

    metrics = evaluate(model, X_val, y_val)
    print("\nValidation metrics:")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    risk_tiers = derive_risk_tiers(model, X_val)
    print("\nRisk tier thresholds (derived from validation score distribution):")
    print(json.dumps(risk_tiers, indent=2))

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, ARTIFACTS_DIR / "model.joblib")
    (ARTIFACTS_DIR / "feature_names.json").write_text(json.dumps(feature_names, indent=2))
    (ARTIFACTS_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (ARTIFACTS_DIR / "risk_tiers.json").write_text(json.dumps(risk_tiers, indent=2))

    print(f"\nArtifacts written to {ARTIFACTS_DIR}")


if __name__ == "__main__":
    main()
