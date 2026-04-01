"""
Load Synthea CSV data into the database.
Run from the backend directory: python load_data.py
"""

import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

from app.database import engine, Base, SessionLocal
from app.models import PatientCache, Condition, Medication

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'csv')

Base.metadata.create_all(bind=engine)
db = SessionLocal()

existing = db.query(PatientCache).count() + db.query(Condition).count() + db.query(Medication).count()
if existing > 0:
    print(f"Database already has {existing} records, skipping load.")
    db.close()
    raise SystemExit(0)

# patients need row-by-row because we store each row as a JSON blob
print("Loading patients...")
patients_df = pd.read_csv(os.path.join(DATA_DIR, 'patients.csv'))
patient_objects = []
for _, row in patients_df.iterrows():
    cleaned = {k: (None if pd.isna(v) else v) for k, v in row.to_dict().items()}
    patient_objects.append(PatientCache(
        patient_id=cleaned['Id'],
        resource_type='Patient',
        data=cleaned,
    ))
db.bulk_save_objects(patient_objects)
db.commit()
db.close()
print(f"  {len(patient_objects)} patients")

print("Loading conditions...")
cond_df = pd.read_csv(os.path.join(DATA_DIR, 'conditions.csv'))
cond_df = cond_df.rename(columns={
    'START': 'start', 'STOP': 'stop', 'PATIENT': 'patient_id',
    'ENCOUNTER': 'encounter', 'SYSTEM': 'system',
    'CODE': 'code', 'DESCRIPTION': 'description',
})
cond_df['start'] = pd.to_datetime(cond_df['start'], errors='coerce')
cond_df['stop'] = pd.to_datetime(cond_df['stop'], errors='coerce')
cond_df.to_sql('conditions', engine, if_exists='append', index=False)
print(f"  {len(cond_df)} conditions")

print("Loading medications...")
med_df = pd.read_csv(os.path.join(DATA_DIR, 'medications.csv'))
med_df = med_df.rename(columns={
    'START': 'start', 'STOP': 'stop', 'PATIENT': 'patient_id',
    'PAYER': 'payer', 'ENCOUNTER': 'encounter', 'CODE': 'code',
    'DESCRIPTION': 'description', 'BASE_COST': 'base_cost',
    'PAYER_COVERAGE': 'payer_coverage', 'DISPENSES': 'dispenses',
    'TOTALCOST': 'totalcost', 'REASONCODE': 'reasoncode',
    'REASONDESCRIPTION': 'reasondescription',
})
med_df['start'] = pd.to_datetime(med_df['start'], errors='coerce')
med_df['stop'] = pd.to_datetime(med_df['stop'], errors='coerce')
med_df.to_sql('medications', engine, if_exists='append', index=False)
print(f"  {len(med_df)} medications")

print("Done.")
