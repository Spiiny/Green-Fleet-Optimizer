import { useState } from "react";
import { Vessel } from "../../data/fleet";

interface Props {
  vessels: Vessel[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const statusColor: Record<string, { dot: string; bg: string; text: string }> = {
  Underway: { dot: "#2E9B68", bg: "#EAF9F1", text: "#185C3A" },
  "At Anchor": { dot: "#B9915E", bg: "#FBF5EB", text: "#8A6635" },
  "In Port": { dot: "#182350", bg: "#EAF4FE", text: "#182350" },
  Standby: { dot: "#737985", bg: "#F1F2F4", text: "#4A5260" },
};

const fuelStyleMap: Record<string, { bg: string; text: string; border: string }> = {
  LNG: { bg: "#EAF4FE", text: "#182350", border: "#AFD2FA" },
  Methanol: { bg: "#E8F5E9", text: "#1B5E20", border: "#A5D6A7" },
  Ammonia: { bg: "#FFF8E1", text: "#F57F17", border: "#FFE082" },
  Hydrogen: { bg: "#E0F7FA", text: "#006064", border: "#80DEEA" },
  VLSFO: { bg: "#FFEBEE", text: "#B71C1C", border: "#FFCDD2" },
};

export default function VesselSidebar({ vessels, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [fuelFilter, setFuelFilter] = useState<string>("ALL");

  const filteredVessels = vessels.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.captain.toLowerCase().includes(search.toLowerCase()) ||
      v.currentLocation.toLowerCase().includes(search.toLowerCase());
    const matchesFuel = fuelFilter === "ALL" || v.fuelType === fuelFilter;
    return matchesSearch && matchesFuel;
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#182350]/20 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-[#182350]/20 bg-[#FAFAF5]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2E9B68] animate-pulse" />
            <span className="text-[10px] font-mono text-[#737985] uppercase font-bold tracking-wider">
              Fleet Radar
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#182350] text-white">
            {vessels.length} ONLINE
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flagship / port..."
            className="w-full px-3 py-1.5 pl-7 rounded-lg text-xs font-sans bg-white border border-[#182350]/20 text-[#182350] placeholder:text-[#94A3B8] outline-none focus:border-[#AFD2FA] transition-all"
          />
          <span className="absolute left-2.5 top-1.5 text-xs text-[#94A3B8]">🔍</span>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-0.5">
          {["ALL", "LNG", "Methanol", "Ammonia"].map((fuel) => (
            <button
              key={fuel}
              onClick={() => setFuelFilter(fuel)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                fuelFilter === fuel
                  ? "bg-[#182350] text-white shadow-2xs"
                  : "bg-white text-[#737985] border border-[#182350]/20 hover:border-[#AFD2FA]"
              }`}
            >
              {fuel}
            </button>
          ))}
        </div>
      </div>

      {/* Vessel List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredVessels.map((v) => {
          const isSelected = v.id === selectedId;
          const status = statusColor[v.status] || statusColor.Standby;
          const fuelStyle = fuelStyleMap[v.fuelType] || fuelStyleMap.LNG;
          const loadPercent = Math.round((v.currentLoad / v.capacity) * 100);

          return (
            <div
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={`w-full text-left rounded-xl p-3 transition-all duration-150 cursor-pointer relative border ${
                isSelected
                  ? "bg-[#EAF4FE] border-[#AFD2FA] shadow-sm scale-[1.01]"
                  : "bg-white border-[#182350]/20 hover:border-[#AFD2FA] hover:bg-[#FAFAF5]"
              }`}
            >
              {/* Selected indicator bar */}
              {isSelected && (
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#182350]" />
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: status.dot }}
                  />
                  <div>
                    <div className="text-xs font-extrabold text-[#182350] tracking-tight flex items-center gap-1.5">
                      <span>{v.name}</span>
                    </div>
                    <div className="text-[10px] text-[#737985] font-sans truncate max-w-[120px]">
                      {v.type}
                    </div>
                  </div>
                </div>

                <span
                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{
                    background: fuelStyle.bg,
                    color: fuelStyle.text,
                    border: `1px solid ${fuelStyle.border}`,
                  }}
                >
                  {v.fuelType}
                </span>
              </div>

              {/* Real-time telemetry snippet */}
              <div className="mt-2.5 pt-2 border-t border-[#182350]/60 grid grid-cols-2 gap-y-1 text-[10.5px] font-sans">
                <div className="text-[#737985]">Speed / SOG</div>
                <div className="text-[#182350] font-mono font-bold text-right">
                  {v.speed} kn
                </div>

                <div className="text-[#737985]">Destination</div>
                <div className="text-[#182350] font-medium text-right truncate">
                  {v.destination}
                </div>

                <div className="text-[#737985]">Load Factor</div>
                <div className="text-right">
                  <span className="font-mono text-[10px] font-bold text-[#182350]">{loadPercent}%</span>
                </div>
              </div>

              {/* Micro Load Progress Bar */}
              <div className="w-full bg-[#182350]/70 h-1 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${loadPercent}%`,
                    background: loadPercent > 85 ? "#2E9B68" : "#182350",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-[#182350]/20 bg-[#FAFAF5] text-[10px] font-mono text-[#737985] flex items-center justify-between">
        <span>AIS POLLING: 10s</span>
        <span className="text-[#2E9B68] font-bold">● ACTIVE</span>
      </div>
    </div>
  );
}
