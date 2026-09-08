import { vessels, routePlans } from "../../data/fleet";

// Captain sees only vessel assigned to Capt. Arjun Mehta (c1 → v1) for demo
const CAPTAIN_VESSEL_ID = "v1";
const SELECTED_PLAN_LABEL = "Efficient";

// Mini SVG map for captain view
const W = 600;
const H = 320;

function toSVG(lat: number, lng: number) {
  const x = ((lng - 5) / (75 - 5)) * W;
  const y = H - ((lat - 10) / (55 - 10)) * H;
  return { x, y };
}

interface Props {
  username: string;
  onLogout: () => void;
}

export default function CaptainDashboard({ username, onLogout }: Props) {
  const vessel = vessels.find((v) => v.id === CAPTAIN_VESSEL_ID)!;
  const plans = routePlans[CAPTAIN_VESSEL_ID];
  const finalPlan = plans.find((p) => p.label === SELECTED_PLAN_LABEL)!;

  const routePoints = vessel.mapRoute.map(({ lat, lng }) => toSVG(lat, lng));
  const routeD = routePoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join("");
  const vesselSVG = toSVG(vessel.currentPos.lat, vessel.currentPos.lng);
  const originSVG = toSVG(vessel.mapRoute[0].lat, vessel.mapRoute[0].lng);
  const destSVG = toSVG(
    vessel.mapRoute[vessel.mapRoute.length - 1].lat,
    vessel.mapRoute[vessel.mapRoute.length - 1].lng
  );

  const schedule = [
    {
      event: "Departure",
      location: vessel.origin,
      date: "2026-09-01",
      time: "06:00",
      status: "completed",
    },
    {
      event: "Waypoint — Gulf of Aden",
      location: "12.0°N 45.0°E",
      date: "2026-09-08",
      time: "14:00",
      status: "completed",
    },
    {
      event: "Suez Canal Transit",
      location: "Suez Canal Entry",
      date: "2026-09-14",
      time: "08:00",
      status: "upcoming",
    },
    {
      event: "Mediterranean Passage",
      location: "Strait of Gibraltar",
      date: "2026-09-22",
      time: "20:00",
      status: "upcoming",
    },
    {
      event: "Arrival",
      location: vessel.destination,
      date: "2026-10-02",
      time: "09:00",
      status: "upcoming",
    },
  ];

  const voyageInstructions = [
    "Maintain recommended speed of 14.8 knots to meet optimized fuel plan.",
    "Reduce speed to 12 knots on approach to Suez Canal (75 nm before entry).",
    "Switch to low-sulfur fuel on entry to North Sea ECA zone.",
    "Report fuel levels every 12 hours to fleet controller.",
    "Weather alert: moderate seas expected Sep 10-12 in Arabian Sea. Adjust course per real-time weather.",
    "Mandatory bunkering stop at Fujairah if LNG falls below 30%.",
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FEFAEF" }}>
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-6 border-b border-[#182350]"
        style={{ background: "#FFFFFF", height: 52 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-xs"
            style={{ background: "#182350" }}
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="white">
              <path d="M2 13 L10 5 L18 13 L16 15 L10 9 L4 15 Z" />
              <path d="M4 15 L16 15 L17 17 L3 17 Z" />
            </svg>
          </div>
          <span className="text-sm font-extrabold text-[#182350]">GreenFleet OS</span>
          <span
            className="text-xs font-sans font-bold px-2 py-0.5 rounded ml-2 uppercase tracking-wider"
            style={{ background: "#EAF4FE", color: "#182350", border: "1px solid #AFD2FA" }}
          >
            Captain Portal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#EAF4FE] border border-[#AFD2FA]/50">
            <div className="w-2 h-2 rounded-full bg-[#182350]" />
            <span className="text-xs font-sans font-semibold text-[#182350]">⚓ {username}</span>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-sans text-[#737985] border border-[#182350] hover:border-red-400 hover:text-red-600 bg-white transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Final optimized plan banner */}
        <div
          className="p-5 rounded-lg relative overflow-hidden shadow-xs"
          style={{
            background: "#FFFFFF",
            border: "1px solid #AFD2FA",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#182350] animate-pulse" />
                <span className="text-xs font-sans tracking-widest text-[#182350] font-bold uppercase">
                  Final Optimized Voyage Plan
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#182350] mb-1">{vessel.name}</h1>
              <div className="text-sm text-[#737985] font-sans">{vessel.voyageId}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-sans text-[#737985] mb-1">
                Authorized by Fleet Controller
              </div>
              <div className="text-xs font-sans font-bold text-[#182350] px-2 py-0.5 rounded bg-[#EAF4FE] border border-[#AFD2FA]">
                {SELECTED_PLAN_LABEL.toUpperCase()} PLAN — APPROVED
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              {
                label: "Origin",
                value: vessel.origin.split(",")[0],
                sub: vessel.origin.split(",")[1]?.trim() || "",
              },
              {
                label: "Destination",
                value: vessel.destination.split(",")[0],
                sub: vessel.destination.split(",")[1]?.trim() || "",
              },
              {
                label: "Recommended Speed",
                value: `${finalPlan.avgSpeed} kn`,
                sub: "Optimized Target",
              },
              {
                label: "Fuel Type",
                value: vessel.fuelType,
                sub: `${vessel.fuelLevel}% available`,
              },
              {
                label: "Fuel Requirement",
                value: `${finalPlan.fuelConsumption.toLocaleString()} t`,
                sub: "total voyage",
              },
              {
                label: "Expected Emissions",
                value: `${finalPlan.emissions.toLocaleString()} tCO₂`,
                sub: "full voyage",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="p-3 rounded-lg shadow-2xs"
                style={{ background: "#FAFAF5", border: "1px solid #E6E2D8" }}
              >
                <div className="text-[11px] font-sans text-[#737985] mb-1 font-medium">{m.label}</div>
                <div className="font-extrabold text-[#182350] text-sm leading-tight">{m.value}</div>
                {m.sub && (
                  <div className="text-[10px] text-[#737985] mt-0.5 font-sans">{m.sub}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Map */}
          <div
            className="lg:col-span-2 rounded-lg shadow-xs overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E6E2D8" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#182350] bg-[#FDFCF7]">
              <div className="text-xs font-sans text-[#182350] font-bold uppercase tracking-wider">
                Final Optimized Route
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#182350] animate-pulse" />
                <span className="text-xs font-sans font-bold text-[#182350]">LIVE TRACKING</span>
              </div>
            </div>
            <div className="relative">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ background: "#EAF4FE" }}>
                {/* Grid */}
                {Array.from({ length: 12 }, (_, i) => (
                  <line
                    key={`v${i}`}
                    x1={i * 50}
                    y1="0"
                    x2={i * 50}
                    y2={H}
                    stroke="#DCEAF8"
                    strokeWidth="0.5"
                  />
                ))}
                {Array.from({ length: 7 }, (_, i) => (
                  <line
                    key={`h${i}`}
                    x1="0"
                    y1={i * 50}
                    x2={W}
                    y2={i * 50}
                    stroke="#DCEAF8"
                    strokeWidth="0.5"
                  />
                ))}

                {/* Landmasses */}
                <path
                  d="M370 40 L400 35 L420 45 L430 75 L440 110 L425 155 L405 190 L385 210 L365 190 L355 155 L360 100 L365 65 Z"
                  fill="#F5F5F0"
                  stroke="#E6E2D8"
                  strokeWidth="1"
                />
                <path
                  d="M270 60 L310 52 L340 65 L348 100 L335 140 L310 160 L288 140 L278 110 Z"
                  fill="#F5F5F0"
                  stroke="#E6E2D8"
                  strokeWidth="1"
                />
                <path
                  d="M180 110 L210 105 L228 120 L220 150 L205 165 L188 150 L178 128 Z"
                  fill="#F5F5F0"
                  stroke="#E6E2D8"
                  strokeWidth="1"
                />
                <path
                  d="M155 20 L240 10 L290 22 L300 45 L280 58 L240 52 L180 42 Z"
                  fill="#F5F5F0"
                  stroke="#E6E2D8"
                  strokeWidth="1"
                />

                {/* Planned route (dashed) */}
                <path
                  d={routeD}
                  fill="none"
                  stroke="#737985"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  opacity="0.6"
                />
                {/* Completed segment */}
                <path
                  d={routePoints
                    .slice(0, 3)
                    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
                    .join("")}
                  fill="none"
                  stroke="#182350"
                  strokeWidth="2.5"
                />

                {/* Waypoints */}
                {routePoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="3"
                    fill={i === 0 || i === routePoints.length - 1 ? "#182350" : "#737985"}
                  />
                ))}

                {/* Origin */}
                <circle cx={originSVG.x} cy={originSVG.y} r="8" fill="#EAF4FE" stroke="#AFD2FA" />
                <circle cx={originSVG.x} cy={originSVG.y} r="4.5" fill="#182350" />
                <text
                  x={originSVG.x + 10}
                  y={originSVG.y + 4}
                  fontSize="8"
                  fill="#182350"
                  fontFamily="Inter, sans-serif"
                  fontWeight="700"
                >
                  {vessel.origin.split(",")[0]}
                </text>

                {/* Destination */}
                <circle
                  cx={destSVG.x}
                  cy={destSVG.y}
                  r="8"
                  fill="#FEE2E2"
                  stroke="#FCA5A5"
                />
                <circle cx={destSVG.x} cy={destSVG.y} r="4.5" fill="#C94B4B" />
                <text
                  x={destSVG.x + 10}
                  y={destSVG.y + 4}
                  fontSize="8"
                  fill="#C94B4B"
                  fontFamily="Inter, sans-serif"
                  fontWeight="700"
                >
                  Rotterdam
                </text>

                {/* Vessel */}
                <circle cx={vesselSVG.x} cy={vesselSVG.y} r="16" fill="#AFD2FA" fillOpacity={0.4} />
                <circle cx={vesselSVG.x} cy={vesselSVG.y} r="5.5" fill="#182350" />
                <text
                  x={vesselSVG.x + 12}
                  y={vesselSVG.y - 4}
                  fontSize="8"
                  fill="#182350"
                  fontFamily="Inter, sans-serif"
                  fontWeight="bold"
                >
                  {vessel.name.replace("MV ", "")}
                </text>
                <text
                  x={vesselSVG.x + 12}
                  y={vesselSVG.y + 6}
                  fontSize="7"
                  fill="#737985"
                  fontFamily="Inter, sans-serif"
                >
                  {vessel.speed}kn · {vessel.voyageProgress}%
                </text>

                {/* ECA label */}
                <rect
                  x="440"
                  y="15"
                  width="60"
                  height="18"
                  rx="3"
                  fill="#EAF4FE"
                  stroke="#AFD2FA"
                  strokeWidth="1"
                />
                <text
                  x={470}
                  y={27}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#182350"
                  fontFamily="Inter, sans-serif"
                  fontWeight="bold"
                >
                  ECA ZONE
                </text>
              </svg>
            </div>
          </div>

          {/* Schedule */}
          <div
            className="rounded-lg shadow-xs overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E6E2D8" }}
          >
            <div className="px-4 py-3 border-b border-[#182350] bg-[#FDFCF7]">
              <div className="text-xs font-sans text-[#182350] font-bold uppercase tracking-wider">
                Voyage Schedule
              </div>
            </div>
            <div className="p-4">
              <div className="relative">
                <div
                  className="absolute left-4 top-4 bottom-4 w-0.5"
                  style={{ background: "#ECE8DF" }}
                />
                <div className="space-y-4">
                  {schedule.map((s, i) => (
                    <div key={i} className="flex gap-4">
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center z-10 text-xs font-bold font-sans shadow-2xs"
                        style={{
                          background: s.status === "completed" ? "#182350" : "#FAFAF5",
                          border: `2px solid ${s.status === "completed" ? "#182350" : "#E6E2D8"
                            }`,
                          color: s.status === "completed" ? "#FFFFFF" : "#737985",
                        }}
                      >
                        {s.status === "completed" ? "✓" : i + 1}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="text-xs font-bold text-[#182350]">{s.event}</div>
                        <div className="text-xs text-[#3F4654]">{s.location}</div>
                        <div className="text-[11px] font-sans text-[#737985] mt-0.5">
                          {s.date} · {s.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Cargo info */}
          <div
            className="rounded-lg shadow-xs overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E6E2D8" }}
          >
            <div className="px-4 py-3 border-b border-[#182350] bg-[#FDFCF7]">
              <div className="text-xs font-sans text-[#182350] font-bold uppercase tracking-wider">
                Cargo Information
              </div>
            </div>
            <div className="p-4 space-y-3">
              {vessel.holds.map((h) => {
                const pct = Math.round((h.currentCargo / h.capacity) * 100);
                return (
                  <div key={h.id} className="flex items-center gap-4">
                    <div className="w-20 text-xs font-sans font-semibold text-[#182350]">
                      {h.name}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-[#ECE8DF]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: "#182350" }}
                        />
                      </div>
                    </div>
                    <div className="text-xs font-sans text-right w-24">
                      <span className="font-bold text-[#182350]">
                        {h.currentCargo.toLocaleString()}
                      </span>
                      <span className="text-[#737985]"> / {h.capacity.toLocaleString()} t</span>
                    </div>
                    <div className="text-xs text-[#737985] w-20 truncate">{h.cargoType}</div>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-[#ECE8DF] flex justify-between text-xs font-sans">
                <span className="text-[#737985]">Total Loaded</span>
                <span className="text-[#182350] font-bold">
                  {vessel.currentLoad.toLocaleString()} / {vessel.capacity.toLocaleString()} t (
                  {Math.round((vessel.currentLoad / vessel.capacity) * 100)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Voyage instructions */}
          <div
            className="rounded-lg shadow-xs overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E6E2D8" }}
          >
            <div className="px-4 py-3 border-b border-[#182350] bg-[#FDFCF7]">
              <div className="text-xs font-sans text-[#182350] font-bold uppercase tracking-wider">
                Voyage Instructions
              </div>
            </div>
            <div className="p-4 space-y-2">
              {voyageInstructions.map((instruction, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 rounded-lg"
                  style={{ background: "#FAFAF5", border: "1px solid #E6E2D8" }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold font-sans"
                    style={{ background: "#EAF4FE", color: "#182350", border: "1px solid #AFD2FA" }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-xs text-[#3F4654] leading-relaxed font-sans">{instruction}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              label: "Current Speed",
              value: `${vessel.speed} kn`,
              target: `Target: ${finalPlan.avgSpeed} kn`,
            },
            {
              label: "Fuel Level",
              value: `${vessel.fuelLevel}%`,
              target: `${((vessel.fuelLevel / 100) * vessel.fuelCapacity).toFixed(0)} t avail`,
            },
            {
              label: "Voyage Progress",
              value: `${vessel.voyageProgress}%`,
              target: `${vessel.origin.split(",")[0]} → ${vessel.destination.split(",")[0]}`,
            },
            {
              label: "Daily Fuel Use",
              value: `${vessel.fuelConsumption.voyage} t/d`,
              target: `Target: ${(
                finalPlan.fuelConsumption /
                (finalPlan.travelTime / 24)
              ).toFixed(1)} t/d`,
            },
            {
              label: "Daily Emissions",
              value: `${vessel.emissions} tCO₂`,
              target: `CII: ${vessel.emissions < 50 ? "A" : "B"} Rating`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-lg shadow-xs"
              style={{ background: "#FFFFFF", border: "1px solid #E6E2D8" }}
            >
              <div className="text-[10.5px] font-sans text-[#737985] uppercase tracking-wider mb-1 font-bold">
                {stat.label}
              </div>
              <div className="text-xl font-extrabold font-sans mb-1 text-[#182350]">{stat.value}</div>
              <div className="text-[11px] text-[#737985] font-sans">{stat.target}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
