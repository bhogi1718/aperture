from fastapi import FastAPI

from app.routes.scoring import router as scoring_router

app = FastAPI(
    title="Aperture Model Service",
    description="XGBoost credit-risk scoring with SHAP explanations and counterfactuals.",
    version="0.1.0",
)

app.include_router(scoring_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
