import { useState, useRef, useEffect } from "react";
import { API_BASE } from "../api";
import { usePatient } from "../context/PatientContext";

type SearchResult = { id: string; name: string; birthDate: string; gender: string };

const RECENT_KEY = "sleepsync_recent_patients";
const MAX_RECENT = 5;

function loadRecent(): SearchResult[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(p: SearchResult) {
  const list = loadRecent().filter((r) => r.id !== p.id);
  list.unshift(p);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

function formatDob(d: string | null | undefined) {
  if (!d || !d.includes("-")) return "Unknown";
  const [y, m, day] = d.split("-").map(Number);
  if (isNaN(y)) return "Unknown";
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PatientSelector() {
  const { patient, setPatientId, loading } = usePatient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<SearchResult[]>(loadRecent);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (patient) saveRecent(patient);
  }, [patient]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleOpen() {
    setOpen(!open);
    if (!open) setRecent(loadRecent());
  }

  function handleSearch(value: string) {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    if (value.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(() => {
      fetch(`${API_BASE}/api/fhir/patients/search?name=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((data: SearchResult[]) => {
          if (Array.isArray(data)) setResults(data.slice(0, 10));
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
  }

  function selectPatient(p: SearchResult) {
    saveRecent(p);
    setPatientId(p.id);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  const isSearching = query.length >= 1;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm hover:border-zinc-500 transition-colors"
      >
        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-zinc-200 max-w-[160px] truncate">
          {loading ? "Loading..." : patient?.name ?? "Select patient"}
        </span>
        <svg className={`w-3 h-3 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search patients by name..."
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Recent patients (shown when not searching) */}
          {!isSearching && recent.length > 0 && (
            <>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-3 pt-1 pb-1">
                Recent Patients
              </p>
              <ul className="max-h-72 overflow-y-auto pb-1">
                {recent.map((p) => (
                  <PatientRow key={p.id} p={p} active={p.id === patient?.id} onSelect={selectPatient} />
                ))}
              </ul>
            </>
          )}

          {!isSearching && recent.length === 0 && (
            <p className="text-xs text-zinc-500 px-3 pb-3">
              Type a patient name to search the FHIR server.
            </p>
          )}

          {/* Search results */}
          {isSearching && searching && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 px-3 py-3">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching FHIR server (may take a moment)...
            </div>
          )}

          {isSearching && !searching && results.length > 0 && (
            <ul className="max-h-72 overflow-y-auto pb-1">
              {results.map((p) => (
                <PatientRow key={p.id} p={p} active={p.id === patient?.id} onSelect={selectPatient} />
              ))}
            </ul>
          )}

          {isSearching && !searching && results.length === 0 && (
            <p className="text-xs text-zinc-500 px-3 pb-3">No patients found for "{query}".</p>
          )}
        </div>
      )}
    </div>
  );
}

function PatientRow({ p, active, onSelect }: { p: SearchResult; active: boolean; onSelect: (p: SearchResult) => void }) {
  return (
    <li>
      <button
        onClick={() => onSelect(p)}
        className={`w-full text-left px-3 py-2.5 hover:bg-zinc-800 transition-colors ${active ? "bg-zinc-800/60" : ""}`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${active ? "text-indigo-400" : "text-zinc-200"}`}>
            {p.name}
          </span>
          {active && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">Active</span>
          )}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">
          {p.gender === "male" ? "Male" : p.gender === "female" ? "Female" : p.gender || "Unknown"}
          {p.birthDate ? ` · Born ${formatDob(p.birthDate)}` : ""}
        </div>
      </button>
    </li>
  );
}
