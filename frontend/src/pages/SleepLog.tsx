import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api";

type FormState = {
  date: string;
  hours_slept: number;
  quality: number;
  woke_during_night: boolean;
  trouble_falling_asleep: boolean;
  woke_too_early: boolean;
  stress_level: number;
  notes: string;
};

export default function SleepLog() {
  const [form, setForm] = useState<FormState>({
    date: new Date().toISOString().split("T")[0],
    hours_slept: 7,
    quality: 3,
    woke_during_night: false,
    trouble_falling_asleep: false,
    woke_too_early: false,
    stress_level: 3,
    notes: "",
  });

  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch(`${API_BASE}/api/sleep-logs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, patient_id: "7cd8a8ad-746b-549e-e70d-0c0feb8ebc69" }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setTimeout(() => navigate("/"), 800);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8 text-white">
      <h1 className="text-2xl font-bold mb-1">Log Your Sleep</h1>
      <p className="text-zinc-400 text-sm mb-6">Takes less than a minute.</p>

      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 flex flex-col gap-5">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
          />
        </div>

        {/* Hours slept */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Hours Slept: <span className="text-indigo-400">{form.hours_slept}h</span>
          </label>
          <input
            type="range"
            min={0}
            max={12}
            step={0.5}
            value={form.hours_slept}
            onChange={(e) => setForm({ ...form, hours_slept: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>0h</span>
            <span>12h</span>
          </div>
        </div>

        {/* Quality rating */}
        <div>
          <label className="block text-sm font-medium mb-2">Sleep Quality</label>
          <div className="flex gap-4">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="quality"
                  value={n}
                  checked={form.quality === n}
                  onChange={() => setForm({ ...form, quality: n })}
                  className="accent-indigo-500"
                />
                <span className={form.quality === n ? "text-indigo-400 text-sm font-medium" : "text-zinc-400 text-sm"}>
                  {n}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-1">1 = Very poor · 5 = Excellent</p>
        </div>

        {/* Disturbances */}
        <div>
          <label className="block text-sm font-medium mb-2">Disturbances</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.woke_during_night}
                onChange={(e) => setForm({ ...form, woke_during_night: e.target.checked })}
                className="accent-indigo-500 w-4 h-4"
              />
              Woke during the night
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.trouble_falling_asleep}
                onChange={(e) => setForm({ ...form, trouble_falling_asleep: e.target.checked })}
                className="accent-indigo-500 w-4 h-4"
              />
              Trouble falling asleep
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.woke_too_early}
                onChange={(e) => setForm({ ...form, woke_too_early: e.target.checked })}
                className="accent-indigo-500 w-4 h-4"
              />
              Woke up too early
            </label>
          </div>
        </div>

        {/* Stress level */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Stress Level: <span className="text-indigo-400">{form.stress_level}/5</span>
          </label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={form.stress_level}
            onChange={(e) => setForm({ ...form, stress_level: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Anything worth noting about last night..."
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-indigo-500 placeholder:text-zinc-500"
          />
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
        >
          {status === "submitting" ? "Saving..." : "Save Entry"}
        </button>

        {status === "success" && <p className="text-green-400 text-sm text-center">Saved!</p>}
        {status === "error" && <p className="text-red-400 text-sm text-center">Failed to save. Is the backend running?</p>}
      </form>
    </div>
  );
}
