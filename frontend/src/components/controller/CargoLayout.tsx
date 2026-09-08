import { useState, useEffect, useMemo } from "react";
import { vessels, Vessel } from "../../data/fleet";
import { FuelType, FUEL_DENSITIES } from "../../types/fleetManagement";
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

interface CargoLayoutProps {
  ships?: any[];
  initialSelectedId?: string;
  vessel?: Vessel;
  onSelectVessel?: (id: string) => void;
  onUpdate?: (updated: Vessel) => void;
}

interface InternalHold {
  id: string;
  name: string;
  capacity: number;
  currentCargo: number;
  cargoType: string;
  fillPercentage: number;
  position: "fore" | "mid-fore" | "mid" | "mid-aft" | "aft";
  xPos: number; // Longitudinal position (+60 = Bow/Front, -60 = Stern/Back)
}

interface InternalFuelTank {
  id: string;
  name: string;
  capacityVolume: number;
  currentVolume: number;
  currentFuel: FuelType;
  xPos: number; // Longitudinal position (+45 = Fore, 0 = Mid, -50 = Aft)
}

// 6 Realistic Fuel Bunker Compartments for each vessel type
const VESSEL_FUEL_CONFIGS: Record<string, InternalFuelTank[]> = {
  v1: [
    { id: "f1", name: "Cryo LNG Bunker 1P (Aft)", capacityVolume: 1200, currentVolume: 900, currentFuel: "LNG", xPos: -55 },
    { id: "f2", name: "Cryo LNG Bunker 1S (Aft)", capacityVolume: 1200, currentVolume: 900, currentFuel: "LNG", xPos: -55 },
    { id: "f3", name: "Cryo Deep Tank 2P (Mid)", capacityVolume: 1000, currentVolume: 720, currentFuel: "LNG", xPos: 0 },
    { id: "f4", name: "Cryo Deep Tank 2S (Mid)", capacityVolume: 1000, currentVolume: 720, currentFuel: "LNG", xPos: 0 },
    { id: "f5", name: "Forepeak Reserve Tank", capacityVolume: 600, currentVolume: 360, currentFuel: "LNG", xPos: 45 },
    { id: "f6", name: "Pilot MGO Service Tank", capacityVolume: 400, currentVolume: 320, currentFuel: "Conventional", xPos: -20 },
  ],
  v2: [
    { id: "f1", name: "Methanol Deep Bunker 1P", capacityVolume: 900, currentVolume: 540, currentFuel: "Methanol", xPos: -50 },
    { id: "f2", name: "Methanol Deep Bunker 1S", capacityVolume: 900, currentVolume: 540, currentFuel: "Methanol", xPos: -50 },
    { id: "f3", name: "Midship Wing Bunker P", capacityVolume: 700, currentVolume: 400, currentFuel: "Methanol", xPos: 0 },
    { id: "f4", name: "Midship Wing Bunker S", capacityVolume: 700, currentVolume: 400, currentFuel: "Methanol", xPos: 0 },
    { id: "f5", name: "Fore Double-Bottom Tank", capacityVolume: 500, currentVolume: 280, currentFuel: "Methanol", xPos: 45 },
    { id: "f6", name: "ECA Clean Day Tank", capacityVolume: 400, currentVolume: 250, currentFuel: "Methanol", xPos: -15 },
  ],
  v3: [
    { id: "f1", name: "Liquid Ammonia Wing 1P", capacityVolume: 700, currentVolume: 600, currentFuel: "Ammonia", xPos: -45 },
    { id: "f2", name: "Liquid Ammonia Wing 1S", capacityVolume: 700, currentVolume: 600, currentFuel: "Ammonia", xPos: -45 },
    { id: "f3", name: "Midship Bunker Tank P", capacityVolume: 600, currentVolume: 510, currentFuel: "Ammonia", xPos: 0 },
    { id: "f4", name: "Midship Bunker Tank S", capacityVolume: 600, currentVolume: 510, currentFuel: "Ammonia", xPos: 0 },
    { id: "f5", name: "Forepeak Ammonia Buffer", capacityVolume: 400, currentVolume: 340, currentFuel: "Ammonia", xPos: 40 },
    { id: "f6", name: "Auxiliary Service Tank", capacityVolume: 300, currentVolume: 240, currentFuel: "Ammonia", xPos: -20 },
  ],
  v4: [
    { id: "f1", name: "Deep Bunker Bay 14 Port", capacityVolume: 1600, currentVolume: 700, currentFuel: "LNG", xPos: -50 },
    { id: "f2", name: "Deep Bunker Bay 14 Stbd", capacityVolume: 1600, currentVolume: 700, currentFuel: "LNG", xPos: -50 },
    { id: "f3", name: "Mid-Hull Cryo Tank 2P", capacityVolume: 1200, currentVolume: 530, currentFuel: "LNG", xPos: 0 },
    { id: "f4", name: "Mid-Hull Cryo Tank 2S", capacityVolume: 1200, currentVolume: 530, currentFuel: "LNG", xPos: 0 },
    { id: "f5", name: "Forward Deep Bunker", capacityVolume: 900, currentVolume: 400, currentFuel: "LNG", xPos: 45 },
    { id: "f6", name: "Aft Engine Header Tank", capacityVolume: 500, currentVolume: 220, currentFuel: "LNG", xPos: -30 },
  ],
  v5: [
    { id: "f1", name: "LH2 Cryo Pressure Tank 1P", capacityVolume: 800, currentVolume: 640, currentFuel: "Hydrogen", xPos: -45 },
    { id: "f2", name: "LH2 Cryo Pressure Tank 1S", capacityVolume: 800, currentVolume: 640, currentFuel: "Hydrogen", xPos: -45 },
    { id: "f3", name: "Midship Hydrogen Cell P", capacityVolume: 600, currentVolume: 480, currentFuel: "Hydrogen", xPos: 0 },
    { id: "f4", name: "Midship Hydrogen Cell S", capacityVolume: 600, currentVolume: 480, currentFuel: "Hydrogen", xPos: 0 },
    { id: "f5", name: "Forepeak H2 Storage", capacityVolume: 500, currentVolume: 400, currentFuel: "Hydrogen", xPos: 45 },
    { id: "f6", name: "Fuel-Cell Buffer Tank", capacityVolume: 300, currentVolume: 240, currentFuel: "Hydrogen", xPos: -15 },
  ],
};

export default function CargoLayout({
  initialSelectedId,
  vessel: propVessel,
  onSelectVessel,
  onUpdate,
}: CargoLayoutProps) {
  const [selectedId, setSelectedId] = useState<string>(
    propVessel?.id || initialSelectedId || vessels[0]?.id || "v1"
  );

  useEffect(() => {
    if (propVessel?.id) {
      setSelectedId(propVessel.id);
    }
  }, [propVessel?.id]);

  const activeVessel = useMemo(() => {
    return vessels.find((v) => v.id === selectedId) || vessels[0];
  }, [selectedId]);

  const [currentHolds, setCurrentHolds] = useState<InternalHold[]>([]);
  const [currentFuelTanks, setCurrentFuelTanks] = useState<InternalFuelTank[]>([]);
  const [targetTotalFuel, setTargetTotalFuel] = useState("");
  const [showRecommended, setShowRecommended] = useState(false);
  const [viewMode, setViewMode] = useState<"Cargo" | "Both" | "Fuel">("Both");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global Slider states
  const [globalCargoSlider, setGlobalCargoSlider] = useState<number>(75);
  const [globalFuelSlider, setGlobalFuelSlider] = useState<number>(80);

  // Re-initialize holds and fuel tanks with explicit Longitudinal positions (LCG)
  useEffect(() => {
    const totalHolds = activeVessel.holds.length;
    const initializedHolds: InternalHold[] = activeVessel.holds.map((h, index) => {
      let xPos = 0;
      if (h.position === "fore") xPos = 60;
      else if (h.position === "mid-fore") xPos = 25;
      else if (h.position === "mid") xPos = 0;
      else if (h.position === "mid-aft") xPos = -25;
      else if (h.position === "aft") xPos = -60;
      else {
        xPos = 60 - (index / (totalHolds > 1 ? totalHolds - 1 : 1)) * 120;
      }

      return {
        ...h,
        position: h.position || (xPos > 15 ? "fore" : xPos < -15 ? "aft" : "mid"),
        xPos,
        fillPercentage: Math.round((h.currentCargo / h.capacity) * 100),
      };
    });

    setCurrentHolds(initializedHolds);

    const defaultFuel = VESSEL_FUEL_CONFIGS[activeVessel.id] || VESSEL_FUEL_CONFIGS.v1;
    setCurrentFuelTanks(defaultFuel);
    setShowRecommended(false);
  }, [activeVessel]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleReset = () => {
    const totalHolds = activeVessel.holds.length;
    const initializedHolds: InternalHold[] = activeVessel.holds.map((h, index) => {
      let xPos = 0;
      if (h.position === "fore") xPos = 60;
      else if (h.position === "mid-fore") xPos = 25;
      else if (h.position === "mid") xPos = 0;
      else if (h.position === "mid-aft") xPos = -25;
      else if (h.position === "aft") xPos = -60;
      else {
        xPos = 60 - (index / (totalHolds > 1 ? totalHolds - 1 : 1)) * 120;
      }

      return {
        ...h,
        position: h.position || (xPos > 15 ? "fore" : xPos < -15 ? "aft" : "mid"),
        xPos,
        fillPercentage: Math.round((h.currentCargo / h.capacity) * 100),
      };
    });

    setCurrentHolds(initializedHolds);
    setCurrentFuelTanks(VESSEL_FUEL_CONFIGS[activeVessel.id] || VESSEL_FUEL_CONFIGS.v1);
    setShowRecommended(false);
    triggerToast("Reset vessel loading to standard baseline.");
  };

  const handleHoldChange = (holdId: string, newValue: number) => {
    setCurrentHolds((prev) =>
      prev.map((h) => {
        if (h.id === holdId) {
          const clamped = Math.max(0, Math.min(newValue, h.capacity));
          return {
            ...h,
            currentCargo: Math.round(clamped),
            fillPercentage: Math.round((clamped / h.capacity) * 100),
          };
        }
        return h;
      })
    );
  };

  const handleFuelTankChange = (tankId: string, volume: number) => {
    setCurrentFuelTanks((prev) =>
      prev.map((t) => (t.id === tankId ? { ...t, currentVolume: volume } : t))
    );
  };

  const handleFuelTypeChange = (tankId: string, fuelType: FuelType) => {
    setCurrentFuelTanks((prev) =>
      prev.map((t) => (t.id === tankId ? { ...t, currentFuel: fuelType } : t))
    );
  };

  // Top-Right Global Cargo Slider handler
  const handleGlobalCargoSlider = (val: number) => {
    setGlobalCargoSlider(val);
    const ratio = val / 100;
    setCurrentHolds((prev) =>
      prev.map((h) => {
        const newCargo = Math.round(h.capacity * ratio);
        return {
          ...h,
          currentCargo: newCargo,
          fillPercentage: val,
        };
      })
    );
  };

  // Top-Right Global Fuel Slider handler
  const handleGlobalFuelSlider = (val: number) => {
    setGlobalFuelSlider(val);
    const ratio = val / 100;
    setCurrentFuelTanks((prev) =>
      prev.map((t) => {
        return {
          ...t,
          currentVolume: Math.round(t.capacityVolume * ratio),
        };
      })
    );
  };

  const handleDistributeMassEqually = () => {
    const val = parseFloat(targetTotalFuel);
    if (isNaN(val) || val <= 0) return;

    const maxTotalFuel = currentFuelTanks.reduce(
      (sum, t) => sum + t.capacityVolume * (FUEL_DENSITIES[t.currentFuel] || 0.8),
      0
    );
    const targetMass = Math.min(val, maxTotalFuel);
    const targetMassPerTank = targetMass / (currentFuelTanks.length || 1);

    setCurrentFuelTanks((prev) =>
      prev.map((t) => {
        const density = FUEL_DENSITIES[t.currentFuel] || 0.8;
        const requiredVolume = targetMassPerTank / density;
        const clampedVolume = Math.min(requiredVolume, t.capacityVolume);
        return { ...t, currentVolume: clampedVolume };
      })
    );

    triggerToast(`Evenly balanced ${targetMass}t of fuel across bunkers.`);
  };

  // ── Hydrodynamic Moment & Physics Calculation ──
  const LIGHTWEIGHT = activeVessel.capacity * 0.22;
  const L = activeVessel.length * 4.2;
  const T = activeVessel.beam * 1.5;

  let trimMoment = 0;
  let listMoment = 0;
  let totalWeight = LIGHTWEIGHT;

  const isChemical = activeVessel.type.includes("Chemical");

  currentHolds.forEach((hold, index) => {
    const weight = hold.currentCargo;
    const xPos = hold.xPos;
    const yPos = isChemical ? (index % 2 === 0 ? -12 : 12) : 0;

    trimMoment += weight * xPos;
    listMoment += weight * yPos;
    totalWeight += weight;
  });

  currentFuelTanks.forEach((tank) => {
    const density = FUEL_DENSITIES[tank.currentFuel] || 0.8;
    const weight = tank.currentVolume * density;
    trimMoment += weight * tank.xPos;
    totalWeight += weight;
  });

  let trimAngle = Math.atan(trimMoment / (totalWeight * L)) * (180 / Math.PI);
  let listAngle = Math.atan(listMoment / (totalWeight * T)) * (180 / Math.PI);

  trimAngle = Math.max(-10, Math.min(10, trimAngle));
  listAngle = Math.max(-10, Math.min(10, listAngle));

  const isWarning = Math.abs(trimAngle) > 3.0 || Math.abs(listAngle) > 3.0;
  const balanceColor = isWarning ? "#C94B4B" : "#2E9B68";
  const balanceText =
    Math.abs(trimAngle) < 0.4
      ? "Perfect Hydrodynamic Trim"
      : isWarning
      ? "Unsafe Trim Alert"
      : "Balanced Trim";

  const efficiencyPenalty = Math.abs(trimAngle) * 0.6;
  const baseConsVal = activeVessel.fuelConsumption.voyage || 65.0;
  const currentConsumption = (baseConsVal * (1 + efficiencyPenalty / 100)).toFixed(1);
  const fuelDelta = efficiencyPenalty > 0 ? `+${efficiencyPenalty.toFixed(1)}%` : "0.0%";

  const handleTrimSliderChange = (targetTrim: number) => {
    const targetTrimMoment = totalWeight * L * Math.tan((targetTrim * Math.PI) / 180);
    const newHolds = currentHolds.map((h) => ({ ...h, weight: h.currentCargo }));

    for (let iter = 0; iter < 40; iter++) {
      const currentM = newHolds.reduce((sum, h) => sum + h.weight * h.xPos, 0);
      const deltaM = targetTrimMoment - currentM;
      if (Math.abs(deltaM) < 20) break;

      if (deltaM > 0) {
        for (let src = 0; src < newHolds.length; src++) {
          for (let tgt = 0; tgt < newHolds.length; tgt++) {
            if (newHolds[tgt].xPos > newHolds[src].xPos && newHolds[src].weight > 0 && newHolds[tgt].weight < newHolds[tgt].capacity) {
              const deltaX = newHolds[tgt].xPos - newHolds[src].xPos;
              const shift = Math.min(newHolds[src].weight, newHolds[tgt].capacity - newHolds[tgt].weight, deltaM / deltaX);
              if (shift > 1) {
                newHolds[src].weight -= shift;
                newHolds[tgt].weight += shift;
                break;
              }
            }
          }
        }
      } else {
        for (let src = 0; src < newHolds.length; src++) {
          for (let tgt = 0; tgt < newHolds.length; tgt++) {
            if (newHolds[tgt].xPos < newHolds[src].xPos && newHolds[src].weight > 0 && newHolds[tgt].weight < newHolds[tgt].capacity) {
              const deltaX = newHolds[src].xPos - newHolds[tgt].xPos;
              const shift = Math.min(newHolds[src].weight, newHolds[tgt].capacity - newHolds[tgt].weight, Math.abs(deltaM) / deltaX);
              if (shift > 1) {
                newHolds[src].weight -= shift;
                newHolds[tgt].weight += shift;
                break;
              }
            }
          }
        }
      }
    }

    setCurrentHolds(
      newHolds.map((h) => ({
        ...h,
        currentCargo: Math.round(h.weight),
        fillPercentage: Math.round((h.weight / h.capacity) * 100),
      }))
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto select-none pb-12" style={{ background: "#FEFAEF" }}>
      {/* ── Toast Alert ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#182350] text-white px-4 py-2.5 rounded-xl shadow-2xl border border-[#AFD2FA]/30 flex items-center gap-2.5 text-xs font-mono font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle size={15} className="text-[#2E9B68]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header Section with Right-Top Sliders for Cargo & Fuel ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#182350] shadow-xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Vessel Info & Badge */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-2xs"
              style={{ background: "#EAF4FE", color: "#182350", border: "1px solid #AFD2FA" }}
            >
              {activeVessel.type.includes("LNG")
                ? "❄️"
                : activeVessel.type.includes("Bulk")
                ? "⛰️"
                : activeVessel.type.includes("Chemical")
                ? "⚗️"
                : activeVessel.type.includes("Container")
                ? "📦"
                : "🚢"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-[#182350] font-sans">{activeVessel.name}</h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA]">
                  {activeVessel.type}
                </span>
              </div>
              <div className="text-xs text-[#737985] font-mono">
                IMO {activeVessel.imo} · Length: {activeVessel.length}m · Beam: {activeVessel.beam}m · DWT:{" "}
                {activeVessel.capacity.toLocaleString()} t
              </div>
            </div>
          </div>

          {/* ── Right Top Sliders (Fuel & Cargo) + Filter Tabs ── */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Filters */}
            <div className="flex rounded-xl border border-[#182350] overflow-hidden bg-[#FAFAF5] text-xs font-bold font-mono">
              {(["Cargo", "Both", "Fuel"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 transition-all cursor-pointer ${
                    viewMode === mode
                      ? "bg-[#182350] text-white shadow-2xs"
                      : "text-[#737985] hover:text-[#182350] bg-transparent"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Global Cargo Slider */}
            <div className="p-2 px-3 rounded-xl bg-[#FAFAF5] border border-[#182350] space-y-0.5 w-36 sm:w-44">
              <div className="flex justify-between text-[10.5px] font-mono">
                <span className="text-[#737985] font-bold">Cargo DWT:</span>
                <span className="font-extrabold text-[#182350]">{globalCargoSlider}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={globalCargoSlider}
                onChange={(e) => handleGlobalCargoSlider(parseInt(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #182350 0%, #182350 ${globalCargoSlider}%, #ECE8DF ${globalCargoSlider}%, #ECE8DF 100%)`,
                }}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#182350]"
              />
            </div>

            {/* Global Fuel Slider */}
            <div className="p-2 px-3 rounded-xl bg-[#FAFAF5] border border-[#182350] space-y-0.5 w-36 sm:w-44">
              <div className="flex justify-between text-[10.5px] font-mono">
                <span className="text-[#737985] font-bold">Fuel Level:</span>
                <span className="font-extrabold text-[#2E9B68]">{globalFuelSlider}%</span>
              </div>
              {(() => {
                const fuelPct = Math.min(100, Math.max(0, Math.round(((globalFuelSlider - 10) / 90) * 100)));
                return (
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={globalFuelSlider}
                    onChange={(e) => handleGlobalFuelSlider(parseInt(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, #2E9B68 0%, #2E9B68 ${fuelPct}%, #ECE8DF ${fuelPct}%, #ECE8DF 100%)`,
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#2E9B68]"
                  />
                );
              })()}
            </div>

            {/* Actions */}
            <button
              onClick={() => {
                setShowRecommended(!showRecommended);
                if (!showRecommended) {
                  handleTrimSliderChange(0.15);
                  triggerToast("Optimal hydrodynamic loading plan engaged.");
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                showRecommended
                  ? "bg-[#182350] text-white border-[#182350] shadow-xs"
                  : "bg-[#EAF4FE] text-[#182350] border-[#AFD2FA] hover:bg-[#AFD2FA]/30"
              }`}
            >
              {showRecommended ? "★ Optimal Plan Active" : "Apply Recommended Plan"}
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-xl text-xs font-mono text-[#737985] hover:text-[#182350] border border-[#182350] bg-white cursor-pointer hover:bg-[#FAFAF5]"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Workspace Grid: Fully Visible 2D Vessel Schematic on Left/Center (8 cols) + Feature Controls as Side Navbar on Right (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── LEFT / CENTER MAIN STAGE: Fully Visible 2D Anatomy Diagrams (8 cols) ── */}
        <div className="lg:col-span-8 space-y-4">
          {/* Card 1: 2D Top-Down & Dynamic Profile Anatomy Container */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#ECE8DF]">
              <div>
                <div className="text-[10px] font-mono font-bold text-[#737985] uppercase tracking-wider">
                  HYDRODYNAMIC HOLD LAYOUT &amp; BUNKER ARCHITECTURE
                </div>
                <div className="text-base font-black text-[#182350] font-sans">
                  {activeVessel.name} — 2D Top-Down &amp; Dynamic Profile Anatomy
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-[#737985]">
                  Balance: <strong style={{ color: balanceColor }}>{balanceText}</strong>
                </span>
                <span className="text-[#182350] font-bold bg-[#FAFAF5] px-2.5 py-0.5 rounded-full border border-[#182350]">
                  Trim: {trimAngle > 0 ? `+${trimAngle.toFixed(2)}° (Bow Down)` : `${trimAngle.toFixed(2)}° (Stern Down)`}
                </span>
              </div>
            </div>

            {/* ── Top-Down 2D Anatomy View (Spacious & Prominent) ── */}
            <div className="relative w-full py-7 px-4 bg-[#FAFAF5] rounded-xl border border-[#182350] flex items-center justify-center overflow-x-auto">
              <div className="absolute left-4 top-3 text-[10px] font-mono font-bold text-[#737985] tracking-widest uppercase">
                ← STERN (AFT / BACK)
              </div>
              <div className="absolute right-4 top-3 text-[10px] font-mono font-bold text-[#737985] tracking-widest uppercase">
                BOW (FORE / FRONT) →
              </div>
              <div className="absolute top-3 text-[10px] font-mono font-bold text-[#737985] tracking-widest uppercase">
                PORT ↕ STARBOARD
              </div>

              <svg
                width="670"
                height="160"
                viewBox="0 0 670 160"
                className="drop-shadow-xs"
                style={{
                  transform: `rotate(${listAngle}deg)`,
                  transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                  minWidth: 540,
                }}
              >
                {/* 1. LNG Carrier (v1) */}
                {activeVessel.type.includes("LNG") && (
                  <g>
                    <path
                      d="M 50,75 L 50,32 C 50,32 200,30 460,30 C 560,30 615,75 615,75 C 615,75 560,118 460,118 C 200,118 50,116 50,116 Z"
                      fill="#FFFFFF"
                      stroke="#182350"
                      strokeWidth="2.5"
                    />
                    <rect x="58" y="46" width="40" height="58" rx="3" fill="#EAF4FE" stroke="#AFD2FA" strokeWidth="1.5" />
                    <text x="78" y="79" fill="#182350" fontSize="8" fontWeight="bold" textAnchor="middle">
                      BRIDGE
                    </text>
                    <line x1="98" y1="75" x2="540" y2="75" stroke="#AFD2FA" strokeWidth="2" strokeDasharray="4 2" />

                    {/* 4 Spherical Cryo Tanks */}
                    {viewMode !== "Fuel" &&
                      currentHolds.map((hold, i) => {
                        const cx = 165 + (currentHolds.length - 1 - i) * 100;
                        const cy = 75;
                        const r = 34;
                        const fillHeight = (hold.fillPercentage / 100) * (r * 2);

                        return (
                          <g key={hold.id}>
                            <circle cx={cx} cy={cy} r={r} fill="#FAFAF5" stroke="#182350" strokeWidth="1.5" />
                            <clipPath id={`clip-lng-${hold.id}`}>
                              <circle cx={cx} cy={cy} r={r} />
                            </clipPath>
                            <rect
                              x={cx - r}
                              y={cy + r - fillHeight}
                              width={r * 2}
                              height={fillHeight}
                              fill="#AFD2FA"
                              clipPath={`url(#clip-lng-${hold.id})`}
                            />
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#AFD2FA" strokeWidth="1" strokeDasharray="3 3" />
                            <text x={cx} y={cy - 5} fill="#182350" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                              {hold.name}
                            </text>
                            <text x={cx} y={cy + 9} fill="#182350" fontSize="10.5" fontWeight="extrabold" textAnchor="middle">
                              {hold.fillPercentage}%
                            </text>
                          </g>
                        );
                      })}
                  </g>
                )}

                {/* 2. Bulk Carrier (v2) */}
                {activeVessel.type.includes("Bulk") && (
                  <g>
                    <path
                      d="M 45,75 L 45,28 C 45,28 180,26 480,26 C 565,26 620,75 620,75 C 620,75 565,122 480,122 C 180,122 45,120 45,120 Z"
                      fill="#FFFFFF"
                      stroke="#182350"
                      strokeWidth="2.5"
                    />
                    <rect x="52" y="44" width="36" height="62" rx="2" fill="#EAF4FE" stroke="#AFD2FA" strokeWidth="1.5" />
                    <text x="70" y="79" fill="#182350" fontSize="8" fontWeight="bold" textAnchor="middle">
                      AFT
                    </text>

                    {viewMode !== "Fuel" &&
                      currentHolds.map((hold, i) => {
                        const w = 58;
                        const h = 66;
                        const x = 110 + (currentHolds.length - 1 - i) * (w + 14);
                        const y = 42;
                        const fillHeight = (hold.fillPercentage / 100) * h;

                        return (
                          <g key={hold.id}>
                            <rect x={x} y={y} width={w} height={h} rx="2" fill="#FAFAF5" stroke="#182350" strokeWidth="1.5" />
                            <clipPath id={`clip-bulk-${hold.id}`}>
                              <rect x={x} y={y} width={w} height={h} rx="2" />
                            </clipPath>
                            <rect
                              x={x}
                              y={y + h - fillHeight}
                              width={w}
                              height={fillHeight}
                              fill="#AFD2FA"
                              clipPath={`url(#clip-bulk-${hold.id})`}
                            />
                            <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} fill="none" stroke="#E6E2D8" strokeWidth="1" strokeDasharray="2 2" />
                            <text x={x + w / 2} y={y + 24} fill="#182350" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                              {hold.name}
                            </text>
                            <text x={x + w / 2} y={y + 42} fill="#182350" fontSize="9.5" fontWeight="extrabold" textAnchor="middle">
                              {hold.fillPercentage}%
                            </text>
                          </g>
                        );
                      })}
                  </g>
                )}

                {/* 3. Chemical / Container / Other Vessels */}
                {!activeVessel.type.includes("LNG") && !activeVessel.type.includes("Bulk") && (
                  <g>
                    <path
                      d="M 50,75 L 50,30 C 50,30 200,28 470,28 C 560,28 615,75 615,75 C 615,75 560,120 470,120 C 200,120 50,118 50,118 Z"
                      fill="#FFFFFF"
                      stroke="#182350"
                      strokeWidth="2.5"
                    />
                    <rect x="56" y="46" width="34" height="58" rx="2" fill="#EAF4FE" stroke="#AFD2FA" strokeWidth="1.5" />
                    <text x="73" y="79" fill="#182350" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                      BRIDGE
                    </text>

                    {viewMode !== "Fuel" &&
                      currentHolds.map((hold, i) => {
                        const w = 66;
                        const h = 64;
                        const x = 110 + (currentHolds.length - 1 - i) * (w + 14);
                        const y = 43;
                        const fillHeight = (hold.fillPercentage / 100) * h;

                        return (
                          <g key={hold.id}>
                            <rect x={x} y={y} width={w} height={h} rx="3" fill="#FAFAF5" stroke="#182350" strokeWidth="1.5" />
                            <clipPath id={`clip-gen-${hold.id}`}>
                              <rect x={x} y={y} width={w} height={h} rx="3" />
                            </clipPath>
                            <rect
                              x={x}
                              y={y + h - fillHeight}
                              width={w}
                              height={fillHeight}
                              fill="#AFD2FA"
                              clipPath={`url(#clip-gen-${hold.id})`}
                            />
                            <text x={x + w / 2} y={y + 24} fill="#182350" fontSize="8" fontWeight="bold" textAnchor="middle">
                              {hold.name}
                            </text>
                            <text x={x + w / 2} y={y + 44} fill="#182350" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                              {hold.fillPercentage}%
                            </text>
                          </g>
                        );
                      })}
                  </g>
                )}

                {/* 6 Expanded Fuel Bunker Compartments along bottom */}
                {viewMode !== "Cargo" && (
                  <g>
                    {currentFuelTanks.map((tank, i) => {
                      const w = 58;
                      const h = 23;
                      const x = 110 + i * (w + 8);
                      const y = 125;
                      const fillW = (tank.currentVolume / tank.capacityVolume) * w;
                      const fillPct = Math.round((tank.currentVolume / tank.capacityVolume) * 100);

                      return (
                        <g key={tank.id}>
                          <rect x={x} y={y} width={w} height={h} rx="2" fill="#EAF4FE" stroke="#182350" strokeWidth="1" />
                          <rect x={x} y={y} width={fillW} height={h} rx="2" fill="#182350" />
                          <text
                            x={x + w / 2}
                            y={y + 11}
                            fill={fillW > w / 2 ? "#FFFFFF" : "#182350"}
                            fontSize="6.5"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {tank.currentFuel} ({fillPct}%)
                          </text>
                          <text
                            x={x + w / 2}
                            y={y + 20}
                            fill={fillW > w / 2 ? "#AFD2FA" : "#737985"}
                            fontSize="5.5"
                            textAnchor="middle"
                          >
                            {tank.name.split(" ")[0]}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}
              </svg>
            </div>

            {/* ── Side Profile Dynamic Pitch & Waterline View ── */}
            <div className="relative w-full py-5 px-4 bg-[#FAFAF5] rounded-xl border border-[#182350] flex flex-col items-center justify-center">
              <div className="w-full flex justify-between px-2 mb-2 text-xs font-mono">
                <span className="font-bold uppercase tracking-wider text-[#737985]">
                  SIDE PROFILE DYNAMIC PITCH &amp; WATERLINE (STERN ↔ BOW)
                </span>
                <span className="font-bold text-xs" style={{ color: balanceColor }}>
                  Trim Angle: {trimAngle > 0 ? `+${trimAngle.toFixed(2)}° (Bow Down / Front Tilt)` : `${trimAngle.toFixed(2)}° (Stern Down / Back Tilt)`}
                </span>
              </div>

              <div className="relative w-full max-w-2xl h-24 flex items-center justify-center">
                {/* Horizontal Baseline Waterline */}
                <svg width="600" height="70" viewBox="0 0 600 70" className="absolute top-1 select-none">
                  <line x1="10" y1="42" x2="590" y2="42" stroke="#AFD2FA" strokeWidth="2" strokeDasharray="6 4" />
                  <line x1="300" y1="8" x2="300" y2="62" stroke="#AFD2FA" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="305" y="18" fill="#737985" fontSize="8" fontFamily="monospace">
                    Midship Axis
                  </text>
                </svg>

                {/* Rotatable Side Silhouette */}
                <svg
                  width="600"
                  height="70"
                  viewBox="0 0 600 70"
                  style={{
                    transform: `rotate(${trimAngle}deg)`,
                    transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    transformOrigin: "300px 42px",
                  }}
                >
                  <path
                    d="M 50,18 L 485,18 L 575,32 L 535,56 L 50,56 Z"
                    fill="#FFFFFF"
                    stroke="#182350"
                    strokeWidth="2"
                  />
                  <rect x="60" y="8" width="40" height="20" rx="2" fill="#EAF4FE" stroke="#AFD2FA" strokeWidth="1" />

                  {/* Side Hold Profile Cavities */}
                  {viewMode !== "Fuel" &&
                    currentHolds.map((hold, i) => {
                      const num = currentHolds.length;
                      const w = 350 / num - 8;
                      const x = 120 + (currentHolds.length - 1 - i) * (w + 8);
                      const maxH = 24;
                      const fillH = (hold.fillPercentage / 100) * maxH;

                      return (
                        <g key={`side-${hold.id}`}>
                          <rect x={x} y={24} width={w} height={maxH} fill="#FAFAF5" stroke="#182350" strokeWidth="1" />
                          <rect x={x} y={24 + maxH - fillH} width={w} height={fillH} fill="#AFD2FA" />
                        </g>
                      );
                    })}
                </svg>
              </div>
            </div>

            {/* ── Trim Stabilizer & Hydrodynamic Drag Impact (Positioned directly below Side Profile Dynamic Pitch) ── */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#FAFAF5] border border-[#182350] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-[#2E9B68]" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182350]">
                    Trim Stabilizer
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#2E9B68] bg-[#EAF7F0] px-2 py-0.5 rounded">
                  Dynamic LCG
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-[#737985]">
                  <span>Target Trim Angle:</span>
                  <span className="font-bold text-[#182350]">
                    {trimAngle > 0 ? `+${trimAngle.toFixed(2)}° (Bow)` : `${trimAngle.toFixed(2)}° (Stern)`}
                  </span>
                </div>
                {(() => {
                  const trimPct = Math.min(100, Math.max(0, Math.round(((trimAngle - (-3.0)) / 6.0) * 100)));
                  return (
                    <input
                      type="range"
                      min="-3.0"
                      max="3.0"
                      step="0.05"
                      value={trimAngle}
                      onChange={(e) => handleTrimSliderChange(parseFloat(e.target.value))}
                      style={{
                        background: `linear-gradient(to right, #B9915E 0%, #B9915E ${trimPct}%, #ECE8DF ${trimPct}%, #ECE8DF 100%)`,
                      }}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#B9915E]"
                    />
                  );
                })()}
                <div className="flex justify-between text-[10px] text-[#737985]">
                  <span>-3.0° (Stern)</span>
                  <span>0.0° (Even Keel)</span>
                  <span>+3.0° (Bow)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#EAF4FE] border border-[#AFD2FA] text-xs font-mono text-[#182350] flex justify-between items-center">
                <span>Voyage Fuel Burn:</span>
                <strong>{currentConsumption} t/day ({fuelDelta})</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT-HAND FEATURE SIDE NAVBAR / CONTROL PANEL (4 cols) ── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Panel 1: Hold-by-Hold Allocation Sliders */}
          <div className="p-5 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#182350]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182350]">
                  Hold Load Allocation
                </h3>
              </div>
              <span className="text-[10.5px] font-mono text-[#737985]">
                {currentHolds.reduce((sum, h) => sum + h.currentCargo, 0).toLocaleString()} t total
              </span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {currentHolds.map((hold) => {
                const fillPct = Math.min(100, Math.max(0, Math.round((hold.currentCargo / (hold.capacity || 1)) * 100)));
                return (
                  <div key={hold.id} className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#182350] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#182350]">{hold.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA]">
                          {hold.position.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-[#182350]">
                        {hold.fillPercentage}% ({hold.currentCargo.toLocaleString()} t)
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max={hold.capacity}
                      step={hold.capacity / 100}
                      value={hold.currentCargo}
                      onChange={(e) => handleHoldChange(hold.id, parseFloat(e.target.value))}
                      style={{
                        background: `linear-gradient(to right, #182350 0%, #182350 ${fillPct}%, #ECE8DF ${fillPct}%, #ECE8DF 100%)`,
                      }}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#182350]"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel 3: 6 Fuel Bunker Compartments & Auto-Balance */}
          <div className="p-5 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
              <div className="flex items-center gap-2">
                <Droplets size={16} className="text-[#2E9B68]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182350]">
                  Fuel Bunkers ({currentFuelTanks.length} Tanks)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#737985]">
                {currentFuelTanks.reduce((sum, t) => sum + t.capacityVolume, 0).toLocaleString()} m³
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {currentFuelTanks.map((tank) => {
                const fillPct = Math.min(100, Math.max(0, Math.round((tank.currentVolume / (tank.capacityVolume || 1)) * 100)));
                return (
                  <div key={tank.id} className="p-2 rounded-xl bg-[#FAFAF5] border border-[#182350] text-xs font-mono space-y-1">
                    <div className="flex justify-between font-bold text-[#182350]">
                      <span className="truncate">{tank.name}</span>
                      <span className="text-[10.5px]">
                        {Math.round(tank.currentVolume)} / {tank.capacityVolume} m³
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={tank.currentFuel}
                        onChange={(e) => handleFuelTypeChange(tank.id, e.target.value as FuelType)}
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-white border border-[#182350] text-[#182350]"
                      >
                        <option value="LNG">LNG</option>
                        <option value="Methanol">Methanol</option>
                        <option value="Ammonia">Ammonia</option>
                        <option value="Hydrogen">Hydrogen</option>
                        <option value="Conventional">MGO</option>
                      </select>
                      <input
                        type="range"
                        min="0"
                        max={tank.capacityVolume}
                        value={tank.currentVolume}
                        onChange={(e) => handleFuelTankChange(tank.id, parseFloat(e.target.value))}
                        style={{
                          background: `linear-gradient(to right, #2E9B68 0%, #2E9B68 ${fillPct}%, #ECE8DF ${fillPct}%, #ECE8DF 100%)`,
                        }}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-[#2E9B68]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="number"
                placeholder="Target Total Fuel Mass (t)"
                value={targetTotalFuel}
                onChange={(e) => setTargetTotalFuel(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl text-xs font-mono border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
              />
              <button
                onClick={handleDistributeMassEqually}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase bg-[#182350] hover:bg-[#233372] text-white cursor-pointer shadow-xs"
              >
                Auto-Balance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
