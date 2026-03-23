import type { SleepLog } from "../../types";

export default function SleepLogTable({ logs }: { logs: SleepLog[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <h2 className="font-semibold mb-4">Recent Sleep Logs</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-700">
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 pr-4 font-medium">Hours</th>
              <th className="pb-2 pr-4 font-medium">Quality</th>
              <th className="pb-2 pr-4 font-medium">Stress</th>
              <th className="pb-2 pr-4 font-medium">Woke at Night</th>
              <th className="pb-2 pr-4 font-medium">Trouble Falling</th>
              <th className="pb-2 pr-4 font-medium">Woke Early</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
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
  );
}
