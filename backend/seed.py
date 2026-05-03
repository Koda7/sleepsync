"""
Populate the database with sample sleep logs for demo patients.
Run via: DATABASE_URL=<your_render_url> python -m backend.seed
"""

import random
from datetime import date, timedelta

from backend.app.database import engine, Base, SessionLocal
from backend.app.models.sleep_log import SleepLog

DEMO_PATIENTS = [
    "7cd8a8ad-746b-549e-e70d-0c0feb8ebc69",  # Abel832 Kip442 Wolff180
    "592912",                                    # original demo patient
]

ACTIVITIES = [None, None, "No exercise", "Light walk", "Moderate exercise", "Intense workout", "Yoga / stretching"]

Base.metadata.create_all(bind=engine)
db = SessionLocal()

existing = db.query(SleepLog).count()
if existing > 0:
    print(f"Database already has {existing} entries, skipping seed.")
    db.close()
    raise SystemExit(0)

random.seed(42)
today = date(2026, 4, 25)
total = 0

for patient_id in DEMO_PATIENTS:
    entries = []
    for i in range(30):
        d = today - timedelta(days=29 - i)

        base_quality = 3
        if d.weekday() in (4, 5):
            base_quality = 4
        if d.weekday() == 0:
            base_quality = 2

        quality = max(1, min(5, base_quality + random.choice([-1, 0, 0, 1])))
        hours = round(random.uniform(4.5, 9.0), 1)
        if quality <= 2:
            hours = round(random.uniform(3.5, 6.0), 1)
        elif quality >= 4:
            hours = round(random.uniform(6.5, 9.0), 1)

        stress = max(1, min(5, 6 - quality + random.choice([-1, 0, 0, 1])))

        entries.append(SleepLog(
            patient_id=patient_id,
            date=d,
            hours_slept=hours,
            quality=quality,
            stress_level=stress,
            notes=None,
            activity=random.choice(ACTIVITIES),
            woke_during_night=int(random.random() < 0.3),
            trouble_falling_asleep=int(random.random() < 0.25),
            woke_too_early=int(random.random() < 0.2),
        ))

    db.add_all(entries)
    db.commit()
    total += len(entries)
    print(f"Seeded {len(entries)} sleep logs for patient {patient_id}")

print(f"Done. {total} total entries.")
db.close()
