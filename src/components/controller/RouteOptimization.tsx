import { Vessel, routePlans, RoutePlan } from "../../data/fleet";
import { useState } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

interface Props {
  vessel: Vessel;
  onPlanSelect: (plan: string) => void;
  selectedPlan: string;
}

export default function RouteOptimization({ vessel, onPlanSelect, selectedPlan }: Props) {
  const plans = routePlans[vessel.id] || routePlans.v1;
  const fastest = plans.find((p) => p.label === "Fastest")!;
  const efficient = plans.find((p) => p.label === "Efficient")!;
  const custom = plans.find((p) => p.label === "Custom")!;

  const [customSpeed, setCustomSpeed] = useState(15.6);
  const [customFuel, setCustomFuel] = useState<"LNG" | "Methanol" | "Ammonia">("LNG");

  const radarData = [
    { metric: "Speed", Fastest: 95, Efficient: 72, Custom: 82 },
    { metric: "Efficiency", Fastest: 60, Efficient: 95, Custom: 78 },
    { metric: "Low Emission", Fastest: 50, Efficient: 92, Custom: 72 },
    { metric: "Low Cost", Fastest: 55, Efficient: 90, Custom: 75 },
    { metric: "Time", Fastest: 95, Efficient: 65, Custom: 78 },
  ];

  const PlanCard = ({ plan, isSelected }: { plan: RoutePlan; isSelected: boolean }) => (
    <div
      className="p-5 rounded-lg flex flex-col shadow-xs transition-all"
      style={{
        background: isSelected ? "#EAF4FE" : "#FFFFFF",
        border: `1px solid ${isSelected ? "#AFD2FA" : "#E6E2D8"}`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: plan.color }} />
          <span
            className="text-xs font-sans font-bold tracking-widest uppercase"
            style={{ color: "#182350" }}
          >
            {plan.label} Plan
          </span>
        </div>
        {isSelected && (
          <span
            className="text-[10px] font-sans font-bold px-2 py-0.5 rounded uppercase"
            style={{ background: "#182350", color: "#FFFFFF" }}
          >
            ● SELECTED
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 flex-1">
        {[
          { label: "Distance", value: `${plan.distance.toLocaleString()} nm` },
          {
            label: "Travel Time",
            value: `${Math.floor(plan.travelTime / 24)}d ${plan.travelTime % 24}h`,
          },
          { label: "Avg Speed", value: `${plan.avgSpeed} kn` },
          { label: "Fuel Use", value: `${plan.fuelConsumption.toLocaleString()} t` },
          { label: "Op. Cost", value: `$${(plan.cost / 1000000).toFixed(2)}M` },
          { label: "Emissions", value: `${plan.emissions.toLocaleString()} tCO₂` },
        ].map((m) => (
          <div key={m.label}>
            <div className="text-[11px] font-sans text-[#737985]">{m.label}</div>
            <div className="text-sm font-bold font-sans text-[#182350] mt-0.5">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Efficiency bar */}
      <div className="mt-4 pt-2 border-t border-[#ECE8DF]">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-sans text-[#737985]">Efficiency Score</span>
          <span className="font-sans font-bold text-[#182350]">{plan.efficiency}/100</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#ECE8DF]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${plan.efficiency}%`, background: "#182350" }}
          />
        </div>
      </div>

      <button
        onClick={() => onPlanSelect(plan.label)}
        className={`mt-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all cursor-pointer ${
          isSelected
            ? "bg-[#182350] text-white shadow-xs"
            : "bg-white text-[#182350] border border-[#182350] hover:bg-[#F7F5EE]"
        }`}
      >
        {isSelected ? "✓ Plan Selected" : "Select This Plan"}
      </button>
    </div>
  );

  const savings = {
    fuel: fastest.fuelConsumption - efficient.fuelConsumption,
    cost: fastest.cost - efficient.cost,
    emissions: fastest.emissions - efficient.emissions,
    time: efficient.travelTime - fastest.travelTime,
  };

  return (
    <div className="p-6 space-y-6" style={{ background: "#FEFAEF" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-[#182350]">
            Route Optimization — {vessel.name}
          </h3>
          <div className="text-xs font-sans text-[#737985]">
            {vessel.origin} → {vessel.destination}
          </div>
        </div>
        <div
          className="text-xs font-sans font-bold px-3 py-1.5 rounded-lg"
          style={{ background: "#EAF4FE", border: "1px solid #AFD2FA", color: "#182350" }}
        >
          Active: {selectedPlan} Plan
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[fastest, efficient, custom].map((plan) => (
          <PlanCard key={plan.id} plan={plan} isSelected={selectedPlan === plan.label} />
        ))}
      </div>

      {/* Comparison table */}
      <div
        className="rounded-lg shadow-xs overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid #E6E2D8" }}
      >
        <div className="px-4 py-3 border-b border-[#182350] bg-[#FDFCF7]">
          <div className="text-xs font-sans text-[#182350] font-bold uppercase tracking-wider">
            Plan Comparison Matrix
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#182350] bg-[#FAFAF5]">
                <th className="px-4 py-3 text-left text-[11px] font-sans text-[#182350] font-bold uppercase tracking-wider">
                  Metric
                </th>
                {[fastest, efficient, custom].map((p) => (
                  <th
                    key={p.id}
                    className="px-4 py-3 text-left text-[11px] font-sans font-bold uppercase tracking-wider text-[#182350]"
                  >
                    {p.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[11px] font-sans text-[#182350] font-bold uppercase tracking-wider">
                  Efficient Saves
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Speed",
                  vals: [
                    `${fastest.avgSpeed} kn`,
                    `${efficient.avgSpeed} kn`,
                    `${custom.avgSpeed} kn`,
                  ],
                  save: null,
                },
                {
                  label: "Travel Time",
                  vals: [
                    `${Math.floor(fastest.travelTime / 24)}d ${fastest.travelTime % 24}h`,
                    `${Math.floor(efficient.travelTime / 24)}d ${efficient.travelTime % 24}h`,
                    `${Math.floor(custom.travelTime / 24)}d ${custom.travelTime % 24}h`,
                  ],
                  save: `+${savings.time}h`,
                },
                {
                  label: "Fuel Consumption",
                  vals: [
                    `${fastest.fuelConsumption.toLocaleString()} t`,
                    `${efficient.fuelConsumption.toLocaleString()} t`,
                    `${custom.fuelConsumption.toLocaleString()} t`,
                  ],
                  save: `-${savings.fuel.toLocaleString()} t`,
                },
                {
                  label: "Operational Cost",
                  vals: [
                    `$${(fastest.cost / 1e6).toFixed(2)}M`,
                    `$${(efficient.cost / 1e6).toFixed(2)}M`,
                    `$${(custom.cost / 1e6).toFixed(2)}M`,
                  ],
                  save: `-$${(savings.cost / 1e6).toFixed(2)}M`,
                },
                {
                  label: "CO₂ Emissions",
                  vals: [
                    `${fastest.emissions.toLocaleString()} t`,
                    `${efficient.emissions.toLocaleString()} t`,
                    `${custom.emissions.toLocaleString()} t`,
                  ],
                  save: `-${savings.emissions.toLocaleString()} t`,
                },
                {
                  label: "Efficiency Score",
                  vals: [
                    `${fastest.efficiency}/100`,
                    `${efficient.efficiency}/100`,
                    `${custom.efficiency}/100`,
                  ],
                  save: `+${efficient.efficiency - fastest.efficiency} pts`,
                },
              ].map((row, i) => (
                <tr key={i} className="border-b border-[#ECE8DF] hover:bg-[#EAF4FE]/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-sans text-[#737985] font-medium">
                    {row.label}
                  </td>
                  {row.vals.map((v, j) => (
                    <td
                      key={j}
                      className="px-4 py-3 text-sm font-sans font-semibold text-[#182350]"
                    >
                      {v}
                    </td>
                  ))}
                  <td
                    className="px-4 py-3 text-xs font-sans font-bold"
                    style={{
                      color:
                        row.save?.startsWith("+") && row.label === "Travel Time"
                          ? "#B9915E"
                          : row.save?.startsWith("-")
                          ? "#2E9B68"
                          : row.save?.startsWith("+")
                          ? "#2E9B68"
                          : "#737985",
                    }}
                  >
                    {row.save || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Radar chart */}
        <div
          className="p-4 rounded-lg shadow-xs"
          style={{ background: "#FFFFFF", border: "1px solid #E6E2D8" }}
        >
          <div className="text-xs font-sans text-[#182350] font-bold uppercase tracking-wider mb-2">
            Performance Radar
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#ECE8DF" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#737985", fontSize: 10 }} />
              <Radar
                name="Fastest"
                dataKey="Fastest"
                stroke="#C94B4B"
                fill="#C94B4B"
                fillOpacity={0.08}
              />
              <Radar
                name="Efficient"
                dataKey="Efficient"
                stroke="#182350"
                fill="#AFD2FA"
                fillOpacity={0.25}
              />
              <Radar
                name="Custom"
                dataKey="Custom"
                stroke="#B9915E"
                fill="#B9915E"
                fillOpacity={0.1}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Custom plan controls */}
        <div
          className="p-4 rounded-lg shadow-xs"
          style={{ background: "#FFFFFF", border: "1px solid #E6E2D8" }}
        >
          <div className="text-xs font-sans text-[#182350] font-bold uppercase tracking-wider mb-4">
            Custom Plan Parameters
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-sans text-[#182350] font-semibold block mb-2">
                Speed: {customSpeed} knots
              </label>
              <input
                type="range"
                min="10"
                max="20"
                step="0.2"
                value={customSpeed}
                onChange={(e) => setCustomSpeed(Number(e.target.value))}
                className="w-full accent-[#182350] cursor-pointer"
              />
              <div className="flex justify-between text-xs font-sans text-[#737985] mt-1">
                <span>10 kn (Slow)</span>
                <span>20 kn (Full)</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-sans text-[#182350] font-semibold block mb-2">
                Fuel Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["LNG", "Methanol", "Ammonia"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setCustomFuel(f)}
                    className="py-2 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer"
                    style={
                      customFuel === f
                        ? { background: "#182350", border: "1px solid #182350", color: "#FFFFFF" }
                        : {
                            background: "#FFFFFF",
                            border: "1px solid #E6E2D8",
                            color: "#737985",
                          }
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ background: "#FAFAF5", border: "1px solid #E6E2D8" }}
            >
              <div className="text-[11px] font-sans text-[#737985] font-bold uppercase mb-2">
                Estimated Impact
              </div>
              <div className="space-y-1 text-xs font-sans">
                <div className="flex justify-between">
                  <span className="text-[#737985]">Est. Fuel:</span>
                  <span className="text-[#182350] font-bold">
                    {custom.fuelConsumption.toLocaleString()} t
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737985]">Est. Cost:</span>
                  <span className="text-[#182350] font-bold">
                    ${(custom.cost / 1e6).toFixed(2)}M
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737985]">Efficiency:</span>
                  <span className="text-[#182350] font-bold">{custom.efficiency}/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
