"""Thin wrapper around the Hugging Face Inference API (OpenAI-compatible chat endpoint)."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

HF_API_URL = "https://router.huggingface.co/v1/chat/completions"
HF_MODEL = "meta-llama/Llama-3.2-1B-Instruct"
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_TIMEOUT = float(os.getenv("HF_TIMEOUT", "30"))

SYSTEM_PROMPT = (
    "You are a sleep health analyst. Given a patient's recent sleep log data, "
    "active medical conditions, and current medications, provide a brief 2-3 sentence "
    "plain-language summary of their sleep trends. Be specific about patterns you "
    "observe and mention any relevant clinical context. Do not give medical advice."
)


def generate_sleep_summary(
    patient_name: str,
    sleep_stats: dict[str, Any],
    conditions: list[str],
    medications: list[str],
) -> str:
    """Build a prompt from structured data and call Llama 3.2 1B via HF Inference API."""

    if not HF_TOKEN:
        logger.warning("HF_TOKEN not set; returning fallback summary")
        return _fallback_summary(sleep_stats)

    prompt = _build_prompt(patient_name, sleep_stats, conditions, medications)

    try:
        resp = httpx.post(
            HF_API_URL,
            headers={
                "Authorization": f"Bearer {HF_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "model": HF_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 200,
            },
            timeout=HF_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        logger.error("HF Inference API call failed: %s", exc)
        return _fallback_summary(sleep_stats)


def _build_prompt(
    patient_name: str,
    stats: dict[str, Any],
    conditions: list[str],
    medications: list[str],
) -> str:
    parts = [f"Patient: {patient_name}."]

    if stats.get("total_logs", 0) > 0:
        parts.append(
            f"Over the past {stats['total_logs']} logged nights: "
            f"average sleep {stats['avg_hours']:.1f} hours/night, "
            f"average quality {stats['avg_quality']:.1f}/5, "
            f"average stress {stats['avg_stress']:.1f}/5."
        )
    if stats.get("poor_nights"):
        parts.append(f"{stats['poor_nights']} nights had poor sleep (quality <= 2).")
    if stats.get("disturbance_nights"):
        parts.append(f"{stats['disturbance_nights']} nights had disturbances.")
    if stats.get("trend"):
        parts.append(f"Recent trend: {stats['trend']}.")

    if conditions:
        parts.append(f"Active conditions: {', '.join(conditions)}.")
    if medications:
        parts.append(f"Current medications: {', '.join(medications)}.")

    return " ".join(parts)


def _fallback_summary(stats: dict[str, Any]) -> str:
    """Rule-based fallback when HF token is missing or API fails."""
    if stats.get("total_logs", 0) == 0:
        return "No sleep data available yet. Start logging to see trends."

    avg_h = stats.get("avg_hours", 0)
    avg_q = stats.get("avg_quality", 0)

    if avg_q <= 2:
        quality_note = "Sleep quality has been consistently poor"
    elif avg_q <= 3:
        quality_note = "Sleep quality has been moderate"
    else:
        quality_note = "Sleep quality has been relatively good"

    if avg_h < 6:
        hours_note = "with below-recommended nightly duration"
    elif avg_h < 7:
        hours_note = "with slightly below-average nightly duration"
    else:
        hours_note = "with adequate nightly duration"

    return f"{quality_note} {hours_note} (avg {avg_h:.1f}h, quality {avg_q:.1f}/5)."
