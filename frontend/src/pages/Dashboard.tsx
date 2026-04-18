import { useEffect, useState } from "react";
import type { SleepLog, Medication } from "../types";
import { API_BASE } from "../api";
import { usePatient } from "../context/PatientContext";
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

type ConditionItem = { id: string; code: string; clinicalStatus: string };

export default function Dashboard() {
  const { patientId, patient } = usePatient();
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [conditions, setConditions] = useState<ConditionItem[]>([]);
  const [conditionsLoading, setConditionsLoading] = useState(true);

  useEffect(() => {
    setSleepLogs([]);
    setMedications([]);
    setConditions([]);
    setConditionsLoading(true);

    fetch(`${API_BASE}/api/sleep-logs/patient/${patientId}`)
      .then((r) => r.json())
      .then((data: SleepLog[]) => { if (Array.isArray(data)) setSleepLogs(data); })
      .catch(() => {});

    fetch(`${API_BASE}/api/fhir/patient/${patientId}/medications`)
      .then((r) => r.json())
      .then((data: Medication[]) => { if (Array.isArray(data)) setMedications(data); })
      .catch(() => {});

    fetch(`${API_BASE}/api/fhir/patient/${patientId}/conditions`)
      .then((r) => r.json())
      .then((data: ConditionItem[]) => { if (Array.isArray(data)) setConditions(data); })
      .catch(() => {})
      .finally(() => setConditionsLoading(false));
  }, [patientId]);

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
        <p className="text-zinc-400 mb-6">No sleep log data available. Add a log to get started.</p>
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
            </div>
          </div>

          <SleepLogTable logs={newest} onDelete={handleDelete} formatDate={formatDate} />
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <h3 className="font-semibold mb-3 text-sm">Active Conditions</h3>
          {conditionsLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <span key={i} className="bg-zinc-800 rounded-full h-6 w-24 animate-pulse" />
              ))}
            </div>
          ) : activeConditions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeConditions.map((c) => (
                <span key={c.id} className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full">
                  {c.code}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-xs">No active conditions on file.</p>
          )}
        </div>
        {medications.length > 0 && sorted.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
            <h3 className="font-semibold mb-3 text-sm">Current Medications</h3>
            <div className="space-y-2">
              {medications.filter((m) => m.status === "active").slice(0, 5).map((m, i) => (
                <div key={String(m.medication ?? i)} className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-sm text-zinc-200 font-medium">{m.medication ?? m.name}</p>
                  <p className="text-xs text-zinc-500">Dosage: {m.dosage ?? "N/A"}</p>
                  <p className="text-xs text-green-400">Status: {m.status}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
