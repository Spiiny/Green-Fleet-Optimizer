import { useState } from "react";
import { vessels as initialVessels, Vessel } from "../../data/fleet";
import VesselSidebar from "./VesselSidebar";
import FleetOverview from "./FleetOverview";
import VesselDashboard from "./VesselDashboard";
import CargoLayout from "./CargoLayout";
import FleetManagement from "./FleetManagement";
import LiveMap from "./LiveMap";
import RouteOptimization from "./RouteOptimization";
import WhatIfAnalysis from "./WhatIfAnalysis";
import OrdersFlow from "./OrdersFlow";
import CaptainAssignment from "./CaptainAssignment";
import TerminalHeader, { ControllerTab } from "./TerminalHeader";
import FleetSchedule from "./FleetSchedule";

interface Props {
  username: string;
  onLogout: () => void;
}

export default function ControllerDashboard({ username, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<ControllerTab>("overview");
  const [selectedVesselId, setSelectedVesselId] = useState(initialVessels[0].id);
  const [vesselData, setVesselData] = useState<Vessel[]>(initialVessels);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

        {/* Floating Sidebar Toggle Handle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute top-1/2 -translate-y-1/2 z-20 rounded-r-md flex flex-col items-center justify-center text-xs transition-all cursor-pointer shadow-md bg-white border border-l-0 border-[#182350]/20 text-[#182350] hover:bg-[#FAFAF5] ${
            sidebarOpen ? "w-6 h-32" : "w-6 h-32 py-2"
          }`}
          style={{ left: sidebarOpen ? 256 : 0 }}
          title={sidebarOpen ? "Collapse Fleet Sidebar" : "Expand Fleet Sidebar"}
        >
          {sidebarOpen ? (
            <>
              <span className="mb-2 text-sm font-bold">‹</span>
              <span className="text-[10px] font-bold tracking-widest text-[#182350] rotate-180" style={{ writingMode: "vertical-rl" }}>
                MY FLEETS
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold tracking-widest text-[#182350] rotate-180" style={{ writingMode: "vertical-rl" }}>
                MY FLEETS
              </span>
              <span className="mt-2 text-sm font-bold">›</span>
            </>
          )}
        </button>

        {/* Center Main Stage Content */}
        <main className="flex-1 overflow-y-auto flex flex-col" style={{ background: "#FEFAEF" }}>
          {/* Glassmorphic Vessel Context HUD Bar for contextual tabs */}
          {activeTab !== "overview" && activeTab !== "manage" && activeTab !== "orders" && activeTab !== "captains" && (
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-white/95 backdrop-blur-md border-b border-[#182350]/20 shadow-xs">
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

              {/* Context Action Shortcuts */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("routes")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeTab === "routes"
                      ? "bg-[#182350] text-white"
                      : "bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 hover:border-[#AFD2FA]"
                  }`}
                >
                  ⚡ Pathfinding
                </button>
                <button
                  onClick={() => setActiveTab("layout")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeTab === "layout"
                      ? "bg-[#182350] text-white"
                      : "bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 hover:border-[#AFD2FA]"
                  }`}
                >
                  ▦ 2D Trim
                </button>
                <button
                  onClick={() => setActiveTab("whatif")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeTab === "whatif"
                      ? "bg-[#182350] text-white"
                      : "bg-[#FAFAF5] text-[#182350] border border-[#182350]/20 hover:border-[#AFD2FA]"
                  }`}
                >
                  ⚗ Simulation
                </button>
              </div>
            </div>
          )}

          {/* Active Tab View Render */}
          <div className="flex-1 p-2 sm:p-4">
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
                        {activeTab === "orders" && <OrdersFlow />}
            {activeTab === "schedule" && <FleetSchedule vessels={vesselData} />}
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
