import { useState, useMemo } from "react";
import { vessels, Vessel } from "../../data/fleet";
import { OrderItem, INITIAL_ORDERS } from "../../data/orders";






interface VesselRecommendation {
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

interface Props {
  selectedPlan?: string;
  onPlanSelect?: (plan: string) => void;
}

export default function OrdersFlow({}: Props) {
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("ORD-2026-0891");
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>("v1");
  const [approvedOrders, setApprovedOrders] = useState<Record<string, { vesselId: string; vesselName: string; date: string }>>({});

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || orders[0],
    [orders, selectedOrderId]
  );

  const isCurrentOrderApproved = !!approvedOrders[selectedOrder.id] || selectedOrder.status === "ASSIGNED";

  // Recommendation logic based on cargo type, capacity, fuel, availability, and location
  const recommendations: VesselRecommendation[] = useMemo(() => {
    return vessels.map((v) => {
      const availableCapacity = Math.max(0, v.capacity - v.currentLoad);
      const capacityOk = availableCapacity >= selectedOrder.quantity;

      let cargoTypeMatch = false;
      let typeScore = 0;

      if (selectedOrder.cargoType === "LNG" && v.type === "LNG Carrier") {
        cargoTypeMatch = true;
        typeScore = 40;
      } else if (selectedOrder.cargoType === "Dry Bulk" && v.type === "Bulk Carrier") {
        cargoTypeMatch = true;
        typeScore = 40;
      } else if (selectedOrder.cargoType === "Liquid Chemical" && v.type === "Chemical Tanker") {
        cargoTypeMatch = true;
        typeScore = 40;
      } else if (selectedOrder.cargoType === "Containers" && v.type === "Container Ship") {
        cargoTypeMatch = true;
        typeScore = 40;
      } else {
        typeScore = 10;
      }

      const capacityScore = capacityOk ? 30 : Math.max(0, 30 - ((selectedOrder.quantity - availableCapacity) / 1000) * 2);
      const fuelScore = v.fuelLevel > 60 ? 20 : v.fuelLevel > 40 ? 15 : 8;
      const statusScore = v.status === "At Anchor" ? 10 : v.status === "Underway" ? 8 : 5;

      const totalScore = Math.min(99, Math.round(typeScore + capacityScore + fuelScore + statusScore));

      let estimatedArrival = "Within Schedule";
      if (v.id === "v1") estimatedArrival = "2026-09-24 (21 days early)";
      else if (v.id === "v2") estimatedArrival = "2026-09-22 (6 days early)";
      else if (v.id === "v3") estimatedArrival = "2026-09-14 (6 days early)";
      else if (v.id === "v4") estimatedArrival = "2026-09-28 (7 days early)";

      const constraints = [
        {
          label: "Cargo Spec Compatibility",
          passed: cargoTypeMatch,
          note: cargoTypeMatch ? `Direct match for ${selectedOrder.cargoType}` : `Vessel configured for ${v.type}`,
        },
        {
          label: "Capacity Requirement",
          passed: capacityOk,
          note: capacityOk
            ? `${availableCapacity.toLocaleString()} MT avail vs ${selectedOrder.quantity.toLocaleString()} MT req`
            : `Deficit: ${(selectedOrder.quantity - availableCapacity).toLocaleString()} MT`,
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
    .map((rec, index) => ({
      ...rec,
      isBest: index === 0,
    }));
  }, [selectedOrder]);

  const activeRecommendedVessel = useMemo(() => {
    if (!selectedVesselId) return recommendations[0]?.vessel || vessels[0];
    return vessels.find((v) => v.id === selectedVesselId) || recommendations[0]?.vessel || vessels[0];
  }, [selectedVesselId, recommendations]);

  const activeRecData = useMemo(() => {
    return recommendations.find((r) => r.vessel.id === activeRecommendedVessel.id) || recommendations[0];
  }, [recommendations, activeRecommendedVessel]);

  // Handle Order Selection
  const handleSelectOrder = (order: OrderItem) => {
    setSelectedOrderId(order.id);
    if (order.assignedVesselId) {
      setSelectedVesselId(order.assignedVesselId);
    } else {
      // Auto-select best recommended vessel for this order
      const best = vessels.find((v) => {
        if (order.cargoType === "LNG") return v.type === "LNG Carrier";
        if (order.cargoType === "Dry Bulk") return v.type === "Bulk Carrier";
        if (order.cargoType === "Liquid Chemical") return v.type === "Chemical Tanker";
        if (order.cargoType === "Containers") return v.type === "Container Ship";
        return true;
      });
      setSelectedVesselId(best ? best.id : vessels[0].id);
    }
  };

  // Handle Approve Assignment
  const handleApproveAssignment = () => {
    if (!selectedVesselId || isCurrentOrderApproved) return;

    const assignedVessel = vessels.find((v) => v.id === selectedVesselId)!;
    const approvalTimestamp = new Date().toISOString().replace("T", " ").substring(0, 19);

    // Update order in list
    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrder.id
          ? {
              ...o,
              status: "ASSIGNED",
              assignedVesselId: assignedVessel.id,
              assignedVesselName: assignedVessel.name,
              assignedAt: approvalTimestamp,
            }
          : o
      )
    );

    // Update approved state
    setApprovedOrders((prev) => ({
      ...prev,
      [selectedOrder.id]: {
        vesselId: assignedVessel.id,
        vesselName: assignedVessel.name,
        date: approvalTimestamp,
      },
    }));
  };

  const priorityColors: Record<OrderItem["priority"], { bg: string; text: string; border: string }> = {
    Urgent: { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
    High: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
    Medium: { bg: "#EAF4FE", text: "#182350", border: "#AFD2FA" },
    Low: { bg: "#F3F4F6", text: "#4B5563", border: "#E5E7EB" },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" style={{ background: "#FEFAEF" }}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#182350]/20">
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#182350]/20 text-xs font-sans">
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

      {/* 1. ORDER LIST */}
      <div
        className="rounded-xl overflow-hidden shadow-xs border border-[#182350]/20"
        style={{ background: "#FFFFFF" }}
      >
        <div className="px-5 py-3.5 border-b border-[#182350]/20 flex items-center justify-between bg-[#FAFAF5]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-[#182350]">1. Customer Orders List</span>
            <span className="text-xs text-[#737985] font-sans">
              (Click any order row to review details and recommended vessels)
            </span>
          </div>
          <div className="text-[11px] font-sans text-[#737985]">5 Sample Commercial Orders</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-[#182350]/20 bg-[#F7F5EE] text-[#737985] font-semibold text-[11px] uppercase tracking-wider">
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
            <tbody className="divide-y divide-[#182350]">
              {orders.map((ord) => {
                const isSelected = ord.id === selectedOrder.id;
                const pStyle = priorityColors[ord.priority];
                const isAssigned = ord.status === "ASSIGNED";

                return (
                  <tr
                    key={ord.id}
                    onClick={() => handleSelectOrder(ord)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? "bg-[#EAF4FE] font-medium"
                        : "hover:bg-[#FDFBF7] bg-white"
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#182350]">
                      <div className="flex items-center gap-2">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#182350]" />}
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
                          <span className="text-[10px] font-semibold text-[#2E9B68] truncate max-w-[120px]">
                            {ord.assignedVesselName}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FFF7ED] text-[#C2410C] border border-[#FDBA74]">
                          ● PENDING
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. SELECTED ORDER DETAILS */}
      <div
        className="p-5 rounded-xl shadow-xs border border-[#182350]/20"
        style={{ background: "#FFFFFF" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[#182350]/20">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#182350] text-white flex items-center justify-center text-xs font-bold">
              2
            </span>
            <h2 className="text-sm font-extrabold text-[#182350] uppercase tracking-wide">
              Selected Order Details: <span className="text-[#182350] font-mono">{selectedOrder.id}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#737985] font-sans">Status:</span>
            {isCurrentOrderApproved ? (
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA]">
                ✓ Approved & Assigned to {selectedOrder.assignedVesselName || approvedOrders[selectedOrder.id]?.vesselName}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FDBA74]">
                Awaiting Vessel Assignment
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3 text-xs font-sans">
          <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]/20">
            <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">Order ID</div>
            <div className="font-mono font-bold text-[#182350] truncate">{selectedOrder.id}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]/20 col-span-1 sm:col-span-2">
            <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">Customer</div>
            <div className="font-bold text-[#182350] truncate">{selectedOrder.customer}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]/20 col-span-1 sm:col-span-2">
            <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">Cargo Type</div>
            <div className="font-semibold text-[#182350] truncate">{selectedOrder.cargo}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]/20">
            <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">Quantity</div>
            <div className="font-mono font-bold text-[#182350]">
              {selectedOrder.quantity.toLocaleString()} {selectedOrder.unit}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]/20">
            <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">Load Date</div>
            <div className="font-mono text-[#182350]">{selectedOrder.loadDate}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]/20">
            <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">Deadline</div>
            <div className="font-mono font-bold text-[#182350]">{selectedOrder.deliveryDeadline}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350]/20">
            <div className="text-[10px] font-bold text-[#737985] uppercase tracking-wider mb-1">Priority</div>
            <div>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{
                  background: priorityColors[selectedOrder.priority].bg,
                  color: priorityColors[selectedOrder.priority].text,
                }}
              >
                {selectedOrder.priority}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
          <div className="p-2.5 rounded-lg bg-[#FAFAF5] border border-[#182350]/20 flex items-center justify-between">
            <span className="text-[#737985]">Origin Port:</span>
            <span className="font-bold text-[#182350]">📍 {selectedOrder.origin}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAFAF5] border border-[#182350]/20 flex items-center justify-between">
            <span className="text-[#737985]">Destination Port:</span>
            <span className="font-bold text-[#182350]">🏁 {selectedOrder.destination}</span>
          </div>
        </div>
      </div>

      {/* 3. RECOMMENDED VESSELS */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#182350] text-white flex items-center justify-center text-xs font-bold">
              3
            </span>
            <h2 className="text-sm font-extrabold text-[#182350] uppercase tracking-wide">
              Recommended Vessels
            </h2>
            <span className="text-xs font-sans text-[#737985]">
              (Ranked by Cargo Fit, Available Capacity, Fuel Profile & Route Feasibility)
            </span>
          </div>
          <div className="text-xs font-sans font-bold text-[#182350] flex items-center gap-1.5">
            <span>Select a vessel to proceed to confirmation</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {recommendations.map((rec) => {
            const v = rec.vessel;
            const isSelected = selectedVesselId === v.id;
            const isCurrentlyAssigned = selectedOrder.assignedVesselId === v.id;

            return (
              <div
                key={v.id}
                onClick={() => !isCurrentOrderApproved && setSelectedVesselId(v.id)}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between relative shadow-xs ${
                  isCurrentOrderApproved
                    ? isCurrentlyAssigned
                      ? "bg-[#EAF4FE] border-[#AFD2FA] ring-2 ring-[#AFD2FA]"
                      : "bg-white border-[#182350]/20 opacity-75 cursor-not-allowed"
                    : isSelected
                    ? "bg-[#EAF4FE] border-[#182350]/20 ring-2 ring-[#AFD2FA] cursor-pointer"
                    : "bg-white border-[#182350]/20 hover:border-[#AFD2FA] hover:bg-[#FDFBF7] cursor-pointer"
                }`}
              >
                {/* Best Recommendation Badge */}
                {rec.isBest && (
                  <div className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#182350] text-white shadow-xs flex items-center gap-1">
                    <span>★</span> BEST RECOMMENDATION
                  </div>
                )}

                <div>
                  {/* Vessel Header */}
                  <div className="flex items-start justify-between gap-2 mb-2 pt-1">
                    <div>
                      <div className="text-sm font-extrabold text-[#182350] leading-snug">
                        {v.name}
                      </div>
                      <div className="text-xs font-sans text-[#737985]">{v.type}</div>
                    </div>
                    <div className="text-right">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-wider"
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

                  {/* Compatibility Pill */}
                  <div className="mb-3 p-1.5 rounded-md bg-[#FAFAF5] border border-[#182350]/20 text-[11px] font-sans text-[#3F4654]">
                    <div className="font-semibold text-[#182350] truncate">{rec.compatibilityDesc}</div>
                  </div>

                  {/* Vessel Metrics */}
                  <div className="space-y-2 text-xs font-sans border-b border-[#182350]/20 pb-3 mb-3">
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
                    <div className="flex justify-between items-center bg-white px-2 py-1 rounded border border-[#182350]/20">
                      <span className="font-bold text-[#182350]">Available Cap:</span>
                      <span
                        className={`font-mono font-extrabold ${
                          rec.availableCapacity >= selectedOrder.quantity
                            ? "text-[#2E9B68]"
                            : "text-[#C94B4B]"
                        }`}
                      >
                        {rec.availableCapacity.toLocaleString()} MT
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#737985]">Fuel Type:</span>
                      <span className="font-medium text-[#182350]">{v.fuelType}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#737985]">Fuel Level:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-2 rounded-full bg-[#182350] overflow-hidden">
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
                </div>

                {/* Selection Action Button */}
                <div className="pt-2">
                  <button
                    disabled={isCurrentOrderApproved}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCurrentOrderApproved) setSelectedVesselId(v.id);
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold tracking-wide uppercase transition-all ${
                      isCurrentOrderApproved
                        ? isCurrentlyAssigned
                          ? "bg-[#182350] text-white"
                          : "bg-[#FAFAF5] text-[#737985] border border-[#182350]/20"
                        : isSelected
                        ? "bg-[#182350] text-white shadow-xs"
                        : "bg-white text-[#182350] border border-[#182350]/20 hover:bg-[#F7F5EE]"
                    }`}
                  >
                    {isCurrentOrderApproved
                      ? isCurrentlyAssigned
                        ? "✓ ASSIGNED VESSEL"
                        : "NOT ASSIGNED"
                      : isSelected
                      ? "✓ SELECTED FOR ASSIGNMENT"
                      : "SELECT VESSEL"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. APPROVAL & CONFIRMATION SUMMARY */}
      <div
        className="p-5 rounded-xl shadow-xs border border-[#182350]/20"
        style={{ background: "#FFFFFF" }}
      >
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#182350]/20">
          <span className="w-6 h-6 rounded-md bg-[#182350] text-white flex items-center justify-center text-xs font-bold">
            4
          </span>
          <h2 className="text-sm font-extrabold text-[#182350] uppercase tracking-wide">
            Assignment Confirmation & Operational Approval
          </h2>
        </div>

        {isCurrentOrderApproved ? (
          /* Approved State Banner */
          <div className="p-5 rounded-xl bg-[#EAF4FE] border border-[#AFD2FA] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#182350] text-white flex items-center justify-center text-lg font-bold shadow-xs">
                  ✓
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[#182350]">
                    Assignment Approved & Dispatched
                  </div>
                  <div className="text-xs text-[#737985] font-sans">
                    Order <span className="font-mono font-bold text-[#182350]">{selectedOrder.id}</span> is assigned to{" "}
                    <span className="font-bold text-[#182350]">{activeRecommendedVessel.name}</span>. Captain {activeRecommendedVessel.captain} has received the voyage order manifest.
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-[#FFFFFF] text-[#182350] border border-[#AFD2FA]">
                  STATUS: ASSIGNED
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#AFD2FA]/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans">
              <div>
                <span className="text-[#737985]">Order:</span>{" "}
                <span className="font-bold text-[#182350]">{selectedOrder.id}</span>
              </div>
              <div>
                <span className="text-[#737985]">Vessel:</span>{" "}
                <span className="font-bold text-[#182350]">{activeRecommendedVessel.name}</span>
              </div>
              <div>
                <span className="text-[#737985]">Cargo Loaded:</span>{" "}
                <span className="font-bold text-[#182350]">{selectedOrder.quantity.toLocaleString()} MT</span>
              </div>
              <div>
                <span className="text-[#737985]">ETA Window:</span>{" "}
                <span className="font-bold text-[#182350]">{activeRecData.estimatedArrival}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Confirmation Summary Box & Approve Button */
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#FAFAF5] border border-[#182350]/20">
              <div className="text-xs font-bold uppercase tracking-wider text-[#182350] mb-3">
                Pre-Approval Assignment Summary:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-sans">
                <div className="p-3 rounded-md bg-white border border-[#182350]/20">
                  <div className="text-[#737985] text-[10px] uppercase font-bold">Order → Selected Vessel</div>
                  <div className="font-bold text-[#182350] mt-0.5 truncate">
                    {selectedOrder.id} → {activeRecommendedVessel.name}
                  </div>
                  <div className="text-[11px] text-[#737985] mt-0.5">{activeRecommendedVessel.type}</div>
                </div>

                <div className="p-3 rounded-md bg-white border border-[#182350]/20">
                  <div className="text-[#737985] text-[10px] uppercase font-bold">Cargo → Quantity</div>
                  <div className="font-bold text-[#182350] mt-0.5">
                    {selectedOrder.quantity.toLocaleString()} {selectedOrder.unit}
                  </div>
                  <div className="text-[11px] text-[#737985] mt-0.5 truncate">{selectedOrder.cargo}</div>
                </div>

                <div className="p-3 rounded-md bg-white border border-[#182350]/20">
                  <div className="text-[#737985] text-[10px] uppercase font-bold">Estimated Arrival / ETA</div>
                  <div className="font-bold text-[#182350] mt-0.5">{activeRecData.estimatedArrival}</div>
                  <div className="text-[11px] text-[#2E9B68] font-semibold mt-0.5">Meets Deadline ({selectedOrder.deliveryDeadline})</div>
                </div>

                <div className="p-3 rounded-md bg-white border border-[#182350]/20">
                  <div className="text-[#737985] text-[10px] uppercase font-bold">Fuel & Engine Profile</div>
                  <div className="font-bold text-[#182350] mt-0.5">
                    {activeRecommendedVessel.fuelLevel}% {activeRecommendedVessel.fuelType}
                  </div>
                  <div className="text-[11px] text-[#737985] mt-0.5">
                    Voyage Rate: {activeRecommendedVessel.fuelConsumption.voyage} t/d
                  </div>
                </div>

                <div className="p-3 rounded-md bg-white border border-[#182350]/20">
                  <div className="text-[#737985] text-[10px] uppercase font-bold">Key Constraints</div>
                  <div className="font-semibold text-[#2E9B68] mt-0.5">✓ Capacity Verified</div>
                  <div className="text-[11px] text-[#3F4654] mt-0.5">✓ Port Clearances Active</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs font-sans text-[#737985]">
                Operator Approval assigns <span className="font-bold text-[#182350]">{activeRecommendedVessel.name}</span> to Order <span className="font-bold text-[#182350]">{selectedOrder.id}</span> and locks the fleet allocation plan.
              </div>

              <button
                onClick={handleApproveAssignment}
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
  );
}
