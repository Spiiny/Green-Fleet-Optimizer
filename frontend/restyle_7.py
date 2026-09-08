import re

with open("src/components/controller/CargoLayout.tsx", "r") as f:
    content = f.read()

# Currently, the file looks like:
#                 </svg>
#               </div>
#             </div>
#           </div>
# 
#             <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF] shrink-0">
#               <div className="flex items-center gap-2">
# ...
#             <div className="p-2.5 rounded-xl bg-[#EAF4FE] border border-[#AFD2FA] text-xs font-mono text-[#182350] flex justify-between items-center">
#               <span>Voyage Fuel Burn:</span>
#               <strong>{currentConsumption} t/day ({fuelDelta})</strong>
#             </div>
#         </div>
# 
#         {/* ── RIGHT-HAND FEATURE SIDE NAVBAR / CONTROL PANEL (4 cols) ── */}

target = """                </svg>
              </div>
            </div>
          </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF] shrink-0">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-[#2E9B68]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182350]">
                  Trim Stabilizer
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#2E9B68] bg-[#EAF7F0] px-2 py-0.5 rounded">
                Dynamic LCG
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[#737985]">
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
                className="w-full h-1.5 bg-[#ECE8DF] rounded-lg appearance-none cursor-pointer accent-[#B9915E] border border-[#AFD2FA]"
              />
              <div className="flex justify-between text-[10px] text-[#737985]">
                <span>-3.0° (Stern)</span>
                <span>0.0° (Even Keel)</span>
                <span>+3.0° (Bow)</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#EAF4FE] border border-[#AFD2FA] text-xs font-mono text-[#182350] flex justify-between items-center">
              <span>Voyage Fuel Burn:</span>
              <strong>{currentConsumption} t/day ({fuelDelta})</strong>
            </div>
        </div>

        {/* ── RIGHT-HAND FEATURE SIDE NAVBAR / CONTROL PANEL (4 cols) ── */}"""

replacement = """                </svg>
              </div>
            </div>

            {/* Panel 2: Trim Stabilizer & Hydrodynamic Drag Impact */}
            <div className="shrink-0 flex flex-col justify-center pt-2 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF] shrink-0">
                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-[#2E9B68]" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182350]">
                    Trim Stabilizer
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#2E9B68] bg-[#EAF7F0] px-2 py-0.5 rounded">
                  Dynamic LCG
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-[#737985]">
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
                  className="w-full h-1.5 bg-[#ECE8DF] rounded-lg appearance-none cursor-pointer accent-[#B9915E] border border-[#AFD2FA]"
                />
                <div className="flex justify-between text-[10px] text-[#737985]">
                  <span>-3.0° (Stern)</span>
                  <span>0.0° (Even Keel)</span>
                  <span>+3.0° (Bow)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#EAF4FE] border border-[#AFD2FA] text-xs font-mono text-[#182350] flex justify-between items-center">
                <span>Voyage Fuel Burn:</span>
                <strong>{currentConsumption} t/day ({fuelDelta})</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT-HAND FEATURE SIDE NAVBAR / CONTROL PANEL (4 cols) ── */}"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/controller/CargoLayout_new4.tsx", "w") as f:
        f.write(content)
    print("Success")
else:
    print("Could not find target block")
