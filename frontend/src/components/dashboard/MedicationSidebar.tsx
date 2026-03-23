import type { Medication, SleepLog } from "../../types";

type Props = {
  medications: Medication[];
  latest: SleepLog | null;
  trend: string;
};

export default function MedicationSidebar({ medications, latest, trend }: Props) {
  return (
    <div className="flex flex-col gap-4">
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
  );
}
