"""
Load Synthea CSV data into the PostgreSQL database.
Run from the backend directory: python load_data.py
"""

import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

print(f"Connecting to: {os.getenv('DATABASE_URL')}")

from app.database import engine, Base, SessionLocal
from app.models import PatientCache, Condition, Medication

# Paths to CSV files
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'csv')
PATIENTS_CSV = os.path.join(DATA_DIR, 'patients.csv')
CONDITIONS_CSV = os.path.join(DATA_DIR, 'conditions.csv')
MEDICATIONS_CSV = os.path.join(DATA_DIR, 'medications.csv')

Base.metadata.create_all(bind=engine)
db = SessionLocal()

Base.metadata.create_all(bind=engine)
print("Tables created")

db = SessionLocal()

try:
    existing_patients = db.query(PatientCache).count()
    existing_conditions = db.query(Condition).count()
    existing_medications = db.query(Medication).count()
except Exception as e:
    print(f"Error checking existing data: {e}")
    db.close()
    raise

if existing_patients > 0 or existing_conditions > 0 or existing_medications > 0:
    print(f"Database already has data: {existing_patients} patients, {existing_conditions} conditions, {existing_medications} medications. Skipping load.")
    db.close()
    raise SystemExit(0)

print("Loading patients...")
try:
    patients_df = pd.read_csv(PATIENTS_CSV)
    for _, row in patients_df.iterrows():
        patient_data = {k: (None if pd.isna(v) else v) for k, v in row.to_dict().items()}
        patient_id = patient_data['Id']
        cache_entry = PatientCache(
            patient_id=patient_id,
            resource_type='Patient',
            data=patient_data
        )
        db.add(cache_entry)
    print(f"Added {len(patients_df)} patients")
except Exception as e:
    print(f"Error loading patients: {e}")
    db.rollback()
    db.close()
    raise

print("Loading conditions...")
try:
    conditions_df = pd.read_csv(CONDITIONS_CSV)
    for _, row in conditions_df.iterrows():
        condition = Condition(
            start=pd.to_datetime(row['START']) if pd.notna(row['START']) else None,
            stop=pd.to_datetime(row['STOP']) if pd.notna(row['STOP']) else None,
            patient_id=row['PATIENT'],
            encounter=row['ENCOUNTER'],
            system=row['SYSTEM'],
            code=row['CODE'],
            description=row['DESCRIPTION']
        )
        db.add(condition)
    print(f"Added {len(conditions_df)} conditions")
except Exception as e:
    print(f"Error loading conditions: {e}")
    db.rollback()
    db.close()
    raise

print("Loading medications...")
try:
    medications_df = pd.read_csv(MEDICATIONS_CSV)
    for _, row in medications_df.iterrows():
        medication = Medication(
            start=pd.to_datetime(row['START']) if pd.notna(row['START']) else None,
            stop=pd.to_datetime(row['STOP']) if pd.notna(row['STOP']) else None,
            patient_id=row['PATIENT'],
            payer=row['PAYER'],
            encounter=row['ENCOUNTER'],
            code=row['CODE'],
            description=row['DESCRIPTION'],
            base_cost=row['BASE_COST'] if pd.notna(row['BASE_COST']) else None,
            payer_coverage=row['PAYER_COVERAGE'] if pd.notna(row['PAYER_COVERAGE']) else None,
            dispenses=row['DISPENSES'] if pd.notna(row['DISPENSES']) else None,
            totalcost=row['TOTALCOST'] if pd.notna(row['TOTALCOST']) else None,
            reasoncode=row['REASONCODE'] if pd.notna(row['REASONCODE']) else None,
            reasondescription=row['REASONDESCRIPTION'] if pd.notna(row['REASONDESCRIPTION']) else None
        )
        db.add(medication)
    print(f"Added {len(medications_df)} medications")
except Exception as e:
    print(f"Error loading medications: {e}")
    db.rollback()
    db.close()
    raise

try:
    db.commit()
    print("Data loaded successfully!")
except Exception as e:
    print(f"Error committing: {e}")
    db.rollback()
    db.close()
    raise

db.close()