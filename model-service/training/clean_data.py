"""
Cleans the raw Kaggle "Give Me Some Credit" dataset.

Known data-quality issues in this dataset (verified against data/raw/cs-training.csv):
  - MonthlyIncome missing for ~20% of rows
  - NumberOfDependents missing for ~2.6% of rows
  - The three "days past due" columns contain sentinel values of 96/98,
    which are data-entry artifacts, not real late-payment counts
  - One row has age == 0
"""

import pandas as pd

PAST_DUE_COLUMNS = [
    "NumberOfTime30-59DaysPastDueNotWorse",
    "NumberOfTime60-89DaysPastDueNotWorse",
    "NumberOfTimes90DaysLate",
]
SENTINEL_CAP = 17  # next real value below the 96/98 sentinels


def load_raw(path: str) -> pd.DataFrame:
    return pd.read_csv(path, index_col=0)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df = df[df["age"] > 0]

    for col in PAST_DUE_COLUMNS:
        df[col] = df[col].clip(upper=SENTINEL_CAP)

    df["age_bracket"] = pd.cut(
        df["age"], bins=[0, 25, 35, 45, 55, 65, 120], labels=False
    )

    df["income_was_missing"] = df["MonthlyIncome"].isna().astype(int)
    df["MonthlyIncome"] = df.groupby("age_bracket")["MonthlyIncome"].transform(
        lambda s: s.fillna(s.median())
    )
    df["MonthlyIncome"] = df["MonthlyIncome"].fillna(df["MonthlyIncome"].median())

    df["dependents_was_missing"] = df["NumberOfDependents"].isna().astype(int)
    df["NumberOfDependents"] = df["NumberOfDependents"].fillna(
        df["NumberOfDependents"].median()
    )

    df = df.drop(columns=["age_bracket"])

    return df.reset_index(drop=True)


if __name__ == "__main__":
    raw = load_raw("data/raw/cs-training.csv")
    cleaned = clean(raw)
    print(f"Raw shape:     {raw.shape}")
    print(f"Cleaned shape: {cleaned.shape}")
    print(f"Remaining nulls:\n{cleaned.isnull().sum()[cleaned.isnull().sum() > 0]}")
