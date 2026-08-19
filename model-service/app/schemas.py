"""Pydantic request/response models for the model-service API."""

from pydantic import BaseModel, Field


class ApplicantFeatures(BaseModel):
    RevolvingUtilizationOfUnsecuredLines: float = Field(ge=0)
    age: int = Field(ge=18, le=110)
    NumberOfTime30to59DaysPastDueNotWorse: int = Field(ge=0, alias="NumberOfTime30-59DaysPastDueNotWorse")
    DebtRatio: float = Field(ge=0)
    MonthlyIncome: float = Field(ge=0)
    NumberOfOpenCreditLinesAndLoans: int = Field(ge=0)
    NumberOfTimes90DaysLate: int = Field(ge=0)
    NumberRealEstateLoansOrLines: int = Field(ge=0)
    NumberOfTime60to89DaysPastDueNotWorse: int = Field(ge=0, alias="NumberOfTime60-89DaysPastDueNotWorse")
    NumberOfDependents: float = Field(ge=0)
    income_was_missing: int = Field(ge=0, le=1)
    dependents_was_missing: int = Field(ge=0, le=1)
    utility_payment_streak: int = Field(ge=0, le=36)
    recharge_regularity_score: float = Field(ge=0, le=100)
    gig_trip_volume: int = Field(ge=0)
    gig_rating: float = Field(ge=1.0, le=5.0)

    model_config = {"populate_by_name": True}

    def to_feature_dict(self) -> dict:
        return {
            "RevolvingUtilizationOfUnsecuredLines": self.RevolvingUtilizationOfUnsecuredLines,
            "age": self.age,
            "NumberOfTime30-59DaysPastDueNotWorse": self.NumberOfTime30to59DaysPastDueNotWorse,
            "DebtRatio": self.DebtRatio,
            "MonthlyIncome": self.MonthlyIncome,
            "NumberOfOpenCreditLinesAndLoans": self.NumberOfOpenCreditLinesAndLoans,
            "NumberOfTimes90DaysLate": self.NumberOfTimes90DaysLate,
            "NumberRealEstateLoansOrLines": self.NumberRealEstateLoansOrLines,
            "NumberOfTime60-89DaysPastDueNotWorse": self.NumberOfTime60to89DaysPastDueNotWorse,
            "NumberOfDependents": self.NumberOfDependents,
            "income_was_missing": self.income_was_missing,
            "dependents_was_missing": self.dependents_was_missing,
            "utility_payment_streak": self.utility_payment_streak,
            "recharge_regularity_score": self.recharge_regularity_score,
            "gig_trip_volume": self.gig_trip_volume,
            "gig_rating": self.gig_rating,
        }


class FeatureContribution(BaseModel):
    feature: str
    shap_value: float
    feature_value: float


class ScoreResponse(BaseModel):
    probability_of_default: float
    risk_tier: str
    top_contributing_features: list[FeatureContribution]


class CounterfactualRequest(BaseModel):
    applicant: ApplicantFeatures
    feature_to_perturb: str
    new_value: float


class CounterfactualResponse(BaseModel):
    feature_perturbed: str
    original_value: float
    new_value: float
    original_probability: float
    original_tier: str
    new_probability: float
    new_tier: str
    tier_changed: bool
