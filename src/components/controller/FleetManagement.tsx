import { useState, useMemo } from "react";
import {
  Ship,
  HealthStatus,
  OpStatus,
  FuelType,
  CII,
  MOCK_SHIPS,
  VESSEL_MODELS,
  MODEL_DATA,
} from "../../types/fleetManagement";

interface Props {
  ships?: Ship[];
  onSelectShipForLayout?: (shipId: string) => void;
}

export default function FleetManagement({
  ships: initialShips = MOCK_SHIPS,
  onSelectShipForLayout,
}: Props) {
  const [ships, setShips] = useState<Ship[]>(initialShips);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedHealth, setSelectedHealth] = useState<string>("ALL");
  const [selectedFuel, setSelectedFuel] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Drawer and Modal States
  const [drawerShip, setDrawerShip] = useState<Ship | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<Ship | null>(null);
  const [expandedShipId, setExpandedShipId] = useState<string | null>(null);

  // New Ship Form State
  const [newShipForm, setNewShipForm] = useState<Partial<Ship>>({
    name: "",
    model: VESSEL_MODELS[0],
    vesselType: "LNG Carrier",
    buildYear: 2023,
    health: "Excellent",
    status: "At Berth",
    fuelType: "LNG",
    fuelPercentage: 80,
    fuelCompatibility: ["LNG"],
    capacity: "74,000",
    capacityUnit: "DWT",
    location: "Mundra Port",
    imo: "IMO 9988112",
    flag: "India",
    engineType: "WinGD X62DF-A Dual-Fuel",
    enginePower: "16,400 kW",
    lastDryDock: "2024-01-15",
    nextMaintenance: "2026-01-15",
    cii: "A",
    shorePower: true,
    grossTonnage: "52,800 GT",
    dwt: "74,000 DWT",
    cruisingSpeed: "15.5 kn",
    shipyard: "Hyundai Heavy Industries",
    currentRoute: "Mundra → Rotterdam",
    currentSpeed: "0.0 kn",
    captain: "Capt. Arjun Mehta",
  });

  // Filter Logic
  const filteredShips = useMemo(() => {
    return ships.filter((ship) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        ship.name.toLowerCase().includes(q) ||
        ship.id.toLowerCase().includes(q) ||
        ship.imo.toLowerCase().includes(q) ||
        ship.captain.toLowerCase().includes(q) ||
        ship.vesselType.toLowerCase().includes(q) ||
        ship.location.toLowerCase().includes(q);

      const matchesStatus = selectedStatus === "ALL" || ship.status === selectedStatus;
      const matchesHealth = selectedHealth === "ALL" || ship.health === selectedHealth;
      const matchesFuel = selectedFuel === "ALL" || ship.fuelType === selectedFuel;

      return matchesSearch && matchesStatus && matchesHealth && matchesFuel;
    });
  }, [ships, searchQuery, selectedStatus, selectedHealth, selectedFuel]);

  // Statistics
  const stats = useMemo(() => {
    const total = ships.length;
    const inVoyage = ships.filter((s) => s.status === "In Voyage").length;
    const atBerth = ships.filter((s) => s.status === "At Berth").length;
    const underMaintenance = ships.filter((s) => s.status === "Under Maintenance").length;
    const excellentHealth = ships.filter((s) => s.health === "Excellent").length;
    const avgFuel = Math.round(ships.reduce((sum, s) => sum + s.fuelPercentage, 0) / (total || 1));

    return { total, inVoyage, atBerth, underMaintenance, excellentHealth, avgFuel };
  }, [ships]);

  // Handlers
  const handleModelChange = (modelName: string) => {
    const preset = MODEL_DATA[modelName];
    if (preset) {
      setNewShipForm((prev) => ({
        ...prev,
        model: modelName,
        ...preset,
      }));
    } else {
      setNewShipForm((prev) => ({ ...prev, model: modelName }));
    }
  };

  const handleCreateShip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipForm.name) return;

    const generatedId = `SHIP-${Math.floor(10000 + Math.random() * 90000)}`;
    const created: Ship = {
      id: generatedId,
      name: newShipForm.name || "New Flagship",
      model: newShipForm.model || VESSEL_MODELS[0],
      vesselType: newShipForm.vesselType || "LNG Carrier",
      buildYear: Number(newShipForm.buildYear) || 2024,
      health: (newShipForm.health as HealthStatus) || "Excellent",
      status: (newShipForm.status as OpStatus) || "At Berth",
      fuelType: (newShipForm.fuelType as FuelType) || "LNG",
      fuelPercentage: Number(newShipForm.fuelPercentage) || 75,
      fuelCompatibility: newShipForm.fuelCompatibility || ["LNG"],
      capacity: newShipForm.capacity || "74,000",
      capacityUnit: (newShipForm.capacityUnit as "DWT" | "TEU") || "DWT",
      location: newShipForm.location || "Mundra Port",
      imo: newShipForm.imo || `IMO ${Math.floor(9000000 + Math.random() * 999999)}`,
      flag: newShipForm.flag || "India",
      engineType: newShipForm.engineType || "WinGD X62DF Dual-Fuel",
      enginePower: newShipForm.enginePower || "16,400 kW",
      lastDryDock: newShipForm.lastDryDock || "2024-01-01",
      nextMaintenance: newShipForm.nextMaintenance || "2026-01-01",
      cii: (newShipForm.cii as CII) || "A",
      shorePower: newShipForm.shorePower ?? true,
      grossTonnage: newShipForm.grossTonnage || "50,000 GT",
      dwt: newShipForm.dwt || "74,000 DWT",
      cruisingSpeed: newShipForm.cruisingSpeed || "15.0 kn",
      shipyard: newShipForm.shipyard || "Cochin Shipyard Limited",
      currentRoute: newShipForm.currentRoute || "—",
      currentSpeed: newShipForm.currentSpeed || "0.0 kn",
      captain: newShipForm.captain || "Capt. Vikram Singh",
      statusHistory: [{ event: "Vessel Registered in GreenFleet Registry", time: "Just now" }],
      cargoTanks: [
        { id: "t1", name: "Hold 1", fillPercentage: 50, cargoType: "General", loadedAmt: "10,000 t", capacityAmt: "20,000 t" },
        { id: "t2", name: "Hold 2", fillPercentage: 50, cargoType: "General", loadedAmt: "10,000 t", capacityAmt: "20,000 t" },
      ],
      fuelTanks: [
        { id: "f1", name: "Main Bunker", capacityVolume: 2000, currentVolume: 1500, currentFuel: "LNG" }
      ],
      trim: 0.0,
      baseConsumption: "55.0 t/d",
      currentLoadingImpact: "55.0 t/d",
      fuelDelta: "0.0%",
    };

    setShips((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
  };

  const handleDeleteShip = (id: string) => {
    if (confirm("Are you sure you want to decommission / remove this vessel from the active fleet registry?")) {
      setShips((prev) => prev.filter((s) => s.id !== id));
      if (drawerShip?.id === id) setDrawerShip(null);
    }
  };

  const handleUpdateShip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShip) return;

    setShips((prev) => prev.map((s) => (s.id === editingShip.id ? editingShip : s)));
    if (drawerShip?.id === editingShip.id) setDrawerShip(editingShip);
    setEditingShip(null);
  };

  const healthColors: Record<HealthStatus, { bg: string; text: string; dot: string }> = {
    Excellent: { bg: "#EAF4FE", text: "#182350", dot: "#2E9B68" },
    Good: { bg: "#EAF4FE", text: "#182350", dot: "#3B82F6" },
    "Needs Maintenance": { bg: "#FEF3C7", text: "#92400E", dot: "#D97706" },
    Critical: { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  };

  const statusColors: Record<OpStatus, { bg: string; text: string; border: string }> = {
    "In Voyage": { bg: "#EAF4FE", text: "#182350", border: "#AFD2FA" },
    "At Berth": { bg: "#FAFAF5", text: "#737985", border: "#E6E2D8" },
    "Under Maintenance": { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
    "Docking/Undocking": { bg: "#E0F2FE", text: "#0369A1", border: "#BAE6FD" },
    Idle: { bg: "#F3F4F6", text: "#4B5563", border: "#E5E7EB" },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" style={{ background: "#FEFAEF" }}>
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#182350]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA]">
              Fleet Management System
            </span>
            <span className="text-xs text-[#737985] font-sans">· Total Vessels: {ships.length}</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#182350] tracking-tight">
            Add & Manage Fleet Vessels
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase bg-[#182350] hover:bg-[#233373] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>+ Add Vessel</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#182350] shadow-2xs">
          <div className="text-[10.5px] font-bold text-[#737985] uppercase tracking-wider">Total Fleet</div>
          <div className="text-2xl font-black text-[#182350] mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-[#737985] mt-0.5">Active registry</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#182350] shadow-2xs">
          <div className="text-[10.5px] font-bold text-[#737985] uppercase tracking-wider">In Voyage</div>
          <div className="text-2xl font-black text-[#182350] mt-0.5">{stats.inVoyage}</div>
          <div className="text-[10px] text-[#2E9B68] font-semibold mt-0.5">Underway at sea</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#182350] shadow-2xs">
          <div className="text-[10.5px] font-bold text-[#737985] uppercase tracking-wider">At Berth / Port</div>
          <div className="text-2xl font-black text-[#182350] mt-0.5">{stats.atBerth}</div>
          <div className="text-[10px] text-[#737985] mt-0.5">Anchored / Docked</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#182350] shadow-2xs">
          <div className="text-[10.5px] font-bold text-[#737985] uppercase tracking-wider">Maintenance</div>
          <div className="text-2xl font-black text-[#B9915E] mt-0.5">{stats.underMaintenance}</div>
          <div className="text-[10px] text-[#737985] mt-0.5">Dry-dock inspection</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#182350] shadow-2xs">
          <div className="text-[10.5px] font-bold text-[#737985] uppercase tracking-wider">Class-A Health</div>
          <div className="text-2xl font-black text-[#2E9B68] mt-0.5">{stats.excellentHealth}</div>
          <div className="text-[10px] text-[#2E9B68] font-semibold mt-0.5">Optimal condition</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#182350] shadow-2xs">
          <div className="text-[10.5px] font-bold text-[#737985] uppercase tracking-wider">Avg Fuel Reserve</div>
          <div className="text-2xl font-black text-[#182350] mt-0.5">{stats.avgFuel}%</div>
          <div className="text-[10px] text-[#737985] mt-0.5">Fleetwide bunker</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#182350] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by vessel name, ID, IMO, captain, location, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-xs font-sans border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none focus:border-[#AFD2FA]"
            />
            <span className="absolute left-3 top-2.5 text-[#737985] text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-[#737985] hover:text-[#182350] text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns & View Toggle */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
            <select
              value={selectedHealth}
              onChange={(e) => setSelectedHealth(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#182350] bg-white text-[#182350] outline-none cursor-pointer"
            >
              <option value="ALL">All Health</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Needs Maintenance">Needs Maintenance</option>
              <option value="Critical">Critical</option>
            </select>

            <select
              value={selectedFuel}
              onChange={(e) => setSelectedFuel(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#182350] bg-white text-[#182350] outline-none cursor-pointer"
            >
              <option value="ALL">All Fuel Types</option>
              <option value="LNG">LNG</option>
              <option value="Methanol">Methanol</option>
              <option value="Ammonia">Ammonia</option>
              <option value="Hydrogen">Hydrogen</option>
              <option value="Conventional">Conventional</option>
            </select>

            {/* View Switcher */}
            <div className="flex rounded-lg border border-[#182350] overflow-hidden bg-[#FAFAF5]">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 font-bold transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-[#182350] text-white" : "text-[#737985] hover:text-[#182350]"
                }`}
                title="Table List View"
              >
                ☰ Table
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 font-bold transition-all cursor-pointer ${
                  viewMode === "grid" ? "bg-[#182350] text-white" : "text-[#737985] hover:text-[#182350]"
                }`}
                title="Grid Cards View"
              >
                ▦ Cards
              </button>
            </div>
          </div>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {["ALL", "In Voyage", "At Berth", "Under Maintenance", "Docking/Undocking"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedStatus === status
                  ? "bg-[#182350] text-white shadow-2xs"
                  : "bg-[#FAFAF5] text-[#737985] hover:text-[#182350] border border-[#182350]"
              }`}
            >
              {status === "ALL" ? `All Vessels (${ships.length})` : status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table / Grid View */}
      {viewMode === "table" ? (
        <div className="rounded-xl overflow-hidden shadow-xs border border-[#182350] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-[#182350] bg-[#F7F5EE] text-[#737985] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Vessel Name</th>
                  <th className="py-3 px-4">Model & Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Health</th>
                  <th className="py-3 px-4">Fuel</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4 text-center">CII</th>
                  <th className="py-3 px-4">Captain</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE8DF]">
                {filteredShips.map((ship) => {
                  const hStyle = healthColors[ship.health];
                  const sStyle = statusColors[ship.status];
                  const isExpanded = expandedShipId === ship.id;

                  return (
                    <tr
                      key={ship.id}
                      className="hover:bg-[#FDFBF7] transition-colors duration-150"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedShipId(isExpanded ? null : ship.id)}
                            className="text-[#737985] hover:text-[#182350] font-bold cursor-pointer"
                          >
                            {isExpanded ? "▼" : "▶"}
                          </button>
                          <div>
                            <div className="font-bold text-[#182350]">{ship.name}</div>
                            <div className="text-[10px] font-mono text-[#737985]">{ship.id} · {ship.imo}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-[#182350]">{ship.vesselType}</div>
                        <div className="text-[10px] text-[#737985]">{ship.model}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-[#182350] font-medium">{ship.location}</div>
                        <div className="text-[10px] text-[#737985]">{ship.currentSpeed}</div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block"
                          style={{
                            background: sStyle.bg,
                            color: sStyle.text,
                            border: `1px solid ${sStyle.border}`,
                          }}
                        >
                          {ship.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                          style={{
                            background: hStyle.bg,
                            color: hStyle.text,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: hStyle.dot }} />
                          {ship.health}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#182350]">{ship.fuelType}</span>
                          <span className="text-[10px] text-[#737985]">({ship.fuelPercentage}%)</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-[#182350]">
                        {ship.capacity} {ship.capacityUnit}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA]">
                          {ship.cii}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#3F4654]">{ship.captain}</td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDrawerShip(ship)}
                            className="px-2 py-1 rounded bg-[#EAF4FE] text-[#182350] hover:bg-[#AFD2FA] text-[11px] font-bold cursor-pointer"
                            title="Inspect Deep Telemetry & Details"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => setEditingShip(ship)}
                            className="px-2 py-1 rounded bg-[#FAFAF5] text-[#737985] hover:text-[#182350] border border-[#182350] text-[11px] cursor-pointer"
                            title="Edit Vessel"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteShip(ship.id)}
                            className="px-2 py-1 rounded bg-white text-[#C94B4B] hover:bg-[#FEE2E2] border border-[#182350] text-[11px] cursor-pointer"
                            title="Decommission Ship"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShips.map((ship) => {
            const hStyle = healthColors[ship.health];
            const sStyle = statusColors[ship.status];

            return (
              <div
                key={ship.id}
                className="p-5 rounded-xl bg-white border border-[#182350] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#AFD2FA] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-extrabold text-[#182350]">{ship.name}</div>
                      <div className="text-xs text-[#737985] font-sans">{ship.vesselType}</div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: sStyle.bg,
                        color: sStyle.text,
                        border: `1px solid ${sStyle.border}`,
                      }}
                    >
                      {ship.status}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#FAFAF5] border border-[#182350] grid grid-cols-2 gap-2 text-xs font-sans mb-3">
                    <div>
                      <span className="text-[#737985] text-[10px] uppercase font-bold block">Location</span>
                      <span className="font-medium text-[#182350] truncate block">{ship.location}</span>
                    </div>
                    <div>
                      <span className="text-[#737985] text-[10px] uppercase font-bold block">Capacity</span>
                      <span className="font-mono font-bold text-[#182350] block">{ship.capacity} {ship.capacityUnit}</span>
                    </div>
                    <div>
                      <span className="text-[#737985] text-[10px] uppercase font-bold block">Fuel & Tank</span>
                      <span className="font-medium text-[#182350] block">{ship.fuelType} ({ship.fuelPercentage}%)</span>
                    </div>
                    <div>
                      <span className="text-[#737985] text-[10px] uppercase font-bold block">Captain</span>
                      <span className="text-[#182350] truncate block">{ship.captain}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: hStyle.dot }} />
                      <span className="text-[#737985]">Health:</span>{" "}
                      <strong className="text-[#182350]">{ship.health}</strong>
                    </span>
                    <span className="font-mono text-[#182350] font-bold">CII: {ship.cii}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#ECE8DF]">
                  <button
                    onClick={() => setDrawerShip(ship)}
                    className="flex-1 py-2 rounded-lg bg-[#EAF4FE] hover:bg-[#AFD2FA] text-[#182350] font-bold text-xs cursor-pointer text-center"
                  >
                    Inspect Vessel
                  </button>
                  <button
                    onClick={() => setEditingShip(ship)}
                    className="py-2 px-3 rounded-lg border border-[#182350] bg-white text-[#737985] hover:text-[#182350] text-xs cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteShip(ship.id)}
                    className="py-2 px-3 rounded-lg border border-[#182350] bg-white text-[#C94B4B] hover:bg-[#FEE2E2] text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-Over Inspection Drawer */}
      {drawerShip && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right">
            <div className="flex items-start justify-between pb-4 border-b border-[#ECE8DF]">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#B9915E] uppercase tracking-widest">
                  {drawerShip.id} · {drawerShip.imo}
                </span>
                <h2 className="text-xl font-extrabold text-[#182350]">{drawerShip.name}</h2>
                <div className="text-xs text-[#737985] font-sans">{drawerShip.vesselType}</div>
              </div>
              <button
                onClick={() => setDrawerShip(null)}
                className="w-8 h-8 rounded-lg bg-[#FAFAF5] border border-[#182350] text-[#737985] hover:text-[#182350] flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Identity & Specs */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#182350]">
                Identity & Specifications
              </div>
              <div className="p-4 rounded-xl bg-[#FAFAF5] border border-[#182350] grid grid-cols-2 gap-3 text-xs font-sans">
                <div>
                  <span className="text-[#737985]">Flag / Registry:</span>
                  <div className="font-bold text-[#182350]">{drawerShip.flag}</div>
                </div>
                <div>
                  <span className="text-[#737985]">Model / Class:</span>
                  <div className="font-bold text-[#182350]">{drawerShip.model}</div>
                </div>
                <div>
                  <span className="text-[#737985]">Deadweight Tonnage:</span>
                  <div className="font-mono font-bold text-[#182350]">{drawerShip.dwt}</div>
                </div>
                <div>
                  <span className="text-[#737985]">Gross Tonnage:</span>
                  <div className="font-mono text-[#182350]">{drawerShip.grossTonnage}</div>
                </div>
                <div>
                  <span className="text-[#737985]">Cruising Speed:</span>
                  <div className="font-bold text-[#182350]">{drawerShip.cruisingSpeed}</div>
                </div>
                <div>
                  <span className="text-[#737985]">Shipyard:</span>
                  <div className="text-[#182350]">{drawerShip.shipyard}</div>
                </div>
              </div>
            </div>

            {/* Condition & Maintenance */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#182350]">
                Condition & Regulatory Status
              </div>
              <div className="p-4 rounded-xl bg-[#FAFAF5] border border-[#182350] grid grid-cols-2 gap-3 text-xs font-sans">
                <div>
                  <span className="text-[#737985]">Health Status:</span>
                  <div className="font-bold text-[#182350]">{drawerShip.health}</div>
                </div>
                <div>
                  <span className="text-[#737985]">CII Rating:</span>
                  <div className="font-bold text-[#182350]">Class {drawerShip.cii}</div>
                </div>
                <div>
                  <span className="text-[#737985]">Last Dry-Dock:</span>
                  <div className="font-mono text-[#182350]">{drawerShip.lastDryDock}</div>
                </div>
                <div>
                  <span className="text-[#737985]">Next Maintenance:</span>
                  <div className="font-mono text-[#182350]">{drawerShip.nextMaintenance}</div>
                </div>
                <div>
                  <span className="text-[#737985]">Shore Power:</span>
                  <div className="font-semibold text-[#2E9B68]">
                    {drawerShip.shorePower ? "✓ AMP High-Voltage Compatible" : "Not Equipped"}
                  </div>
                </div>
              </div>
            </div>

            {/* Engine & Fuel Compatibility */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#182350]">
                Powertrain & Fuel Compatibility
              </div>
              <div className="p-4 rounded-xl bg-[#FAFAF5] border border-[#182350] space-y-2 text-xs font-sans">
                <div className="flex justify-between">
                  <span className="text-[#737985]">Engine Type:</span>
                  <span className="font-bold text-[#182350]">{drawerShip.engineType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737985]">Engine Power:</span>
                  <span className="font-mono font-bold text-[#182350]">{drawerShip.enginePower}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#ECE8DF]">
                  <span className="text-[#737985]">Compatible Dual Fuels:</span>
                  <div className="flex gap-1">
                    {drawerShip.fuelCompatibility.map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded bg-white border border-[#182350] text-[10px] font-mono font-bold text-[#182350]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Status History */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#182350]">
                Recent Event Timeline
              </div>
              <div className="space-y-2">
                {drawerShip.statusHistory.map((h, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#FAFAF5] border border-[#182350] flex justify-between text-xs font-sans">
                    <span className="text-[#182350] font-medium">{h.event}</span>
                    <span className="text-[#737985]">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#ECE8DF] flex gap-3">
              <button
                onClick={() => {
                  if (onSelectShipForLayout) onSelectShipForLayout(drawerShip.id);
                  setDrawerShip(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#182350] hover:bg-[#233373] text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Inspect in 2D Cargo Layout →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ship Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#182350] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE8DF]">
              <h2 className="text-base font-extrabold text-[#182350]">Register New Fleet Vessel</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#737985] hover:text-[#182350] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShip} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">
                    Vessel Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MV Pacific Voyager"
                    value={newShipForm.name}
                    onChange={(e) => setNewShipForm({ ...newShipForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">
                    Vessel Model Preset
                  </label>
                  <select
                    value={newShipForm.model}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                  >
                    {VESSEL_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">
                    Vessel Type
                  </label>
                  <input
                    type="text"
                    value={newShipForm.vesselType}
                    onChange={(e) => setNewShipForm({ ...newShipForm, vesselType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">
                    Captain In-Charge
                  </label>
                  <input
                    type="text"
                    value={newShipForm.captain}
                    onChange={(e) => setNewShipForm({ ...newShipForm, captain: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">
                    Primary Fuel Type
                  </label>
                  <select
                    value={newShipForm.fuelType}
                    onChange={(e) => setNewShipForm({ ...newShipForm, fuelType: e.target.value as FuelType })}
                    className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                  >
                    <option value="LNG">LNG</option>
                    <option value="Methanol">Methanol</option>
                    <option value="Ammonia">Ammonia</option>
                    <option value="Hydrogen">Hydrogen</option>
                    <option value="Conventional">Conventional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">
                    Capacity (DWT)
                  </label>
                  <input
                    type="text"
                    value={newShipForm.capacity}
                    onChange={(e) => setNewShipForm({ ...newShipForm, capacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">
                    Current Location / Port
                  </label>
                  <input
                    type="text"
                    value={newShipForm.location}
                    onChange={(e) => setNewShipForm({ ...newShipForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">
                    Operational Status
                  </label>
                  <select
                    value={newShipForm.status}
                    onChange={(e) => setNewShipForm({ ...newShipForm, status: e.target.value as OpStatus })}
                    className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                  >
                    <option value="At Berth">At Berth</option>
                    <option value="In Voyage">In Voyage</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Docking/Undocking">Docking/Undocking</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#ECE8DF] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#182350] bg-white text-[#737985] hover:text-[#182350] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-[#182350] hover:bg-[#233373] text-white font-bold uppercase tracking-wider shadow-xs cursor-pointer"
                >
                  Register Vessel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ship Modal */}
      {editingShip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#182350] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE8DF]">
              <h2 className="text-base font-extrabold text-[#182350]">Edit Vessel Details: {editingShip.name}</h2>
              <button
                onClick={() => setEditingShip(null)}
                className="text-[#737985] hover:text-[#182350] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateShip} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">Vessel Name</label>
                <input
                  type="text"
                  value={editingShip.name}
                  onChange={(e) => setEditingShip({ ...editingShip, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">Captain</label>
                <input
                  type="text"
                  value={editingShip.captain}
                  onChange={(e) => setEditingShip({ ...editingShip, captain: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">Location</label>
                <input
                  type="text"
                  value={editingShip.location}
                  onChange={(e) => setEditingShip({ ...editingShip, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">Status</label>
                  <select
                    value={editingShip.status}
                    onChange={(e) => setEditingShip({ ...editingShip, status: e.target.value as OpStatus })}
                    className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                  >
                    <option value="In Voyage">In Voyage</option>
                    <option value="At Berth">At Berth</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Docking/Undocking">Docking/Undocking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#182350] uppercase mb-1">Health Status</label>
                  <select
                    value={editingShip.health}
                    onChange={(e) => setEditingShip({ ...editingShip, health: e.target.value as HealthStatus })}
                    className="w-full px-3 py-2 rounded-lg border border-[#182350] bg-[#FAFAF5] text-[#182350] outline-none"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Needs Maintenance">Needs Maintenance</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#ECE8DF] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingShip(null)}
                  className="px-4 py-2 rounded-lg border border-[#182350] bg-white text-[#737985] hover:text-[#182350] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-[#182350] hover:bg-[#233373] text-white font-bold uppercase tracking-wider shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
