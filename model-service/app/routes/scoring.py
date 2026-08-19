from fastapi import APIRouter, HTTPException

from app.schemas import (
    ApplicantFeatures,
    CounterfactualRequest,
    CounterfactualResponse,
    ScoreResponse,
)
from app.services.scoring import get_scoring_service

router = APIRouter()


@router.post("/score", response_model=ScoreResponse)
def score_applicant(applicant: ApplicantFeatures) -> ScoreResponse:
    service = get_scoring_service()
    result = service.score(applicant.to_feature_dict())
    return ScoreResponse(**result)


@router.post("/counterfactual", response_model=CounterfactualResponse)
def counterfactual(request: CounterfactualRequest) -> CounterfactualResponse:
    service = get_scoring_service()
    try:
        result = service.counterfactual(
            request.applicant.to_feature_dict(),
            request.feature_to_perturb,
            request.new_value,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CounterfactualResponse(**result)
