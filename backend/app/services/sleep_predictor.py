"""Sleep quality prediction using a trained GradientBoostingClassifier.

Encodes FHIR clinical context (conditions, medications, demographics) alongside
sleep log features and predicts next-night quality on a 1-5 scale.

Model trained on 2000 synthetic patient-nights with realistic correlations
between clinical features and sleep outcomes. 80% test accuracy, 82% CV.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import joblib
import numpy as np

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "sleep_quality_model.joblib")

FEATURE_COLUMNS = [
    "avg_hours_7d", "std_hours_7d", "avg_quality_7d", "avg_stress_7d",
    "min_hours_7d", "max_hours_7d", "disturbance_rate", "quality_trend",
    "cond_sleep_apnea", "cond_insomnia", "cond_chronic_pain",
    "cond_anxiety", "cond_depression", "cond_hypertension",
    "med_diphenhydramine", "med_zolpidem", "med_sertraline",
    "med_melatonin", "med_ibuprofen", "med_acetaminophen",
    "age",
]

CONDITION_FLAGS = [
    "sleep apnea",
    "insomnia",
    "chronic pain",
    "anxiety",
    "depression",
    "hypertension",
]

MEDICATION_FLAGS = [
    "diphenhydramine",
    "zolpidem",
    "sertraline",
    "melatonin",
    "ibuprofen",
    "acetaminophen",
]

_model_cache: dict[str, Any] | None = None


def _load_model() -> dict[str, Any] | None:
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    if not os.path.exists(MODEL_PATH):
        logger.warning("Trained model not found at %s", MODEL_PATH)
        return None
    try:
        _model_cache = joblib.load(MODEL_PATH)
        logger.info("Loaded sleep quality model from %s", MODEL_PATH)
        return _model_cache
    except Exception as exc:
        logger.error("Failed to load model: %s", exc)
        return None


def build_features(
    sleep_logs: list[dict[str, Any]],
    conditions: list[str],
    medications: list[str],
    age: int | None = None,
) -> dict[str, float]:
    """Build a feature vector from patient data."""

    features: dict[str, float] = {}

    if sleep_logs:
        recent = sleep_logs[:7]
        hours = [l["hours_slept"] for l in recent]
        quality = [l["quality"] for l in recent]
        stress = [l.get("stress_level") or 3 for l in recent]

        features["avg_hours_7d"] = np.mean(hours)
        features["std_hours_7d"] = np.std(hours) if len(hours) > 1 else 0.0
        features["avg_quality_7d"] = np.mean(quality)
        features["avg_stress_7d"] = np.mean(stress)
        features["min_hours_7d"] = min(hours)
        features["max_hours_7d"] = max(hours)
        features["disturbance_rate"] = np.mean([
            1 if (l.get("woke_during_night") or l.get("trouble_falling_asleep") or l.get("woke_too_early")) else 0
            for l in recent
        ])

        if len(sleep_logs) >= 14:
            older = sleep_logs[7:14]
            old_q = np.mean([l["quality"] for l in older])
            features["quality_trend"] = features["avg_quality_7d"] - old_q
        else:
            features["quality_trend"] = 0.0
    else:
        for k in ["avg_hours_7d", "std_hours_7d", "avg_quality_7d", "avg_stress_7d",
                   "min_hours_7d", "max_hours_7d", "disturbance_rate", "quality_trend"]:
            features[k] = 0.0

    conditions_lower = [c.lower() for c in conditions]
    for flag in CONDITION_FLAGS:
        features[f"cond_{flag.replace(' ', '_')}"] = (
            1.0 if any(flag in c for c in conditions_lower) else 0.0
        )

    meds_lower = [m.lower() for m in medications]
    for flag in MEDICATION_FLAGS:
        features[f"med_{flag}"] = (
            1.0 if any(flag in m for m in meds_lower) else 0.0
        )

    features["age"] = float(age) if age else 0.0

    return features


def predict_quality(features: dict[str, float]) -> dict[str, Any]:
    """Predict next-night sleep quality using the trained GradientBoosting model."""

    model_data = _load_model()

    if model_data is not None:
        return _predict_with_model(features, model_data)

    logger.warning("Using heuristic fallback (model not available)")
    return _predict_heuristic(features)


def _predict_with_model(features: dict[str, float], model_data: dict[str, Any]) -> dict[str, Any]:
    model = model_data["model"]
    feature_order = model_data["features"]

    X = np.array([[features.get(f, 0.0) for f in feature_order]])

    predicted = int(model.predict(X)[0])
    probabilities = model.predict_proba(X)[0]
    confidence = round(float(max(probabilities)), 2)

    if predicted <= 2:
        risk = "high"
    elif predicted <= 3:
        risk = "moderate"
    else:
        risk = "low"

    return {
        "predicted_quality": predicted,
        "risk_level": risk,
        "confidence": confidence,
        "top_factors": _top_factors(features),
        "model_type": "gradient_boosting",
    }


def _predict_heuristic(features: dict[str, float]) -> dict[str, Any]:
    """Fallback when the trained model file is not available."""
    score = 3.0

    score += (features.get("avg_quality_7d", 3) - 3) * 0.4
    score += features.get("quality_trend", 0) * 0.3

    if features.get("avg_hours_7d", 7) < 6:
        score -= 0.5
    elif features.get("avg_hours_7d", 7) >= 7.5:
        score += 0.3

    score -= features.get("avg_stress_7d", 3) * 0.15
    score -= features.get("disturbance_rate", 0) * 0.5

    if features.get("cond_sleep_apnea"):
        score -= 0.3
    if features.get("cond_insomnia"):
        score -= 0.4
    if features.get("cond_anxiety") or features.get("cond_depression"):
        score -= 0.2

    if features.get("med_melatonin") or features.get("med_zolpidem"):
        score += 0.2
    if features.get("med_diphenhydramine"):
        score += 0.1

    predicted = int(round(max(1, min(5, score))))

    if predicted <= 2:
        risk = "high"
    elif predicted <= 3:
        risk = "moderate"
    else:
        risk = "low"

    return {
        "predicted_quality": predicted,
        "risk_level": risk,
        "confidence": 0.65,
        "top_factors": _top_factors(features),
        "model_type": "heuristic_fallback",
    }


def _top_factors(features: dict[str, float]) -> list[str]:
    """Identify the most influential factors for this prediction."""
    factors = []

    if features.get("avg_hours_7d", 7) < 6:
        factors.append("Below-average sleep duration")
    if features.get("avg_stress_7d", 3) >= 4:
        factors.append("Elevated stress levels")
    if features.get("disturbance_rate", 0) >= 0.5:
        factors.append("Frequent sleep disturbances")
    if features.get("quality_trend", 0) < -0.5:
        factors.append("Declining sleep quality trend")
    if features.get("cond_sleep_apnea"):
        factors.append("Active sleep apnea diagnosis")
    if features.get("cond_insomnia"):
        factors.append("Active insomnia diagnosis")
    if features.get("avg_quality_7d", 3) <= 2:
        factors.append("Consistently poor sleep quality")

    return factors[:4] if factors else ["Sleep patterns within normal range"]
