import { useEffect, useState } from "react";
import type { SleepLog, Medication } from "../types";
import { API_BASE } from "../api";

const PATIENT_ID = "7cd8a8ad-746b-549e-e70d-0c0feb8ebc69";
import StatCard from "../components/ui/StatCard";
import SleepTrendChart from "../components/dashboard/SleepTrendChart";
import MedicationSidebar from "../components/dashboard/MedicationSidebar";
import SleepLogTable from "../components/dashboard/SleepLogTable";

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type PatientInfo = { name: string; birthDate: string; gender: string } | null;
type ConditionItem = { id: string; code: string; clinicalStatus: string };

export default function Dashboard() {
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [patient, setPatient] = useState<PatientInfo>(null);
  const [conditions, setConditions] = useState<ConditionItem[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/sleep-logs/patient/${PATIENT_ID}`)
      .then((r) => r.json())
      .then((data: SleepLog[]) => setSleepLogs(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/fhir/patient/${PATIENT_ID}/medications`)
      .then((r) => r.json())
      .then((data: Medication[]) => { if (Array.isArray(data)) setMedications(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/fhir/patient/${PATIENT_ID}`)
      .then((r) => r.json())
      .then((data) => setPatient(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/fhir/patient/${PATIENT_ID}/conditions`)
      .then((r) => r.json())
      .then((data: ConditionItem[]) => { if (Array.isArray(data)) setConditions(data); })
      .catch(() => {});
  }, []);

  const sorted = [...sleepLogs].sort((a, b) => a.date.localeCompare(b.date));
  const newest = [...sleepLogs].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[sorted.length - 1] ?? null;

  const avg = (key: keyof SleepLog) =>
    sorted.length === 0 ? 0 : sorted.reduce((s, l) => s + (l[key] as number), 0) / sorted.length;

  const poorSleepCount = sorted.filter((l) => l.quality <= 2).length;
  const disturbanceCount = sorted.filter(
    (l) => l.woke_during_night || l.trouble_falling_asleep || l.woke_too_early
  ).length;

  let trend = "Not enough data.";
  if (sorted.length >= 2) {
    const diff = sorted[sorted.length - 1].quality - sorted[0].quality;
    trend = diff > 0 ? "Trending upward." : diff < 0 ? "Trending downward." : "Stable.";
  }

  async function handleDelete(logId: number) {
    if (!confirm("Delete this sleep log entry?")) return;
    const res = await fetch(`${API_BASE}/api/sleep-logs/${logId}`, { method: "DELETE" });
    if (res.ok) {
      setSleepLogs((prev) => prev.filter((l) => l.id !== logId));
    }
  }

  const activeConditions = conditions
    .filter((c) => c.clinicalStatus === "active")
    .slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 text-white">
      {patient && (
        <div className="mb-2 flex items-baseline gap-3">
          <h1 className="text-2xl font-bold">{patient.name}</h1>
          <span className="text-zinc-400 text-sm">
            {patient.gender} · DOB {formatDate(patient.birthDate)}
          </span>
        </div>
      )}
      {!patient && <h1 className="text-2xl font-bold mb-1">Sleep Health Dashboard</h1>}
      <p className="text-zinc-400 mb-6 text-sm">Patient-reported sleep trends, medication context, and recent patterns.</p>

      {sorted.length === 0 ? (
        <p className="text-zinc-400">No sleep log data available. Add a log to get started.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <StatCard title="Avg Hours" value={avg("hours_slept").toFixed(1)} subtitle="Nightly average" />
            <StatCard title="Avg Quality" value={avg("quality").toFixed(1)} subtitle="Scale 1–5" />
            <StatCard title="Avg Stress" value={avg("stress_level").toFixed(1)} subtitle="Reported stress" />
            <StatCard title="Total Logs" value={String(sorted.length)} subtitle="Nights recorded" />
            <StatCard title="Poor Sleep" value={String(poorSleepCount)} subtitle="Quality ≤ 2" />
            <StatCard title="Disturbances" value={String(disturbanceCount)} subtitle="Any disruption" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            <SleepTrendChart data={sorted} />
            <div className="flex flex-col gap-4">
              <MedicationSidebar medications={medications} latest={latest} trend={trend} />
              {activeConditions.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                  <h3 className="font-semibold mb-3 text-sm">Active Conditions</h3>
                  <div className="flex flex-wrap gap-2">
                    {activeConditions.map((c) => (
                      <span key={c.id} className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full">
                        {c.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <SleepLogTable logs={newest} onDelete={handleDelete} formatDate={formatDate} />
        </>
      )}
    </div>
  );
}
