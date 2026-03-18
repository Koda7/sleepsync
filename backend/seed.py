"""
Populate the local dev database with sample sleep logs for demo purposes.
Run from the project root: python -m backend.seed
"""

import random
from datetime import date, timedelta

from backend.app.database import engine, Base, SessionLocal
from backend.app.models.sleep_log import SleepLog

PATIENT_ID = "592912"

Base.metadata.create_all(bind=engine)
db = SessionLocal()

existing = db.query(SleepLog).count()
if existing > 0:
    print(f"Database already has {existing} entries, skipping seed.")
    db.close()
    raise SystemExit(0)

random.seed(42)
today = date(2026, 3, 18)
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
        patient_id=PATIENT_ID,
        date=d,
        hours_slept=hours,
        quality=quality,
        stress_level=stress,
        notes=None,
        woke_during_night=int(random.random() < 0.3),
        trouble_falling_asleep=int(random.random() < 0.25),
        woke_too_early=int(random.random() < 0.2),
    ))

db.add_all(entries)
db.commit()
print(f"Seeded {len(entries)} sleep logs for patient {PATIENT_ID}")
db.close()
