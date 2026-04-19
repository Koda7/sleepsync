import type { SleepLog } from "../../types";

type Props = {
  logs: SleepLog[];
  onDelete: (logId: number) => void;
  formatDate: (iso: string) => string;
};

function formatTimestamp(iso: string) {
  const utc = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(utc).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function SleepLogTable({ logs, onDelete, formatDate }: Props) {
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
              <th className="pb-2 pr-4 font-medium">Activity</th>
              <th className="pb-2 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-zinc-800 text-zinc-300 group">
                <td className="py-2 pr-4">
                  <span>{formatDate(log.date)}</span>
                  <span className="block text-[11px] text-zinc-500">Logged {formatTimestamp(log.created_at)}</span>
                </td>
                <td className="py-2 pr-4">{log.hours_slept}</td>
                <td className="py-2 pr-4">{log.quality}</td>
                <td className="py-2 pr-4">{log.stress_level}</td>
                <td className="py-2 pr-4">{log.woke_during_night ? "Yes" : "No"}</td>
                <td className="py-2 pr-4">{log.trouble_falling_asleep ? "Yes" : "No"}</td>
                <td className="py-2 pr-4">{log.woke_too_early ? "Yes" : "No"}</td>
                <td className="py-2 pr-4 text-zinc-400">{log.activity ?? "—"}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => onDelete(log.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition-opacity"
                    title="Delete entry"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
