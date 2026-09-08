import { useState, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { vessels, Vessel } from "../../data/fleet";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Ship,
  Layers,
  Zap,
  DollarSign,
  Leaf,
  Award,
  Lock,
  Unlock,
  Pencil,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

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
  assignedPlanId?: PlanType;
  assignedPlanTitle?: string;
  assignedAt?: string;
}

export type PlanType = "greenest" | "cheapest" | "fastest" | "balanced";

export interface OptimizationPlan {
  id: PlanType;
  title: string;
  badge: string;
  badgeColor: { bg: string; text: string; border: string };
  icon?: string;
  speed: string;
  eta: string;
  fuelConsumption: string;
  cost: string;
  costValue: number;
  ghg: string;
  ghgRating: string;
  tagline: string;
}

export interface VesselRecommendation {
  vessel: Vessel;
  availableCapacity: number;
  isBest: boolean;
  matchScore: number;
  compatibilityDesc: string;
  estimatedArrival: string;
  constraints: {
    label: string;
    passed: boolean;
    note: string;
  }[];
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

// Helper: Calculate contextual vessel recommendations for a specific order
export function getOrderRecommendations(order: OrderItem): VesselRecommendation[] {
  return vessels
    .map((v) => {
      const availableCapacity = Math.max(0, v.capacity - v.currentLoad);
      const capacityOk = availableCapacity >= order.quantity;

      let cargoTypeMatch = false;
      let typeScore = 0;

      if (order.cargoType === "LNG" && v.type === "LNG Carrier") {
        cargoTypeMatch = true;
        typeScore = 40;
      } else if (order.cargoType === "Dry Bulk" && v.type === "Bulk Carrier") {
        cargoTypeMatch = true;
        typeScore = 40;
      } else if (order.cargoType === "Liquid Chemical" && v.type === "Chemical Tanker") {
        cargoTypeMatch = true;
        typeScore = 40;
      } else if (order.cargoType === "Containers" && v.type === "Container Ship") {
        cargoTypeMatch = true;
        typeScore = 40;
      } else {
        typeScore = 10;
      }

      const capacityScore = capacityOk
        ? 30
        : Math.max(0, 30 - ((order.quantity - availableCapacity) / 1000) * 2);
      const fuelScore = v.fuelLevel > 60 ? 20 : v.fuelLevel > 40 ? 15 : 8;
      const statusScore = v.status === "At Anchor" ? 10 : v.status === "Underway" ? 8 : 5;

      const totalScore = Math.min(99, Math.round(typeScore + capacityScore + fuelScore + statusScore));

      let estimatedArrival = "Within Schedule";
      if (v.id === "v1") estimatedArrival = "2026-09-24 (21 days early)";
      else if (v.id === "v2") estimatedArrival = "2026-09-22 (6 days early)";
      else if (v.id === "v3") estimatedArrival = "2026-09-14 (6 days early)";
      else if (v.id === "v4") estimatedArrival = "2026-09-28 (7 days early)";
      else if (v.id === "v5") estimatedArrival = "2026-09-26 (9 days early)";

      const constraints = [
        {
          label: "Cargo Spec Compatibility",
          passed: cargoTypeMatch,
          note: cargoTypeMatch ? `Direct match for ${order.cargoType}` : `Vessel configured for ${v.type}`,
        },
        {
          label: "Capacity Requirement",
          passed: capacityOk,
          note: capacityOk
            ? `${availableCapacity.toLocaleString()} MT avail vs ${order.quantity.toLocaleString()} MT req`
            : `Deficit: ${(order.quantity - availableCapacity).toLocaleString()} MT`,
        },
        {
          label: "Fuel Level & Bunkering",
          passed: v.fuelLevel >= 50,
          note: `${v.fuelLevel}% ${v.fuelType} onboard (Adequate for route)`,
        },
        {
          label: "Schedule & Route Feasibility",
          passed: true,
          note: `Location: ${v.currentLocation} · Speed: ${v.speed} kn`,
        },
      ];

      let compatibilityDesc = `${totalScore}% Match · Specialized for ${v.type}`;
      if (cargoTypeMatch && capacityOk) {
        compatibilityDesc = `Optimal Fit (${totalScore}%) · Full Cargo & Tank Containment`;
      } else if (!capacityOk) {
        compatibilityDesc = `Partial Fit (${totalScore}%) · Limited Available Capacity`;
      } else if (!cargoTypeMatch) {
        compatibilityDesc = `Sub-optimal (${totalScore}%) · Cargo Conversion Required`;
      }

      return {
        vessel: v,
        availableCapacity,
        isBest: false,
        matchScore: totalScore,
        compatibilityDesc,
        estimatedArrival,
        constraints,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 4)
    .map((rec, index) => ({
      ...rec,
      isBest: index === 0,
    }));
}

// Distinct plan color styling based on plan type (Greenest: green, Cheapest: amber/gold, Fastest: red, Balanced: blue)
export const planStyles: Record<
  PlanType,
  {
    border: string;
    borderSelected: string;
    ringSelected: string;
    bgHover: string;
    bgSelected: string;
    selectedBadgeBg: string;
    selectedButtonBg: string;
  }
> = {
  greenest: {
    border: "border-[#2E9B68]",
    borderSelected: "border-[#1E7E34]",
    ringSelected: "ring-2 ring-[#2E9B68]",
    bgHover: "hover:bg-[#F0FDF4]",
    bgSelected: "bg-[#EAF7EE]",
    selectedBadgeBg: "bg-[#1E7E34]",
    selectedButtonBg: "bg-[#1E7E34]",
  },
  cheapest: {
    border: "border-[#D97706]",
    borderSelected: "border-[#B45309]",
    ringSelected: "ring-2 ring-[#D97706]",
    bgHover: "hover:bg-[#FEFCE8]",
    bgSelected: "bg-[#FEF9C3]",
    selectedBadgeBg: "bg-[#B45309]",
    selectedButtonBg: "bg-[#B45309]",
  },
  fastest: {
    border: "border-[#DC2626]",
    borderSelected: "border-[#B91C1C]",
    ringSelected: "ring-2 ring-[#DC2626]",
    bgHover: "hover:bg-[#FEF2F2]",
    bgSelected: "bg-[#FEE2E2]",
    selectedBadgeBg: "bg-[#B91C1C]",
    selectedButtonBg: "bg-[#B91C1C]",
  },
  balanced: {
    border: "border-[#2563EB]",
    borderSelected: "border-[#1D4ED8]",
    ringSelected: "ring-2 ring-[#2563EB]",
    bgHover: "hover:bg-[#EFF6FF]",
    bgSelected: "bg-[#EAF4FE]",
    selectedBadgeBg: "bg-[#1D4ED8]",
    selectedButtonBg: "bg-[#182350]",
  },
};

// Helper: Generate the 4 optimization plans for a selected vessel & order
export function getOptimizationPlans(vessel: Vessel, order: OrderItem): OptimizationPlan[] {
  const baseSpeed = vessel.speed || 14.5;
  const baseRate = vessel.fuelConsumption?.voyage || 48;

  return [
    {
      id: "greenest",
      title: "Greenest Plan",
      badge: "MINIMUM EMISSIONS · IMO CII CLASS A",
      badgeColor: { bg: "#EAF7EE", text: "#1E7E34", border: "#A3D9B1" },
      speed: `${(baseSpeed * 0.82).toFixed(1)} kn`,
      eta: "2026-09-28 (17 days early)",
      fuelConsumption: `${Math.round(baseRate * 18 * 0.74).toLocaleString()} MT`,
      cost: "$162,400",
      costValue: 162400,
      ghg: "13.8 tCO₂/day",
      ghgRating: "Lowest (Eco-Leader)",
      tagline: "Eco-speed steaming, hydro-trim drag reduction & minimal GHG dual-fuel injection",
    },
    {
      id: "cheapest",
      title: "Cheapest Plan",
      badge: "MINIMUM OPERATIONAL COST",
      badgeColor: { bg: "#FEF9C3", text: "#854D0E", border: "#FDE047" },
      speed: `${(baseSpeed * 0.79).toFixed(1)} kn`,
      eta: "2026-09-30 (15 days early)",
      fuelConsumption: `${Math.round(baseRate * 19 * 0.8).toLocaleString()} MT`,
      cost: "$148,500",
      costValue: 148500,
      ghg: "15.9 tCO₂/day",
      ghgRating: "Low (-18%)",
      tagline: "Fuel-arbitrage bunkering windows, economic speed & current-assisted cruising",
    },
    {
      id: "fastest",
      title: "Fastest Plan",
      badge: "MINIMUM TRAVEL TIME · EXPRESS",
      badgeColor: { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
      speed: `${(baseSpeed * 1.06).toFixed(1)} kn`,
      eta: "2026-09-22 (23 days early)",
      fuelConsumption: `${Math.round(baseRate * 14 * 1.28).toLocaleString()} MT`,
      cost: "$226,000",
      costValue: 226000,
      ghg: "25.2 tCO₂/day",
      ghgRating: "Higher (+14%)",
      tagline: "Maximum continuous rating (MCR) transit via deep-water direct corridors",
    },
    {
      id: "balanced",
      title: "Balanced Plan",
      badge: "PARETO EQUILIBRIUM · RECOMMENDED",
      badgeColor: { bg: "#EAF4FE", text: "#182350", border: "#AFD2FA" },
      speed: `${(baseSpeed * 0.92).toFixed(1)} kn`,
      eta: "2026-09-25 (20 days early)",
      fuelConsumption: `${Math.round(baseRate * 16 * 0.89).toLocaleString()} MT`,
      cost: "$182,000",
      costValue: 182000,
      ghg: "17.4 tCO₂/day",
      ghgRating: "Moderate (-12%)",
      tagline: "Multi-objective optimal trade-off between fuel opex, emissions, and schedule",
    },
  ];
}

interface Props {
  selectedPlan?: string;
  onPlanSelect?: (plan: string) => void;
  orders?: OrderItem[];
  onOrdersChange?: (orders: OrderItem[]) => void;
}

export default function OrdersFlow({ orders: controlledOrders, onOrdersChange }: Props) {
  const [localOrders, setLocalOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const orders = controlledOrders ?? localOrders;
  const setOrders = (updater: OrderItem[] | ((prev: OrderItem[]) => OrderItem[])) => {
    if (onOrdersChange) {
      const next = typeof updater === "function" ? updater(orders) : updater;
      onOrdersChange(next);
    } else {
      setLocalOrders(updater);
    }
  };
  
  // Accordion state: which order row is currently expanded (null if none)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>("ORD-2026-0891");

  // Per-order selected vessel state (empty initially so user must select)
  const [orderSelectedVessels, setOrderSelectedVessels] = useState<Record<string, string>>({});

  // Per-order selected optimization plan state (empty initially so user must select)
  const [orderSelectedPlans, setOrderSelectedPlans] = useState<Record<string, PlanType>>({});

  // Per-order validation error messages
  const [approvalErrors, setApprovalErrors] = useState<Record<string, string | null>>({});

  // Orders currently in edit mode (unlocked for modification)
  const [editingOrderIds, setEditingOrderIds] = useState<string[]>([]);

  // Track expanded vessel details cards in Step 2
  const [expandedVesselDetails, setExpandedVesselDetails] = useState<Record<string, boolean>>({});

  const toggleVesselDetails = (key: string) => {
    setExpandedVesselDetails((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Approved assignments record
  const [approvedOrders, setApprovedOrders] = useState<
    Record<
      string,
      {
        vesselId: string;
        vesselName: string;
        planId: PlanType;
        planTitle: string;
        date: string;
      }
    >
  >({});

  // Comparison mode states (scoped to current order)
  const [comparedVesselIds, setComparedVesselIds] = useState<string[]>([]);
  const [showComparisonPanel, setShowComparisonPanel] = useState<boolean>(false);
  const [comparisonWarning, setComparisonWarning] = useState<string | null>(null);

  // Toggle order accordion
  const handleToggleOrder = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      setComparedVesselIds([]);
      setShowComparisonPanel(false);
      setComparisonWarning(null);
    }
  };

  // Select a vessel for the given order (Step 2)
  const handleSelectVesselForOrder = (orderId: string, vesselId: string) => {
    setOrderSelectedVessels((prev) => ({ ...prev, [orderId]: vesselId }));
    // Clear validation error when making a selection
    setApprovalErrors((prev) => ({ ...prev, [orderId]: null }));
  };

  // Select an optimization plan for the given order (Step 3)
  const handleSelectPlanForOrder = (orderId: string, planId: PlanType) => {
    setOrderSelectedPlans((prev) => ({ ...prev, [orderId]: planId }));
    // Clear validation error when making a selection
    setApprovalErrors((prev) => ({ ...prev, [orderId]: null }));
  };

  // Approve final assignment (Step 4) with strict verification of 1, 2, 3
  const handleApproveAssignmentForOrder = (order: OrderItem) => {
    const vesselId = orderSelectedVessels[order.id] || order.assignedVesselId;
    const planId = orderSelectedPlans[order.id] || order.assignedPlanId;

    // Check selections in 1, 2, and 3
    const missing: string[] = [];
    if (!order || !order.id) {
      missing.push("Step 1 (Order Selection)");
    }
    if (!vesselId) {
      missing.push("Step 2 (Fleet Vessel Selection)");
    }
    if (!planId) {
      missing.push("Step 3 (Optimization Plan Selection)");
    }

    if (missing.length > 0) {
      const errorMsg = `Selection Required: Please make selection for ${missing.join(" and ")} before approving assignment.`;
      setApprovalErrors((prev) => ({ ...prev, [order.id]: errorMsg }));
      return;
    }

    // Clear error
    setApprovalErrors((prev) => ({ ...prev, [order.id]: null }));

    const assignedVessel = vessels.find((v) => v.id === vesselId) || vessels[0];
    const plans = getOptimizationPlans(assignedVessel, order);
    const chosenPlan = plans.find((p) => p.id === planId) || plans[3];
    const approvalTimestamp = new Date().toISOString().replace("T", " ").substring(0, 19);

    // Update order in list
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: "ASSIGNED",
              assignedVesselId: assignedVessel.id,
              assignedVesselName: assignedVessel.name,
              assignedPlanId: planId,
              assignedPlanTitle: chosenPlan.title,
              assignedAt: approvalTimestamp,
            }
          : o
      )
    );

    // Update approved state
    setApprovedOrders((prev) => ({
      ...prev,
      [order.id]: {
        vesselId: assignedVessel.id,
        vesselName: assignedVessel.name,
        planId: planId!,
        planTitle: chosenPlan.title,
        date: approvalTimestamp,
      },
    }));

    // Lock selections: remove order from editing list
    setEditingOrderIds((prev) => prev.filter((id) => id !== order.id));
  };

  // Start edit mode (unlock selections)
  const handleStartEdit = (orderId: string) => {
    setEditingOrderIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
    setApprovalErrors((prev) => ({ ...prev, [orderId]: null }));
  };

  // Cancel edit mode (restore lock)
  const handleCancelEdit = (orderId: string) => {
    setEditingOrderIds((prev) => prev.filter((id) => id !== orderId));
    setApprovalErrors((prev) => ({ ...prev, [orderId]: null }));
  };

  // Unassign / Reassign helper
  const handleUnassignOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "PENDING",
              assignedVesselId: undefined,
              assignedVesselName: undefined,
              assignedPlanId: undefined,
              assignedPlanTitle: undefined,
              assignedAt: undefined,
            }
          : o
      )
    );
    setApprovedOrders((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setOrderSelectedVessels((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setOrderSelectedPlans((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setEditingOrderIds((prev) => prev.filter((id) => id !== orderId));
    setApprovalErrors((prev) => ({ ...prev, [orderId]: null }));
  };

  // Toggle compare selection (max 4)
  const handleToggleCompare = (vesselId: string) => {
    setComparisonWarning(null);
    if (comparedVesselIds.includes(vesselId)) {
      const next = comparedVesselIds.filter((id) => id !== vesselId);
      setComparedVesselIds(next);
      if (next.length < 2) {
        setShowComparisonPanel(false);
      }
    } else {
      if (comparedVesselIds.length >= 4) {
        setComparisonWarning("Compare up to 4 vessels");
        setTimeout(() => setComparisonWarning(null), 3500);
        return;
      }
      const next = [...comparedVesselIds, vesselId];
      setComparedVesselIds(next);
      if (next.length >= 2) {
        setShowComparisonPanel(true);
      }
    }
  };

  const priorityColors: Record<OrderItem["priority"], { bg: string; text: string; border: string }> = {
    Urgent: { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
    High: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
    Medium: { bg: "#EAF4FE", text: "#182350", border: "#AFD2FA" },
    Low: { bg: "#F3F4F6", text: "#4B5563", border: "#E5E7EB" },
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" style={{ background: "#FEFAEF" }}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#182350]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA]">
              Fleet Allocation Engine
            </span>
            <span className="text-xs text-[#737985] font-sans">· Active Orders: {orders.length}</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#182350] tracking-tight">
            Order → Vessel Recommendation & Approval
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#182350] text-xs font-sans">
            <span className="text-[#737985]">Pending:</span>
            <span className="font-bold text-[#B9915E]">
              {orders.filter((o) => o.status === "PENDING").length}
            </span>
            <span className="text-[#737985] ml-2">Assigned:</span>
            <span className="font-bold text-[#2E9B68]">
              {orders.filter((o) => o.status === "ASSIGNED").length}
            </span>
          </div>
        </div>
      </div>

      {/* 1. CUSTOMER ORDERS LIST ACCORDION */}
      <div
        className="rounded-xl overflow-hidden shadow-xs border border-[#182350]"
        style={{ background: "#FFFFFF" }}
      >
        <div className="px-5 py-3.5 border-b border-[#182350] flex items-center justify-between bg-[#FAFAF5]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-[#182350]">1. Customer Orders List</span>
            <span className="text-xs text-[#737985] font-sans">
              (Click any order row to expand its contextual recommendations, plan options & approval)
            </span>
          </div>
          <div className="text-[11px] font-sans text-[#737985] font-semibold">
            {orders.length} Commercial Orders
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-[#182350] bg-[#F7F5EE] text-[#737985] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Flow</th>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cargo</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Origin</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE8DF]">
              {orders.map((ord) => {
                const isExpanded = expandedOrderId === ord.id;
                const pStyle = priorityColors[ord.priority];
                const isAssigned = ord.status === "ASSIGNED";

                // Calculations strictly for this order
                const orderRecs = getOrderRecommendations(ord);
                const currentSelectedVesselId = orderSelectedVessels[ord.id] || ord.assignedVesselId || null;
                const activeRec = currentSelectedVesselId
                  ? orderRecs.find((r) => r.vessel.id === currentSelectedVesselId) || null
                  : null;
                const activeVessel = activeRec?.vessel || null;

                const optimizationPlans = activeVessel ? getOptimizationPlans(activeVessel, ord) : [];
                const currentPlanId = orderSelectedPlans[ord.id] || ord.assignedPlanId || null;
                const activePlan = currentPlanId
                  ? optimizationPlans.find((p) => p.id === currentPlanId) || null
                  : null;

                const orderApproval = approvedOrders[ord.id];
                const isOrderApproved = isAssigned || !!orderApproval;
                const isEditing = editingOrderIds.includes(ord.id);
                const isLocked = isOrderApproved && !isEditing;
                const orderError = approvalErrors[ord.id];

                // Compared vessels list for comparison table
                const comparedList = orderRecs.filter((r) => comparedVesselIds.includes(r.vessel.id));

                return (
                  <Fragment key={ord.id}>
                    {/* Main Clickable Order Row */}
                    <tr
                      onClick={() => handleToggleOrder(ord.id)}
                      className={`cursor-pointer transition-colors duration-150 select-none ${
                        isExpanded
                          ? "bg-[#EAF4FE] font-medium border-l-4 border-l-[#182350]"
                          : "hover:bg-[#FDFBF7] bg-white"
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <div className="w-6 h-6 rounded-md bg-[#182350] text-white flex items-center justify-center text-[10px] mx-auto shadow-xs">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#182350]">
                        <div className="flex items-center gap-2">
                          <span>{ord.id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#182350]">{ord.customer}</td>
                      <td className="py-3.5 px-4 text-[#3F4654]">{ord.cargo}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#182350]">
                        {ord.quantity.toLocaleString()} {ord.unit}
                      </td>
                      <td className="py-3.5 px-4 text-[#737985]">{ord.origin}</td>
                      <td className="py-3.5 px-4 text-[#737985]">{ord.destination}</td>
                      <td className="py-3.5 px-4 font-mono text-[#182350]">{ord.deliveryDeadline}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block"
                          style={{
                            background: pStyle.bg,
                            color: pStyle.text,
                            border: `1px solid ${pStyle.border}`,
                          }}
                        >
                          {ord.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isAssigned ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA]">
                              ✓ ASSIGNED
                            </span>
                            <span className="text-[10px] font-semibold text-[#2E9B68] truncate max-w-[130px]">
                              {ord.assignedVesselName}
                            </span>
                            {ord.assignedPlanTitle && (
                              <span className="text-[9px] font-mono text-[#737985]">
                                {ord.assignedPlanTitle}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FFF7ED] text-[#C2410C] border border-[#FDBA74]">
                            ● PENDING
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* EXPANDED ACCORDION CONTAINER FOR THIS ORDER */}
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={10}
                          className="p-4 sm:p-6 bg-[#FEFAEF] border-b-2 border-[#182350]/30 shadow-inner"
                        >
                          <div className="space-y-6 max-w-7xl mx-auto">
                            {/* STEP 1: SELECTED ORDER DETAILS PANEL */}
                            <div
                              className="p-5 rounded-xl shadow-xs border border-[#182350]"
                              style={{ background: "#FFFFFF" }}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[#ECE8DF]">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-[#182350] text-white flex items-center justify-center text-xs font-bold">
                                    1
                                  </span>
                                  <h2 className="text-sm font-extrabold text-[#182350] uppercase tracking-wide">
                                    Selected Order Details: <span className="text-[#182350] font-mono">{ord.id}</span>
                                  </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[#737985] font-sans">Workflow Status:</span>
                                  {isLocked ? (
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA] flex items-center gap-1.5">
                                        <Lock size={12} className="text-[#182350]" />
                                        <span>Locked & Assigned to {ord.assignedVesselName || orderApproval?.vesselName} ({ord.assignedPlanTitle || orderApproval?.planTitle})</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(ord.id)}
                                        title="Unlock to edit vessel or plan selections"
                                        className="px-2.5 py-1 rounded text-xs font-bold bg-white text-[#182350] border border-[#182350] hover:bg-[#F7F5EE] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                      >
                                        <Pencil size={12} />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUnassignOrder(ord.id)}
                                        title="Reset order to pending"
                                        className="px-2 py-1 rounded text-[11px] font-semibold text-[#737985] hover:text-[#DC2626] transition-colors cursor-pointer"
                                      >
                                        Reset
                                      </button>
                                    </div>
                                  ) : isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#FEF9C3] text-[#854D0E] border border-[#FDE047] flex items-center gap-1.5">
                                        <Unlock size={12} className="text-[#854D0E]" />
                                        <span>Editing Mode · Modify Step 2 & 3 Selections</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelEdit(ord.id)}
                                        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-white text-[#182350] border border-[#182350]/40 hover:bg-[#F7F5EE] transition-colors cursor-pointer"
                                      >
                                        Cancel Edit
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FDBA74]">
                                      Awaiting Vessel & Plan Selection
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs font-sans">
                                <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]">
                                  <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">
                                    Customer
                                  </div>
                                  <div className="font-bold text-[#182350] truncate">{ord.customer}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350] col-span-1 sm:col-span-2">
                                  <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">
                                    Cargo Specification
                                  </div>
                                  <div className="font-semibold text-[#182350] truncate">{ord.cargo}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]">
                                  <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">
                                    Quantity
                                  </div>
                                  <div className="font-mono font-bold text-[#182350]">
                                    {ord.quantity.toLocaleString()} {ord.unit}
                                  </div>
                                </div>
                                <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]">
                                  <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">
                                    Load Date
                                  </div>
                                  <div className="font-mono text-[#182350]">{ord.loadDate}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]">
                                  <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">
                                    Deadline
                                  </div>
                                  <div className="font-mono font-bold text-[#182350]">{ord.deliveryDeadline}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]">
                                  <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">
                                    Priority
                                  </div>
                                  <div>
                                    <span
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase inline-block"
                                      style={{
                                        background: priorityColors[ord.priority].bg,
                                        color: priorityColors[ord.priority].text,
                                      }}
                                    >
                                      {ord.priority}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                                <div className="p-2.5 rounded-lg bg-[#FAFAF5] border border-[#182350] flex items-center justify-between">
                                  <span className="text-[#737985]">Origin Port:</span>
                                  <span className="font-bold text-[#182350]">📍 {ord.origin}</span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-[#FAFAF5] border border-[#182350] flex items-center justify-between">
                                  <span className="text-[#737985]">Destination Port:</span>
                                  <span className="font-bold text-[#182350]">🏁 {ord.destination}</span>
                                </div>
                              </div>
                            </div>

                            {/* STEP 2: RECOMMENDED VESSELS FOR THIS SPECIFIC ORDER */}
                            <div className="space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-[#182350] text-white flex items-center justify-center text-xs font-bold">
                                    2
                                  </span>
                                  <h2 className="text-sm font-extrabold text-[#182350] uppercase tracking-wide">
                                    Recommended Vessels for {ord.id}
                                  </h2>
                                  <span className="text-xs font-sans text-[#737985]">
                                    (Ranked by Cargo Fit, Available Capacity, Fuel Profile & Route Feasibility)
                                  </span>
                                </div>
                                <div className="text-xs font-sans font-bold text-[#182350] flex flex-wrap items-center gap-3">
                                  {isLocked ? (
                                    <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA] flex items-center gap-1.5">
                                      <Lock size={12} className="text-[#182350]" />
                                      <span>Selections Locked</span>
                                    </span>
                                  ) : currentSelectedVesselId ? (
                                    <span className="text-[#2E9B68] flex items-center gap-1">
                                      <Check size={14} /> Fleet Vessel Selected · Step 3 Unlocked Below
                                    </span>
                                  ) : (
                                    <span className="text-[#C2410C] flex items-center gap-1">
                                      ● Step 2: Select 1 fleet vessel below to unlock Step 3 Optimization Plans
                                    </span>
                                  )}
                                  <span className="text-[#D1CDBC] hidden sm:inline">|</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const anyOpen = orderRecs.some((r) => expandedVesselDetails[`${ord.id}-${r.vessel.id}`]);
                                      setExpandedVesselDetails((prev) => {
                                        const next = { ...prev };
                                        orderRecs.forEach((r) => {
                                          next[`${ord.id}-${r.vessel.id}`] = !anyOpen;
                                        });
                                        return next;
                                      });
                                    }}
                                    className="text-xs font-bold text-[#182350] hover:underline flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-md border border-[#182350]/30 hover:border-[#182350] shadow-2xs transition-all"
                                  >
                                    <span>{orderRecs.some((r) => expandedVesselDetails[`${ord.id}-${r.vessel.id}`]) ? "Collapse All Details ⌃" : "Slide Down All Details ⌵"}</span>
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                                {orderRecs.map((rec) => {
                                  const v = rec.vessel;
                                  const isSelected = currentSelectedVesselId === v.id;
                                  const isAssignedToThis = ord.assignedVesselId === v.id;
                                  const isCompared = comparedVesselIds.includes(v.id);
                                  const isDetailsOpen = !!expandedVesselDetails[`${ord.id}-${v.id}`];

                                  return (
                                    <div
                                      key={v.id}
                                      onClick={() => {
                                        if (isLocked) return;
                                        handleSelectVesselForOrder(ord.id, v.id);
                                      }}
                                      className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between relative shadow-xs ${
                                        isLocked
                                          ? isSelected
                                            ? "bg-[#EAF4FE] border-[#182350] ring-2 ring-[#AFD2FA] cursor-default"
                                            : "bg-[#FAFAF5] border-[#D1CDBC] opacity-50 cursor-not-allowed"
                                          : isSelected
                                          ? "bg-[#EAF4FE] border-[#182350] ring-2 ring-[#182350] shadow-md cursor-pointer"
                                          : "bg-white border-[#182350] hover:border-[#AFD2FA] hover:bg-[#FDFBF7] cursor-pointer"
                                      }`}
                                    >
                                      {/* Best Recommendation Badge */}
                                      {rec.isBest && (
                                        <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#182350] text-white shadow-xs flex items-center gap-1 z-10">
                                          <span>★</span> BEST RECOMMENDATION
                                        </div>
                                      )}

                                      {/* Compare Toggle */}
                                      <div className="absolute top-2.5 right-2.5 z-10">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleCompare(v.id);
                                          }}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                                            isCompared
                                              ? "bg-[#182350] text-white font-bold shadow-xs border border-[#182350]"
                                              : "bg-[#FAFAF5]/95 hover:bg-[#F3EBDD] text-[#555C68] hover:text-[#182350] border border-[#D1CDBC]"
                                          }`}
                                          title={isCompared ? "Remove from comparison" : "Add to comparison"}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isCompared}
                                            readOnly
                                            className="w-3 h-3 rounded accent-[#182350] cursor-pointer pointer-events-none"
                                          />
                                          <span>Compare</span>
                                        </button>
                                      </div>

                                      <div>
                                        {/* Vessel Header (Ship Name & Necessary Details) */}
                                        <div className="flex items-start justify-between gap-2 mb-2 pt-5">
                                          <div>
                                            <div className="text-sm font-extrabold text-[#182350] leading-snug">
                                              {v.name}
                                            </div>
                                            <div className="text-xs font-sans text-[#737985]">{v.type}</div>
                                          </div>
                                          <div className="text-right">
                                            <span
                                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-wider inline-block"
                                              style={{
                                                background: rec.matchScore >= 85 ? "#EAF4FE" : "#F3EBDD",
                                                color: "#182350",
                                                border: `1px solid ${rec.matchScore >= 85 ? "#AFD2FA" : "#E6D7C3"}`,
                                              }}
                                            >
                                              {rec.matchScore}% FIT
                                            </span>
                                          </div>
                                        </div>

                                        {/* Key Essential Metric: Available Capacity */}
                                        <div className="flex justify-between items-center bg-[#FAFAF5] px-2.5 py-1.5 rounded-md border border-[#182350]/30 my-2">
                                          <span className="font-bold text-[#182350] text-xs">Available Cap:</span>
                                          <span
                                            className={`font-mono font-extrabold text-xs ${
                                              rec.availableCapacity >= ord.quantity
                                                ? "text-[#2E9B68]"
                                                : "text-[#C94B4B]"
                                            }`}
                                          >
                                            {rec.availableCapacity.toLocaleString()} MT
                                          </span>
                                        </div>

                                        {/* Slide Down Button */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleVesselDetails(`${ord.id}-${v.id}`);
                                          }}
                                          className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between border cursor-pointer mb-2 ${
                                            isDetailsOpen
                                              ? "bg-[#182350] text-white border-[#182350] shadow-xs"
                                              : "bg-[#FAFAF5] hover:bg-[#EAF4FE] text-[#182350] border-[#D1CDBC] hover:border-[#182350]"
                                          }`}
                                          title={isDetailsOpen ? "Collapse vessel details" : "Slide down to view detailed vessel specifications"}
                                        >
                                          <span>{isDetailsOpen ? "Hide Vessel Details" : "Slide Down for Details"}</span>
                                          <ChevronDown
                                            size={14}
                                            className={`transition-transform duration-300 ${
                                              isDetailsOpen ? "rotate-180 text-white" : "text-[#182350]"
                                            }`}
                                          />
                                        </button>

                                        {/* Slide-Down Detailed View */}
                                        <AnimatePresence initial={false}>
                                          {isDetailsOpen && (
                                            <motion.div
                                              key="vessel-details"
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.25, ease: "easeInOut" }}
                                              className="overflow-hidden"
                                            >
                                              {/* Compatibility Pill */}
                                              <div className="mb-2.5 p-1.5 rounded-md bg-[#FAFAF5] border border-[#182350]/25 text-[11px] font-sans text-[#3F4654]">
                                                <div className="font-semibold text-[#182350] truncate">{rec.compatibilityDesc}</div>
                                              </div>

                                              {/* Detailed Vessel Metrics */}
                                              <div className="space-y-1.5 text-xs font-sans border-b border-[#ECE8DF] pb-2.5 mb-2.5">
                                                <div className="flex justify-between">
                                                  <span className="text-[#737985]">Current Location:</span>
                                                  <span className="font-medium text-[#182350] truncate max-w-[130px]">
                                                    {v.currentLocation}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[#737985]">Status:</span>
                                                  <span className="font-semibold text-[#182350]">{v.status}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[#737985]">Total Capacity:</span>
                                                  <span className="font-mono text-[#182350]">
                                                    {v.capacity.toLocaleString()} MT
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[#737985]">Current Load:</span>
                                                  <span className="font-mono text-[#737985]">
                                                    {v.currentLoad.toLocaleString()} MT
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[#737985]">Fuel Type:</span>
                                                  <span className="font-medium text-[#182350]">{v.fuelType}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                  <span className="text-[#737985]">Fuel Level:</span>
                                                  <div className="flex items-center gap-1.5">
                                                    <div className="w-16 h-2 rounded-full bg-[#ECE8DF] overflow-hidden">
                                                      <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                          width: `${v.fuelLevel}%`,
                                                          background: v.fuelLevel > 50 ? "#182350" : "#C94B4B",
                                                        }}
                                                      />
                                                    </div>
                                                    <span className="font-mono font-bold text-[11px] text-[#182350]">
                                                      {v.fuelLevel}%
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[#737985]">Est. Arrival:</span>
                                                  <span className="font-semibold text-[#182350]">{rec.estimatedArrival}</span>
                                                </div>
                                              </div>

                                              {/* Constraints status checklist */}
                                              <div className="space-y-1 text-[11px] font-sans mb-3">
                                                <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">
                                                  Condition & Constraints:
                                                </div>
                                                {rec.constraints.map((c, idx) => (
                                                  <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                                                    <span
                                                      className={`font-bold ${
                                                        c.passed ? "text-[#2E9B68]" : "text-[#C94B4B]"
                                                      }`}
                                                    >
                                                      {c.passed ? "✓" : "✗"}
                                                    </span>
                                                    <span className="text-[#3F4654] leading-tight">{c.label}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>

                                      {/* Vessel Selection Action Button */}
                                      <div className="pt-2">
                                        <button
                                          type="button"
                                          disabled={isLocked && !isSelected}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isLocked) return;
                                            handleSelectVesselForOrder(ord.id, v.id);
                                          }}
                                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold tracking-wide uppercase transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                                            isLocked
                                              ? isSelected
                                                ? "bg-[#182350] text-white cursor-default"
                                                : "bg-[#ECE8DF] text-[#737985] border border-[#D1CDBC] cursor-not-allowed"
                                              : isSelected
                                              ? "bg-[#182350] text-white ring-2 ring-[#B9915E] cursor-pointer"
                                              : "bg-white text-[#182350] border border-[#182350] hover:bg-[#EAF4FE] cursor-pointer"
                                          }`}
                                        >
                                          {isLocked ? (
                                            isSelected ? (
                                              <>
                                                <Lock size={13} />
                                                <span>LOCKED & ASSIGNED</span>
                                              </>
                                            ) : (
                                              <span>LOCKED</span>
                                            )
                                          ) : isSelected ? (
                                            <>
                                              <Check size={14} />
                                              <span>VESSEL SELECTED</span>
                                            </>
                                          ) : (
                                            <span>SELECT THIS VESSEL</span>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Comparison Action Bar / Collapsible Panel for this order */}
                              {comparedVesselIds.length > 0 && (
                                <div className="p-3 rounded-xl bg-[#182350] text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm border border-[#2A376B]">
                                  <div className="flex items-center gap-2.5 text-xs font-sans">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#B9915E] text-white font-mono">
                                      {comparedVesselIds.length} / 4 SELECTED
                                    </span>
                                    <span className="text-[#E2E8F0]">
                                      {comparedVesselIds.length === 1
                                        ? "Check at least 1 more vessel to compare side-by-side"
                                        : `${comparedVesselIds.length} vessels selected for side-by-side comparison`}
                                    </span>
                                    {comparisonWarning && (
                                      <span className="px-2 py-0.5 rounded bg-[#991B1B] text-[#FEE2E2] font-bold text-[11px] ml-2 animate-pulse">
                                        ⚠️ {comparisonWarning}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {comparedVesselIds.length >= 2 && (
                                      <button
                                        type="button"
                                        onClick={() => setShowComparisonPanel(!showComparisonPanel)}
                                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase bg-[#B9915E] hover:bg-[#a37d4d] text-white transition-all shadow-xs"
                                      >
                                        {showComparisonPanel ? "▲ Hide Comparison" : `▼ View Comparison (${comparedVesselIds.length})`}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setComparedVesselIds([]);
                                        setShowComparisonPanel(false);
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#CBD5E1] hover:text-white hover:bg-white/10"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                              )}

                              {showComparisonPanel && comparedList.length >= 2 && (
                                <div className="rounded-xl overflow-hidden border border-[#182350] bg-white shadow-sm">
                                  <div className="px-5 py-3 border-b border-[#182350] bg-[#FAFAF5] flex items-center justify-between">
                                    <div className="text-xs font-extrabold uppercase text-[#182350]">
                                      ⚖ Side-by-Side Vessel Comparison for {ord.id}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setShowComparisonPanel(false)}
                                      className="text-xs font-bold text-[#737985] hover:text-[#182350]"
                                    >
                                      ▲ Hide
                                    </button>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs font-sans border-collapse">
                                      <thead>
                                        <tr className="border-b border-[#182350] bg-[#F7F5EE]">
                                          <th className="py-2.5 px-4 font-bold text-[#182350] w-40">Metric</th>
                                          {comparedList.map((c) => (
                                            <th key={c.vessel.id} className="py-2.5 px-4 font-bold text-[#182350] border-l border-[#ECE8DF]">
                                              {c.vessel.name} ({c.matchScore}% FIT)
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#ECE8DF]">
                                        <tr>
                                          <td className="py-2 px-4 font-bold text-[#182350] bg-[#FAFAF5]">Type</td>
                                          {comparedList.map((c) => (
                                            <td key={c.vessel.id} className="py-2 px-4 border-l border-[#ECE8DF]">{c.vessel.type}</td>
                                          ))}
                                        </tr>
                                        <tr>
                                          <td className="py-2 px-4 font-bold text-[#182350] bg-[#FAFAF5]">Available Cap</td>
                                          {comparedList.map((c) => (
                                            <td key={c.vessel.id} className="py-2 px-4 border-l border-[#ECE8DF] font-mono font-bold text-[#2E9B68]">
                                              {c.availableCapacity.toLocaleString()} MT
                                            </td>
                                          ))}
                                        </tr>
                                        <tr>
                                          <td className="py-2 px-4 font-bold text-[#182350] bg-[#FAFAF5]">Fuel Type</td>
                                          {comparedList.map((c) => (
                                            <td key={c.vessel.id} className="py-2 px-4 border-l border-[#ECE8DF]">{c.vessel.fuelType} ({c.vessel.fuelLevel}%)</td>
                                          ))}
                                        </tr>
                                        <tr>
                                          <td className="py-2 px-4 font-bold text-[#182350] bg-[#FAFAF5]">Action</td>
                                          {comparedList.map((c) => (
                                            <td key={c.vessel.id} className="py-2 px-4 border-l border-[#ECE8DF]">
                                              <button
                                                type="button"
                                                disabled={isLocked}
                                                onClick={() => {
                                                  if (isLocked) return;
                                                  handleSelectVesselForOrder(ord.id, c.vessel.id);
                                                }}
                                                className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                                                  currentSelectedVesselId === c.vessel.id
                                                    ? "bg-[#182350] text-white"
                                                    : isLocked
                                                    ? "bg-[#ECE8DF] text-[#737985] cursor-not-allowed"
                                                    : "bg-white text-[#182350] border border-[#182350]"
                                                }`}
                                              >
                                                {currentSelectedVesselId === c.vessel.id ? "✓ SELECTED" : isLocked ? "LOCKED" : "SELECT"}
                                              </button>
                                            </td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* STEP 3: OPTIMIZATION PLAN SELECTION FOR THIS VESSEL & ORDER */}
                            {currentSelectedVesselId && activeVessel && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-4 pt-2"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-[#182350] text-white flex items-center justify-center text-xs font-bold">
                                      3
                                    </span>
                                    <h2 className="text-sm font-extrabold text-[#182350] uppercase tracking-wide">
                                      Optimization Plan Selection for {activeVessel.name}
                                    </h2>
                                    <span className="text-xs font-sans text-[#737985]">
                                      (Select 1 Operational Route & Speed Profile)
                                    </span>
                                  </div>
                                  <div className="text-xs font-sans font-bold text-[#182350] flex items-center gap-1.5">
                                    {isLocked ? (
                                      <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA] flex items-center gap-1.5">
                                        <Lock size={12} className="text-[#182350]" />
                                        <span>Plan Locked</span>
                                      </span>
                                    ) : currentPlanId ? (
                                      <span className="text-[#2E9B68] flex items-center gap-1">
                                        <Check size={14} /> Plan Selected · Ready for Approval
                                      </span>
                                    ) : (
                                      <span className="text-[#C2410C] flex items-center gap-1">
                                        ● Step 3: Choose 1 route optimization profile
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                  {optimizationPlans.map((plan) => {
                                    const isPlanSelected = currentPlanId === plan.id;
                                    const pStyle = planStyles[plan.id];

                                    return (
                                      <div
                                        key={plan.id}
                                        onClick={() => {
                                          if (isLocked) return;
                                          handleSelectPlanForOrder(ord.id, plan.id);
                                        }}
                                        className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col justify-between relative shadow-xs ${
                                          isLocked
                                            ? isPlanSelected
                                              ? `${pStyle.bgSelected} ${pStyle.borderSelected} ${pStyle.ringSelected} shadow-md cursor-default`
                                              : "bg-[#FAFAF5] border-[#D1CDBC] opacity-50 cursor-not-allowed"
                                            : isPlanSelected
                                            ? `${pStyle.bgSelected} ${pStyle.borderSelected} ${pStyle.ringSelected} shadow-md cursor-pointer`
                                            : `bg-white ${pStyle.border} ${pStyle.bgHover} cursor-pointer`
                                        }`}
                                      >
                                        {/* Plan Header */}
                                        <div>
                                          <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="text-sm font-extrabold text-[#182350]">
                                              {plan.title}
                                            </div>
                                            {isLocked && isPlanSelected ? (
                                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#182350] text-white flex items-center gap-1 shadow-xs">
                                                <Lock size={9} /> LOCKED
                                              </span>
                                            ) : isPlanSelected ? (
                                              <span
                                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white shadow-xs ${pStyle.selectedBadgeBg}`}
                                              >
                                                ● SELECTED
                                              </span>
                                            ) : null}
                                          </div>

                                          {/* Badge */}
                                          <div className="mb-3">
                                            <span
                                              className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider inline-block"
                                              style={{
                                                background: plan.badgeColor.bg,
                                                color: plan.badgeColor.text,
                                                border: `1px solid ${plan.badgeColor.border}`,
                                              }}
                                            >
                                              {plan.badge}
                                            </span>
                                          </div>

                                          {/* Metric Comparison Table Rows */}
                                          <div className="space-y-2 text-xs font-sans border-b border-[#ECE8DF] pb-3 mb-3">
                                            <div className="flex justify-between items-center">
                                              <span className="text-[#737985]">Speed:</span>
                                              <span className="font-mono font-bold text-[#182350]">
                                                {plan.speed}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-[#737985]">ETA Window:</span>
                                              <span className="font-semibold text-[#182350] text-[11px] truncate max-w-[130px]">
                                                {plan.eta}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-[#737985]">Fuel Burn:</span>
                                              <span className="font-mono text-[#182350]">
                                                {plan.fuelConsumption}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-[#737985]">Estimated Cost:</span>
                                              <span className="font-mono font-extrabold text-[#182350]">
                                                {plan.cost}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white px-2 py-1 rounded border border-[#182350]/20">
                                              <span className="font-bold text-[#182350]">GHG Emissions:</span>
                                              <span className="font-mono font-bold text-[11px] text-[#2E9B68]">
                                                {plan.ghg}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Tagline */}
                                          <p className="text-[11px] text-[#555C68] font-sans leading-relaxed mb-3">
                                            {plan.tagline}
                                          </p>
                                        </div>

                                        {/* Select Action Button */}
                                        <div className="pt-2">
                                          <button
                                            type="button"
                                            disabled={isLocked && !isPlanSelected}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isLocked) return;
                                              handleSelectPlanForOrder(ord.id, plan.id);
                                            }}
                                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold tracking-wide uppercase transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                                              isLocked
                                                ? isPlanSelected
                                                  ? `${pStyle.selectedButtonBg} text-white cursor-default`
                                                  : "bg-[#ECE8DF] text-[#737985] border border-[#D1CDBC] cursor-not-allowed"
                                                : isPlanSelected
                                                ? `${pStyle.selectedButtonBg} text-white cursor-pointer`
                                                : `bg-white text-[#182350] border-2 ${pStyle.border} hover:bg-[#FDFBF7] cursor-pointer`
                                            }`}
                                          >
                                            {isLocked ? (
                                              isPlanSelected ? (
                                                <>
                                                  <Lock size={13} />
                                                  <span>LOCKED</span>
                                                </>
                                              ) : (
                                                <span>LOCKED</span>
                                              )
                                            ) : isPlanSelected ? (
                                              <>
                                                <Check size={14} />
                                                <span>PLAN SELECTED</span>
                                              </>
                                            ) : (
                                              <span>SELECT THIS PLAN</span>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}

                            {/* STEP 4: FINAL CONFIRMATION & OPERATIONAL APPROVAL */}
                            <div
                              className="p-5 rounded-xl shadow-xs border border-[#182350]"
                              style={{ background: "#FFFFFF" }}
                            >
                              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#ECE8DF]">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-[#182350] text-white flex items-center justify-center text-xs font-bold">
                                    4
                                  </span>
                                  <h2 className="text-sm font-extrabold text-[#182350] uppercase tracking-wide">
                                    Assignment Confirmation & Operational Approval
                                  </h2>
                                </div>
                                {isLocked && (
                                  <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA] flex items-center gap-1.5 font-mono">
                                    <Lock size={12} className="text-[#182350]" />
                                    <span>LOCKED & DISPATCHED</span>
                                  </span>
                                )}
                              </div>

                              {isLocked ? (
                                /* Approved & Locked State Banner */
                                <div className="p-5 rounded-xl bg-[#EAF4FE] border border-[#AFD2FA] space-y-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-[#182350] text-white flex items-center justify-center text-lg font-bold shadow-xs">
                                        ✓
                                      </div>
                                      <div>
                                        <div className="text-sm font-extrabold text-[#182350] flex items-center gap-2">
                                          <span>Assignment Approved & Locked</span>
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#182350] text-white font-mono">
                                            STATUS: ASSIGNED
                                          </span>
                                        </div>
                                        <div className="text-xs text-[#737985] font-sans mt-0.5">
                                          Order <span className="font-mono font-bold text-[#182350]">{ord.id}</span> is securely locked and assigned to{" "}
                                          <span className="font-bold text-[#182350]">{activeVessel?.name || ord.assignedVesselName || orderApproval?.vesselName}</span> under the{" "}
                                          <span className="font-bold text-[#182350]">{activePlan?.title || ord.assignedPlanTitle || orderApproval?.planTitle}</span>. Captain {activeVessel?.captain || "Designated Master"} has received the voyage manifest.
                                        </div>
                                      </div>
                                    </div>
                                    {/* Edit Button */}
                                    <div className="text-right flex-shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(ord.id)}
                                        className="px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase bg-[#182350] hover:bg-[#233373] text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                                      >
                                        <Pencil size={14} />
                                        <span>Edit Assignment</span>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="pt-3 border-t border-[#AFD2FA]/50 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-sans">
                                    <div>
                                      <span className="text-[#737985]">Order:</span>{" "}
                                      <span className="font-bold text-[#182350]">{ord.id}</span>
                                    </div>
                                    <div>
                                      <span className="text-[#737985]">Vessel:</span>{" "}
                                      <span className="font-bold text-[#182350]">{activeVessel?.name || ord.assignedVesselName || orderApproval?.vesselName}</span>
                                    </div>
                                    <div>
                                      <span className="text-[#737985]">Cargo:</span>{" "}
                                      <span className="font-bold text-[#182350]">{ord.quantity.toLocaleString()} {ord.unit}</span>
                                    </div>
                                    <div>
                                      <span className="text-[#737985]">Plan:</span>{" "}
                                      <span className="font-bold text-[#182350]">{activePlan?.title || ord.assignedPlanTitle || orderApproval?.planTitle}</span>
                                    </div>
                                    <div>
                                      <span className="text-[#737985]">ETA:</span>{" "}
                                      <span className="font-bold text-[#182350]">{activePlan?.eta || "Verified On-Time"}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Pre-Approval Assignment Summary Box & Error Display & Approve Button */
                                <div className="space-y-4">
                                  {isEditing && (
                                    <div className="p-3 rounded-lg bg-[#FEF9C3] border border-[#FDE047] text-[#854D0E] flex items-center justify-between text-xs font-sans">
                                      <div className="flex items-center gap-2">
                                        <Unlock size={14} className="text-[#854D0E]" />
                                        <span className="font-bold">Editing Mode Active:</span>
                                        <span>You can modify the vessel selection in Step 2 or route profile in Step 3. Click "APPROVE ASSIGNMENT" below to lock changes.</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelEdit(ord.id)}
                                        className="font-bold hover:underline ml-2 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}

                                  <div className="p-4 rounded-lg bg-[#FAFAF5] border border-[#182350]">
                                    <div className="text-xs font-bold uppercase tracking-wider text-[#182350] mb-3">
                                      Pre-Approval Assignment Summary:
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-sans">
                                      <div className={`p-3 rounded-md bg-white border ${activeVessel ? "border-[#182350]" : "border-[#DC2626]/40 bg-[#FEF2F2]/30"}`}>
                                        <div className="text-[#737985] text-[10px] uppercase font-bold">1 & 2: Order → Vessel</div>
                                        <div className="font-bold text-[#182350] mt-0.5 truncate">
                                          {ord.id} → {activeVessel ? activeVessel.name : <span className="text-[#DC2626] italic">None Selected</span>}
                                        </div>
                                        <div className="text-[11px] text-[#737985] mt-0.5 truncate">
                                          {activeVessel ? activeVessel.type : "Select vessel in Step 2"}
                                        </div>
                                      </div>

                                      <div className="p-3 rounded-md bg-white border border-[#182350]">
                                        <div className="text-[#737985] text-[10px] uppercase font-bold">Cargo Specification</div>
                                        <div className="font-bold text-[#182350] mt-0.5">
                                          {ord.quantity.toLocaleString()} {ord.unit}
                                        </div>
                                        <div className="text-[11px] text-[#737985] mt-0.5 truncate">{ord.cargo}</div>
                                      </div>

                                      <div className={`p-3 rounded-md bg-white border ${activePlan ? "border-[#182350]" : "border-[#DC2626]/40 bg-[#FEF2F2]/30"}`}>
                                        <div className="text-[#737985] text-[10px] uppercase font-bold">3: Selected Plan & Speed</div>
                                        <div className="font-bold text-[#182350] mt-0.5">
                                          {activePlan ? activePlan.title : <span className="text-[#DC2626] italic">None Selected</span>}
                                        </div>
                                        <div className="text-[11px] text-[#2E9B68] font-semibold mt-0.5 truncate">
                                          {activePlan ? `Speed: ${activePlan.speed} · ETA: ${activePlan.eta}` : "Select plan in Step 3"}
                                        </div>
                                      </div>

                                      <div className="p-3 rounded-md bg-white border border-[#182350]">
                                        <div className="text-[#737985] text-[10px] uppercase font-bold">Fuel & Cost Profile</div>
                                        <div className="font-bold text-[#182350] mt-0.5">
                                          {activePlan ? activePlan.cost : "Pending Plan"}
                                        </div>
                                        <div className="text-[11px] text-[#737985] mt-0.5 truncate">
                                          {activeVessel ? `${activeVessel.fuelType} (${activeVessel.fuelLevel}%)` : "Pending Vessel"}
                                        </div>
                                      </div>

                                      <div className="p-3 rounded-md bg-white border border-[#182350]">
                                        <div className="text-[#737985] text-[10px] uppercase font-bold">Key Constraints</div>
                                        <div className="font-semibold text-[#2E9B68] mt-0.5 truncate">
                                          {activeVessel && activeRec ? (activeRec.availableCapacity >= ord.quantity ? "✓ Capacity Verified" : "⚠️ Limited Capacity") : "Pending Verification"}
                                        </div>
                                        <div className="text-[11px] text-[#2E9B68] mt-0.5 truncate">
                                          {activeVessel ? "✓ Route Feasible" : "Pending Selection"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Prominent Error Message Banner if validation fails */}
                                  {orderError && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="p-4 rounded-lg bg-[#FEF2F2] border-2 border-[#DC2626] text-[#991B1B] flex items-start gap-3 shadow-xs"
                                    >
                                      <AlertCircle size={20} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
                                      <div className="text-xs font-sans">
                                        <div className="font-extrabold uppercase tracking-wide text-[#991B1B] flex items-center gap-1.5">
                                          <span>Approval Blocked: Selection Incomplete</span>
                                        </div>
                                        <div className="mt-1 font-semibold text-[#7F1D1D] leading-relaxed">
                                          {orderError}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}

                                  {/* Action Button & Disclaimer */}
                                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                    <div className="text-xs font-sans text-[#737985]">
                                      {activeVessel && activePlan ? (
                                        <span>
                                          Operator Approval assigns <span className="font-bold text-[#182350]">{activeVessel.name}</span> to Order <span className="font-bold text-[#182350]">{ord.id}</span> under the <span className="font-bold text-[#182350]">{activePlan.title}</span> and locks the fleet allocation plan.
                                        </span>
                                      ) : (
                                        <span className="text-[#C2410C] font-semibold flex items-center gap-1">
                                          <AlertTriangle size={14} /> Complete selections in Step 1 (Order), Step 2 (Fleet Vessel), and Step 3 (Optimization Plan) before approving.
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleApproveAssignmentForOrder(ord)}
                                      className="w-full sm:w-auto px-8 py-3 rounded-lg text-sm font-extrabold tracking-wide uppercase shadow-sm cursor-pointer transition-all duration-150 flex items-center justify-center gap-2 bg-[#182350] hover:bg-[#233373] text-white"
                                    >
                                      <span>APPROVE ASSIGNMENT</span>
                                      <span>→</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
