import { useState, useMemo } from "react";
import { Vessel, Hold } from "../../data/fleet";
import {
  Layers,
  Sliders,
  Droplets,
  Anchor,
  Compass,
  Zap,
  Gauge,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Shield,
  Plus,
} from "lucide-react";

interface Props {
  vessel: Vessel;
  onVesselUpdate: (updated: Vessel) => void;
}

const cargoTypes = [
  "LNG (Cryogenic)",
  "Iron Ore",
  "Coal",
  "Grain",
  "Chemicals",
  "Lubricants",
  "Containers (TEU)",
  "Reefer Cargo",
  "Ballast Water",
];

export default function VesselLayout2D({ vessel, onVesselUpdate }: Props) {
  const [selectedHoldId, setSelectedHoldId] = useState<string | null>(vessel.holds[0]?.id || null);
  const [cargoLoadRatio, setCargoLoadRatio] = useState<number>(
    Math.round((vessel.currentLoad / (vessel.capacity || 1)) * 100) || 75
  );
  const [fuelBunkersRatio, setFuelBunkersRatio] = useState<number>(vessel.fuelLevel || 80);
  const [trimAngleOverride, setTrimAngleOverride] = useState<number>(0.59); // in degrees: + is bow down, - is stern down
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [newCargoQty, setNewCargoQty] = useState<number>(5000);
  const [selectedCargoType, setSelectedCargoType] = useState<string>(cargoTypes[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Dynamic Physical Trim & Hydrodynamic Calculations ──
  const holds = vessel.holds;
  const totalHoldCapacity = useMemo(() => holds.reduce((s, h) => s + h.capacity, 0), [holds]);
  const currentTotalCargo = useMemo(() => holds.reduce((s, h) => s + h.currentCargo, 0), [holds]);

  // Metacentric height GM & LCG calculations based on cargo distribution and trim
  const { lcgMeter, gmHeight, trimLabel, trimColor, dragPenaltyPct } = useMemo(() => {
    const total = currentTotalCargo || 1;
    const positions: Record<string, number> = {
      fore: 0.15,
      "mid-fore": 0.35,
      mid: 0.5,
      "mid-aft": 0.65,
      aft: 0.85,
    };

    const weightedPos = holds.reduce((s, h) => s + h.currentCargo * (positions[h.position] || 0.5), 0) / total;
    const computedTrim = (0.5 - weightedPos) * 6.0 + (trimAngleOverride - 0.59);
    const absTrim = Math.abs(computedTrim);

    let label = "Balanced Trim";
    let color = "#2E9B68"; // Green
    if (absTrim > 2.2) {
      label = "High Trim Inefficiency";
      color = "#C94B4B"; // Red
    } else if (absTrim > 1.0) {
      label = "Slightly Off-Equilibrium";
      color = "#B9915E"; // Gold
    }

    // Drag penalty % (hydrodynamic resistance variation)
    // Optimal trim is slight bow down (+0.5° to +0.8°) for bulbous bow immersion
    const optDelta = Math.abs(computedTrim - 0.6);
    const dragPenalty = +(optDelta * 1.8).toFixed(1);

    return {
      lcgMeter: (vessel.length * weightedPos).toFixed(1),
      gmHeight: (2.45 - (cargoLoadRatio / 100) * 0.35).toFixed(2),
      trimLabel: label,
      trimColor: color,
      dragPenaltyPct: dragPenalty,
    };
  }, [holds, currentTotalCargo, trimAngleOverride, vessel.length, cargoLoadRatio]);

  // Active selected hold object
  const selectedHold = holds.find((h) => h.id === selectedHoldId) || holds[0];

  // Helper to trigger toast notifications
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Synchronize global cargo slider across holds proportionally
  const handleGlobalCargoSliderChange = (newPct: number) => {
    setCargoLoadRatio(newPct);
    const targetTotal = (newPct / 100) * totalHoldCapacity;
    const currentTotal = currentTotalCargo || 1;
    const ratio = targetTotal / currentTotal;

    const updatedHolds = holds.map((h) => ({
      ...h,
      currentCargo: Math.min(h.capacity, Math.round(h.currentCargo * ratio)),
    }));

    onVesselUpdate({
      ...vessel,
      holds: updatedHolds,
      currentLoad: updatedHolds.reduce((s, h) => s + h.currentCargo, 0),
    });
  };

  // Synchronize global fuel bunker slider
  const handleFuelSliderChange = (newLevel: number) => {
    setFuelBunkersRatio(newLevel);
    onVesselUpdate({
      ...vessel,
      fuelLevel: newLevel,
    });
  };

  // Quick preset button handler
  const applyPreset = (preset: "level" | "eco" | "ballast" | "laden") => {
    if (preset === "level") {
      setTrimAngleOverride(0.0);
      triggerToast("Applied Level Keel Trim (0.0°)");
    } else if (preset === "eco") {
      setTrimAngleOverride(0.59);
      triggerToast("Applied Bulbous Bow Eco-Trim (+0.59°)");
    } else if (preset === "ballast") {
      setTrimAngleOverride(-1.4);
      handleGlobalCargoSliderChange(25);
      triggerToast("Applied Ballast Water Transit Profile (-1.4° Aft)");
    } else if (preset === "laden") {
      setTrimAngleOverride(0.45);
      handleGlobalCargoSliderChange(95);
      triggerToast("Applied Full Laden Heavy Cargo Profile (95% DWT)");
    }
  };

  // Assign cargo to currently selected hold
  const handleAssignToHold = () => {
    if (!selectedHold) return;
    const updatedCargo = Math.min(selectedHold.capacity, selectedHold.currentCargo + newCargoQty);
    const updatedHolds = holds.map((h) =>
      h.id === selectedHold.id ? { ...h, currentCargo: updatedCargo, cargoType: selectedCargoType } : h
    );

    onVesselUpdate({
      ...vessel,
      holds: updatedHolds,
      currentLoad: updatedHolds.reduce((s, h) => s + h.currentCargo, 0),
    });

    triggerToast(`Added ${newCargoQty.toLocaleString()} t of ${selectedCargoType} to ${selectedHold.name}`);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto select-none pb-12">
      {/* ── Toast Alert ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#182350] text-white px-4 py-2.5 rounded-xl shadow-2xl border border-[#AFD2FA]/30 flex items-center gap-2.5 text-xs font-mono font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle size={15} className="text-[#2E9B68]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header Banner with Real-time Balance & Sliders in Right Top ── */}
      <div
        className="p-5 sm:p-6 rounded-2xl shadow-sm border border-[#182350] transition-all"
        style={{ background: "#FFFFFF" }}
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left Title & Hydrodynamic Status */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-[#737985] uppercase tracking-wider font-bold">
              HYDRODYNAMIC HOLD LAYOUT &amp; BUNKER ARCHITECTURE
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-black text-[#182350] tracking-tight font-sans">
                {vessel.name} — 2D Top-Down &amp; Dynamic Profile Anatomy
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-[#737985] pt-0.5">
              <span>
                Balance: <strong style={{ color: trimColor }}>{trimLabel}</strong>
              </span>
              <span>
                Trim:{" "}
                <strong className="text-[#182350]">
                  {trimAngleOverride >= 0 ? `+${trimAngleOverride.toFixed(2)}°` : `${trimAngleOverride.toFixed(2)}°`}{" "}
                  {trimAngleOverride >= 0 ? "(Bow Down)" : "(Stern Down)"}
                </strong>
              </span>
              <span className="hidden sm:inline">
                Metacenter GM: <strong className="text-[#182350]">{gmHeight}m</strong> (Stable)
              </span>
            </div>
          </div>

          {/* ── Right Top Sliders: Cargo, Fuel Bunkers & Trim Angle ── */}
          <div className="flex flex-wrap items-center gap-3 bg-[#FAFAF5] p-3 rounded-2xl border border-[#182350]">
            {/* Cargo Load Slider */}
            <div className="w-36 sm:w-44 space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#737985] font-bold">Cargo DWT:</span>
                <span className="font-extrabold text-[#182350]">{cargoLoadRatio}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={cargoLoadRatio}
                onChange={(e) => handleGlobalCargoSliderChange(parseInt(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #182350 0%, #182350 ${cargoLoadRatio}%, #ECE8DF ${cargoLoadRatio}%, #ECE8DF 100%)`,
                }}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#182350]"
              />
            </div>

            {/* Fuel Bunkers Slider */}
            <div className="w-36 sm:w-44 space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#737985] font-bold">Fuel Level:</span>
                <span className="font-extrabold text-[#2E9B68]">{fuelBunkersRatio}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                step={1}
                value={fuelBunkersRatio}
                onChange={(e) => handleFuelSliderChange(parseInt(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #2E9B68 0%, #2E9B68 ${fuelBunkersRatio}%, #ECE8DF ${fuelBunkersRatio}%, #ECE8DF 100%)`,
                }}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#2E9B68]"
              />
            </div>

            {/* Ballast Dynamic Trim Slider */}
            <div className="w-36 sm:w-40 space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#737985] font-bold">Trim Pitch:</span>
                <span className="font-extrabold text-[#B9915E]">
                  {trimAngleOverride >= 0 ? `+${trimAngleOverride.toFixed(1)}°` : `${trimAngleOverride.toFixed(1)}°`}
                </span>
              </div>
              {(() => {
                const trimPct = Math.min(100, Math.max(0, Math.round(((trimAngleOverride - (-2.5)) / 5.0) * 100)));
                return (
                  <input
                    type="range"
                    min={-2.5}
                    max={2.5}
                    step={0.05}
                    value={trimAngleOverride}
                    onChange={(e) => setTrimAngleOverride(parseFloat(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, #B9915E 0%, #B9915E ${trimPct}%, #ECE8DF ${trimPct}%, #ECE8DF 100%)`,
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#B9915E]"
                  />
                );
              })()}
            </div>

            {/* Quick Level Keel Reset */}
            <button
              onClick={() => applyPreset("eco")}
              className="p-2 rounded-xl bg-white hover:bg-[#EAF4FE] text-[#182350] border border-[#182350] hover:border-[#AFD2FA] transition-all cursor-pointer shadow-2xs"
              title="Reset to Optimal Eco-Trim (+0.59°)"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Workspace Grid: Prominent 2D Center Stage (8 cols) + Interactive Feature Side Navbar (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── LEFT / CENTER STAGE: Fully Visible 2D Vessel Schematic (8 cols) ── */}
        <div className="lg:col-span-8 space-y-4">
          {/* 1. TOP-DOWN HULL & HOLD SCHEMATIC */}
          <div
            className="p-5 sm:p-6 rounded-2xl shadow-sm border border-[#182350] transition-all space-y-3"
            style={{ background: "#FFFFFF" }}
          >
            {/* Compass & Orientation Legend */}
            <div className="flex items-center justify-between text-xs font-mono font-bold text-[#737985] pb-2 border-b border-[#ECE8DF]">
              <span>← STERN (AFT / BACK)</span>
              <span className="text-[#182350]">PORT ↕ STARBOARD</span>
              <span>BOW (FORE / FRONT) →</span>
            </div>

            {/* 2D Top-Down Hull SVG Drawing */}
            <div className="w-full overflow-x-auto py-2">
              <svg
                viewBox="0 0 740 180"
                className="w-full h-auto max-h-52 drop-shadow-sm select-none"
                style={{ minWidth: 580 }}
              >
                {/* Outer Hull Contour */}
                <path
                  d="M 50 25 L 560 25 Q 670 25 720 90 Q 670 155 560 155 L 50 155 Q 35 155 35 130 L 35 50 Q 35 25 50 25 Z"
                  fill="#FAFAF5"
                  stroke="#182350"
                  strokeWidth="2.5"
                />

                {/* Accommodation Bridge Block on Aft (Left) */}
                <rect
                  x="55"
                  y="40"
                  width="48"
                  height="100"
                  rx="6"
                  fill="#EAF4FE"
                  stroke="#AFD2FA"
                  strokeWidth="2"
                />
                <text
                  x="79"
                  y="94"
                  textAnchor="middle"
                  fill="#182350"
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  BRIDGE
                </text>

                {/* Central Centerline Guide */}
                <line
                  x1="105"
                  y1="90"
                  x2="700"
                  y2="90"
                  stroke="#AFD2FA"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />

                {/* Holds / Cylindrical LNG Tanks (4 Main Holds / Tanks) */}
                {holds.map((hold, i) => {
                  const cx = 175 + i * 115;
                  const cy = 90;
                  const r = 38;
                  const isSelected = selectedHoldId === hold.id;
                  const fillPct = Math.round((hold.currentCargo / hold.capacity) * 100);

                  return (
                    <g
                      key={hold.id}
                      onClick={() => setSelectedHoldId(hold.id)}
                      className="cursor-pointer group"
                    >
                      {/* Outer Ring */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={isSelected ? "#EAF4FE" : "#FFFFFF"}
                        stroke={isSelected ? "#182350" : "#AFD2FA"}
                        strokeWidth={isSelected ? "2.5" : "1.8"}
                        className="transition-all duration-200"
                      />

                      {/* Internal Dynamic Liquid Fill Arc */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r - 4}
                        fill="#AFD2FA"
                        fillOpacity={Math.max(0.15, fillPct / 100)}
                        stroke="#182350"
                        strokeWidth="0.8"
                        strokeDasharray="2 2"
                      />

                      {/* Hold Label & Fill % */}
                      <text
                        x={cx}
                        y={cy - 6}
                        textAnchor="middle"
                        fill="#182350"
                        fontSize="9.5"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {hold.name}
                      </text>
                      <text
                        x={cx}
                        y={cy + 10}
                        textAnchor="middle"
                        fill="#182350"
                        fontSize="11"
                        fontWeight="black"
                        fontFamily="monospace"
                      >
                        {fillPct}%
                      </text>
                    </g>
                  );
                })}

                {/* Bunkering Fuel Tanks along Bottom Keel */}
                <g transform="translate(130, 142)">
                  {[
                    { label: "LNG (75%)", sub: "Cryo", w: 56 },
                    { label: "LNG (75%)", sub: "Cryo", w: 56 },
                    { label: "LNG (72%)", sub: "Cryo", w: 56 },
                    { label: "LNG (72%)", sub: "Cryo", w: 56 },
                    { label: "LNG (68%)", sub: "Forced", w: 56 },
                    { label: "Conventional (80%)", sub: "Pilot", w: 70 },
                  ].map((tank, tIdx) => (
                    <g key={tIdx} transform={`translate(${tIdx * 64}, 0)`}>
                      <rect
                        x="0"
                        y="0"
                        width={tank.w}
                        height="26"
                        rx="3"
                        fill="#182350"
                        stroke="#AFD2FA"
                        strokeWidth="1"
                      />
                      <text
                        x={tank.w / 2}
                        y="10"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {tank.label}
                      </text>
                      <text
                        x={tank.w / 2}
                        y="19"
                        textAnchor="middle"
                        fill="#AFD2FA"
                        fontSize="6"
                        fontFamily="monospace"
                      >
                        {tank.sub}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>

          {/* 2. SIDE PROFILE DYNAMIC PITCH & WATERLINE SCHEMATIC */}
          <div
            className="p-5 sm:p-6 rounded-2xl shadow-sm border border-[#182350] transition-all space-y-3"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between text-xs font-mono font-bold pb-2 border-b border-[#ECE8DF]">
              <span className="text-[#182350]">SIDE PROFILE DYNAMIC PITCH &amp; WATERLINE (STERN ↔ BOW)</span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs"
                style={{ background: `${trimColor}15`, color: trimColor }}
              >
                Trim Angle: {trimAngleOverride >= 0 ? `+${trimAngleOverride.toFixed(2)}°` : `${trimAngleOverride.toFixed(2)}°`}{" "}
                {trimAngleOverride >= 0 ? "(Bow Down / Front Tilt)" : "(Stern Down / Aft Tilt)"}
              </span>
            </div>

            {/* Dynamic Animated Side View SVG */}
            <div className="w-full overflow-x-auto py-3">
              <svg
                viewBox="0 0 740 140"
                className="w-full h-auto max-h-40 drop-shadow-sm select-none"
                style={{ minWidth: 580 }}
              >
                {/* Horizontal Baseline Water Level Line */}
                <line
                  x1="10"
                  y1="90"
                  x2="730"
                  y2="90"
                  stroke="#AFD2FA"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />

                {/* Dynamic Pitch Hull Group (Rotates according to trim angle) */}
                <g
                  transform={`rotate(${trimAngleOverride}, 370, 90)`}
                  className="transition-transform duration-500"
                >
                  {/* Side Hull Silhouette */}
                  <path
                    d="M 50 75 L 50 100 L 590 100 L 710 82 L 590 75 Z"
                    fill="#FFFFFF"
                    stroke="#182350"
                    strokeWidth="2.2"
                  />

                  {/* Bridge Tower */}
                  <rect
                    x="60"
                    y="45"
                    width="40"
                    height="30"
                    rx="3"
                    fill="#EAF4FE"
                    stroke="#AFD2FA"
                    strokeWidth="1.5"
                  />

                  {/* Hold Bays in Side Profile with Liquid Fill Levels */}
                  {[
                    { x: 130, w: 90, pct: 0.53 },
                    { x: 230, w: 90, pct: 0.52 },
                    { x: 330, w: 90, pct: 1.0 },
                    { x: 430, w: 90, pct: 1.0 },
                  ].map((bay, bIdx) => (
                    <g key={bIdx}>
                      {/* Hold Cavity Box */}
                      <rect
                        x={bay.x}
                        y="78"
                        width={bay.w}
                        height="20"
                        fill="#FFFFFF"
                        stroke="#AFD2FA"
                        strokeWidth="1.2"
                      />
                      {/* Dynamic Cargo Level Fill */}
                      <rect
                        x={bay.x}
                        y={78 + (1 - bay.pct) * 20}
                        width={bay.w}
                        height={bay.pct * 20}
                        fill="#AFD2FA"
                        fillOpacity="0.75"
                      />
                    </g>
                  ))}
                </g>

                {/* Midship Axis Marker */}
                <line x1="370" y1="20" x2="370" y2="120" stroke="#E6E2D8" strokeWidth="1" strokeDasharray="3 3" />
                <text x="375" y="32" fill="#737985" fontSize="8" fontFamily="monospace">
                  Midship Axis
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* ── RIGHT-HAND SIDE NAVBAR / CONTROL PANEL (4 cols) ── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Panel 1: Hold Details & Direct Cargo Assignment */}
          <div
            className="p-5 rounded-2xl shadow-sm border border-[#182350] space-y-3"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#182350]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182350]">
                  Hold Allocation Matrix
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#182350]">
                {selectedHold.name} Selected
              </span>
            </div>

            {/* List of Individual Hold Progress Cards */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {holds.map((h) => {
                const isCurrent = h.id === selectedHoldId;
                const pct = Math.round((h.currentCargo / h.capacity) * 100);

                return (
                  <div
                    key={h.id}
                    onClick={() => setSelectedHoldId(h.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-[#EAF4FE] border-[#AFD2FA] shadow-xs"
                        : "bg-[#FAFAF5] border-[#182350] hover:border-[#AFD2FA]"
                    }`}
                  >
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="font-bold text-[#182350]">
                        {h.name} ({h.position})
                      </span>
                      <span className="font-extrabold text-[#182350]">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#ECE8DF] rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          background: isCurrent ? "#182350" : "#2E9B68",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10.5px] font-mono text-[#737985]">
                      <span>{h.cargoType}</span>
                      <span>{h.currentCargo.toLocaleString()} / {h.capacity.toLocaleString()} t</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fast Hold Assignment Form */}
            <div className="pt-2 border-t border-[#ECE8DF] space-y-2">
              <div className="text-[11px] font-mono text-[#737985] uppercase font-bold">
                Assign Cargo to {selectedHold.name}:
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCargoType}
                  onChange={(e) => setSelectedCargoType(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-xl border border-[#182350] text-xs font-mono bg-[#FAFAF5]"
                >
                  {cargoTypes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newCargoQty}
                  onChange={(e) => setNewCargoQty(parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1.5 rounded-xl border border-[#182350] text-xs font-mono text-center bg-[#FAFAF5]"
                />
              </div>
              <button
                onClick={handleAssignToHold}
                className="w-full py-2 rounded-xl text-xs font-mono font-bold uppercase bg-[#182350] hover:bg-[#233372] text-white transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                <span>Inject Cargo Load</span>
              </button>
            </div>
          </div>

          {/* Panel 2: Hydrodynamic Stability & Metacenter Gauges */}
          <div
            className="p-5 rounded-2xl shadow-sm border border-[#182350] space-y-3"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-[#2E9B68]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182350]">
                  Hydrodynamic Metacenter
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#2E9B68] bg-[#EAF7F0] px-2 py-0.5 rounded">
                Equilibrium OK
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#182350]">
                <div className="text-[10px] text-[#737985] uppercase font-bold">LCG Center</div>
                <div className="text-base font-extrabold text-[#182350] font-sans">{lcgMeter}m</div>
                <div className="text-[9.5px] text-[#2E9B68]">Nominal Midship</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#182350]">
                <div className="text-[10px] text-[#737985] uppercase font-bold">Metacenter GM</div>
                <div className="text-base font-extrabold text-[#182350] font-sans">{gmHeight}m</div>
                <div className="text-[9.5px] text-[#2E9B68]">IMO Reg Valid</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#EAF4FE] border border-[#AFD2FA]/60 text-xs font-mono flex justify-between items-center">
              <span className="text-[#182350] font-bold">Hull Drag Delta:</span>
              <span className="font-extrabold text-[#2E9B68]">
                {dragPenaltyPct > 0 ? `+${dragPenaltyPct}% drag` : "Optimal Minimum"}
              </span>
            </div>
          </div>

          {/* Panel 3: Quick Trim & Cargo Presets */}
          <div
            className="p-4 rounded-2xl shadow-sm border border-[#182350] space-y-2.5"
            style={{ background: "#FFFFFF" }}
          >
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#182350] flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#B9915E]" />
              <span>Quick Trim Presets</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applyPreset("eco")}
                className="p-2 rounded-xl text-left text-xs font-mono font-bold bg-[#FAFAF5] hover:bg-[#EAF4FE] border border-[#182350] hover:border-[#AFD2FA] transition-all cursor-pointer"
              >
                <div>🌱 Eco-Trim</div>
                <div className="text-[10px] text-[#737985] font-normal">+0.59° Bow Bulb</div>
              </button>
              <button
                onClick={() => applyPreset("level")}
                className="p-2 rounded-xl text-left text-xs font-mono font-bold bg-[#FAFAF5] hover:bg-[#EAF4FE] border border-[#182350] hover:border-[#AFD2FA] transition-all cursor-pointer"
              >
                <div>⚖ Level Keel</div>
                <div className="text-[10px] text-[#737985] font-normal">0.00° Neutral</div>
              </button>
              <button
                onClick={() => applyPreset("ballast")}
                className="p-2 rounded-xl text-left text-xs font-mono font-bold bg-[#FAFAF5] hover:bg-[#EAF4FE] border border-[#182350] hover:border-[#AFD2FA] transition-all cursor-pointer"
              >
                <div>⚓ Ballast Sea</div>
                <div className="text-[10px] text-[#737985] font-normal">-1.40° Aft Immersion</div>
              </button>
              <button
                onClick={() => applyPreset("laden")}
                className="p-2 rounded-xl text-left text-xs font-mono font-bold bg-[#FAFAF5] hover:bg-[#EAF4FE] border border-[#182350] hover:border-[#AFD2FA] transition-all cursor-pointer"
              >
                <div>📦 Full Laden</div>
                <div className="text-[10px] text-[#737985] font-normal">95% DWT Capacity</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
