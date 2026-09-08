import { Vessel, vessels } from "../../data/fleet";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { geoMercator, geoPath } from "d3-geo";
// @ts-ignore
import { feature } from "topojson-client";
import topoData from "../../data/world-110m.json";

interface Props {
  vessel?: Vessel;
}

export type MapMode = "normal" | "fuel_checker" | "best_bunker";

export interface UpcomingPort {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  eta: string;
  etaHoursFromNow: number;
  fuelAvailability: {
    LNG: number;
    Methanol: number;
    VLSFO: number;
    Ammonia: number;
  };
  fuelPrices: {
    LNG: number;
    Methanol: number;
    VLSFO: number;
    Ammonia: number;
  };
  shorePower: {
    pricePerKWh: number;
    available: boolean;
    voltage?: string;
  };
}

export interface CandidateRoute {
  id: "rec" | "alt1" | "alt2";
  name: string;
  tag: string;
  badge: string;
  distanceNM: number;
  eta: string;
  etaDiff: string;
  fuelTonnes: number;
  fuelDiff: string;
  costLakhs: number;
  costFormatted: string;
  costUSD: string;
  description: string;
  points: { lat: number; lng: number }[];
}

export interface ECARegion {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusNM: number;
  entryTime: string;
  exitTime: string;
  description: string;
  sulphurLimit: string;
}

export interface OneWayTrafficArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lengthNM: number;
  direction: string;
  activeTimeRange: string;
  description: string;
  points: { lat: number; lng: number }[];
}

export interface VesselSpeedProfile {
  speedLimit: number;
  recommendedSpeed: number;
}

export interface BunkerEvaluation {
  port: UpcomingPort;
  distNM: number;
  isReachable: boolean;
  fuelType: string;
  pricePerTonne: number;
  availableTonnes: number;
  eta: string;
  gridPowerAvailable: boolean;
  gridPowerCostPerKWh: number;
  estimatedBunkerTonnes: number;
  estimatedCostUSD: number;
  estimatedCostLakhs: number;
  reserveMarginPct: number;
  score: number;
  isRecommended: boolean;
}

// -------------------------------------------------------------------
// UPCOMING PORTS FOR ALL VESSELS
// -------------------------------------------------------------------
const vesselUpcomingPorts: Record<string, UpcomingPort[]> = {
  v1: [
    {
      id: "up-v1-1",
      name: "Port of Salalah",
      country: "Oman",
      lat: 16.94,
      lng: 54.0,
      eta: "07 May · 08:30 UTC",
      etaHoursFromNow: 38,
      fuelAvailability: { LNG: 48000, Methanol: 12000, VLSFO: 85000, Ammonia: 6000 },
      fuelPrices: { LNG: 585, Methanol: 640, VLSFO: 580, Ammonia: 710 },
      shorePower: { pricePerKWh: 0.14, available: true, voltage: "11kV / 60Hz Cold Ironing" },
    },
    {
      id: "up-v1-2",
      name: "Jeddah Islamic Port",
      country: "Saudi Arabia",
      lat: 21.4858,
      lng: 39.1925,
      eta: "11 May · 14:00 UTC",
      etaHoursFromNow: 140,
      fuelAvailability: { LNG: 75000, Methanol: 25000, VLSFO: 130000, Ammonia: 14000 },
      fuelPrices: { LNG: 590, Methanol: 650, VLSFO: 575, Ammonia: 720 },
      shorePower: { pricePerKWh: 0.15, available: true, voltage: "6.6kV OPS Berth 4" },
    },
    {
      id: "up-v1-3",
      name: "Port Said / Suez",
      country: "Egypt",
      lat: 31.2653,
      lng: 32.3019,
      eta: "14 May · 06:00 UTC",
      etaHoursFromNow: 204,
      fuelAvailability: { LNG: 90000, Methanol: 35000, VLSFO: 210000, Ammonia: 20000 },
      fuelPrices: { LNG: 610, Methanol: 670, VLSFO: 595, Ammonia: 740 },
      shorePower: { pricePerKWh: 0.18, available: false, voltage: "Pending Berth Electrification" },
    },
    {
      id: "up-v1-4",
      name: "Port of Rotterdam",
      country: "Netherlands",
      lat: 51.95,
      lng: 4.14,
      eta: "24 May · 18:00 UTC",
      etaHoursFromNow: 456,
      fuelAvailability: { LNG: 180000, Methanol: 90000, VLSFO: 350000, Ammonia: 60000 },
      fuelPrices: { LNG: 570, Methanol: 620, VLSFO: 560, Ammonia: 680 },
      shorePower: { pricePerKWh: 0.12, available: true, voltage: "11kV Zero-Emission Shore Grid" },
    },
  ],

  v2: [
    {
      id: "up-v2-1",
      name: "Port of Colombo",
      country: "Sri Lanka",
      lat: 6.94,
      lng: 79.84,
      eta: "06 May · 18:00 UTC",
      etaHoursFromNow: 44,
      fuelAvailability: { LNG: 32000, Methanol: 14000, VLSFO: 90000, Ammonia: 4500 },
      fuelPrices: { LNG: 620, Methanol: 680, VLSFO: 605, Ammonia: 745 },
      shorePower: { pricePerKWh: 0.17, available: true, voltage: "6.6kV Cold Ironing" },
    },
    {
      id: "up-v2-2",
      name: "Port Klang",
      country: "Malaysia",
      lat: 3.0,
      lng: 101.38,
      eta: "10 May · 11:00 UTC",
      etaHoursFromNow: 134,
      fuelAvailability: { LNG: 54000, Methanol: 28000, VLSFO: 165000, Ammonia: 12000 },
      fuelPrices: { LNG: 580, Methanol: 635, VLSFO: 565, Ammonia: 695 },
      shorePower: { pricePerKWh: 0.135, available: true, voltage: "11kV Clean Grid Berth" },
    },
    {
      id: "up-v2-3",
      name: "Port of Singapore",
      country: "Singapore",
      lat: 1.29,
      lng: 103.85,
      eta: "13 May · 18:30 UTC",
      etaHoursFromNow: 212,
      fuelAvailability: { LNG: 220000, Methanol: 110000, VLSFO: 650000, Ammonia: 85000 },
      fuelPrices: { LNG: 565, Methanol: 610, VLSFO: 550, Ammonia: 670 },
      shorePower: { pricePerKWh: 0.115, available: true, voltage: "11kV Jurong Island Green OPS" },
    },
  ],

  v3: [
    {
      id: "up-v3-1",
      name: "Jawaharlal Nehru Port (JNPT)",
      country: "India",
      lat: 18.95,
      lng: 72.95,
      eta: "03 May · 06:00 UTC",
      etaHoursFromNow: 6,
      fuelAvailability: { LNG: 28000, Methanol: 15000, VLSFO: 110000, Ammonia: 5000 },
      fuelPrices: { LNG: 630, Methanol: 690, VLSFO: 610, Ammonia: 755 },
      shorePower: { pricePerKWh: 0.165, available: true, voltage: "6.6kV Liquid Terminal Berth" },
    },
    {
      id: "up-v3-2",
      name: "Port of Sohar",
      country: "Oman",
      lat: 24.5,
      lng: 56.63,
      eta: "04 May · 11:30 UTC",
      etaHoursFromNow: 22,
      fuelAvailability: { LNG: 18000, Methanol: 6500, VLSFO: 42000, Ammonia: 2200 },
      fuelPrices: { LNG: 610, Methanol: 675, VLSFO: 592, Ammonia: 730 },
      shorePower: { pricePerKWh: 0.16, available: true, voltage: "11kV Industrial Shore Grid" },
    },
    {
      id: "up-v3-3",
      name: "Port of Fujairah",
      country: "UAE",
      lat: 25.12,
      lng: 56.36,
      eta: "05 May · 14:00 UTC",
      etaHoursFromNow: 48,
      fuelAvailability: { LNG: 62000, Methanol: 18000, VLSFO: 150000, Ammonia: 8000 },
      fuelPrices: { LNG: 590, Methanol: 655, VLSFO: 575, Ammonia: 715 },
      shorePower: { pricePerKWh: 0.145, available: true, voltage: "11kV Offshore Bunkering Hub" },
    },
  ],

  v4: [
    {
      id: "up-v4-1",
      name: "Port of Colombo",
      country: "Sri Lanka",
      lat: 6.94,
      lng: 79.84,
      eta: "04 May · 12:00 UTC",
      etaHoursFromNow: 12,
      fuelAvailability: { LNG: 32000, Methanol: 14000, VLSFO: 90000, Ammonia: 4500 },
      fuelPrices: { LNG: 620, Methanol: 680, VLSFO: 605, Ammonia: 745 },
      shorePower: { pricePerKWh: 0.17, available: true, voltage: "6.6kV CICTA Terminal" },
    },
    {
      id: "up-v4-2",
      name: "Port of Salalah",
      country: "Oman",
      lat: 16.94,
      lng: 54.0,
      eta: "08 May · 10:00 UTC",
      etaHoursFromNow: 58,
      fuelAvailability: { LNG: 48000, Methanol: 12000, VLSFO: 85000, Ammonia: 6000 },
      fuelPrices: { LNG: 585, Methanol: 640, VLSFO: 580, Ammonia: 710 },
      shorePower: { pricePerKWh: 0.14, available: true, voltage: "11kV High-Voltage Berth" },
    },
    {
      id: "up-v4-3",
      name: "Jeddah Islamic Port",
      country: "Saudi Arabia",
      lat: 21.4858,
      lng: 39.1925,
      eta: "13 May · 18:30 UTC",
      etaHoursFromNow: 186,
      fuelAvailability: { LNG: 75000, Methanol: 25000, VLSFO: 130000, Ammonia: 14000 },
      fuelPrices: { LNG: 590, Methanol: 650, VLSFO: 575, Ammonia: 720 },
      shorePower: { pricePerKWh: 0.15, available: true, voltage: "11kV Red Sea Gateway Terminal" },
    },
  ],

  v5: [
    {
      id: "up-v5-1",
      name: "Mundra Port",
      country: "India",
      lat: 22.8,
      lng: 69.7,
      eta: "02 May · 04:00 UTC",
      etaHoursFromNow: 0,
      fuelAvailability: { LNG: 35000, Methanol: 18000, VLSFO: 95000, Ammonia: 7000 },
      fuelPrices: { LNG: 625, Methanol: 685, VLSFO: 600, Ammonia: 750 },
      shorePower: { pricePerKWh: 0.16, available: true, voltage: "11kV Green Terminal" },
    },
    {
      id: "up-v5-2",
      name: "Port of Gibraltar",
      country: "Gibraltar",
      lat: 36.14,
      lng: -5.35,
      eta: "18 May · 16:00 UTC",
      etaHoursFromNow: 380,
      fuelAvailability: { LNG: 85000, Methanol: 42000, VLSFO: 240000, Ammonia: 22000 },
      fuelPrices: { LNG: 580, Methanol: 630, VLSFO: 565, Ammonia: 695 },
      shorePower: { pricePerKWh: 0.13, available: true, voltage: "11kV Mediterranean Hub" },
    },
    {
      id: "up-v5-3",
      name: "Port of Rotterdam",
      country: "Netherlands",
      lat: 51.95,
      lng: 4.14,
      eta: "24 May · 18:00 UTC",
      etaHoursFromNow: 520,
      fuelAvailability: { LNG: 180000, Methanol: 90000, VLSFO: 350000, Ammonia: 60000 },
      fuelPrices: { LNG: 570, Methanol: 620, VLSFO: 560, Ammonia: 680 },
      shorePower: { pricePerKWh: 0.12, available: true, voltage: "11kV Zero-Emission OPS" },
    },
  ],
};

const vesselECARegions: Record<string, ECARegion> = {
  v1: {
    id: "eca-v1-rotterdam",
    name: "North Sea / English Channel ECA",
    lat: 50.8,
    lng: 1.5,
    radiusNM: 220,
    entryTime: "22 May · 04:00 UTC",
    exitTime: "24 May · 18:00 UTC",
    description: "Strict 0.10% sulphur fuel and low-emission speed limits mandatory.",
    sulphurLimit: "0.10% Max Sulphur / Low SOx",
  },
  v2: {
    id: "eca-v2-singapore",
    name: "Singapore & Malacca Green Corridor",
    lat: 1.3,
    lng: 103.5,
    radiusNM: 60,
    entryTime: "13 May · 08:00 UTC",
    exitTime: "13 May · 22:00 UTC",
    description: "Mandatory low-speed steaming and green fuel bunkering standards.",
    sulphurLimit: "Tier III NOx & Low SOx",
  },
  v3: {
    id: "eca-v3-fujairah",
    name: "Gulf of Oman Clean Bunkering Zone",
    lat: 25.0,
    lng: 56.5,
    radiusNM: 50,
    entryTime: "05 May · 06:00 UTC",
    exitTime: "05 May · 18:00 UTC",
    description: "Zero-venting and zero-methane slip enforcement area.",
    sulphurLimit: "IMO 2026 Methane Slip Cap",
  },
  v4: {
    id: "eca-v4-redsea",
    name: "Red Sea Special Protected Area",
    lat: 21.0,
    lng: 39.0,
    radiusNM: 80,
    entryTime: "12 May · 12:00 UTC",
    exitTime: "13 May · 20:00 UTC",
    description: "Strict coral reef protection and biofouling discharge ban.",
    sulphurLimit: "0.10% Sulphur & Bio-Standard",
  },
};

const vesselOneWayTraffic: Record<string, OneWayTrafficArea> = {
  v1: {
    id: "tss-v1-suez",
    name: "Suez Canal Convoy Separation Scheme",
    lat: 29.95,
    lng: 32.55,
    lengthNM: 104,
    direction: "Northbound Convoy (One-Way Timed Transit)",
    activeTimeRange: "13 May 22:00 UTC – 14 May 12:00 UTC",
    description: "Strict scheduled convoy navigation. Speed limit 8.5 kn strictly enforced.",
    points: [
      { lat: 27.85, lng: 33.6 },
      { lat: 28.5, lng: 33.0 },
      { lat: 29.9, lng: 32.55 },
      { lat: 31.3, lng: 32.3 },
    ],
  },
  v2: {
    id: "tss-v2-malacca",
    name: "One Fathom Bank TSS Malacca",
    lat: 3.1,
    lng: 101.1,
    lengthNM: 85,
    direction: "Eastbound Deep-Draft Lane",
    activeTimeRange: "11 May 02:00 UTC – 12 May 08:00 UTC",
    description: "High traffic density. Minimum 1.5 NM separation strictly enforced.",
    points: [
      { lat: 3.8, lng: 100.8 },
      { lat: 3.1, lng: 101.1 },
      { lat: 2.5, lng: 101.7 },
    ],
  },
  v3: {
    id: "tss-v3-hormuz",
    name: "Strait of Hormuz Inbound TSS",
    lat: 26.2,
    lng: 56.4,
    lengthNM: 60,
    direction: "Inbound Arabian Gulf Fairway",
    activeTimeRange: "05 May 08:00 UTC – 05 May 20:00 UTC",
    description: "Radar surveillance corridor with AIS Class A mandatory broadcasting.",
    points: [
      { lat: 25.8, lng: 56.8 },
      { lat: 26.2, lng: 56.4 },
      { lat: 26.6, lng: 55.9 },
    ],
  },
  v4: {
    id: "tss-v4-babelmandeb",
    name: "Bab-el-Mandeb Strait TSS",
    lat: 12.6,
    lng: 43.35,
    lengthNM: 45,
    direction: "Northbound Inward Lane",
    activeTimeRange: "09 May 14:00 UTC – 10 May 02:00 UTC",
    description: "Designated deepwater channel with international naval coalition watch.",
    points: [
      { lat: 12.2, lng: 43.8 },
      { lat: 12.6, lng: 43.35 },
      { lat: 13.1, lng: 42.9 },
    ],
  },
};

const vesselSpeedProfiles: Record<string, VesselSpeedProfile> = {
  v1: { speedLimit: 19.5, recommendedSpeed: 16.4 },
  v2: { speedLimit: 16.0, recommendedSpeed: 13.2 },
  v3: { speedLimit: 17.5, recommendedSpeed: 14.8 },
  v4: { speedLimit: 21.0, recommendedSpeed: 18.1 },
  v5: { speedLimit: 22.0, recommendedSpeed: 19.0 },
};

function calculateFuelConsumption(
  currentSpeed: number,
  baseConsumptionTonsPerDay: number,
  designSpeed: number
): number {
  if (designSpeed <= 0) return baseConsumptionTonsPerDay;
  const speedRatio = currentSpeed / designSpeed;
  const consumed = baseConsumptionTonsPerDay * Math.pow(speedRatio, 2.85);
  return Math.round(consumed * 10) / 10;
}

function calculateFuelRange(
  currentFuelTonnes: number,
  speed: number,
  dailyConsumption: number
): number {
  const hourlyBurn = dailyConsumption / 24;
  const usableFuel = Math.max(0, currentFuelTonnes * 0.85);
  const nauticalMilesPerTonne = speed / (hourlyBurn || 1.5);
  return Math.round(usableFuel * nauticalMilesPerTonne);
}

const WIDTH = 920;
const HEIGHT = 560;

export default function LiveMap({ vessel: propVessel }: Props) {
  const vessel = propVessel || vessels[0];

  // Map Interactive Modes: "normal" | "fuel_checker" | "best_bunker"
  const [mapMode, setMapMode] = useState<MapMode>("normal");

  const [selectedPort, setSelectedPort] = useState<UpcomingPort | null>(null);
  const [hoveredPort, setHoveredPort] = useState<UpcomingPort | null>(null);
  const [hoveredECA, setHoveredECA] = useState<ECARegion | null>(null);
  const [hoveredTraffic, setHoveredTraffic] = useState<OneWayTrafficArea | null>(null);

  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState<[number, number]>([0, 0]);
  const isPanning = useRef(false);
  const lastMouse = useRef<[number, number]>([0, 0]);

  // Reset port selection when switching vessels
  useEffect(() => {
    setSelectedPort(null);
    setHoveredPort(null);
  }, [vessel.id]);

  // Fuel Level, Speed, and Dynamic Delay Controls
  const fuelCapacity = vessel?.fuelCapacity || 4800;
  const [fuelPct, setFuelPct] = useState<number>(vessel?.fuelLevel || 72);
  const [vesselSpeed, setVesselSpeed] = useState<number>(vessel?.speed || 16.4);
  const [simulatedDelayPortId, setSimulatedDelayPortId] = useState<string | null>(null);

  // Sync state when vessel changes
  useEffect(() => {
    setFuelPct(vessel?.fuelLevel || 72);
    setVesselSpeed(vessel?.speed || 16.4);
    setSimulatedDelayPortId(null);
  }, [vessel.id, vessel?.fuelLevel, vessel?.speed]);

  // Active Overlay Drawer State
  const [activeDrawer, setActiveDrawer] = useState<"routes" | "bunker" | "ports" | "speed" | "voyage" | null>(null);

  const toggleDrawer = (tab: "routes" | "bunker" | "ports" | "speed" | "voyage") => {
    setActiveDrawer((curr) => (curr === tab ? null : tab));
  };

  const activeECA = useMemo(() => {
    return vesselECARegions[vessel.id] || null;
  }, [vessel.id]);

  const activeTraffic = useMemo(() => {
    return vesselOneWayTraffic[vessel.id] || null;
  }, [vessel.id]);

  const [selectedRouteId, setSelectedRouteId] = useState<"rec" | "alt1" | "alt2">("rec");

  const upcomingPorts: UpcomingPort[] = useMemo(() => {
    return vesselUpcomingPorts[vessel.id] || vesselUpcomingPorts.v1;
  }, [vessel.id]);

  const currentFuelTonnes = useMemo(() => {
    return Math.round((fuelCapacity * fuelPct) / 100);
  }, [fuelCapacity, fuelPct]);

  // D3 Projection
  const projection = useMemo(() => {
    return geoMercator().scale(130).translate([WIDTH / 2, HEIGHT / 1.55]);
  }, []);

  const pathGen = useMemo(() => {
    return geoPath().projection(projection);
  }, [projection]);

  const countries = useMemo(() => {
    try {
      const geojson: any = feature(topoData, (topoData as any).objects.countries);
      return geojson.features.filter((f: any) => f.id !== "010");
    } catch {
      return [];
    }
  }, []);

  const project = useCallback(
    (lat: number, lng: number): [number, number] => {
      const pt = projection([lng, lat]);
      if (!pt) return [0, 0];
      const cx = WIDTH / 2;
      const cy = HEIGHT / 2;
      const x = (pt[0] - cx + translate[0]) * zoom + cx;
      const y = (pt[1] - cy + translate[1]) * zoom + cy;
      return [x, y];
    },
    [projection, translate, zoom]
  );

  const toPolyline = (pts: [number, number][]) => pts.map((p) => p.join(",")).join(" ");

  // -------------------------------------------------------------------
  // EXACTLY 3 VALID, WATER-ONLY MARITIME ROUTES FOR ALL 4/5 VESSELS
  // -------------------------------------------------------------------
  const candidateRoutes: CandidateRoute[] = useMemo(() => {
    const isDelayActive = simulatedDelayPortId !== null;

    if (vessel.id === "v1") {
      // MV Green Horizon (LNG Carrier - Mundra to Rotterdam)
      const recPts = [
        { lat: vessel.currentPos.lat, lng: vessel.currentPos.lng },
        { lat: 14.8, lng: 55.4 },
        { lat: 12.6, lng: 45.2 },
        { lat: 13.0, lng: 43.1 },
        { lat: 20.0, lng: 38.6 },
        { lat: 27.85, lng: 33.6 },
        { lat: 29.9, lng: 32.55 },
        { lat: 31.3, lng: 32.3 },
        { lat: 34.0, lng: 24.8 },
        { lat: 36.0, lng: 15.2 },
        { lat: 37.6, lng: 8.8 },
        { lat: 35.95, lng: -5.6 },
        { lat: 39.2, lng: -9.6 },
        { lat: 48.2, lng: -5.2 },
        { lat: 51.95, lng: 4.14 },
      ];

      const alt1Pts = [
        { lat: vessel.currentPos.lat, lng: vessel.currentPos.lng },
        { lat: 15.2, lng: 56.5 },
        { lat: 13.2, lng: 46.2 },
        { lat: 13.0, lng: 43.1 },
        { lat: 21.2, lng: 38.2 },
        { lat: 27.85, lng: 33.6 },
        { lat: 29.9, lng: 32.55 },
        { lat: 31.3, lng: 32.3 },
        { lat: 35.2, lng: 23.5 },
        { lat: 37.2, lng: 14.2 },
        { lat: 38.5, lng: 5.0 },
        { lat: 36.2, lng: -5.8 },
        { lat: 40.5, lng: -10.5 },
        { lat: 48.8, lng: -6.2 },
        { lat: 51.95, lng: 4.14 },
      ];

      const alt2Pts = [
        { lat: vessel.currentPos.lat, lng: vessel.currentPos.lng },
        { lat: 13.8, lng: 54.0 },
        { lat: 12.2, lng: 44.8 },
        { lat: 13.0, lng: 43.1 },
        { lat: 18.8, lng: 39.2 },
        { lat: 27.85, lng: 33.6 },
        { lat: 29.9, lng: 32.55 },
        { lat: 31.3, lng: 32.3 },
        { lat: 33.2, lng: 26.0 },
        { lat: 35.0, lng: 16.0 },
        { lat: 36.8, lng: 4.2 },
        { lat: 35.7, lng: -5.4 },
        { lat: 37.5, lng: -9.2 },
        { lat: 47.5, lng: -4.8 },
        { lat: 51.95, lng: 4.14 },
      ];

      return [
        {
          id: "rec",
          name: "Standard Suez & Gibraltar Corridor",
          tag: "Direct Track",
          badge: isDelayActive ? "CONGESTION ALERT" : "RECOMMENDED — OPTIMAL",
          distanceNM: 5640,
          eta: isDelayActive ? "25 May · 06:30" : "24 May · 18:00",
          etaDiff: isDelayActive ? "+12h 30m" : "Fastest Baseline",
          fuelTonnes: 1180,
          fuelDiff: "-35 t vs Alt 1",
          costLakhs: 121.5,
          costFormatted: "₹121.5 L",
          costUSD: "$147.2k",
          description: "Designated Traffic Separation Scheme via Bab-el-Mandeb, Suez Canal & Gibraltar.",
          points: recPts,
        },
        {
          id: "alt1",
          name: "Deepwater Offshore Northern Track",
          tag: "Offshore Route 1",
          badge: "ALTERNATIVE 1",
          distanceNM: 5790,
          eta: "25 May · 02:15",
          etaDiff: "+8h 15m vs Direct",
          fuelTonnes: 1215,
          fuelDiff: "+35 t",
          costLakhs: 125.1,
          costFormatted: "₹125.1 L",
          costUSD: "$151.6k",
          description: "Offshore deepwater fairway avoiding nearshore wave resistance.",
          points: alt1Pts,
        },
        {
          id: "alt2",
          name: "Southern Maritime Passage",
          tag: "Offshore Route 2",
          badge: "ALTERNATIVE 2",
          distanceNM: 5830,
          eta: "25 May · 07:45",
          etaDiff: "+13h 45m vs Direct",
          fuelTonnes: 1230,
          fuelDiff: "+50 t",
          costLakhs: 126.8,
          costFormatted: "₹126.8 L",
          costUSD: "$153.4k",
          description: "Southern Mediterranean and Atlantic fairway with favorable tailwinds.",
          points: alt2Pts,
        },
      ];
    } else if (vessel.id === "v2") {
      // MV Eco Pioneer (Bulk Carrier - Chennai to Singapore)
      const recPts = [
        { lat: 13.08, lng: 80.27 },
        { lat: 10.0, lng: 81.5 },
        { lat: 6.94, lng: 79.84 },
        { lat: 5.8, lng: 80.5 },
        { lat: 5.5, lng: 95.0 },
        { lat: 5.0, lng: 100.0 },
        { lat: 3.0, lng: 101.38 },
        { lat: 1.29, lng: 103.85 },
      ];
      const alt1Pts = [
        { lat: 13.08, lng: 80.27 },
        { lat: 11.2, lng: 82.8 },
        { lat: 7.2, lng: 81.2 },
        { lat: 5.0, lng: 82.5 },
        { lat: 5.8, lng: 93.8 },
        { lat: 4.5, lng: 98.2 },
        { lat: 3.5, lng: 100.8 },
        { lat: 1.29, lng: 103.85 },
      ];
      const alt2Pts = [
        { lat: 13.08, lng: 80.27 },
        { lat: 8.5, lng: 83.5 },
        { lat: 4.8, lng: 81.2 },
        { lat: 3.8, lng: 92.5 },
        { lat: 4.2, lng: 97.5 },
        { lat: 2.5, lng: 101.2 },
        { lat: 1.29, lng: 103.85 },
      ];
      return [
        {
          id: "rec",
          name: "Malacca Strait Central TSS Direct",
          tag: "Direct Coastal",
          badge: "RECOMMENDED — OPTIMAL",
          distanceNM: 2180,
          eta: "13 May · 18:30",
          etaDiff: "Fastest Baseline",
          fuelTonnes: 410,
          fuelDiff: "-35 t vs Alt 1",
          costLakhs: 42.5,
          costFormatted: "₹42.5 L",
          costUSD: "$51.2k",
          description: "Full transit via Colombo, Perak channel, Port Klang to Singapore.",
          points: recPts,
        },
        {
          id: "alt1",
          name: "East Andaman Deepwater Track",
          tag: "Offshore Route 1",
          badge: "ALTERNATIVE 1",
          distanceNM: 2340,
          eta: "14 May · 04:00",
          etaDiff: "+9h 30m",
          fuelTonnes: 445,
          fuelDiff: "+35 t",
          costLakhs: 46.1,
          costFormatted: "₹46.1 L",
          costUSD: "$55.6k",
          description: "Wider deepwater fairway avoiding congested near-shore fishing zones.",
          points: alt1Pts,
        },
        {
          id: "alt2",
          name: "Nicobar Passage & Ocean Fairway",
          tag: "Offshore Route 2",
          badge: "ALTERNATIVE 2",
          distanceNM: 2390,
          eta: "14 May · 09:15",
          etaDiff: "+14h 45m",
          fuelTonnes: 458,
          fuelDiff: "+48 t",
          costLakhs: 47.4,
          costFormatted: "₹47.4 L",
          costUSD: "$57.2k",
          description: "Outer Great Nicobar oceanic track with minimal coastal swell.",
          points: alt2Pts,
        },
      ];
    } else if (vessel.id === "v3") {
      // MV Quantum Star (Chemical Tanker - JNPT to Fujairah)
      const recPts = [
        { lat: 18.95, lng: 72.95 },
        { lat: 20.0, lng: 67.0 },
        { lat: 22.5, lng: 60.5 },
        { lat: 24.5, lng: 56.63 },
        { lat: 25.12, lng: 56.36 },
      ];
      const alt1Pts = [
        { lat: 18.95, lng: 72.95 },
        { lat: 21.2, lng: 66.0 },
        { lat: 23.5, lng: 59.8 },
        { lat: 25.3, lng: 57.2 },
        { lat: 25.12, lng: 56.36 },
      ];
      const alt2Pts = [
        { lat: 18.95, lng: 72.95 },
        { lat: 19.0, lng: 65.5 },
        { lat: 21.8, lng: 59.2 },
        { lat: 24.2, lng: 56.8 },
        { lat: 25.12, lng: 56.36 },
      ];
      return [
        {
          id: "rec",
          name: "Gulf of Oman Coastal Fairway to Fujairah",
          tag: "Standard Channel",
          badge: "RECOMMENDED — OPTIMAL",
          distanceNM: 840,
          eta: "05 May · 14:00",
          etaDiff: "Fastest Baseline",
          fuelTonnes: 142,
          fuelDiff: "-16 t vs Alt 1",
          costLakhs: 14.8,
          costFormatted: "₹14.8 L",
          costUSD: "$17.8k",
          description: "Direct entry connecting JNPT, Sohar anchorage and Fujairah green bunker terminal.",
          points: recPts,
        },
        {
          id: "alt1",
          name: "Northern Deepwater Track",
          tag: "Offshore Route 1",
          badge: "ALTERNATIVE 1",
          distanceNM: 920,
          eta: "05 May · 21:00",
          etaDiff: "+7h 00m",
          fuelTonnes: 158,
          fuelDiff: "+16 t",
          costLakhs: 16.4,
          costFormatted: "₹16.4 L",
          costUSD: "$19.8k",
          description: "Deep sea transit avoiding localized Gulf of Oman anchorages.",
          points: alt1Pts,
        },
        {
          id: "alt2",
          name: "Southern Arabian Sea Shipping Lane",
          tag: "Offshore Route 2",
          badge: "ALTERNATIVE 2",
          distanceNM: 955,
          eta: "06 May · 02:30",
          etaDiff: "+12h 30m",
          fuelTonnes: 164,
          fuelDiff: "+22 t",
          costLakhs: 17.1,
          costFormatted: "₹17.1 L",
          costUSD: "$20.6k",
          description: "Southern Arabian Sea corridor clear of coastal oil tanker traffic.",
          points: alt2Pts,
        },
      ];
    } else if (vessel.id === "v4") {
      // MV Neptune Pride (Container Ship - Colombo to Jeddah)
      const recPts = [
        { lat: 6.94, lng: 79.84 },
        { lat: 8.0, lng: 65.0 },
        { lat: 13.0, lng: 58.0 },
        { lat: 16.94, lng: 54.0 },
        { lat: 12.6, lng: 43.35 },
        { lat: 17.5, lng: 40.5 },
        { lat: 21.4858, lng: 39.1925 },
      ];
      const alt1Pts = [
        { lat: 6.94, lng: 79.84 },
        { lat: 9.5, lng: 68.0 },
        { lat: 14.5, lng: 59.5 },
        { lat: 15.8, lng: 55.2 },
        { lat: 12.6, lng: 43.35 },
        { lat: 18.2, lng: 39.8 },
        { lat: 21.4858, lng: 39.1925 },
      ];
      const alt2Pts = [
        { lat: 6.94, lng: 79.84 },
        { lat: 6.2, lng: 70.0 },
        { lat: 10.2, lng: 56.5 },
        { lat: 12.2, lng: 48.0 },
        { lat: 12.6, lng: 43.35 },
        { lat: 17.0, lng: 41.2 },
        { lat: 21.4858, lng: 39.1925 },
      ];
      return [
        {
          id: "rec",
          name: "Express Red Sea Container Corridor",
          tag: "Express Track",
          badge: "RECOMMENDED — OPTIMAL",
          distanceNM: 2890,
          eta: "13 May · 18:30",
          etaDiff: "Fastest Baseline",
          fuelTonnes: 720,
          fuelDiff: "-45 t vs Alt 1",
          costLakhs: 74.2,
          costFormatted: "₹74.2 L",
          costUSD: "$89.5k",
          description: "High-efficiency route via Colombo, Salalah hub and Bab-el-Mandeb straight to Jeddah.",
          points: recPts,
        },
        {
          id: "alt1",
          name: "Socotra Northern Deepwater Track",
          tag: "Offshore Route 1",
          badge: "ALTERNATIVE 1",
          distanceNM: 3050,
          eta: "14 May · 08:00",
          etaDiff: "+13h 30m",
          fuelTonnes: 765,
          fuelDiff: "+45 t",
          costLakhs: 78.8,
          costFormatted: "₹78.8 L",
          costUSD: "$95.1k",
          description: "North Socotra ocean track with high-sea maneuvering space.",
          points: alt1Pts,
        },
        {
          id: "alt2",
          name: "High-Sea Central Arabian Track",
          tag: "Offshore Route 2",
          badge: "ALTERNATIVE 2",
          distanceNM: 3110,
          eta: "14 May · 14:15",
          etaDiff: "+19h 45m",
          fuelTonnes: 782,
          fuelDiff: "+62 t",
          costLakhs: 80.5,
          costFormatted: "₹80.5 L",
          costUSD: "$97.2k",
          description: "Central Arabian Sea ocean track clear of nearshore currents.",
          points: alt2Pts,
        },
      ];
    }

    // Default fallback (Vessel 5 or generic)
    const defaultRec = [
      { lat: vessel.currentPos.lat, lng: vessel.currentPos.lng },
      { lat: 14.8, lng: 55.4 },
      { lat: 12.6, lng: 45.2 },
      { lat: 13.0, lng: 43.1 },
      { lat: 20.0, lng: 38.6 },
      { lat: 27.85, lng: 33.6 },
      { lat: 29.9, lng: 32.55 },
      { lat: 31.3, lng: 32.3 },
      { lat: 34.0, lng: 24.8 },
      { lat: 36.0, lng: 15.2 },
      { lat: 37.6, lng: 8.8 },
      { lat: 35.95, lng: -5.6 },
      { lat: 39.2, lng: -9.6 },
      { lat: 48.2, lng: -5.2 },
      { lat: 51.95, lng: 4.14 },
    ];
    const defaultAlt1 = [
      { lat: vessel.currentPos.lat, lng: vessel.currentPos.lng },
      { lat: 15.2, lng: 56.5 },
      { lat: 13.2, lng: 46.2 },
      { lat: 13.0, lng: 43.1 },
      { lat: 21.2, lng: 38.2 },
      { lat: 27.85, lng: 33.6 },
      { lat: 29.9, lng: 32.55 },
      { lat: 31.3, lng: 32.3 },
      { lat: 35.2, lng: 23.5 },
      { lat: 37.2, lng: 14.2 },
      { lat: 38.5, lng: 5.0 },
      { lat: 36.2, lng: -5.8 },
      { lat: 40.5, lng: -10.5 },
      { lat: 48.8, lng: -6.2 },
      { lat: 51.95, lng: 4.14 },
    ];
    const defaultAlt2 = [
      { lat: vessel.currentPos.lat, lng: vessel.currentPos.lng },
      { lat: 13.8, lng: 54.0 },
      { lat: 12.2, lng: 44.8 },
      { lat: 13.0, lng: 43.1 },
      { lat: 18.8, lng: 39.2 },
      { lat: 27.85, lng: 33.6 },
      { lat: 29.9, lng: 32.55 },
      { lat: 31.3, lng: 32.3 },
      { lat: 33.2, lng: 26.0 },
      { lat: 35.0, lng: 16.0 },
      { lat: 36.8, lng: 4.2 },
      { lat: 35.7, lng: -5.4 },
      { lat: 37.5, lng: -9.2 },
      { lat: 47.5, lng: -4.8 },
      { lat: 51.95, lng: 4.14 },
    ];

    return [
      {
        id: "rec",
        name: "Standard Optimized Oceanic Route",
        tag: "Direct Track",
        badge: "RECOMMENDED",
        distanceNM: 2450,
        eta: "18 May · 14:00",
        etaDiff: "Baseline",
        fuelTonnes: 450,
        fuelDiff: "0 t",
        costLakhs: 48.0,
        costFormatted: "₹48.0 L",
        costUSD: "$58.2k",
        description: "Optimized green voyage track with minimal hydrodynamic drag.",
        points: defaultRec,
      },
      {
        id: "alt1",
        name: "Northern Offshore Fairway",
        tag: "Offshore Route 1",
        badge: "ALTERNATIVE 1",
        distanceNM: 2540,
        eta: "18 May · 22:30",
        etaDiff: "+8h 30m",
        fuelTonnes: 472,
        fuelDiff: "+22 t",
        costLakhs: 50.4,
        costFormatted: "₹50.4 L",
        costUSD: "$61.1k",
        description: "Northern deepwater route avoiding coastal current shear.",
        points: defaultAlt1,
      },
      {
        id: "alt2",
        name: "Southern Oceanic Passage",
        tag: "Offshore Route 2",
        badge: "ALTERNATIVE 2",
        distanceNM: 2580,
        eta: "19 May · 04:15",
        etaDiff: "+14h 15m",
        fuelTonnes: 485,
        fuelDiff: "+35 t",
        costLakhs: 51.8,
        costFormatted: "₹51.8 L",
        costUSD: "$62.8k",
        description: "Southern maritime fairway clear of nearshore anchorages.",
        points: defaultAlt2,
      },
    ];
  }, [vessel.id, vessel.currentPos, simulatedDelayPortId]);

  const activeSelectedRoute = useMemo(() => {
    return candidateRoutes.find((r) => r.id === selectedRouteId) || candidateRoutes[0];
  }, [candidateRoutes, selectedRouteId]);

  const baseFC = vessel.fuelConsumption?.voyage || 68.4;
  const dailyConsumption = useMemo(() => {
    return calculateFuelConsumption(vesselSpeed, baseFC, vessel.speed || 15);
  }, [vesselSpeed, baseFC, vessel.speed]);

  const estimatedRangeNM = useMemo(() => {
    return calculateFuelRange(currentFuelTonnes, vesselSpeed, dailyConsumption);
  }, [currentFuelTonnes, vesselSpeed, dailyConsumption]);

  // Multi-Criteria Best Bunker Evaluation
  const bunkerComparisonList: BunkerEvaluation[] = useMemo(() => {
    const vesselFuel = vessel.fuelType || "LNG";

    const evaluations = upcomingPorts.map((port) => {
      const price = port.fuelPrices[vesselFuel as keyof typeof port.fuelPrices] || 600;
      const availability = port.fuelAvailability[vesselFuel as keyof typeof port.fuelAvailability] || 50000;
      const estBunkerTonnes = Math.min(availability, Math.max(300, fuelCapacity - currentFuelTonnes));
      const costUSD = estBunkerTonnes * price;
      const costLakhs = Math.round((costUSD * 83.2) / 100000);

      const priceScore = Math.max(0, 100 - (price - 550) * 0.8);
      const availScore = Math.min(100, (availability / 50000) * 100);
      const shoreScore = port.shorePower.available ? 15 : 0;
      const totalScore = priceScore * 0.5 + availScore * 0.35 + shoreScore;

      return {
        port,
        distNM: 850,
        isReachable: true,
        fuelType: vesselFuel,
        pricePerTonne: price,
        availableTonnes: availability,
        eta: port.eta,
        gridPowerAvailable: port.shorePower.available,
        gridPowerCostPerKWh: port.shorePower.pricePerKWh,
        estimatedBunkerTonnes: estBunkerTonnes,
        estimatedCostUSD: costUSD,
        estimatedCostLakhs: costLakhs,
        reserveMarginPct: 42,
        score: totalScore,
        isRecommended: false,
      };
    });

    evaluations.sort((a, b) => b.score - a.score);
    if (evaluations.length > 0) {
      evaluations[0].isRecommended = true;
    }
    return evaluations;
  }, [upcomingPorts, vessel.fuelType, fuelCapacity, currentFuelTonnes]);

  const recommendedBunkerEvaluation = useMemo(() => {
    return bunkerComparisonList.find((b) => b.isRecommended) || bunkerComparisonList[0];
  }, [bunkerComparisonList]);

  // Mouse pan & zoom handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isPanning.current = true;
    lastMouse.current = [e.clientX, e.clientY];
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning.current) return;
      const dx = (e.clientX - lastMouse.current[0]) / zoom;
      const dy = (e.clientY - lastMouse.current[1]) / zoom;
      lastMouse.current = [e.clientX, e.clientY];
      setTranslate(([tx, ty]) => [tx + dx, ty + dy]);
    },
    [zoom]
  );

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.6, Math.min(10, z * (e.deltaY < 0 ? 1.15 : 0.88))));
  }, []);

  const resetView = () => {
    setZoom(1);
    setTranslate([0, 0]);
    setSelectedPort(null);
    setHoveredPort(null);
  };

  const shipProjected = project(vessel.currentPos.lat, vessel.currentPos.lng);
  const ecaCenter = activeECA ? project(activeECA.lat, activeECA.lng) : null;
  const trafficCenter = activeTraffic ? project(activeTraffic.lat, activeTraffic.lng) : null;
  const trafficProjectedPoints = activeTraffic ? activeTraffic.points.map((pt) => project(pt.lat, pt.lng)) : [];

  // Active popup port (hover takes precedence, or selected port)
  const activePopupPort = hoveredPort || selectedPort;
  const activePopupCoords = activePopupPort ? project(activePopupPort.lat, activePopupPort.lng) : null;

  return (
    <div className="space-y-3 max-w-[1700px] mx-auto select-none pb-6" style={{ background: "#FEFAEF" }}>
      {/* ── Top Tactical Header Bar ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#182350]/20 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Vessel Identity & Live AIS SOG */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-2xs"
            style={{ background: "#EAF4FE", color: "#182350", border: "1px solid #AFD2FA" }}
          >
            {vessel.type.includes("LNG")
              ? "❄️"
              : vessel.type.includes("Bulk")
              ? "⛰️"
              : vessel.type.includes("Chemical")
              ? "⚗️"
              : vessel.type.includes("Container")
              ? "📦"
              : "🚢"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[#182350] font-sans">{vessel.name}</h1>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#EAF7F0] text-[#2E9B68] border border-[#2E9B68]/30 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E9B68] animate-pulse" />
                SOG {vesselSpeed.toFixed(1)} kn
              </span>
            </div>
            <div className="text-xs text-[#737985] font-mono">
              En Route: <strong className="text-[#182350]">{vessel.origin}</strong> →{" "}
              <strong className="text-[#182350]">{vessel.destination}</strong>
            </div>
          </div>
        </div>

        {/* Center/Right: Floating Overlay Triggers & Mode Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selectors */}
          <div className="flex rounded-xl border border-[#182350]/20 overflow-hidden bg-[#FAFAF5] text-xs font-mono font-bold">
            <button
              onClick={() => setMapMode("normal")}
              className={`px-3 py-1.5 transition-all cursor-pointer ${
                mapMode === "normal" ? "bg-[#182350] text-white shadow-2xs" : "text-[#737985] hover:text-[#182350]"
              }`}
            >
              Normal Radar
            </button>
            <button
              onClick={() => setMapMode("best_bunker")}
              className={`px-3 py-1.5 transition-all cursor-pointer ${
                mapMode === "best_bunker" ? "bg-[#182350] text-white shadow-2xs" : "text-[#737985] hover:text-[#182350]"
              }`}
            >
              ★ Best Bunker
            </button>
            <button
              onClick={() => setMapMode("fuel_checker")}
              className={`px-3 py-1.5 transition-all cursor-pointer ${
                mapMode === "fuel_checker" ? "bg-[#182350] text-white shadow-2xs" : "text-[#737985] hover:text-[#182350]"
              }`}
            >
              ⛽ Fuel Range
            </button>
          </div>

          {/* Action Overlay Trigger Buttons */}
          <button
            onClick={() => toggleDrawer("routes")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeDrawer === "routes"
                ? "bg-[#182350] text-white border-[#182350]/20 shadow-xs"
                : "bg-[#EAF4FE] text-[#182350] border-[#AFD2FA] hover:bg-[#AFD2FA]/30"
            }`}
          >
            <span>🧭</span>
            <span>Routes ({candidateRoutes.length})</span>
          </button>

          <button
            onClick={() => toggleDrawer("bunker")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeDrawer === "bunker"
                ? "bg-[#182350] text-white border-[#182350]/20 shadow-xs"
                : "bg-[#FAFAF5] text-[#182350] border-[#182350]/20 hover:border-[#AFD2FA]"
            }`}
          >
            <span>⛽</span>
            <span>Bunkering &amp; Range</span>
          </button>

          <button
            onClick={() => toggleDrawer("ports")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeDrawer === "ports"
                ? "bg-[#182350] text-white border-[#182350]/20 shadow-xs"
                : "bg-[#FAFAF5] text-[#182350] border-[#182350]/20 hover:border-[#AFD2FA]"
            }`}
          >
            <span>⚓</span>
            <span>Ports ({upcomingPorts.length})</span>
          </button>

          <button
            onClick={() => toggleDrawer("speed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeDrawer === "speed"
                ? "bg-[#182350] text-white border-[#182350]/20 shadow-xs"
                : "bg-[#FAFAF5] text-[#182350] border-[#182350]/20 hover:border-[#AFD2FA]"
            }`}
          >
            <span>⚙</span>
            <span>Speed &amp; Limits</span>
          </button>

          <button
            onClick={resetView}
            className="p-2 rounded-xl text-xs font-mono text-[#737985] hover:text-[#182350] border border-[#182350]/20 bg-white cursor-pointer hover:bg-[#FAFAF5]"
            title="Reset Pan & Zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── 100% Full-Bleed Map Canvas Container ── */}
      <div
        className="w-full rounded-2xl overflow-hidden relative shadow-sm border border-[#182350]/20"
        style={{
          height: "calc(100vh - 165px)",
          minHeight: 650,
          background: "#EAF4FE",
          cursor: isPanning.current ? "grabbing" : "grab",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {/* Map Controls (+ / - / Reset) in Top Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20 shadow-xs">
          <button
            onClick={() => setZoom((z) => Math.min(10, z * 1.25))}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-bold bg-white text-[#182350] border border-[#182350]/20 shadow-xs hover:bg-[#F7F5EE] active:bg-[#EAF4FE] transition-colors cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z * 0.8))}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-bold bg-white text-[#182350] border border-[#182350]/20 shadow-xs hover:bg-[#F7F5EE] active:bg-[#EAF4FE] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={resetView}
            className="px-2 py-1 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider bg-white text-[#737985] hover:text-[#182350] border border-[#182350]/20 shadow-xs hover:bg-[#F7F5EE] transition-colors cursor-pointer"
            title="Reset Map View"
          >
            Reset
          </button>
        </div>

        {/* Standard North-Up Compass */}
        <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md p-2 rounded-xl border border-[#182350]/20 shadow-xs text-center select-none pointer-events-none">
          <div className="text-[10px] font-black text-rose-600 tracking-wider">N</div>
          <div className="text-[9px] font-bold text-[#737985] leading-none">↑</div>
          <div className="flex items-center justify-center gap-1.5 text-[8px] font-bold text-[#182350] my-0.5">
            <span>W</span>
            <span className="text-[9px] text-[#182350]">┼</span>
            <span>E</span>
          </div>
          <div className="text-[9px] font-bold text-[#737985] leading-none">↓</div>
          <div className="text-[9px] font-bold text-[#182350]">S</div>
        </div>

        {/* ── Compact Integrated Route Legend ── */}
        <div className="absolute top-3 left-20 z-20 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[#182350]/20 shadow-xs flex items-center gap-3 text-xs font-mono select-none">
          <div
            onClick={() => setSelectedRouteId("rec")}
            className={`flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedRouteId === "rec" ? "opacity-100 font-bold" : "opacity-75 hover:opacity-100"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#182350]" />
            <span className={selectedRouteId === "rec" ? "text-[#182350] font-bold underline" : "text-[#4A5260]"}>
              ● Recommended
            </span>
          </div>
          <span className="text-[#182350]">|</span>
          <div
            onClick={() => setSelectedRouteId("alt1")}
            className={`flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedRouteId === "alt1" ? "opacity-100 font-bold" : "opacity-75 hover:opacity-100"
            }`}
          >
            <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#2563EB]" />
            <span className={selectedRouteId === "alt1" ? "text-[#2563EB] font-bold underline" : "text-[#4A5260]"}>
              ┄ Alternative 1
            </span>
          </div>
          <span className="text-[#182350]">|</span>
          <div
            onClick={() => setSelectedRouteId("alt2")}
            className={`flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedRouteId === "alt2" ? "opacity-100 font-bold" : "opacity-75 hover:opacity-100"
            }`}
          >
            <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#0284C7]" />
            <span className={selectedRouteId === "alt2" ? "text-[#0284C7] font-bold underline" : "text-[#4A5260]"}>
              ┄ Alternative 2
            </span>
          </div>
        </div>

        {/* Floating Quick Dock Icon Strip on Right Edge */}
        <div className="absolute top-28 right-3 z-30 flex flex-col gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#182350]/20 shadow-md">
          <button
            onClick={() => toggleDrawer("routes")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer ${
              activeDrawer === "routes"
                ? "bg-[#182350] text-white shadow-xs"
                : "text-[#182350] hover:bg-[#EAF4FE]"
            }`}
            title="Route Corridors & Options"
          >
            🧭
          </button>
          <button
            onClick={() => toggleDrawer("bunker")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer ${
              activeDrawer === "bunker"
                ? "bg-[#182350] text-white shadow-xs"
                : "text-[#182350] hover:bg-[#EAF4FE]"
            }`}
            title="Bunker Optimizer & Fuel Simulator"
          >
            ⛽
          </button>
          <button
            onClick={() => toggleDrawer("ports")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer ${
              activeDrawer === "ports"
                ? "bg-[#182350] text-white shadow-xs"
                : "text-[#182350] hover:bg-[#EAF4FE]"
            }`}
            title="Upcoming Ports & Shore Power"
          >
            ⚓
          </button>
          <button
            onClick={() => toggleDrawer("speed")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer ${
              activeDrawer === "speed"
                ? "bg-[#182350] text-white shadow-xs"
                : "text-[#182350] hover:bg-[#EAF4FE]"
            }`}
            title="Speed Governor & Delay Simulation"
          >
            ⚙
          </button>
          <button
            onClick={() => toggleDrawer("voyage")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer ${
              activeDrawer === "voyage"
                ? "bg-[#182350] text-white shadow-xs"
                : "text-[#182350] hover:bg-[#EAF4FE]"
            }`}
            title="Voyage Telemetry Overview"
          >
            ℹ
          </button>
        </div>

        {/* Mode-Specific Top Floating HUD Overlays */}
        {mapMode === "fuel_checker" && (
          <div className="absolute top-12 left-20 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#182350]/20 shadow-sm flex items-center gap-3 text-xs select-none animate-in fade-in">
            <div className="flex items-center gap-1.5 font-sans">
              <span className="w-2.5 h-2.5 rounded-full bg-[#182350] animate-pulse" />
              <span className="font-bold text-[#737985] uppercase text-[10px] font-mono">Fuel Range:</span>
              <span className="font-mono font-extrabold text-[#182350]">{estimatedRangeNM.toLocaleString()} NM</span>
            </div>
            <span className="text-[#182350]">|</span>
            <div className="text-[10.5px] text-[#737985] font-mono">
              Dark track = reachable with {fuelPct}% ({currentFuelTonnes} t)
            </div>
          </div>
        )}

        {mapMode === "best_bunker" && recommendedBunkerEvaluation && (
          <div className="absolute top-12 left-20 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#182350]/20 shadow-sm flex items-center gap-3 text-xs select-none animate-in fade-in">
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-xs text-[#B9915E]">★</span>
              <span className="font-bold text-[#737985] uppercase text-[10px] font-mono">Optimal Bunker:</span>
              <span className="font-bold text-[#182350]">{recommendedBunkerEvaluation.port.name}</span>
            </div>
            <span className="text-[#182350]">|</span>
            <div className="text-[10.5px] text-[#B9915E] font-mono font-bold">
              ${recommendedBunkerEvaluation.pricePerTonne}/t · {recommendedBunkerEvaluation.availableTonnes.toLocaleString()} t supply
            </div>
          </div>
        )}

        {/* Floating Telemetry Chip in Bottom Left */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#182350]/20 shadow-lg max-w-sm hidden sm:block">
          <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-[#182350]/20">
            <span className="text-xs font-black text-[#182350] font-sans">{vessel.name}</span>
            <span className="text-[10px] font-mono font-bold text-[#2E9B68] bg-[#EAF7F0] px-2 py-0.5 rounded-full border border-[#2E9B68]/30">
              AIS ONLINE
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-1.5 rounded-xl bg-[#FAFAF5] border border-[#182350]/20">
              <div className="text-[9px] text-[#737985] uppercase">Speed</div>
              <div className="font-extrabold text-[#182350]">{vesselSpeed.toFixed(1)} kn</div>
            </div>
            <div className="p-1.5 rounded-xl bg-[#FAFAF5] border border-[#182350]/20">
              <div className="text-[9px] text-[#737985] uppercase">Fuel DWT</div>
              <div className="font-extrabold text-[#182350]">{fuelPct}%</div>
            </div>
            <div className="p-1.5 rounded-xl bg-[#FAFAF5] border border-[#182350]/20">
              <div className="text-[9px] text-[#737985] uppercase">Distance</div>
              <div className="font-extrabold text-[#B9915E]">{activeSelectedRoute?.distanceNM} NM</div>
            </div>
          </div>
        </div>

        {/* ── SVG Map Canvas ── */}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ display: "block" }}
        >
          <defs>
            <clipPath id="map-bounds-clip">
              <rect x={0} y={0} width={WIDTH} height={HEIGHT} />
            </clipPath>

            <filter id="route-reachable-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#182350" floodOpacity="0.4" />
            </filter>

            <filter id="bunker-route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#AFD2FA" floodOpacity="0.8" />
            </filter>

            <filter id="tag-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#182350" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* Ocean background */}
          <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#EAF4FE" />

          <g clipPath="url(#map-bounds-clip)">
            {/* Lat/Long grid lines */}
            {Array.from({ length: 19 }, (_, i) => i * 10 - 90).map((lat) => {
              const [, y0] = project(lat, 20);
              return y0 > -20 && y0 < HEIGHT + 20 ? (
                <line
                  key={`lat-${lat}`}
                  x1={0}
                  y1={y0}
                  x2={WIDTH}
                  y2={y0}
                  stroke="rgba(24, 35, 80, 0.06)"
                  strokeWidth={0.6}
                />
              ) : null;
            })}

            {/* Geographic Countries */}
            <g
              transform={`translate(${translate[0] * zoom + (WIDTH / 2) * (1 - zoom)}, ${
                translate[1] * zoom + (HEIGHT / 2) * (1 - zoom)
              }) scale(${zoom})`}
            >
              {countries.map((geo: any, idx: number) => (
                <path
                  key={geo.id || `geo-${idx}`}
                  d={pathGen(geo) ?? ""}
                  fill="#F5F5F0"
                  stroke="#182350"
                  strokeWidth={0.7}
                />
              ))}
            </g>

            {/* ONE-WAY TRAFFIC AREA */}
            {activeTraffic && trafficCenter && (
              <g
                className="cursor-pointer group select-none"
                onMouseEnter={() => setHoveredTraffic(activeTraffic)}
                onMouseLeave={() => setHoveredTraffic(null)}
              >
                {trafficProjectedPoints.length > 1 && (
                  <polyline
                    points={toPolyline(trafficProjectedPoints)}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth={10}
                    strokeOpacity={0.3}
                    strokeLinecap="round"
                  />
                )}
                {trafficProjectedPoints.length > 1 && (
                  <polyline
                    points={toPolyline(trafficProjectedPoints)}
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    strokeLinecap="round"
                  />
                )}
                <circle cx={trafficCenter[0]} cy={trafficCenter[1]} r={5} fill="#EF4444" />
                <circle cx={trafficCenter[0]} cy={trafficCenter[1]} r={11} fill="none" stroke="#EF4444" strokeWidth={1} strokeOpacity={0.6} />
              </g>
            )}

            {/* ECA REGION */}
            {activeECA && ecaCenter && (
              <g
                className="cursor-pointer group select-none"
                onMouseEnter={() => setHoveredECA(activeECA)}
                onMouseLeave={() => setHoveredECA(null)}
              >
                <circle
                  cx={ecaCenter[0]}
                  cy={ecaCenter[1]}
                  r={35}
                  fill="#F59E0B"
                  fillOpacity={0.12}
                  stroke="#D97706"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                />
              </g>
            )}

            {/* ── CANDIDATE ROUTES (ALL 3 VISIBLE & DISTINGUISHABLE AT ALL TIMES) ── */}
            {mapMode !== "fuel_checker" &&
              candidateRoutes.map((r) => {
                const isSelected = selectedRouteId === r.id;
                const pts = r.points.map((pt) => project(pt.lat, pt.lng));

                // High visibility styling definitions
                let strokeColor = "#182350";
                let strokeDash = "none";
                let baseWidth = 3.8;
                let baseOpacity = 0.85;

                if (r.id === "rec") {
                  strokeColor = isSelected ? "#182350" : "#1E3A8A";
                  strokeDash = "none";
                  baseWidth = isSelected ? 4.8 : 3.8;
                  baseOpacity = isSelected ? 1.0 : 0.85;
                } else if (r.id === "alt1") {
                  strokeColor = isSelected ? "#1D4ED8" : "#2563EB";
                  strokeDash = "8 5";
                  baseWidth = isSelected ? 4.2 : 2.8;
                  baseOpacity = isSelected ? 1.0 : 0.85;
                } else if (r.id === "alt2") {
                  strokeColor = isSelected ? "#0284C7" : "#0284C7";
                  strokeDash = "6 4";
                  baseWidth = isSelected ? 4.2 : 2.8;
                  baseOpacity = isSelected ? 1.0 : 0.85;
                }

                return (
                  <g
                    key={r.id}
                    onClick={() => setSelectedRouteId(r.id)}
                    className="cursor-pointer group select-none"
                  >
                    {/* Invisible wide click target for seamless route selection */}
                    <polyline
                      points={toPolyline(pts)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                    />

                    {/* Visible route polyline */}
                    <polyline
                      points={toPolyline(pts)}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={baseWidth}
                      strokeOpacity={baseOpacity}
                      strokeDasharray={strokeDash}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={isSelected ? "url(#route-reachable-glow)" : undefined}
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}

            {/* UPCOMING WAYPOINT PORTS */}
            {upcomingPorts.map((p, idx) => {
              const [px, py] = project(p.lat, p.lng);
              const isSelected = selectedPort?.id === p.id;
              const isHovered = hoveredPort?.id === p.id;
              const evalItem = bunkerComparisonList.find((b) => b.port.id === p.id);
              const isBestBunker = evalItem?.isRecommended;

              // Alternate label offset based on index to prevent text overlapping nearby ports
              const labelRight = idx % 2 === 0;
              const tagX = labelRight ? px + 12 : px - (p.name.length * 6.2 + 20);
              const tagTextX = labelRight ? px + 19 : px - (p.name.length * 6.2 + 13);

              return (
                <g
                  key={p.id}
                  onClick={() => setSelectedPort(isSelected ? null : p)}
                  onMouseEnter={() => setHoveredPort(p)}
                  onMouseLeave={() => setHoveredPort(null)}
                  className="cursor-pointer group select-none"
                >
                  {/* Invisible enlarged hit area for silky smooth hover */}
                  <circle cx={px} cy={py} r={24} fill="transparent" />

                  {/* Pulsing ring on hover/selection */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx={px}
                      cy={py}
                      r={16}
                      fill="#AFD2FA"
                      fillOpacity={0.4}
                      className="animate-pulse"
                    />
                  )}

                  <circle
                    cx={px}
                    cy={py}
                    r={isSelected || isHovered || isBestBunker ? 10 : 7}
                    fill={isBestBunker && mapMode === "best_bunker" ? "#B9915E" : (isSelected || isHovered) ? "#182350" : "#FFFFFF"}
                    stroke={isBestBunker && mapMode === "best_bunker" ? "#182350" : "#182350"}
                    strokeWidth={2.2}
                    className="transition-all duration-150"
                  />
                  <text
                    x={px}
                    y={py + 3.5}
                    textAnchor="middle"
                    fill={isBestBunker && mapMode === "best_bunker" || isSelected || isHovered ? "#FFFFFF" : "#182350"}
                    fontSize="7.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {idx + 1}
                  </text>

                  {/* Port Name Label Tag with dynamic non-overlapping alignment */}
                  <rect
                    x={tagX}
                    y={py - 11}
                    width={p.name.length * 6.2 + 14}
                    height={20}
                    rx={6}
                    fill={isHovered || isSelected ? "#182350" : "#FFFFFF"}
                    stroke={isHovered || isSelected ? "#AFD2FA" : "#182350"}
                    strokeWidth={1.2}
                    filter="url(#tag-shadow)"
                    className="transition-all duration-150 pointer-events-none"
                  />
                  <text
                    x={tagTextX}
                    y={py + 2.5}
                    fill={isHovered || isSelected ? "#FFFFFF" : "#182350"}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="Inter, sans-serif"
                    className="transition-all duration-150 pointer-events-none"
                  >
                    {p.name}
                  </text>
                </g>
              );
            })}

            {/* LIVE VESSEL ICON WITH HEADING & RADAR BEACON */}
            {shipProjected && (
              <g
                transform={`translate(${shipProjected[0]}, ${shipProjected[1]}) rotate(${
                  vessel.heading || 45
                })`}
                className="select-none pointer-events-none"
              >
                <circle cx={0} cy={0} r={18} fill="#AFD2FA" fillOpacity={0.35} />
                <circle cx={0} cy={0} r={10} fill="#182350" stroke="#FFFFFF" strokeWidth={2} />
                <path d="M 0 -8 L 4 4 L -4 4 Z" fill="#AFD2FA" />
              </g>
            )}
          </g>
        </svg>

        {/* ── SMALL FLOATING CONTAINER NEAR PORT ON HOVER / CLICK (100% SYNCHRONIZED WITH ZERO DRIFT) ── */}
        {activePopupPort && activePopupCoords && (
          <div
            onMouseEnter={() => setHoveredPort(activePopupPort)}
            onMouseLeave={() => setHoveredPort(null)}
            className="absolute z-35 pointer-events-auto transition-transform duration-75 animate-in fade-in zoom-in-95 select-none"
            style={{
              left: `${(activePopupCoords[0] / WIDTH) * 100}%`,
              top: `${(activePopupCoords[1] / HEIGHT) * 100}%`,
              transform:
                activePopupCoords[1] > HEIGHT - 200
                  ? "translate(-50%, -100%) translateY(-14px)"
                  : "translate(-50%, 16px)",
            }}
          >
            <div className="w-[310px] sm:w-[330px] rounded-2xl bg-white/95 backdrop-blur-xl border border-[#AFD2FA] shadow-2xl p-3.5 text-[#182350] relative">
              {/* Header: Port identity & Country & ETA */}
              <div className="flex items-start justify-between pb-2 mb-2 border-b border-[#182350]/20">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">⚓</span>
                    <h3 className="text-xs font-black text-[#182350] font-sans">
                      {activePopupPort.name}
                    </h3>
                  </div>
                  <div className="text-[10px] text-[#737985] font-mono mt-0.5">
                    {activePopupPort.country} · <span className="text-[#182350] font-bold">ETA: {activePopupPort.eta}</span>
                  </div>
                </div>

                {selectedPort && (
                  <button
                    onClick={() => setSelectedPort(null)}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[#737985] hover:text-[#182350] bg-[#FAFAF5] hover:bg-[#EAF4FE] text-[10px] font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Fuel Availability & Price Details Grid */}
              <div className="space-y-1.5 mb-2.5 font-mono">
                <div className="flex justify-between text-[9px] text-[#737985] uppercase font-bold tracking-wider px-1">
                  <span>Fuel Type</span>
                  <span>Available (t)</span>
                  <span>Price / Tonne</span>
                </div>

                {(["LNG", "Methanol", "VLSFO", "Ammonia"] as const).map((fuelKey) => {
                  const isVesselFuel = vessel.fuelType?.toUpperCase() === fuelKey.toUpperCase();
                  const avail = activePopupPort.fuelAvailability[fuelKey];
                  const price = activePopupPort.fuelPrices[fuelKey];

                  return (
                    <div
                      key={fuelKey}
                      className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs transition-all ${
                        isVesselFuel
                          ? "bg-[#EAF4FE] border border-[#AFD2FA] font-bold text-[#182350]"
                          : "bg-[#FAFAF5] border border-[#182350]/60 text-[#4A5260]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">
                          {fuelKey === "LNG" ? "❄️" : fuelKey === "Methanol" ? "🧪" : fuelKey === "VLSFO" ? "🛢️" : "⚡"}
                        </span>
                        <span className="text-[11px] font-semibold">{fuelKey}</span>
                        {isVesselFuel && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-[#182350] text-white font-bold tracking-tight uppercase">
                            Ship Fuel
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] font-mono">{avail.toLocaleString()} t</span>
                      <span className="text-[11px] font-mono font-black text-[#B9915E]">${price}/t</span>
                    </div>
                  );
                })}
              </div>

              {/* Shore Power / Grid Power Available Status */}
              <div className="pt-2 border-t border-[#182350]/20 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-[9px] text-[#737985] uppercase font-bold tracking-wider">
                    Shore Grid Power (OPS)
                  </div>
                  <div className="text-[10.5px] text-[#182350] font-extrabold">
                    ${activePopupPort.shorePower.pricePerKWh.toFixed(3)}/kWh
                  </div>
                </div>

                <span
                  className={`px-2 py-1 rounded-lg text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    activePopupPort.shorePower.available
                      ? "bg-[#EAF7F0] text-[#2E9B68] border border-[#2E9B68]/30"
                      : "bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]/30"
                  }`}
                >
                  <span>{activePopupPort.shorePower.available ? "⚡ Grid OK" : "✕ No Grid"}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── TRANSLUCENT OVERLAY SIDE NAVBAR / DRAWER (CLICK-TO-EXPAND) ── */}
        {activeDrawer && (
          <div className="absolute top-3 right-14 bottom-3 w-[390px] max-w-[calc(100%-80px)] z-40 bg-white/95 backdrop-blur-xl border border-[#AFD2FA]/80 rounded-2xl shadow-2xl p-5 overflow-y-auto animate-in slide-in-from-right duration-200 text-[#182350]">
            {/* Drawer Header with Title and Close Button */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#182350]/20">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#182350] font-sans">
                  {activeDrawer === "routes" && "🧭 ROUTE CORRIDORS"}
                  {activeDrawer === "bunker" && "⛽ BUNKERING & FUEL RANGE"}
                  {activeDrawer === "ports" && "⚓ UPCOMING PORTS"}
                  {activeDrawer === "speed" && "⚙ SPEED GOVERNOR & ECA"}
                  {activeDrawer === "voyage" && "ℹ VOYAGE TELEMETRY"}
                </span>
              </div>
              <button
                onClick={() => setActiveDrawer(null)}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-[#737985] hover:text-[#182350] bg-[#FAFAF5] hover:bg-[#EAF4FE] border border-[#182350]/20 text-xs font-bold cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* TAB CONTENT 1: ROUTES */}
            {activeDrawer === "routes" && (
              <div className="space-y-3">
                <div className="text-[11px] text-[#737985] font-mono">
                  Compare candidate maritime routes &amp; cost profiles:
                </div>
                <div className="space-y-2.5">
                  {candidateRoutes.map((r) => {
                    const isSelected = selectedRouteId === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRouteId(r.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? "bg-[#EAF4FE] border-[#AFD2FA] shadow-xs ring-1 ring-[#AFD2FA]"
                            : "bg-[#FAFAF5] border-[#182350]/20 hover:border-[#AFD2FA]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-xs text-[#182350]">{r.name}</div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${
                              isSelected
                                ? "bg-[#182350] text-white"
                                : "bg-[#F3EBDD] text-[#B9915E] border border-[#E6D7C3]"
                            }`}
                          >
                            {r.badge}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#737985] font-mono">{r.description}</div>
                        <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                          <div className="p-1.5 rounded-lg bg-white border border-[#182350]/20">
                            <div className="text-[8.5px] text-[#737985]">ETA</div>
                            <div className="font-bold text-[#182350]">{r.eta.split("·")[1]?.trim() || "18:00"}</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-[#182350]/20">
                            <div className="text-[8.5px] text-[#737985]">Dist</div>
                            <div className="font-bold text-[#182350]">{r.distanceNM} NM</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-[#182350]/20">
                            <div className="text-[8.5px] text-[#737985]">Fuel</div>
                            <div className="font-bold text-[#182350]">{r.fuelTonnes} t</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-[#182350]/20">
                            <div className="text-[8.5px] text-[#737985]">Cost</div>
                            <div className="font-bold text-[#B9915E]">{r.costFormatted}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: BUNKERING & RANGE */}
            {activeDrawer === "bunker" && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#182350]/20">
                    <div className="text-[10px] text-[#737985] uppercase">Current Fuel</div>
                    <div className="text-sm font-bold text-[#182350]">{currentFuelTonnes.toLocaleString()} t</div>
                    <div className="text-[9px] text-[#737985]">Capacity: {fuelCapacity.toLocaleString()} t</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#EAF4FE] border border-[#AFD2FA]">
                    <div className="text-[10px] text-[#737985] uppercase">Range Horizon</div>
                    <div className="text-sm font-bold text-[#182350]">{estimatedRangeNM.toLocaleString()} NM</div>
                    <div className="text-[9px] text-[#182350]">Burn: {dailyConsumption} t/day</div>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#737985]">Simulate Fuel Level:</span>
                    <span className="font-bold text-[#182350]">{fuelPct}% ({currentFuelTonnes} t)</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={100}
                    step={1}
                    value={fuelPct}
                    onChange={(e) => setFuelPct(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#182350] rounded-lg appearance-none cursor-pointer accent-[#182350]"
                  />
                  <div className="flex justify-between text-[9.5px] text-[#737985] pt-0.5">
                    <button onClick={() => setFuelPct(25)} className="hover:text-[#182350] cursor-pointer">25% (Low)</button>
                    <button onClick={() => setFuelPct(50)} className="hover:text-[#182350] cursor-pointer">50%</button>
                    <button onClick={() => setFuelPct(72)} className="hover:text-[#182350] cursor-pointer">72% (AIS)</button>
                    <button onClick={() => setFuelPct(100)} className="hover:text-[#182350] cursor-pointer">100% (Full)</button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#182350]/20">
                  <div className="text-xs font-bold text-[#182350] uppercase font-mono mb-2">
                    Multi-Criteria Bunker Ranking:
                  </div>
                  <div className="space-y-2">
                    {bunkerComparisonList.map((b) => (
                      <div
                        key={b.port.id}
                        className={`p-2.5 rounded-xl border text-xs font-mono space-y-1 ${
                          b.isRecommended
                            ? "bg-[#EAF4FE] border-[#AFD2FA] shadow-2xs"
                            : "bg-[#FAFAF5] border-[#182350]/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#182350]">{b.port.name}</span>
                          {b.isRecommended && (
                            <span className="text-[9px] font-bold bg-[#182350] text-white px-2 py-0.5 rounded-full">
                              ★ RECOMMENDED
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between text-[10.5px] text-[#737985]">
                          <span>Supply: {b.availableTonnes.toLocaleString()} t</span>
                          <span className="text-[#B9915E] font-bold">${b.pricePerTonne}/t</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: PORTS */}
            {activeDrawer === "ports" && (
              <div className="space-y-2.5">
                <div className="text-[11px] text-[#737985] font-mono">
                  Upcoming waypoints along active transit corridor:
                </div>
                {upcomingPorts.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPort(p)}
                    className="p-3 rounded-xl bg-[#FAFAF5] border border-[#182350]/20 hover:border-[#AFD2FA] transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#182350] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs text-[#182350]">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#182350]">{p.eta}</span>
                    </div>
                    <div className="flex justify-between text-[10.5px] font-mono text-[#737985]">
                      <span>{p.country}</span>
                      <span>{p.shorePower.available ? "⚡ Shore Grid OK" : "No Grid"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT 4: SPEED & ECA */}
            {activeDrawer === "speed" && (
              <div className="space-y-4 font-mono">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#737985]">Vessel Transit Speed:</span>
                    <span className="font-bold text-[#182350]">{vesselSpeed.toFixed(1)} kn</span>
                  </div>
                  <input
                    type="range"
                    min={10.0}
                    max={20.0}
                    step={0.5}
                    value={vesselSpeed}
                    onChange={(e) => setVesselSpeed(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#182350] rounded-lg appearance-none cursor-pointer accent-[#182350]"
                  />
                  <div className="flex justify-between text-[9.5px] text-[#737985]">
                    <span>10.0 kn (Eco)</span>
                    <span>16.0 kn (Standard)</span>
                    <span>20.0 kn (Max)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFAF5] border border-[#182350]/20 space-y-2 text-xs">
                  <div className="font-bold text-[#182350] uppercase">Simulate Port Congestion / Delay:</div>
                  <button
                    onClick={() =>
                      setSimulatedDelayPortId((prev) =>
                        prev ? null : upcomingPorts[0]?.id || null
                      )
                    }
                    className={`w-full py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                      simulatedDelayPortId
                        ? "bg-[#182350] text-white shadow-xs"
                        : "bg-white border border-[#182350]/20 text-[#737985] hover:text-[#182350]"
                    }`}
                  >
                    {simulatedDelayPortId ? "⚡ +12h Delay Active (Congestion)" : "Simulate +12h Port Delay"}
                  </button>
                </div>

                {activeECA && (
                  <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs space-y-1 text-[#92400E]">
                    <div className="font-bold uppercase flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{activeECA.name}</span>
                    </div>
                    <div className="text-[10.5px]">{activeECA.description}</div>
                    <div className="text-[10px] font-bold">Limit: {activeECA.sulphurLimit}</div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 5: VOYAGE TELEMETRY */}
            {activeDrawer === "voyage" && (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20">
                  <span className="text-[#737985]">Vessel</span>
                  <span className="font-bold text-[#182350]">{vessel.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20">
                  <span className="text-[#737985]">IMO Number</span>
                  <span className="font-bold text-[#182350]">{vessel.imo}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20">
                  <span className="text-[#737985]">Active Corridor</span>
                  <span className="font-bold text-[#182350] truncate max-w-[180px]">{activeSelectedRoute?.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20">
                  <span className="text-[#737985]">Transit Speed</span>
                  <span className="font-bold text-[#182350]">{vesselSpeed.toFixed(1)} kn</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#182350]/20">
                  <span className="text-[#737985]">Remaining Distance</span>
                  <span className="font-bold text-[#182350]">{activeSelectedRoute?.distanceNM} NM</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#737985]">Voyage Estimated Cost</span>
                  <span className="font-bold text-[#B9915E]">{activeSelectedRoute?.costFormatted}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
