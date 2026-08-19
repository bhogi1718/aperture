"""
Phase 1 pipeline: raw Kaggle CSV -> cleaned + alt-data-enriched training set.

Run from the model-service directory:
    python training/build_dataset.py
"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from clean_data import clean, load_raw
from generate_alt_data import generate_alt_data

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_PATH = REPO_ROOT / "data" / "raw" / "cs-training.csv"
OUT_PATH = REPO_ROOT / "data" / "processed" / "aperture_training.csv"

ALT_DATA_COLUMNS = [
    "utility_payment_streak",
    "recharge_regularity_score",
    "gig_trip_volume",
    "gig_rating",
]


def sanity_check(df: pd.DataFrame) -> None:
    assert df.isnull().sum().sum() == 0, "unexpected nulls after cleaning"
    assert len(df) > 140_000, f"unexpectedly small dataset: {len(df)} rows"

    # Alt-data should read as incremental signal, not outperform real bureau
    # delinquency history (which correlates ~0.19-0.25 with the target).
    target_corr = df.corr(numeric_only=True)["SeriousDlqin2yrs"][ALT_DATA_COLUMNS]
    print("Alt-data correlation with target (want ~0.10-0.20, incremental not dominant):")
    print(target_corr)
    for col, corr in target_corr.items():
        assert abs(corr) < 0.25, f"{col} correlates too strongly with target ({corr:.3f}) -- outweighs real bureau signal"
        assert abs(corr) > 0.05, f"{col} shows ~no correlation with target ({corr:.3f}) -- check generation logic"


def main() -> None:
    print(f"Loading raw data from {RAW_PATH}")
    raw = load_raw(str(RAW_PATH))
    print(f"Raw shape: {raw.shape}")

    cleaned = clean(raw)
    print(f"Cleaned shape: {cleaned.shape}")

    enriched = generate_alt_data(cleaned)
    print(f"Enriched shape: {enriched.shape}")
    print(f"Columns: {list(enriched.columns)}")

    sanity_check(enriched)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    enriched.to_csv(OUT_PATH, index=False)
    print(f"\nWrote {len(enriched)} rows to {OUT_PATH}")


if __name__ == "__main__":
    main()
