import { useState, useMemo } from "react";
import { Vessel } from "../../data/fleet";
import { INITIAL_ORDERS, OrderItem } from "../../data/orders";
import { ChevronLeft, ChevronRight, Calendar, List, Clock, Anchor, Settings } from "lucide-react";

interface Props {
  vessels: Vessel[];
}

// ----------------------------------------------------
// Types & Helper Functions
// ----------------------------------------------------

type ViewMode = "timeline" | "list";

// A normalized event block mapped from vessels + orders + maintenance
interface ScheduleEvent {
  id: string;
  vesselId: string;
  type: "underway" | "port" | "maintenance" | "idle";
  startDate: Date;
  endDate: Date;
  label: string;
  // Metadata for tooltips
  orderId?: string;
  origin?: string;
  destination?: string;
  cargo?: string;
  fuelType?: string;
}

const EVENT_COLORS = {
  underway: "#18A6A6",     // Teal
  port: "#2E9B68",         // Accent Green
  maintenance: "#C94B4B",  // Warning Red
  idle: "#737985",         // Neutral Grey
};

// Simple date offset helper
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Format as YYYY-MM-DD
const formatDate = (d: Date) => d.toISOString().split("T")[0];

// ----------------------------------------------------
// Main Component
// ----------------------------------------------------

export default function FleetSchedule({ vessels }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [dateRangeDays, setDateRangeDays] = useState<number>(30); // Default to next 30 days
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterType, setFilterType] = useState<string>("All");

  // Today anchored to match the mock data dates (Sept 2026 roughly)
  const today = new Date("2026-09-08T00:00:00Z");
  const endDateRange = addDays(today, dateRangeDays);

  // ----------------------------------------------------
  // Data Aggregation (Deriving ScheduleEvents)
  // ----------------------------------------------------
  const events = useMemo(() => {
    const allEvents: ScheduleEvent[] = [];

    vessels.forEach((v) => {
      // 1. Map Orders to "Underway" or "In Port" events based on dates
      // For simplicity, we assign the first matching order to the vessel.
      // (In a real app, vessels would have an array of assigned order IDs)
      const assignedOrder = INITIAL_ORDERS.find((o) => o.assignedVesselId === v.id);

      if (assignedOrder) {
        const loadD = new Date(assignedOrder.loadDate);
        const delivD = new Date(assignedOrder.deliveryDeadline);

        // Loading in port event (2 days before departure)
        const inPortStart = addDays(loadD, -2);
        allEvents.push({
          id: `${v.id}-port-load`,
          vesselId: v.id,
          type: "port",
          startDate: inPortStart,
          endDate: loadD,
          label: "Loading",
          orderId: assignedOrder.id,
          origin: assignedOrder.origin,
          destination: assignedOrder.destination,
          cargo: assignedOrder.cargo,
          fuelType: v.fuelType,
        });

        // Underway event
        allEvents.push({
          id: `${v.id}-underway`,
          vesselId: v.id,
          type: "underway",
          startDate: loadD,
          endDate: delivD,
          label: "Transit",
          orderId: assignedOrder.id,
          origin: assignedOrder.origin,
          destination: assignedOrder.destination,
          cargo: assignedOrder.cargo,
          fuelType: v.fuelType,
        });

        // Unloading in port event (2 days after arrival)
        const inPortEnd = addDays(delivD, 2);
        allEvents.push({
          id: `${v.id}-port-unload`,
          vesselId: v.id,
          type: "port",
          startDate: delivD,
          endDate: inPortEnd,
          label: "Discharge",
          orderId: assignedOrder.id,
          origin: assignedOrder.origin,
          destination: assignedOrder.destination,
          cargo: assignedOrder.cargo,
          fuelType: v.fuelType,
        });
      } else {
        // If no assigned order, create an "Idle" event from today to end of range
        // unless it's currently underway, then just add a generic underway
        if (v.status === "Underway") {
          allEvents.push({
            id: `${v.id}-underway-generic`,
            vesselId: v.id,
            type: "underway",
            startDate: today,
            endDate: addDays(today, 7), // arbitrary underway for 7 days
            label: "En Route",
            origin: v.origin,
            destination: v.destination,
            fuelType: v.fuelType,
          });
        } else {
          allEvents.push({
            id: `${v.id}-idle`,
            vesselId: v.id,
            type: "idle",
            startDate: today,
            endDate: endDateRange,
            label: "Awaiting Assignment",
            fuelType: v.fuelType,
          });
        }
      }

      // 2. Map Maintenance Window
      if (v.nextMaintenance) {
        const maintDate = new Date(v.nextMaintenance);
        allEvents.push({
          id: `${v.id}-maint`,
          vesselId: v.id,
          type: "maintenance",
          startDate: maintDate,
          endDate: addDays(maintDate, 5), // Assumed 5 day maintenance
          label: "Dry Dock",
          fuelType: v.fuelType,
        });
      }
    });

    return allEvents;
  }, [vessels, today, endDateRange]);

  // ----------------------------------------------------
  // Upcoming Events Strip Data
  // ----------------------------------------------------
  const upcomingEvents = useMemo(() => {
    // Sort all events by start date, pick those happening >= today
    const futureEvents = events.filter((e) => e.startDate >= today);
    futureEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    return futureEvents.slice(0, 5);
  }, [events, today]);

  // ----------------------------------------------------
  // Filtering
  // ----------------------------------------------------
  const filteredVessels = vessels.filter((v) => {
    const matchStatus = filterStatus === "All" || v.status === filterStatus;
    const matchType = filterType === "All" || v.type === filterType;
    return matchStatus && matchType;
  });

  const getVesselEvents = (vesselId: string) => events.filter((e) => e.vesselId === vesselId);

  // ----------------------------------------------------
  // Rendering Helpers
  // ----------------------------------------------------
  // Calculate horizontal position & width for timeline blocks
  const calculateTimelineStyle = (start: Date, end: Date) => {
    const totalMs = endDateRange.getTime() - today.getTime();
    
    // Clamp dates to timeline view
    const clampedStart = new Date(Math.max(start.getTime(), today.getTime()));
    const clampedEnd = new Date(Math.min(end.getTime(), endDateRange.getTime()));

    if (clampedStart > clampedEnd) return { display: "none" };

    const leftPct = ((clampedStart.getTime() - today.getTime()) / totalMs) * 100;
    const widthPct = ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100;

    return {
      left: `${Math.max(0, leftPct)}%`,
      width: `${Math.max(1, widthPct)}%`,
    };
  };

  const statusBadgeStyle = (status: string) => {
    switch (status) {
      case "Underway":
        return { bg: "rgba(24, 166, 166, 0.15)", text: "#18A6A6", border: "#18A6A6" };
      case "In Port":
      case "At Anchor":
        return { bg: "rgba(46, 155, 104, 0.15)", text: "#2E9B68", border: "#2E9B68" };
      case "Standby":
      default:
        return { bg: "rgba(115, 121, 133, 0.15)", text: "#737985", border: "#737985" };
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* HEADER & FILTERS */}
      <div className="shrink-0 mb-4 space-y-4">
        <div className="panel border border-[#182350]/20 p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-[#182350]">
              Fleet Schedule
            </h1>
            <span className="text-xs text-[#737985] font-sans">
              Unified timeline for voyages, maintenance, and port calls.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-[#FAFAF5] border border-[#182350]/20 rounded-lg overflow-hidden p-1 shadow-sm">
              <button
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-colors rounded ${
                  viewMode === "timeline" ? "bg-[#182350] text-white shadow-sm" : "text-[#737985] hover:text-[#182350]"
                }`}
              >
                <Calendar size={14} /> Timeline
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-colors rounded ${
                  viewMode === "list" ? "bg-[#182350] text-white shadow-sm" : "text-[#737985] hover:text-[#182350]"
                }`}
              >
                <List size={14} /> List
              </button>
            </div>

            {/* Date Range Selector */}
            <select
              value={dateRangeDays}
              onChange={(e) => setDateRangeDays(Number(e.target.value))}
              className="text-xs font-bold bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 rounded-lg px-3 py-2 outline-none cursor-pointer shadow-sm"
            >
              <option value={14}>Next 14 Days</option>
              <option value={30}>Next 30 Days</option>
              <option value={90}>Next 3 Months</option>
            </select>

            {/* Filters */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs font-bold bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 rounded-lg px-3 py-2 outline-none cursor-pointer shadow-sm"
            >
              <option value="All">All Types</option>
              <option value="LNG Carrier">LNG Carrier</option>
              <option value="Dry Bulk">Dry Bulk</option>
              <option value="Container">Container</option>
            </select>
          </div>
        </div>
      </div>

      {/* UPCOMING EVENTS STRIP */}
      <div className="shrink-0 mb-4">
        <div className="bg-[#FAFAF5] border border-[#182350]/20 rounded-xl p-3 flex items-center gap-4 overflow-x-auto shadow-sm">
          <div className="flex items-center gap-2 shrink-0">
            <Clock size={14} className="text-[#18A6A6]" />
            <span className="text-[11px] font-bold tracking-wider text-[#182350] uppercase">Upcoming</span>
          </div>
          <div className="w-px h-6 bg-[#182350]/20 shrink-0" />
          <div className="flex gap-6 items-center flex-1">
            {upcomingEvents.map((evt, idx) => {
              const v = vessels.find((ves) => ves.id === evt.vesselId);
              return (
                <div key={idx} className="flex items-center gap-2 shrink-0 text-xs text-[#737985]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: EVENT_COLORS[evt.type] }} />
                  <span>
                    <strong className="text-[#182350]">{v?.name}</strong> {evt.label} — {formatDate(evt.startDate)}
                  </span>
                </div>
              );
            })}
            {upcomingEvents.length === 0 && <span className="text-xs text-[#737985]">No upcoming events in range.</span>}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white border border-[#182350]/20 rounded-xl shadow-sm">
        {viewMode === "list" ? (
          // ── LIST VIEW ──
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#FAFAF5] z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-mono font-bold text-[#182350] uppercase tracking-wider border-b border-[#182350]/20">Vessel</th>
                  <th className="px-4 py-3 text-[10px] font-mono font-bold text-[#182350] uppercase tracking-wider border-b border-[#182350]/20">Status</th>
                  <th className="px-4 py-3 text-[10px] font-mono font-bold text-[#182350] uppercase tracking-wider border-b border-[#182350]/20">Active Order</th>
                  <th className="px-4 py-3 text-[10px] font-mono font-bold text-[#182350] uppercase tracking-wider border-b border-[#182350]/20">Route / Action</th>
                  <th className="px-4 py-3 text-[10px] font-mono font-bold text-[#182350] uppercase tracking-wider border-b border-[#182350]/20">Est. Date</th>
                  <th className="px-4 py-3 text-[10px] font-mono font-bold text-[#182350] uppercase tracking-wider border-b border-[#182350]/20">Next Maintenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182350]/10">
                {filteredVessels.map((v) => {
                  const sStyle = statusBadgeStyle(v.status);
                  const assignedOrder = INITIAL_ORDERS.find((o) => o.assignedVesselId === v.id);
                  
                  return (
                    <tr key={v.id} className="hover:bg-[#EAF4FE]/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: v.color || "#18A6A6" }} />
                          <span className="font-bold text-xs text-[#182350]">{v.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border"
                          style={{
                            background: sStyle.bg,
                            color: sStyle.text,
                            borderColor: sStyle.border,
                          }}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#182350] font-mono">
                        {assignedOrder ? assignedOrder.id : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#737985]">
                        {assignedOrder ? (
                          <>
                            <span className="font-semibold text-[#182350]">{assignedOrder.origin}</span> →{" "}
                            <span className="font-semibold text-[#182350]">{assignedOrder.destination}</span>
                          </>
                        ) : (
                          "Idle / Awaiting"
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#182350]">
                        {assignedOrder ? formatDate(new Date(assignedOrder.loadDate)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#182350]">
                        {v.nextMaintenance ? formatDate(new Date(v.nextMaintenance)) : "No schedule"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // ── TIMELINE VIEW ──
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {/* Timeline Header (Days) */}
            <div className="flex border-b border-[#182350]/20 bg-[#FAFAF5] shrink-0">
              <div className="w-64 shrink-0 border-r border-[#182350]/20 p-3 flex items-center">
                <span className="text-[10px] font-mono font-bold text-[#182350] uppercase tracking-wider">Fleet & Status</span>
              </div>
              <div className="flex-1 relative h-10">
                {/* Generate Day Markers */}
                {[...Array(dateRangeDays)].map((_, i) => {
                  const d = addDays(today, i);
                  const isFirstOfMonth = d.getDate() === 1;
                  const leftPct = (i / dateRangeDays) * 100;
                  
                  // Only show day text if space allows, else just tick
                  const showText = dateRangeDays <= 30 || i % 7 === 0;
                  
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-[#182350]/10 flex flex-col justify-end pb-1 px-1"
                      style={{ left: `${leftPct}%`, width: `${100 / dateRangeDays}%` }}
                    >
                      {showText && (
                        <span className="text-[9px] font-mono text-[#737985]">
                          {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline Body (Rows) */}
            <div className="flex-1 overflow-y-auto">
              {filteredVessels.map((v) => {
                const sStyle = statusBadgeStyle(v.status);
                const vesselEvents = getVesselEvents(v.id);

                return (
                  <div key={v.id} className="flex border-b border-[#182350]/10 group hover:bg-[#FAFAF5]/50 transition-colors">
                    {/* Row Header */}
                    <div className="w-64 shrink-0 border-r border-[#182350]/20 p-3 flex flex-col justify-center gap-1.5 bg-white z-10 relative">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: v.color || "#18A6A6" }} />
                        <span className="font-bold text-xs text-[#182350] truncate">{v.name}</span>
                      </div>
                      <span
                        className="inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border"
                        style={{
                          background: sStyle.bg,
                          color: sStyle.text,
                          borderColor: sStyle.border,
                        }}
                      >
                        {v.status}
                      </span>
                    </div>

                    {/* Timeline Track */}
                    <div className="flex-1 relative min-h-[4rem] py-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjQsMzUsODAsMC4wNSkiLz48L3N2Zz4=')]">
                      {vesselEvents.map((evt) => {
                        const style = calculateTimelineStyle(evt.startDate, evt.endDate);
                        if (style.display === "none") return null;

                        return (
                          <div
                            key={evt.id}
                            className="absolute top-2 bottom-2 rounded-md shadow-sm border border-black/10 overflow-hidden group/block cursor-pointer transition-all hover:z-20 hover:scale-[1.02] hover:shadow-md"
                            style={{
                              ...style,
                              backgroundColor: EVENT_COLORS[evt.type],
                            }}
                          >
                            <div className="w-full h-full px-2 py-1 flex items-center justify-center opacity-90 truncate text-[10px] text-white font-bold tracking-wide">
                              {evt.label}
                            </div>

                            {/* Tooltip Popover (appears on hover) */}
                            <div className="hidden group-hover/block:block absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 p-2.5 bg-[#182350] text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none border border-[#AFD2FA]/30">
                              <div className="font-bold mb-1 border-b border-white/20 pb-1 flex justify-between">
                                <span>{evt.label}</span>
                                <span className="opacity-70 font-mono text-[9px]">{formatDate(evt.startDate)}</span>
                              </div>
                              {evt.orderId && <div className="mt-1"><span className="opacity-60">Order:</span> {evt.orderId}</div>}
                              {evt.origin && <div className="mt-0.5"><span className="opacity-60">From:</span> {evt.origin}</div>}
                              {evt.destination && <div className="mt-0.5"><span className="opacity-60">To:</span> {evt.destination}</div>}
                              {evt.cargo && <div className="mt-0.5"><span className="opacity-60">Cargo:</span> {evt.cargo}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="shrink-0 bg-white border-t border-[#182350]/20 p-2.5 flex justify-center gap-6 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#18A6A6]" />
                <span className="text-[10px] font-bold text-[#182350] uppercase tracking-wider">Underway</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#2E9B68]" />
                <span className="text-[10px] font-bold text-[#182350] uppercase tracking-wider">In Port / Cargo Ops</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#C94B4B]" />
                <span className="text-[10px] font-bold text-[#182350] uppercase tracking-wider">Maintenance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#737985]" />
                <span className="text-[10px] font-bold text-[#182350] uppercase tracking-wider">Idle / Awaiting</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
