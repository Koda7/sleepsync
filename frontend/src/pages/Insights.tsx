import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { API_BASE } from "../api";
import { usePatient } from "../context/PatientContext";

type SummaryResponse = {
  patient_id: string;
  patient_name: string;
  summary: string;
  stats: {
    total_logs: number;
    avg_hours: number;
    avg_quality: number;
    avg_stress: number;
    poor_nights: number;
    disturbance_nights: number;
    trend: string;
  };
};

type PredictionResponse = {
  patient_id: string;
  prediction: {
    predicted_quality: number;
    risk_level: string;
    confidence: number;
    top_factors: string[];
    model_type: string;
    model_accuracy: number;
  };
  features_used: number;
};

type MedicationItem = {
  id: string;
  medication: string;
  status: string;
  authoredOn: string;
  dosage: string;
};

const RISK_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  low: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/30" },
  moderate: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/30" },
  high: { bg: "bg-red-500/10", text: "text-red-400", ring: "ring-red-500/30" },
};

const TREND_LABELS: Record<string, { label: string; color: string }> = {
  improving: { label: "Improving", color: "text-emerald-400" },
  declining: { label: "Declining", color: "text-red-400" },
  stable: { label: "Stable", color: "text-zinc-300" },
};

export default function Insights() {
  const { patientId } = usePatient();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingPrediction, setLoadingPrediction] = useState(true);

  useEffect(() => {
    setSummary(null);
    setPrediction(null);
    setMedications([]);
    setLoadingSummary(true);
    setLoadingPrediction(true);

    fetch(`${API_BASE}/api/insights/summary/${patientId}`)
      .then((r) => r.json())
      .then((d) => { if (d && d.summary) setSummary(d); })
      .catch(() => {})
      .finally(() => setLoadingSummary(false));

    fetch(`${API_BASE}/api/insights/prediction/${patientId}`)
      .then((r) => r.json())
      .then((d) => { if (d && d.prediction) setPrediction(d); })
      .catch(() => {})
      .finally(() => setLoadingPrediction(false));

    fetch(`${API_BASE}/api/fhir/patient/${patientId}/medications`)
      .then((r) => r.json())
      .then((data: MedicationItem[]) => {
        if (Array.isArray(data)) setMedications(data);
      })
      .catch(() => {});
  }, [patientId]);

  const risk = prediction?.prediction;
  const riskStyle = RISK_COLORS[risk?.risk_level ?? "moderate"];
  const stats = summary?.stats;
  const trendInfo = TREND_LABELS[stats?.trend ?? "stable"];

  const activeMeds = medications
    .filter((m) => m.status === "active" && m.medication !== "Unknown")
    .reduce<MedicationItem[]>((acc, m) => {
      if (!acc.find((x) => x.medication === m.medication)) acc.push(m);
      return acc;
    }, []);

  const medTimeline = medications
    .filter((m) => m.medication !== "Unknown" && m.authoredOn)
    .reduce<{ name: string; year: number; status: string }[]>((acc, m) => {
      const name = m.medication.split(" ").slice(0, 2).join(" ");
      const year = new Date(m.authoredOn).getFullYear();
      if (!acc.find((x) => x.name === name && x.year === year)) {
        acc.push({ name, year, status: m.status });
      }
      return acc;
    }, [])
    .sort((a, b) => a.year - b.year);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 text-white">
      <h1 className="text-2xl font-bold mb-1">Insights</h1>
      <p className="text-zinc-400 text-sm mb-8">
        AI-generated sleep analysis, ML risk prediction, and medication history.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* AI Summary + Stats */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">AI Sleep Summary</h2>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full ring-1 ring-indigo-500/30">
              Llama 3.2
            </span>
          </div>

          {loadingSummary ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm py-8">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating summary...
            </div>
          ) : summary ? (
            <>
              <p className="text-zinc-300 text-sm leading-relaxed mb-5">
                {summary.summary}
              </p>

              <div className="border-t border-zinc-700 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Supporting Evidence</h3>
                  {trendInfo && (
                    <span className={`text-xs font-medium ${trendInfo.color}`}>
                      {trendInfo.label}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats!.avg_hours.toFixed(1)}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Avg Hours</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats!.avg_quality.toFixed(1)}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Avg Quality</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats!.avg_stress.toFixed(1)}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Avg Stress</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats!.total_logs}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Total Logs</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{stats!.poor_nights}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Poor Nights</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-400">{stats!.disturbance_nights}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Disturbances</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-zinc-500 text-sm">Unable to load summary.</p>
          )}
        </div>

        {/* ML Prediction / Risk Card */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Sleep Quality Prediction</h2>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
              {risk?.model_type ?? "ML"} · {((risk?.model_accuracy ?? 0) * 100).toFixed(0)}% accuracy
            </span>
          </div>

          {loadingPrediction ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm py-8">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running prediction...
            </div>
          ) : risk ? (
            <>
              <div className="flex items-start gap-5 mb-6">
                {/* Quality score */}
                <div className="flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ring-2 ${riskStyle.ring} ${riskStyle.bg}`}>
                    <span className={`text-3xl font-bold ${riskStyle.text}`}>{risk.predicted_quality}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">out of 5</p>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-semibold uppercase ${riskStyle.text}`}>
                      {risk.risk_level} risk
                    </span>
                    <span className="text-xs text-zinc-500">
                      {(risk.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm">
                    Based on {prediction!.features_used} features from sleep logs, FHIR conditions, medications, and demographics.
                  </p>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Model confidence</span>
                  <span>{(risk.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      risk.risk_level === "low" ? "bg-emerald-500" :
                      risk.risk_level === "moderate" ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${risk.confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Top factors */}
              {risk.top_factors.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Contributing Factors</h3>
                  <ul className="space-y-2">
                    {risk.top_factors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          risk.risk_level === "low" ? "bg-emerald-500" :
                          risk.risk_level === "moderate" ? "bg-amber-500" : "bg-red-500"
                        }`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-zinc-500 text-sm">Unable to load prediction.</p>
          )}
        </div>
      </div>

      {/* Medication Timeline */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Medication Timeline</h2>
            <p className="text-zinc-400 text-sm mt-1">Prescription history from FHIR records</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Active
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-zinc-600" /> Completed
            </span>
          </div>
        </div>

        {medTimeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={medTimeline} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
              <XAxis
                type="number"
                domain={["dataMin - 1", "dataMax + 1"]}
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(v) => String(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                width={110}
              />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 12, borderRadius: 8 }}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as { name: string; year: number; status: string };
                  return (
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
                      <p className="text-sm font-medium text-white">{d.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Prescribed: {d.year}
                      </p>
                      <p className="text-xs mt-0.5">
                        <span className={d.status === "active" ? "text-indigo-400" : "text-zinc-500"}>
                          {d.status === "active" ? "● Active" : "● Completed"}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <ReferenceLine x={new Date().getFullYear()} stroke="#818cf8" strokeDasharray="3 3" label={{ value: "Now", fill: "#818cf8", fontSize: 10 }} />
              <Bar
                dataKey="year"
                radius={[0, 4, 4, 0]}
                barSize={16}
              >
                {medTimeline.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.status === "active" ? "#818cf8" : "#52525b"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-zinc-500 text-sm py-4">No medication data available.</p>
        )}
      </div>

      {/* Active Medications Table */}
      {activeMeds.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Current Active Medications</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-700">
                  <th className="text-left py-2 pr-4">Medication</th>
                  <th className="text-left py-2 pr-4">Dosage</th>
                  <th className="text-left py-2 pr-4">Since</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeMeds.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-800 last:border-0">
                    <td className="py-3 pr-4 text-zinc-200">{m.medication}</td>
                    <td className="py-3 pr-4 text-zinc-400">{m.dosage || "—"}</td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {m.authoredOn ? new Date(m.authoredOn).getFullYear() : "—"}
                    </td>
                    <td className="py-3">
                      <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full ring-1 ring-emerald-500/30">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
