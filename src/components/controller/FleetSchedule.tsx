import { useState, useMemo } from "react";
import { Vessel } from "../../data/fleet";
import { OrderItem } from "./OrdersFlow";
import {
  Calendar,
  Clock,
  Filter,
  Ship,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Anchor,
  Compass,
  ArrowUpDown,
  Search,
  ExternalLink,
  Info,
  X,
} from "lucide-react";

export type OperationalState =
  | "At Sea / Underway"
  | "In Port / Loading-Unloading"
  | "At Berth / Resting"
  | "Under Maintenance"
  | "Awaiting Assignment / Idle";

export interface ScheduleBlock {
  id: string;
  vesselId: string;
  vesselName: string;
  state: OperationalState;
  origin: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  orderId?: string;
  customer?: string;
  cargoType?: string;
  cargoQuantity?: string;
  fuelType: string;
  captain: string;
  notes?: string;
}

interface Props {
  vessels: Vessel[];
  orders: OrderItem[];
  onSelectVessel?: (vesselId: string) => void;
  onNavigateToOrders?: () => void;
}

// Operational state styling tokens based strictly on Green Fleet palette
export const OPERATIONAL_STATE_STYLES: Record<
  OperationalState,
  { bg: string; text: string; border: string; dot: string; label: string; icon: string }
> = {
  "At Sea / Underway": {
    bg: "#EAF9F1",
    text: "#185C3A",
    border: "#A7E8C5",
    dot: "#2E9B68",
    label: "Underway",
    icon: "🌊",
  },
  "In Port / Loading-Unloading": {
    bg: "#EAF4FE",
    text: "#1F0E06",
    border: "#AFD2FA",
    dot: "#38BDF8",
    label: "In Port",
    icon: "⚓",
  },
  "At Berth / Resting": {
    bg: "#FBF5EB",
    text: "#8A6635",
    border: "#F3DEBF",
    dot: "#B9915E",
    label: "At Berth",
    icon: "🛳",
  },
  "Under Maintenance": {
    bg: "#FDF0EE",
    text: "#932314",
    border: "#FAC4BD",
    dot: "#C94B4B",
    label: "Maintenance",
    icon: "🔧",
  },
  "Awaiting Assignment / Idle": {
    bg: "#F1F2F4",
    text: "#4A5260",
    border: "#D4D8DD",
    dot: "#737985",
    label: "Idle / Awaiting",
    icon: "⏳",
  },
};

const FUEL_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  LNG: { bg: "#EAF4FE", text: "#1F0E06", border: "#AFD2FA" },
  Methanol: { bg: "#E8F5E9", text: "#1B5E20", border: "#A5D6A7" },
  Ammonia: { bg: "#FFF8E1", text: "#854D0E", border: "#FFE082" },
  Hydrogen: { bg: "#E0F7FA", text: "#006064", border: "#80DEEA" },
  Conventional: { bg: "#F1F2F4", text: "#4A5260", border: "#D4D8DD" },
};

type SortField = "name" | "status" | "route" | "order" | "departure" | "arrival" | "maintenance";
type SortOrder = "asc" | "desc";

export default function FleetSchedule({
  vessels,
  orders,
  onSelectVessel,
  onNavigateToOrders,
}: Props) {
  // View Switcher: "timeline" or "list" (timeline by default per requirement)
  const [activeView, setActiveView] = useState<"timeline" | "list">("timeline");

  // Date Range selector: "week", "month", "custom"
  const [dateRange, setDateRange] = useState<"week" | "month" | "custom">("month");
  const [customStart, setCustomStart] = useState<string>("2026-09-01");
  const [customEnd, setCustomEnd] = useState<string>("2026-09-30");

  // Filters
  const [filterVesselType, setFilterVesselType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterFuel, setFilterFuel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination for 15+ vessels
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Sorting for List View
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Modal / Popover state for timeline block details
  const [activeBlock, setActiveBlock] = useState<ScheduleBlock | null>(null);

  // Derive consolidated vessel schedules merging live orders
  const vesselSchedules = useMemo(() => {
    return vessels.map((v) => {
      // Check if this vessel has an assigned order
      const assignedOrder = orders.find(
        (o) => o.assignedVesselId === v.id || o.assignedVesselName === v.name
      );

      // Determine operational state
      let opState: OperationalState = v.operationalState || "At Sea / Underway";
      if (v.status === "In Port") opState = "In Port / Loading-Unloading";
      else if (v.status === "At Anchor") opState = "At Berth / Resting";
      else if (v.name.includes("Bio Trident") || v.name.includes("Nordic Spirit")) {
        opState = "Under Maintenance";
      } else if (v.name.includes("Hydro Zenith") || v.name.includes("Southern Cross")) {
        opState = "Awaiting Assignment / Idle";
      }

      // If an order was just assigned in the Orders page, it activates the vessel for voyage
      if (assignedOrder) {
        opState = "At Sea / Underway";
      }

      const departureDate = assignedOrder?.loadDate || v.departureDate || "2026-09-06";
      const estimatedArrival = assignedOrder?.deliveryDeadline || v.estimatedArrival || "2026-09-24";
      const currentRoute = assignedOrder
        ? `${assignedOrder.origin} → ${assignedOrder.destination}`
        : `${v.origin} → ${v.destination}`;
      const cargoSummary = assignedOrder
        ? `${assignedOrder.quantity.toLocaleString()} ${assignedOrder.unit} ${assignedOrder.cargo}`
        : `${v.currentLoad.toLocaleString()} MT Cargo`;

      // Timeline blocks for this vessel
      const blocks: ScheduleBlock[] = [];

      // Primary Itinerary Block
      blocks.push({
        id: `blk-${v.id}-voyage`,
        vesselId: v.id,
        vesselName: v.name,
        state: opState,
        origin: assignedOrder?.origin || v.origin,
        destination: assignedOrder?.destination || v.destination,
        startDate: departureDate,
        endDate: estimatedArrival,
        orderId: assignedOrder?.id || v.assignedOrderId,
        customer: assignedOrder?.customer,
        cargoType: assignedOrder?.cargoType || (v.holds[0]?.cargoType ?? "Specialized Cargo"),
        cargoQuantity: cargoSummary,
        fuelType: v.fuelType,
        captain: v.captain,
        notes: assignedOrder
          ? `Priority: ${assignedOrder.priority} Consignment. Optimization Plan: ${assignedOrder.assignedPlanTitle || "Pareto Balanced"}`
          : `Regular Scheduled Commercial Transit. SOG: ${v.speed} kn`,
      });

      // If vessel has scheduled maintenance in September/October, add a second block
      if (v.nextMaintenanceDate && v.nextMaintenanceDate.startsWith("2026-09-")) {
        blocks.push({
          id: `blk-${v.id}-maint`,
          vesselId: v.id,
          vesselName: v.name,
          state: "Under Maintenance",
          origin: v.currentLocation,
          destination: "Drydock Facility",
          startDate: v.nextMaintenanceDate,
          endDate: "2026-09-30",
          fuelType: v.fuelType,
          captain: v.captain,
          notes: "Scheduled hull fouling cleaning, cryogenic valve overhaul & propulsion inspection.",
        });
      }

      return {
        vessel: v,
        assignedOrder,
        opState,
        departureDate,
        estimatedArrival,
        currentRoute,
        cargoSummary,
        blocks,
      };
    });
  }, [vessels, orders]);

  // Filtered vessels
  const filteredSchedules = useMemo(() => {
    return vesselSchedules.filter((item) => {
      const { vessel, opState } = item;
      const matchesSearch =
        vessel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vessel.currentLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vessel.captain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.assignedOrder?.id || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        filterVesselType === "ALL" || vessel.type.toLowerCase().includes(filterVesselType.toLowerCase());

      const matchesStatus = filterStatus === "ALL" || opState === filterStatus;

      const matchesFuel =
        filterFuel === "ALL" || vessel.fuelType.toLowerCase() === filterFuel.toLowerCase();

      return matchesSearch && matchesType && matchesStatus && matchesFuel;
    });
  }, [vesselSchedules, searchQuery, filterVesselType, filterStatus, filterFuel]);

  // Sorted list for List View
  const sortedSchedules = useMemo(() => {
    return [...filteredSchedules].sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.vessel.name.localeCompare(b.vessel.name);
      } else if (sortField === "status") {
        comparison = a.opState.localeCompare(b.opState);
      } else if (sortField === "route") {
        comparison = a.currentRoute.localeCompare(b.currentRoute);
      } else if (sortField === "order") {
        const oA = a.assignedOrder?.id || "";
        const oB = b.assignedOrder?.id || "";
        comparison = oA.localeCompare(oB);
      } else if (sortField === "departure") {
        comparison = a.departureDate.localeCompare(b.departureDate);
      } else if (sortField === "arrival") {
        comparison = a.estimatedArrival.localeCompare(b.estimatedArrival);
      } else if (sortField === "maintenance") {
        comparison = (a.vessel.nextMaintenanceDate || "").localeCompare(b.vessel.nextMaintenanceDate || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredSchedules, sortField, sortOrder]);

  // Pagination slice
  const paginatedSchedules = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedSchedules.slice(startIdx, startIdx + pageSize);
  }, [sortedSchedules, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedSchedules.length / pageSize) || 1;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Timeline Date calculations
  // Current anchor date is Sep 08, 2026
  const timelineDates = useMemo(() => {
    if (dateRange === "week") {
      // 7 days: Sep 07 to Sep 13, 2026
      return [
        { day: "Mon", date: "07", fullDate: "2026-09-07", isToday: false },
        { day: "Tue", date: "08", fullDate: "2026-09-08", isToday: true },
        { day: "Wed", date: "09", fullDate: "2026-09-09", isToday: false },
        { day: "Thu", date: "10", fullDate: "2026-09-10", isToday: false },
        { day: "Fri", date: "11", fullDate: "2026-09-11", isToday: false },
        { day: "Sat", date: "12", fullDate: "2026-09-12", isToday: false },
        { day: "Sun", date: "13", fullDate: "2026-09-13", isToday: false },
      ];
    } else if (dateRange === "month") {
      // 30 days of September 2026
      const days = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 1; i <= 30; i++) {
        const dStr = i < 10 ? `0${i}` : `${i}`;
        const dayIdx = (i + 1) % 7;
        days.push({
          day: dayNames[dayIdx],
          date: dStr,
          fullDate: `2026-09-${dStr}`,
          isToday: i === 8,
        });
      }
      return days;
    } else {
      // Custom range: between customStart and customEnd (capped at 30 days)
      const days = [];
      const s = new Date(customStart);
      const e = new Date(customEnd);
      const diffDays = Math.min(30, Math.max(7, Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24))));
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (let i = 0; i <= diffDays; i++) {
        const cur = new Date(s.getTime() + i * 24 * 3600 * 1000);
        const iso = cur.toISOString().split("T")[0];
        const parts = iso.split("-");
        days.push({
          day: dayNames[cur.getDay()],
          date: parts[2],
          fullDate: iso,
          isToday: iso === "2026-09-08",
        });
      }
      return days;
    }
  }, [dateRange, customStart, customEnd]);

  // Calculate timeline block positioning (% start and % width)
  const calculateBlockPosition = (block: ScheduleBlock) => {
    const rangeStart = timelineDates[0].fullDate;
    const rangeEnd = timelineDates[timelineDates.length - 1].fullDate;
    const totalDays = timelineDates.length;

    const bStart = block.startDate < rangeStart ? rangeStart : block.startDate;
    const bEnd = block.endDate > rangeEnd ? rangeEnd : block.endDate;

    if (bEnd < rangeStart || bStart > rangeEnd) {
      return null;
    }

    const startIndex = timelineDates.findIndex((d) => d.fullDate >= bStart);
    const endIndex = timelineDates.findIndex((d) => d.fullDate >= bEnd);

    const leftCol = startIndex >= 0 ? startIndex : 0;
    const rightCol = endIndex >= 0 ? endIndex + 1 : totalDays;

    const leftPercent = (leftCol / totalDays) * 100;
    const widthPercent = Math.max(6, ((rightCol - leftCol) / totalDays) * 100);

    return {
      left: `${leftPercent}%`,
      width: `${Math.min(100 - leftPercent, widthPercent)}%`,
    };
  };

  // Upcoming Fleet Events (next 5-8 events sorted chronologically)
  const upcomingEvents = useMemo(() => {
    const events: {
      id: string;
      vesselName: string;
      title: string;
      date: string;
      badgeText: string;
      type: "arrival" | "departure" | "maintenance" | "bunker";
    }[] = [
      {
        id: "ev-1",
        vesselName: "MV Aurora Breeze",
        title: "Discharging vehicles at Rotterdam Green Terminal",
        date: "Today, Sep 08",
        badgeText: "In Port",
        type: "arrival",
      },
      {
        id: "ev-2",
        vesselName: "MV Baltic Falcon",
        title: "Scheduled departure from Chennai to Port Klang",
        date: "Sep 10, 2026",
        badgeText: "Departure",
        type: "departure",
      },
      {
        id: "ev-3",
        vesselName: "MV Quantum Star",
        title: "Arrives at Port of Fujairah for chemical consignment",
        date: "Sep 14, 2026",
        badgeText: "Arrival ETA",
        type: "arrival",
      },
      {
        id: "ev-4",
        vesselName: "MV Nordic Spirit",
        title: "Completing periodic cryogenic valve overhaul at Dubai",
        date: "Sep 15, 2026",
        badgeText: "Drydock",
        type: "maintenance",
      },
      {
        id: "ev-5",
        vesselName: "MV Atlas Carrier",
        title: "Berthing and coal loading at Chittagong Outer Anchorage",
        date: "Sep 16, 2026",
        badgeText: "Arrival ETA",
        type: "arrival",
      },
      {
        id: "ev-6",
        vesselName: "MV Bio Trident",
        title: "Entering Cochin Shipyard for IMO CII Class-A hull servicing",
        date: "Sep 18, 2026",
        badgeText: "Maintenance",
        type: "maintenance",
      },
      {
        id: "ev-7",
        vesselName: "MV Eco Pioneer",
        title: "Bunker refueling (Green Methanol) at Port of Singapore",
        date: "Sep 22, 2026",
        badgeText: "Bunkering",
        type: "bunker",
      },
      {
        id: "ev-8",
        vesselName: "MV Green Horizon",
        title: "Expected arrival at Port of Rotterdam (ORD-2026-0891)",
        date: "Sep 24, 2026",
        badgeText: "Flagship ETA",
        type: "arrival",
      },
    ];
    return events;
  }, []);

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto pb-10 select-none">
      {/* ── 1. Page Header with Title, View Switcher, Date Ranges & Compact Filters ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#1F0E06] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Live Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F0E06] text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5 text-[#AFD2FA]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1F0E06] tracking-tight font-sans">
                Fleet Schedule
              </h1>
              <p className="text-xs text-[#737985] font-sans mt-0.5">
                Single operational matrix tracking vessel voyages, assigned consignments, berthing windows & drydock maintenance.
              </p>
            </div>
          </div>

          {/* View Switcher: [Timeline View] [List View] */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="inline-flex rounded-xl p-1 bg-[#F1F2F4] border border-[#D4D8DD]">
              <button
                onClick={() => setActiveView("timeline")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                  activeView === "timeline"
                    ? "bg-[#1F0E06] text-white shadow-2xs"
                    : "text-[#4A5260] hover:text-[#1F0E06]"
                }`}
              >
                <Clock size={14} />
                <span>Timeline View</span>
              </button>
              <button
                onClick={() => setActiveView("list")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                  activeView === "list"
                    ? "bg-[#1F0E06] text-white shadow-2xs"
                    : "text-[#4A5260] hover:text-[#1F0E06]"
                }`}
              >
                <Ship size={14} />
                <span>List View</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Subheader Controls: Date Range & Minimal Compact Filters ── */}
        <div className="pt-3 border-t border-[#ECE8DF] flex flex-wrap items-center justify-between gap-3">
          {/* Left: Date Range Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-[#737985] uppercase tracking-wider">
              Date Horizon:
            </span>
            <div className="inline-flex rounded-lg p-0.5 bg-[#FAFAF5] border border-[#1F0E06]">
              <button
                onClick={() => setDateRange("week")}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                  dateRange === "week"
                    ? "bg-[#1F0E06] text-white shadow-2xs"
                    : "text-[#4A5260] hover:text-[#1F0E06]"
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setDateRange("month")}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                  dateRange === "month"
                    ? "bg-[#1F0E06] text-white shadow-2xs"
                    : "text-[#4A5260] hover:text-[#1F0E06]"
                }`}
              >
                This Month (Sep 2026)
              </button>
              <button
                onClick={() => setDateRange("custom")}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                  dateRange === "custom"
                    ? "bg-[#1F0E06] text-white shadow-2xs"
                    : "text-[#4A5260] hover:text-[#1F0E06]"
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Custom Range pickers */}
            {dateRange === "custom" && (
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-[#1F0E06] text-xs font-mono">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="outline-none text-[#1F0E06] cursor-pointer"
                />
                <span className="text-[#737985]">→</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="outline-none text-[#1F0E06] cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Right: Minimal Compact Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search flagship, route, order..."
                className="w-48 sm:w-56 px-2.5 py-1.5 pl-7 text-xs font-sans rounded-lg bg-white border border-[#1F0E06] text-[#1F0E06] placeholder:text-[#94A3B8] outline-none focus:border-[#AFD2FA]"
              />
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#94A3B8]" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-[#94A3B8] hover:text-[#1F0E06] cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Vessel Type Filter */}
            <select
              value={filterVesselType}
              onChange={(e) => {
                setFilterVesselType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-sans font-semibold bg-white border border-[#1F0E06] text-[#1F0E06] outline-none cursor-pointer"
            >
              <option value="ALL">All Vessel Types</option>
              <option value="LNG">LNG Carrier</option>
              <option value="Bulk">Bulk Carrier</option>
              <option value="Chemical">Chemical Tanker</option>
              <option value="Container">Container Ship</option>
              <option value="Ro-Ro">Ro-Ro / Multipurpose</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-sans font-semibold bg-white border border-[#1F0E06] text-[#1F0E06] outline-none cursor-pointer"
            >
              <option value="ALL">All Operational Statuses</option>
              <option value="At Sea / Underway">At Sea / Underway</option>
              <option value="In Port / Loading-Unloading">In Port / Loading-Unloading</option>
              <option value="At Berth / Resting">At Berth / Resting</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Awaiting Assignment / Idle">Awaiting Assignment / Idle</option>
            </select>

            {/* Fuel Filter */}
            <select
              value={filterFuel}
              onChange={(e) => {
                setFilterFuel(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-sans font-semibold bg-white border border-[#1F0E06] text-[#1F0E06] outline-none cursor-pointer"
            >
              <option value="ALL">All Fuels</option>
              <option value="LNG">LNG</option>
              <option value="Methanol">Methanol</option>
              <option value="Ammonia">Ammonia</option>
              <option value="Hydrogen">Hydrogen</option>
              <option value="Conventional">Conventional</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 2. Main Work Area: TIMELINE VIEW OR LIST VIEW ── */}
      {activeView === "timeline" ? (
        /* ── GANTT TIMELINE VIEW ── */
        <div className="bg-white rounded-2xl border border-[#1F0E06] shadow-xs overflow-hidden flex flex-col">
          {/* Timeline Status Legend Bar */}
          <div
            style={{ background: "#1F0E06" }}
            className="px-4 py-2.5 border-b border-[#AFD2FA]/20 flex flex-wrap items-center justify-between gap-3 text-xs text-white"
          >
            <div className="flex items-center gap-1.5 font-mono font-bold text-[#AFD2FA] uppercase tracking-wider text-[11px]">
              <Info size={13} className="text-[#AFD2FA]" />
              <span>Operational States:</span>
            </div>
            <div className="flex items-center gap-3.5 flex-wrap text-[11px] font-sans">
              {(
                [
                  "At Sea / Underway",
                  "In Port / Loading-Unloading",
                  "At Berth / Resting",
                  "Under Maintenance",
                  "Awaiting Assignment / Idle",
                ] as OperationalState[]
              ).map((state) => {
                const style = OPERATIONAL_STATE_STYLES[state];
                return (
                  <div key={state} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-white/30"
                      style={{ background: style.dot }}
                    />
                    <span className="font-semibold text-white/95">{style.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] font-mono text-[#AFD2FA]/90 font-bold">
              Showing {paginatedSchedules.length} of {sortedSchedules.length} vessels
            </div>
          </div>

          {/* Horizontal Gantt Matrix Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[950px]">
              {/* Timeline Header Row (Vessel Label on Left, Time Columns on Right) */}
              <div
                style={{ background: "#1F0E06" }}
                className="flex border-b border-white/15 text-white"
              >
                {/* Fixed Left Header Column */}
                <div className="w-64 sm:w-72 p-3 font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-between border-r border-white/20">
                  <span>Flagship Vessel</span>
                  <span className="text-[10px] font-mono text-[#AFD2FA]">Type / Spec</span>
                </div>

                {/* Right Timeline Days Header */}
                <div className="flex-1 flex relative">
                  {timelineDates.map((d, i) => (
                    <div
                      key={d.fullDate}
                      className={`flex-1 py-2 px-1 text-center border-r border-white/10 last:border-r-0 flex flex-col justify-center items-center ${
                        d.isToday ? "bg-[#B9915E]/30 font-bold" : ""
                      }`}
                    >
                      <span className="text-[9px] font-mono uppercase text-white/70">
                        {d.day}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold leading-tight ${
                          d.isToday
                            ? "bg-[#B9915E] text-white w-5 h-5 rounded-full flex items-center justify-center shadow-xs"
                            : ""
                        }`}
                      >
                        {d.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Rows per Vessel */}
              <div className="divide-y divide-[#ECE8DF]">
                {paginatedSchedules.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#737985] font-sans">
                    No flagships found matching current filters.
                  </div>
                ) : (
                  paginatedSchedules.map((item) => {
                    const { vessel, assignedOrder, blocks } = item;
                    const fuelStyle = FUEL_BADGES[vessel.fuelType] || FUEL_BADGES.LNG;

                    return (
                      <div
                        key={vessel.id}
                        className="flex hover:bg-[#FAFAF5]/70 transition-colors group relative"
                      >
                        {/* Left Vessel Card Info */}
                        <div
                          onClick={() => onSelectVessel?.(vessel.id)}
                          className="w-64 sm:w-72 p-3 border-r border-[#ECE8DF] flex flex-col justify-center gap-1 cursor-pointer group-hover:bg-[#EAF4FE]/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1F0E06] group-hover:text-[#2563EB] transition-colors truncate">
                              {vessel.name}
                            </span>
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold"
                              style={{
                                background: fuelStyle.bg,
                                color: fuelStyle.text,
                                borderColor: fuelStyle.border,
                              }}
                            >
                              {vessel.fuelType}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-[#737985] font-mono">
                            <span>{vessel.type}</span>
                            <span>{vessel.imo}</span>
                          </div>

                          {/* Quick active order indicator if present */}
                          {assignedOrder ? (
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-mono text-[#185C3A] font-bold">
                              <CheckCircle2 size={11} className="text-[#2E9B68]" />
                              <span className="truncate">{assignedOrder.id}</span>
                            </div>
                          ) : (
                            <div className="mt-0.5 text-[10px] font-mono text-[#737985] truncate">
                              Master: {vessel.captain}
                            </div>
                          )}
                        </div>

                        {/* Right Horizontal Gantt Track */}
                        <div className="flex-1 relative flex items-center min-h-[64px] px-1">
                          {/* Vertical Column Grid Guidelines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {timelineDates.map((d) => (
                              <div
                                key={d.fullDate}
                                className={`flex-1 border-r border-[#F1F2F4] last:border-r-0 ${
                                  d.isToday ? "bg-[#B9915E]/5" : ""
                                }`}
                              />
                            ))}
                          </div>

                          {/* Vertical Red/Gold "Today" Line Marker */}
                          {timelineDates.some((d) => d.isToday) && (
                            <div
                              className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
                              style={{
                                left: `${
                                  ((timelineDates.findIndex((d) => d.isToday) + 0.5) /
                                    timelineDates.length) *
                                  100
                                }%`,
                              }}
                            >
                              <div className="w-0.5 h-full bg-[#B9915E]/60" />
                            </div>
                          )}

                          {/* Render Schedule Blocks */}
                          {blocks.map((block) => {
                            const pos = calculateBlockPosition(block);
                            if (!pos) return null;

                            const style = OPERATIONAL_STATE_STYLES[block.state];

                            return (
                              <div
                                key={block.id}
                                onClick={() => setActiveBlock(block)}
                                style={{
                                  left: pos.left,
                                  width: pos.width,
                                  background: style.bg,
                                  color: style.text,
                                  borderColor: style.border,
                                }}
                                className="absolute h-9 rounded-lg border shadow-2xs px-2.5 py-1 flex items-center justify-between gap-1.5 cursor-pointer z-10 transition-all hover:scale-[1.01] hover:shadow-md hover:z-30 group/block overflow-hidden"
                                title={`Click to view schedule details for ${block.vesselName}`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ background: style.dot }}
                                  />
                                  <span className="text-[11px] font-bold font-sans truncate">
                                    {style.label}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono opacity-80 truncate hidden sm:inline">
                                  {block.origin.split(",")[0]} → {block.destination.split(",")[0]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Timeline Pagination & Footer */}
          <div className="p-3 bg-[#FAFAF5] border-t border-[#ECE8DF] flex items-center justify-between text-xs font-mono text-[#737985]">
            <div>
              Showing {paginatedSchedules.length} of {sortedSchedules.length} vessels (Page {currentPage} of {totalPages})
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md border border-[#1F0E06] bg-white text-[#1F0E06] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[#EAF4FE]"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-md border border-[#1F0E06] bg-white text-[#1F0E06] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[#EAF4FE]"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── LIST VIEW TABLE (Built to exact required specs) ── */
        <div className="bg-white rounded-2xl border border-[#1F0E06] shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  style={{ background: "#1F0E06" }}
                  className="text-white font-sans text-xs uppercase tracking-wider border-b border-white/15"
                >
                  <th
                    onClick={() => handleSort("name")}
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Vessel Name</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Current Status</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("route")}
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Current / Next Route</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("order")}
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Assigned Order ID</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("departure")}
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Departure Date</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("arrival")}
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Estimated Arrival</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold">Fuel Type</th>
                  <th
                    onClick={() => handleSort("maintenance")}
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Next Maintenance</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE8DF]">
                {paginatedSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#737985] font-sans">
                      No vessels found matching active filters.
                    </td>
                  </tr>
                ) : (
                  paginatedSchedules.map((item) => {
                    const { vessel, assignedOrder, opState, departureDate, estimatedArrival, currentRoute } = item;
                    const opStyle = OPERATIONAL_STATE_STYLES[opState];
                    const fuelStyle = FUEL_BADGES[vessel.fuelType] || FUEL_BADGES.LNG;

                    return (
                      <tr
                        key={vessel.id}
                        onClick={() => {
                          if (item.blocks[0]) setActiveBlock(item.blocks[0]);
                        }}
                        className="hover:bg-[#EAF4FE]/40 transition-colors cursor-pointer"
                      >
                        {/* 1. Vessel Name */}
                        <td className="py-3 px-4 font-sans">
                          <div className="font-bold text-[#1F0E06]">{vessel.name}</div>
                          <div className="text-[10px] font-mono text-[#737985]">
                            {vessel.type} · {vessel.imo}
                          </div>
                        </td>

                        {/* 2. Current Status */}
                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                            style={{
                              background: opStyle.bg,
                              color: opStyle.text,
                              borderColor: opStyle.border,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: opStyle.dot }}
                            />
                            {opStyle.label}
                          </span>
                        </td>

                        {/* 3. Current / Next Route */}
                        <td className="py-3 px-4 font-sans text-[#1F0E06]">
                          <div className="font-medium">{currentRoute}</div>
                          <div className="text-[10px] font-mono text-[#737985]">
                            Speed {vessel.speed} kn · Pos: {vessel.currentLocation}
                          </div>
                        </td>

                        {/* 4. Assigned Order ID */}
                        <td className="py-3 px-4 font-mono">
                          {assignedOrder ? (
                            <div className="flex items-center gap-1 text-[#185C3A] font-bold">
                              <CheckCircle2 size={12} className="text-[#2E9B68]" />
                              <span>{assignedOrder.id}</span>
                            </div>
                          ) : (
                            <span className="text-[#737985] text-[11px] font-sans">
                              Unassigned / Spot
                            </span>
                          )}
                        </td>

                        {/* 5. Departure Date */}
                        <td className="py-3 px-4 font-mono text-[#1F0E06]">
                          {departureDate}
                        </td>

                        {/* 6. Estimated Arrival Date */}
                        <td className="py-3 px-4 font-mono font-semibold text-[#1F0E06]">
                          {estimatedArrival}
                        </td>

                        {/* 7. Fuel Type */}
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                            style={{
                              background: fuelStyle.bg,
                              color: fuelStyle.text,
                              borderColor: fuelStyle.border,
                            }}
                          >
                            {vessel.fuelType}
                          </span>
                        </td>

                        {/* 8. Next Maintenance Date */}
                        <td className="py-3 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Wrench size={12} className="text-[#B9915E]" />
                            <span className="text-[#1F0E06] font-medium">
                              {vessel.nextMaintenanceDate || "2026-12-01"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* List View Pagination Footer */}
          <div className="p-3 bg-[#FAFAF5] border-t border-[#ECE8DF] flex items-center justify-between text-xs font-mono text-[#737985]">
            <div>
              Showing {paginatedSchedules.length} of {sortedSchedules.length} vessels (Page {currentPage} of {totalPages})
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md border border-[#1F0E06] bg-white text-[#1F0E06] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[#EAF4FE]"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-md border border-[#1F0E06] bg-white text-[#1F0E06] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[#EAF4FE]"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Upcoming Fleet Events Panel (Secondary section) ── */}
      <div className="bg-white rounded-2xl border border-[#1F0E06] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1F0E06]" />
            <h3 className="text-sm font-bold text-[#1F0E06] uppercase tracking-wider font-mono">
              Upcoming Fleet Events & Milestones
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#737985]">
            Chronological ETA & Drydock Feed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {upcomingEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-3 rounded-xl border border-[#1F0E06]/30 bg-[#FAFAF5] hover:bg-[#EAF4FE]/50 transition-all flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="font-bold text-[#1F0E06]">{ev.vesselName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white text-[#1F0E06] border border-[#AFD2FA] font-bold">
                    {ev.badgeText}
                  </span>
                </div>
                <p className="text-xs font-sans text-[#3F4654] font-medium leading-snug">
                  {ev.title}
                </p>
              </div>
              <div className="text-[10px] font-mono text-[#737985] pt-1.5 border-t border-[#ECE8DF] flex items-center justify-between">
                <span>Milestone</span>
                <strong className="text-[#1F0E06]">{ev.date}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Detail Popover / Modal for Clicked Schedule Block ── */}
      {activeBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#1F0E06] space-y-4 text-[#1F0E06] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE8DF]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1F0E06] text-white flex items-center justify-center">
                  <Ship size={16} className="text-[#AFD2FA]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1F0E06]">
                    {activeBlock.vesselName}
                  </h3>
                  <div className="text-[10px] font-mono text-[#737985]">
                    Operational Event Dossier
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveBlock(null)}
                className="p-1 rounded-lg text-[#737985] hover:text-[#1F0E06] hover:bg-[#F1F2F4] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Operational State Pill */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAF5] border border-[#1F0E06]/30">
              <span className="text-xs font-mono font-bold text-[#737985]">
                Operational State
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border"
                style={{
                  background: OPERATIONAL_STATE_STYLES[activeBlock.state].bg,
                  color: OPERATIONAL_STATE_STYLES[activeBlock.state].text,
                  borderColor: OPERATIONAL_STATE_STYLES[activeBlock.state].border,
                }}
              >
                {activeBlock.state}
              </span>
            </div>

            {/* Event Specification Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs font-sans">
              <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#ECE8DF]">
                <div className="text-[10px] font-mono text-[#737985] uppercase">Origin Port</div>
                <div className="font-bold text-[#1F0E06] mt-0.5">{activeBlock.origin}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#ECE8DF]">
                <div className="text-[10px] font-mono text-[#737985] uppercase">Destination</div>
                <div className="font-bold text-[#1F0E06] mt-0.5">{activeBlock.destination}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#ECE8DF]">
                <div className="text-[10px] font-mono text-[#737985] uppercase">Departure Date</div>
                <div className="font-mono font-bold text-[#1F0E06] mt-0.5">{activeBlock.startDate}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#ECE8DF]">
                <div className="text-[10px] font-mono text-[#737985] uppercase">Estimated Arrival (ETA)</div>
                <div className="font-mono font-bold text-[#1F0E06] mt-0.5">{activeBlock.endDate}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#ECE8DF]">
                <div className="text-[10px] font-mono text-[#737985] uppercase">Assigned Order ID</div>
                <div className="font-mono font-bold text-[#1F0E06] mt-0.5">
                  {activeBlock.orderId || "None (Open Fleet Spot)"}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#ECE8DF]">
                <div className="text-[10px] font-mono text-[#737985] uppercase">Bunker Fuel Spec</div>
                <div className="font-mono font-bold text-[#1F0E06] mt-0.5">{activeBlock.fuelType}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#ECE8DF] col-span-2">
                <div className="text-[10px] font-mono text-[#737985] uppercase">Cargo Consignment</div>
                <div className="font-bold text-[#1F0E06] mt-0.5">
                  {activeBlock.cargoQuantity || "Ballast Condition"}
                </div>
              </div>
            </div>

            {/* Notes */}
            {activeBlock.notes && (
              <div className="p-3 rounded-xl bg-[#EAF4FE]/60 border border-[#AFD2FA] text-xs font-sans text-[#1F0E06]">
                <strong>Operational Log:</strong> {activeBlock.notes}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              {onSelectVessel && (
                <button
                  onClick={() => {
                    onSelectVessel(activeBlock.vesselId);
                    setActiveBlock(null);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase bg-[#1F0E06] hover:bg-[#2563EB] text-white transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Open Flagship Cockpit</span>
                  <ArrowRight size={13} />
                </button>
              )}
              {activeBlock.orderId && onNavigateToOrders && (
                <button
                  onClick={() => {
                    onNavigateToOrders();
                    setActiveBlock(null);
                  }}
                  className="py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase bg-white border border-[#1F0E06] hover:bg-[#FAFAF5] text-[#1F0E06] transition-all cursor-pointer"
                >
                  View in Orders
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
