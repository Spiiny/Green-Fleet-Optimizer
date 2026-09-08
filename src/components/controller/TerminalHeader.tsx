import { useState, useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Menu,
  X,
  Hexagon,
  Zap,
  Bell,
  Phone,
  ChevronDown,
  Shield,
  LogOut,
} from "lucide-react";
import { TextRoll } from "../ui/animated-menu";
import { motion } from "framer-motion";

export type ControllerTab =
  | "overview"
  | "vessel"
  | "manage"
  | "layout"
  | "map"
  | "routes"
  | "whatif"
  | "orders"
  | "captains"
  | "schedule";

interface Props {
  activeTab: ControllerTab;
  onSelectTab: (tab: ControllerTab) => void;
  username: string;
  onLogout: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  msg: string;
  type: "alert" | "success" | "info";
  time: string;
  tab?: ControllerTab;
}

const initialNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "Storm Advisory",
    msg: "Adverse wave swell in Bay of Bengal. Route Bravo auto-recommended for MV Green Horizon.",
    type: "alert",
    time: "10m ago",
    tab: "routes",
  },
  {
    id: "2",
    title: "CII Verified Class-A",
    msg: "MV Eco Pioneer achieved 18.2% bunker reduction on Colombo–Singapore transit.",
    type: "success",
    time: "45m ago",
    tab: "overview",
  },
  {
    id: "3",
    title: "2D Hold Trim Balanced",
    msg: "MV Quantum Star LCG metacentric equilibrium verified. Hull trim drag reduced by 3.4%.",
    type: "info",
    time: "2h ago",
    tab: "layout",
  },
];

export default function TerminalHeader({
  activeTab,
  onSelectTab,
  username,
  onLogout,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".terminal-dropdown-container")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleDropdown = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNotifications(false);
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const toggleMenu = () => {
    setShowNotifications(false);
    setOpenDropdown(null);
    setIsOpen(!isOpen);
  };

  const handleSelectNav = (tab: ControllerTab) => {
    onSelectTab(tab);
    setIsOpen(false);
    setOpenDropdown(null);
  };

  // GSAP Slide-In Menu Animation
  useGSAP(
    () => {
      if (isOpen) {
        gsap.to(menuRef.current, { x: "0%", duration: 0.7, ease: "power4.inOut" });
        gsap.fromTo(
          ".nav-link",
          { y: 80, opacity: 0, rotateX: -15 },
          { y: 0, opacity: 1, rotateX: 0, duration: 0.7, stagger: 0.08, delay: 0.15, ease: "power3.out" }
        );
      } else {
        gsap.to(menuRef.current, { x: "100%", duration: 0.6, ease: "power4.inOut" });
      }
    },
    { scope: containerRef, dependencies: [isOpen] }
  );

  const fullNavLinks: { id: ControllerTab; label: string; sub: string }[] = [
    { id: "overview", label: "Fleet Overview", sub: "Command Matrix & Telemetry" },
    { id: "vessel", label: "Vessel Info", sub: "Flagship Real-Time Cockpit" },
    { id: "manage", label: "Manage Ships", sub: "Fleet Inventory & IMO Specs" },
    { id: "orders", label: "Orders", sub: "Commercial Consignments & Scoring" },
    { id: "layout", label: "Cargo & Layout", sub: "Hold Hydrodynamics & 2D LCG" },
    { id: "map", label: "Live Map", sub: "Global AIS Tactical Radar" },
    { id: "routes", label: "Route Optimization", sub: "Quantum-Inspired Pathfinding" },
    { id: "whatif", label: "What-If Analysis", sub: "Monte Carlo Risk & Disruption" },
    { id: "captains", label: "Captains", sub: "2-Way Satellite Bridge Dispatch" },
  ];

  return (
    <div ref={containerRef} className="w-full relative z-40 select-none">
      {/* ── Top Floating Terminal Capsule Header with Website Color Palette ── */}
      <div className="w-full px-4 sm:px-6 pt-3 pb-1.5">
        <header
          className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5 rounded-2xl shadow-xl border border-[#AFD2FA]/25 transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #182350 0%, #0F1838 100%)",
            color: "#FFFFFF",
          }}
        >
          {/* Left: Terminal Logo & Brand */}
          <div
            onClick={() => handleSelectNav("overview")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-[#AFD2FA]/20 hover:bg-[#AFD2FA]/30 backdrop-blur-md flex items-center justify-center border border-[#AFD2FA]/40 text-[#AFD2FA] font-black text-sm shadow-xs transition-all">
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                <path d="M4 4h12v3H11v9H9V7H4V4z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-black tracking-tight text-white font-sans flex items-center gap-1 leading-none">
                <span>Green Fleet</span>
              </span>
              <span className="text-[9px] font-mono tracking-wider uppercase text-[#AFD2FA] font-bold">
                Controller Hub
              </span>
            </div>
          </div>

          {/* Center: Clean Nav Dropdowns */}
          <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-semibold tracking-wide terminal-dropdown-container">
            {/* 1. System Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => toggleDropdown("system", e)}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  openDropdown === "system" || ["overview", "vessel", "manage", "orders", "schedule"].includes(activeTab)
                    ? "text-[#AFD2FA] font-bold"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <span>System</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${openDropdown === "system" ? "rotate-180" : ""}`}
                />
              </button>

              {openDropdown === "system" && (
                <div className="absolute top-full left-0 mt-3 w-60 bg-white rounded-xl shadow-2xl border border-[#182350]/20 py-2 text-left z-50 text-[#182350] animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-mono text-[#737985] uppercase font-bold tracking-wider">
                    Core Operational Modules
                  </div>
                  <button
                    onClick={() => handleSelectNav("overview")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "overview" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>◈</span>
                    <span>Fleet Overview</span>
                  </button>
                  <button
                    onClick={() => handleSelectNav("vessel")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "vessel" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>⛴</span>
                    <span>Vessel Info Cockpit</span>
                  </button>
                  <button
                    onClick={() => handleSelectNav("manage")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "manage" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>⚙</span>
                    <span>Manage Ships & Registry</span>
                  </button>
                  <button
                    onClick={() => handleSelectNav("orders")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "orders" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>📋</span>
                    <span>Orders Flow & Logistics</span>
                  </button>
                  <button
                    onClick={() => handleSelectNav("schedule")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "schedule" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>📅</span>
                    <span>Fleet Schedule</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. AI Engines Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => toggleDropdown("ai", e)}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  openDropdown === "ai" || ["routes", "layout", "whatif", "map"].includes(activeTab)
                    ? "text-[#AFD2FA] font-bold"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <span>AI Engines</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${openDropdown === "ai" ? "rotate-180" : ""}`}
                />
              </button>

              {openDropdown === "ai" && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-[#182350]/20 py-2 text-left z-50 text-[#182350] animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-mono text-[#737985] uppercase font-bold tracking-wider">
                    Optimization Engines
                  </div>
                  <button
                    onClick={() => handleSelectNav("routes")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "routes" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>⟳</span>
                    <span>Route Optimization (Quantum)</span>
                  </button>
                  <button
                    onClick={() => handleSelectNav("layout")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "layout" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>▦</span>
                    <span>Cargo & 2D Trim Drag</span>
                  </button>
                  <button
                    onClick={() => handleSelectNav("map")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "map" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>◎</span>
                    <span>Live Map (Global AIS)</span>
                  </button>
                  <button
                    onClick={() => handleSelectNav("whatif")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "whatif" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>⚗</span>
                    <span>What-If Analysis (Monte Carlo)</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Operations Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => toggleDropdown("ops", e)}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  openDropdown === "ops" || ["orders", "captains"].includes(activeTab)
                    ? "text-[#AFD2FA] font-bold"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <span>Operations</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${openDropdown === "ops" ? "rotate-180" : ""}`}
                />
              </button>

              {openDropdown === "ops" && (
                <div className="absolute top-full left-0 mt-3 w-60 bg-white rounded-xl shadow-2xl border border-[#182350]/20 py-2 text-left z-50 text-[#182350] animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-mono text-[#737985] uppercase font-bold tracking-wider">
                    Logistics & Bridge
                  </div>
                  <button
                    onClick={() => handleSelectNav("orders")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "orders" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>📋</span>
                    <span>Orders Flow & Allocation</span>
                  </button>
                  <button
                    onClick={() => handleSelectNav("captains")}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-[#EAF4FE] transition-colors flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "captains" ? "bg-[#EAF4FE] text-[#182350] font-bold" : ""
                    }`}
                  >
                    <span>⚓</span>
                    <span>Captains Assignment Portal</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. About */}
            <button
              onClick={() => setShowAboutModal(true)}
              className="text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              About
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Logout Pill Button */}
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-white/10 hover:bg-[#C94B4B] text-white border border-white/15 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              title={`Logged in as ${username} · Click to Logout`}
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Full-Screen Animated Menu Trigger Button */}
            <button
              onClick={toggleMenu}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all cursor-pointer shadow-xs flex items-center justify-center ml-0.5"
              title="Open Fullscreen Navigation Matrix"
            >
              {isOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </header>
      </div>

      {/* ── Immersive Full-Screen GSAP Overlay ── */}
      <div
        ref={menuRef}
        className="fixed inset-0 bg-[#081424] z-50 flex items-center justify-center translate-x-full overflow-hidden select-none"
      >
        {/* Background Decor */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#AFD2FA] via-transparent to-transparent scale-150 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-[500px] bg-gradient-to-t from-[#182350]/60 to-transparent pointer-events-none" />

        {/* Top Close Button in Overlay */}
        <button
          onClick={toggleMenu}
          className="absolute top-6 right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer z-50 flex items-center gap-2 font-mono text-xs uppercase"
        >
          <span>Close</span>
          <X size={18} />
        </button>

        {/* Content Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 w-full max-w-7xl px-6 sm:px-12 h-full pt-28 pb-10">
          {/* Left Column: Staggered Animated Nav Links using TextRoll */}
          <div className="lg:col-span-8 flex flex-col justify-center gap-2 sm:gap-3.5 overflow-y-auto pr-4">
            {fullNavLinks.map((item) => {
              const isCurrent = activeTab === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectNav(item.id)}
                  className="nav-link group relative block w-fit cursor-pointer"
                >
                  <motion.div
                    initial="initial"
                    whileHover="hovered"
                    className="flex items-baseline gap-4 transition-all duration-300"
                  >
                    <div
                      className={`text-[5.5vw] lg:text-[2.5vw] font-black uppercase leading-[0.9] tracking-tight flex flex-wrap gap-x-[0.25em] ${
                        isCurrent
                          ? "text-transparent bg-clip-text bg-gradient-to-r from-white via-[#AFD2FA] to-[#B9915E]"
                          : "text-white/40 group-hover:text-white transition-colors"
                      }`}
                    >
                      {item.label.split(" ").map((word, i) => (
                        <TextRoll key={i} useHover={false} baseDelay={i * 2}>
                          {word}
                        </TextRoll>
                      ))}
                    </div>

                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#AFD2FA] opacity-0 group-hover:opacity-100 transition-opacity delay-75 hidden md:inline-block">
                      // {item.sub}
                    </span>
                  </motion.div>
                </div>
              );
            })}

            {/* Logout Action in Overlay */}
            <div
              onClick={onLogout}
              className="nav-link group relative block w-fit cursor-pointer pt-3"
            >
              <div className="flex items-center gap-3 text-red-400/70 hover:text-red-400 transition-colors">
                <LogOut size={22} />
                <span className="text-xl sm:text-2xl font-bold uppercase tracking-wider font-mono">
                  Logout Session ({username})
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Tech Telemetry & System Status Sidebar */}
          <div className="hidden lg:flex lg:col-span-4 flex-col justify-center items-start border-l border-white/10 pl-12 text-white/60 space-y-8">
            <div className="nav-link space-y-6">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#AFD2FA] mb-2 flex items-center gap-2">
                  <Shield size={14} />
                  <span>Fleet System Status</span>
                </h4>
                <div className="flex items-center gap-3 text-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2E9B68] animate-pulse" />
                  <span className="text-2xl font-light font-sans">
                    100% Operational
                  </span>
                </div>
                <p className="text-xs text-white/50 font-mono mt-1">
                  5/5 Vessels AIS Synchronized · Satcom Lock
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#AFD2FA] mb-2">
                  Decarbonization Index
                </h4>
                <p className="text-3xl font-light text-white font-mono">
                  16.8% Fuel Cut
                </p>
                <p className="text-xs text-[#2E9B68] font-mono font-bold">
                  Verified IMO CII Grade-A Compliance
                </p>
              </div>

              <div className="pt-6 border-t border-white/10">
                <Zap size={36} className="text-[#AFD2FA] mb-3" />
                <p className="max-w-xs text-xs text-white/70 leading-relaxed font-sans">
                  "Quantum-Inspired Maritime Optimization" <br />
                  Minimizing fuel burn, GHG intensity, and demurrage penalties across global routes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact / Operational Communications Modal ── */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#182350]/20 space-y-4 text-[#182350]">
            <div className="flex items-center justify-between pb-3 border-b border-[#182350]/20">
              <div className="flex items-center gap-2">
                <Phone size={18} className="text-[#2E9B68]" />
                <h3 className="text-base font-extrabold text-[#182350]">
                  Maritime Operations Hotline
                </h3>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-[#737985] hover:text-[#182350] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs font-sans text-[#3F4654]">
              <div><strong>VHF Channel 16:</strong> International Distress & Safety</div>
              <div><strong>INMARSAT Satcom:</strong> +870 773 209 110</div>
              <div><strong>Fleet Operations Desk:</strong> ops@greenfleet-maritime.org</div>
              <div><strong>AIS Satellite Provider:</strong> MarineTraffic / Spire Global</div>
            </div>
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full py-2 rounded-xl text-xs font-mono font-bold uppercase bg-[#182350] text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── About Modal ── */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#182350]/20 space-y-4 text-[#182350]">
            <div className="flex items-center justify-between pb-3 border-b border-[#182350]/20">
              <div className="flex items-center gap-2">
                <Hexagon size={18} className="text-[#182350]" />
                <h3 className="text-base font-extrabold text-[#182350]">
                  About GreenFleet OS
                </h3>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-[#737985] hover:text-[#182350] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#3F4654] font-sans leading-relaxed">
              Developed for the Smart India Hackathon (SIH 2026) under the Ministry of Ports, Shipping & Waterways. GreenFleet OS provides end-to-end multi-objective route pathfinding, 2D hold stability, and dual-fuel decarbonization under IMO 2030 CII mandates.
            </p>
            <div className="p-2.5 rounded-xl bg-[#FAFAF5] border border-[#182350]/20 text-[11px] font-mono">
              Version: <strong>2.6.4 Flagship Release</strong> · Status: <span className="text-[#2E9B68]">Verified</span>
            </div>
            <button
              onClick={() => setShowAboutModal(false)}
              className="w-full py-2 rounded-xl text-xs font-mono font-bold uppercase bg-[#182350] text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
