"""
Model comparison: is XGBoost actually the best choice for Aperture's
scoring model, or just a reasonable default?

Single-level 5-fold stratified cross-validation with a real hyperparameter
grid search per candidate. Faster than nested CV (which multiplies outer
folds x inner folds x grid size) at the cost of a small optimistic bias --
the hyperparameters are selected using the same folds the reported score
comes from. Still far more rigorous than a single 80/20 split.

Candidates:
  - Logistic regression (linear baseline)
  - Random forest (bagged trees, no boosting)
  - XGBoost (current production choice)
  - LightGBM (the alternative named in the original project plan)

Optimizes for average precision (PR-AUC), the metric that matters most
under this dataset's 93.3%/6.7% class imbalance.

Run from the model-service directory:
    python training/compare_models.py
"""

import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = REPO_ROOT / "data" / "processed" / "aperture_training.csv"
ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"

TARGET_COL = "SeriousDlqin2yrs"
RANDOM_STATE = 42
CV_FOLDS = 5


def load_features():
    df = pd.read_csv(DATA_PATH)
    feature_names = [c for c in df.columns if c != TARGET_COL]
    return df[feature_names], df[TARGET_COL], feature_names


def run_grid_search(name, estimator, param_grid, X, y, cv, extra_steps=None):
    print(f"\n{'='*70}\n{name}\n{'='*70}")
    start = time.time()

    if extra_steps:
        pipeline = Pipeline(extra_steps + [("model", estimator)])
        grid = {f"model__{k}": v for k, v in param_grid.items()}
    else:
        pipeline = estimator
        grid = param_grid

    search = GridSearchCV(
        pipeline, grid, scoring="average_precision", cv=cv, n_jobs=-1, verbose=1,
    )
    search.fit(X, y)

    elapsed = time.time() - start
    print(f"Best params: {search.best_params_}")
    print(f"Best CV average_precision: {search.best_score_:.4f}")
    print(f"Grid search took {elapsed:.1f}s")

    auc_scores = cross_val_score(search.best_estimator_, X, y, scoring="roc_auc", cv=cv, n_jobs=-1)
    print(f"Best estimator CV ROC AUC: {auc_scores.mean():.4f} (+/- {auc_scores.std():.4f})")

    return {
        "name": name,
        "best_params": {k: (float(v) if isinstance(v, (np.integer, np.floating)) else v) for k, v in search.best_params_.items()},
        "cv_average_precision_mean": float(search.best_score_),
        "cv_roc_auc_mean": float(auc_scores.mean()),
        "cv_roc_auc_std": float(auc_scores.std()),
        "elapsed_seconds": round(elapsed, 1),
    }


def main():
    print(f"Loading {DATA_PATH}")
    X, y, feature_names = load_features()
    print(f"Rows: {len(X)}, features: {len(feature_names)}, positive rate: {y.mean():.4f}")

    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    neg, pos = (y == 0).sum(), (y == 1).sum()
    scale_pos_weight = neg / pos

    results = []

    results.append(run_grid_search(
        "Logistic Regression (baseline)",
        LogisticRegression(class_weight="balanced", max_iter=2000, random_state=RANDOM_STATE),
        {"C": [0.01, 0.1, 1.0, 10.0]},
        X, y, cv,
        extra_steps=[("scaler", StandardScaler())],
    ))

    results.append(run_grid_search(
        "Random Forest",
        RandomForestClassifier(class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1),
        {
            "n_estimators": [200, 400],
            "max_depth": [4, 8, None],
            "min_samples_leaf": [1, 5],
        },
        X, y, cv,
    ))

    results.append(run_grid_search(
        "XGBoost (current production model)",
        XGBClassifier(
            scale_pos_weight=scale_pos_weight, eval_metric="aucpr",
            random_state=RANDOM_STATE, n_jobs=-1,
        ),
        {
            "n_estimators": [200, 300, 500],
            "max_depth": [3, 4, 6],
            "learning_rate": [0.03, 0.05, 0.1],
            "subsample": [0.8],
            "colsample_bytree": [0.8],
        },
        X, y, cv,
    ))

    results.append(run_grid_search(
        "LightGBM",
        LGBMClassifier(
            scale_pos_weight=scale_pos_weight, random_state=RANDOM_STATE,
            n_jobs=-1, verbosity=-1,
        ),
        {
            "n_estimators": [200, 300, 500],
            "max_depth": [3, 4, 6, -1],
            "learning_rate": [0.03, 0.05, 0.1],
            "subsample": [0.8],
            "colsample_bytree": [0.8],
        },
        X, y, cv,
    ))

    print(f"\n{'='*70}\nSUMMARY (sorted by CV average precision)\n{'='*70}")
    results_sorted = sorted(results, key=lambda r: r["cv_average_precision_mean"], reverse=True)
    for r in results_sorted:
        print(f"{r['name']:45s} AP={r['cv_average_precision_mean']:.4f}  AUC={r['cv_roc_auc_mean']:.4f} (+/-{r['cv_roc_auc_std']:.4f})  [{r['elapsed_seconds']}s]")

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ARTIFACTS_DIR / "model_comparison.json"
    out_path.write_text(json.dumps(results_sorted, indent=2))
    print(f"\nFull results written to {out_path}")


if __name__ == "__main__":
    main()
