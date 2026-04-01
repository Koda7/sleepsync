import { useEffect, useState } from "react";
import type { SleepLog, Medication } from "../types";

const PATIENT_ID = "592912";
import StatCard from "../components/ui/StatCard";
import SleepTrendChart from "../components/dashboard/SleepTrendChart";
import MedicationSidebar from "../components/dashboard/MedicationSidebar";
import SleepLogTable from "../components/dashboard/SleepLogTable";

export default function Dashboard() {
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);

  useEffect(() => {
    fetch(`/api/sleep-logs/patient/${PATIENT_ID}`)
      .then((r) => r.json())
      .then((data: SleepLog[]) => setSleepLogs(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/fhir/patient/${PATIENT_ID}/medications`)
      .then((r) => r.json())
      .then((data: Medication[]) => { if (Array.isArray(data)) setMedications(data); })
      .catch(() => {});
  }, []);

  const sorted = [...sleepLogs].sort((a, b) => a.date.localeCompare(b.date));
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 text-white">
      <h1 className="text-2xl font-bold mb-1">Sleep Health Dashboard</h1>
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
            <MedicationSidebar medications={medications} latest={latest} trend={trend} />
          </div>

          <SleepLogTable logs={sorted} />
        </>
      )}
    </div>
  );
}
