import { Vessel } from "../../data/fleet";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  vessel: Vessel;
}

interface Scenario {
  id: string;
  label: string;
  fuelType: string;
  speed: number;
  load: number;
  route: string;
  weather: string;
  shorePower: boolean;
  color: string;
}

type EventCategory =
  | "weather"
  | "port"
  | "fuel"
  | "route"
  | "cargo"
  | "vessel"
  | "schedule"
  | "shorePower";

interface DisruptionParams {
  // Port
  portName: string;
  congestionLevel: "Low" | "Moderate" | "High" | "Severe";
  waitingHours: number;
  availableBerths: number;
  portClosed: boolean;

  // Weather
  weatherCondition: "Calm" | "Moderate" | "Rough" | "Severe";
  windSpeed: number;
  waveHeight: number;
  speedRestrictionPct: number;

  // Fuel
  fuelType: string;
  fuelAvailabilityDelta: number;
  fuelPriceDelta: number;
  bunkeringStatus: "Available" | "Delayed" | "Unavailable";

  // Route
  routeVariant: "Standard" | "Optimized" | "ECA Avoidance" | "Storm Diversion";
  distanceModifier: number;
  hraAvoidance: boolean;

  // Cargo
  cargoLoad: number;
  cargoType: string;
  draftDepth: number;

  // Vessel
  engineDeratingPct: number;
  auxGenStatus: string;
  hullFoulingPct: number;

  // Schedule
  etaConstraint: "Strict Window" | "Flexible (±12h)";
  delayPenaltyPerHour: number;
  berthWindowBuffer: number;

  // Shore Power
  shorePowerAvailable: boolean;
  coldIroningMandatory: boolean;
  gridPowerPrice: number;
}

interface SimulationImpact {
  title: string;
  description: string;
  eta: { value: string; delta: string; status: "Safe" | "At Risk" | "Violated" };
  fuel: { value: string; delta: string; status: "Safe" | "At Risk" | "Violated" };
  cost: { value: string; delta: string; status: "Safe" | "At Risk" | "Violated" };
  ghg: { value: string; delta: string; status: "Safe" | "At Risk" | "Violated" };
  berth: { value: string; delta: string; status: "Safe" | "At Risk" | "Violated" };
  deadline: { value: string; delta: string; status: "Safe" | "At Risk" | "Violated" };
}

interface ConstraintItem {
  id: string;
  name: string;
  status: "Safe" | "At Risk" | "Violated";
  normal: string;
  simulated: string;
  impact: string;
  result: string;
}

interface TimelineStep {
  time: string;
  location: string;
  action: string;
  isDelay?: boolean;
  isChanged?: boolean;
}

interface RecoveryOption {
  id: "A" | "B" | "C";
  title: string;
  subtitle: string;
  tactic: string;
  speed: number;
  route: string;
  fuelType: string;
  shorePower: boolean;
  eta: string;
  etaDelta: string;
  fuel: number;
  fuelDelta: number;
  cost: number;
  costDelta: number;
  ghg: number;
  ghgDelta: number;
  feasibility: string;
  risk: "Safe" | "At Risk" | "Violated";
  riskLabel: string;
  resilienceScore: number;
  resilienceGrade: string;
  resilienceBreakdown: {
    weather: number;
    fuel: number;
    port: number;
    schedule: number;
    route: number;
  };
  timeline: TimelineStep[];
  decisionTrace: string[];
}

type StressTestScenario =
  | "NORMAL"
  | "HEAVY_WEATHER"
  | "PORT_CONGESTION"
  | "FUEL_SHORTAGE"
  | "PORT_CLOSURE"
  | "ROUTE_RESTRICTION";

interface StressTestResult {
  scenarioId: StressTestScenario;
  label: string;
  icon: string;
  status: "OPTIMAL" | "FEASIBLE" | "AT RISK" | "RECOVERY REQUIRED";
  statusColor: string;
  etaImpact: string;
  fuelImpact: string;
  costImpact: string;
  costImpactRupees: string;
  ghgImpact: string;
  constraintSummary: string;
  recommendedAction: string;
  availableRecoveryPlan: string;
}

const initialDisruptionParams: DisruptionParams = {
  portName: "Port B (Singapore Approaches)",
  congestionLevel: "High",
  waitingHours: 6,
  availableBerths: 1,
  portClosed: false,

  weatherCondition: "Severe",
  windSpeed: 35,
  waveHeight: 5.2,
  speedRestrictionPct: -20,

  fuelType: "LNG",
  fuelAvailabilityDelta: -30,
  fuelPriceDelta: 10,
  bunkeringStatus: "Available",

  routeVariant: "Storm Diversion",
  distanceModifier: 180,
  hraAvoidance: false,

  cargoLoad: 52000,
  cargoType: "Cryogenic LNG",
  draftDepth: 12.8,

  engineDeratingPct: -15,
  auxGenStatus: "2/3 Online",
  hullFoulingPct: 8,

  etaConstraint: "Strict Window",
  delayPenaltyPerHour: 2500,
  berthWindowBuffer: 2,

  shorePowerAvailable: true,
  coldIroningMandatory: true,
  gridPowerPrice: 0.18,
};

// Deterministic scenario calculation
function calcScenario(s: Scenario, vessel: Vessel) {
  const baseFC = vessel.fuelConsumption?.voyage || 68.4;
  const vesselSpeed = vessel.speed || 15;
  const speedFactor = Math.pow(s.speed / vesselSpeed, 3);
  const vesselCap = vessel.capacity || 74000;
  const loadFactor = 0.7 + (s.load / vesselCap) * 0.4;
  const weatherFactors: Record<string, number> = {
    Calm: 1.0,
    Moderate: 1.08,
    Rough: 1.18,
    Severe: 1.32,
    Storm: 1.35,
  };
  const fuelFactors: Record<string, number> = {
    LNG: 1.0,
    Methanol: 0.92,
    Ammonia: 0.88,
    Hydrogen: 0.75,
    VLSFO: 1.12,
  };
  const baseFuel =
    baseFC *
    speedFactor *
    loadFactor *
    (weatherFactors[s.weather] || 1.0) *
    (fuelFactors[s.fuelType] || 1.0) *
    (s.shorePower ? 0.92 : 1.0);
  const emissionFactors: Record<string, number> = {
    LNG: 2.75,
    Methanol: 1.37,
    Ammonia: 0,
    Hydrogen: 0,
    VLSFO: 3.17,
  };
  const emissions = baseFuel * (emissionFactors[s.fuelType] || 2.75);
  const fuelCostPerTonne: Record<string, number> = {
    LNG: 680,
    Methanol: 420,
    Ammonia: 380,
    Hydrogen: 2200,
    VLSFO: 550,
  };
  const routeCount = vessel.mapRoute?.length || 8;
  const distance = s.route === "Optimized" ? routeCount * 1500 : routeCount * 1600;
  const time = distance / s.speed;
  const cost = baseFuel * (fuelCostPerTonne[s.fuelType] || 680);
  return {
    fuel: +baseFuel.toFixed(1),
    emissions: +emissions.toFixed(1),
    cost: +cost.toFixed(0),
    time: +time.toFixed(0),
    efficiency: Math.max(
      20,
      Math.min(100, Math.round(100 - (baseFuel / baseFC - 1) * 60 - (speedFactor - 1) * 30))
    ),
  };
}

function evaluateConstraints(
  category: EventCategory,
  params: DisruptionParams,
  vessel: Vessel
): ConstraintItem[] {
  const isPortClosed = params.portClosed;
  const isSevereWeather = params.weatherCondition === "Severe";
  const isHighCongestion = params.congestionLevel === "High" || params.congestionLevel === "Severe";

  return [
    {
      id: "vessel-capacity",
      name: "Vessel Capacity",
      status: "Safe",
      normal: `${vessel.capacity.toLocaleString()} t DWT`,
      simulated: `${(params.cargoLoad || vessel.currentLoad).toLocaleString()} t Loaded (72%)`,
      impact: "Zero structural stress",
      result: "Payload within certified longitudinal shear limit.",
    },
    {
      id: "draft",
      name: "Draft Depth",
      status: params.draftDepth > 13.5 ? "At Risk" : "Safe",
      normal: "12.2 m Design Draft",
      simulated: `${params.draftDepth.toFixed(1)} m Current Draft`,
      impact: params.draftDepth > 13.5 ? "Under-keel clearance < 1.0m" : "Optimal clearance",
      result:
        params.draftDepth > 13.5
          ? "Shallow channel requires high-tide pilotage."
          : "Full channel navigation clearance confirmed.",
    },
    {
      id: "berth-availability",
      name: "Berth Availability",
      status:
        isPortClosed || params.availableBerths === 0
          ? "Violated"
          : params.availableBerths === 1
          ? "At Risk"
          : "Safe",
      normal: "3 Dedicated Berths",
      simulated: isPortClosed
        ? "0 Berths (Port Closed)"
        : `${params.availableBerths} Berth(s) Available`,
      impact: `Predicted waiting: +${params.waitingHours} hours`,
      result:
        isPortClosed || params.availableBerths === 0
          ? "Critical berth lockout. Re-allocation required."
          : params.availableBerths === 1
          ? "Original schedule becomes at risk due to single quay bottleneck."
          : "Berth slot reserved with adequate turnaround buffer.",
    },
    {
      id: "port-capacity",
      name: "Port Capacity",
      status: isPortClosed ? "Violated" : isHighCongestion ? "At Risk" : "Safe",
      normal: "100% Terminal Throughput",
      simulated: isPortClosed
        ? "0% (Terminal Suspended)"
        : isHighCongestion
        ? "42% (Anchorage Congested)"
        : "88% Nominal",
      impact: isHighCongestion ? "Tugboat and pilot delays" : "Standard pilotage",
      result: isPortClosed
        ? "Harbor operations shut down by port captaincy."
        : isHighCongestion
        ? "Quay cranes operating at reduced cycle."
        : "Port handling capacity within normal threshold.",
    },
    {
      id: "fuel-availability",
      name: "Fuel Availability",
      status:
        params.fuelAvailabilityDelta < -20 || params.bunkeringStatus === "Unavailable"
          ? "Violated"
          : params.fuelAvailabilityDelta < 0
          ? "At Risk"
          : "Safe",
      normal: "100% Bunkering Supply",
      simulated: `${params.fuelType} (${params.fuelAvailabilityDelta > 0 ? "+" : ""}${
        params.fuelAvailabilityDelta
      }%)`,
      impact: `Status: ${params.bunkeringStatus}`,
      result:
        params.bunkeringStatus === "Unavailable"
          ? "Fuel shortage at port terminal. Bunker diversion required."
          : params.fuelAvailabilityDelta < 0
          ? "Tight spot supply; bunker queue active."
          : "Certified bunker barge on standby.",
    },
    {
      id: "fuel-reserve",
      name: "Fuel Reserve",
      status: params.waitingHours > 8 ? "At Risk" : "Safe",
      normal: "15.0% Mandatory Reserve",
      simulated: params.waitingHours > 8 ? "8.2% Reserve Margin" : "14.5% Reserve Margin",
      impact: `Auxiliary burn: +${(params.waitingHours * 0.35).toFixed(1)} t`,
      result:
        params.waitingHours > 8
          ? "Extended loitering erodes emergency reserve."
          : "Safety margin compliant with SOLAS.",
    },
    {
      id: "route-feasibility",
      name: "Route Feasibility",
      status:
        isSevereWeather && params.routeVariant === "Standard"
          ? "Violated"
          : params.hraAvoidance
          ? "At Risk"
          : "Safe",
      normal: "Standard Direct Corridor",
      simulated: params.routeVariant,
      impact: `Detour: +${params.distanceModifier} nm`,
      result:
        isSevereWeather && params.routeVariant === "Standard"
          ? "Wave height > 5m exceeds comfort limit on direct path."
          : "Corridor verified against bathymetric depth charts.",
    },
    {
      id: "delivery-deadline",
      name: "Delivery Deadline",
      status:
        isPortClosed || params.waitingHours > 5
          ? "Violated"
          : params.waitingHours > 2
          ? "At Risk"
          : "Safe",
      normal: "SLA Window (Target 22:00)",
      simulated: isPortClosed
        ? "SLA Breached (+18h)"
        : params.waitingHours > 5
        ? "SLA Breached by 3.5h"
        : "Tight Buffer (1.2h)",
      impact: `Penalty: $${params.delayPenaltyPerHour}/hr`,
      result:
        isPortClosed || params.waitingHours > 5
          ? "Contractual late delivery penalties triggered."
          : "Delivery window maintained with buffer management.",
    },
    {
      id: "weather",
      name: "Weather & Sea State",
      status:
        params.weatherCondition === "Severe"
          ? "Violated"
          : params.weatherCondition === "Rough"
          ? "At Risk"
          : "Safe",
      normal: "Calm / Beaufort 2",
      simulated: `${params.weatherCondition} (${params.windSpeed} kn, ${params.waveHeight}m waves)`,
      impact: `Speed restriction: ${params.speedRestrictionPct}%`,
      result:
        params.weatherCondition === "Severe"
          ? "Gale force head seas increase hull resistance by 28%."
          : "Metocean conditions within vessel stability envelope.",
    },
    {
      id: "emission-limit",
      name: "Emission Limit (CII)",
      status: "Safe",
      normal: "IMO CII Grade A (<45 t/d)",
      simulated: "38.6 t CO₂/day Projected",
      impact: "0.88 Rating Factor",
      result: "Vessel maintains EU ETS and IMO CII compliance.",
    },
    {
      id: "shore-power",
      name: "Shore Power",
      status: params.shorePowerAvailable ? "Safe" : "At Risk",
      normal: "Cold Ironing Grid Plug",
      simulated: params.shorePowerAvailable
        ? "Available (100% Green Grid)"
        : "Unavailable (Auxiliary Gens Required)",
      impact: params.shorePowerAvailable
        ? "Zero port emissions"
        : "Aux Gens burn +1.8 t fuel at berth",
      result: params.shorePowerAvailable
        ? "Berth plug-in active; auxiliary engines shut down."
        : "Port emissions surcharges apply.",
    },
  ];
}

function generateRecoveryPlans(
  vessel: Vessel,
  params: DisruptionParams,
  category: EventCategory
): {
  currentPlan: any;
  options: RecoveryOption[];
  baselineTimeline: TimelineStep[];
} {
  const originName = vessel.origin ? vessel.origin.split(",")[0].trim() : "Mangalore";
  const destName = vessel.destination ? vessel.destination.split(",")[0].trim() : "Singapore";

  const baseFuel = 420;
  const baseCost = 285600;
  const baseGHG = 1245;

  const baselineTimeline: TimelineStep[] = [
    { time: "08:00", location: `${originName} Port`, action: "Depart Berth — Full Propulsion" },
    { time: "12:00", location: "WayPoint Alpha (Approach)", action: "Speed 13.2 kn — Direct Track" },
    {
      time: "18:00",
      location: `${destName} Outer Roads`,
      action: "Anchor Queue / Pilot Standby",
      isDelay: true,
    },
    {
      time: "20:00",
      location: `${destName} Terminal Quay`,
      action: "Berth Entry & Cargo Offload",
      isDelay: true,
    },
    {
      time: "23:30",
      location: `${destName} Final Release`,
      action: "Delayed Voyage Completion",
      isDelay: true,
    },
  ];

  const optionA: RecoveryOption = {
    id: "A",
    title: "Option A: Change Route",
    subtitle: "Reroute via Alternate Deepwater Corridor",
    tactic:
      "Bypass congested outer anchorage via South Fairway Channel to Alternate Berth D.",
    speed: 13.0,
    route: `${originName} → South Fairway Bypass → ${destName} Quay D`,
    fuelType: vessel.fuelType || "LNG",
    shorePower: true,
    eta: "19:40 UTC",
    etaDelta: "+40 min",
    fuel: 412,
    fuelDelta: -8,
    cost: 280160,
    costDelta: -5440,
    ghg: 1221,
    ghgDelta: -24,
    feasibility: "96% High",
    risk: "Safe",
    riskLabel: "LOW RISK (16%)",
    resilienceScore: 82,
    resilienceGrade: "HIGH",
    resilienceBreakdown: {
      weather: 88,
      fuel: 80,
      port: 85,
      schedule: 78,
      route: 94,
    },
    timeline: [
      { time: "08:00", location: `${originName} Port`, action: "Depart Berth — Full Propulsion" },
      {
        time: "11:30",
        location: "WayPoint Alpha Diversion",
        action: "Course Shift 142° via South Fairway",
        isChanged: true,
      },
      {
        time: "16:45",
        location: "Fairway Channel Clear",
        action: "Speed 13.0 kn — Bypass Congestion",
        isChanged: true,
      },
      {
        time: "19:00",
        location: `${destName} Quay D`,
        action: "Direct Berth Allocation (No Queue)",
        isChanged: true,
      },
      {
        time: "21:15",
        location: `${destName} Terminal`,
        action: "Cargo Ops Completed on SLA",
        isChanged: true,
      },
    ],
    decisionTrace: [
      `1. Disruption in primary corridor triggered route rerouting threshold.`,
      `2. Evaluated navigational draft for South Fairway Bypass (${(
        params.draftDepth || 12.8
      ).toFixed(1)}m fits within 14.5m chart depth).`,
      `3. Alternate Berth D in ${destName} confirmed 0 waiting hours vs +${params.waitingHours}h at main terminal.`,
      `4. Net detour distance (+45 nm) offset by avoiding 6 hours of idling fuel burn.`,
      `5. Total fuel saved: 8 tonnes; emissions reduced by 24 t CO₂e.`,
      `6. Optimizer verified ETA 19:40 UTC safely satisfies delivery contract window.`,
    ],
  };

  const optionB: RecoveryOption = {
    id: "B",
    title: "Option B: Reduce Speed",
    subtitle: "Virtual Arrival & Dynamic Speed Trimming",
    tactic:
      "Slow-steam from 13.2 kn down to 11.7 kn to absorb harbor wait at sea and save bunker fuel.",
    speed: 11.7,
    route: `${originName} → Standard Eco Track → ${destName}`,
    fuelType: vessel.fuelType || "LNG",
    shorePower: true,
    eta: "19:05 UTC",
    etaDelta: "+35 min",
    fuel: 398,
    fuelDelta: -22,
    cost: 270640,
    costDelta: -14960,
    ghg: 1185,
    ghgDelta: -60,
    feasibility: "98% Optimal",
    risk: "Safe",
    riskLabel: "MINIMAL RISK (12%)",
    resilienceScore: 86,
    resilienceGrade: "HIGH",
    resilienceBreakdown: {
      weather: 84,
      fuel: 92,
      port: 88,
      schedule: 85,
      route: 82,
    },
    timeline: [
      { time: "08:00", location: `${originName} Port`, action: "Depart Berth — Eco Propulsion" },
      {
        time: "12:00",
        location: "WayPoint Alpha",
        action: "Speed Trimmed 13.2 kn → 11.7 kn",
        isChanged: true,
      },
      {
        time: "16:30",
        location: "Mid-Voyage Eco Sector",
        action: "Virtual Arrival Sync with Port Authority",
        isChanged: true,
      },
      {
        time: "18:45",
        location: `${destName} Approach`,
        action: "Seamless Pilot Boarding (Zero Wait)",
        isChanged: true,
      },
      {
        time: "20:30",
        location: `${destName} Berth 2`,
        action: "Cold Ironing Connected & Discharged",
        isChanged: true,
      },
    ],
    decisionTrace: [
      `1. Port congestion at ${params.portName} identified expected waiting time of +${params.waitingHours}.0 hours.`,
      `2. High-speed cruising into a queue wastes auxiliary and propulsion fuel without advancing berth entry.`,
      `3. Applied cubic speed-power curve: reducing speed from 13.2 kn to 11.7 kn reduces specific fuel oil consumption by 18.4%.`,
      `4. Virtual Arrival algorithm synced arrival timestamp with opening of Berth Slot #2 at 18:45 UTC.`,
      `5. Fuel burn reduced by 22 tonnes (-5.2%), saving $14,960 in operating expenditure.`,
      `6. Lifecycle greenhouse gases cut by 60 t CO₂e while preserving contractual SLA margin.`,
    ],
  };

  const optionC: RecoveryOption = {
    id: "C",
    title: "Option C: Change Fuel & Shore Power",
    subtitle: "Green Methanol Dual-Fuel & Cold Ironing",
    tactic:
      "Switch propulsion blend to Green Methanol with mandatory 100% renewable cold ironing at berth.",
    speed: 12.8,
    route: `${originName} → Green Corridor → ${destName}`,
    fuelType: "Methanol",
    shorePower: true,
    eta: "18:50 UTC",
    etaDelta: "+20 min",
    fuel: 384,
    fuelDelta: -36,
    cost: 264200,
    costDelta: -21400,
    ghg: 890,
    ghgDelta: -355,
    feasibility: "92% Feasible",
    risk: "Safe",
    riskLabel: "ECO SAFE (8%)",
    resilienceScore: 89,
    resilienceGrade: "EXCELLENT",
    resilienceBreakdown: {
      weather: 82,
      fuel: 95,
      port: 90,
      schedule: 88,
      route: 85,
    },
    timeline: [
      { time: "08:00", location: `${originName} Port`, action: "Depart on Green Methanol Blend" },
      {
        time: "12:00",
        location: "ECA Green Corridor Entry",
        action: "Speed 12.8 kn — Low-Emission Mode",
        isChanged: true,
      },
      {
        time: "17:15",
        location: `${destName} Outer Roads`,
        action: "Priority Green Vessel Queue Pass",
        isChanged: true,
      },
      {
        time: "18:50",
        location: `${destName} Berth 1`,
        action: "High-Voltage Shore Connection (HVSC)",
        isChanged: true,
      },
      {
        time: "20:45",
        location: `${destName} Clean Terminal`,
        action: "Zero-Emission Port Turnaround",
        isChanged: true,
      },
    ],
    decisionTrace: [
      `1. Environmental constraints and carbon intensity index prioritized for port entry clearance.`,
      `2. Switched dual-fuel combustion cycle to Green Methanol (1.37 tCO₂/t factor vs 2.75 for LNG).`,
      `3. Port of ${destName} grants green-docking priority lane, cutting anchorage queue by 4 hours.`,
      `4. Berth cold-ironing enables complete auxiliary engine shutdown during 8h cargo cycle.`,
      `5. Massive 355 tonne CO₂e lifecycle reduction (-28.5%) achieved.`,
      `6. Optimizer verified fuel bunkering availability and price index balance.`,
    ],
  };

  const currentPlan = {
    vesselName: vessel.name,
    route: `${originName} → ${destName} (Direct)`,
    speed: vessel.speed || 13.2,
    fuelType: vessel.fuelType || "LNG",
    cargo: `${(vessel.currentLoad || 48000).toLocaleString()} t Cryogenic LNG`,
    eta: "18:30 UTC",
    fuel: baseFuel,
    cost: baseCost,
    ghg: baseGHG,
    risk: "HIGH RISK (78%)",
    timeline: baselineTimeline,
  };

  return {
    currentPlan,
    options: [optionA, optionB, optionC],
    baselineTimeline,
  };
}

const defaultScenarios: Scenario[] = [
  {
    id: "A",
    label: "Current Plan",
    fuelType: "LNG",
    speed: 16,
    load: 52000,
    route: "Standard",
    weather: "Calm",
    shorePower: false,
    color: "#5a7fa8",
  },
  {
    id: "B",
    label: "Eco Speed",
    fuelType: "LNG",
    speed: 13,
    load: 52000,
    route: "Optimized",
    weather: "Calm",
    shorePower: false,
    color: "#18A6A6",
  },
  {
    id: "C",
    label: "Green Fuel",
    fuelType: "Methanol",
    speed: 14,
    load: 52000,
    route: "Standard",
    weather: "Moderate",
    shorePower: true,
    color: "#1D3554",
  },
  {
    id: "D",
    label: "Heavy Load Fast",
    fuelType: "LNG",
    speed: 18,
    load: 70000,
    route: "Standard",
    weather: "Rough",
    shorePower: false,
    color: "#C94B4B",
  },
];

const categoryList: { id: EventCategory; label: string; icon: string; description: string }[] = [
  { id: "weather", label: "Weather", icon: "⛈", description: "Sea state, gale winds, wave heights" },
  { id: "port", label: "Port", icon: "⚓", description: "Congestion, berth delays, port closures" },
  { id: "fuel", label: "Fuel", icon: "⛽", description: "Bunkering shortage, fuel prices, availability" },
  { id: "route", label: "Route", icon: "🧭", description: "Corridor diversions, ECA zones, HRA bypass" },
  { id: "cargo", label: "Cargo", icon: "📦", description: "Load variation, draft constraints, hazmat" },
  { id: "vessel", label: "Vessel", icon: "⛴", description: "Engine derating, hull fouling, genset status" },
  { id: "schedule", label: "Schedule", icon: "⏱", description: "Target ETA windows, SLA penalties" },
  { id: "shorePower", label: "Shore Power", icon: "⚡", description: "Cold ironing mandate & grid availability" },
];

export default function WhatIfAnalysis({ vessel }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>(defaultScenarios);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>("port");
  const [params, setParams] = useState<DisruptionParams>(initialDisruptionParams);
  const [activeSimulation, setActiveSimulation] = useState<SimulationImpact | null>(null);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  // Task 2 Re-Optimization States
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizingStep, setOptimizingStep] = useState(0);
  const [hasOptimized, setHasOptimized] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<"A" | "B" | "C">("B");
  const [selectedConstraint, setSelectedConstraint] = useState<ConstraintItem | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [activePlanApplied, setActivePlanApplied] = useState(false);

  // ----------------------------------------------------
  // Task 3: Resilience Testing & Operational Sensitivity States
  // ----------------------------------------------------
  const [activeStressScenario, setActiveStressScenario] =
    useState<StressTestScenario>("PORT_CONGESTION");

  // Sensitivity Sliders State
  const [sensSpeed, setSensSpeed] = useState(vessel.speed || 13.2);
  const [sensWeather, setSensWeather] = useState<"Calm" | "Moderate" | "Rough" | "Severe">("Moderate");
  const [sensCargo, setSensCargo] = useState(vessel.currentLoad || 52000);
  const [sensDraft, setSensDraft] = useState(12.8);
  const [sensTrim, setSensTrim] = useState<"Even Keel" | "0.5m Aft" | "1.0m Aft">("0.5m Aft");

  // Compute results for saved scenarios
  const results = scenarios.map((s) => ({ ...s, result: calcScenario(s, vessel) }));

  // Generate dynamic recovery plans and constraints
  const recoveryData = generateRecoveryPlans(vessel, params, selectedCategory);
  const constraintList = evaluateConstraints(selectedCategory, params, vessel);
  const currentSelectedOption =
    recoveryData.options.find((o) => o.id === selectedOptionId) || recoveryData.options[1];

  // Helper to execute disruption simulation
  const executeSimulation = () => {
    let impact: SimulationImpact;

    if (selectedCategory === "port") {
      const wait = params.waitingHours;
      const isClosed = params.portClosed;
      const berths = isClosed ? 0 : params.availableBerths;
      const costAdd = wait * 2500 + (isClosed ? 35000 : 8500);
      const fuelAdd = +(wait * 0.4 + (params.congestionLevel === "Severe" ? 4.2 : 2.1)).toFixed(1);
      const ghgAdd = +(fuelAdd * 2.75).toFixed(1);

      impact = {
        title: isClosed
          ? `Port Closure Emergency: ${params.portName}`
          : `Port Congestion Detected: ${params.portName}`,
        description: isClosed
          ? `Harbor authority issued temporary shutdown. Berth access suspended. Projected delay: +${wait + 18} hours.`
          : `High vessel traffic in outer anchorage. Predicted additional waiting: +${wait.toFixed(1)} hours. Available berths: ${berths}.`,
        eta: {
          value: isClosed ? `Delayed +${wait + 18}h` : `Delayed +${wait.toFixed(1)}h`,
          delta: `+${wait.toFixed(1)} hours`,
          status: isClosed || wait > 8 ? "Violated" : wait > 3 ? "At Risk" : "Safe",
        },
        fuel: {
          value: `${(vessel.fuelConsumption?.voyage || 68.4) + fuelAdd} t`,
          delta: `+${fuelAdd} t (Boil-off / Aux)`,
          status: fuelAdd > 5 ? "Violated" : fuelAdd > 2 ? "At Risk" : "Safe",
        },
        cost: {
          value: `$${((68.4 * 680 + costAdd) / 1000).toFixed(1)}k`,
          delta: `+$${(costAdd / 1000).toFixed(1)}k (Demurrage)`,
          status: costAdd > 20000 ? "Violated" : "At Risk",
        },
        ghg: {
          value: `+${ghgAdd} t CO₂e`,
          delta: `+${ghgAdd} t (Stationary)`,
          status: ghgAdd > 20 ? "At Risk" : "Safe",
        },
        berth: {
          value: `${berths} Berth${berths === 1 ? "" : "s"} Allocated`,
          delta: berths === 0 ? "No Berths (Queue > 14 ships)" : "Constrained Window (2.5h)",
          status: berths === 0 ? "Violated" : berths === 1 ? "At Risk" : "Safe",
        },
        deadline: {
          value: isClosed || wait > 5 ? "Breached by 3.5 hours" : "Tight Buffer (1.2h remaining)",
          delta: isClosed || wait > 5 ? "SLA Breached" : "At Risk",
          status: isClosed || wait > 5 ? "Violated" : "At Risk",
        },
      };
    } else if (selectedCategory === "weather") {
      const spdDrop = Math.abs(params.speedRestrictionPct);
      const isSevere = params.weatherCondition === "Severe" || params.weatherCondition === "Rough";
      const extraTimeHrs = +((spdDrop / 100) * 26).toFixed(1);
      const fuelSurge = +(isSevere ? 12.8 : 4.5).toFixed(1);
      const ghgSurge = +(fuelSurge * 2.75).toFixed(1);
      const costSurge = Math.round(fuelSurge * 680 + extraTimeHrs * 1200);

      impact = {
        title: `Severe Metocean Alert: ${params.weatherCondition} Sea State`,
        description: `Wind speed ${params.windSpeed} kn, significant wave height ${params.waveHeight} m. Hull resistance up by ${(params.waveHeight * 4.2).toFixed(0)}%. Speed restricted by ${spdDrop}%.`,
        eta: {
          value: `Delayed +${extraTimeHrs}h`,
          delta: `+${extraTimeHrs} hrs in transit`,
          status: extraTimeHrs > 6 ? "Violated" : "At Risk",
        },
        fuel: {
          value: `+${fuelSurge} t`,
          delta: `+${fuelSurge} t (Wave resistance)`,
          status: fuelSurge > 10 ? "Violated" : "At Risk",
        },
        cost: {
          value: `+$${(costSurge / 1000).toFixed(1)}k`,
          delta: `+$${(costSurge / 1000).toFixed(1)}k total`,
          status: costSurge > 15000 ? "Violated" : "At Risk",
        },
        ghg: {
          value: `+${ghgSurge} t CO₂e`,
          delta: `+${ghgSurge} t emissions`,
          status: ghgSurge > 25 ? "Violated" : "At Risk",
        },
        berth: {
          value: "Arrival Window Shifted",
          delta: "Pilot boarding delayed",
          status: "At Risk",
        },
        deadline: {
          value: extraTimeHrs > 5 ? "Delivery SLA at Risk" : "Within Buffer (+1.5h margin)",
          delta: extraTimeHrs > 5 ? "Deadline Threatened" : "Buffer Consumed",
          status: extraTimeHrs > 5 ? "Violated" : "At Risk",
        },
      };
    } else {
      impact = {
        title: `Operational Parameter Shift: ${selectedCategory.toUpperCase()}`,
        description: `Simulated impact on vessel operating profile and port turnaround constraints.`,
        eta: {
          value: "Delayed +2.5h",
          delta: "+2.5 hrs operational lag",
          status: "At Risk",
        },
        fuel: {
          value: "+3.8 t",
          delta: "+3.8 t consumption variance",
          status: "Safe",
        },
        cost: {
          value: "+$5.4k",
          delta: "+$5,400 operational adjustments",
          status: "Safe",
        },
        ghg: {
          value: "+10.4 t CO₂e",
          delta: "+10.4 t lifecycle index",
          status: "Safe",
        },
        berth: {
          value: "Slot Synced",
          delta: "Ready on approach",
          status: "Safe",
        },
        deadline: {
          value: "Within SLA Window",
          delta: "+2.0h margin preserved",
          status: "Safe",
        },
      };
    }

    if (editingScenario) {
      setScenarios((prev) =>
        prev.map((s) => (s.id === editingScenario.id ? { ...editingScenario } : s))
      );
    }

    setActiveSimulation(impact);
    setShowBuilder(false);
    setEditingScenario(null);
    setHasOptimized(false);
  };

  const handleStartReoptimization = () => {
    setIsOptimizing(true);
    setOptimizingStep(0);
    setHasOptimized(false);

    setTimeout(() => {
      setOptimizingStep(1);
    }, 450);

    setTimeout(() => {
      setOptimizingStep(2);
    }, 900);

    setTimeout(() => {
      setIsOptimizing(false);
      setHasOptimized(true);
      setActionNotice("✓ NEW OPTIMIZED PLAN GENERATED — Multi-objective Pareto frontier solved.");
      setTimeout(() => setActionNotice(null), 7000);
    }, 1350);
  };

  const handleApplyNewPlan = () => {
    setActivePlanApplied(true);
    setActionNotice(
      `✓ New optimized plan (${currentSelectedOption.title}) applied to ${vessel.name}. Voyage schedule & engine telegraph updated.`
    );
    setTimeout(() => setActionNotice(null), 8000);
  };

  const handleSaveAsScenario = () => {
    const newId = String.fromCharCode(65 + scenarios.length);
    const newScenario: Scenario = {
      id: newId,
      label: `Recovery Plan: ${currentSelectedOption.title}`,
      fuelType: currentSelectedOption.fuelType,
      speed: currentSelectedOption.speed,
      load: params.cargoLoad || vessel.currentLoad || 52000,
      route: currentSelectedOption.route.includes("Bypass") ? "Optimized" : "Standard",
      weather: params.weatherCondition || "Calm",
      shorePower: currentSelectedOption.shorePower,
      color: "#2E9B68",
    };

    setScenarios((prev) => [...prev, newScenario]);
    setActionNotice(`✓ Saved as Scenario ${newId} in Saved Scenarios below.`);
    setTimeout(() => setActionNotice(null), 6000);
  };

  const openScenarioEdit = (s: Scenario) => {
    setEditingScenario({ ...s });
    if (s.weather !== "Calm") {
      setSelectedCategory("weather");
      setParams((prev) => ({ ...prev, weatherCondition: (s.weather as any) || "Moderate" }));
    } else if (s.fuelType !== "LNG") {
      setSelectedCategory("fuel");
      setParams((prev) => ({ ...prev, fuelType: s.fuelType }));
    } else {
      setSelectedCategory("port");
    }
    setShowBuilder(true);
  };

  const openGeneralSimulator = () => {
    setEditingScenario(null);
    setSelectedCategory("port");
    setShowBuilder(true);
  };

  const getStatusBadgeStyle = (status: "Safe" | "At Risk" | "Violated") => {
    switch (status) {
      case "Safe":
        return {
          bg: "rgba(46, 155, 104, 0.15)",
          border: "#2E9B68",
          text: "#2E9B68",
          dot: "#2E9B68",
          icon: "🟢",
        };
      case "At Risk":
        return {
          bg: "rgba(217, 154, 43, 0.15)",
          border: "#D99A2B",
          text: "#D99A2B",
          dot: "#D99A2B",
          icon: "🟡",
        };
      case "Violated":
        return {
          bg: "rgba(201, 75, 75, 0.15)",
          border: "#C94B4B",
          text: "#C94B4B",
          dot: "#C94B4B",
          icon: "🔴",
        };
    }
  };

  // ----------------------------------------------------
  // Task 3: Stress Test Scenarios Data Generator
  // ----------------------------------------------------
  const stressTestScenarios: StressTestResult[] = useMemo(() => {
    return [
      {
        scenarioId: "NORMAL",
        label: "Normal Conditions",
        icon: "☀️",
        status: "OPTIMAL",
        statusColor: "#2E9B68",
        etaImpact: "±0 min (On Schedule)",
        fuelImpact: "±0.0 t (Nominal)",
        costImpact: "+$0.0k",
        costImpactRupees: "₹0.00 Cr",
        ghgImpact: "±0.0 t CO₂e",
        constraintSummary: "100% boundary conditions fully compliant with zero risk.",
        recommendedAction: "Proceed on designated eco-speed track.",
        availableRecoveryPlan: "Option B: Virtual Arrival (Active)",
      },
      {
        scenarioId: "HEAVY_WEATHER",
        label: "Heavy Weather (Gale)",
        icon: "🌊",
        status: "FEASIBLE",
        statusColor: "#2E9B68",
        etaImpact: "+45 min",
        fuelImpact: "+12.4 t",
        costImpact: "+$14.5k",
        costImpactRupees: "+₹0.12 Cr",
        ghgImpact: "+34.1 t CO₂e",
        constraintSummary: "Wave height 4.8m managed; engine output derated to 82% to protect hull.",
        recommendedAction: "Execute Option B speed trimming to ride trailing wave swell.",
        availableRecoveryPlan: "Option B: Reduce Speed (Optimal)",
      },
      {
        scenarioId: "PORT_CONGESTION",
        label: "Port Congestion (+6h)",
        icon: "⚓",
        status: "FEASIBLE",
        statusColor: "#2E9B68",
        etaImpact: "+35 min (Absorbed)",
        fuelImpact: "-22.0 t (Virtual Arrival)",
        costImpact: "+$9.8k",
        costImpactRupees: "+₹0.08 Cr",
        ghgImpact: "-60.0 t CO₂e",
        constraintSummary: "Berth availability constrained (1 slot). Virtual arrival syncs arrival to open quay.",
        recommendedAction: "Pre-notify port captaincy for synchronized pilot boarding.",
        availableRecoveryPlan: "Option B: Virtual Arrival (Active)",
      },
      {
        scenarioId: "FUEL_SHORTAGE",
        label: "Fuel Shortage (-30%)",
        icon: "⛽",
        status: "FEASIBLE",
        statusColor: "#2E9B68",
        etaImpact: "+15 min",
        fuelImpact: "Stock preserved (18% reserve)",
        costImpact: "+$18.0k",
        costImpactRupees: "+₹0.15 Cr",
        ghgImpact: "0.0 t delta",
        constraintSummary: "Emergency reserve buffer remains above 14% SOLAS compliance limit.",
        recommendedAction: "Transition to Methanol blend (Option C) or enable shore power cold ironing.",
        availableRecoveryPlan: "Option C: Change Fuel & Shore Power",
      },
      {
        scenarioId: "PORT_CLOSURE",
        label: "Port Closure (Emergency)",
        icon: "🚫",
        status: "RECOVERY REQUIRED",
        statusColor: "#C94B4B",
        etaImpact: "+1h 15m",
        fuelImpact: "+25.0 t",
        costImpact: "+$48.5k",
        costImpactRupees: "+₹0.40 Cr",
        ghgImpact: "+70.0 t CO₂e",
        constraintSummary: "Primary harbor suspended. Divert required to alternate deepwater port.",
        recommendedAction: "Activate Option A: Divert course to Alternate Berth D / South Fairway.",
        availableRecoveryPlan: "Option A: Change Route (Required)",
      },
      {
        scenarioId: "ROUTE_RESTRICTION",
        label: "Route Restriction (HRA Bypass)",
        icon: "🧭",
        status: "FEASIBLE",
        statusColor: "#2E9B68",
        etaImpact: "+50 min",
        fuelImpact: "+14.2 t",
        costImpact: "+$22.0k",
        costImpactRupees: "+₹0.18 Cr",
        ghgImpact: "+39.0 t CO₂e",
        constraintSummary: "High Risk Area corridor bypassed (+80 nm). Depth clearance confirmed.",
        recommendedAction: "Maintain escort corridor speed vector at 12.8 kn.",
        availableRecoveryPlan: "Option A: Change Route (Bypass)",
      },
    ];
  }, []);

  const activeStressData =
    stressTestScenarios.find((s) => s.scenarioId === activeStressScenario) ||
    stressTestScenarios[2];

  // ----------------------------------------------------
  // Task 3: Sensitivity Calculations & Chart Data Generator
  // ----------------------------------------------------
  const sensitivityOutputs = useMemo(() => {
    const baseFC = vessel.fuelConsumption?.voyage || 68.4;
    const speedCoeff = Math.pow(sensSpeed / 13.2, 3);
    const cargoCoeff = 0.65 + (sensCargo / (vessel.capacity || 74000)) * 0.45;
    const weatherMult =
      sensWeather === "Severe"
        ? 1.32
        : sensWeather === "Rough"
        ? 1.18
        : sensWeather === "Moderate"
        ? 1.08
        : 1.0;
    const trimMult = sensTrim === "1.0m Aft" ? 0.96 : sensTrim === "0.5m Aft" ? 0.98 : 1.02;

    const dynamicFuel = +(baseFC * speedCoeff * cargoCoeff * weatherMult * trimMult).toFixed(1);
    const dynamicETA = +(
      (vessel.mapRoute?.length ? vessel.mapRoute.length * 1500 : 12000) / sensSpeed / 24 +
      (sensWeather === "Severe" ? 0.8 : sensWeather === "Rough" ? 0.4 : 0)
    ).toFixed(1);
    const dynamicEmissions = +(
      dynamicFuel * (vessel.fuelType === "Methanol" ? 1.37 : 2.75)
    ).toFixed(1);
    const dynamicDraft = +(10.8 + (sensCargo / (vessel.capacity || 74000)) * 2.8).toFixed(1);

    return {
      fuel: dynamicFuel,
      etaDays: dynamicETA,
      emissions: dynamicEmissions,
      draft: dynamicDraft,
    };
  }, [sensSpeed, sensWeather, sensCargo, sensTrim, vessel]);

  const sensitivityChartData = useMemo(() => {
    const speeds = [10, 11, 12, 13, 14, 15, 16, 17, 18];
    const cargoRatio = 0.65 + (sensCargo / (vessel.capacity || 74000)) * 0.45;

    return speeds.map((spd) => {
      const baseCalm = 68.4 * Math.pow(spd / 13.2, 3) * cargoRatio * 1.0;
      const currentSea =
        68.4 *
        Math.pow(spd / 13.2, 3) *
        cargoRatio *
        (sensWeather === "Severe" ? 1.32 : sensWeather === "Rough" ? 1.18 : 1.08);
      const heavyGale = 68.4 * Math.pow(spd / 13.2, 3) * cargoRatio * 1.35;

      return {
        speed: `${spd} kn`,
        "Calm Sea": +baseCalm.toFixed(1),
        "Current State": +currentSea.toFixed(1),
        "Severe Gale": +heavyGale.toFixed(1),
      };
    });
  }, [sensCargo, sensWeather, vessel]);

  const originName = vessel.origin ? vessel.origin.split(",")[0].trim() : "Mangalore";
  const destinationName = vessel.destination ? vessel.destination.split(",")[0].trim() : "Singapore";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ------------------------------------------------ */}
      {/* 1. TOP HEADER */}
      {/* ------------------------------------------------ */}
      <div className="panel border border-[#182350]/20 p-5" style={{ background: "#FFFFFF", borderColor: "rgba(24, 35, 80, 0.2)" }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold text-[#182350] tracking-wider">
            WHAT-IF & RESILIENCE CENTER
          </h2>

          {/* Vessel Meta Context & Primary CTA */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="px-3 py-2 rounded bg-[#FAFAF5] border border-[#182350]/20 flex items-center gap-2">
              <span className="text-[11px] text-[#737985] uppercase font-sans tracking-wider">
                Vessel:
              </span>
              <span className="text-xs font-semibold text-[#182350] flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: vessel.color || "#18A6A6" }}
                />
                {vessel.name}
              </span>
            </div>

            <div className="px-3 py-2 rounded bg-[#FAFAF5] border border-[#182350]/20 flex items-center gap-2">
              <span className="text-[11px] text-[#737985] uppercase font-sans tracking-wider">
                Voyage:
              </span>
              <span className="text-xs font-semibold text-[#182350] flex items-center gap-1">
                <span>{originName}</span>
                <span className="text-[#18A6A6]">→</span>
                <span>{destinationName}</span>
              </span>
            </div>

            <button
              id="simulate-disruption-btn"
              onClick={openGeneralSimulator}
              className="px-4 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center gap-2 cursor-pointer hover:opacity-95 active:scale-95"
              style={{
                background: "#18A6A6",
                color: "#FFFFFF",
                boxShadow: "0 0 15px rgba(24, 166, 166, 0.35)",
              }}
            >
              <span className="text-sm font-extrabold">+</span>
              SIMULATE DISRUPTION
            </button>
          </div>
        </div>
      </div>

      {/* Global Notification Banner */}
      {actionNotice && (
        <div
          className="p-3.5 rounded text-xs flex items-center justify-between transition-all duration-300 shadow-md animate-in fade-in"
          style={{
            background: "rgba(24, 166, 166, 0.15)",
            border: "1px solid #18A6A6",
            color: "#FFFFFF",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#18A6A6] text-[#FAFAF5] flex items-center justify-center font-bold text-xs">
              ✓
            </span>
            <span className="font-sans font-medium">{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-[#737985] hover:text-[#182350] px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* 2. SIMULATION RESULT WARNING PANEL */}
      {/* ------------------------------------------------ */}
      {activeSimulation && (
        <div
          id="simulation-result-panel"
          className="panel border border-[#182350]/20 p-5 relative overflow-hidden transition-all duration-300"
          style={{
            background: "#FFFFFF",
            border: "1px solid #D99A2B",
            boxShadow: "0 0 20px rgba(217, 154, 43, 0.15)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-[#182350]/20 gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base"
                style={{
                  background: "rgba(217, 154, 43, 0.2)",
                  color: "#D99A2B",
                  border: "1px solid #D99A2B",
                }}
              >
                ⚠
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-[#182350] tracking-wide uppercase">
                    CURRENT PLAN AFFECTED
                  </h3>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase tracking-wider"
                    style={{
                      background: "rgba(201, 75, 75, 0.2)",
                      color: "#C94B4B",
                      border: "1px solid #C94B4B",
                    }}
                  >
                    Resilience Alert
                  </span>
                </div>
                <div className="text-xs text-[#B9915E] font-medium mt-0.5">
                  {activeSimulation.title} — {activeSimulation.description}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowBuilder(true)}
                className="px-3 py-1.5 rounded text-xs font-sans text-secondary-foreground hover:text-[#182350] border border-[#182350]/20 hover:border-[#182350]/20 transition-colors cursor-pointer"
                style={{ background: "#FAFAF5" }}
              >
                ✎ Adjust Parameters
              </button>
              <button
                id="reoptimize-plan-btn"
                onClick={handleStartReoptimization}
                disabled={isOptimizing}
                className="px-4 py-1.5 rounded text-xs font-bold font-sans uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-md flex items-center gap-2 hover:opacity-95"
                style={{
                  background: isOptimizing ? "rgba(24, 35, 80, 0.2)" : "#2E9B68",
                  color: "#FFFFFF",
                }}
              >
                {isOptimizing ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <span>⟳</span>
                    <span>RE-OPTIMIZE PLAN</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveSimulation(null);
                  setHasOptimized(false);
                }}
                className="px-2.5 py-1.5 rounded text-xs text-[#737985] hover:text-[#182350] border border-[#182350]/20/40 cursor-pointer"
                title="Dismiss simulation result"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "ETA", ...activeSimulation.eta },
              { label: "Fuel", ...activeSimulation.fuel },
              { label: "Cost", ...activeSimulation.cost },
              { label: "Lifecycle GHG", ...activeSimulation.ghg },
              { label: "Berth Availability", ...activeSimulation.berth },
              { label: "Delivery Deadline", ...activeSimulation.deadline },
            ].map((m) => {
              const b = getStatusBadgeStyle(m.status);
              return (
                <div
                  key={m.label}
                  className="p-3 rounded bg-[#FAFAF5] border border-[#182350]/20 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-sans text-[#737985] uppercase tracking-wider">
                      {m.label}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: b.bg, border: `1px solid ${b.border}`, color: b.text }}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#182350] mb-0.5 truncate">{m.value}</div>
                  <div className="text-[10px] font-sans truncate" style={{ color: b.text }} title={m.delta}>
                    {m.delta}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OPTIMIZER PROGRESSION STATE */}
      {isOptimizing && (
        <div
          className="panel border border-[#182350]/20 p-6 border border-[#18A6A6] bg-[#FFFFFF] shadow-xl text-center space-y-4 animate-in fade-in"
          style={{ boxShadow: "0 0 25px rgba(24, 166, 166, 0.2)" }}
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-[#18A6A6] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-[#182350] uppercase tracking-wider">
              {optimizingStep === 0 && "Analyzing operational constraints & berth windows..."}
              {optimizingStep === 1 && "Evaluating multi-objective speed & route alternatives..."}
              {optimizingStep === 2 && "Generating feasible recovery plans & Pareto frontier..."}
            </span>
          </div>
          <div className="max-w-md mx-auto h-1.5 bg-[#FAFAF5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#18A6A6] transition-all duration-500"
              style={{ width: `${(optimizingStep + 1) * 33}%` }}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* RE-OPTIMIZATION & DECISION INTELLIGENCE CENTERPIECE */}
      {/* ------------------------------------------------ */}
      {hasOptimized && (
        <div id="reoptimized-results-centerpiece" className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-[#FFFFFF] border border-[#18A6A6]/60 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#18A6A6]/20 border border-[#18A6A6] flex items-center justify-center font-bold text-[#18A6A6] text-sm">
                ✓
              </div>
              <div>
                <div className="text-sm font-extrabold text-[#182350] tracking-wider uppercase flex items-center gap-2">
                  <span>NEW OPTIMIZED PLAN GENERATED</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#2E9B68]/20 text-[#2E9B68] border border-[#2E9B68]">
                    Feasibility Solved
                  </span>
                </div>
                <div className="text-xs text-[#737985] font-sans">
                  Active Strategy:{" "}
                  <span className="text-[#18A6A6] font-semibold">{currentSelectedOption.title}</span> —{" "}
                  {currentSelectedOption.tactic}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#737985] font-sans">Switch Strategy:</span>
              <div className="flex bg-[#FAFAF5] p-1 rounded border border-[#182350]/20">
                {(["A", "B", "C"] as const).map((optId) => (
                  <button
                    key={optId}
                    onClick={() => setSelectedOptionId(optId)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      selectedOptionId === optId
                        ? "bg-[#18A6A6] text-[#FAFAF5]"
                        : "text-[#737985] hover:text-[#182350]"
                    }`}
                  >
                    Opt {optId}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CURRENT PLAN VS RE-OPTIMIZED PLAN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div
              className="panel border border-[#182350]/20 p-5 relative overflow-hidden"
              style={{ background: "#FFFFFF", borderColor: "#C94B4B" }}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#182350]/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-[#C94B4B]" />
                  <h4 className="text-sm font-extrabold text-[#182350] uppercase tracking-wider">
                    CURRENT PLAN (DISRUPTED)
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C94B4B]/20 text-[#C94B4B] border border-[#C94B4B]">
                  HIGH RISK (78%)
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Vessel</span>
                  <span className="font-semibold text-[#182350]">{recoveryData.currentPlan.vesselName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Route</span>
                  <span className="font-sans text-secondary-foreground font-medium text-right">
                    {recoveryData.currentPlan.route}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Speed</span>
                  <span className="font-sans text-[#182350] font-bold">
                    {recoveryData.currentPlan.speed} kn
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Fuel Type</span>
                  <span className="font-sans text-secondary-foreground">{recoveryData.currentPlan.fuelType}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Cargo</span>
                  <span className="font-sans text-secondary-foreground">{recoveryData.currentPlan.cargo}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">ETA</span>
                  <span className="font-sans font-bold text-amber-400">
                    {recoveryData.currentPlan.eta} (Delayed +6h queue)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Fuel Consumption</span>
                  <span className="font-sans font-bold text-red-400">
                    {recoveryData.currentPlan.fuel} t (Aux surge)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Operating Cost</span>
                  <span className="font-sans font-bold text-red-400">
                    ${(recoveryData.currentPlan.cost / 1000).toFixed(1)}k
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#737985] font-sans">Lifecycle GHG</span>
                  <span className="font-sans text-secondary-foreground font-medium">
                    {recoveryData.currentPlan.ghg} t CO₂e
                  </span>
                </div>
              </div>
            </div>

            <div
              className="panel border border-[#182350]/20 p-5 relative overflow-hidden"
              style={{
                background: "#FFFFFF",
                borderColor: "#18A6A6",
                boxShadow: "0 0 25px rgba(24, 166, 166, 0.2)",
              }}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#182350]/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-[#18A6A6] animate-pulse" />
                  <h4 className="text-sm font-extrabold text-[#182350] uppercase tracking-wider">
                    RE-OPTIMIZED PLAN ({currentSelectedOption.title})
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2E9B68]/20 text-[#2E9B68] border border-[#2E9B68]">
                  {currentSelectedOption.riskLabel}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Vessel</span>
                  <span className="font-semibold text-[#182350]">{vessel.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Route</span>
                  <span className="font-sans text-[#18A6A6] font-bold text-right">
                    {currentSelectedOption.route}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Speed</span>
                  <div className="flex items-center gap-2 font-sans font-bold">
                    <span className="text-[#737985] line-through">
                      {recoveryData.currentPlan.speed} kn
                    </span>
                    <span className="text-[#18A6A6]">→ {currentSelectedOption.speed} kn</span>
                  </div>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Fuel Type</span>
                  <div className="flex items-center gap-2 font-sans">
                    {currentSelectedOption.fuelType !== recoveryData.currentPlan.fuelType ? (
                      <>
                        <span className="text-[#737985] line-through">
                          {recoveryData.currentPlan.fuelType}
                        </span>
                        <span className="text-[#18A6A6] font-bold">
                          → {currentSelectedOption.fuelType}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#182350]">{currentSelectedOption.fuelType}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Cargo</span>
                  <span className="font-sans text-secondary-foreground">
                    {recoveryData.currentPlan.cargo}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">ETA</span>
                  <div className="flex items-center gap-2 font-sans font-bold">
                    <span className="text-[#737985] line-through">18:30</span>
                    <span className="text-[#182350]">→ {currentSelectedOption.eta}</span>
                    <span className="text-xs text-[#2E9B68] font-normal">
                      ({currentSelectedOption.etaDelta})
                    </span>
                  </div>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Fuel Consumption</span>
                  <div className="flex items-center gap-2 font-sans font-bold">
                    <span className="text-[#737985] line-through">
                      {recoveryData.currentPlan.fuel} t
                    </span>
                    <span className="text-[#18A6A6]">→ {currentSelectedOption.fuel} t</span>
                    <span className="text-xs text-[#2E9B68] font-normal">
                      ({currentSelectedOption.fuelDelta} t)
                    </span>
                  </div>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20/30">
                  <span className="text-[#737985] font-sans">Operating Cost</span>
                  <div className="flex items-center gap-2 font-sans font-bold">
                    <span className="text-[#737985] line-through">
                      ${(recoveryData.currentPlan.cost / 1000).toFixed(1)}k
                    </span>
                    <span className="text-[#18A6A6]">
                      → ${(currentSelectedOption.cost / 1000).toFixed(1)}k
                    </span>
                    <span className="text-xs text-[#2E9B68] font-normal">
                      (-${(Math.abs(currentSelectedOption.costDelta) / 1000).toFixed(1)}k)
                    </span>
                  </div>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#737985] font-sans">Lifecycle GHG</span>
                  <div className="flex items-center gap-2 font-sans font-bold">
                    <span className="text-[#737985] line-through">
                      {recoveryData.currentPlan.ghg} t
                    </span>
                    <span className="text-[#18A6A6]">→ {currentSelectedOption.ghg} t</span>
                    <span className="text-xs text-[#2E9B68] font-normal">
                      ({currentSelectedOption.ghgDelta} t CO₂e)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* IMPACT ANALYSIS */}
          <div className="panel border border-[#182350]/20 p-5 bg-[#FFFFFF] border border-[#182350]/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-[#182350] uppercase tracking-wider">
                  IMPACT ANALYSIS
                </h4>
                <div className="text-[11px] font-sans text-[#737985]">
                  Quantitative performance deltas between baseline disrupted plan and re-optimized strategy
                </div>
              </div>
              <span className="text-xs font-sans text-[#18A6A6] font-semibold">
                Multi-Variable Optimization Result
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-3.5 rounded bg-[#FAFAF5] border border-[#182350]/20">
                <div className="text-[11px] font-sans text-[#737985] uppercase mb-1">Fuel</div>
                <div className="text-xs font-sans text-[#737985] mb-1">
                  {recoveryData.currentPlan.fuel} t → {currentSelectedOption.fuel} t
                </div>
                <div className="text-base font-bold text-[#18A6A6] font-sans">
                  {currentSelectedOption.fuelDelta} t
                </div>
                <div className="text-[10px] text-emerald-400 font-sans mt-0.5">
                  {(
                    (currentSelectedOption.fuelDelta / recoveryData.currentPlan.fuel) *
                    100
                  ).toFixed(1)}
                  % Reduction
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#FAFAF5] border border-[#182350]/20">
                <div className="text-[11px] font-sans text-[#737985] uppercase mb-1">Cost</div>
                <div className="text-xs font-sans text-[#737985] mb-1">
                  ${(recoveryData.currentPlan.cost / 1000).toFixed(0)}k → $
                  {(currentSelectedOption.cost / 1000).toFixed(0)}k
                </div>
                <div className="text-base font-bold text-[#18A6A6] font-sans">
                  -${(Math.abs(currentSelectedOption.costDelta) / 1000).toFixed(1)}k
                </div>
                <div className="text-[10px] text-emerald-400 font-sans mt-0.5">
                  Avoids demurrage penalty
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#FAFAF5] border border-[#182350]/20">
                <div className="text-[11px] font-sans text-[#737985] uppercase mb-1">ETA</div>
                <div className="text-xs font-sans text-[#737985] mb-1">
                  18:30 → {currentSelectedOption.eta}
                </div>
                <div className="text-base font-bold text-amber-400 font-sans">
                  {currentSelectedOption.etaDelta}
                </div>
                <div className="text-[10px] text-[#737985] font-sans mt-0.5">
                  Absorbs +6.0h harbor queue
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#FAFAF5] border border-[#182350]/20">
                <div className="text-[11px] font-sans text-[#737985] uppercase mb-1">
                  Lifecycle GHG
                </div>
                <div className="text-xs font-sans text-[#737985] mb-1">
                  {recoveryData.currentPlan.ghg} t → {currentSelectedOption.ghg} t
                </div>
                <div className="text-base font-bold text-[#18A6A6] font-sans">
                  {currentSelectedOption.ghgDelta} t
                </div>
                <div className="text-[10px] text-emerald-400 font-sans mt-0.5">
                  CII Grade A compliant
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#FAFAF5] border border-[#182350]/20 col-span-2 lg:col-span-1">
                <div className="text-[11px] font-sans text-[#737985] uppercase mb-1">Risk Profile</div>
                <div className="text-xs font-sans text-[#737985] mb-1">
                  78% (Critical) → 12% (Safe)
                </div>
                <div className="text-base font-bold text-[#2E9B68] font-sans">-66% Risk</div>
                <div className="text-[10px] text-emerald-400 font-sans mt-0.5">
                  Berth & deadline secured
                </div>
              </div>
            </div>
          </div>

          {/* WHAT CHANGED? TIMELINE */}
          <div className="panel border border-[#182350]/20 p-5 bg-[#FFFFFF] border border-[#182350]/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#182350] uppercase tracking-wider">
                  WHAT CHANGED? — VOYAGE TIMELINE COMPARISON
                </h4>
                <div className="text-[11px] font-sans text-[#737985]">
                  Original disrupted sequence vs new synchronized tactical execution
                </div>
              </div>
              <span className="text-[11px] font-sans px-2.5 py-1 rounded bg-[#FAFAF5] text-secondary-foreground border border-[#182350]/20">
                Virtual Arrival Synchronization
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded bg-[#FAFAF5] border border-red-500/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#182350]/20/40">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                    ORIGINAL TIMELINE (DISRUPTED)
                  </span>
                  <span className="text-[10px] text-[#737985] font-sans">Anchorage Idling</span>
                </div>
                <div className="space-y-2.5 text-xs">
                  {recoveryData.baselineTimeline.map((step, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-2 rounded ${
                        step.isDelay ? "bg-red-500/10 border border-red-500/30" : "bg-[#FFFFFF]/60"
                      }`}
                    >
                      <span className="font-mono font-bold text-[#737985] w-12 flex-shrink-0">
                        {step.time}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-[#182350]">{step.location}</div>
                        <div className="text-[11px] text-[#737985] font-sans">{step.action}</div>
                      </div>
                      {step.isDelay && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold uppercase">
                          Delayed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded bg-[#FAFAF5] border border-[#18A6A6]/60 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#182350]/20/40">
                  <span className="text-xs font-bold text-[#18A6A6] uppercase tracking-wider">
                    RE-OPTIMIZED TIMELINE ({currentSelectedOption.title})
                  </span>
                  <span className="text-[10px] text-[#2E9B68] font-sans">Zero Harbor Queue</span>
                </div>
                <div className="space-y-2.5 text-xs">
                  {currentSelectedOption.timeline.map((step, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-2 rounded transition-all ${
                        step.isChanged
                          ? "bg-[#18A6A6]/10 border border-[#18A6A6]/40"
                          : "bg-[#FFFFFF]/60"
                      }`}
                    >
                      <span className="font-mono font-bold text-[#18A6A6] w-12 flex-shrink-0">
                        {step.time}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-[#182350]">{step.location}</div>
                        <div className="text-[11px] text-[#737985] font-sans">{step.action}</div>
                      </div>
                      {step.isChanged && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#18A6A6]/20 text-[#18A6A6] font-bold uppercase">
                          Optimized
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CONSTRAINT IMPACT MATRIX */}
          <div className="panel border border-[#182350]/20 p-5 bg-[#FFFFFF] border border-[#182350]/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#182350] uppercase tracking-wider">
                  CONSTRAINT IMPACT EVALUATION
                </h4>
                <div className="text-[11px] font-sans text-[#737985]">
                  Real-time status across 11 key maritime boundary conditions. Click any constraint for full diagnostic.
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-sans">
                <span className="flex items-center gap-1 text-[#2E9B68]">🟢 SAFE</span>
                <span className="flex items-center gap-1 text-[#D99A2B]">🟡 AT RISK</span>
                <span className="flex items-center gap-1 text-[#C94B4B]">🔴 VIOLATED</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {constraintList.map((c) => {
                const b = getStatusBadgeStyle(c.status);
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConstraint(c)}
                    className="p-3 rounded bg-[#FAFAF5] border transition-all cursor-pointer hover:border-primary/70 group"
                    style={{ borderColor: `${b.border}60` }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#182350] group-hover:text-[#18A6A6] transition-colors">
                        {c.name}
                      </span>
                      <span className="text-xs">{b.icon}</span>
                    </div>
                    <div className="text-[10px] text-[#737985] font-sans truncate mb-1">
                      {c.simulated}
                    </div>
                    <div
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block"
                      style={{ background: b.bg, color: b.text }}
                    >
                      {c.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OPTIMIZER DECISION TRACE */}
          <div className="panel border border-[#182350]/20 p-5 bg-[#FFFFFF] border border-[#182350]/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#182350]/20/40">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#18A6A6]/20 text-[#18A6A6] flex items-center justify-center font-bold text-xs">
                  ⚡
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#182350] uppercase tracking-wider">
                    WHY DID THE OPTIMIZER CHANGE THE PLAN?
                  </h4>
                  <div className="text-[11px] font-sans text-[#737985]">
                    Deterministic Multi-Objective Solver Trace · Mathematical Decision Logic
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAFAF5] text-[#18A6A6] border border-[#182350]/20">
                LOG: SOLVER_RES_v2.4
              </span>
            </div>

            <div className="p-4 rounded bg-[#FAFAF5] border border-[#182350]/20 space-y-2.5">
              {currentSelectedOption.decisionTrace.map((line, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <span className="font-mono font-bold text-[#18A6A6] w-5 text-right flex-shrink-0">
                    {idx + 1}.
                  </span>
                  <span className="text-slate-200 font-sans leading-relaxed">
                    {line.replace(/^\d+\.\s*/, "")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RECOVERY OPTIONS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#182350] uppercase tracking-wider">
                  FEASIBLE RECOVERY OPTIONS
                </h4>
                <div className="text-[11px] font-sans text-[#737985]">
                  Select an alternative optimization profile to balance speed, emissions, and cost
                </div>
              </div>
              <span className="text-xs font-sans text-[#737985]">
                3 Feasible Paths Solved
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recoveryData.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`panel p-4 rounded-lg flex flex-col justify-between transition-all duration-200 ${
                      isSelected
                        ? "border-2 border-[#18A6A6] bg-[#FFFFFF] shadow-lg"
                        : "border border-[#182350]/20 bg-[#FFFFFF] hover:border-primary/50"
                    }`}
                    style={
                      isSelected ? { boxShadow: "0 0 18px rgba(24, 166, 166, 0.25)" } : {}
                    }
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              background: isSelected ? "#18A6A6" : "rgba(24, 35, 80, 0.2)",
                              color: isSelected ? "#FAFAF5" : "#FFFFFF",
                            }}
                          >
                            {opt.id}
                          </span>
                          <span className="text-xs font-bold text-[#182350] tracking-wide">
                            {opt.title.replace(/^Option\s[A-C]:\s*/, "")}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-[#FAFAF5] text-[#18A6A6] border border-[#182350]/20">
                          {opt.feasibility}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#737985] font-sans mb-3 line-clamp-2">
                        {opt.tactic}
                      </div>

                      <div className="space-y-1.5 text-xs bg-[#FAFAF5] p-3 rounded border border-[#182350]/20 mb-4">
                        <div className="flex justify-between">
                          <span className="text-[#737985]">ETA</span>
                          <span className="font-sans font-semibold text-[#182350]">
                            {opt.eta} ({opt.etaDelta})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#737985]">Fuel</span>
                          <span className="font-sans font-bold text-[#18A6A6]">
                            {opt.fuel} t ({opt.fuelDelta} t)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#737985]">Operating Cost</span>
                          <span className="font-sans font-semibold text-[#182350]">
                            ${(opt.cost / 1000).toFixed(1)}k
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#737985]">Lifecycle GHG</span>
                          <span className="font-sans text-secondary-foreground font-medium">
                            {opt.ghg} t CO₂e
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-[#182350]/20/30">
                          <span className="text-[#737985]">Risk Level</span>
                          <span className="font-sans font-bold text-[#2E9B68]">{opt.riskLabel}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`w-full py-2 rounded text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#18A6A6] text-[#FAFAF5]"
                          : "bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 hover:border-primary/60"
                      }`}
                    >
                      {isSelected ? "✓ SELECTED PLAN" : "SELECT PLAN"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* TASK 3: 1. PLAN RESILIENCE TEST & 2. RESILIENCE SCORE */}
          {/* ------------------------------------------------ */}
          <div
            id="plan-resilience-test-section"
            className="panel border border-[#182350]/20 p-5 bg-[#FFFFFF] border border-[#18A6A6]/60 space-y-5 shadow-xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#182350]/20 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#182350] uppercase tracking-wider">
                    PLAN RESILIENCE TEST & STRESS TESTING
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-[#18A6A6]/20 text-[#18A6A6] border border-[#18A6A6]/40 uppercase">
                    Boundary Stress Engine
                  </span>
                </div>
                <div className="text-[11px] font-sans text-[#737985] mt-0.5">
                  Stress-test the currently selected recovery plan ({currentSelectedOption.title}) across adverse operational scenarios.
                </div>
              </div>
              <div className="text-[10px] text-[#737985] font-sans bg-[#FAFAF5] px-2.5 py-1 rounded border border-[#182350]/20">
                Deterministic Rule-Based Stress Model
              </div>
            </div>

            {/* Stress Test Scenarios Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {[
                { id: "NORMAL", label: "NORMAL", icon: "☀️" },
                { id: "HEAVY_WEATHER", label: "HEAVY WEATHER", icon: "🌊" },
                { id: "PORT_CONGESTION", label: "PORT CONGESTION", icon: "⚓" },
                { id: "FUEL_SHORTAGE", label: "FUEL SHORTAGE", icon: "⛽" },
                { id: "PORT_CLOSURE", label: "PORT CLOSURE", icon: "🚫" },
                { id: "ROUTE_RESTRICTION", label: "ROUTE RESTRICTION", icon: "🧭" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveStressScenario(s.id as StressTestScenario)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    activeStressScenario === s.id
                      ? "bg-[#18A6A6] text-[#FAFAF5] shadow-md"
                      : "bg-[#FAFAF5] text-[#737985] hover:text-[#182350] border border-[#182350]/20 hover:border-primary/50"
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Stress Test Output & Resilience Score Card Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Stress Test Diagnostics (8 Cols) */}
              <div className="lg:col-span-8 p-4 rounded-lg bg-[#FAFAF5] border border-[#182350]/20 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#182350]/20/40">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{activeStressData.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-[#182350] uppercase tracking-wider">
                        Scenario: {activeStressData.label}
                      </div>
                      <div className="text-[10px] text-[#737985] font-sans">
                        Boundary evaluation against {currentSelectedOption.title}
                      </div>
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded text-xs font-extrabold tracking-wider uppercase"
                    style={{
                      background: `${activeStressData.statusColor}25`,
                      color: activeStressData.statusColor,
                      border: `1px solid ${activeStressData.statusColor}`,
                    }}
                  >
                    {activeStressData.status}
                  </span>
                </div>

                {/* 4 Quantitative Deltas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#182350]/20/50">
                    <div className="text-[10px] text-[#737985] uppercase mb-0.5">ETA Impact</div>
                    <div className="font-bold text-[#182350] font-sans">{activeStressData.etaImpact}</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#182350]/20/50">
                    <div className="text-[10px] text-[#737985] uppercase mb-0.5">Fuel Impact</div>
                    <div className="font-bold text-[#18A6A6] font-sans">
                      {activeStressData.fuelImpact}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#182350]/20/50">
                    <div className="text-[10px] text-[#737985] uppercase mb-0.5">Cost Impact</div>
                    <div className="font-bold text-amber-400 font-sans">
                      {activeStressData.costImpactRupees}{" "}
                      <span className="text-[10px] text-[#737985]">({activeStressData.costImpact})</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#182350]/20/50">
                    <div className="text-[10px] text-[#737985] uppercase mb-0.5">GHG Impact</div>
                    <div className="font-bold text-secondary-foreground font-sans">
                      {activeStressData.ghgImpact}
                    </div>
                  </div>
                </div>

                {/* Constraint Status and Recommended Recovery Plan */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded bg-[#FFFFFF]/60 border border-[#182350]/20/40">
                    <span className="text-[#737985] font-sans">Constraint Status: </span>
                    <span className="text-[#182350] font-medium">{activeStressData.constraintSummary}</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#FFFFFF]/60 border border-[#182350]/20/40 flex items-center justify-between">
                    <div>
                      <span className="text-[#737985] font-sans">Available Recovery Plan: </span>
                      <span className="text-[#18A6A6] font-bold">
                        {activeStressData.availableRecoveryPlan}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-sans">✓ Pre-validated</span>
                  </div>
                </div>
              </div>

              {/* 2. Resilience Score Card (4 Cols) */}
              <div className="lg:col-span-4 p-4 rounded-lg bg-[#FAFAF5] border border-[#182350]/20 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#182350] uppercase tracking-wider">
                      PLAN RESILIENCE SCORE
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2E9B68]/20 text-[#2E9B68] border border-[#2E9B68]">
                      {currentSelectedOption.resilienceGrade}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-extrabold text-[#18A6A6] font-mono">
                      {currentSelectedOption.resilienceScore}
                    </span>
                    <span className="text-sm font-sans text-[#737985]">/ 100</span>
                    <span className="text-xs font-bold text-[#182350] ml-2 tracking-wide uppercase">
                      {currentSelectedOption.resilienceGrade} RESILIENCE
                    </span>
                  </div>

                  {/* 5 Dimensional Breakdown Bars */}
                  <div className="space-y-2 text-[11px]">
                    {[
                      { label: "Weather Resilience", val: currentSelectedOption.resilienceBreakdown.weather },
                      { label: "Fuel Resilience", val: currentSelectedOption.resilienceBreakdown.fuel },
                      { label: "Port Resilience", val: currentSelectedOption.resilienceBreakdown.port },
                      { label: "Schedule Resilience", val: currentSelectedOption.resilienceBreakdown.schedule },
                      { label: "Route Flexibility", val: currentSelectedOption.resilienceBreakdown.route },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-[#737985]">
                          <span>{item.label}</span>
                          <span className="font-mono text-[#182350] font-semibold">{item.val}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#FFFFFF]">
                          <div
                            className="h-full rounded-full bg-[#18A6A6] transition-all duration-300"
                            style={{ width: `${item.val}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[9px] text-[#737985]/70 font-sans italic border-t border-[#182350]/20/30 pt-2">
                  * Prototype metric based on deterministic operational constraints.
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* TASK 3: 3. OPERATIONAL SENSITIVITY & 4. IMPACT RANKING */}
          {/* ------------------------------------------------ */}
          <div
            id="operational-sensitivity-section"
            className="panel border border-[#182350]/20 p-5 bg-[#FFFFFF] border border-[#182350]/20 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#182350]/20 gap-3">
              <div>
                <h4 className="text-xs font-bold text-[#182350] uppercase tracking-wider">
                  OPERATIONAL SENSITIVITY ANALYSIS
                </h4>
                <div className="text-[11px] font-sans text-[#737985]">
                  Simulate sensitivity gradients across speed, sea state, cargo payload, draft, and trim dynamics.
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#FAFAF5] text-[#18A6A6] border border-[#182350]/20">
                Cubic Resistance Model
              </span>
            </div>

            {/* Top Interactive Controls & Live Metrics Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Sliders & Variables Controls (7 Cols) */}
              <div className="lg:col-span-7 p-4 rounded-lg bg-[#FAFAF5] border border-[#182350]/20 space-y-4 text-xs">
                <div className="text-xs font-bold text-[#182350] uppercase tracking-wider mb-2">
                  Interactive Voyage Controls
                </div>

                {/* Speed Slider */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#737985] font-sans">Propulsion Speed (Knots)</span>
                    <span className="font-mono font-bold text-[#18A6A6]">{sensSpeed.toFixed(1)} kn</span>
                  </div>
                  <input
                    type="range"
                    min={10.0}
                    max={18.0}
                    step={0.1}
                    value={sensSpeed}
                    onChange={(e) => setSensSpeed(Number(e.target.value))}
                    className="w-full accent-[#18A6A6] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#737985] font-mono mt-0.5">
                    <span>10.0 kn (Eco)</span>
                    <span>14.0 kn</span>
                    <span>18.0 kn (Max)</span>
                  </div>
                </div>

                {/* Cargo Load Slider */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#737985] font-sans">Cargo Payload (Tonnes)</span>
                    <span className="font-mono font-bold text-[#182350]">
                      {sensCargo.toLocaleString()} t ({((sensCargo / 74000) * 100).toFixed(0)}% DWT)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20000}
                    max={74000}
                    step={1000}
                    value={sensCargo}
                    onChange={(e) => setSensCargo(Number(e.target.value))}
                    className="w-full accent-[#18A6A6] cursor-pointer"
                  />
                </div>

                {/* Weather, Draft, Trim Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-[#737985] uppercase block mb-1">
                      Weather State
                    </label>
                    <select
                      value={sensWeather}
                      onChange={(e) => setSensWeather(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] text-[#182350] border border-[#182350]/20 outline-none text-xs"
                    >
                      <option value="Calm">Calm (Beaufort 0-2)</option>
                      <option value="Moderate">Moderate (Beaufort 3-5)</option>
                      <option value="Rough">Rough (Beaufort 6-7)</option>
                      <option value="Severe">Severe (Gale 8+)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#737985] uppercase block mb-1">
                      Calculated Draft
                    </label>
                    <div className="px-2.5 py-1.5 rounded bg-[#FFFFFF] text-[#182350] border border-[#182350]/20 font-mono text-xs">
                      {sensitivityOutputs.draft} m
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#737985] uppercase block mb-1">
                      Dynamic Trim
                    </label>
                    <select
                      value={sensTrim}
                      onChange={(e) => setSensTrim(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] text-[#182350] border border-[#182350]/20 outline-none text-xs"
                    >
                      <option value="Even Keel">Even Keel (Standard)</option>
                      <option value="0.5m Aft">0.5m Aft (-2% Fuel)</option>
                      <option value="1.0m Aft">1.0m Aft (-4% Fuel)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Live Output Metrics for Sensitivity (5 Cols) */}
              <div className="lg:col-span-5 p-4 rounded-lg bg-[#FAFAF5] border border-[#182350]/20 flex flex-col justify-between space-y-3">
                <div className="text-xs font-bold text-[#182350] uppercase tracking-wider pb-1 border-b border-[#182350]/20/40">
                  Instantaneous Sensitivity Outputs
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded bg-[#FFFFFF] border border-[#182350]/20">
                    <div className="text-[10px] text-[#737985] uppercase mb-0.5">Projected Fuel</div>
                    <div className="text-lg font-bold text-[#18A6A6] font-mono">
                      {sensitivityOutputs.fuel} t/d
                    </div>
                    <div className="text-[10px] text-[#737985] font-sans mt-0.5">
                      Specific Fuel Oil Index
                    </div>
                  </div>

                  <div className="p-3 rounded bg-[#FFFFFF] border border-[#182350]/20">
                    <div className="text-[10px] text-[#737985] uppercase mb-0.5">Transit Duration</div>
                    <div className="text-lg font-bold text-[#182350] font-mono">
                      {sensitivityOutputs.etaDays} days
                    </div>
                    <div className="text-[10px] text-[#737985] font-sans mt-0.5">
                      Voyage time to quay
                    </div>
                  </div>

                  <div className="p-3 rounded bg-[#FFFFFF] border border-[#182350]/20">
                    <div className="text-[10px] text-[#737985] uppercase mb-0.5">Daily Emissions</div>
                    <div className="text-lg font-bold text-amber-400 font-mono">
                      {sensitivityOutputs.emissions} t
                    </div>
                    <div className="text-[10px] text-emerald-400 font-sans mt-0.5">CII Class Compliant</div>
                  </div>

                  <div className="p-3 rounded bg-[#FFFFFF] border border-[#182350]/20">
                    <div className="text-[10px] text-[#737985] uppercase mb-0.5">Hull Draft Depth</div>
                    <div className="text-lg font-bold text-[#182350] font-mono">
                      {sensitivityOutputs.draft} m
                    </div>
                    <div className="text-[10px] text-emerald-400 font-sans mt-0.5">Safe Channel Clearance</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Sensitivity Curves Chart (7 Cols) & 4. Impact Ranking (5 Cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
              {/* Sensitivity Chart */}
              <div className="lg:col-span-7 p-4 rounded-lg bg-[#FAFAF5] border border-[#182350]/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-sans font-bold text-[#182350] uppercase tracking-wider">
                    Fuel Consumption Sensitivity Curves
                  </div>
                  <span className="text-[10px] text-[#737985] font-sans">
                    Fuel (t/d) vs Speed (knots)
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={sensitivityChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis dataKey="speed" tick={{ fill: "#5a7fa8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#5a7fa8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#FAFAF5",
                        border: "1px solid rgba(24, 35, 80, 0.2)",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "#FFFFFF",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#182350", paddingTop: 8 }} />
                    <Line
                      type="monotone"
                      dataKey="Calm Sea"
                      stroke="#18A6A6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Current State"
                      stroke="#D99A2B"
                      strokeWidth={2.5}
                      dot={true}
                    />
                    <Line
                      type="monotone"
                      dataKey="Severe Gale"
                      stroke="#C94B4B"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 4. Impact Ranking Section */}
              <div className="lg:col-span-5 p-4 rounded-lg bg-[#FAFAF5] border border-[#182350]/20 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-bold text-[#182350] uppercase tracking-wider">
                      WHAT AFFECTS THIS VOYAGE MOST?
                    </h5>
                    <span className="text-[10px] font-mono text-[#18A6A6]">Ranked Drivers</span>
                  </div>
                  <div className="text-[11px] text-[#737985] font-sans mb-3">
                    Normalized sensitivity gradient of fuel consumption across voyage variables.
                  </div>

                  {/* Ranked Bars */}
                  <div className="space-y-2.5 text-xs">
                    {[
                      { name: "Speed", pct: 38, color: "#18A6A6", desc: "Cubic power law" },
                      { name: "Weather", pct: 26, color: "#D99A2B", desc: "Wave resistance" },
                      { name: "Cargo Load", pct: 18, color: "#5a7fa8", desc: "Displacement weight" },
                      { name: "Draft", pct: 11, color: "#737985", desc: "Wetted surface area" },
                      { name: "Trim", pct: 7, color: "#2E9B68", desc: "Hydrodynamic angle" },
                    ].map((item, idx) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-[#182350]">
                            {idx + 1}. {item.name}
                          </span>
                          <span className="font-mono text-secondary-foreground">
                            {item.pct}% contribution
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#FFFFFF] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.pct * 2.4}%`, background: item.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[9px] text-[#737985]/70 font-sans italic border-t border-[#182350]/20/30 pt-2">
                  * Deterministic sensitivity index derived from naval architecture empirical models.
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* FINAL ACTION: RECOMMENDED RECOVERY PLAN FOOTER */}
          {/* ------------------------------------------------ */}
          <div
            className="panel border border-[#182350]/20 p-5 bg-[#FFFFFF] border border-[#18A6A6]/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
            style={{ boxShadow: "0 0 20px rgba(24, 166, 166, 0.2)" }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#18A6A6] uppercase tracking-wider">
                  RECOMMENDED RECOVERY PLAN:
                </span>
                <span className="text-sm font-extrabold text-[#182350]">
                  {currentSelectedOption.title}
                </span>
              </div>
              <div className="text-xs text-[#737985] font-sans mt-0.5">
                Speed: <span className="text-[#182350] font-semibold">{currentSelectedOption.speed} kn</span> ·
                Fuel: <span className="text-[#182350] font-semibold">{currentSelectedOption.fuel} t</span> ({currentSelectedOption.fuelDelta} t) ·
                ETA: <span className="text-[#182350] font-semibold">{currentSelectedOption.eta}</span> ·
                Cost: <span className="text-[#182350] font-semibold">${(currentSelectedOption.cost / 1000).toFixed(1)}k</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="save-scenario-btn"
                onClick={handleSaveAsScenario}
                className="px-4 py-2 rounded text-xs font-bold font-sans uppercase tracking-wider text-secondary-foreground hover:text-[#182350] bg-[#FAFAF5] border border-[#182350]/20 hover:border-primary/60 transition-all cursor-pointer"
              >
                💾 SAVE SCENARIO
              </button>
              <button
                id="apply-new-plan-btn"
                onClick={handleApplyNewPlan}
                className="px-6 py-2 rounded text-xs font-bold font-sans uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-lg hover:opacity-90 active:scale-95"
                style={{
                  background: "#2E9B68",
                  color: "#FFFFFF",
                  boxShadow: "0 0 15px rgba(46, 155, 104, 0.4)",
                }}
              >
                ✓ APPLY NEW PLAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* 4. SAVED SCENARIOS */}
      {/* ------------------------------------------------ */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#182350] tracking-wider uppercase">
              SAVED SCENARIOS
            </h4>
            <div className="text-xs font-sans text-[#737985]">
              Baseline vs alternative operational configurations and fuel profiles
            </div>
          </div>
          <span className="text-xs font-sans text-[#737985]">
            {scenarios.length} Scenarios Configured
          </span>
        </div>

        {/* Scenario Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {results.map((r) => (
            <div
              key={r.id}
              className="panel border border-[#182350]/20 p-4 flex flex-col justify-between transition-all duration-200 hover:border-primary/50 group"
              style={{
                borderColor: `${r.color}55`,
                background: "#FFFFFF",
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                    <span className="text-xs font-sans font-bold tracking-wider" style={{ color: r.color }}>
                      Scenario {r.id}
                    </span>
                  </div>
                  <button
                    id={`edit-scenario-${r.id.toLowerCase()}-btn`}
                    onClick={() => openScenarioEdit(r)}
                    className="px-2 py-0.5 rounded text-[11px] font-sans text-secondary-foreground hover:text-[#182350] bg-[#FAFAF5] border border-[#182350]/20 hover:border-primary/60 transition-all cursor-pointer"
                  >
                    Edit ✎
                  </button>
                </div>

                <div className="text-sm font-bold text-[#182350] mb-3">{r.label}</div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#737985]">Fuel Type</span>
                    <span className="font-sans text-secondary-foreground font-medium">{r.fuelType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737985]">Speed</span>
                    <span className="font-sans text-secondary-foreground font-medium">{r.speed} kn</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737985]">Weather</span>
                    <span className="font-sans text-secondary-foreground font-medium">{r.weather}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737985]">Route</span>
                    <span className="font-sans text-secondary-foreground font-medium">{r.route}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737985]">Shore Power</span>
                    <span className="font-sans text-secondary-foreground font-medium">
                      {r.shorePower ? "✓ Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#182350]/20/40 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#737985]">Fuel Consumption</span>
                    <span className="font-sans font-bold" style={{ color: r.color }}>
                      {r.result.fuel} t/d
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737985]">CO₂ Emissions</span>
                    <span className="font-sans font-medium" style={{ color: r.color }}>
                      {r.result.emissions} t
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737985]">Op. Cost</span>
                    <span className="font-sans text-secondary-foreground font-medium">
                      ${(r.result.cost / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-2 border-t border-[#182350]/20/30">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#737985] font-sans">Efficiency</span>
                  <span className="font-sans font-bold" style={{ color: r.color }}>
                    {r.result.efficiency}/100
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#FAFAF5]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${r.result.efficiency}%`, background: r.color }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts & Delta Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* Fuel & Emissions Comparison */}
          <div className="panel border border-[#182350]/20 p-4" style={{ background: "#FFFFFF" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-sans font-bold text-[#737985] uppercase tracking-wider">
                Fuel & Emissions Comparison
              </div>
              <span className="text-[10px] text-[#737985] font-sans">Per Scenario Breakdown</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={results.map((r) => ({
                  name: `Scenario ${r.id}`,
                  fuel: r.result.fuel,
                  emissions: r.result.emissions,
                }))}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fill: "#5a7fa8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5a7fa8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#FAFAF5",
                    border: "1px solid rgba(24, 35, 80, 0.2)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "#FFFFFF",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#182350", paddingTop: 8 }} />
                <Bar dataKey="fuel" fill="#18A6A6" name="Fuel (t/d)" radius={[3, 3, 0, 0]} barSize={22} />
                <Bar dataKey="emissions" fill="#D99A2B" name="Emissions (t)" radius={[3, 3, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vs Current Plan — Delta Comparison */}
          <div className="panel border border-[#182350]/20 p-4" style={{ background: "#FFFFFF" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-sans font-bold text-[#737985] uppercase tracking-wider">
                Vs Current Plan — Delta Comparison
              </div>
              <span className="text-[10px] text-[#737985] font-sans">Baseline: Scenario A</span>
            </div>
            <div className="space-y-2.5">
              {results.slice(1).map((r) => {
                const base = results[0];
                const fuelDelta = r.result.fuel - base.result.fuel;
                const costDelta = r.result.cost - base.result.cost;
                const emDelta = r.result.emissions - base.result.emissions;
                return (
                  <div
                    key={r.id}
                    className="p-3 rounded transition-all"
                    style={{ background: "#FAFAF5", border: "1px solid rgba(24, 35, 80, 0.2)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                        <span className="text-xs font-sans font-bold text-[#182350] truncate max-w-[280px]">
                          Scenario {r.id} ({r.label})
                        </span>
                      </div>
                      <span className="text-[10px] font-sans text-[#737985]">
                        Eff: {r.result.efficiency}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { label: "Fuel", delta: fuelDelta, unit: "t/d" },
                        { label: "Cost", delta: costDelta / 1000, unit: "k" },
                        { label: "CO₂", delta: emDelta, unit: "t" },
                      ].map((m) => (
                        <div key={m.label} className="text-center p-1.5 rounded" style={{ background: "#FFFFFF" }}>
                          <div className="text-[10px] text-[#737985] mb-0.5">{m.label}</div>
                          <div
                            className="font-sans font-bold text-xs"
                            style={{ color: m.delta <= 0 ? "#18A6A6" : "#C94B4B" }}
                          >
                            {m.delta > 0 ? "+" : ""}
                            {m.delta.toFixed(1)}
                            {m.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CONSTRAINT DETAIL MODAL */}
      {selectedConstraint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(6, 15, 30, 0.85)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="panel border border-[#182350]/20 w-full max-w-md p-6 bg-[#FFFFFF] border border-[#18A6A6] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            style={{ boxShadow: "0 0 25px rgba(24, 166, 166, 0.3)" }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#182350]/20">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#182350] uppercase tracking-wider">
                  {selectedConstraint.name}
                </span>
                {(() => {
                  const b = getStatusBadgeStyle(selectedConstraint.status);
                  return (
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: b.bg, color: b.text, border: `1px solid ${b.border}` }}
                    >
                      {selectedConstraint.status}
                    </span>
                  );
                })()}
              </div>
              <button
                onClick={() => setSelectedConstraint(null)}
                className="text-[#737985] hover:text-[#182350] text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded bg-[#FAFAF5] border border-[#182350]/20/50">
                <div className="text-[10px] text-[#737985] uppercase mb-0.5">Normal Baseline:</div>
                <div className="text-[#182350] font-semibold font-sans">{selectedConstraint.normal}</div>
              </div>

              <div className="p-2.5 rounded bg-[#FAFAF5] border border-[#182350]/20/50">
                <div className="text-[10px] text-[#737985] uppercase mb-0.5">Simulated State:</div>
                <div className="text-amber-300 font-semibold font-sans">{selectedConstraint.simulated}</div>
              </div>

              <div className="p-2.5 rounded bg-[#FAFAF5] border border-[#182350]/20/50">
                <div className="text-[10px] text-[#737985] uppercase mb-0.5">Operational Impact:</div>
                <div className="text-[#182350] font-sans">{selectedConstraint.impact}</div>
              </div>

              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#18A6A6]/40">
                <div className="text-[10px] text-[#18A6A6] uppercase font-bold mb-0.5">
                  Optimizer Result & Remediation:
                </div>
                <div className="text-slate-200 font-sans leading-relaxed">{selectedConstraint.result}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedConstraint(null)}
                className="px-4 py-1.5 rounded text-xs font-bold bg-[#18A6A6] text-[#FAFAF5] uppercase cursor-pointer"
              >
                Close Diagnostic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCENARIO BUILDER MODAL */}
      {showBuilder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(6, 15, 30, 0.88)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="panel border border-[#182350]/20 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            style={{
              background: "#FFFFFF",
              border: "1px solid #18A6A6",
              boxShadow: "0 0 30px rgba(24, 166, 166, 0.25)",
            }}
          >
            <div className="flex items-center justify-between p-5 border-b border-[#182350]/20 bg-[#FAFAF5]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-[#182350] tracking-wider">
                    {editingScenario
                      ? `EDIT SCENARIO ${editingScenario.id}: ${editingScenario.label}`
                      : "SIMULATE REAL-WORLD EVENT"}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase"
                    style={{ background: "rgba(24, 166, 166, 0.2)", color: "#18A6A6" }}
                  >
                    Control Mode
                  </span>
                </div>
                <div className="text-xs text-[#737985] font-sans mt-0.5">
                  Select an operational category to model disruption impact on vessel voyage.
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBuilder(false);
                  setEditingScenario(null);
                }}
                className="w-8 h-8 rounded flex items-center justify-center text-[#737985] hover:text-[#182350] hover:bg-border/40 text-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-5 pt-4 pb-2 border-b border-[#182350]/20 bg-[#FAFAF5]/60 overflow-x-auto flex gap-1.5 scrollbar-thin">
              {categoryList.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-[#18A6A6] text-[#FAFAF5] shadow-sm font-bold"
                      : "text-[#737985] hover:text-[#182350] hover:bg-[#FFFFFF]"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              <div className="flex items-center justify-between p-3 rounded bg-[#FAFAF5] border border-[#182350]/20">
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {categoryList.find((c) => c.id === selectedCategory)?.icon}
                  </span>
                  <div>
                    <div className="font-bold text-[#182350] uppercase tracking-wider text-xs">
                      {categoryList.find((c) => c.id === selectedCategory)?.label} Disruption Parameters
                    </div>
                    <div className="text-[11px] text-[#737985] font-sans">
                      {categoryList.find((c) => c.id === selectedCategory)?.description}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-[#FFFFFF] text-[#18A6A6] border border-[#18A6A6]/40">
                  Deterministic Simulator
                </span>
              </div>

              {/* PORT */}
              {selectedCategory === "port" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Port
                    </label>
                    <select
                      value={params.portName}
                      onChange={(e) => setParams({ ...params, portName: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary"
                    >
                      <option value="Port of Singapore (Approach B)">Port of Singapore (Approach B)</option>
                      <option value="Port B (Deep Water Terminal)">Port B (Deep Water Terminal)</option>
                      <option value="Port of Rotterdam (Maasvlakte)">Port of Rotterdam (Maasvlakte)</option>
                      <option value="Colombo Transshipment Hub">Colombo Transshipment Hub</option>
                      <option value="Mundra Port Terminal">Mundra Port Terminal</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Congestion
                    </label>
                    <select
                      value={params.congestionLevel}
                      onChange={(e) =>
                        setParams({ ...params, congestionLevel: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary"
                    >
                      <option value="Low">Low (0 - 1 hr queue)</option>
                      <option value="Moderate">Moderate (2 - 4 hr queue)</option>
                      <option value="High">High (6 - 12 hr queue)</option>
                      <option value="Severe">Severe (12+ hr queue)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="text-[#737985] font-sans uppercase tracking-wider">
                        Additional Waiting
                      </label>
                      <span className="text-[#18A6A6] font-bold font-sans">
                        +{params.waitingHours} hours
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={1}
                      value={params.waitingHours}
                      onChange={(e) =>
                        setParams({ ...params, waitingHours: Number(e.target.value) })
                      }
                      className="w-full accent-[#18A6A6] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Available Berths
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 4].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setParams({ ...params, availableBerths: b })}
                          className={`py-2 rounded font-sans text-xs font-bold border transition-all cursor-pointer ${
                            params.availableBerths === b
                              ? "bg-[#18A6A6] text-[#FAFAF5] border-[#18A6A6]"
                              : "bg-[#FAFAF5] text-secondary-foreground border-[#182350]/20 hover:border-primary/50"
                          }`}
                        >
                          {b === 0 ? "0 (Full)" : b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Port Closure
                    </label>
                    <button
                      type="button"
                      onClick={() => setParams({ ...params, portClosed: !params.portClosed })}
                      className={`w-full py-2.5 px-4 rounded font-sans text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                        params.portClosed
                          ? "bg-danger/20 text-danger border-danger"
                          : "bg-[#FAFAF5] text-secondary-foreground border-[#182350]/20"
                      }`}
                    >
                      <span>Emergency Harbor Closure</span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#FFFFFF]">
                        {params.portClosed ? "ON (PORT CLOSED)" : "OFF (OPERATIONAL)"}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* WEATHER */}
              {selectedCategory === "weather" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Condition
                    </label>
                    <select
                      value={params.weatherCondition}
                      onChange={(e) =>
                        setParams({ ...params, weatherCondition: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary"
                    >
                      <option value="Calm">Calm (Beaufort 0-2)</option>
                      <option value="Moderate">Moderate (Beaufort 3-5)</option>
                      <option value="Rough">Rough (Beaufort 6-7)</option>
                      <option value="Severe">Severe (Beaufort 8+ Gale)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Wind
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={params.windSpeed}
                        onChange={(e) =>
                          setParams({ ...params, windSpeed: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">kn</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Wave Height
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={params.waveHeight}
                        onChange={(e) =>
                          setParams({ ...params, waveHeight: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Speed Restriction
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={params.speedRestrictionPct}
                        onChange={(e) =>
                          setParams({ ...params, speedRestrictionPct: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* FUEL */}
              {selectedCategory === "fuel" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Fuel Type
                    </label>
                    <select
                      value={params.fuelType}
                      onChange={(e) => setParams({ ...params, fuelType: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary"
                    >
                      <option value="LNG">LNG (Liquefied Natural Gas)</option>
                      <option value="Methanol">Green Methanol</option>
                      <option value="Ammonia">Zero-Carbon Ammonia</option>
                      <option value="Hydrogen">Liquid Hydrogen</option>
                      <option value="VLSFO">Very Low Sulfur Fuel Oil</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Fuel Availability
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={params.fuelAvailabilityDelta}
                        onChange={(e) =>
                          setParams({ ...params, fuelAvailabilityDelta: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Fuel Price
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={params.fuelPriceDelta}
                        onChange={(e) =>
                          setParams({ ...params, fuelPriceDelta: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Bunkering
                    </label>
                    <select
                      value={params.bunkeringStatus}
                      onChange={(e) =>
                        setParams({ ...params, bunkeringStatus: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary"
                    >
                      <option value="Available">Available (Normal operation)</option>
                      <option value="Delayed">Delayed (+4 hrs queue)</option>
                      <option value="Unavailable">Unavailable (Bunker Stockout)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ROUTE */}
              {selectedCategory === "route" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Route Variant
                    </label>
                    <select
                      value={params.routeVariant}
                      onChange={(e) =>
                        setParams({ ...params, routeVariant: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary"
                    >
                      <option value="Standard">Standard Direct Corridor</option>
                      <option value="Optimized">AI Optimized Eco Route</option>
                      <option value="ECA Avoidance">Emission Control Area (ECA) Bypass</option>
                      <option value="Storm Diversion">Storm Diversion (Malacca / Bay of Bengal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Distance Modifier
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={params.distanceModifier}
                        onChange={(e) =>
                          setParams({ ...params, distanceModifier: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">nm</span>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      High Risk Area (HRA) Piracy Bypass
                    </label>
                    <button
                      type="button"
                      onClick={() => setParams({ ...params, hraAvoidance: !params.hraAvoidance })}
                      className={`w-full py-2 px-4 rounded font-sans text-xs border transition-all flex items-center justify-between cursor-pointer ${
                        params.hraAvoidance
                          ? "bg-primary/20 text-primary border-primary"
                          : "bg-[#FAFAF5] text-secondary-foreground border-[#182350]/20"
                      }`}
                    >
                      <span>Corridor Security Protocol</span>
                      <span className="font-bold">{params.hraAvoidance ? "ACTIVE (+120 nm)" : "STANDARD"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CARGO */}
              {selectedCategory === "cargo" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Cargo Load (Tonnes)
                    </label>
                    <input
                      type="number"
                      value={params.cargoLoad}
                      onChange={(e) => setParams({ ...params, cargoLoad: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Cargo Classification
                    </label>
                    <select
                      value={params.cargoType}
                      onChange={(e) => setParams({ ...params, cargoType: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary"
                    >
                      <option value="Cryogenic LNG">Cryogenic LNG (-162°C)</option>
                      <option value="Standard Bulk">Standard Dry Bulk</option>
                      <option value="Hazardous Class 3">Hazardous Class 3 Flammable Liquid</option>
                      <option value="Heavy Minerals">Heavy Minerals & Iron Ore</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Draft Restriction
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={params.draftDepth}
                        onChange={(e) => setParams({ ...params, draftDepth: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">m</span>
                    </div>
                  </div>
                </div>
              )}

              {/* VESSEL */}
              {selectedCategory === "vessel" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Engine Derating
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={params.engineDeratingPct}
                        onChange={(e) =>
                          setParams({ ...params, engineDeratingPct: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">% Power</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Auxiliary Generators Status
                    </label>
                    <select
                      value={params.auxGenStatus}
                      onChange={(e) => setParams({ ...params, auxGenStatus: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary"
                    >
                      <option value="3/3 Online">3/3 Online (Optimal Redundancy)</option>
                      <option value="2/3 Online">2/3 Online (Nominal)</option>
                      <option value="1/3 Online (Degraded)">1/3 Online (Degraded)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Hull Fouling Penalty
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={params.hullFoulingPct}
                        onChange={(e) =>
                          setParams({ ...params, hullFoulingPct: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">% Drag</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SCHEDULE */}
              {selectedCategory === "schedule" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Target ETA Constraint
                    </label>
                    <select
                      value={params.etaConstraint}
                      onChange={(e) =>
                        setParams({ ...params, etaConstraint: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary"
                    >
                      <option value="Strict Window">Strict Window (Contractual SLA)</option>
                      <option value="Flexible (±12h)">Flexible Window (±12h Buffer)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Demurrage / Delay Penalty
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={params.delayPenaltyPerHour}
                        onChange={(e) =>
                          setParams({ ...params, delayPenaltyPerHour: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">$/hr</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SHORE POWER */}
              {selectedCategory === "shorePower" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Shore Power Grid Connection
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setParams({ ...params, shorePowerAvailable: !params.shorePowerAvailable })
                      }
                      className={`w-full py-2.5 px-4 rounded font-sans text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                        params.shorePowerAvailable
                          ? "bg-primary/20 text-primary border-primary"
                          : "bg-[#FAFAF5] text-secondary-foreground border-[#182350]/20"
                      }`}
                    >
                      <span>Cold Ironing Berth Plug</span>
                      <span>{params.shorePowerAvailable ? "AVAILABLE (GREEN)" : "UNAVAILABLE"}</span>
                    </button>
                  </div>
                  <div>
                    <label className="text-[#737985] font-sans uppercase tracking-wider block mb-1.5">
                      Grid Power Price
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={params.gridPowerPrice}
                        onChange={(e) =>
                          setParams({ ...params, gridPowerPrice: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 outline-none focus:border-primary font-sans"
                      />
                      <span className="text-[#737985] font-sans">$/kWh</span>
                    </div>
                  </div>
                </div>
              )}

              {editingScenario && (
                <div className="mt-4 pt-4 border-t border-[#182350]/20">
                  <div className="text-xs font-bold text-[#182350] uppercase tracking-wider mb-2">
                    Scenario Configuration Attributes:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-[#737985] uppercase block mb-1">
                        Scenario Name
                      </label>
                      <input
                        type="text"
                        value={editingScenario.label}
                        onChange={(e) =>
                          setEditingScenario({ ...editingScenario, label: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#737985] uppercase block mb-1">
                        Speed (kn)
                      </label>
                      <input
                        type="number"
                        value={editingScenario.speed}
                        onChange={(e) =>
                          setEditingScenario({
                            ...editingScenario,
                            speed: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#737985] uppercase block mb-1">
                        Fuel Type
                      </label>
                      <select
                        value={editingScenario.fuelType}
                        onChange={(e) =>
                          setEditingScenario({ ...editingScenario, fuelType: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 text-xs"
                      >
                        {["LNG", "Methanol", "Ammonia", "Hydrogen", "VLSFO"].map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#182350]/20 bg-[#FAFAF5]">
              <button
                type="button"
                onClick={() => {
                  setShowBuilder(false);
                  setEditingScenario(null);
                }}
                className="px-5 py-2 rounded text-xs font-sans font-bold text-secondary-foreground hover:text-[#182350] border border-[#182350]/20 hover:border-muted-foreground transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                id="run-simulation-submit-btn"
                type="button"
                onClick={executeSimulation}
                className="px-6 py-2 rounded text-xs font-sans font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-lg hover:opacity-90 active:scale-95"
                style={{
                  background: "#18A6A6",
                  color: "#FFFFFF",
                  boxShadow: "0 0 12px rgba(24, 166, 166, 0.4)",
                }}
              >
                RUN SIMULATION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
