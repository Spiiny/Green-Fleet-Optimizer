import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { vessels as initialVessels, Vessel } from "../../data/fleet";
import VesselSidebar from "./VesselSidebar";
import FleetOverview from "./FleetOverview";
import VesselDashboard from "./VesselDashboard";
import CargoLayout from "./CargoLayout";
import FleetManagement from "./FleetManagement";
import LiveMap from "./LiveMap";
import RouteOptimization from "./RouteOptimization";
import WhatIfAnalysis from "./WhatIfAnalysis";
import OrdersFlow, { OrderItem, INITIAL_ORDERS } from "./OrdersFlow";
import CaptainAssignment from "./CaptainAssignment";
import FleetSchedule from "./FleetSchedule";
import TerminalHeader, { ControllerTab } from "./TerminalHeader";

interface Props {
  username: string;
  onLogout: () => void;
}

export default function ControllerDashboard({ username, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<ControllerTab>(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/schedule") {
      return "schedule";
    }
    return "overview";
  });
  const [selectedVesselId, setSelectedVesselId] = useState(initialVessels[0].id);
  const [vesselData, setVesselData] = useState<Vessel[]>(initialVessels);
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sync /schedule route on popstate
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === "/schedule") {
        setActiveTab("schedule");
      } else if (activeTab === "schedule") {
        setActiveTab("overview");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeTab]);

  const selectedVessel = vesselData.find((v) => v.id === selectedVesselId) || vesselData[0];

  const handleVesselUpdate = (updated: Vessel) => {
    setVesselData((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  };

  const handleVesselSelect = (id: string) => {
    setSelectedVesselId(id);
    if (activeTab === "overview") setActiveTab("vessel");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden select-none" style={{ background: "#FEFAEF" }}>
      {/* ── 1. Floating Terminal Header (Styled exactly to user reference) ── */}
      <TerminalHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        username={username}
        onLogout={onLogout}
      />

      {/* ── Main Workspace ── */}
      <div className="flex flex-1 overflow-hidden relative" style={{ background: "#FEFAEF" }}>
        {/* Left Vessel Fleet Radar Sidebar */}
        <div
          className={`flex-shrink-0 transition-all duration-300 overflow-hidden ${
            sidebarOpen ? "w-64" : "w-0"
          }`}
        >
          <VesselSidebar
            vessels={vesselData}
            selectedId={selectedVesselId}
            onSelect={handleVesselSelect}
          />
        </div>

        {/* Floating Sidebar Toggle Handle - Prominently Highlighted */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-5 sm:w-6 h-12 rounded-r-xl cursor-pointer shadow-xl transition-all duration-300 transform hover:scale-105 group bg-[#1F0E06] hover:bg-[#B9915E] border-2 border-l-0 border-[#B9915E]"
          style={{
            left: sidebarOpen ? 256 : 0,
            boxShadow: "0 4px 16px rgba(31, 14, 6, 0.45)",
          }}
          title={sidebarOpen ? "Collapse Fleet Radar Sidebar (Left to Right)" : "Expand Fleet Radar Sidebar (Right to Left)"}
          aria-label={sidebarOpen ? "Collapse Fleet Sidebar" : "Expand Fleet Sidebar"}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-3.5 h-3.5 text-[#E5D2BA] group-hover:text-[#1F0E06] stroke-[2.5] transition-colors" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#E5D2BA] group-hover:text-[#1F0E06] stroke-[2.5] transition-colors" />
          )}
        </button>

        {/* Center Main Stage Content */}
        <main className="flex-1 overflow-y-auto flex flex-col transition-all duration-300" style={{ background: "#FEFAEF" }}>
          {/* Glassmorphic Vessel Context HUD Bar for contextual tabs */}
          {activeTab !== "overview" &&
            activeTab !== "manage" &&
            activeTab !== "orders" &&
            activeTab !== "captains" &&
            activeTab !== "schedule" && (
              <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-white/95 backdrop-blur-md border-b border-[#182350] shadow-xs">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 animate-ping"
                    style={{ background: selectedVessel.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-[#182350] tracking-tight">
                        {selectedVessel.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA]">
                        {selectedVessel.fuelType}
                      </span>
                      <span className="text-[10px] font-mono text-[#2E9B68] font-bold">
                        ● SOG {selectedVessel.speed} kn
                      </span>
                    </div>
                    <div className="text-[11px] font-sans text-[#737985]">
                      En Route: <strong className="text-[#182350]">{selectedVessel.currentLocation}</strong> →{" "}
                      <strong className="text-[#182350]">{selectedVessel.destination}</strong> · Master:{" "}
                      {selectedVessel.captain}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Active Tab View Render with ample left clearance for sidebar toggle */}
          <div className="flex-1 py-2 sm:py-4 pr-3 sm:pr-5 pl-8 sm:pl-10">
            {activeTab === "overview" && <FleetOverview />}
            {activeTab === "vessel" && (
              <VesselDashboard
                vessel={selectedVessel}
                onUpdate={handleVesselUpdate}
              />
            )}
            {activeTab === "manage" && <FleetManagement />}
            {activeTab === "layout" && (
              <CargoLayout
                vessel={selectedVessel}
                onUpdate={handleVesselUpdate}
              />
            )}
            {activeTab === "map" && (
              <LiveMap
                vessel={selectedVessel}
              />
            )}
            {activeTab === "routes" && (
              <RouteOptimization
                vessel={selectedVessel}
                onUpdate={handleVesselUpdate}
              />
            )}
            {activeTab === "whatif" && (
              <WhatIfAnalysis
                vessel={selectedVessel}
                onUpdate={handleVesselUpdate}
              />
            )}
            {activeTab === "orders" && (
              <OrdersFlow orders={orders} onOrdersChange={setOrders} />
            )}
            {activeTab === "schedule" && (
              <FleetSchedule
                vessels={vesselData}
                orders={orders}
                onSelectVessel={handleVesselSelect}
                onNavigateToOrders={() => setActiveTab("orders")}
              />
            )}
            {activeTab === "captains" && (
              <CaptainAssignment
                vessels={vesselData}
                onUpdate={handleVesselUpdate}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
