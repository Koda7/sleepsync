"""Train an optimized sleep quality prediction model.

Generates balanced synthetic training data with realistic clinical correlations,
engineers additional features, tunes hyperparameters via cross-validation,
and selects the best model from multiple candidates.
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import (
    GridSearchCV,
    StratifiedKFold,
    cross_val_score,
    train_test_split,
)
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

FEATURE_COLUMNS = [
    "avg_hours_7d", "std_hours_7d", "avg_quality_7d", "avg_stress_7d",
    "min_hours_7d", "max_hours_7d", "disturbance_rate", "quality_trend",
    "cond_sleep_apnea", "cond_insomnia", "cond_chronic_pain",
    "cond_anxiety", "cond_depression", "cond_hypertension",
    "med_diphenhydramine", "med_zolpidem", "med_sertraline",
    "med_melatonin", "med_ibuprofen", "med_acetaminophen",
    "age",
    # engineered features
    "sleep_efficiency",
    "condition_burden",
    "medication_count",
    "stress_sleep_interaction",
    "hours_quality_ratio",
]

NUM_SAMPLES = 5000
RANDOM_SEED = 42
MODEL_PATH = os.path.join(os.path.dirname(__file__), "app", "models", "sleep_quality_model.joblib")


def generate_training_data(n: int = NUM_SAMPLES) -> pd.DataFrame:
    rng = np.random.RandomState(RANDOM_SEED)
    rows = []
    target_per_class = n // 5

    for target_quality in range(1, 6):
        generated = 0
        attempts = 0
        while generated < target_per_class and attempts < target_per_class * 20:
            attempts += 1
            row = _generate_one_sample(rng, target_quality)
            if row["next_quality"] == target_quality:
                rows.append(row)
                generated += 1

    rng.shuffle(rows)
    return pd.DataFrame(rows)


def _generate_one_sample(rng: np.random.RandomState, target_bias: int) -> dict:
    """Generate a single training sample biased toward a target quality class."""

    age = rng.randint(18, 80)

    if target_bias <= 2:
        condition_rate = 0.5
        stress_base = 3.8
        hours_base = 5.5
    elif target_bias == 3:
        condition_rate = 0.25
        stress_base = 3.0
        hours_base = 6.5
    else:
        condition_rate = 0.1
        stress_base = 2.0
        hours_base = 7.5

    has_apnea = rng.random() < condition_rate * 0.6
    has_insomnia = rng.random() < condition_rate * 0.5
    has_pain = rng.random() < condition_rate * 0.5
    has_anxiety = rng.random() < condition_rate * 0.6
    has_depression = rng.random() < condition_rate * 0.4
    has_hypertension = rng.random() < 0.30

    on_diphenhydramine = rng.random() < 0.15
    on_zolpidem = rng.random() < 0.10
    on_sertraline = rng.random() < (0.25 if has_anxiety or has_depression else 0.05)
    on_melatonin = rng.random() < 0.15
    on_ibuprofen = rng.random() < (0.30 if has_pain else 0.10)
    on_acetaminophen = rng.random() < 0.20

    base_hours = rng.normal(hours_base, 0.8)
    if has_apnea:
        base_hours -= rng.uniform(0.3, 0.7)
    if has_insomnia:
        base_hours -= rng.uniform(0.5, 1.2)
    if has_pain:
        base_hours -= rng.uniform(0.2, 0.5)
    if on_zolpidem or on_melatonin:
        base_hours += rng.uniform(0.1, 0.4)
    base_hours = np.clip(base_hours, 3.0, 10.0)

    stress = rng.normal(stress_base, 0.6)
    if has_anxiety:
        stress += rng.uniform(0.3, 0.8)
    if has_depression:
        stress += rng.uniform(0.2, 0.6)
    if on_sertraline and (has_anxiety or has_depression):
        stress -= rng.uniform(0.1, 0.4)
    stress = np.clip(stress, 1.0, 5.0)

    disturbance_rate = rng.beta(2, 5)
    if has_apnea:
        disturbance_rate += rng.uniform(0.15, 0.35)
    if has_pain:
        disturbance_rate += rng.uniform(0.1, 0.25)
    if has_insomnia:
        disturbance_rate += rng.uniform(0.1, 0.2)
    if target_bias <= 2:
        disturbance_rate += rng.uniform(0.05, 0.15)
    disturbance_rate = np.clip(disturbance_rate, 0.0, 1.0)

    quality_score = 3.0
    quality_score += (base_hours - 6.5) * 0.6
    quality_score -= (stress - 2.5) * 0.5
    quality_score -= disturbance_rate * 1.8

    if has_apnea:
        quality_score -= 0.35
    if has_insomnia:
        quality_score -= 0.5
    if has_pain:
        quality_score -= 0.25
    if has_anxiety:
        quality_score -= 0.2
    if has_depression:
        quality_score -= 0.25

    if on_melatonin:
        quality_score += 0.25
    if on_zolpidem:
        quality_score += 0.2
    if on_diphenhydramine:
        quality_score += 0.15
    if on_sertraline and (has_anxiety or has_depression):
        quality_score += 0.2

    if age > 65:
        quality_score -= 0.15

    quality_score += rng.normal(0, 0.25)
    next_quality = int(np.clip(round(quality_score), 1, 5))

    avg_hours = base_hours + rng.normal(0, 0.15)
    std_hours = rng.uniform(0.2, 1.2)
    min_hours = max(3.0, avg_hours - rng.uniform(0.8, 1.8))
    max_hours = min(10.0, avg_hours + rng.uniform(0.5, 1.5))

    avg_quality = quality_score + rng.normal(0, 0.2)
    avg_quality = np.clip(avg_quality, 1.0, 5.0)

    trend = rng.normal(0, 0.35)

    condition_burden = sum([has_apnea, has_insomnia, has_pain, has_anxiety, has_depression, has_hypertension])
    med_count = sum([on_diphenhydramine, on_zolpidem, on_sertraline, on_melatonin, on_ibuprofen, on_acetaminophen])

    sleep_efficiency = avg_hours / max(max_hours, avg_hours + 0.5)
    sleep_efficiency = np.clip(sleep_efficiency, 0.3, 1.0)

    stress_sleep = stress * (1.0 - (avg_hours / 10.0))
    hours_quality = avg_hours / max(avg_quality, 1.0)

    return {
        "avg_hours_7d": round(float(avg_hours), 2),
        "std_hours_7d": round(float(std_hours), 2),
        "avg_quality_7d": round(float(avg_quality), 2),
        "avg_stress_7d": round(float(stress), 2),
        "min_hours_7d": round(float(min_hours), 2),
        "max_hours_7d": round(float(max_hours), 2),
        "disturbance_rate": round(float(disturbance_rate), 2),
        "quality_trend": round(float(trend), 2),
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
        "sleep_efficiency": round(float(sleep_efficiency), 3),
        "condition_burden": float(condition_burden),
        "medication_count": float(med_count),
        "stress_sleep_interaction": round(float(stress_sleep), 3),
        "hours_quality_ratio": round(float(hours_quality), 3),
        "next_quality": next_quality,
    }


def train():
    print("Generating balanced training data...")
    df = generate_training_data()
    print(f"  {len(df)} samples, class distribution:")
    print(f"  {df['next_quality'].value_counts().sort_index().to_dict()}")

    X = df[FEATURE_COLUMNS].values
    y = df["next_quality"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)

    print("\n--- Model 1: GradientBoosting (tuned) ---")
    gb_params = {
        "n_estimators": [200, 300],
        "max_depth": [5, 6],
        "learning_rate": [0.08, 0.1],
        "min_samples_leaf": [5],
        "subsample": [0.85],
    }
    gb = GridSearchCV(
        GradientBoostingClassifier(random_state=RANDOM_SEED),
        gb_params,
        cv=cv,
        scoring="accuracy",
        n_jobs=-1,
        verbose=1,
    )
    gb.fit(X_train, y_train)
    print(f"  Best params: {gb.best_params_}")
    print(f"  Best CV accuracy: {gb.best_score_:.4f}")

    gb_test_acc = (gb.predict(X_test) == y_test).mean()
    print(f"  Test accuracy: {gb_test_acc:.4f}")

    print("\n--- Model 2: RandomForest ---")
    rf_params = {
        "n_estimators": [300, 500],
        "max_depth": [12, None],
        "min_samples_leaf": [3],
    }
    rf = GridSearchCV(
        RandomForestClassifier(random_state=RANDOM_SEED, n_jobs=-1),
        rf_params,
        cv=cv,
        scoring="accuracy",
        n_jobs=-1,
        verbose=1,
    )
    rf.fit(X_train, y_train)
    print(f"  Best params: {rf.best_params_}")
    print(f"  Best CV accuracy: {rf.best_score_:.4f}")

    rf_test_acc = (rf.predict(X_test) == y_test).mean()
    print(f"  Test accuracy: {rf_test_acc:.4f}")

    if gb.best_score_ >= rf.best_score_:
        best_model = gb.best_estimator_
        best_name = "GradientBoosting"
        best_cv = gb.best_score_
        best_test = gb_test_acc
    else:
        best_model = rf.best_estimator_
        best_name = "RandomForest"
        best_cv = rf.best_score_
        best_test = rf_test_acc

    print(f"\n{'='*50}")
    print(f"Winner: {best_name}")
    print(f"CV accuracy: {best_cv:.4f}")
    print(f"Test accuracy: {best_test:.4f}")
    print(f"{'='*50}")

    print(f"\nDetailed test set evaluation ({best_name}):")
    y_pred = best_model.predict(X_test)
    print(classification_report(y_test, y_pred, zero_division=0))

    print("Confusion matrix:")
    cm = confusion_matrix(y_test, y_pred)
    labels = sorted(set(y_test))
    print(f"{'':>6}", " ".join(f"{l:>5}" for l in labels))
    for i, row in enumerate(cm):
        print(f"{labels[i]:>6}", " ".join(f"{v:>5}" for v in row))

    print(f"\nFeature importances ({best_name}):")
    importances = sorted(
        zip(FEATURE_COLUMNS, best_model.feature_importances_),
        key=lambda x: x[1],
        reverse=True,
    )
    for feat, imp in importances:
        bar = "█" * int(imp * 100)
        print(f"  {feat:30s} {imp:.4f}  {bar}")

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump({
        "model": best_model,
        "features": FEATURE_COLUMNS,
        "model_name": best_name,
        "cv_accuracy": round(float(best_cv), 4),
        "test_accuracy": round(float(best_test), 4),
        "n_training_samples": len(X_train),
        "n_features": len(FEATURE_COLUMNS),
    }, MODEL_PATH, compress=3)
    print(f"\nModel saved to {MODEL_PATH}")
    print(f"Model size: {os.path.getsize(MODEL_PATH) / 1024:.1f} KB")


if __name__ == "__main__":
    train()
