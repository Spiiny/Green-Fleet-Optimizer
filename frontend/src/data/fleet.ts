export interface Hold {
 id: string;
 name: string;
 capacity: number; // tonnes
 currentCargo: number;
 cargoType: string;
 position:"fore" |"mid-fore" |"mid" |"mid-aft" |"aft";
}

export interface Vessel {
 id: string;
 name: string;
 type: string;
 flag: string;
 capacity: number;
 currentLoad: number;
 speed: number; // knots
 fuelType: string;
 fuelLevel: number; // %
 fuelCapacity: number; // tonnes
 status:"Underway" |"At Anchor" |"In Port" |"Standby";
 currentLocation: string;
 origin: string;
 destination: string;
 captain: string;
 captainId: string;
 voyageId: string;
 voyageProgress: number; // %
 emissions: number; // tCO2/day
 fuelConsumption: {
 anchorage: number;
 dock: number;
 tugboat: number;
 voyage: number;
 total: number;
 };
 holds: Hold[];
 color: string;
 mapRoute: { lat: number; lng: number }[];
 currentPos: { lat: number; lng: number };
 imo: string;
 yearBuilt: number;
 length: number;
 beam: number;
 nextMaintenanceDate: string;
 departureDate?: string;
 estimatedArrival?: string;
 assignedOrderId?: string;
 operationalState?: "At Sea / Underway" | "In Port / Loading-Unloading" | "At Berth / Resting" | "Under Maintenance" | "Awaiting Assignment / Idle";
}

export interface Captain {
 id: string;
 name: string;
 rank: string;
 experience: number;
 certifications: string[];
 assignedVessel: string;
 voyagesCompleted: number;
 specialization: string;
 avatar: string;
}

export interface Port {
 id: string;
 name: string;
 country: string;
 lat: number;
 lng: number;
 fuels: { type: string; available: number; unit: string }[];
 bunkering: boolean;
 eca: boolean;
}

export const captains: Captain[] = [
 {
 id:"c1",
 name:"Capt. Arjun Mehta",
 rank:"Master Mariner",
 experience: 22,
 certifications: ["STCW","IGF Code","LNG Tanker"],
 assignedVessel:"v1",
 voyagesCompleted: 184,
 specialization:"LNG Tankers",
 avatar:"AM",
 },
 {
 id:"c2",
 name:"Capt. Priya Nair",
 rank:"Master Mariner",
 experience: 16,
 certifications: ["STCW","Methanol Carrier","ECA Certified"],
 assignedVessel:"v2",
 voyagesCompleted: 112,
 specialization:"Bulk Carriers",
 avatar:"PN",
 },
 {
 id:"c3",
 name:"Capt. Ravi Shankar",
 rank:"Senior Captain",
 experience: 19,
 certifications: ["STCW","IGF Code","Ammonia Tanker"],
 assignedVessel:"v3",
 voyagesCompleted: 143,
 specialization:"Chemical Tankers",
 avatar:"RS",
 },
 {
 id:"c4",
 name:"Capt. Deepa Krishnan",
 rank:"Master Mariner",
 experience: 14,
 certifications: ["STCW","Container Operations","ECA Certified"],
 assignedVessel:"v4",
 voyagesCompleted: 97,
 specialization:"Container Ships",
 avatar:"DK",
 },
 {
 id:"c5",
 name:"Capt. Vikram Singh",
 rank:"Senior Captain",
 experience: 11,
 certifications: ["STCW","Green Shipping","LNG Dual Fuel"],
 assignedVessel:"",
 voyagesCompleted: 68,
 specialization:"General Cargo",
 avatar:"VS",
 },
];

export const vessels: Vessel[] = [
 {
    id: "v1",
    name: "MV Green Horizon",
    type: "LNG Carrier",
    flag: "India",
    imo: "IMO 9876543",
    yearBuilt: 2021,
    length: 294,
    beam: 46,
    capacity: 74000,
    currentLoad: 52000,
    speed: 16.4,
    fuelType: "LNG",
    fuelLevel: 72,
    fuelCapacity: 4800,
    status: "Underway",
    currentLocation: "Arabian Sea",
    origin: "Mundra Port, India",
    destination: "Port of Rotterdam, Netherlands",
    captain: "Capt. Arjun Mehta",
    captainId: "c1",
    voyageId: "VGH-2026-088",
    voyageProgress: 38,
    emissions: 42.3,
    fuelConsumption: {
      anchorage: 4.2,
      dock: 2.8,
      tugboat: 1.1,
      voyage: 68.4,
      total: 76.5,
    },
    holds: [
      { id: "h1", name: "Tank 1", capacity: 18500, currentCargo: 14000, cargoType: "LNG", position: "fore" },
      { id: "h2", name: "Tank 2", capacity: 18500, currentCargo: 13000, cargoType: "LNG", position: "mid-fore" },
      { id: "h3", name: "Tank 3", capacity: 18500, currentCargo: 12500, cargoType: "LNG", position: "mid" },
      { id: "h4", name: "Tank 4", capacity: 18500, currentCargo: 12500, cargoType: "LNG", position: "aft" },
    ],
    color: "#18A6A6",
    nextMaintenanceDate: "2026-11-15",
    departureDate: "2026-09-04",
    estimatedArrival: "2026-09-24",
    operationalState: "At Sea / Underway",
    mapRoute: [
      { lat: 22.8, lng: 69.7 },   // Mundra Port (Origin)
      { lat: 18.0, lng: 60.0 },   // Arabian Sea (Current Pos)
      { lat: 14.5, lng: 53.5 },   // Gulf of Aden East
      { lat: 12.8, lng: 46.5 },   // Gulf of Aden TSS
      { lat: 12.3, lng: 44.0 },   // Gulf of Aden West
      { lat: 12.6, lng: 43.35 },  // Bab-el-Mandeb Strait
      { lat: 14.5, lng: 42.2 },   // Red Sea South
      { lat: 17.5, lng: 40.5 },   // Red Sea Farasan pass
      { lat: 21.4858, lng: 39.1925 }, // Jeddah Port
      { lat: 24.0, lng: 36.8 },   // Red Sea Central channel
      { lat: 26.5, lng: 35.0 },   // Red Sea North channel
      { lat: 27.85, lng: 33.6 },  // Suez Canal Entry
      { lat: 28.5, lng: 33.0 },   // Gulf of Suez mid-channel
      { lat: 29.9, lng: 32.55 },  // Suez Canal Transit
      { lat: 31.3, lng: 32.3 },   // Port Said (Med Entry)
      { lat: 32.5, lng: 31.0 },   // Offshore Nile Delta
      { lat: 34.0, lng: 27.0 },   // South of Rhodes
      { lat: 34.3, lng: 24.5 },   // South of Crete
      { lat: 35.5, lng: 18.0 },   // Ionian Sea
      { lat: 36.2, lng: 15.0 },   // Malta Channel
      { lat: 37.4, lng: 11.5 },   // Strait of Sicily
      { lat: 37.8, lng: 8.5 },    // Sardinia Channel
      { lat: 37.5, lng: 4.0 },    // Algerian Basin
      { lat: 36.3, lng: -0.5 },   // Alboran Sea East
      { lat: 36.0, lng: -3.0 },   // Alboran Sea Central
      { lat: 35.95, lng: -5.6 },  // Strait of Gibraltar
      { lat: 36.2, lng: -7.0 },   // Gulf of Cadiz
      { lat: 36.8, lng: -9.2 },   // Cape St. Vincent
      { lat: 39.5, lng: -9.8 },   // Offshore Portugal
      { lat: 43.8, lng: -9.5 },   // Cape Finisterre
      { lat: 45.5, lng: -6.5 },   // Bay of Biscay outer
      { lat: 48.5, lng: -5.5 },   // English Channel Entrance (Ushant)
      { lat: 49.8, lng: -3.0 },   // English Channel West
      { lat: 50.5, lng: 0.0 },    // English Channel Central
      { lat: 51.2, lng: 1.7 },    // Strait of Dover
      { lat: 51.5, lng: 2.5 },    // Southern North Sea
      { lat: 51.8, lng: 3.3 },    // Eurogeul approach
      { lat: 51.95, lng: 4.14 },  // Port of Rotterdam (Destination)
    ],
    currentPos: { lat: 18.0, lng: 60.0 },
  },
  {
    id: "v2",
    name: "MV Eco Pioneer",
    type: "Bulk Carrier",
    flag: "India",
    imo: "IMO 9654321",
    yearBuilt: 2019,
    length: 225,
    beam: 38,
    capacity: 58000,
    currentLoad: 48000,
    speed: 13.2,
    fuelType: "Methanol",
    fuelLevel: 58,
    fuelCapacity: 3200,
    status: "Underway",
    nextMaintenanceDate: "2026-10-10",
    departureDate: "2026-09-06",
    estimatedArrival: "2026-09-22",
    operationalState: "At Sea / Underway",
    currentLocation: "Bay of Bengal",
    origin: "Chennai Port, India",
    destination: "Port of Singapore",
    captain: "Capt. Priya Nair",
    captainId: "c2",
    voyageId: "VEP-2026-044",
    voyageProgress: 62,
    emissions: 28.7,
    fuelConsumption: {
      anchorage: 3.1,
      dock: 1.9,
      tugboat: 0.8,
      voyage: 48.2,
      total: 54.0,
    },
    holds: [
      { id: "h1", name: "Hold 1", capacity: 9600, currentCargo: 8500, cargoType: "Iron Ore", position: "fore" },
      { id: "h2", name: "Hold 2", capacity: 9600, currentCargo: 9600, cargoType: "Iron Ore", position: "mid-fore" },
      { id: "h3", name: "Hold 3", capacity: 9600, currentCargo: 9600, cargoType: "Coal", position: "mid" },
      { id: "h4", name: "Hold 4", capacity: 9600, currentCargo: 9600, cargoType: "Coal", position: "mid-aft" },
      { id: "h5", name: "Hold 5", capacity: 9600, currentCargo: 8700, cargoType: "Grain", position: "aft" },
      { id: "h6", name: "Hold 6", capacity: 9600, currentCargo: 2000, cargoType: "Grain", position: "aft" },
    ],
    color: "#1D3554",
    mapRoute: [
      { lat: 13.0827, lng: 80.2707 },
      { lat: 10.0, lng: 81.5 },
      { lat: 5.8, lng: 80.5 },
      { lat: 5.5, lng: 95.0 },
      { lat: 5.0, lng: 100.0 },
      { lat: 4.2, lng: 100.6 },
      { lat: 3.5, lng: 101.0 },
      { lat: 3.0, lng: 101.38 },
      { lat: 2.5, lng: 101.7 },
      { lat: 2.1, lng: 102.1 },
      { lat: 1.7, lng: 102.7 },
      { lat: 1.4, lng: 103.3 },
      { lat: 1.36, lng: 103.55 },
      { lat: 1.22, lng: 103.68 },
      { lat: 1.25, lng: 103.82 },
    ],
    currentPos: { lat: 5.0, lng: 100.0 },
  },
  {
    id: "v3",
    name: "MV Quantum Star",
    type: "Chemical Tanker",
    flag: "India",
    imo: "IMO 9741852",
    yearBuilt: 2022,
    length: 185,
    beam: 32,
    capacity: 36000,
    currentLoad: 28000,
    speed: 14.8,
    fuelType: "Ammonia",
    fuelLevel: 85,
    fuelCapacity: 2400,
    status: "At Anchor",
    nextMaintenanceDate: "2026-09-28",
    departureDate: "2026-09-05",
    estimatedArrival: "2026-09-14",
    operationalState: "At Berth / Resting",
    currentLocation: "Gulf of Oman",
    origin: "Jawaharlal Nehru Port, India",
    destination: "Port of Fujairah, UAE",
    captain: "Capt. Ravi Shankar",
    captainId: "c3",
    voyageId: "VQS-2026-021",
    voyageProgress: 15,
    emissions: 12.1,
    fuelConsumption: {
      anchorage: 5.8,
      dock: 1.4,
      tugboat: 0.6,
      voyage: 0,
      total: 7.8,
    },
    holds: [
      { id: "h1", name: "Tank P1", capacity: 6000, currentCargo: 5200, cargoType: "Chemicals", position: "fore" },
      { id: "h2", name: "Tank S1", capacity: 6000, currentCargo: 5200, cargoType: "Chemicals", position: "fore" },
      { id: "h3", name: "Tank P2", capacity: 6000, currentCargo: 4800, cargoType: "Lubricants", position: "mid" },
      { id: "h4", name: "Tank S2", capacity: 6000, currentCargo: 4800, cargoType: "Lubricants", position: "mid" },
      { id: "h5", name: "Tank P3", capacity: 6000, currentCargo: 4000, cargoType: "Solvents", position: "aft" },
      { id: "h6", name: "Tank S3", capacity: 6000, currentCargo: 4000, cargoType: "Solvents", position: "aft" },
    ],
    color: "#D99A2B",
    mapRoute: [
      { lat: 18.9, lng: 72.8 },
      { lat: 20.0, lng: 67.0 },
      { lat: 22.5, lng: 60.5 },
      { lat: 23.2, lng: 59.5 },
      { lat: 23.8, lng: 58.7 },
      { lat: 24.3, lng: 57.5 },
      { lat: 24.5, lng: 56.63 },
      { lat: 24.9, lng: 56.55 },
      { lat: 25.12, lng: 56.36 },
    ],
    currentPos: { lat: 22.5, lng: 60.5 },
  },
  {
    id: "v4",
    name: "MV Neptune Pride",
    type: "Container Ship",
    flag: "India",
    imo: "IMO 9825963",
    yearBuilt: 2020,
    length: 336,
    beam: 51,
    capacity: 98000,
    currentLoad: 71000,
    speed: 18.1,
    fuelType: "LNG",
    fuelLevel: 44,
    fuelCapacity: 6200,
    status: "Underway",
    nextMaintenanceDate: "2026-12-01",
    departureDate: "2026-09-03",
    estimatedArrival: "2026-09-28",
    operationalState: "At Sea / Underway",
    currentLocation: "Indian Ocean",
    origin: "Colombo, Sri Lanka",
    destination: "Port of Jeddah, Saudi Arabia",
    captain: "Capt. Deepa Krishnan",
    captainId: "c4",
    voyageId: "VNP-2026-067",
    voyageProgress: 51,
    emissions: 68.5,
    fuelConsumption: {
      anchorage: 6.1,
      dock: 3.4,
      tugboat: 1.8,
      voyage: 112.4,
      total: 123.7,
    },
    holds: [
      { id: "h1", name: "Bay 01", capacity: 16000, currentCargo: 14200, cargoType: "Containers", position: "fore" },
      { id: "h2", name: "Bay 05", capacity: 16000, currentCargo: 15000, cargoType: "Containers", position: "mid-fore" },
      { id: "h3", name: "Bay 09", capacity: 16000, currentCargo: 13800, cargoType: "Containers", position: "mid" },
      { id: "h4", name: "Bay 13", capacity: 16000, currentCargo: 15000, cargoType: "Containers", position: "mid-aft" },
      { id: "h5", name: "Bay 17", capacity: 16000, currentCargo: 8000, cargoType: "Reefer", position: "aft" },
      { id: "h6", name: "Bay 21", capacity: 18000, currentCargo: 5000, cargoType: "Reefer", position: "aft" },
    ],
    color: "#a855f7",
    mapRoute: [
      { lat: 6.9, lng: 79.8 },
      { lat: 5.5, lng: 76.0 },
      { lat: 6.0, lng: 70.0 },
      { lat: 8.0, lng: 65.0 },
      { lat: 13.0, lng: 58.0 },
      { lat: 16.94, lng: 54.0 },
      { lat: 14.5, lng: 51.0 },
      { lat: 12.5, lng: 45.0 },
      { lat: 12.6, lng: 43.3 },
      { lat: 17.5, lng: 40.5 },
      { lat: 21.4858, lng: 39.1925 },
    ],
    currentPos: { lat: 8.0, lng: 65.0 },
  },
  {
    id: "v5",
    name: "MV Aurora Breeze",
    type: "Ro-Ro / Multipurpose",
    flag: "India",
    imo: "IMO 9912345",
    yearBuilt: 2023,
    length: 200,
    beam: 36,
    capacity: 45000,
    currentLoad: 34000,
    speed: 15.0,
    fuelType: "Hydrogen",
    fuelLevel: 80,
    fuelCapacity: 2800,
    status: "In Port",
    nextMaintenanceDate: "2026-10-25",
    departureDate: "2026-08-28",
    estimatedArrival: "2026-09-08",
    operationalState: "In Port / Loading-Unloading",
    currentLocation: "Port of Rotterdam",
    origin: "Mundra Port, India",
    destination: "Port of Rotterdam, Netherlands",
    captain: "Capt. Vikram Singh",
    captainId: "c5",
    voyageId: "VAB-2026-012",
    voyageProgress: 100,
    emissions: 8.4,
    fuelConsumption: {
      anchorage: 2.4,
      dock: 1.2,
      tugboat: 0.5,
      voyage: 38.0,
      total: 42.1,
    },
    holds: [
      { id: "h1", name: "Deck 1 (Lower Truck)", capacity: 10000, currentCargo: 8000, cargoType: "Vehicles", position: "fore" },
      { id: "h2", name: "Deck 2 (Main Cargo)", capacity: 12000, currentCargo: 10500, cargoType: "Heavy Equipment", position: "mid-fore" },
      { id: "h3", name: "Deck 3 (Project Hold)", capacity: 12000, currentCargo: 9500, cargoType: "Wind Turbine Parts", position: "mid" },
      { id: "h4", name: "Deck 4 (Upper Deck)", capacity: 11000, currentCargo: 6000, cargoType: "Rolling Stock", position: "aft" },
    ],
    color: "#2E9B68",
    mapRoute: [
      { lat: 22.8, lng: 69.7 },
      { lat: 18.0, lng: 60.0 },
      { lat: 12.6, lng: 43.35 },
      { lat: 27.85, lng: 33.6 },
      { lat: 35.95, lng: -5.6 },
      { lat: 51.95, lng: 4.14 },
    ],
    currentPos: { lat: 51.95, lng: 4.14 },
  },
  {
    id: "v6",
    name: "MV Solar Mariner",
    type: "Container Ship",
    flag: "India",
    imo: "IMO 9851024",
    yearBuilt: 2022,
    length: 310,
    beam: 48,
    capacity: 88000,
    currentLoad: 62000,
    speed: 17.5,
    fuelType: "LNG",
    fuelLevel: 68,
    fuelCapacity: 5400,
    status: "In Port",
    nextMaintenanceDate: "2027-01-15",
    departureDate: "2026-09-11",
    estimatedArrival: "2026-09-29",
    operationalState: "In Port / Loading-Unloading",
    currentLocation: "JNPT Mumbai",
    origin: "JNPT Mumbai, India",
    destination: "Port of Hamburg, Germany",
    captain: "Capt. Rajesh Kulkarni",
    captainId: "c6",
    voyageId: "VSM-2026-031",
    voyageProgress: 10,
    emissions: 54.2,
    fuelConsumption: { anchorage: 4.5, dock: 2.5, tugboat: 1.2, voyage: 82.0, total: 90.2 },
    holds: [
      { id: "h1", name: "Bay 01", capacity: 15000, currentCargo: 12000, cargoType: "Containers", position: "fore" },
      { id: "h2", name: "Bay 05", capacity: 15000, currentCargo: 13500, cargoType: "Containers", position: "mid-fore" },
      { id: "h3", name: "Bay 09", capacity: 15000, currentCargo: 14000, cargoType: "Containers", position: "mid" },
      { id: "h4", name: "Bay 13", capacity: 15000, currentCargo: 12500, cargoType: "Containers", position: "mid-aft" },
      { id: "h5", name: "Bay 17", capacity: 14000, currentCargo: 10000, cargoType: "Reefer", position: "aft" },
    ],
    color: "#2563EB",
    mapRoute: [{ lat: 18.95, lng: 72.95 }, { lat: 17.0, lng: 65.0 }, { lat: 12.6, lng: 43.35 }, { lat: 27.8, lng: 33.6 }, { lat: 53.55, lng: 9.99 }],
    currentPos: { lat: 18.95, lng: 72.95 },
  },
  {
    id: "v7",
    name: "MV Bio Trident",
    type: "Bulk Carrier",
    flag: "India",
    imo: "IMO 9762198",
    yearBuilt: 2020,
    length: 228,
    beam: 39,
    capacity: 64000,
    currentLoad: 0,
    speed: 13.0,
    fuelType: "Methanol",
    fuelLevel: 42,
    fuelCapacity: 3400,
    status: "Standby",
    nextMaintenanceDate: "2026-09-18",
    departureDate: "2026-09-01",
    estimatedArrival: "2026-09-20",
    operationalState: "Under Maintenance",
    currentLocation: "Cochin Shipyard",
    origin: "Cochin, India",
    destination: "Cochin Drydock 2",
    captain: "Capt. Manoj Varma",
    captainId: "c7",
    voyageId: "VBT-2026-009",
    voyageProgress: 0,
    emissions: 4.2,
    fuelConsumption: { anchorage: 2.0, dock: 1.5, tugboat: 0.2, voyage: 0, total: 3.7 },
    holds: [
      { id: "h1", name: "Hold 1", capacity: 12800, currentCargo: 0, cargoType: "Dry Bulk", position: "fore" },
      { id: "h2", name: "Hold 2", capacity: 12800, currentCargo: 0, cargoType: "Dry Bulk", position: "mid-fore" },
      { id: "h3", name: "Hold 3", capacity: 12800, currentCargo: 0, cargoType: "Dry Bulk", position: "mid" },
      { id: "h4", name: "Hold 4", capacity: 12800, currentCargo: 0, cargoType: "Dry Bulk", position: "mid-aft" },
      { id: "h5", name: "Hold 5", capacity: 12800, currentCargo: 0, cargoType: "Dry Bulk", position: "aft" },
    ],
    color: "#E11D48",
    mapRoute: [{ lat: 9.96, lng: 76.27 }, { lat: 9.97, lng: 76.28 }],
    currentPos: { lat: 9.96, lng: 76.27 },
  },
  {
    id: "v8",
    name: "MV Terra Nova",
    type: "Chemical Tanker",
    flag: "India",
    imo: "IMO 9798411",
    yearBuilt: 2021,
    length: 178,
    beam: 31,
    capacity: 34000,
    currentLoad: 29500,
    speed: 14.2,
    fuelType: "Ammonia",
    fuelLevel: 78,
    fuelCapacity: 2200,
    status: "Underway",
    nextMaintenanceDate: "2026-11-05",
    departureDate: "2026-09-07",
    estimatedArrival: "2026-09-15",
    operationalState: "At Sea / Underway",
    currentLocation: "Gulf of Oman",
    origin: "Port of Sohar, Oman",
    destination: "Mundra Port, India",
    captain: "Capt. Sunita Pillai",
    captainId: "c8",
    voyageId: "VTN-2026-015",
    voyageProgress: 45,
    emissions: 9.8,
    fuelConsumption: { anchorage: 2.8, dock: 1.1, tugboat: 0.4, voyage: 31.0, total: 35.3 },
    holds: [
      { id: "h1", name: "Cargo P1", capacity: 5600, currentCargo: 5000, cargoType: "Chemicals", position: "fore" },
      { id: "h2", name: "Cargo S1", capacity: 5600, currentCargo: 5000, cargoType: "Chemicals", position: "fore" },
      { id: "h3", name: "Cargo P2", capacity: 5600, currentCargo: 4800, cargoType: "Chemicals", position: "mid" },
      { id: "h4", name: "Cargo S2", capacity: 5600, currentCargo: 4900, cargoType: "Chemicals", position: "mid" },
      { id: "h5", name: "Cargo P3", capacity: 5800, currentCargo: 4900, cargoType: "Solvents", position: "aft" },
      { id: "h6", name: "Cargo S3", capacity: 5800, currentCargo: 4900, cargoType: "Solvents", position: "aft" },
    ],
    color: "#D97706",
    mapRoute: [{ lat: 24.5, lng: 56.63 }, { lat: 23.5, lng: 59.0 }, { lat: 22.8, lng: 69.7 }],
    currentPos: { lat: 23.5, lng: 59.0 },
  },
  {
    id: "v9",
    name: "MV Hydro Zenith",
    type: "LNG Carrier",
    flag: "India",
    imo: "IMO 9924510",
    yearBuilt: 2024,
    length: 299,
    beam: 47,
    capacity: 78000,
    currentLoad: 0,
    speed: 16.8,
    fuelType: "Hydrogen",
    fuelLevel: 92,
    fuelCapacity: 4900,
    status: "Standby",
    nextMaintenanceDate: "2027-02-20",
    departureDate: "2026-09-15",
    estimatedArrival: "2026-09-25",
    operationalState: "Awaiting Assignment / Idle",
    currentLocation: "Ras Laffan Anchorage",
    origin: "Ras Laffan, Qatar",
    destination: "Pending Dispatch",
    captain: "Capt. Anand Sengupta",
    captainId: "c9",
    voyageId: "VHZ-2026-004",
    voyageProgress: 0,
    emissions: 5.1,
    fuelConsumption: { anchorage: 3.2, dock: 1.0, tugboat: 0.3, voyage: 0, total: 4.5 },
    holds: [
      { id: "h1", name: "Cryo Tank 1", capacity: 19500, currentCargo: 0, cargoType: "LNG", position: "fore" },
      { id: "h2", name: "Cryo Tank 2", capacity: 19500, currentCargo: 0, cargoType: "LNG", position: "mid-fore" },
      { id: "h3", name: "Cryo Tank 3", capacity: 19500, currentCargo: 0, cargoType: "LNG", position: "mid" },
      { id: "h4", name: "Cryo Tank 4", capacity: 19500, currentCargo: 0, cargoType: "LNG", position: "aft" },
    ],
    color: "#059669",
    mapRoute: [{ lat: 25.9, lng: 51.55 }],
    currentPos: { lat: 25.9, lng: 51.55 },
  },
  {
    id: "v10",
    name: "MV Pacific Voyager",
    type: "Container Ship",
    flag: "India",
    imo: "IMO 9845012",
    yearBuilt: 2021,
    length: 340,
    beam: 52,
    capacity: 102000,
    currentLoad: 78000,
    speed: 18.4,
    fuelType: "LNG",
    fuelLevel: 61,
    fuelCapacity: 6400,
    status: "Underway",
    nextMaintenanceDate: "2026-12-14",
    departureDate: "2026-09-05",
    estimatedArrival: "2026-09-19",
    operationalState: "At Sea / Underway",
    currentLocation: "Malacca Strait",
    origin: "Port of Singapore",
    destination: "JNPT Mumbai, India",
    captain: "Capt. Fatima Sayed",
    captainId: "c10",
    voyageId: "VPV-2026-078",
    voyageProgress: 40,
    emissions: 64.0,
    fuelConsumption: { anchorage: 5.2, dock: 2.8, tugboat: 1.5, voyage: 98.0, total: 107.5 },
    holds: [
      { id: "h1", name: "Bay 01", capacity: 17000, currentCargo: 14000, cargoType: "Containers", position: "fore" },
      { id: "h2", name: "Bay 05", capacity: 17000, currentCargo: 15500, cargoType: "Containers", position: "mid-fore" },
      { id: "h3", name: "Bay 09", capacity: 17000, currentCargo: 14500, cargoType: "Containers", position: "mid" },
      { id: "h4", name: "Bay 13", capacity: 17000, currentCargo: 15000, cargoType: "Containers", position: "mid-aft" },
      { id: "h5", name: "Bay 17", capacity: 17000, currentCargo: 11000, cargoType: "Reefer", position: "aft" },
      { id: "h6", name: "Bay 21", capacity: 17000, currentCargo: 8000, cargoType: "Reefer", position: "aft" },
    ],
    color: "#7C3AED",
    mapRoute: [{ lat: 1.25, lng: 103.82 }, { lat: 5.5, lng: 95.0 }, { lat: 10.0, lng: 80.0 }, { lat: 18.9, lng: 72.8 }],
    currentPos: { lat: 4.8, lng: 98.5 },
  },
  {
    id: "v11",
    name: "MV Atlas Carrier",
    type: "Bulk Carrier",
    flag: "India",
    imo: "IMO 9732104",
    yearBuilt: 2018,
    length: 224,
    beam: 36,
    capacity: 56000,
    currentLoad: 46000,
    speed: 12.8,
    fuelType: "Conventional",
    fuelLevel: 52,
    fuelCapacity: 2900,
    status: "At Anchor",
    nextMaintenanceDate: "2026-10-30",
    departureDate: "2026-09-08",
    estimatedArrival: "2026-09-16",
    operationalState: "At Berth / Resting",
    currentLocation: "Paradip Anchorage",
    origin: "Paradip Port, India",
    destination: "Port of Chittagong, Bangladesh",
    captain: "Capt. Alok Tripathy",
    captainId: "c11",
    voyageId: "VAC-2026-039",
    voyageProgress: 18,
    emissions: 38.4,
    fuelConsumption: { anchorage: 4.0, dock: 1.8, tugboat: 0.9, voyage: 44.0, total: 50.7 },
    holds: [
      { id: "h1", name: "Hold 1", capacity: 11200, currentCargo: 9500, cargoType: "Iron Ore", position: "fore" },
      { id: "h2", name: "Hold 2", capacity: 11200, currentCargo: 9500, cargoType: "Iron Ore", position: "mid-fore" },
      { id: "h3", name: "Hold 3", capacity: 11200, currentCargo: 9000, cargoType: "Coal", position: "mid" },
      { id: "h4", name: "Hold 4", capacity: 11200, currentCargo: 9000, cargoType: "Coal", position: "mid-aft" },
      { id: "h5", name: "Hold 5", capacity: 11200, currentCargo: 9000, cargoType: "Grain", position: "aft" },
    ],
    color: "#4B5563",
    mapRoute: [{ lat: 20.26, lng: 86.67 }, { lat: 21.0, lng: 89.0 }, { lat: 22.25, lng: 91.8 }],
    currentPos: { lat: 20.26, lng: 86.67 },
  },
  {
    id: "v12",
    name: "MV Baltic Falcon",
    type: "Ro-Ro / Multipurpose",
    flag: "India",
    imo: "IMO 9871109",
    yearBuilt: 2022,
    length: 215,
    beam: 38,
    capacity: 48000,
    currentLoad: 31000,
    speed: 15.6,
    fuelType: "Methanol",
    fuelLevel: 75,
    fuelCapacity: 3000,
    status: "In Port",
    nextMaintenanceDate: "2026-11-28",
    departureDate: "2026-09-10",
    estimatedArrival: "2026-09-23",
    operationalState: "In Port / Loading-Unloading",
    currentLocation: "Chennai Port",
    origin: "Chennai Port, India",
    destination: "Port Klang, Malaysia",
    captain: "Capt. Mohan Swaminathan",
    captainId: "c12",
    voyageId: "VBF-2026-027",
    voyageProgress: 5,
    emissions: 18.2,
    fuelConsumption: { anchorage: 2.9, dock: 1.4, tugboat: 0.7, voyage: 36.0, total: 41.0 },
    holds: [
      { id: "h1", name: "Deck 1", capacity: 12000, currentCargo: 8000, cargoType: "Vehicles", position: "fore" },
      { id: "h2", name: "Deck 2", capacity: 12000, currentCargo: 9500, cargoType: "Heavy Equipment", position: "mid-fore" },
      { id: "h3", name: "Deck 3", capacity: 12000, currentCargo: 8500, cargoType: "Project Cargo", position: "mid" },
      { id: "h4", name: "Deck 4", capacity: 12000, currentCargo: 5000, cargoType: "Rolling Stock", position: "aft" },
    ],
    color: "#0891B2",
    mapRoute: [{ lat: 13.08, lng: 80.27 }, { lat: 8.0, lng: 88.0 }, { lat: 3.0, lng: 101.38 }],
    currentPos: { lat: 13.08, lng: 80.27 },
  },
  {
    id: "v13",
    name: "MV Nordic Spirit",
    type: "Chemical Tanker",
    flag: "India",
    imo: "IMO 9789021",
    yearBuilt: 2021,
    length: 182,
    beam: 32,
    capacity: 35000,
    currentLoad: 0,
    speed: 14.5,
    fuelType: "Ammonia",
    fuelLevel: 35,
    fuelCapacity: 2300,
    status: "Standby",
    nextMaintenanceDate: "2026-09-15",
    departureDate: "2026-08-30",
    estimatedArrival: "2026-09-21",
    operationalState: "Under Maintenance",
    currentLocation: "Dubai Drydocks World",
    origin: "Port of Fujairah, UAE",
    destination: "Dubai Drydock Wharf 4",
    captain: "Capt. Tarun Saxena",
    captainId: "c13",
    voyageId: "VNS-2026-011",
    voyageProgress: 0,
    emissions: 3.5,
    fuelConsumption: { anchorage: 2.1, dock: 1.0, tugboat: 0.4, voyage: 0, total: 3.5 },
    holds: [
      { id: "h1", name: "Tank P1", capacity: 5800, currentCargo: 0, cargoType: "Liquid Chemical", position: "fore" },
      { id: "h2", name: "Tank S1", capacity: 5800, currentCargo: 0, cargoType: "Liquid Chemical", position: "fore" },
      { id: "h3", name: "Tank P2", capacity: 5800, currentCargo: 0, cargoType: "Liquid Chemical", position: "mid" },
      { id: "h4", name: "Tank S2", capacity: 5800, currentCargo: 0, cargoType: "Liquid Chemical", position: "mid" },
      { id: "h5", name: "Tank P3", capacity: 5900, currentCargo: 0, cargoType: "Liquid Chemical", position: "aft" },
      { id: "h6", name: "Tank S3", capacity: 5900, currentCargo: 0, cargoType: "Liquid Chemical", position: "aft" },
    ],
    color: "#BE123C",
    mapRoute: [{ lat: 25.27, lng: 55.28 }],
    currentPos: { lat: 25.27, lng: 55.28 },
  },
  {
    id: "v14",
    name: "MV Caspian Leader",
    type: "LNG Carrier",
    flag: "India",
    imo: "IMO 9890123",
    yearBuilt: 2023,
    length: 292,
    beam: 45,
    capacity: 72000,
    currentLoad: 56000,
    speed: 16.5,
    fuelType: "LNG",
    fuelLevel: 79,
    fuelCapacity: 4700,
    status: "Underway",
    nextMaintenanceDate: "2027-01-08",
    departureDate: "2026-08-25",
    estimatedArrival: "2026-09-26",
    operationalState: "At Sea / Underway",
    currentLocation: "Laccadive Sea",
    origin: "Bonny Island, Nigeria",
    destination: "Dahej LNG Terminal, India",
    captain: "Capt. Sameer Joshi",
    captainId: "c14",
    voyageId: "VCL-2026-052",
    voyageProgress: 72,
    emissions: 46.8,
    fuelConsumption: { anchorage: 4.8, dock: 2.2, tugboat: 1.0, voyage: 71.0, total: 79.0 },
    holds: [
      { id: "h1", name: "Tank 1", capacity: 18000, currentCargo: 14000, cargoType: "LNG", position: "fore" },
      { id: "h2", name: "Tank 2", capacity: 18000, currentCargo: 14000, cargoType: "LNG", position: "mid-fore" },
      { id: "h3", name: "Tank 3", capacity: 18000, currentCargo: 14000, cargoType: "LNG", position: "mid" },
      { id: "h4", name: "Tank 4", capacity: 18000, currentCargo: 14000, cargoType: "LNG", position: "aft" },
    ],
    color: "#0284C7",
    mapRoute: [{ lat: -34.0, lng: 18.0 }, { lat: -10.0, lng: 60.0 }, { lat: 8.5, lng: 73.0 }, { lat: 21.7, lng: 72.5 }],
    currentPos: { lat: 8.5, lng: 73.0 },
  },
  {
    id: "v15",
    name: "MV Southern Cross",
    type: "Ro-Ro / Multipurpose",
    flag: "India",
    imo: "IMO 9901456",
    yearBuilt: 2022,
    length: 198,
    beam: 34,
    capacity: 42000,
    currentLoad: 0,
    speed: 14.8,
    fuelType: "Hydrogen",
    fuelLevel: 88,
    fuelCapacity: 2600,
    status: "Standby",
    nextMaintenanceDate: "2026-12-22",
    departureDate: "2026-09-16",
    estimatedArrival: "2026-09-30",
    operationalState: "Awaiting Assignment / Idle",
    currentLocation: "Colombo Outer Roads",
    origin: "Colombo, Sri Lanka",
    destination: "Open Spot Market",
    captain: "Capt. Shanthi Bandara",
    captainId: "c15",
    voyageId: "VSC-2026-006",
    voyageProgress: 0,
    emissions: 2.8,
    fuelConsumption: { anchorage: 2.2, dock: 0.8, tugboat: 0.3, voyage: 0, total: 3.3 },
    holds: [
      { id: "h1", name: "Hold 1", capacity: 10500, currentCargo: 0, cargoType: "General Cargo", position: "fore" },
      { id: "h2", name: "Hold 2", capacity: 10500, currentCargo: 0, cargoType: "General Cargo", position: "mid-fore" },
      { id: "h3", name: "Hold 3", capacity: 10500, currentCargo: 0, cargoType: "General Cargo", position: "mid" },
      { id: "h4", name: "Hold 4", capacity: 10500, currentCargo: 0, cargoType: "General Cargo", position: "aft" },
    ],
    color: "#10B981",
    mapRoute: [{ lat: 6.95, lng: 79.82 }],
    currentPos: { lat: 6.95, lng: 79.82 },
  },
  {
    id: "v16",
    name: "MV Equator Pioneer",
    type: "Bulk Carrier",
    flag: "India",
    imo: "IMO 9753049",
    yearBuilt: 2020,
    length: 226,
    beam: 37,
    capacity: 60000,
    currentLoad: 49000,
    speed: 13.5,
    fuelType: "Methanol",
    fuelLevel: 65,
    fuelCapacity: 3300,
    status: "Underway",
    nextMaintenanceDate: "2026-10-18",
    departureDate: "2026-08-29",
    estimatedArrival: "2026-09-18",
    operationalState: "At Sea / Underway",
    currentLocation: "Central Indian Ocean",
    origin: "Port of Durban, South Africa",
    destination: "Mormugao Port, India",
    captain: "Capt. Kiran Rao",
    captainId: "c16",
    voyageId: "VEP-2026-083",
    voyageProgress: 68,
    emissions: 29.4,
    fuelConsumption: { anchorage: 3.4, dock: 1.8, tugboat: 0.8, voyage: 51.0, total: 57.0 },
    holds: [
      { id: "h1", name: "Hold 1", capacity: 10000, currentCargo: 8500, cargoType: "Coal", position: "fore" },
      { id: "h2", name: "Hold 2", capacity: 10000, currentCargo: 9200, cargoType: "Coal", position: "mid-fore" },
      { id: "h3", name: "Hold 3", capacity: 10000, currentCargo: 9500, cargoType: "Iron Ore", position: "mid" },
      { id: "h4", name: "Hold 4", capacity: 10000, currentCargo: 9500, cargoType: "Iron Ore", position: "mid-aft" },
      { id: "h5", name: "Hold 5", capacity: 10000, currentCargo: 8500, cargoType: "Grain", position: "aft" },
      { id: "h6", name: "Hold 6", capacity: 10000, currentCargo: 3800, cargoType: "Grain", position: "aft" },
    ],
    color: "#4338CA",
    mapRoute: [{ lat: -29.85, lng: 31.02 }, { lat: -15.0, lng: 55.0 }, { lat: 2.0, lng: 68.0 }, { lat: 15.4, lng: 73.8 }],
    currentPos: { lat: 2.0, lng: 68.0 },
  },
];

export const ports: Port[] = [
 {
 id:"p1", name:"Mundra Port", country:"India", lat: 22.8, lng: 69.7,
 fuels: [
 { type:"LNG", available: 45000, unit:"tonnes" },
 { type:"Methanol", available: 12000, unit:"tonnes" },
 { type:"VLSFO", available: 80000, unit:"tonnes" },
 ],
 bunkering: true, eca: false,
 },
 {
 id:"p2", name:"Fujairah", country:"UAE", lat: 25.1, lng: 56.3,
 fuels: [
 { type:"LNG", available: 62000, unit:"tonnes" },
 { type:"Methanol", available: 18000, unit:"tonnes" },
 { type:"Ammonia", available: 8000, unit:"tonnes" },
 { type:"VLSFO", available: 150000, unit:"tonnes" },
 ],
 bunkering: true, eca: false,
 },
 {
 id:"p3", name:"Port of Rotterdam", country:"Netherlands", lat: 51.9, lng: 4.5,
 fuels: [
 { type:"LNG", available: 120000, unit:"tonnes" },
 { type:"Methanol", available: 45000, unit:"tonnes" },
 { type:"Hydrogen", available: 5000, unit:"kg" },
 { type:"Ammonia", available: 22000, unit:"tonnes" },
 { type:"VLSFO", available: 200000, unit:"tonnes" },
 ],
 bunkering: true, eca: true,
 },
 {
 id:"p4", name:"Singapore", country:"Singapore", lat: 1.3, lng: 103.8,
 fuels: [
 { type:"LNG", available: 95000, unit:"tonnes" },
 { type:"Methanol", available: 32000, unit:"tonnes" },
 { type:"VLSFO", available: 180000, unit:"tonnes" },
 ],
 bunkering: true, eca: false,
 },
 {
 id:"p5", name:"Suez Canal Entry", country:"Egypt", lat: 29.9, lng: 32.5,
 fuels: [
 { type:"VLSFO", available: 90000, unit:"tonnes" },
 { type:"LNG", available: 15000, unit:"tonnes" },
 ],
 bunkering: true, eca: false,
 },
 {
 id:"p6", name:"Aden", country:"Yemen", lat: 12.8, lng: 45.0,
 fuels: [
 { type:"VLSFO", available: 40000, unit:"tonnes" },
 ],
 bunkering: true, eca: false,
 },
 {
 id:"p7", name:"Jawaharlal Nehru Port", country:"India", lat: 18.9, lng: 72.8,
 fuels: [
 { type:"LNG", available: 55000, unit:"tonnes" },
 { type:"Methanol", available: 14000, unit:"tonnes" },
 { type:"VLSFO", available: 95000, unit:"tonnes" },
 ],
 bunkering: true, eca: false,
 },
 {
 id:"p8", name:"Jeddah", country:"Saudi Arabia", lat: 21.5, lng: 39.2,
 fuels: [
 { type:"LNG", available: 70000, unit:"tonnes" },
 { type:"VLSFO", available: 120000, unit:"tonnes" },
 ],
 bunkering: true, eca: false,
 },
 {
 id:"p9", name:"Chennai Port", country:"India", lat: 13.1, lng: 80.3,
 fuels: [
 { type:"LNG", available: 38000, unit:"tonnes" },
 { type:"Methanol", available: 9000, unit:"tonnes" },
 { type:"VLSFO", available: 65000, unit:"tonnes" },
 ],
 bunkering: true, eca: false,
 },
 {
 id:"p10", name:"Colombo", country:"Sri Lanka", lat: 6.9, lng: 79.8,
 fuels: [
 { type:"LNG", available: 28000, unit:"tonnes" },
 { type:"VLSFO", available: 72000, unit:"tonnes" },
 ],
 bunkering: true, eca: false,
 },
];

export interface RoutePlan {
 id: string;
 label:"Fastest" |"Efficient" |"Custom";
 distance: number;
 travelTime: number; // hours
 avgSpeed: number;
 fuelConsumption: number;
 cost: number;
 emissions: number;
 efficiency: number;
 color: string;
}

export const routePlans: Record<string, RoutePlan[]> = {
 v1: [
 { id:"r1f", label:"Fastest", distance: 11420, travelTime: 695, avgSpeed: 16.4, fuelConsumption: 4860, cost: 2430000, emissions: 9720, efficiency: 71, color:"#C94B4B" },
 { id:"r1e", label:"Efficient", distance: 11680, travelTime: 780, avgSpeed: 14.8, fuelConsumption: 3890, cost: 1945000, emissions: 7780, efficiency: 94, color:"#18A6A6" },
 { id:"r1c", label:"Custom", distance: 11550, travelTime: 735, avgSpeed: 15.6, fuelConsumption: 4200, cost: 2100000, emissions: 8400, efficiency: 84, color:"#D99A2B" },
 ],
 v2: [
 { id:"r2f", label:"Fastest", distance: 1840, travelTime: 139, avgSpeed: 13.2, fuelConsumption: 980, cost: 294000, emissions: 1078, efficiency: 68, color:"#C94B4B" },
 { id:"r2e", label:"Efficient", distance: 1920, travelTime: 160, avgSpeed: 12.0, fuelConsumption: 760, cost: 228000, emissions: 836, efficiency: 91, color:"#18A6A6" },
 { id:"r2c", label:"Custom", distance: 1880, travelTime: 148, avgSpeed: 12.7, fuelConsumption: 850, cost: 255000, emissions: 935, efficiency: 80, color:"#D99A2B" },
 ],
 v3: [
 { id:"r3f", label:"Fastest", distance: 520, travelTime: 35, avgSpeed: 14.8, fuelConsumption: 220, cost: 88000, emissions: 264, efficiency: 73, color:"#C94B4B" },
 { id:"r3e", label:"Efficient", distance: 530, travelTime: 40, avgSpeed: 13.2, fuelConsumption: 168, cost: 67200, emissions: 202, efficiency: 95, color:"#18A6A6" },
 { id:"r3c", label:"Custom", distance: 525, travelTime: 37, avgSpeed: 14.0, fuelConsumption: 190, cost: 76000, emissions: 228, efficiency: 85, color:"#D99A2B" },
 ],
 v4: [
 { id:"r4f", label:"Fastest", distance: 3180, travelTime: 175, avgSpeed: 18.1, fuelConsumption: 2860, cost: 1430000, emissions: 5148, efficiency: 62, color:"#C94B4B" },
 { id:"r4e", label:"Efficient", distance: 3280, travelTime: 210, avgSpeed: 15.6, fuelConsumption: 2190, cost: 1095000, emissions: 3942, efficiency: 89, color:"#18A6A6" },
 { id:"r4c", label:"Custom", distance: 3230, travelTime: 192, avgSpeed: 16.8, fuelConsumption: 2480, cost: 1240000, emissions: 4464, efficiency: 77, color:"#D99A2B" },
 ],
};

export const staticOrder = {
 orderId:"ORD-2026-SIH-001",
 client:"Indian Petrochemicals Ltd.",
 cargo:"LNG Cargo",
 quantity: 52000,
 unit:"tonnes",
 origin:"Mundra Port, India",
 destination:"Port of Rotterdam, Netherlands",
 loadDate:"2026-09-01",
 deliveryDate:"2026-10-12",
 priority:"High",
 vessel:"v1",
 status:"Plan Generated",
 selectedPlan:"Efficient",
};
