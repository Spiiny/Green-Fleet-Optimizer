import { useState, useEffect, useRef } from "react";
import { vessels } from "../data/fleet";
import HeroParallaxExperience from "./HeroParallaxExperience";
import { CardSwap, Card } from "./CardSwap";
import InfiniteMenu, { MenuItem } from "./InfiniteMenu";
import ScrollStack, { ScrollStackItem } from "./ScrollStack";

interface Props {
  onEnterLogin: (preselectedRole?: "controller" | "captain") => void;
  onDirectLogin?: (role: "controller" | "captain", username: string) => void;
}

export default function HomePage({ onEnterLogin, onDirectLogin }: Props) {
  const [calculatorTons, setCalculatorTons] = useState<number>(50000);
  const [calculatorDistance, setCalculatorDistance] = useState<number>(4500);
  const [isScrolledPastHero, setIsScrolledPastHero] = useState<boolean>(false);
  const isNavigatingRef = useRef<boolean>(false);

  // Section sequence for auto-navigation
  const sectionList = [
    "hero-parallax",
    "gateway",
    "metrics",
    "features",
    "workflow",
    "calculator",
    "footer-section",
  ];

  // Ensure on page reload/mount that scroll always starts from top
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  // Track scroll position to transition navbar text to black after parallax section
  useEffect(() => {
    const handleScroll = () => {
      const heroEl = document.getElementById("hero-parallax");
      if (heroEl) {
        const rect = heroEl.getBoundingClientRect();
        setIsScrolledPastHero(rect.bottom <= 100);
      } else {
        setIsScrolledPastHero(window.scrollY > window.innerHeight * 1.5);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToNextSection = (currentId: string) => {
    if (isNavigatingRef.current) return;
    const idx = sectionList.indexOf(currentId);
    if (idx !== -1 && idx < sectionList.length - 1) {
      const nextId = sectionList[idx + 1];
      const nextEl = document.getElementById(nextId);
      if (nextEl) {
        isNavigatingRef.current = true;
        nextEl.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 1200);
      }
    }
  };

  // Interactive Fuel/CO2/Cost savings calculation
  const fuelSavingsTons = ((calculatorTons * 0.0018 * calculatorDistance) / 100).toFixed(1);
  const co2MitigatedTons = (parseFloat(fuelSavingsTons) * 3.11).toFixed(1);
  const costSavedUSD = (parseFloat(fuelSavingsTons) * 650).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });

  const features = [
    {
      id: "opt",
      title: "Quantum-Inspired Voyage Optimization",
      icon: "⟳",
      badge: "AI Algorithmic Core",
      tagline: "Multi-objective pathfinding for speed, bunker cost, and environmental footprint.",
      description:
        "Leverages hybrid physics-ML models and variational algorithms to compute optimal transit velocities, wave-resistance vectors, and engine load points across complex oceanic corridors.",
      stats: [
        { label: "Fuel Reduction", value: "14.8% – 18.2%" },
        { label: "Route Compute Time", value: "< 1.2 sec" },
        { label: "ETA Precision", value: "± 45 mins" },
      ],
      highlights: [
        "Dynamic ocean current & meteorological wave integration",
        "Dual-fuel LNG, Methanol, and Ammonia burn scheduling",
        "ECA zone automatic fuel-switching compliance",
      ],
    },
    {
      id: "cargo",
      title: "2D Hydrodynamic Cargo & Hold Allocation",
      icon: "▦",
      badge: "Cargo Stability",
      tagline: "Dynamic weight distribution and metacentric height optimization.",
      description:
        "Automated bay-and-tank allocation engine ensuring longitudinal stress limits, draft equilibrium, and optimal trim for minimal hydrodynamic hull friction during open-sea transit.",
      stats: [
        { label: "Trim Drag Reduction", value: "3.4%" },
        { label: "Bending Moment Safety", value: "100% Verified" },
        { label: "Loading Time Cut", value: "2.5 Hours" },
      ],
      highlights: [
        "Instant visual 2D cross-section and tank level inspection",
        "Automated dangerous goods & cryogenic separation checks",
        "Real-time ballast water minimization advisor",
      ],
    },
    {
      id: "whatif",
      title: "Real-Time What-If & Disruption Simulation",
      icon: "⚗",
      badge: "Risk & Strategy",
      tagline: "Monte Carlo maritime simulation for weather deviations and canal congestion.",
      description:
        "Instantaneous sensitivity modeling allowing fleet managers to test bunkering price spikes, canal blockades, adverse typhoons, and port berth delays with immediate financial impact graphs.",
      stats: [
        { label: "Scenario Presets", value: "12+ Ready Models" },
        { label: "Prediction Accuracy", value: "96.4%" },
        { label: "Risk Mitigation", value: "Up to $180k/voyage" },
      ],
      highlights: [
        "Suez & Malacca passage risk scoring",
        "Port delay cascading cost calculators",
        "Alternative fuel swap economic analysis",
      ],
    },
    {
      id: "telemetry",
      title: "Live Vessel Telemetry & Bridge Dispatch",
      icon: "⚓",
      badge: "Bridge Synchronization",
      tagline: "Synchronous 2-way uplink between Fleet Operations and Bridge Captains.",
      description:
        "Direct digital voyage authorization portal that transfers optimized voyage plans, waypoints, speed advisories, and weather warnings directly to the shipmaster's navigational bridge console.",
      stats: [
        { label: "Telemetry Latency", value: "< 500 ms" },
        { label: "Bridge Approval Rate", value: "99.8%" },
        { label: "Fleet Coverage", value: "Global Satellite" },
      ],
      highlights: [
        "Dedicated Captain Portal with tailored voyage directives",
        "Immutable plan sign-off and digital voyage logs",
        "Continuous AIS vessel position tracking and geofencing",
      ],
    },
  ];

  const operationalPillars = [
    {
      step: "01",
      title: "Commercial Order Ingestion",
      desc: "Receive cargo consignments, delivery deadlines, and origin-destination mandates from global shippers.",
    },
    {
      step: "02",
      title: "Multi-Constraint Matching",
      desc: "AI scoring engine evaluates vessel fuel types, hold capacities, and location proximity to find the ideal carrier.",
    },
    {
      step: "03",
      title: "Hydrodynamic & Route Optimization",
      desc: "Computes fastest, most efficient, and custom low-emission routes with ECA compliance and weather avoidance.",
    },
    {
      step: "04",
      title: "Controller Authorization",
      desc: "Fleet controllers review fuel burn, voyage costs, and CII ratings before issuing digital voyage orders.",
    },
    {
      step: "05",
      title: "Bridge Execution & Tracking",
      desc: "Captains receive waypoint schedules and real-time RPM advisories while telemetry logs fleetwide carbon savings.",
    },
  ];

  const fleetMetrics = [
    { label: "Active Vessels Managed", value: `${vessels.length} Flagships`, sub: "LNG, Methanol & Ammonia" },
    { label: "Avg Bunker Fuel Saved", value: "16.8%", sub: "Across all voyages" },
    { label: "Annual Carbon Mitigated", value: "42,600 t", sub: "Verified IMO DCS" },
    { label: "On-Time Schedule Adherence", value: "99.4%", sub: "Zero detention penalties" },
  ];

  const accessTerminals: MenuItem[] = [
    {
      image: "/sequence/1/ezgif-frame-001.jpg",
      link: "#controller",
      title: "Fleet Controller",
      tag: "Central Command",
      description: "Full-fleet AI voyage routing, dynamic speed orders, and IMO CII decarbonization.",
      role: "controller",
    },
    {
      image: "/sequence/2/ezgif-frame-050.jpg",
      link: "#captain",
      title: "Captain Bridge",
      tag: "Bridge Console",
      description: "Shipmaster navigation dashboard with digital logs and 2-way satellite telemetry.",
      role: "captain",
    },
  ];

  return (
    <div className="min-h-screen text-[#182350] selection:bg-[#AFD2FA] selection:text-[#182350]" style={{ background: "#FEFAEF" }}>
      {/* ── Top Floating Minimalist Glass Navbar (Dynamic Light/Dark Theme on Scroll) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-5 px-6 sm:px-10 pointer-events-none transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Left Brand: Minimalist Wireframe Loop Logo + Clean Typography */}
          <a
            href="#hero-parallax"
            className={`flex items-center gap-2.5 transition-all duration-300 group cursor-pointer ${
              isScrolledPastHero
                ? "text-[#182350] hover:text-black bg-white/85 hover:bg-white backdrop-blur-md border border-[#E6E2D8] px-3.5 py-1.5 rounded-full shadow-md"
                : "text-white/95 hover:text-white"
            }`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-colors ${
                isScrolledPastHero ? "text-[#182350]" : "text-white/90 group-hover:text-white"
              }`}
            >
              {/* Outer elongated stadium capsule */}
              <rect
                x="3"
                y="8"
                width="26"
                height="16"
                rx="8"
                stroke="currentColor"
                strokeWidth="1.8"
                className="opacity-90"
              />
              {/* Inner geometric pulse / wave ring */}
              <circle
                cx="12"
                cy="16"
                r="4.5"
                stroke="currentColor"
                strokeWidth="1.6"
                className="opacity-95"
              />
              <path
                d="M 19 13 C 21 14.5 21 17.5 19 19"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="opacity-80"
              />
            </svg>
            <span className="text-base sm:text-lg font-bold tracking-tight font-sans">
              GreenFleet
            </span>
          </a>

          {/* Right Floating Capsule: Dynamic Light/Dark Contrast on Scroll */}
          <div
            className={`flex items-center p-1.5 pl-6 sm:pl-7 rounded-2xl sm:rounded-full backdrop-blur-md border transition-all duration-300 gap-4 sm:gap-6 ${
              isScrolledPastHero
                ? "bg-white/90 hover:bg-white border-[#E6E2D8] shadow-xl text-[#182350]"
                : "bg-white/10 hover:bg-white/20 border-white/25 hover:border-white/40 shadow-xl shadow-black/10 text-white"
            }`}
          >
            <nav
              className={`hidden md:flex items-center gap-6 lg:gap-7 text-[13px] font-sans font-semibold tracking-[-0.01em] transition-colors ${
                isScrolledPastHero ? "text-[#182350]" : "text-white/95"
              }`}
            >
              <a
                href="#gateway"
                className={`transition-all hover:scale-105 transform cursor-pointer ${
                  isScrolledPastHero ? "hover:text-black font-bold" : "hover:text-white drop-shadow-xs"
                }`}
              >
                Terminals
              </a>
              <a
                href="#metrics"
                className={`transition-all hover:scale-105 transform cursor-pointer ${
                  isScrolledPastHero ? "hover:text-black font-bold" : "hover:text-white drop-shadow-xs"
                }`}
              >
                Fleet Metrics
              </a>
              <a
                href="#features"
                className={`transition-all hover:scale-105 transform cursor-pointer ${
                  isScrolledPastHero ? "hover:text-black font-bold" : "hover:text-white drop-shadow-xs"
                }`}
              >
                Capabilities
              </a>
              <a
                href="#workflow"
                className={`transition-all hover:scale-105 transform cursor-pointer ${
                  isScrolledPastHero ? "hover:text-black font-bold" : "hover:text-white drop-shadow-xs"
                }`}
              >
                Workflow
              </a>
              <a
                href="#calculator"
                className={`transition-all hover:scale-105 transform cursor-pointer ${
                  isScrolledPastHero ? "hover:text-black font-bold" : "hover:text-white drop-shadow-xs"
                }`}
              >
                ROI Calculator
              </a>
            </nav>

            {/* Launch Action Button */}
            <button
              onClick={() => onEnterLogin()}
              className={`px-5 py-2 rounded-xl sm:rounded-full text-[13px] font-sans font-bold tracking-tight transition-all cursor-pointer shadow-md hover:shadow-lg flex items-center gap-1.5 transform hover:scale-[1.03] ${
                isScrolledPastHero
                  ? "bg-[#182350] hover:bg-[#233372] text-white"
                  : "bg-white/90 hover:bg-white text-[#0B1728]"
              }`}
            >
              <span>Launch OS</span>
              <span className={isScrolledPastHero ? "text-white/70" : "text-[#0B1728]/70"}>→</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 1. Full-Bleed Parallax Hero with Header Overlay ── */}
      <section id="hero-parallax" className="relative">
        <HeroParallaxExperience
          onSequenceComplete={() => scrollToNextSection("hero-parallax")}
          onEnterLogin={onEnterLogin}
        />
      </section>

      {/* ── 2. Dual-Role Operational Gateways (Interactive 3D WebGL InfiniteMenu) ── */}
      <section
        id="gateway"
        className="min-h-screen w-full flex items-center justify-center py-16 sm:py-24 px-6 sm:px-12 border-b border-[#E6E2D8] relative overflow-hidden bg-white"
      >
        <div className="max-w-6xl mx-auto space-y-8 w-full">
          <div className="text-center space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-[#B9915E]">
              Dual-Role Operational Gateways
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#182350] tracking-tight">
              Select Your Access Terminal
            </h2>
            <p className="text-xs sm:text-sm text-[#737985] font-sans max-w-xl mx-auto">
              Drag and rotate the 3D terminal grid to choose your operating station. Seamless gateway for Fleet Controllers and Captains.
            </p>
          </div>

          {/* Interactive 3D WebGL InfiniteMenu Viewport */}
          <div
            className="w-full h-[520px] sm:h-[580px] rounded-3xl border border-[#E6E2D8] overflow-hidden shadow-md relative"
            style={{ background: "#FEFAEF" }}
          >
            <InfiniteMenu
              items={accessTerminals}
              scale={0.95}
              backgroundColor="#FEFAEF"
              onItemSelect={(item) => {
                onEnterLogin(item.role || "controller");
              }}
            />
          </div>

          {/* Auto-Advance Navigation Pill */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => scrollToNextSection("gateway")}
              className="px-5 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#FEFAEF] hover:bg-white text-[#182350] border border-[#E6E2D8] hover:border-[#AFD2FA] shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-2 transform hover:scale-105"
            >
              <span>Next: Operational Fleet Performance</span>
              <span>↓</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 3. Operational Fleet Performance (Full-Screen 3D CardSwap GSAP Showcase) ── */}
      <section
        id="metrics"
        className="min-h-screen w-full flex items-center justify-center py-16 sm:py-24 px-6 sm:px-12 border-b border-[#E6E2D8] overflow-hidden relative"
        style={{ background: "#FEFAEF" }}
      >
        {/* Subtle grid pattern matching other sections */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#E6E2D8 1px, transparent 1px), linear-gradient(90deg, #E6E2D8 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 w-full">
          {/* Left Column: Mission Overview & Key Metrics */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF4FE] border border-[#AFD2FA] text-[#182350] text-xs font-mono font-bold uppercase tracking-widest shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#2E9B68] animate-pulse" />
              <span>Real-Time Fleet Telemetry</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#182350] tracking-tight leading-tight">
              Operational Fleet Performance
            </h2>

            <p className="text-sm sm:text-base text-[#3F4654] font-sans leading-relaxed">
              Continuous multi-physics telemetry monitoring dual-fuel kinetics, metacentric trim equilibrium, and quantum voyage pathfinding across {vessels.length} enterprise flagships.
            </p>

            {/* Quick Stat Highlights Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-[#E6E2D8] shadow-xs hover:border-[#AFD2FA] transition-all">
                <div className="text-2xl sm:text-3xl font-black text-[#182350] font-mono">
                  16.8%
                </div>
                <div className="text-xs font-bold text-[#182350] uppercase tracking-wide mt-0.5">
                  Avg Fuel Saved
                </div>
                <div className="text-[11px] text-[#737985] mt-1 font-sans">Across all global voyages</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E6E2D8] shadow-xs hover:border-[#AFD2FA] transition-all">
                <div className="text-2xl sm:text-3xl font-black text-[#2E9B68] font-mono">
                  42,600 t
                </div>
                <div className="text-xs font-bold text-[#182350] uppercase tracking-wide mt-0.5">
                  CO2 Mitigated
                </div>
                <div className="text-[11px] text-[#737985] mt-1 font-sans">IMO DCS verified</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E6E2D8] shadow-xs hover:border-[#AFD2FA] transition-all">
                <div className="text-2xl sm:text-3xl font-black text-[#182350] font-mono">
                  &lt; 1.2s
                </div>
                <div className="text-xs font-bold text-[#182350] uppercase tracking-wide mt-0.5">
                  Route Compute
                </div>
                <div className="text-[11px] text-[#737985] mt-1 font-sans">Variational pathfinding</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E6E2D8] shadow-xs hover:border-[#AFD2FA] transition-all">
                <div className="text-2xl sm:text-3xl font-black text-[#182350] font-mono">
                  99.4%
                </div>
                <div className="text-xs font-bold text-[#182350] uppercase tracking-wide mt-0.5">
                  Schedule Adherence
                </div>
                <div className="text-[11px] text-[#737985] mt-1 font-sans">Zero demurrage fines</div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onEnterLogin("controller")}
                className="px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#182350] hover:bg-[#233372] text-white transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <span>Launch Fleet Controller</span>
                <span>⚡</span>
              </button>
              <button
                onClick={() => scrollToNextSection("metrics")}
                className="px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white hover:bg-[#F7F5EE] text-[#182350] border border-[#E6E2D8] hover:border-[#AFD2FA] transition-all cursor-pointer shadow-xs flex items-center gap-2"
              >
                <span>Next Section</span>
                <span>↓</span>
              </button>
            </div>
          </div>

          {/* Right Column: 3D GSAP CardSwap Component with Same Theme */}
          <div className="lg:col-span-6 flex items-center justify-center relative min-h-[460px]">
            <CardSwap
              width={460}
              height={360}
              cardDistance={45}
              verticalDistance={55}
              delay={4500}
              pauseOnHover={true}
              skewAmount={5}
              easing="elastic"
            >
              {/* Card 1: Decarbonization Kinetics */}
              <Card className="p-6 flex flex-col justify-between bg-white border border-[#E6E2D8] shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#182350] font-bold px-2 py-0.5 rounded bg-[#EAF4FE] border border-[#AFD2FA]">
                      Decarbonization Core
                    </span>
                    <span className="text-xs font-mono text-[#737985] font-semibold">FLAGSHIP TELEMETRY</span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[#182350] tracking-tight leading-tight">
                    Alternative Dual-Fuel Kinetics & Energy Index
                  </h3>

                  <p className="text-xs text-[#3F4654] leading-relaxed font-sans">
                    Real-time scheduling of Cryogenic LNG, Green Methanol, and Liquid Ammonia fuel combustion curves to minimize GHG intensity under FuelEU maritime mandates.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#ECE8DF] flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-[#737985] uppercase font-sans">Bunker Reduction</div>
                    <div className="text-lg font-bold text-[#2E9B68]">16.8% Average</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#737985] uppercase font-sans">CII Dynamic Grade</div>
                    <div className="text-lg font-bold text-[#182350]">Class-A Verified</div>
                  </div>
                </div>
              </Card>

              {/* Card 2: Quantum Route Optimization */}
              <Card className="p-6 flex flex-col justify-between bg-white border border-[#E6E2D8] shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#182350] font-bold px-2 py-0.5 rounded bg-[#EAF4FE] border border-[#AFD2FA]">
                      Pathfinding Engine
                    </span>
                    <span className="text-xs font-mono text-[#737985] font-semibold">ALGORITHMIC CORE</span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[#182350] tracking-tight leading-tight">
                    Quantum-Inspired Oceanic Route Pathfinding
                  </h3>

                  <p className="text-xs text-[#3F4654] leading-relaxed font-sans">
                    Variational wave-resistance calculations coupled with ECMWF meteorological forecasting to compute high-efficiency trans-oceanic navigation corridors.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#ECE8DF] flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-[#737985] uppercase font-sans">Execution Speed</div>
                    <div className="text-lg font-bold text-[#182350]">&lt; 1.2 Seconds</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#737985] uppercase font-sans">Arrival Precision</div>
                    <div className="text-lg font-bold text-[#2E9B68]">± 45 Minutes</div>
                  </div>
                </div>
              </Card>

              {/* Card 3: 2D Hydrodynamic Trim */}
              <Card className="p-6 flex flex-col justify-between bg-white border border-[#E6E2D8] shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#B9915E] font-bold px-2 py-0.5 rounded bg-[#FAFAF5] border border-[#E6E2D8]">
                      Hydrodynamics
                    </span>
                    <span className="text-xs font-mono text-[#737985] font-semibold">2D LOAD EQUILIBRIUM</span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[#182350] tracking-tight leading-tight">
                    Metacentric Trim & 6-Bunker Load Balancing
                  </h3>

                  <p className="text-xs text-[#3F4654] leading-relaxed font-sans">
                    Longitudinal center of gravity (LCG) balance and dynamic fuel density distribution to eliminate stern squat drag and hydrodynamic friction during open-sea transit.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#ECE8DF] flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-[#737985] uppercase font-sans">Trim Drag Reduction</div>
                    <div className="text-lg font-bold text-[#2E9B68]">3.4% Fuel Cut</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#737985] uppercase font-sans">Loading Acceleration</div>
                    <div className="text-lg font-bold text-[#182350]">2.5 Hours Saved</div>
                  </div>
                </div>
              </Card>

              {/* Card 4: Bridge Telemetry */}
              <Card className="p-6 flex flex-col justify-between bg-white border border-[#E6E2D8] shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#182350] font-bold px-2 py-0.5 rounded bg-[#EAF4FE] border border-[#AFD2FA]">
                      Bridge Satellite
                    </span>
                    <span className="text-xs font-mono text-[#737985] font-semibold">2-WAY UPLINK</span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[#182350] tracking-tight leading-tight">
                    Synchronous Bridge Dispatch & Digital Voyage Logs
                  </h3>

                  <p className="text-xs text-[#3F4654] leading-relaxed font-sans">
                    Instantaneous satellite telemetry dispatch transferring optimized RPM advisories and waypoint schedules directly to the Master Mariner's bridge console.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#ECE8DF] flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-[#737985] uppercase font-sans">Uplink Latency</div>
                    <div className="text-lg font-bold text-[#182350]">&lt; 500 ms</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#737985] uppercase font-sans">Schedule Adherence</div>
                    <div className="text-lg font-bold text-[#2E9B68]">99.4% Flawless</div>
                  </div>
                </div>
              </Card>
            </CardSwap>
          </div>
        </div>
      </section>

      {/* ── 4. Core Platform Capabilities (ScrollStack Smooth Stacking Animation) ── */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-[#FEFAEF] border-b border-[#E6E2D8]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-[#2E9B68]">
              Decarbonization Engine
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#182350] tracking-tight">
              Enterprise Maritime Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-[#737985] font-sans max-w-xl mx-auto">
              Scroll through the integrated multi-physics algorithms engineered for fuel savings, emissions tracking, and voyage certainty.
            </p>
          </div>

          {/* ScrollStack Component with Stacked Cards Effect */}
          <ScrollStack
            className="w-full"
            itemDistance={70}
            itemScale={0.035}
            itemStackDistance={30}
            stackPosition="18%"
            scaleEndPosition="10%"
            baseScale={0.88}
            blurAmount={0}
            onStackComplete={() => scrollToNextSection("features")}
          >
            {features.map((f, i) => (
              <ScrollStackItem
                key={f.id}
                itemClassName="bg-white border border-[#E6E2D8] shadow-lg"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-[#EAF4FE] text-[#182350] flex items-center justify-center font-bold text-sm border border-[#AFD2FA]">
                        {f.icon}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA]">
                        {f.badge}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#182350] tracking-tight">
                      {f.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#B9915E] font-medium font-sans">
                      {f.tagline}
                    </p>

                    <p className="text-xs sm:text-sm text-[#3F4654] font-sans leading-relaxed">
                      {f.description}
                    </p>

                    <div className="space-y-1.5 pt-1">
                      {f.highlights.map((h, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-[#182350] font-sans">
                          <span className="w-4 h-4 rounded-full bg-[#EAF4FE] text-[#182350] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            ✓
                          </span>
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Stats Column */}
                  <div className="lg:col-span-5 p-5 rounded-2xl bg-[#FEFAEF] border border-[#E6E2D8] space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#737985] flex items-center justify-between">
                      <span>Verified Benchmarks</span>
                      <span className="text-[#182350] font-mono font-bold">0{i + 1} / 04</span>
                    </div>

                    <div className="space-y-2">
                      {f.stats.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white border border-[#ECE8DF] flex items-center justify-between shadow-2xs"
                        >
                          <span className="text-xs font-sans text-[#737985]">{s.label}</span>
                          <span className="text-sm font-extrabold text-[#182350] font-mono">{s.value}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onEnterLogin("controller")}
                      className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#182350] hover:bg-[#233372] text-white transition-all cursor-pointer shadow-xs text-center block mt-1"
                    >
                      Test in Live Controller →
                    </button>
                  </div>
                </div>
              </ScrollStackItem>
            ))}
          </ScrollStack>

          {/* Auto-Advance Navigation Pill */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => scrollToNextSection("features")}
              className="px-5 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-white hover:bg-[#FAFAF5] text-[#182350] border border-[#E6E2D8] hover:border-[#AFD2FA] shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-2 transform hover:scale-105"
            >
              <span>Next: 5-Step Green Fleet Workflow</span>
              <span>↓</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 5. 5-Step Operational Journey ── */}
      <section id="workflow" className="py-16 px-6 bg-white border-b border-[#E6E2D8]">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-[#B9915E]">
              Operational Lifecycle
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#182350] tracking-tight">
              5-Step Green Fleet Workflow
            </h2>
            <p className="text-xs sm:text-sm text-[#737985] font-sans max-w-xl mx-auto">
              From commercial order ingestion to autonomous bridge execution and verified IMO carbon accounting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {operationalPillars.map((p, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-[#FEFAEF] border border-[#E6E2D8] hover:border-[#AFD2FA] transition-all flex flex-col justify-between space-y-4 relative group"
              >
                <div>
                  <div className="text-2xl font-black text-[#AFD2FA] group-hover:text-[#182350] transition-colors font-mono">
                    {p.step}
                  </div>
                  <h4 className="text-sm font-extrabold text-[#182350] mt-2 mb-1.5 leading-snug">
                    {p.title}
                  </h4>
                  <p className="text-[11px] font-sans text-[#737985] leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Auto-Advance Navigation Pill */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => scrollToNextSection("workflow")}
              className="px-5 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#FEFAEF] hover:bg-white text-[#182350] border border-[#E6E2D8] hover:border-[#AFD2FA] shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-2 transform hover:scale-105"
            >
              <span>Next: Fleet Decarbonization ROI Calculator</span>
              <span>↓</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. Interactive ROI Fuel, Carbon & Financial Savings Calculator ── */}
      <section id="calculator" className="py-16 px-6 bg-[#FEFAEF] border-b border-[#E6E2D8]">
        <div className="max-w-5xl mx-auto p-8 rounded-2xl bg-white border border-[#E6E2D8] shadow-sm space-y-8">
          <div className="text-center space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-[#2E9B68]">
              Interactive Simulation
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#182350] tracking-tight">
              Estimate Your Fleet Decarbonization ROI
            </h2>
            <p className="text-xs sm:text-sm text-[#737985] font-sans max-w-lg mx-auto">
              Adjust your average voyage deadweight and route nautical distance to calculate estimated bunker fuel and carbon mitigations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
            <div className="space-y-6">
              {/* Slider 1: DWT */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-sans">
                  <span className="font-bold text-[#182350]">Average Cargo Deadweight (DWT):</span>
                  <span className="font-mono font-bold text-[#182350]">
                    {calculatorTons.toLocaleString()} Metric Tons
                  </span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="180000"
                  step="5000"
                  value={calculatorTons}
                  onChange={(e) => setCalculatorTons(parseFloat(e.target.value))}
                  className="w-full accent-[#182350] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#737985] font-mono">
                  <span>10,000 t (Feeder)</span>
                  <span>180,000 t (Capesize)</span>
                </div>
              </div>

              {/* Slider 2: Distance */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-sans">
                  <span className="font-bold text-[#182350]">Voyage Transit Distance:</span>
                  <span className="font-mono font-bold text-[#182350]">
                    {calculatorDistance.toLocaleString()} Nautical Miles
                  </span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="12000"
                  step="200"
                  value={calculatorDistance}
                  onChange={(e) => setCalculatorDistance(parseFloat(e.target.value))}
                  className="w-full accent-[#182350] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#737985] font-mono">
                  <span>800 NM (Short-Sea)</span>
                  <span>12,000 NM (Trans-Pacific)</span>
                </div>
              </div>
            </div>

            {/* Savings Output Cards */}
            <div className="p-6 rounded-xl bg-[#FAFAF5] border border-[#E6E2D8] space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#182350] pb-2 border-b border-[#ECE8DF]">
                Projected Savings Per Single Voyage
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-white border border-[#ECE8DF]">
                  <div className="text-[10px] uppercase font-bold text-[#737985]">Bunker Fuel Saved</div>
                  <div className="text-xl font-extrabold text-[#2E9B68] font-mono mt-1">
                    {fuelSavingsTons} t
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-[#ECE8DF]">
                  <div className="text-[10px] uppercase font-bold text-[#737985]">CO2 Abatement</div>
                  <div className="text-xl font-extrabold text-[#182350] font-mono mt-1">
                    {co2MitigatedTons} t
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#EAF4FE] border border-[#AFD2FA] flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#182350]">Estimated Financial Savings</div>
                  <div className="text-xs text-[#737985]">At $650/ton average dual-fuel index</div>
                </div>
                <div className="text-2xl font-black text-[#182350] font-mono">
                  ${costSavedUSD}
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Advance Navigation Pill */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => scrollToNextSection("calculator")}
              className="px-5 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-white hover:bg-[#FAFAF5] text-[#182350] border border-[#E6E2D8] hover:border-[#AFD2FA] shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-2 transform hover:scale-105"
            >
              <span>Explore Platform Footer</span>
              <span>↓</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 7. Global Maritime Footer (Styled exactly to Reference Design) ── */}
      <footer id="footer-section" className="relative bg-[#13161A] text-white pt-16 pb-12 px-6 sm:px-12 mt-20 border-t border-[#E6E2D8]/20">
        {/* Floating Capsule Newsletter / Subscribe Input (Overlapping Top Edge) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl px-4 z-20">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Thank you for subscribing to GreenFleet Maritime Intelligence!");
            }}
            className="p-1.5 pl-6 sm:pl-8 rounded-full bg-white shadow-[0_12px_40px_rgba(0,0,0,0.22)] border border-[#E6E2D8] flex items-center justify-between gap-3 transition-all focus-within:shadow-[0_14px_45px_rgba(0,0,0,0.28)]"
          >
            <input
              type="email"
              placeholder="Enter email address"
              required
              className="w-full text-xs sm:text-sm text-[#182350] placeholder:text-[#94A3B8] outline-none bg-transparent font-sans"
            />
            <button
              type="submit"
              className="px-6 sm:px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-[#B89972] hover:bg-[#A6865E] text-white transition-all cursor-pointer shadow-sm flex-shrink-0"
            >
              SUBSCRIBE
            </button>
          </form>
        </div>

        <div className="max-w-7xl mx-auto pt-6">
          {/* Main Footer Links 5-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 sm:gap-12 pb-12">
            {/* Column 1: Brand & Summary (Takes 2 Columns) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="text-base sm:text-lg font-bold tracking-wider text-white uppercase font-sans">
                GREENFLEET.OS
              </div>
              <p className="text-xs sm:text-sm text-white/60 font-sans leading-relaxed pr-4">
                A quantum-inspired multi-physics intelligence platform engineered for trans-oceanic decarbonization, dynamic speed profiling, and verified IMO compliance.
              </p>
              <div>
                <a
                  href="#hero-parallax"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B89972] hover:text-[#D4B892] transition-colors"
                >
                  <span>read more</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            {/* Column 2: Discover */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-white tracking-wide font-sans">
                Discover
              </div>
              <ul className="space-y-2.5 text-xs text-white/65 font-sans">
                <li>
                  <a href="#gateway" className="hover:text-white transition-colors">
                    Buy &amp; Sell Orders
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Merchant Routing
                  </a>
                </li>
                <li>
                  <a href="#calculator" className="hover:text-white transition-colors">
                    Carbon Offset Giving
                  </a>
                </li>
                <li>
                  <a href="#metrics" className="hover:text-white transition-colors">
                    Help &amp; Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: About */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-white tracking-wide font-sans">
                About
              </div>
              <ul className="space-y-2.5 text-xs text-white/65 font-sans">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Staff &amp; Master Mariners
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-white transition-colors">
                    Development Team
                  </a>
                </li>
                <li>
                  <a href="#calculator" className="hover:text-white transition-colors">
                    Maritime Careers
                  </a>
                </li>
                <li>
                  <a href="#metrics" className="hover:text-white transition-colors">
                    Decarbonization Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Resources */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-white tracking-wide font-sans">
                Resources
              </div>
              <ul className="space-y-2.5 text-xs text-white/65 font-sans">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    IMO DCS Security
                  </a>
                </li>
                <li>
                  <a href="#metrics" className="hover:text-white transition-colors">
                    Global Meteorological API
                  </a>
                </li>
                <li>
                  <a href="#calculator" className="hover:text-white transition-colors">
                    CII Rating Charts
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-white transition-colors">
                    Data Privacy &amp; Governance
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 5: Social */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-white tracking-wide font-sans">
                Social
              </div>
              <ul className="space-y-2.5 text-xs text-white/65 font-sans">
                <li>
                  <a href="#social" className="hover:text-white transition-colors">
                    LinkedIn Fleet
                  </a>
                </li>
                <li>
                  <a href="#social" className="hover:text-white transition-colors">
                    Twitter / X Maritime
                  </a>
                </li>
                <li>
                  <a href="#social" className="hover:text-white transition-colors">
                    Instagram Vessel Life
                  </a>
                </li>
                <li>
                  <a href="#social" className="hover:text-white transition-colors">
                    GitHub Open Core
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Horizontal Partner Strip */}
          <div className="border-t border-b border-white/10 py-6 my-4 flex flex-wrap items-center justify-between gap-4 text-xs font-sans text-white/70">
            <div className="flex flex-wrap items-center gap-6 sm:gap-8">
              <span className="font-semibold text-white/90">Our Partner:</span>
              <div className="flex flex-wrap items-center gap-5 text-white/70">
                <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                  <span className="w-2.5 h-2.5 rounded-full border border-[#B89972] bg-[#B89972]/30 flex items-center justify-center text-[7px] text-[#B89972]">●</span>
                  <span>IMO DCS</span>
                </span>
                <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                  <span className="w-2.5 h-2.5 rounded-full border border-[#B89972] bg-[#B89972]/30 flex items-center justify-center text-[7px] text-[#B89972]">●</span>
                  <span>DG SHIPPING</span>
                </span>
                <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                  <span className="w-2.5 h-2.5 rounded-full border border-[#B89972] bg-[#B89972]/30 flex items-center justify-center text-[7px] text-[#B89972]">●</span>
                  <span>INCOIS</span>
                </span>
                <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                  <span className="w-2.5 h-2.5 rounded-full border border-[#B89972] bg-[#B89972]/30 flex items-center justify-center text-[7px] text-[#B89972]">●</span>
                  <span>ECMWF OCEAN</span>
                </span>
                <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                  <span className="w-2.5 h-2.5 rounded-full border border-[#B89972] bg-[#B89972]/30 flex items-center justify-center text-[7px] text-[#B89972]">●</span>
                  <span>FUEL-EU MARITIME</span>
                </span>
                <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                  <span className="w-2.5 h-2.5 rounded-full border border-[#B89972] bg-[#B89972]/30 flex items-center justify-center text-[7px] text-[#B89972]">●</span>
                  <span>SIH 2026</span>
                </span>
              </div>
            </div>

            <a
              href="#partners"
              className="text-[#B89972] hover:text-[#D4B892] font-semibold text-xs transition-colors flex items-center gap-1"
            >
              <span>See All</span>
              <span>→</span>
            </a>
          </div>

          {/* Bottom Copyright & Compliances Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-white/50">
            <div>
              Copyright ©2026 All rights reserved | Ministry of Ports, Shipping &amp; Waterways · India
            </div>
            <div className="flex items-center gap-6">
              <a href="#terms" className="hover:text-white transition-colors">
                Terms
              </a>
              <a href="#privacy" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#compliances" className="hover:text-white transition-colors">
                Compliances
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
