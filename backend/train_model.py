"""Generate synthetic training data and train a sleep quality prediction model.

Uses realistic correlations between clinical features and sleep quality
based on medical literature:
- Sleep apnea → lower quality
- Insomnia → lower quality
- Chronic pain → lower quality
- Anxiety/depression → lower quality
- High stress → lower quality
- More disturbances → lower quality
- Sedative medications → modest quality improvement
- Adequate sleep duration → higher quality
"""

import json
import os
import random

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import classification_report

FEATURE_COLUMNS = [
    "avg_hours_7d", "std_hours_7d", "avg_quality_7d", "avg_stress_7d",
    "min_hours_7d", "max_hours_7d", "disturbance_rate", "quality_trend",
    "cond_sleep_apnea", "cond_insomnia", "cond_chronic_pain",
    "cond_anxiety", "cond_depression", "cond_hypertension",
    "med_diphenhydramine", "med_zolpidem", "med_sertraline",
    "med_melatonin", "med_ibuprofen", "med_acetaminophen",
    "age",
]

NUM_SAMPLES = 2000
RANDOM_SEED = 42
MODEL_PATH = os.path.join(os.path.dirname(__file__), "app", "models", "sleep_quality_model.joblib")


def generate_training_data(n: int = NUM_SAMPLES) -> pd.DataFrame:
    rng = np.random.RandomState(RANDOM_SEED)
    rows = []

    for _ in range(n):
        age = rng.randint(18, 80)
        has_apnea = rng.random() < 0.25
        has_insomnia = rng.random() < 0.20
        has_pain = rng.random() < 0.20
        has_anxiety = rng.random() < 0.25
        has_depression = rng.random() < 0.15
        has_hypertension = rng.random() < 0.30

        on_diphenhydramine = rng.random() < 0.15
        on_zolpidem = rng.random() < 0.10
        on_sertraline = rng.random() < 0.15
        on_melatonin = rng.random() < 0.12
        on_ibuprofen = rng.random() < 0.20
        on_acetaminophen = rng.random() < 0.20

        base_hours = rng.normal(7.0, 1.0)
        if has_apnea:
            base_hours -= rng.uniform(0.3, 0.8)
        if has_insomnia:
            base_hours -= rng.uniform(0.5, 1.5)
        if has_pain:
            base_hours -= rng.uniform(0.2, 0.6)
        base_hours = np.clip(base_hours, 3.0, 10.0)

        stress = rng.normal(2.8, 0.8)
        if has_anxiety:
            stress += rng.uniform(0.5, 1.2)
        if has_depression:
            stress += rng.uniform(0.3, 0.8)
        stress = np.clip(stress, 1.0, 5.0)

        disturbance_rate = rng.beta(2, 5)
        if has_apnea:
            disturbance_rate += rng.uniform(0.1, 0.3)
        if has_pain:
            disturbance_rate += rng.uniform(0.1, 0.2)
        disturbance_rate = np.clip(disturbance_rate, 0.0, 1.0)

        quality_score = 3.0
        quality_score += (base_hours - 7.0) * 0.5
        quality_score -= (stress - 3.0) * 0.4
        quality_score -= disturbance_rate * 1.5

        if has_apnea:
            quality_score -= 0.4
        if has_insomnia:
            quality_score -= 0.6
        if has_pain:
            quality_score -= 0.3
        if has_anxiety:
            quality_score -= 0.2
        if has_depression:
            quality_score -= 0.3

        if on_melatonin:
            quality_score += 0.3
        if on_zolpidem:
            quality_score += 0.25
        if on_diphenhydramine:
            quality_score += 0.15
        if on_sertraline and (has_anxiety or has_depression):
            quality_score += 0.2

        quality_score += rng.normal(0, 0.3)

        next_quality = int(np.clip(round(quality_score), 1, 5))

        avg_hours = base_hours + rng.normal(0, 0.2)
        std_hours = rng.uniform(0.3, 1.5)
        min_hours = max(3.0, avg_hours - rng.uniform(1.0, 2.0))
        max_hours = min(10.0, avg_hours + rng.uniform(0.5, 1.5))

        avg_quality = quality_score + rng.normal(0, 0.3)
        avg_quality = np.clip(avg_quality, 1.0, 5.0)

        trend = rng.normal(0, 0.4)

        rows.append({
            "avg_hours_7d": round(avg_hours, 2),
            "std_hours_7d": round(std_hours, 2),
            "avg_quality_7d": round(avg_quality, 2),
            "avg_stress_7d": round(stress, 2),
            "min_hours_7d": round(min_hours, 2),
            "max_hours_7d": round(max_hours, 2),
            "disturbance_rate": round(disturbance_rate, 2),
            "quality_trend": round(trend, 2),
            "cond_sleep_apnea": float(has_apnea),
            "cond_insomnia": float(has_insomnia),
            "cond_chronic_pain": float(has_pain),
            "cond_anxiety": float(has_anxiety),
            "cond_depression": float(has_depression),
            "cond_hypertension": float(has_hypertension),
            "med_diphenhydramine": float(on_diphenhydramine),
            "med_zolpidem": float(on_zolpidem),
            "med_sertraline": float(on_sertraline),
            "med_melatonin": float(on_melatonin),
            "med_ibuprofen": float(on_ibuprofen),
            "med_acetaminophen": float(on_acetaminophen),
            "age": float(age),
            "next_quality": next_quality,
        })

    return pd.DataFrame(rows)


def train():
    print("Generating training data...")
    df = generate_training_data()
    print(f"  {len(df)} samples, class distribution:")
    print(f"  {df['next_quality'].value_counts().sort_index().to_dict()}")

    X = df[FEATURE_COLUMNS].values
    y = df["next_quality"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y,
    )

    print("\nTraining GradientBoostingClassifier...")
    model = GradientBoostingClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.1,
        min_samples_leaf=10,
        random_state=RANDOM_SEED,
    )
    model.fit(X_train, y_train)

    print("\nCross-validation (5-fold):")
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="accuracy")
    print(f"  Accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

    print("\nTest set evaluation:")
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred, zero_division=0))

    test_acc = (y_pred == y_test).mean()
    print(f"Test accuracy: {test_acc:.3f}")

    print(f"\nFeature importances:")
    importances = sorted(
        zip(FEATURE_COLUMNS, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True,
    )
    for feat, imp in importances[:10]:
        print(f"  {feat:25s} {imp:.4f}")

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump({"model": model, "features": FEATURE_COLUMNS}, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")

    model_size = os.path.getsize(MODEL_PATH)
    print(f"Model size: {model_size / 1024:.1f} KB")


if __name__ == "__main__":
    train()
