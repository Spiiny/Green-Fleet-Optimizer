import { useState, useMemo } from "react";
import { Vessel, captains } from "../../data/fleet";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import {
  Anchor,
  Compass,
  Gauge,
  Zap,
  Activity,
  Wind,
  Waves,
  Shield,
  Send,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Radio,
  Sliders,
  Maximize2,
  Minimize2,
  TrendingDown,
  Droplets,
  Layers,
  Thermometer,
  Cpu,
} from "lucide-react";

interface Props {
  vessel: Vessel;
  onUpdate?: (updated: Vessel) => void;
}

export default function VesselDashboard({ vessel, onUpdate }: Props) {
  // ── Interactive State Controls ──
  const [speedKnots, setSpeedKnots] = useState<number>(vessel.speed || 15.2);
  const [selectedFuelType, setSelectedFuelType] = useState<string>(vessel.fuelType || "LNG (Dual-Fuel)");
  const [fuelBlendRatio, setFuelBlendRatio] = useState<number>(85); // 85% Green Fuel / 15% Pilot Fuel
  const [bowBallastMeters, setBowBallastMeters] = useState<number>(1.2);
  const [aftBallastMeters, setAftBallastMeters] = useState<number>(2.4);
  const [operationalMode, setOperationalMode] = useState<"eco" | "optimal" | "charter" | "storm">("optimal");
  const [activeChartMetric, setActiveChartMetric] = useState<"fuel" | "speed" | "cii" | "power">("fuel");
  const [bridgeMessage, setBridgeMessage] = useState<string>("");
  const [messageLogs, setMessageLogs] = useState<{ time: string; text: string; sender: string }[]>([
    { time: "09:42", text: "Optimal route waypoint Bravo-4 acknowledged. Auto-pilot locked.", sender: "Bridge" },
    { time: "08:15", text: "Scavenge air pressure nominal. Main engine MCR stabilized at 72%.", sender: "Chief Eng" },
  ]);
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const [showSatcomModal, setShowSatcomModal] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Captain information
  const captain = captains.find((c) => c.id === vessel.captainId) || captains[0];

  // ── Dynamic Physical Computations (Physics-ML Engine) ──
  // Base reference values
  const baseSpeed = 15.0;
  const speedRatio = speedKnots / baseSpeed;

  // Cubic fuel kinetics: F = F0 * (v/v0)^2.85 adjusted for hull trim & fuel blend
  const trimPenaltyFactor = useMemo(() => {
    const trimDiff = aftBallastMeters - bowBallastMeters;
    // Optimal dynamic trim is around 1.1m aft trim for this vessel hull
    const devFromOpt = Math.abs(trimDiff - 1.1);
    return 1.0 + devFromOpt * 0.025; // 2.5% penalty per meter deviation
  }, [bowBallastMeters, aftBallastMeters]);

  // Fuel efficiency factor based on selected fuel type
  const fuelFactor = useMemo(() => {
    switch (selectedFuelType) {
      case "LNG (Dual-Fuel)":
        return 0.82; // 18% lower carbon intensity
      case "Bio-Methanol":
        return 0.74; // 26% lower net carbon intensity
      case "Green Ammonia":
        return 0.65; // 35% lower net GHG
      case "MGO / LSFO":
      default:
        return 1.0;
    }
  }, [selectedFuelType]);

  // Calculated hourly and daily fuel burn
  const currentFuelBurnTonsPerDay = useMemo(() => {
    const raw = vessel.fuelConsumption.voyage * Math.pow(speedRatio, 2.85) * trimPenaltyFactor;
    return parseFloat(raw.toFixed(1));
  }, [vessel.fuelConsumption.voyage, speedRatio, trimPenaltyFactor]);

  // Calculated CO2 emissions per day (tCO2/d)
  const currentEmissionsTonsPerDay = useMemo(() => {
    const co2Factor = selectedFuelType.includes("LNG") ? 2.75 : selectedFuelType.includes("Methanol") ? 1.38 : 3.15;
    const blendEff = (fuelBlendRatio / 100) * fuelFactor + (1 - fuelBlendRatio / 100) * 1.0;
    const val = currentFuelBurnTonsPerDay * co2Factor * blendEff;
    return parseFloat(val.toFixed(1));
  }, [currentFuelBurnTonsPerDay, selectedFuelType, fuelBlendRatio, fuelFactor]);

  // Live IMO CII Rating calculation
  const ciiGrade = useMemo(() => {
    if (currentEmissionsTonsPerDay < 38) return { rating: "A", label: "Superior CII", color: "#2E9B68", bg: "#EAF7F0" };
    if (currentEmissionsTonsPerDay < 52) return { rating: "B", label: "Compliant CII", color: "#182350", bg: "#EAF4FE" };
    if (currentEmissionsTonsPerDay < 68) return { rating: "C", label: "Moderate CII", color: "#B9915E", bg: "#FEF7EC" };
    if (currentEmissionsTonsPerDay < 85) return { rating: "D", label: "Marginal CII", color: "#E07A5F", bg: "#FDF2EE" };
    return { rating: "E", label: "Non-Compliant", color: "#C94B4B", bg: "#FDECEC" };
  }, [currentEmissionsTonsPerDay]);

  // Calculated ETA and Remaining Nautical Miles
  const totalDistanceNM = 3200;
  const remainingDistanceNM = useMemo(() => {
    return Math.round(totalDistanceNM * (1 - vessel.voyageProgress / 100));
  }, [totalDistanceNM, vessel.voyageProgress]);

  const hoursRemaining = useMemo(() => {
    return Math.round(remainingDistanceNM / (speedKnots || 15));
  }, [remainingDistanceNM, speedKnots]);

  const etaDate = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + hoursRemaining);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }, [hoursRemaining]);

  // Engine MCR Load percentage
  const engineMCRPercent = useMemo(() => {
    return Math.min(98, Math.round(Math.pow(speedRatio, 3) * 74));
  }, [speedRatio]);

  // Load Capacity Percentage
  const loadPct = Math.round((vessel.currentLoad / vessel.capacity) * 100);

  // 24-Hour Telemetry Series
  const telemetryHistory = useMemo(() => {
    const times = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "Now"];
    return times.map((t, idx) => {
      const mult = 0.92 + (idx % 3) * 0.05;
      return {
        time: t,
        fuel: parseFloat((currentFuelBurnTonsPerDay * mult * 0.0416).toFixed(2)), // tons per hour
        speed: parseFloat((speedKnots * (0.97 + (idx % 2) * 0.04)).toFixed(1)),
        cii: parseFloat((currentEmissionsTonsPerDay * mult * 0.85).toFixed(1)),
        power: Math.round(engineMCRPercent * mult),
      };
    });
  }, [currentFuelBurnTonsPerDay, speedKnots, currentEmissionsTonsPerDay, engineMCRPercent]);

  // Handle Preset Operational Mode Switch
  const handleModeChange = (mode: "eco" | "optimal" | "charter" | "storm") => {
    setOperationalMode(mode);
    let targetSpeed = 15.2;
    if (mode === "eco") targetSpeed = 13.5;
    if (mode === "optimal") targetSpeed = 15.6;
    if (mode === "charter") targetSpeed = 18.2;
    if (mode === "storm") targetSpeed = 12.0;

    setSpeedKnots(targetSpeed);

    if (onUpdate) {
      onUpdate({
        ...vessel,
        speed: targetSpeed,
        emissions: Math.round(currentEmissionsTonsPerDay),
      });
    }

    showToast(`Engaged ${mode.toUpperCase()} Operational Profile (${targetSpeed} kn)`);
  };

  // Status Style Map
  const statusStyle: Record<string, { bg: string; text: string; border: string }> = {
    Underway: { bg: "#EAF7F0", text: "#2E9B68", border: "#A8E5C4" },
    "At Anchor": { bg: "#FEF7EC", text: "#B9915E", border: "#F7D8A8" },
    "In Port": { bg: "#EAF4FE", text: "#182350", border: "#AFD2FA" },
    Standby: { bg: "#F3EBDD", text: "#737985", border: "#E6E2D8" },
  };

  const currentStatus = statusStyle[vessel.status] || statusStyle.Underway;

  // Send bridge dispatch message
  const handleSendBridgeMessage = () => {
    if (!bridgeMessage.trim()) return;
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    setMessageLogs((prev) => [{ time: now, text: bridgeMessage.trim(), sender: "Controller Desk" }, ...prev]);
    setBridgeMessage("");
    showToast("Advisory dispatched via encrypted Satcom to Bridge.");
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto select-none pb-12">
      {/* ── Toast Notification ── */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#182350] text-white px-4 py-2.5 rounded-xl shadow-2xl border border-[#AFD2FA]/30 flex items-center gap-2.5 text-xs font-mono font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle size={15} className="text-[#2E9B68]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ── SECTION 1: Flagship Tactical Header & Mission Controls ── */}
      <div
        className="p-5 sm:p-6 rounded-2xl shadow-sm border border-[#182350] transition-all"
        style={{ background: "#FFFFFF" }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Vessel Identity */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#182350] text-white flex items-center justify-center font-bold shadow-xs">
                <Anchor size={18} className="text-[#AFD2FA]" />
              </div>
              <h2 className="text-2xl font-black text-[#182350] tracking-tight font-sans">
                {vessel.name}
              </h2>
              {/* Status Badge */}
              <span
                className="text-xs font-mono font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1.5 shadow-2xs"
                style={{
                  background: currentStatus.bg,
                  color: currentStatus.text,
                  border: `1px solid ${currentStatus.border}`,
                }}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span>{vessel.status}</span>
              </span>

              {/* CII Dynamic Grade Pill */}
              <span
                className="text-xs font-mono font-black px-3 py-1 rounded-full uppercase flex items-center gap-1.5 border shadow-2xs"
                style={{
                  background: ciiGrade.bg,
                  color: ciiGrade.color,
                  borderColor: `${ciiGrade.color}40`,
                }}
              >
                <span>IMO CII CLASS: {ciiGrade.rating}</span>
              </span>
            </div>

            <div className="text-xs font-mono text-[#737985] flex flex-wrap items-center gap-x-4 gap-y-1">
              <span><strong>IMO:</strong> {vessel.imo}</span>
              <span><strong>Type:</strong> {vessel.type}</span>
              <span><strong>Flag:</strong> {vessel.flag || "Singapore"}</span>
              <span><strong>Dimensions:</strong> {vessel.length}m LOA × {vessel.beam}m Beam</span>
              <span><strong>Built:</strong> {vessel.yearBuilt}</span>
            </div>
          </div>

          {/* Right: Operational Presets & Quick Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Operational Mode Segmented Switch */}
            <div className="p-1 bg-[#FAFAF5] border border-[#182350] rounded-xl flex items-center gap-1 text-xs font-mono font-bold">
              {[
                { id: "eco", label: "Eco-Steaming", icon: "🌱" },
                { id: "optimal", label: "Quantum Opt", icon: "⚡" },
                { id: "charter", label: "Charter Max", icon: "🚀" },
                { id: "storm", label: "Storm Avoid", icon: "🌊" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    operationalMode === m.id
                      ? "bg-[#182350] text-white shadow-xs"
                      : "text-[#737985] hover:text-[#182350] hover:bg-[#ECE8DF]/50"
                  }`}
                >
                  <span>{m.icon}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>

            {/* Satcom Broadcast Button */}
            <button
              onClick={() => setShowSatcomModal(true)}
              className="p-2.5 rounded-xl bg-[#FAFAF5] hover:bg-[#EAF4FE] text-[#182350] border border-[#182350] hover:border-[#AFD2FA] transition-all cursor-pointer shadow-2xs"
              title="Open Satcom Satellite Terminal"
            >
              <Radio size={16} />
            </button>

            {/* Export Dossier Button */}
            <button
              onClick={() => setShowDossierModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase bg-[#182350] hover:bg-[#233372] text-white transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Download size={14} />
              <span className="hidden md:inline">CII Dossier</span>
            </button>
          </div>
        </div>

        {/* ── Voyage Route Ribbon ── */}
        <div className="mt-5 pt-4 border-t border-[#ECE8DF] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-3 text-xs font-mono">
            <div className="text-[10px] text-[#737985] uppercase tracking-wider font-bold">Port of Origin</div>
            <div className="font-bold text-[#182350] text-sm truncate">⚓ {vessel.origin}</div>
          </div>

          <div className="md:col-span-6 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#737985]">Voyage ID: <strong className="text-[#182350]">{vessel.voyageId}</strong></span>
              <span className="font-bold text-[#182350]">{vessel.voyageProgress}% Transited</span>
              <span className="text-[#737985]">Remaining: <strong className="text-[#182350]">{remainingDistanceNM} NM</strong></span>
            </div>
            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-[#ECE8DF] rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#182350] via-[#354992] to-[#2E9B68] transition-all duration-500 relative"
                style={{ width: `${vessel.voyageProgress}%` }}
              />
            </div>
          </div>

          <div className="md:col-span-3 text-right text-xs font-mono">
            <div className="text-[10px] text-[#737985] uppercase tracking-wider font-bold">Destination &amp; ETA</div>
            <div className="font-bold text-[#182350] text-sm truncate">{vessel.destination} ⚓</div>
            <div className="text-[11px] text-[#2E9B68] font-bold">ETA: {etaDate} ({hoursRemaining}h)</div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Live Physics Speed Throttle & Engine Telemetry ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interactive Speed Governor & Trim Kinetics (7 cols) */}
        <div
          className="lg:col-span-7 p-5 rounded-2xl shadow-sm border border-[#182350] space-y-4"
          style={{ background: "#FFFFFF" }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
            <div className="flex items-center gap-2">
              <Gauge size={18} className="text-[#182350]" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#182350]">
                Live Speed Throttle &amp; Hull Kinetics
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#2E9B68] bg-[#EAF7F0] px-2 py-0.5 rounded">
              Auto-Governor Active
            </span>
          </div>

          {/* Speed Adjuster Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#737985] font-bold uppercase">Transit Speed (SOG):</span>
              <span className="text-lg font-black text-[#182350] font-sans">
                {speedKnots.toFixed(1)} <span className="text-xs font-mono font-normal text-[#737985]">knots</span>
              </span>
            </div>
            <input
              type="range"
              min={10.0}
              max={22.0}
              step={0.1}
              value={speedKnots}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSpeedKnots(val);
                if (onUpdate) onUpdate({ ...vessel, speed: val });
              }}
              className="w-full h-2 bg-[#ECE8DF] rounded-lg appearance-none cursor-pointer accent-[#182350]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#737985]">
              <span>10.0 kn (Slow Steaming)</span>
              <span>15.0 kn (Service Speed)</span>
              <span>22.0 kn (Max MCR)</span>
            </div>
          </div>

          {/* Dual Ballast Hull Trim Sliders */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-[#FAFAF5] border border-[#182350] space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#737985]">Bow Draft / Ballast</span>
                <span className="font-bold text-[#182350]">{bowBallastMeters.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={4.0}
                step={0.1}
                value={bowBallastMeters}
                onChange={(e) => setBowBallastMeters(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#ECE8DF] rounded-lg appearance-none cursor-pointer accent-[#AFD2FA]"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#FAFAF5] border border-[#182350] space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#737985]">Aft Draft / Ballast</span>
                <span className="font-bold text-[#182350]">{aftBallastMeters.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={5.0}
                step={0.1}
                value={aftBallastMeters}
                onChange={(e) => setAftBallastMeters(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#ECE8DF] rounded-lg appearance-none cursor-pointer accent-[#AFD2FA]"
              />
            </div>
          </div>

          {/* Kinetic Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-[#EAF4FE] border border-[#AFD2FA]/50 text-center">
              <div className="text-[10px] font-mono text-[#737985] uppercase font-bold">Fuel Flow Rate</div>
              <div className="text-base font-extrabold text-[#182350] font-sans">
                {currentFuelBurnTonsPerDay} <span className="text-[10px] font-mono font-normal">t/day</span>
              </div>
              <div className="text-[9.5px] font-mono text-[#2E9B68]">{(currentFuelBurnTonsPerDay * 0.0416).toFixed(2)} t/hr</div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#182350] text-center">
              <div className="text-[10px] font-mono text-[#737985] uppercase font-bold">Daily CO₂ Output</div>
              <div className="text-base font-extrabold text-[#182350] font-sans">
                {currentEmissionsTonsPerDay} <span className="text-[10px] font-mono font-normal">tCO₂/d</span>
              </div>
              <div className="text-[9.5px] font-mono text-[#B9915E]">CII Index: {ciiGrade.rating}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#182350] text-center">
              <div className="text-[10px] font-mono text-[#737985] uppercase font-bold">Main Engine MCR</div>
              <div className="text-base font-extrabold text-[#182350] font-sans">
                {engineMCRPercent}%
              </div>
              <div className="text-[9.5px] font-mono text-[#737985]">84 RPM · 162 g/kWh</div>
            </div>
          </div>
        </div>

        {/* Right: Dual-Fuel Bunkering & Tank Telemetry (5 cols) */}
        <div
          className="lg:col-span-5 p-5 rounded-2xl shadow-sm border border-[#182350] space-y-4 flex flex-col justify-between"
          style={{ background: "#FFFFFF" }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
            <div className="flex items-center gap-2">
              <Droplets size={18} className="text-[#2E9B68]" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#182350]">
                Dual-Fuel Energy Transition
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#B9915E] bg-[#FEF7EC] px-2 py-0.5 rounded">
              IMO 2030 Tier III
            </span>
          </div>

          {/* Fuel Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-[#737985] uppercase font-bold">Primary Propulsion Blend</label>
            <div className="grid grid-cols-2 gap-1.5">
              {["LNG (Dual-Fuel)", "Bio-Methanol", "Green Ammonia", "MGO / LSFO"].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setSelectedFuelType(f);
                    showToast(`Propulsion Fuel set to ${f}`);
                  }}
                  className={`p-2 rounded-xl text-left text-xs font-mono font-semibold transition-all cursor-pointer border ${
                    selectedFuelType === f
                      ? "bg-[#182350] text-white border-[#182350] shadow-xs"
                      : "bg-[#FAFAF5] text-[#3F4654] border-[#182350] hover:border-[#AFD2FA]"
                  }`}
                >
                  <div className="font-bold truncate">{f}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Green Fuel Co-Firing Ratio Slider */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#EAF7F0]/40 border border-[#A8E5C4]/60">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#182350] font-bold">Alternative Fuel Injection Blend</span>
              <span className="font-extrabold text-[#2E9B68]">{fuelBlendRatio}% Eco / {100 - fuelBlendRatio}% Pilot</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              value={fuelBlendRatio}
              onChange={(e) => setFuelBlendRatio(parseInt(e.target.value))}
              className="w-full h-1.5 bg-[#A8E5C4] rounded-lg appearance-none cursor-pointer accent-[#2E9B68]"
            />
          </div>

          {/* Fuel Tanks Level Bars */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#737985]">Tank Level: <strong className="text-[#182350]">{vessel.fuelLevel}%</strong></span>
              <span className="text-[#737985]">Remaining: <strong className="text-[#182350]">{((vessel.fuelLevel / 100) * vessel.fuelCapacity).toFixed(0)} / {vessel.fuelCapacity} tonnes</strong></span>
            </div>
            <div className="h-3 w-full bg-[#ECE8DF] rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2E9B68] to-[#182350] transition-all duration-300"
                style={{ width: `${vessel.fuelLevel}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: 24h Telemetry Graphs & Cargo Holds ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Telemetry Chart with Interactive Metric Switcher (8 cols) */}
        <div
          className="lg:col-span-8 p-5 rounded-2xl shadow-sm border border-[#182350] space-y-4"
          style={{ background: "#FFFFFF" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#ECE8DF]">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-[#182350]" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#182350]">
                24-Hour Telemetry &amp; Performance Trend
              </h3>
            </div>

            {/* Metric Selector Pills */}
            <div className="flex items-center gap-1 bg-[#FAFAF5] p-1 rounded-xl border border-[#182350] text-xs font-mono font-bold">
              {[
                { id: "fuel", label: "Fuel Flow (t/h)" },
                { id: "speed", label: "SOG Speed (kn)" },
                { id: "cii", label: "CII Intensity" },
                { id: "power", label: "Engine MCR %" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChartMetric(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeChartMetric === tab.id
                      ? "bg-[#182350] text-white shadow-2xs"
                      : "text-[#737985] hover:text-[#182350]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Responsive Recharts Graph */}
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="telemetryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#182350" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#AFD2FA" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECE8DF" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: "#737985", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#737985", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#182350",
                    border: "none",
                    borderRadius: "12px",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                  }}
                  labelStyle={{ color: "#AFD2FA", fontWeight: "bold" }}
                />
                <Area
                  type="monotone"
                  dataKey={activeChartMetric}
                  stroke="#182350"
                  strokeWidth={2.5}
                  fill="url(#telemetryGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cargo Holds & 2D Stowage Weight Balance (4 cols) */}
        <div
          className="lg:col-span-4 p-5 rounded-2xl shadow-sm border border-[#182350] space-y-4"
          style={{ background: "#FFFFFF" }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-[#182350]" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#182350]">
                Cargo Holds (DWT {loadPct}%)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#182350]">
              {(vessel.currentLoad / 1000).toFixed(0)}k / {(vessel.capacity / 1000).toFixed(0)}k t
            </span>
          </div>

          {/* Holds List */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {vessel.holds.map((h, i) => {
              const holdPct = Math.round((h.currentCargo / h.capacity) * 100);
              return (
                <div key={h.id} className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#182350] space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-bold text-[#182350]">Hold #{i + 1} ({h.position})</span>
                    <span className="text-[#737985]">{h.cargoType} · {holdPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#ECE8DF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#182350] rounded-full"
                      style={{ width: `${holdPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION 4: Weather Conditions & Captain Bridge Dispatch ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Oceanic Weather & Wave Swell Radar (6 cols) */}
        <div
          className="lg:col-span-6 p-5 rounded-2xl shadow-sm border border-[#182350] space-y-4"
          style={{ background: "#FFFFFF" }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
            <div className="flex items-center gap-2">
              <Waves size={18} className="text-[#AFD2FA]" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#182350]">
                Atmospheric &amp; Wave Field Radar
              </h3>
            </div>
            <span className="text-xs font-mono text-[#737985]">Live ECMWF Feed</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#FAFAF5] border border-[#182350] text-center">
              <div className="text-[10px] font-mono text-[#737985] uppercase font-bold">Wave Swell Hs</div>
              <div className="text-lg font-black text-[#182350] font-sans">2.2 m</div>
              <div className="text-[9px] font-mono text-[#2E9B68]">Calm–Moderate</div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAFAF5] border border-[#182350] text-center">
              <div className="text-[10px] font-mono text-[#737985] uppercase font-bold">Wind Vector</div>
              <div className="text-lg font-black text-[#182350] font-sans">18 kn</div>
              <div className="text-[9px] font-mono text-[#737985]">NW 315°</div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAFAF5] border border-[#182350] text-center">
              <div className="text-[10px] font-mono text-[#737985] uppercase font-bold">Surface Current</div>
              <div className="text-lg font-black text-[#2E9B68] font-sans">+0.7 kn</div>
              <div className="text-[9px] font-mono text-[#2E9B68]">Tail Current</div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAFAF5] border border-[#182350] text-center">
              <div className="text-[10px] font-mono text-[#737985] uppercase font-bold">Sea Temp</div>
              <div className="text-lg font-black text-[#182350] font-sans">27.4°C</div>
              <div className="text-[9px] font-mono text-[#737985]">Tropical Warm</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#EAF4FE]/60 border border-[#AFD2FA]/60 text-xs font-sans text-[#182350] flex items-start gap-2.5">
            <CheckCircle size={16} className="text-[#2E9B68] shrink-0 mt-0.5" />
            <div>
              <strong>Weather Routing Advisory:</strong> Favorable following current detected along the Malacca Strait corridor. Speed governor can be dialed back to 14.8 kn to conserve 2.8t fuel while maintaining on-time port window.
            </div>
          </div>
        </div>

        {/* Master Mariner Bridge Dispatch Terminal (6 cols) */}
        <div
          className="lg:col-span-6 p-5 rounded-2xl shadow-sm border border-[#182350] space-y-4 flex flex-col justify-between"
          style={{ background: "#FFFFFF" }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#182350]" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#182350]">
                Bridge Dispatch · {captain.name}
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#2E9B68] bg-[#EAF7F0] px-2 py-0.5 rounded">
              Satcom Locked
            </span>
          </div>

          {/* Quick Message Feed */}
          <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
            {messageLogs.map((log, i) => (
              <div key={i} className="p-2 rounded-xl bg-[#FAFAF5] border border-[#182350] text-xs font-mono flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="font-bold text-[#182350]">{log.sender}:</span>
                  <p className="text-[#3F4654] font-sans text-[11px]">{log.text}</p>
                </div>
                <span className="text-[10px] text-[#737985] shrink-0">{log.time}</span>
              </div>
            ))}
          </div>

          {/* Interactive Bridge Dispatch Input */}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={bridgeMessage}
              onChange={(e) => setBridgeMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendBridgeMessage()}
              placeholder="Transmit advisory to Master Mariner..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-[#182350] text-xs font-mono focus:outline-none focus:border-[#AFD2FA] bg-[#FAFAF5]"
            />
            <button
              onClick={handleSendBridgeMessage}
              className="px-4 py-2 rounded-xl bg-[#182350] hover:bg-[#233372] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Send size={13} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: Voyage CII Compliance Dossier ── */}
      {showDossierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#182350] space-y-4 text-[#182350] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE8DF]">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-[#182350]" />
                <h3 className="text-base font-extrabold text-[#182350]">
                  IMO CII &amp; Voyage Environmental Dossier
                </h3>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="text-[#737985] hover:text-[#182350] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono bg-[#FAFAF5] p-4 rounded-xl border border-[#182350]">
              <div className="flex justify-between">
                <span>Vessel:</span> <strong className="text-[#182350]">{vessel.name} (IMO {vessel.imo})</strong>
              </div>
              <div className="flex justify-between">
                <span>Current CII Grade:</span> <strong className="text-[#2E9B68]">{ciiGrade.rating} ({ciiGrade.label})</strong>
              </div>
              <div className="flex justify-between">
                <span>Calculated Fuel Burn:</span> <strong>{currentFuelBurnTonsPerDay} tonnes/day</strong>
              </div>
              <div className="flex justify-between">
                <span>Carbon Intensity Index:</span> <strong>{currentEmissionsTonsPerDay} tCO₂/day</strong>
              </div>
              <div className="flex justify-between">
                <span>Estimated ETS Carbon Cost:</span> <strong>${(currentEmissionsTonsPerDay * 85).toFixed(0)}/day</strong>
              </div>
              <div className="flex justify-between">
                <span>Bunker Port Recommended:</span> <strong className="text-[#182350]">Singapore Eastern Anchorages</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  showToast("Dossier exported to PDF & emailed to Port Authority.");
                  setShowDossierModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-mono font-bold uppercase bg-[#2E9B68] hover:bg-[#258256] text-white transition-all cursor-pointer shadow-sm text-center"
              >
                Download Verified PDF
              </button>
              <button
                onClick={() => setShowDossierModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase bg-[#ECE8DF] hover:bg-[#E6E2D8] text-[#182350] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Satcom Terminal ── */}
      {showSatcomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#182350] space-y-4 text-[#182350] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE8DF]">
              <div className="flex items-center gap-2">
                <Radio size={18} className="text-[#2E9B68]" />
                <h3 className="text-base font-extrabold text-[#182350]">
                  Direct Satcom Link · {vessel.name}
                </h3>
              </div>
              <button
                onClick={() => setShowSatcomModal(false)}
                className="text-[#737985] hover:text-[#182350] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono text-[#3F4654]">
              <div><strong>INMARSAT Terminal ID:</strong> 456-992-101</div>
              <div><strong>Signal Strength:</strong> 99.4% (Direct Geostationary Lock)</div>
              <div><strong>Bridge IP Telephony:</strong> +870 773 209 110</div>
              <div><strong>ECDIS Encrypted Route Uplink:</strong> Active &amp; Synced</div>
            </div>

            <button
              onClick={() => {
                showToast("Bridge link refreshed. Telemetry confirmed synchronized.");
                setShowSatcomModal(false);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold uppercase bg-[#182350] hover:bg-[#233372] text-white transition-all cursor-pointer shadow-sm"
            >
              Ping Bridge ECDIS Terminal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
