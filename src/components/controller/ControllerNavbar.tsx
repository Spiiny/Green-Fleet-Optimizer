import { useState, useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Menu, X, Hexagon, Zap, Bell, Shield, LogOut } from "lucide-react";
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
  | "captains";

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
}

const initialNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "Storm Advisory",
    msg: "Adverse wave swell in Bay of Bengal. Route Bravo auto-recommended for MV Green Horizon.",
    type: "alert",
    time: "10m ago",
  },
  {
    id: "2",
    title: "CII Verified Class-A",
    msg: "MV Eco Pioneer achieved 18.2% bunker reduction on Colombo–Singapore transit.",
    type: "success",
    time: "45m ago",
  },
  {
    id: "3",
    title: "2D Hold Trim Balanced",
    msg: "MV Quantum Star LCG metacentric equilibrium verified. Hull trim drag reduced by 3.4%.",
    type: "info",
    time: "2h ago",
  },
];

export default function ControllerNavbar({
  activeTab,
  onSelectTab,
  username,
  onLogout,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const [showNotifications, setShowNotifications] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setShowNotifications(false);
    setIsOpen(!isOpen);
  };

  const handleSelectNav = (tab: ControllerTab) => {
    onSelectTab(tab);
    setIsOpen(false);
  };

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

  const navLinksList: { id: ControllerTab; label: string; sub: string }[] = [
    { id: "overview", label: "Fleet Command", sub: "Operational Matrix & Telemetry" },
    { id: "vessel", label: "Vessel Cockpit", sub: "Real-Time Flagship Telemetry" },
    { id: "manage", label: "Ship Registry", sub: "Vessel Inventory & IMO Specs" },
    { id: "layout", label: "Cargo & 2D Trim", sub: "Hold Hydrodynamics & LCG Balance" },
    { id: "map", label: "Tactical Live Map", sub: "Global AIS Radar & Weather" },
    { id: "routes", label: "Quantum Pathfinding", sub: "Multi-Physics AI Optimization" },
    { id: "whatif", label: "What-If Simulator", sub: "Scenario & Disruption Modeling" },
    { id: "orders", label: "Orders Engine", sub: "Commercial Consignments & Scoring" },
    { id: "captains", label: "Bridge Captains", sub: "2-Way Satellite Dispatch" },
  ];

  return (
    <div ref={containerRef} className="relative z-40">
      {/* ── Dynamic Floating Frosted Capsule Navbar ── */}
      <motion.nav
        initial={false}
        animate={{
          width: "96%",
          backgroundColor: isOpen
            ? "rgba(8, 20, 36, 0)"
            : "rgba(24, 35, 80, 0.94)",
          backdropFilter: isOpen ? "none" : "blur(20px)",
          borderColor: isOpen ? "rgba(255, 255, 255, 0)" : "rgba(175, 210, 250, 0.25)",
          y: scrolled ? 6 : 10,
        }}
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 flex justify-between items-center px-4 sm:px-6 py-2.5 rounded-2xl sm:rounded-full border transition-all duration-300 ${
          isOpen ? "" : "shadow-xl shadow-[#081424]/30"
        }`}
      >
        {/* Left: Brand / Logo */}
        <div
          onClick={() => handleSelectNav("overview")}
          className="flex items-center gap-3 group z-50 cursor-pointer select-none"
        >
          <div
            className={`p-2 rounded-xl transition-all duration-300 ${
              isOpen
                ? "bg-white text-[#182350] shadow-md"
                : "bg-gradient-to-br from-[#AFD2FA] to-[#182350] text-white shadow-md border border-[#AFD2FA]/40"
            }`}
          >
            <Hexagon
              size={22}
              strokeWidth={2.4}
              className={isOpen ? "" : "group-hover:rotate-90 transition-transform duration-500"}
            />
          </div>

          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight leading-none text-white font-sans flex items-center gap-1">
              <span>GreenFleet</span>
              <span className="text-[#AFD2FA] font-mono">OS</span>
            </span>
            <span className="text-[9.5px] font-mono font-bold tracking-[0.18em] uppercase text-[#AFD2FA]/80">
              Controller Cockpit
            </span>
          </div>
        </div>

        {/* Center: Live Telemetry Status Beacon (Desktop) */}
        {!isOpen && (
          <div className="hidden xl:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#2E9B68] animate-pulse" />
            <span className="text-white/90">SAT-UPLINK: 42ms</span>
            <span className="text-white/20">|</span>
            <span className="text-[#AFD2FA] font-bold">5/5 ONLINE</span>
            <span className="text-white/20">|</span>
            <span className="text-[#2E9B68] font-bold">IMO CII CLASS-A</span>
          </div>
        )}

        {/* Right: Notifications, Operator Info & Animated Menu Button */}
        <div className="flex items-center gap-2 sm:gap-3 z-50">
          {/* Notifications Dropdown Trigger */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors relative cursor-pointer"
              title="Fleet Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#C94B4B] rounded-full border-2 border-[#182350]" />
              )}
            </motion.button>

            {/* Notification Panel */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-3 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-[#E6E2D8] overflow-hidden text-left z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-3.5 border-b border-[#ECE8DF] flex justify-between items-center bg-[#FAFAF5]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2E9B68] animate-pulse" />
                    <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-[#182350]">
                      Telemetry Advisories
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#182350] bg-[#EAF4FE] border border-[#AFD2FA] px-2 py-0.5 rounded-full">
                    {unreadCount} Active
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-[#ECE8DF]">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 hover:bg-[#FAFAF5] transition-colors flex items-start gap-3"
                    >
                      <div
                        className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                          n.type === "alert"
                            ? "bg-[#C94B4B]"
                            : n.type === "success"
                            ? "bg-[#2E9B68]"
                            : "bg-[#182350]"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="font-bold text-xs text-[#182350] truncate">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-[#737985] font-mono whitespace-nowrap ml-2">
                            {n.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#3F4654] font-sans leading-relaxed">
                          {n.msg}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2 border-t border-[#ECE8DF] bg-[#FAFAF5] text-center">
                  <button
                    onClick={() => {
                      setUnreadCount(0);
                      setShowNotifications(false);
                    }}
                    className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#182350] hover:text-[#233372] p-1.5 cursor-pointer"
                  >
                    Acknowledge All Advisories
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Operator Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-[#AFD2FA]" />
            <span className="text-xs font-mono font-bold uppercase truncate max-w-[110px]">
              {username}
            </span>
          </div>

          {/* Interactive Toggle Menu Button */}
          <motion.button
            onClick={toggleMenu}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative group px-4 py-1.5 flex items-center gap-2 font-mono font-bold uppercase tracking-wider text-xs rounded-full transition-all duration-300 cursor-pointer ${
              isOpen
                ? "text-[#182350] bg-white hover:bg-[#FAFAF5] shadow-md"
                : "text-white bg-[#AFD2FA]/20 hover:bg-[#AFD2FA]/30 border border-[#AFD2FA]/30"
            }`}
          >
            <span>{isOpen ? "Close" : "Menu"}</span>
            <div
              className={`p-1 rounded-full ${
                isOpen ? "bg-[#182350] text-white" : "bg-white/10 text-white"
              }`}
            >
              {isOpen ? <X size={16} /> : <Menu size={16} />}
            </div>
          </motion.button>

          {/* Direct Logout Icon */}
          <button
            onClick={onLogout}
            className="p-2 rounded-full text-white/70 hover:text-[#FF8F8F] hover:bg-white/10 transition-colors cursor-pointer"
            title="Logout of Controller Hub"
          >
            <LogOut size={16} />
          </button>
        </div>
      </motion.nav>

      {/* ── Immersive Full-Screen GSAP Overlay ── */}
      <div
        ref={menuRef}
        className="fixed inset-0 bg-[#081424] z-40 flex items-center justify-center translate-x-full overflow-hidden select-none"
      >
        {/* Background Gradient & Glow Effects */}
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#AFD2FA] via-transparent to-transparent scale-150 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-[500px] bg-gradient-to-t from-[#182350]/50 to-transparent pointer-events-none" />

        {/* Content Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 w-full max-w-7xl px-6 sm:px-12 h-full pt-28 pb-10">
          {/* Left Column: Animated Navigation Links */}
          <div className="lg:col-span-8 flex flex-col justify-center gap-2 sm:gap-4 overflow-y-auto pr-4">
            {navLinksList.map((item) => {
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
                      className={`text-[5.5vw] lg:text-[2.6vw] font-black uppercase leading-[0.9] tracking-tight flex flex-wrap gap-x-[0.25em] ${
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
          </div>

          {/* Right Column: High-Tech Telemetry & System Status Sidebar */}
          <div className="hidden lg:flex lg:col-span-4 flex-col justify-center items-start border-l border-white/10 pl-12 text-white/60 space-y-8">
            <div className="nav-link space-y-6">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#AFD2FA] mb-2 flex items-center gap-2">
                  <Shield size={14} />
                  <span>Fleet System Health</span>
                </h4>
                <div className="flex items-center gap-3 text-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2E9B68] animate-pulse" />
                  <span className="text-2xl font-light font-sans">
                    100% Operational
                  </span>
                </div>
                <p className="text-xs text-white/50 font-mono mt-1">
                  5/5 Vessels AIS Synchronized · Zero Demurrage
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#AFD2FA] mb-2">
                  Active Decarbonization
                </h4>
                <p className="text-3xl font-light text-white font-mono">
                  16.8% Fuel Saved
                </p>
                <p className="text-xs text-[#2E9B68] font-mono font-bold">
                  Verified IMO CII Grade-A Dynamic Compliance
                </p>
              </div>

              <div className="pt-6 border-t border-white/10">
                <Zap size={36} className="text-[#B9915E] mb-3" />
                <p className="max-w-xs text-xs text-white/70 leading-relaxed font-sans">
                  "Quantum-Inspired Maritime Optimization" <br />
                  Multi-physics routing, dynamic 2D trim, and alternative dual-fuel kinetic scheduling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
