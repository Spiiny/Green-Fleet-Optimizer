export interface OrderItem {
  id: string;
  customer: string;
  cargo: string;
  cargoType: "LNG" | "Dry Bulk" | "Liquid Chemical" | "Containers" | "General Cargo";
  quantity: number;
  unit: string;
  origin: string;
  destination: string;
  loadDate: string;
  deliveryDeadline: string;
  priority: "Urgent" | "High" | "Medium" | "Low";
  status: "PENDING" | "ASSIGNED";
  assignedVesselId?: string;
  assignedVesselName?: string;
  assignedAt?: string;
}

export const INITIAL_ORDERS: OrderItem[] = [
  {
    id: "ORD-2026-0891",
    customer: "PetroChem Global Corp",
    cargo: "Liquefied Natural Gas (LNG)",
    cargoType: "LNG",
    quantity: 22000,
    unit: "MT",
    origin: "Mundra Port, India",
    destination: "Port of Rotterdam, Netherlands",
    loadDate: "2026-09-08",
    deliveryDeadline: "2026-10-15",
    priority: "High",
    status: "PENDING",
  },
  {
    id: "ORD-2026-0892",
    customer: "ArcelorMittal Minerals",
    cargo: "Iron Ore & Bulk Coal",
    cargoType: "Dry Bulk",
    quantity: 10000,
    unit: "MT",
    origin: "Chennai Port, India",
    destination: "Port of Singapore",
    loadDate: "2026-09-10",
    deliveryDeadline: "2026-09-28",
    priority: "Medium",
    status: "PENDING",
  },
  {
    id: "ORD-2026-0893",
    customer: "Gulf Chemical Industries",
    cargo: "Liquid Solvents & Lubricants",
    cargoType: "Liquid Chemical",
    quantity: 8000,
    unit: "MT",
    origin: "JNPT Mumbai, India",
    destination: "Port of Fujairah, UAE",
    loadDate: "2026-09-06",
    deliveryDeadline: "2026-09-20",
    priority: "Urgent",
    status: "PENDING",
  },
  {
    id: "ORD-2026-0894",
    customer: "Trans-Eurasia Logistics",
    cargo: "Containerized Freight (TEU)",
    cargoType: "Containers",
    quantity: 27000,
    unit: "MT",
    origin: "Colombo, Sri Lanka",
    destination: "Port of Jeddah, Saudi Arabia",
    loadDate: "2026-09-12",
    deliveryDeadline: "2026-10-05",
    priority: "Medium",
    status: "PENDING",
  },
  {
    id: "ORD-2026-0895",
    customer: "Apex Energy Trading",
    cargo: "LNG Bunkering Cargo (Batch B)",
    cargoType: "LNG",
    quantity: 18000,
    unit: "MT",
    origin: "Mundra Port, India",
    destination: "Port of Rotterdam, Netherlands",
    loadDate: "2026-09-15",
    deliveryDeadline: "2026-10-25",
    priority: "Low",
    status: "PENDING",
  },
];
