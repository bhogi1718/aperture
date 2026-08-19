"""
Unit tests for the scoring service. Requires trained artifacts to exist
at model-service/artifacts/ (run training/train.py first).
"""

import pytest

from app.services.scoring import ScoringService

LOW_RISK_APPLICANT = {
    "RevolvingUtilizationOfUnsecuredLines": 0.1,
    "age": 40,
    "NumberOfTime30-59DaysPastDueNotWorse": 0,
    "DebtRatio": 0.2,
    "MonthlyIncome": 30000,
    "NumberOfOpenCreditLinesAndLoans": 6,
    "NumberOfTimes90DaysLate": 0,
    "NumberRealEstateLoansOrLines": 1,
    "NumberOfTime60-89DaysPastDueNotWorse": 0,
    "NumberOfDependents": 1,
    "income_was_missing": 0,
    "dependents_was_missing": 0,
    "utility_payment_streak": 30,
    "recharge_regularity_score": 90,
    "gig_trip_volume": 70,
    "gig_rating": 4.8,
}

HIGH_RISK_APPLICANT = {
    "RevolvingUtilizationOfUnsecuredLines": 0.95,
    "age": 25,
    "NumberOfTime30-59DaysPastDueNotWorse": 4,
    "DebtRatio": 0.9,
    "MonthlyIncome": 8000,
    "NumberOfOpenCreditLinesAndLoans": 2,
    "NumberOfTimes90DaysLate": 3,
    "NumberRealEstateLoansOrLines": 0,
    "NumberOfTime60-89DaysPastDueNotWorse": 2,
    "NumberOfDependents": 3,
    "income_was_missing": 0,
    "dependents_was_missing": 0,
    "utility_payment_streak": 1,
    "recharge_regularity_score": 20,
    "gig_trip_volume": 5,
    "gig_rating": 2.5,
}


@pytest.fixture(scope="module")
def service() -> ScoringService:
    return ScoringService()


def test_score_returns_probability_in_valid_range(service):
    result = service.score(LOW_RISK_APPLICANT)
    assert 0.0 <= result["probability_of_default"] <= 1.0


def test_score_returns_valid_risk_tier(service):
    result = service.score(LOW_RISK_APPLICANT)
    assert result["risk_tier"] in {"Approve", "Manual Review", "Reject"}


def test_low_risk_applicant_scores_lower_than_high_risk(service):
    low = service.score(LOW_RISK_APPLICANT)
    high = service.score(HIGH_RISK_APPLICANT)
    assert low["probability_of_default"] < high["probability_of_default"]


def test_high_risk_applicant_does_not_land_in_approve(service):
    result = service.score(HIGH_RISK_APPLICANT)
    assert result["risk_tier"] != "Approve"


def test_score_returns_top_five_contributing_features(service):
    result = service.score(LOW_RISK_APPLICANT)
    assert len(result["top_contributing_features"]) == 5


def test_contributing_features_sorted_by_absolute_shap_value(service):
    result = service.score(LOW_RISK_APPLICANT)
    magnitudes = [abs(f["shap_value"]) for f in result["top_contributing_features"]]
    assert magnitudes == sorted(magnitudes, reverse=True)


def test_score_missing_feature_raises_value_error(service):
    incomplete = dict(LOW_RISK_APPLICANT)
    del incomplete["age"]
    with pytest.raises(ValueError, match="Missing required features"):
        service.score(incomplete)


def test_counterfactual_improving_utility_streak_lowers_risk(service):
    borderline_applicant = dict(LOW_RISK_APPLICANT)
    borderline_applicant.update(
        RevolvingUtilizationOfUnsecuredLines=0.3,
        DebtRatio=0.25,
        MonthlyIncome=20000,
        utility_payment_streak=8,
        recharge_regularity_score=55,
        gig_trip_volume=40,
        gig_rating=4.2,
    )

    result = service.counterfactual(
        borderline_applicant, "utility_payment_streak", new_value=30
    )

    assert result["new_probability"] < result["original_probability"]


def test_counterfactual_unknown_feature_raises_value_error(service):
    with pytest.raises(ValueError, match="Unknown feature"):
        service.counterfactual(LOW_RISK_APPLICANT, "not_a_real_feature", new_value=1)


def test_counterfactual_preserves_other_features(service):
    result = service.counterfactual(
        HIGH_RISK_APPLICANT, "gig_rating", new_value=4.9
    )
    assert result["feature_perturbed"] == "gig_rating"
    assert result["original_value"] == HIGH_RISK_APPLICANT["gig_rating"]
    assert result["new_value"] == 4.9
