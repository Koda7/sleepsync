import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { API_BASE } from "../api";
import { usePatient } from "../context/PatientContext";

type SummaryResponse = {
  patient_id: string;
  patient_name: string;
  summary: string | null;
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
  } | null;
  features_used: number;
};

type MedicationItem = {
  id: string;
  medication: string;
  status: string;
  authoredOn?: string | null;
  dosage: string;
  intent?: string | null;
  validityStart?: string | null;
  validityEnd?: string | null;
};

type MedicationCourse = {
  key: string;
  label: string;
  fullName: string;
  dosage: string;
  intent?: string | null;
  status: "active" | "completed";
  startMs: number;
  endMs: number;
  latestOrderMs: number;
  orderCount: number;
  offset: number;
  duration: number;
};

const TIMELINE_COPY = {
  currentLegend: "Current",
  earlierLegend: "Earlier",
  currentCount: "Current meds",
  earlierCount: "Earlier meds",
  ordersCount: "Orders on record",
  latestOrder: "Latest order",
  tableTitle: "Medications marked current in the record",
  tableStatusHeader: "Record status",
  tableCurrentBadge: "Current",
  currentStatus: "Current in record",
  earlierStatus: "No current order in record",
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

type InsightsCache = {
  summary: SummaryResponse | null;
  prediction: PredictionResponse | null;
  medications: MedicationItem[];
};

const CACHE_PREFIX = "insights_";
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_BAR_MS = 45 * DAY_MS;

function readCache(patientId: string): InsightsCache | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + patientId);
    if (!raw) return null;
    return JSON.parse(raw) as InsightsCache;
  } catch { return null; }
}

function writeCache(patientId: string, data: InsightsCache) {
  try { sessionStorage.setItem(CACHE_PREFIX + patientId, JSON.stringify(data)); } catch {}
}

function parseDate(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatMonthYear(value?: number | null) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatYear(value: number) {
  return String(new Date(value).getFullYear());
}

function startOfYearMs(value: number) {
  const date = new Date(value);
  return new Date(date.getFullYear(), 0, 1).getTime();
}

function endOfYearMs(value: number) {
  const date = new Date(value);
  return new Date(date.getFullYear() + 1, 0, 1).getTime();
}

function medicationLabel(name: string) {
  return name.length > 28 ? `${name.slice(0, 26)}...` : name;
}

export default function Insights() {
  const { patientId } = usePatient();
  const cached = readCache(patientId);
  const [summary, setSummary] = useState<SummaryResponse | null>(cached?.summary ?? null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(cached?.prediction ?? null);
  const [medications, setMedications] = useState<MedicationItem[]>(cached?.medications ?? []);
  const [loadingSummary, setLoadingSummary] = useState(!cached?.summary);
  const [loadingPrediction, setLoadingPrediction] = useState(!cached?.prediction);

  useEffect(() => {
    const existing = readCache(patientId);
    const hasRealData =
      existing?.summary?.summary &&
      existing?.prediction?.prediction &&
      (existing?.summary?.stats?.total_logs ?? 0) > 0;

    if (hasRealData) {
      setSummary(existing.summary);
      setPrediction(existing.prediction);
      setMedications(existing.medications ?? []);
      setLoadingSummary(false);
      setLoadingPrediction(false);
    } else {
      setSummary(null);
      setPrediction(null);
      setMedications(existing?.medications ?? []);
      setLoadingSummary(true);
      setLoadingPrediction(true);

      const entry: InsightsCache = {
        summary: existing?.summary ?? null,
        prediction: existing?.prediction ?? null,
        medications: existing?.medications ?? [],
      };

      fetch(`${API_BASE}/api/insights/summary/${patientId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d) {
            setSummary(d.summary ? d : null);
            entry.summary = d.summary ? d : null;
            writeCache(patientId, entry);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingSummary(false));

      fetch(`${API_BASE}/api/insights/prediction/${patientId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d) {
            setPrediction(d.prediction ? d : null);
            entry.prediction = d.prediction ? d : null;
            writeCache(patientId, entry);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingPrediction(false));
    }

    const medEntry: InsightsCache = {
      summary: existing?.summary ?? null,
      prediction: existing?.prediction ?? null,
      medications: existing?.medications ?? [],
    };

    fetch(`${API_BASE}/api/fhir/patient/${patientId}/medications`)
      .then((r) => r.json())
      .then((data: MedicationItem[]) => {
        if (Array.isArray(data)) {
          setMedications(data);
          medEntry.medications = data;
          writeCache(patientId, medEntry);
        }
      })
      .catch(() => {});
  }, [patientId]);

  const risk = prediction?.prediction;
  const riskStyle = RISK_COLORS[risk?.risk_level ?? "moderate"];
  const stats = summary?.stats;
  const trendInfo = TREND_LABELS[stats?.trend ?? "stable"];
  const nowMs = Date.now();

  const medTimeline = useMemo<MedicationCourse[]>(() => {
    const grouped = new Map<string, {
      fullName: string;
      dosage: string;
      intent?: string | null;
      hasActive: boolean;
      startMs: number;
      latestOrderMs: number;
      explicitEndMs: number | null;
      orderCount: number;
    }>();

    for (const med of medications) {
      if (!med.medication || med.medication === "Unknown") continue;

      const authoredMs = parseDate(med.authoredOn);
      const validityStartMs = parseDate(med.validityStart);
      const validityEndMs = parseDate(med.validityEnd);
      const startMs = validityStartMs ?? authoredMs ?? validityEndMs;
      const eventMs = authoredMs ?? validityStartMs ?? validityEndMs;

      if (!startMs && !eventMs && !validityEndMs) continue;

      const key = `${med.medication}__${med.dosage || ""}`;
      const existing = grouped.get(key);
      const resolvedStartMs = startMs ?? eventMs ?? validityEndMs ?? nowMs;
      const resolvedEventMs = eventMs ?? validityEndMs ?? resolvedStartMs;

      if (existing) {
        existing.startMs = Math.min(existing.startMs, resolvedStartMs);
        existing.latestOrderMs = Math.max(existing.latestOrderMs, resolvedEventMs);
        existing.orderCount += 1;
        if (validityEndMs != null) {
          existing.explicitEndMs = existing.explicitEndMs == null
            ? validityEndMs
            : Math.max(existing.explicitEndMs, validityEndMs);
        }
        if (med.status === "active") existing.hasActive = true;
        if (!existing.intent && med.intent) existing.intent = med.intent;
      } else {
        grouped.set(key, {
          fullName: med.medication,
          dosage: med.dosage || "",
          intent: med.intent,
          hasActive: med.status === "active",
          startMs: resolvedStartMs,
          latestOrderMs: resolvedEventMs,
          explicitEndMs: validityEndMs ?? null,
          orderCount: 1,
        });
      }
    }

    return [...grouped.entries()]
      .map(([key, group]) => {
        const status = group.hasActive ? "active" as const : "completed" as const;
        const rawEndMs = group.explicitEndMs ?? (status === "active" ? nowMs : group.latestOrderMs);
        const endMs = Math.max(rawEndMs, group.startMs + DAY_MS);

        return {
          key,
          label: medicationLabel(group.fullName),
          fullName: group.fullName,
          dosage: group.dosage,
          intent: group.intent,
          status,
          startMs: group.startMs,
          endMs,
          latestOrderMs: group.latestOrderMs,
          orderCount: group.orderCount,
          offset: group.startMs,
          duration: Math.max(endMs - group.startMs, MIN_BAR_MS),
        };
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        return b.latestOrderMs - a.latestOrderMs;
      });
  }, [medications, nowMs]);

  const activeMeds = medTimeline.filter((m) => m.status === "active");
  const activeTimelineCount = activeMeds.length;
  const completedTimelineCount = medTimeline.filter((m) => m.status === "completed").length;
  const totalOrderCount = medTimeline.reduce((sum, med) => sum + med.orderCount, 0);
  const latestMedicationOrderMs = medTimeline.length > 0
    ? Math.max(...medTimeline.map((m) => m.latestOrderMs))
    : null;
  const timelineMin = medTimeline.length > 0
    ? startOfYearMs(Math.min(...medTimeline.map((m) => m.startMs)))
    : startOfYearMs(nowMs);
  const timelineMax = medTimeline.length > 0
    ? endOfYearMs(Math.max(nowMs, ...medTimeline.map((m) => m.endMs)))
    : endOfYearMs(nowMs);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 text-white">
      <h1 className="text-2xl font-bold mb-1">Insights</h1>
      <p className="text-zinc-400 text-sm mb-8">
        AI-generated sleep analysis, ML risk prediction, and medication history.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* AI Summary + Stats */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
          <h2 className="font-semibold mb-4">AI Sleep Summary</h2>

          {loadingSummary ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm py-8">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating summary...
            </div>
          ) : summary?.summary ? (
            <>
              <p className="text-zinc-300 text-sm leading-relaxed mb-5">
                {summary.summary}
              </p>

              {stats && stats.avg_hours != null && (
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
                      <p className="text-2xl font-bold text-white">{stats.avg_hours.toFixed(1)}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Avg Hours</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">{stats.avg_quality.toFixed(1)}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Avg Quality</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">{stats.avg_stress.toFixed(1)}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Avg Stress</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">{stats.total_logs}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Total Logs</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-400">{stats.poor_nights ?? 0}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Poor Nights</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-400">{stats.disturbance_nights ?? 0}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Disturbances</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-zinc-400 text-sm mb-3">No sleep data available yet.</p>
              <Link to="/sleep-log" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
                Log your first night to generate insights &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* ML Prediction / Risk Card */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Sleep Quality Prediction</h2>

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
                  <div className="mb-2">
                    <span className={`text-sm font-semibold uppercase ${riskStyle.text}`}>
                      {risk.risk_level} risk
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm">
                    Based on {prediction?.features_used ?? 0} features from sleep logs, FHIR conditions, medications, and demographics.
                  </p>
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
            <div className="text-center py-6">
              <p className="text-zinc-400 text-sm mb-3">Not enough sleep data for a prediction.</p>
              <Link to="/sleep-log" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
                Start logging to enable predictions &rarr;
              </Link>
            </div>
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
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> {TIMELINE_COPY.currentLegend}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-zinc-600" /> {TIMELINE_COPY.earlierLegend}
            </span>
          </div>
        </div>

        {medTimeline.length > 0 ? (
          <div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
              <div className="bg-zinc-800/40 rounded-lg px-3 py-2">
                <p className="text-lg font-semibold text-white">{activeTimelineCount}</p>
                <p className="text-xs text-zinc-500">{TIMELINE_COPY.currentCount}</p>
              </div>
              <div className="bg-zinc-800/40 rounded-lg px-3 py-2">
                <p className="text-lg font-semibold text-white">{completedTimelineCount}</p>
                <p className="text-xs text-zinc-500">{TIMELINE_COPY.earlierCount}</p>
              </div>
              <div className="bg-zinc-800/40 rounded-lg px-3 py-2">
                <p className="text-lg font-semibold text-white">{totalOrderCount}</p>
                <p className="text-xs text-zinc-500">{TIMELINE_COPY.ordersCount}</p>
              </div>
              <div className="bg-zinc-800/40 rounded-lg px-3 py-2">
                <p className="text-lg font-semibold text-white">
                  {latestMedicationOrderMs ? formatMonthYear(latestMedicationOrderMs) : "—"}
                </p>
                <p className="text-xs text-zinc-500">{TIMELINE_COPY.latestOrder}</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={Math.max(medTimeline.length * 54 + 42, 180)}>
              <BarChart data={medTimeline} layout="vertical" margin={{ left: 8, right: 20, top: 6, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[timelineMin, timelineMax]}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  tickFormatter={(value) => formatYear(Number(value))}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "#d4d4d8", fontSize: 11 }}
                  width={190}
                  interval={0}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  content={({ active, payload }) => {
                    const course = payload?.find((item) => item.dataKey === "duration")?.payload as MedicationCourse | undefined;
                    if (!active || !course) return null;

                    return (
                      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg max-w-xs">
                        <p className="text-sm font-medium text-white break-words">{course.fullName}</p>
                        {course.dosage && (
                          <p className="text-xs text-zinc-400 mt-1">{course.dosage}</p>
                        )}
                        <div className="mt-2 space-y-1 text-xs text-zinc-300">
                          <p className={course.status === "active" ? "text-indigo-300" : "text-zinc-300"}>
                            {course.status === "active" ? TIMELINE_COPY.currentStatus : TIMELINE_COPY.earlierStatus}
                          </p>
                          <p>
                            Span shown: {formatMonthYear(course.startMs)} - {course.status === "active" ? "Today" : formatMonthYear(course.endMs)}
                          </p>
                          <p>Orders in this row: {course.orderCount}</p>
                          <p>Latest recorded order: {formatMonthYear(course.latestOrderMs)}</p>
                          {course.intent && <p>Request type: {course.intent}</p>}
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  x={nowMs}
                  stroke="#818cf8"
                  strokeDasharray="3 3"
                  label={{ value: "Now", fill: "#818cf8", fontSize: 10 }}
                />
                <Bar dataKey="offset" stackId="timeline" fill="transparent" barSize={20} />
                <Bar dataKey="duration" stackId="timeline" radius={[0, 6, 6, 0]} barSize={20}>
                  {medTimeline.map((entry) => (
                    <Cell key={entry.key} fill={entry.status === "active" ? "#818cf8" : "#52525b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <p className="text-[11px] text-zinc-500 mt-4">
              Each row combines matching medication orders for the same medication and dosage. Bars show the first and last dates found in the record, and current rows extend to today.
            </p>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm py-4">No medication data available.</p>
        )}
      </div>

      {/* Active Medications Table */}
      {activeMeds.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
          <h2 className="font-semibold mb-4">{TIMELINE_COPY.tableTitle}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-700">
                  <th className="text-left py-2 pr-4">Medication</th>
                  <th className="text-left py-2 pr-4">Dosage</th>
                  <th className="text-left py-2 pr-4">First record</th>
                  <th className="text-left py-2 pr-4">Latest Order</th>
                  <th className="text-left py-2 pr-4">Orders</th>
                  <th className="text-left py-2">{TIMELINE_COPY.tableStatusHeader}</th>
                </tr>
              </thead>
              <tbody>
                {activeMeds.map((m) => (
                  <tr key={m.key} className="border-b border-zinc-800 last:border-0">
                    <td className="py-3 pr-4 text-zinc-200">{m.fullName}</td>
                    <td className="py-3 pr-4 text-zinc-400">{m.dosage || "—"}</td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {formatMonthYear(m.startMs)}
                    </td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {formatMonthYear(m.latestOrderMs)}
                    </td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {m.orderCount}
                    </td>
                    <td className="py-3">
                      <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full ring-1 ring-emerald-500/30">
                        {TIMELINE_COPY.tableCurrentBadge}
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
