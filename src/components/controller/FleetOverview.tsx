import { useState } from "react";
import { vessels } from "../../data/fleet";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

export default function FleetOverview() {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterFuel, setFilterFuel] = useState<string>("ALL");

  const totalLoad = vessels.reduce((s, v) => s + v.currentLoad, 0);
  const totalCapacity = vessels.reduce((s, v) => s + v.capacity, 0);
  const totalEmissions = vessels.reduce((s, v) => s + v.emissions, 0);
  const totalFuel = vessels.reduce((s, v) => s + v.fuelConsumption.total, 0);
  const underway = vessels.filter((v) => v.status === "Underway").length;

  const fuelBreakdown = [
    { name: "LNG Dual-Fuel", count: vessels.filter((v) => v.fuelType === "LNG").length, color: "#182350" },
    {
      name: "Green Methanol",
      count: vessels.filter((v) => v.fuelType === "Methanol").length,
      color: "#2E9B68",
    },
    {
      name: "Liquid Ammonia",
      count: vessels.filter((v) => v.fuelType === "Ammonia").length,
      color: "#B9915E",
    },
  ];

  const emissionData = vessels.map((v) => ({
    name: v.name.replace("MV ", ""),
    emissions: v.emissions,
    fuel: v.fuelConsumption.total,
    efficiency: Math.round(100 - (v.emissions / 60) * 30),
  }));

  const filteredVessels = vessels.filter((v) => {
    const matchStatus = filterStatus === "ALL" || v.status === filterStatus;
    const matchFuel = filterFuel === "ALL" || v.fuelType === filterFuel;
    return matchStatus && matchFuel;
  });

  const statusStyle: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    Underway: { bg: "#EAF9F1", text: "#185C3A", border: "#A7E8C5", dot: "#2E9B68" },
    "At Anchor": { bg: "#FBF5EB", text: "#8A6635", border: "#F3DEBF", dot: "#B9915E" },
    "In Port": { bg: "#EAF4FE", text: "#182350", border: "#AFD2FA", dot: "#182350" },
    Standby: { bg: "#F1F2F4", text: "#4A5260", border: "#D4D8DD", dot: "#737985" },
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 select-none" style={{ background: "#FEFAEF" }}>
      {/* ── Top Tactical Warning / Status Ticker ── */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#E6E2D8] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2E9B68] animate-pulse" />
          <span className="text-xs font-mono font-bold text-[#182350] uppercase tracking-wider">
            Operational Matrix
          </span>
          <span className="text-xs font-sans text-[#737985]">
            · Active telemetry tracking across 5 enterprise corridors (ECMWF Sea State Level 3: Favorable)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded-md bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA] font-bold">
            IMO CII RATING: A
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#EAF9F1] text-[#2E9B68] border border-[#A7E8C5] font-bold">
            FUEL CUT: -16.8%
          </span>
        </div>
      </div>

      {/* ── KPI Command Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Active Flagships",
            value: `${vessels.length}`,
            unit: "5/5 Telemetry Online",
            delta: "+100% Availability",
            trendColor: "#2E9B68",
            icon: "🚢",
          },
          {
            label: "Vessels Underway",
            value: `${underway}`,
            unit: "In Open-Sea Transit",
            delta: "Optimal Trim Active",
            trendColor: "#2E9B68",
            icon: "⚡",
          },
          {
            label: "Fleet Utilization",
            value: `${Math.round((totalLoad / totalCapacity) * 100)}%`,
            unit: `${(totalLoad / 1000).toFixed(0)}k DWT Loaded`,
            delta: "Metacentric Balanced",
            trendColor: "#182350",
            icon: "▦",
          },
          {
            label: "Fleet Emissions",
            value: `${totalEmissions.toFixed(1)}`,
            unit: "tCO₂ / 24h Average",
            delta: "-18.2% vs Baseline",
            trendColor: "#2E9B68",
            icon: "🌿",
          },
          {
            label: "Daily Fuel Burn",
            value: `${totalFuel.toFixed(0)} t`,
            unit: "Dual-Fuel Scheduled",
            delta: "$42.4k Saved/Day",
            trendColor: "#B9915E",
            icon: "⛽",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-4 rounded-2xl bg-white border border-[#E6E2D8] shadow-xs hover:border-[#AFD2FA] hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] font-mono text-[#737985] uppercase font-bold tracking-wider">
                {kpi.label}
              </span>
              <span className="text-sm">{kpi.icon}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-sans text-[#182350] tracking-tight">
              {kpi.value}
            </div>
            <div className="text-[11px] text-[#737985] font-sans mt-0.5">{kpi.unit}</div>
            <div
              className="text-[10px] font-mono font-bold mt-2 pt-2 border-t border-[#ECE8DF]"
              style={{ color: kpi.trendColor }}
            >
              {kpi.delta}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Emissions & Consumption Benchmark */}
        <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] shadow-xs col-span-1 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-[#182350] font-bold uppercase tracking-wider">
                Emissions & Fuel Kinetics per Vessel
              </div>
              <div className="text-[11px] text-[#737985] font-sans mt-0.5">
                Daily tCO₂ generation against bunker tons consumed under FuelEU mandates
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#B9915E]" />
                <span className="text-[#737985]">tCO₂ / Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#182350]" />
                <span className="text-[#737985]">Fuel t / Day</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={emissionData} barSize={20} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECE8DF" />
              <XAxis dataKey="name" tick={{ fill: "#737985", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#737985", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E6E2D8",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 6px 20px rgba(24, 35, 80, 0.08)",
                }}
                labelStyle={{ color: "#182350", fontWeight: 800 }}
              />
              <Bar dataKey="emissions" fill="#B9915E" name="Emissions (tCO₂/d)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fuel" fill="#182350" name="Fuel Burn (t/d)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fuel Type & Energy Allocation */}
        <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] shadow-xs space-y-3">
          <div className="text-xs font-mono text-[#182350] font-bold uppercase tracking-wider">
            Dual-Fuel Composition
          </div>
          <div className="text-[11px] text-[#737985] font-sans">
            Fleet propulsion energy breakdown
          </div>

          <div className="flex justify-center">
            <PieChart width={180} height={140}>
              <Pie
                data={fuelBreakdown}
                dataKey="count"
                cx={90}
                cy={65}
                innerRadius={42}
                outerRadius={62}
                paddingAngle={4}
              >
                {fuelBreakdown.map((f, i) => (
                  <Cell key={i} fill={f.color} />
                ))}
              </Pie>
            </PieChart>
          </div>

          <div className="space-y-2 pt-1 border-t border-[#ECE8DF]">
            {fuelBreakdown.map((f) => (
              <div key={f.name} className="flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: f.color }} />
                  <span className="text-[#3F4654] font-medium">{f.name}</span>
                </div>
                <span className="font-mono font-bold text-[#182350]">
                  {f.count} Flagship{f.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Vessel Fleet Registry Table & Operations Hub ── */}
      <div className="rounded-2xl bg-white border border-[#E6E2D8] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E6E2D8] bg-[#FAFAF5] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-[#182350] font-bold uppercase tracking-wider">
              Fleet Operations Matrix — All Flagships
            </div>
            <div className="text-[11px] text-[#737985] font-sans">
              Real-time AIS position, metacentric load, and IMO DCS compliance records
            </div>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-white border border-[#E6E2D8] text-[#182350] outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Underway">Underway</option>
              <option value="At Anchor">At Anchor</option>
              <option value="In Port">In Port</option>
            </select>

            <select
              value={filterFuel}
              onChange={(e) => setFilterFuel(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-white border border-[#E6E2D8] text-[#182350] outline-none cursor-pointer"
            >
              <option value="ALL">All Fuel Types</option>
              <option value="LNG">LNG Dual-Fuel</option>
              <option value="Methanol">Green Methanol</option>
              <option value="Ammonia">Liquid Ammonia</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6E2D8] bg-[#FAFAF5]">
                {[
                  "Flagship Vessel",
                  "Class / Type",
                  "IMO Call Sign",
                  "Master Mariner",
                  "Status",
                  "Position / ETA",
                  "Propulsion",
                  "Bunker %",
                  "Cargo DWT %",
                  "Daily CO₂",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10.5px] font-mono text-[#182350] font-bold tracking-wider uppercase whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVessels.map((v) => {
                const s = statusStyle[v.status] || statusStyle.Standby;
                const loadPercent = Math.round((v.currentLoad / v.capacity) * 100);

                return (
                  <tr
                    key={v.id}
                    className="border-b border-[#ECE8DF] transition-colors hover:bg-[#EAF4FE]/40"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-extrabold text-[#182350] text-sm">{v.name}</div>
                      <div className="text-[10px] font-mono text-[#737985]">{v.voyageId}</div>
                    </td>

                    <td className="px-4 py-3 text-[#3F4654] whitespace-nowrap text-xs">
                      {v.type}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-[#737985]">
                      {v.imo}
                    </td>

                    <td className="px-4 py-3 text-[#182350] font-medium whitespace-nowrap text-xs">
                      {v.captain}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap"
                        style={{
                          background: s.bg,
                          color: s.text,
                          border: `1px solid ${s.border}`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                        <span>{v.status}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs font-sans">
                      <div className="font-medium text-[#182350] truncate max-w-[140px]">
                        {v.currentLocation}
                      </div>
                      <div className="text-[10px] text-[#737985]">→ {v.destination}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold text-[#182350] px-2 py-0.5 rounded bg-[#EAF4FE] border border-[#AFD2FA]">
                        {v.fuelType}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-[#ECE8DF] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${v.fuelLevel}%`,
                              background: v.fuelLevel > 40 ? "#182350" : "#C94B4B",
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-[#182350]">
                          {v.fuelLevel}%
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-[#ECE8DF] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#2E9B68]"
                            style={{
                              width: `${loadPercent}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-[#182350]">
                          {loadPercent}%
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs font-mono font-bold text-[#182350]">
                      {v.emissions} t/d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
