import { useState, useRef, useEffect } from "react";
import { API_BASE } from "../api";
import { usePatient } from "../context/PatientContext";

type SearchResult = { id: string; name: string; birthDate: string; gender: string };

export default function PatientSelector() {
  const { patient, setPatientId, loading } = usePatient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    if (value.length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(() => {
      setSearching(true);
      fetch(`${API_BASE}/api/fhir/patients/search?name=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((data: SearchResult[]) => {
          if (Array.isArray(data)) setResults(data.slice(0, 8));
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
  }

  function selectPatient(p: SearchResult) {
    setPatientId(p.id);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm hover:border-zinc-500 transition-colors"
      >
        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-zinc-200 max-w-[160px] truncate">
          {loading ? "Loading..." : patient?.name ?? "Select patient"}
        </span>
        <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {searching && (
            <p className="text-xs text-zinc-500 px-3 pb-2">Searching FHIR server...</p>
          )}

          {results.length > 0 && (
            <ul className="max-h-60 overflow-y-auto">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => selectPatient(p)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 transition-colors ${
                      p.id === patient?.id ? "bg-zinc-800 text-indigo-400" : "text-zinc-300"
                    }`}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-zinc-500 text-xs ml-2">
                      {p.gender} · {p.birthDate}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.length >= 2 && !searching && results.length === 0 && (
            <p className="text-xs text-zinc-500 px-3 pb-3">No patients found.</p>
          )}

          {query.length < 2 && (
            <p className="text-xs text-zinc-500 px-3 pb-3">Type at least 2 characters to search.</p>
          )}
        </div>
      )}
    </div>
  );
}
