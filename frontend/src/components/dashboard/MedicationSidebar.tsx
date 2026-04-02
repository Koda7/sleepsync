import type { Medication, SleepLog } from "../../types";

type Props = {
  medications: Medication[];
  latest: SleepLog | null;
  trend: string;
};

export default function MedicationSidebar({ medications, latest, trend }: Props) {
  const cleaned = medications
    .filter((m) => {
      const name = m.name ?? m.medication ?? "";
      return name !== "" && name !== "Unknown";
    })
    .reduce<Medication[]>((acc, m) => {
      const name = m.name ?? m.medication ?? "";
      if (!acc.some((x) => (x.name ?? x.medication) === name && x.status === m.status))
        acc.push(m);
      return acc;
    }, [])
    .sort((a, b) => (a.status === "active" ? -1 : 1) - (b.status === "active" ? -1 : 1));

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
        <h3 className="font-semibold mb-3 text-sm">Current Medications</h3>
        {cleaned.length === 0 ? (
          <p className="text-zinc-400 text-sm">No medication data available.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {cleaned.map((med, i) => (
              <div key={i} className="bg-zinc-800 rounded-lg p-3 text-sm">
                <p className="font-medium">{med.name ?? med.medication}</p>
                {med.dosage && <p className="text-zinc-400">Dosage: {med.dosage}</p>}
                {med.status && (
                  <p className={med.status === "active" ? "text-green-400" : "text-zinc-400"}>
                    Status: {med.status}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
    </>
  );
}
