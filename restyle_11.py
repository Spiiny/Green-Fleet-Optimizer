import re

with open("src/components/controller/CargoLayout.tsx", "r") as f:
    content = f.read()

# Add imports
if "import { motion," not in content:
    content = content.replace('import { useState, useMemo } from "react";', 'import { useState, useMemo, useEffect } from "react";\nimport { motion, useMotionValue, useMotionValueEvent } from "framer-motion";\nimport NumberFlow from "@number-flow/react";')

# Define TrimSliderWidget at the top of the file, after imports
widget_code = """
const TrimSliderWidget = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  // x ranges from -480 to 480 (mapped to -3.0 to +3.0)
  const x = useMotionValue(-value * 160);

  // Update x if value changes externally
  useEffect(() => {
    x.set(-value * 160);
  }, [value, x]);

  useMotionValueEvent(x, "change", (latest) => {
    if (typeof latest !== "number") return;
    const calculated = -latest / 160;
    if (!Number.isFinite(calculated)) return;
    
    // Clamp between -3.0 and 3.0
    const clamped = Math.max(-3.0, Math.min(3.0, calculated));
    const rounded = Math.round(clamped * 20) / 20; // step of 0.05
    
    if (rounded !== value) {
      onChange(rounded);
    }
  });

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#182350]/20 bg-[#FAFAF5] p-2 shadow-sm my-2">
      <div className="relative -mx-4 flex h-12 items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden rounded-lg">
        {/* Center line (indicator) */}
        <div className="absolute left-1/2 z-10 h-10 w-[3px] -translate-x-1/2 bg-[#B9915E] rounded-full shadow-md" />

        <motion.div
          drag="x"
          dragConstraints={{ right: 480, left: -480 }}
          dragElastic={0.05}
          style={{ x, left: "50%" }}
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
          className="absolute left-1/2 flex items-center gap-[12px]"
        >
          {/* Ticks: from -3.0 to 3.0, 61 ticks */}
          {[...Array(61)].map((_, i) => {
            const isMajor = i % 10 === 0;
            return (
              <div
                key={i}
                className={`w-1 flex-shrink-0 rounded-full ${isMajor ? 'h-6 bg-[#182350]/60' : 'h-3 bg-[#182350]/20'}`}
              />
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};
"""

if "TrimSliderWidget" not in content:
    content = content.replace("export default function CargoLayout", widget_code + "\nexport default function CargoLayout")


# Replace the old slider area
old_slider_area = """                <div className="flex justify-between text-[#737985]">
                  <span>Target Trim Angle:</span>
                  <span className="font-bold text-[#182350]">
                    {trimAngle > 0 ? `+${trimAngle.toFixed(2)}° (Bow)` : `${trimAngle.toFixed(2)}° (Stern)`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.05"
                  value={trimAngle}
                  onChange={(e) => handleTrimSliderChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#182350] rounded-lg cursor-pointer accent-[#B9915E] border border-[#AFD2FA]"
                />
                <div className="flex justify-between text-[10px] text-[#737985]">
                  <span>-3.0° (Stern)</span>
                  <span>0.0° (Even Keel)</span>
                  <span>+3.0° (Bow)</span>
                </div>"""

new_slider_area = """                <div className="flex justify-between text-[#737985] items-center">
                  <span>Target Trim Angle:</span>
                  <div className="font-bold text-[#182350] flex items-center gap-1">
                    <span>{trimAngle > 0 ? "+" : trimAngle === 0 ? "" : "-"}</span>
                    <NumberFlow
                      value={Math.abs(trimAngle)}
                      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                    />
                    <span>° {trimAngle > 0 ? "(Bow)" : trimAngle < 0 ? "(Stern)" : "(Even)"}</span>
                  </div>
                </div>
                
                <TrimSliderWidget value={trimAngle} onChange={handleTrimSliderChange} />
                
                <div className="flex justify-between text-[10px] text-[#737985] font-bold tracking-wider">
                  <span>STERN</span>
                  <span>0.0°</span>
                  <span>BOW</span>
                </div>"""

content = content.replace(old_slider_area, new_slider_area)

with open("src/components/controller/CargoLayout_new.tsx", "w") as f:
    f.write(content)
