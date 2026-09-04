export type HealthStatus = "Excellent" | "Good" | "Needs Maintenance" | "Critical";
export type OpStatus = "In Voyage" | "At Berth" | "Under Maintenance" | "Docking/Undocking" | "Idle";
export type FuelType = "LNG" | "Methanol" | "Hydrogen" | "Ammonia" | "Conventional";
export type CII = "A" | "B" | "C" | "D" | "E";

export const FUEL_DENSITIES: Record<FuelType, number> = {
  "LNG": 0.45,
  "Methanol": 0.79,
  "Ammonia": 0.68,
  "Hydrogen": 0.07,
  "Conventional": 0.99
};

export interface FuelTank {
  id: string;
  name: string;
  capacityVolume: number;
  currentVolume: number;
  currentFuel: FuelType;
}

export interface CargoTank {
  id: string;
  name: string;
  fillPercentage: number;
  cargoType: string;
  loadedAmt: string;
  capacityAmt: string;
}

export interface Ship {
  id: string;
  name: string;
  model: string;
  vesselType: string;
  buildYear: number;
  health: HealthStatus;
  status: OpStatus;
  fuelType: FuelType;
  fuelPercentage: number;
  fuelCompatibility: FuelType[];
  capacity: string;
  capacityUnit: "DWT" | "TEU";
  location: string;
  imo: string;
  flag: string;
  engineType: string;
  enginePower: string;
  lastDryDock: string;
  nextMaintenance: string;
  cii: CII;
  shorePower: boolean;
  grossTonnage: string;
  dwt: string;
  cruisingSpeed: string;
  shipyard: string;
  currentRoute: string;
  currentSpeed: string;
  statusHistory: { event: string; time: string }[];
  captain: string;
  
  // Cargo & Layout fields
  cargoTanks: CargoTank[];
  fuelTanks: FuelTank[];
  trim: number;
  baseConsumption: string;
  currentLoadingImpact: string;
  fuelDelta: string;
}

export const MOCK_SHIPS: Ship[] = [
  {
    id: "v1",
    name: "MV Green Horizon",
    model: "LNG Carrier Q-Flex 2022",
    vesselType: "LNG Carrier",
    buildYear: 2021,
    health: "Excellent",
    status: "In Voyage",
    fuelType: "LNG",
    fuelPercentage: 72,
    fuelCompatibility: ["LNG", "Ammonia", "Methanol"],
    capacity: "74,000",
    capacityUnit: "DWT",
    location: "Arabian Sea",
    imo: "IMO 9876543",
    flag: "India",
    engineType: "WinGD X62DF-A Dual-Fuel",
    enginePower: "16,400 kW",
    lastDryDock: "2024-03-01",
    nextMaintenance: "2026-03-01",
    cii: "A",
    shorePower: true,
    grossTonnage: "52,800 GT",
    dwt: "74,000 DWT",
    cruisingSpeed: "16.4 kn",
    shipyard: "Hyundai Heavy Industries",
    currentRoute: "Mundra Port → Rotterdam",
    currentSpeed: "16.4 kn",
    captain: "Capt. Arjun Mehta",
    statusHistory: [
      { event: "Departed Mundra Port", time: "3 days ago" },
      { event: "Passed Gulf of Aden Corridor", time: "18 hours ago" },
    ],
    cargoTanks: [
      { id: "t1", name: "Tank 1 (Fore)", fillPercentage: 76, cargoType: "LNG", loadedAmt: "14,000 t", capacityAmt: "18,500 t" },
      { id: "t2", name: "Tank 2 (Mid-Fore)", fillPercentage: 70, cargoType: "LNG", loadedAmt: "13,000 t", capacityAmt: "18,500 t" },
      { id: "t3", name: "Tank 3 (Mid)", fillPercentage: 68, cargoType: "LNG", loadedAmt: "12,500 t", capacityAmt: "18,500 t" },
      { id: "t4", name: "Tank 4 (Aft)", fillPercentage: 68, cargoType: "LNG", loadedAmt: "12,500 t", capacityAmt: "18,500 t" },
    ],
    fuelTanks: [
      { id: "f1", name: "Cryo LNG Port Tank", capacityVolume: 2400, currentVolume: 1728, currentFuel: "LNG" },
      { id: "f2", name: "Cryo LNG Stbd Tank", capacityVolume: 2400, currentVolume: 1728, currentFuel: "LNG" }
    ],
    trim: -0.2,
    baseConsumption: "68.4 t/d",
    currentLoadingImpact: "68.8 t/d",
    fuelDelta: "+0.6%",
  },
  {
    id: "v2",
    name: "MV Eco Pioneer",
    model: "Bulk Carrier 2021",
    vesselType: "Bulk Carrier",
    buildYear: 2019,
    health: "Good",
    status: "In Voyage",
    fuelType: "Methanol",
    fuelPercentage: 58,
    fuelCompatibility: ["Methanol", "LNG", "Conventional"],
    capacity: "58,000",
    capacityUnit: "DWT",
    location: "Bay of Bengal",
    imo: "IMO 9654321",
    flag: "India",
    engineType: "WinGD X62DF Methanol",
    enginePower: "14,280 kW",
    lastDryDock: "2024-01-08",
    nextMaintenance: "2026-01-08",
    cii: "A",
    shorePower: true,
    grossTonnage: "34,200 GT",
    dwt: "58,000 DWT",
    cruisingSpeed: "13.2 kn",
    shipyard: "Samsung Heavy Industries",
    currentRoute: "Chennai Port → Singapore",
    currentSpeed: "13.2 kn",
    captain: "Capt. Priya Nair",
    statusHistory: [
      { event: "Departed Chennai Port", time: "2 days ago" },
      { event: "Crossed Malacca Outer Approach", time: "6 hours ago" },
    ],
    cargoTanks: [
      { id: "h1", name: "Hold 1", fillPercentage: 89, cargoType: "Iron Ore", loadedAmt: "8,500 t", capacityAmt: "9,600 t" },
      { id: "h2", name: "Hold 2", fillPercentage: 100, cargoType: "Iron Ore", loadedAmt: "9,600 t", capacityAmt: "9,600 t" },
      { id: "h3", name: "Hold 3", fillPercentage: 100, cargoType: "Coal", loadedAmt: "9,600 t", capacityAmt: "9,600 t" },
      { id: "h4", name: "Hold 4", fillPercentage: 100, cargoType: "Coal", loadedAmt: "9,600 t", capacityAmt: "9,600 t" },
      { id: "h5", name: "Hold 5", fillPercentage: 91, cargoType: "Grain", loadedAmt: "8,700 t", capacityAmt: "9,600 t" },
      { id: "h6", name: "Hold 6", fillPercentage: 21, cargoType: "Grain", loadedAmt: "2,000 t", capacityAmt: "9,600 t" },
    ],
    fuelTanks: [
      { id: "f1", name: "Methanol Tank 1 (Aft)", capacityVolume: 1600, currentVolume: 928, currentFuel: "Methanol" },
      { id: "f2", name: "Methanol Tank 2 (Aft)", capacityVolume: 1600, currentVolume: 928, currentFuel: "Methanol" },
    ],
    trim: 0.1,
    baseConsumption: "48.2 t/d",
    currentLoadingImpact: "49.0 t/d",
    fuelDelta: "+1.6%",
  },
  {
    id: "v3",
    name: "MV Quantum Star",
    model: "Chemical Tanker 2022",
    vesselType: "Chemical Tanker",
    buildYear: 2022,
    health: "Excellent",
    status: "At Berth",
    fuelType: "Ammonia",
    fuelPercentage: 85,
    fuelCompatibility: ["Ammonia", "LNG"],
    capacity: "36,000",
    capacityUnit: "DWT",
    location: "Gulf of Oman",
    imo: "IMO 9741852",
    flag: "India",
    engineType: "MAN 51/60DF Dual-Fuel Ammonia",
    enginePower: "12,800 kW",
    lastDryDock: "2023-09-20",
    nextMaintenance: "2025-09-20",
    cii: "A",
    shorePower: true,
    grossTonnage: "24,400 GT",
    dwt: "36,000 DWT",
    cruisingSpeed: "14.8 kn",
    shipyard: "Chantiers de l'Atlantique",
    currentRoute: "JNPT Mumbai → Fujairah",
    currentSpeed: "0.0 kn",
    captain: "Capt. Ravi Shankar",
    statusHistory: [
      { event: "Arrived at Fujairah Anchorage", time: "1 day ago" },
      { event: "Completed bunkering inspection", time: "5 hours ago" },
    ],
    cargoTanks: [
      { id: "tp1", name: "Tank P1", fillPercentage: 87, cargoType: "Chemicals", loadedAmt: "5,200 t", capacityAmt: "6,000 t" },
      { id: "ts1", name: "Tank S1", fillPercentage: 87, cargoType: "Chemicals", loadedAmt: "5,200 t", capacityAmt: "6,000 t" },
      { id: "tp2", name: "Tank P2", fillPercentage: 80, cargoType: "Lubricants", loadedAmt: "4,800 t", capacityAmt: "6,000 t" },
      { id: "ts2", name: "Tank S2", fillPercentage: 80, cargoType: "Lubricants", loadedAmt: "4,800 t", capacityAmt: "6,000 t" },
      { id: "tp3", name: "Tank P3", fillPercentage: 67, cargoType: "Solvents", loadedAmt: "4,000 t", capacityAmt: "6,000 t" },
      { id: "ts3", name: "Tank S3", fillPercentage: 67, cargoType: "Solvents", loadedAmt: "4,000 t", capacityAmt: "6,000 t" },
    ],
    fuelTanks: [
      { id: "f1", name: "Liquid Ammonia Wing P", capacityVolume: 1200, currentVolume: 1020, currentFuel: "Ammonia" },
      { id: "f2", name: "Liquid Ammonia Wing S", capacityVolume: 1200, currentVolume: 1020, currentFuel: "Ammonia" },
    ],
    trim: -0.2,
    baseConsumption: "0.0 t/d",
    currentLoadingImpact: "7.8 t/d (At Berth)",
    fuelDelta: "+0.0%",
  },
  {
    id: "v4",
    name: "MV Neptune Pride",
    model: "Container Ship 2020",
    vesselType: "Container Ship",
    buildYear: 2020,
    health: "Good",
    status: "In Voyage",
    fuelType: "LNG",
    fuelPercentage: 44,
    fuelCompatibility: ["LNG", "Conventional"],
    capacity: "98,000",
    capacityUnit: "DWT",
    location: "Indian Ocean",
    imo: "IMO 9825963",
    flag: "India",
    engineType: "MAN B&W 7G80ME-C9.2 Dual-Fuel",
    enginePower: "34,650 kW",
    lastDryDock: "2023-06-14",
    nextMaintenance: "2025-12-01",
    cii: "B",
    shorePower: true,
    grossTonnage: "68,000 GT",
    dwt: "98,000 DWT",
    cruisingSpeed: "18.1 kn",
    shipyard: "Daewoo Shipbuilding & Marine Engineering",
    currentRoute: "Colombo → Jeddah Port",
    currentSpeed: "18.1 kn",
    captain: "Capt. Deepa Krishnan",
    statusHistory: [
      { event: "Departed Colombo Port", time: "4 days ago" },
      { event: "Entered Arabian Sea Deep Fairway", time: "1 day ago" },
    ],
    cargoTanks: [
      { id: "b01", name: "Bay 01", fillPercentage: 89, cargoType: "Containers", loadedAmt: "14,200 t", capacityAmt: "16,000 t" },
      { id: "b05", name: "Bay 05", fillPercentage: 94, cargoType: "Containers", loadedAmt: "15,000 t", capacityAmt: "16,000 t" },
      { id: "b09", name: "Bay 09", fillPercentage: 86, cargoType: "Containers", loadedAmt: "13,800 t", capacityAmt: "16,000 t" },
      { id: "b13", name: "Bay 13", fillPercentage: 94, cargoType: "Containers", loadedAmt: "15,000 t", capacityAmt: "16,000 t" },
      { id: "b17", name: "Bay 17", fillPercentage: 50, cargoType: "Reefer", loadedAmt: "8,000 t", capacityAmt: "16,000 t" },
      { id: "b21", name: "Bay 21", fillPercentage: 28, cargoType: "Reefer", loadedAmt: "5,000 t", capacityAmt: "18,000 t" },
    ],
    fuelTanks: [
      { id: "f1", name: "Deep Bunker Tank 1", capacityVolume: 3100, currentVolume: 1364, currentFuel: "LNG" },
      { id: "f2", name: "Deep Bunker Tank 2", capacityVolume: 3100, currentVolume: 1364, currentFuel: "LNG" }
    ],
    trim: 0.3,
    baseConsumption: "112.4 t/d",
    currentLoadingImpact: "115.0 t/d",
    fuelDelta: "+2.3%",
  },
  {
    id: "v5",
    name: "MV Aurora Breeze",
    model: "Ro-Ro / Multipurpose 2023",
    vesselType: "Ro-Ro / Multipurpose",
    buildYear: 2023,
    health: "Excellent",
    status: "At Berth",
    fuelType: "Hydrogen",
    fuelPercentage: 80,
    fuelCompatibility: ["Hydrogen", "LNG", "Methanol"],
    capacity: "45,000",
    capacityUnit: "DWT",
    location: "Port of Rotterdam",
    imo: "IMO 9912345",
    flag: "India",
    engineType: "Fuel-Cell Hybrid Hydrogen",
    enginePower: "18,200 kW",
    lastDryDock: "2024-02-10",
    nextMaintenance: "2026-02-10",
    cii: "A",
    shorePower: true,
    grossTonnage: "42,000 GT",
    dwt: "45,000 DWT",
    cruisingSpeed: "15.0 kn",
    shipyard: "Cochin Shipyard Limited",
    currentRoute: "Mundra Port → Rotterdam",
    currentSpeed: "0.0 kn",
    captain: "Capt. Vikram Singh",
    statusHistory: [
      { event: "Docked at Rotterdam Green Terminal", time: "1 day ago" },
    ],
    cargoTanks: [
      { id: "h1", name: "Deck 1 (Lower Truck)", fillPercentage: 80, cargoType: "Vehicles", loadedAmt: "8,000 t", capacityAmt: "10,000 t" },
      { id: "h2", name: "Deck 2 (Main Cargo)", fillPercentage: 88, cargoType: "Heavy Equipment", loadedAmt: "10,500 t", capacityAmt: "12,000 t" },
      { id: "h3", name: "Deck 3 (Project Hold)", fillPercentage: 79, cargoType: "Wind Turbine Parts", loadedAmt: "9,500 t", capacityAmt: "12,000 t" },
      { id: "h4", name: "Deck 4 (Upper Deck)", fillPercentage: 55, cargoType: "Rolling Stock", loadedAmt: "6,000 t", capacityAmt: "11,000 t" },
    ],
    fuelTanks: [
      { id: "f1", name: "LH2 Cryo Tank 1", capacityVolume: 1400, currentVolume: 1120, currentFuel: "Hydrogen" },
      { id: "f2", name: "LH2 Cryo Tank 2", capacityVolume: 1400, currentVolume: 1120, currentFuel: "Hydrogen" }
    ],
    trim: 0.1,
    baseConsumption: "38.0 t/d",
    currentLoadingImpact: "38.5 t/d",
    fuelDelta: "+1.3%",
  }
];

export const VESSEL_MODELS = [
  "LNG Carrier Q-Flex 2022",
  "Bulk Carrier 2021",
  "Chemical Tanker 2022",
  "Container Ship 2020",
  "Panamax Bulk Carrier 2019",
  "Suezmax Tanker 2021",
  "Neo-Panamax Container 2018",
  "Ammonia-Ready Bulk 2024",
  "Aframax Tanker 2023",
];

export const MODEL_DATA: Record<string, Partial<Ship>> = {
  "LNG Carrier Q-Flex 2022": {
    vesselType: "LNG Carrier",
    buildYear: 2024,
    grossTonnage: "52,800 GT",
    dwt: "74,000 DWT",
    engineType: "WinGD X62DF-A Dual-Fuel",
    enginePower: "16,400 kW",
    fuelCompatibility: ["LNG", "Ammonia", "Methanol"],
    cruisingSpeed: "16.4 kn",
    capacity: "74,000",
    capacityUnit: "DWT",
    shipyard: "Hyundai Heavy Industries",
    fuelType: "LNG",
  },
  "Bulk Carrier 2021": {
    vesselType: "Bulk Carrier",
    buildYear: 2021,
    grossTonnage: "34,200 GT",
    dwt: "58,000 DWT",
    engineType: "WinGD X62DF Methanol",
    enginePower: "14,280 kW",
    fuelCompatibility: ["Methanol", "LNG", "Conventional"],
    cruisingSpeed: "13.2 kn",
    capacity: "58,000",
    capacityUnit: "DWT",
    shipyard: "Samsung Heavy Industries",
    fuelType: "Methanol",
  },
  "Chemical Tanker 2022": {
    vesselType: "Chemical Tanker",
    buildYear: 2022,
    grossTonnage: "24,400 GT",
    dwt: "36,000 DWT",
    engineType: "MAN 51/60DF Dual-Fuel Ammonia",
    enginePower: "12,800 kW",
    fuelCompatibility: ["Ammonia", "LNG"],
    cruisingSpeed: "14.8 kn",
    capacity: "36,000",
    capacityUnit: "DWT",
    shipyard: "Chantiers de l'Atlantique",
    fuelType: "Ammonia",
  },
  "Container Ship 2020": {
    vesselType: "Container Ship",
    buildYear: 2020,
    grossTonnage: "68,000 GT",
    dwt: "98,000 DWT",
    engineType: "MAN B&W 7G80ME-C9.2 Dual-Fuel",
    enginePower: "34,650 kW",
    fuelCompatibility: ["LNG", "Conventional"],
    cruisingSpeed: "18.1 kn",
    capacity: "98,000",
    capacityUnit: "DWT",
    shipyard: "Daewoo Shipbuilding & Marine Engineering",
    fuelType: "LNG",
  },
  "Panamax Bulk Carrier 2019": {
    vesselType: "Bulk Carrier",
    buildYear: 2019,
    grossTonnage: "42,850 GT",
    dwt: "75,000 DWT",
    engineType: "MAN B&W 6G60ME-C9.5",
    enginePower: "11,640 kW",
    fuelCompatibility: ["LNG", "Conventional"],
    cruisingSpeed: "14.2 kn",
    capacity: "75,000",
    capacityUnit: "DWT",
    shipyard: "Hyundai Heavy Industries",
    fuelType: "Conventional",
  }
};
