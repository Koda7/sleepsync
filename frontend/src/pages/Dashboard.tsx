import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

type SleepLog = {
  id: number;
  patient_id: string;
  date: string;
  hours_slept: number;
  quality: number;
  stress_level: number;
  notes: string;
  woke_during_night: boolean;
  trouble_falling_asleep: boolean;
  woke_too_early: boolean;
  created_at: string;
};

type Medication = {
  name?: string;
  medication?: string;
  dosage?: string;
  timing?: string;
  status?: string;
  [key: string]: unknown;
};

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
      <p className="text-sm text-zinc-400 mb-1">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/sleep-logs/patient/1")
      .then((r) => r.json())
      .then((data: SleepLog[]) => setSleepLogs(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/fhir/patient/1/medications")
      .then((r) => r.json())
      .then((data: Medication[]) => {
        if (Array.isArray(data)) setMedications(data);
      })
      .catch(() => {});
  }, []);

  const sorted = [...sleepLogs].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1] ?? null;

  const avg = (key: keyof SleepLog) => {
    if (sorted.length === 0) return 0;
    return sorted.reduce((sum, l) => sum + (l[key] as number), 0) / sorted.length;
  };

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
      <p className="text-zinc-400 mb-6 text-sm">
        Patient-reported sleep trends, medication context, and recent patterns.
      </p>

      {sorted.length === 0 ? (
        <p className="text-zinc-400">No sleep log data available. Add a log to get started.</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <StatCard title="Avg Hours" value={avg("hours_slept").toFixed(1)} subtitle="Nightly average" />
            <StatCard title="Avg Quality" value={avg("quality").toFixed(1)} subtitle="Scale 1–5" />
            <StatCard title="Avg Stress" value={avg("stress_level").toFixed(1)} subtitle="Reported stress" />
            <StatCard title="Total Logs" value={String(sorted.length)} subtitle="Nights recorded" />
            <StatCard title="Poor Sleep" value={String(poorSleepCount)} subtitle="Quality ≤ 2" />
            <StatCard title="Disturbances" value={String(disturbanceCount)} subtitle="Any disruption" />
          </div>

          {/* Chart + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-700 rounded-xl p-5">
              <h2 className="font-semibold mb-1">Sleep Trends</h2>
              <p className="text-zinc-400 text-sm mb-4">Quality and hours slept over time</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sorted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
                  <Legend />
                  <Line type="monotone" dataKey="quality" name="Quality" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="hours_slept" name="Hours" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-4">
              {/* Medications */}
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex-1">
                <h3 className="font-semibold mb-3">Current Medications</h3>
                {medications.length === 0 ? (
                  <p className="text-zinc-400 text-sm">No medication data available.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {medications.map((med, i) => (
                      <div key={i} className="bg-zinc-800 rounded-lg p-3 text-sm">
                        <p className="font-medium">{med.name ?? med.medication ?? "Unknown"}</p>
                        {med.dosage && <p className="text-zinc-400">Dosage: {med.dosage}</p>}
                        {med.status && <p className="text-zinc-400">Status: {med.status}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Latest entry + trend */}
              {latest && (
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm">
                  <h3 className="font-semibold mb-2">Latest Entry</h3>
                  <p className="text-zinc-300">{latest.date}</p>
                  <p className="text-zinc-400">{latest.hours_slept}h · Quality {latest.quality}/5 · Stress {latest.stress_level}</p>
                </div>
              )}

              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm">
                <h3 className="font-semibold mb-1">Trend</h3>
                <p className="text-zinc-300">{trend}</p>
              </div>
            </div>
          </div>

          {/* Log table */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
            <h2 className="font-semibold mb-4">Recent Sleep Logs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-400 border-b border-zinc-700">
                    {["Date", "Hours", "Quality", "Stress", "Woke at Night", "Trouble Falling", "Woke Early"].map((h) => (
                      <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((log) => (
                    <tr key={log.id} className="border-b border-zinc-800 text-zinc-300">
                      <td className="py-2 pr-4">{log.date}</td>
                      <td className="py-2 pr-4">{log.hours_slept}</td>
                      <td className="py-2 pr-4">{log.quality}</td>
                      <td className="py-2 pr-4">{log.stress_level}</td>
                      <td className="py-2 pr-4">{log.woke_during_night ? "Yes" : "No"}</td>
                      <td className="py-2 pr-4">{log.trouble_falling_asleep ? "Yes" : "No"}</td>
                      <td className="py-2 pr-4">{log.woke_too_early ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
