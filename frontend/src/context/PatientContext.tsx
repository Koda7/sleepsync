import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { API_BASE } from "../api";

const DEFAULT_PATIENT = "7cd8a8ad-746b-549e-e70d-0c0feb8ebc69";

type PatientInfo = {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
};

type PatientContextType = {
  patientId: string;
  patient: PatientInfo | null;
  setPatientId: (id: string) => void;
  loading: boolean;
};

const PatientContext = createContext<PatientContextType>({
  patientId: DEFAULT_PATIENT,
  patient: null,
  setPatientId: () => {},
  loading: false,
});

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patientId, setPatientId] = useState(DEFAULT_PATIENT);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setPatient(null);
    fetch(`${API_BASE}/api/fhir/patient/${patientId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.id) {
          setPatient({ id: data.id, name: data.name, birthDate: data.birthDate, gender: data.gender });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  return (
    <PatientContext.Provider value={{ patientId, patient, setPatientId, loading }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  return useContext(PatientContext);
}
