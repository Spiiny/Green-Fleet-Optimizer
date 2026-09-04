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
      { lat: 13.0827, lng: 80.2707 }, // Chennai (Origin)
      { lat: 10.0, lng: 81.5 },       // East of Sri Lanka
      { lat: 5.8, lng: 80.5 },        // South of Sri Lanka
      { lat: 5.5, lng: 95.0 },        // Malacca Strait West Entry
      { lat: 5.0, lng: 100.0 },       // Malacca Strait (Current Pos)
      { lat: 4.2, lng: 100.6 },       // Perak / Dindings fairway
      { lat: 3.5, lng: 101.0 },       // One Fathom Bank approach
      { lat: 3.0, lng: 101.38 },      // Port Klang
      { lat: 2.5, lng: 101.7 },       // Port Dickson offshore
      { lat: 2.1, lng: 102.1 },       // Malacca Town offshore
      { lat: 1.7, lng: 102.7 },       // Batu Pahat offshore
      { lat: 1.4, lng: 103.3 },       // Tanjung Piai offshore
      { lat: 1.36, lng: 103.55 },     // Tanjung Pelepas
      { lat: 1.22, lng: 103.68 },     // Singapore Strait West TSS
      { lat: 1.25, lng: 103.82 },     // Port of Singapore (Destination)
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
      { lat: 18.9, lng: 72.8 },       // JNPT Mumbai (Origin)
      { lat: 20.0, lng: 67.0 },       // Arabian Sea Transit
      { lat: 22.5, lng: 60.5 },       // Gulf of Oman (Current Pos / Anchor)
      { lat: 23.2, lng: 59.5 },       // Gulf of Oman outer passage
      { lat: 23.8, lng: 58.7 },       // Muscat Offshore Fairway
      { lat: 24.3, lng: 57.5 },       // Al Batinah offshore channel
      { lat: 24.50, lng: 56.63 },     // Port of Sohar
      { lat: 24.9, lng: 56.55 },      // Khor Fakkan approach
      { lat: 25.12, lng: 56.36 },     // Port of Fujairah (Destination)
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
      { lat: 6.9, lng: 79.8 },        // Colombo (Origin)
      { lat: 5.5, lng: 76.0 },        // South of India Passage
      { lat: 6.0, lng: 70.0 },        // Laccadive Sea Pass
      { lat: 8.0, lng: 65.0 },        // Central Indian Ocean (Current Pos)
      { lat: 13.0, lng: 58.0 },       // Arabian Sea Deep Fairway
      { lat: 16.94, lng: 54.0 },      // Port of Salalah
      { lat: 14.5, lng: 51.0 },       // Gulf of Aden East
      { lat: 12.5, lng: 45.0 },       // Gulf of Aden TSS
      { lat: 12.6, lng: 43.3 },       // Bab-el-Mandeb
      { lat: 17.5, lng: 40.5 },       // Southern Red Sea
      { lat: 21.4858, lng: 39.1925 }, // Jeddah Port (Destination)
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
