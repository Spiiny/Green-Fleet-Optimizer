import { useState } from "react";
import Waves from "./Waves";

interface Props {
  onLogin: (role: "controller" | "captain", username: string) => void;
  onBackToHome?: () => void;
  initialRole?: "controller" | "captain";
}

export default function LoginPage({ onLogin, onBackToHome, initialRole = "controller" }: Props) {
  const [role, setRole] = useState<"controller" | "captain">(initialRole);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }
    onLogin(role, username);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden text-[#182350] selection:bg-[#AFD2FA] selection:text-[#182350]"
      style={{ background: "#FEFAEF" }}
    >
      {/* ── Interactive Waves Background Canvas with Palette Harmonic Gradient ── */}
      <Waves
        backgroundColor="#FEFAEF"
        usePaletteGradient={true}
        waveSpeedX={0.014}
        waveSpeedY={0.007}
        waveAmpX={36}
        waveAmpY={20}
        xGap={12}
        yGap={30}
        friction={0.925}
        tension={0.005}
        maxCursorMove={130}
      />

      {/* Top navigation back button */}
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="absolute top-6 left-6 z-30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/90 hover:bg-white backdrop-blur-md border border-[#E6E2D8] hover:border-[#AFD2FA] text-[#182350] transition-all cursor-pointer flex items-center gap-2 shadow-xs hover:shadow-md transform hover:scale-105"
        >
          <span className="text-[#182350]">←</span> Back to Home
        </button>
      )}

      {/* Center Login Container */}
      <div className="relative z-20 w-full max-w-md mx-4 my-8">
        {/* Logo and Platform Area */}
        <div className="text-center mb-6 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#B9915E]">
            OPERATIONAL LIFECYCLE
          </div>

          <div className="inline-flex items-center justify-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm border border-[#E6E2D8] bg-[#182350] text-white"
            >
              <svg viewBox="0 0 40 40" className="w-5 h-5" fill="none">
                <path d="M4 26 L20 10 L36 26 L32 30 L20 18 L8 30 Z" fill="white" opacity="0.95" />
                <path d="M8 30 L32 30 L34 34 L6 34 Z" fill="white" opacity="0.75" />
                <circle cx="20" cy="20" r="3" fill="#AFD2FA" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-2xl font-black text-[#182350] tracking-tight font-sans">
                GreenFleet OS
              </div>
            </div>
          </div>

          <p className="text-xs text-[#737985] font-sans">
            Quantum-Inspired Route Optimization & Fleet Orchestration
          </p>
        </div>

        {/* Login Card (Clean White with #E6E2D8 border and soft shadow) */}
        <div
          className="p-8 rounded-2xl shadow-xl backdrop-blur-md transition-all"
          style={{
            background: "rgba(255, 255, 255, 0.96)",
            border: "1.5px solid #E6E2D8",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-2xl font-black text-[#AFD2FA] font-mono">
              05
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#182350]">
              Bridge & Control Access
            </span>
          </div>

          {/* Role selector */}
          <div
            className="grid grid-cols-2 gap-1.5 mb-6 p-1.5 rounded-xl border border-[#E6E2D8] bg-[#FAFAF5] shadow-2xs"
          >
            {(["controller", "captain"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer ${
                  role === r
                    ? "bg-[#182350] text-white shadow-xs scale-[1.01]"
                    : "text-[#737985] hover:text-[#182350] hover:bg-white"
                }`}
              >
                {r === "controller" ? "⚙ Controller" : "⚓ Captain"}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-sans text-[#182350] font-bold tracking-wider uppercase mb-1.5">
                Operator Call Sign / ID
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={role === "controller" ? "ctrl_admin" : "capt_mehta"}
                className="w-full px-4 py-2.5 rounded-xl text-[#182350] text-sm font-sans outline-none transition-all placeholder:text-[#94A3B8] bg-white border border-[#E6E2D8] shadow-2xs focus:border-[#AFD2FA]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-sans text-[#182350] font-bold tracking-wider uppercase mb-1.5">
                Passcode
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl text-[#182350] text-sm font-sans outline-none transition-all placeholder:text-[#94A3B8] bg-white border border-[#E6E2D8] shadow-2xs focus:border-[#AFD2FA]"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-[#FFF2F2] border border-[#F5C2C2] text-xs text-[#C94B4B] font-sans text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 mt-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-150 cursor-pointer bg-[#182350] hover:bg-[#233372] text-white shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Authenticate & Enter</span>
              <span>→</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#ECE8DF] flex justify-between text-[11px] font-sans text-[#737985]">
            <span>TLS 1.3 Encrypted</span>
            <span>IMO DCS Compliant</span>
            <span>SIH 2026</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="text-[11px] font-sans text-[#737985] tracking-wider uppercase">
            MINISTRY OF PORTS, SHIPPING & WATERWAYS · INDIA
          </div>
        </div>
      </div>
    </div>
  );
}
