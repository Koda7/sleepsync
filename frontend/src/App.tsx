import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PatientProvider } from "./context/PatientContext";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import SleepLog from "./pages/SleepLog";
import Insights from "./pages/Insights";

export default function App() {
  return (
    <BrowserRouter>
      <PatientProvider>
        <div className="min-h-screen bg-zinc-950 text-white">
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sleep-log" element={<SleepLog />} />
            <Route path="/insights" element={<Insights />} />
          </Routes>
        </div>
      </PatientProvider>
    </BrowserRouter>
  );
}
