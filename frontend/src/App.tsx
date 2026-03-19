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
  medication?: string;
  name?: string;
  dosage?: string;
  timing?: string;
  status?: string;
  authored_on?: string;
  [key: string]: any;
};

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

// Small card used to show one summary value
function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div
      style={{
        border: "1px solid #3f3f46",
        borderRadius: "14px",
        padding: "16px",
        minWidth: "180px",
        background: "#18181b",
        boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "8px" }}>
        {title}
      </div>
      <div style={{ fontSize: "30px", fontWeight: 700 }}>{value}</div>
      {subtitle ? (
        <div style={{ fontSize: "13px", color: "#a1a1aa", marginTop: "8px" }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function App() {
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);

  // Get sleep log data
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/sleep-logs/patient/1")
      .then((response) => response.json())
      .then((result: SleepLog[]) => {
        setSleepLogs(result);
      })
      .catch((error) => {
        console.error("Error fetching sleep logs:", error);
      });
  }, []);

  // Get medication data
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/fhir/patient/1/medications")
      .then((response) => response.json())
      .then((result: Medication[]) => {
        console.log("Medication API data:", result);
        if (Array.isArray(result)) {
          setMedications(result);
        } else {
          setMedications([]);
        }
      })
      .catch((error) => {
        console.error("Error fetching medications:", error);
      });
  }, []);

  // Sort logs by date so the chart and table show data in order
  const sortedSleepLogs = [...sleepLogs].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Get latest log
  let latestLog: SleepLog | null = null;
  if (sortedSleepLogs.length > 0) {
    latestLog = sortedSleepLogs[sortedSleepLogs.length - 1];
  }

  // Calculate average hours slept
  let avgHours = 0;
  if (sortedSleepLogs.length > 0) {
    const totalHours = sortedSleepLogs.reduce((sum, log) => {
      return sum + log.hours_slept;
    }, 0);
    avgHours = totalHours / sortedSleepLogs.length;
  }

  // Calculate average sleep quality
  let avgQuality = 0;
  if (sortedSleepLogs.length > 0) {
    const totalQuality = sortedSleepLogs.reduce((sum, log) => {
      return sum + log.quality;
    }, 0);
    avgQuality = totalQuality / sortedSleepLogs.length;
  }

  // Calculate average stress
  let avgStress = 0;
  if (sortedSleepLogs.length > 0) {
    const totalStress = sortedSleepLogs.reduce((sum, log) => {
      return sum + log.stress_level;
    }, 0);
    avgStress = totalStress / sortedSleepLogs.length;
  }

  // Count nights with poor sleep quality
  const poorSleepCount = sortedSleepLogs.filter((log) => log.quality <= 2).length;

  // Count nights with any reported sleep disturbance
  const disturbanceCount = sortedSleepLogs.filter((log) => {
    return (
      log.woke_during_night ||
      log.trouble_falling_asleep ||
      log.woke_too_early
    );
  }).length;

  // Create a simple trend summary by comparing first and last quality value
  let trendSummary = "Not enough data for trend analysis.";
  if (sortedSleepLogs.length >= 2) {
    const firstQuality = sortedSleepLogs[0].quality;
    const lastQuality = sortedSleepLogs[sortedSleepLogs.length - 1].quality;

    if (lastQuality > firstQuality) {
      trendSummary = "Sleep quality is trending upward.";
    } else if (lastQuality < firstQuality) {
      trendSummary = "Sleep quality is trending downward.";
    } else {
      trendSummary = "Sleep quality is stable over time.";
    }
  }

  // Show latest note if it exists
  let latestNote = "No recent notes available.";
  if (latestLog && latestLog.notes && latestLog.notes.trim() !== "") {
    latestNote = latestLog.notes;
  }

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1350px",
        margin: "0 auto",
        color: "#f4f4f5",
      }}
    >
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px" }}>Sleep Health Dashboard</h1>
        <p style={{ color: "#a1a1aa", margin: 0 }}>
          Patient-reported sleep trends, symptom burden, medication context,
          and recent sleep patterns.
        </p>
      </div>

      {sortedSleepLogs.length === 0 ? (
        <p>No sleep log data available.</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <StatCard
              title="Average Hours"
              value={avgHours.toFixed(1)}
              subtitle="Across all logged nights"
            />
            <StatCard
              title="Average Quality"
              value={avgQuality.toFixed(1)}
              subtitle="Scale: 1 to 5"
            />
            <StatCard
              title="Average Stress"
              value={avgStress.toFixed(1)}
              subtitle="Reported stress level"
            />
            <StatCard
              title="Total Logs"
              value={String(sortedSleepLogs.length)}
              subtitle="Total nights recorded"
            />
            <StatCard
              title="Poor Sleep Nights"
              value={String(poorSleepCount)}
              subtitle="Quality score ≤ 2"
            />
            <StatCard
              title="Disturbance Nights"
              value={String(disturbanceCount)}
              subtitle="Any night disruption reported"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "20px",
              alignItems: "start",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                border: "1px solid #3f3f46",
                borderRadius: "16px",
                padding: "20px",
                background: "#18181b",
                minHeight: "460px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Sleep Trends</h2>
              <p style={{ color: "#a1a1aa", marginTop: 0 }}>
                Quality and hours slept over time
              </p>

              <div style={{ width: "100%", height: "360px" }}>
                <ResponsiveContainer>
                  <LineChart data={sortedSleepLogs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="quality"
                      name="Quality"
                      stroke="#8884d8"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours_slept"
                      name="Hours Slept"
                      stroke="#82ca9d"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div
                style={{
                  border: "1px solid #3f3f46",
                  borderRadius: "16px",
                  padding: "18px",
                  background: "#18181b",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Current Medications</h3>

                {medications.length === 0 ? (
                  <p style={{ color: "#a1a1aa", marginBottom: 0 }}>
                    No medication data available.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {medications.map((med, index) => (
                      <div
                        key={index}
                        style={{
                          border: "1px solid #27272a",
                          borderRadius: "12px",
                          padding: "12px",
                          background: "#09090b",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: "6px" }}>
                          {med.name || med.medication || "Unknown medication"}
                        </div>

                        <div style={{ fontSize: "14px", color: "#a1a1aa" }}>
                          {med.dosage ? <div>Dosage: {med.dosage}</div> : null}
                          {med.timing ? <div>Timing: {med.timing}</div> : null}
                          {med.status ? <div>Status: {med.status}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  border: "1px solid #3f3f46",
                  borderRadius: "16px",
                  padding: "18px",
                  background: "#18181b",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Latest Entry</h3>

                {latestLog ? (
                  <>
                    <p>
                      <strong>Date:</strong> {latestLog.date}
                    </p>
                    <p>
                      <strong>Hours:</strong> {latestLog.hours_slept}
                    </p>
                    <p>
                      <strong>Quality:</strong> {latestLog.quality}
                    </p>
                    <p>
                      <strong>Stress:</strong> {latestLog.stress_level}
                    </p>
                  </>
                ) : (
                  <p>No latest log available.</p>
                )}
              </div>

              <div
                style={{
                  border: "1px solid #3f3f46",
                  borderRadius: "16px",
                  padding: "18px",
                  background: "#18181b",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Trend Summary</h3>
                <p style={{ marginBottom: 0 }}>{trendSummary}</p>
              </div>

              <div
                style={{
                  border: "1px solid #3f3f46",
                  borderRadius: "16px",
                  padding: "18px",
                  background: "#18181b",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Latest Note</h3>
                <p style={{ marginBottom: 0 }}>{latestNote}</p>
              </div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #3f3f46",
              borderRadius: "16px",
              padding: "20px",
              background: "#18181b",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Recent Sleep Logs</h2>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #3f3f46",
                    }}
                  >
                    <th style={{ padding: "10px 8px" }}>Date</th>
                    <th style={{ padding: "10px 8px" }}>Hours</th>
                    <th style={{ padding: "10px 8px" }}>Quality</th>
                    <th style={{ padding: "10px 8px" }}>Stress</th>
                    <th style={{ padding: "10px 8px" }}>Woke at Night</th>
                    <th style={{ padding: "10px 8px" }}>
                      Trouble Falling Asleep
                    </th>
                    <th style={{ padding: "10px 8px" }}>Woke Too Early</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedSleepLogs.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderBottom: "1px solid #27272a" }}
                    >
                      <td style={{ padding: "10px 8px" }}>{log.date}</td>
                      <td style={{ padding: "10px 8px" }}>{log.hours_slept}</td>
                      <td style={{ padding: "10px 8px" }}>{log.quality}</td>
                      <td style={{ padding: "10px 8px" }}>{log.stress_level}</td>
                      <td style={{ padding: "10px 8px" }}>
                        {log.woke_during_night ? "Yes" : "No"}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {log.trouble_falling_asleep ? "Yes" : "No"}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {log.woke_too_early ? "Yes" : "No"}
                      </td>
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

export default App;