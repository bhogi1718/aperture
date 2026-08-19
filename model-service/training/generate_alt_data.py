"""
Synthesizes "alternative data" columns for the NTC/thin-file persona:
gig-economy workers and small vendors who have UPI/bank transaction history
but no formal credit bureau file.

Design: each synthetic feature is drawn from a distribution whose center
shifts slightly based on SeriousDlqin2yrs (the bureau-file target), so the
alt-data is loosely predictive on its own -- plausible for a demo -- without
being a deterministic proxy for the label. Per-row noise dominates the
target-conditioned shift, so no single synthetic feature trivially leaks
the answer.

Columns added:
  utility_payment_streak     -- consecutive on-time utility payments (months), 0-36
  recharge_regularity_score  -- consistency of mobile recharge timing, 0-100
  gig_trip_volume            -- gig-platform trips in the last 30 days, 0-400
  gig_rating                 -- average platform rating, 1.0-5.0
"""

import numpy as np
import pandas as pd
from faker import Faker

RNG_SEED = 42


def generate_alt_data(df: pd.DataFrame, seed: int = RNG_SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    Faker.seed(seed)
    defaulted = df["SeriousDlqin2yrs"].to_numpy()

    # Good-standing applicants (defaulted=0) get a higher center; the gap is
    # kept narrow relative to spread so alt-data reads as incremental signal
    # (correlation ~0.10-0.20), not a stronger predictor than real bureau
    # delinquency history.
    streak_center = np.where(defaulted == 1, 14, 20)
    utility_payment_streak = rng.normal(streak_center, 10).clip(0, 36).round().astype(int)

    regularity_center = np.where(defaulted == 1, 62, 75)
    recharge_regularity_score = rng.normal(regularity_center, 18).clip(0, 100).round(1)

    trip_volume_center = np.where(defaulted == 1, 46, 58)
    gig_trip_volume = rng.gamma(shape=2.0, scale=trip_volume_center / 2.0).clip(0, 400).round().astype(int)

    rating_center = np.where(defaulted == 1, 4.35, 4.55)
    gig_rating = rng.normal(rating_center, 0.45).clip(1.0, 5.0).round(2)

    result = df.copy()
    result["utility_payment_streak"] = utility_payment_streak
    result["recharge_regularity_score"] = recharge_regularity_score
    result["gig_trip_volume"] = gig_trip_volume
    result["gig_rating"] = gig_rating
    return result


def generate_transaction_narrative(row: pd.Series, fake: Faker) -> str:
    """Short free-text narrative used later for Bedrock embedding / cohort search."""
    platforms = ["Ola", "Uber", "Swiggy", "Zomato", "Urban Company", "Rapido"]
    platform = fake.random_element(platforms)
    return (
        f"Gig worker on {platform}, {int(row['gig_trip_volume'])} trips in the last 30 days, "
        f"rating {row['gig_rating']:.1f}. Utility payments on-time streak of "
        f"{int(row['utility_payment_streak'])} months. Mobile recharge regularity score "
        f"{row['recharge_regularity_score']:.0f}/100."
    )


if __name__ == "__main__":
    from clean_data import load_raw, clean

    raw = load_raw("data/raw/cs-training.csv")
    cleaned = clean(raw)
    enriched = generate_alt_data(cleaned)

    print(enriched[
        ["SeriousDlqin2yrs", "utility_payment_streak", "recharge_regularity_score",
         "gig_trip_volume", "gig_rating"]
    ].groupby("SeriousDlqin2yrs").mean())

    fake = Faker()
    Faker.seed(RNG_SEED)
    sample = enriched.iloc[0]
    print("\nSample narrative:", generate_transaction_narrative(sample, fake))
