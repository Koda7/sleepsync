import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import type { SleepLog } from "../../types";

export default function SleepTrendChart({ data }: { data: SleepLog[] }) {
  return (
    <div className="lg:col-span-2 bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <h2 className="font-semibold mb-1">Sleep Trends</h2>
      <p className="text-zinc-400 text-sm mb-4">Quality and hours slept over time</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
  );
}
