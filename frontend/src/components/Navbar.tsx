import { NavLink } from "react-router-dom";
import PatientSelector from "./PatientSelector";

export default function Navbar() {
  return (
    <nav className="bg-zinc-900 border-b border-zinc-700 px-6 py-3 flex items-center gap-6">
      <NavLink to="/" className="text-white font-semibold text-lg hover:text-indigo-400 transition-colors">
        SleepSync
      </NavLink>
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          isActive ? "text-indigo-400 font-medium" : "text-zinc-400 hover:text-white"
        }
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/sleep-log"
        className={({ isActive }) =>
          isActive ? "text-indigo-400 font-medium" : "text-zinc-400 hover:text-white"
        }
      >
        Sleep Log
      </NavLink>
      <NavLink
        to="/insights"
        className={({ isActive }) =>
          isActive ? "text-indigo-400 font-medium" : "text-zinc-400 hover:text-white"
        }
      >
        Insights
      </NavLink>
      <div className="ml-auto">
        <PatientSelector />
      </div>
    </nav>
  );
}
