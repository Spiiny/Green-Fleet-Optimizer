import re

with open("src/components/controller/CargoLayout.tsx", "r") as f:
    content = f.read()

# 1. Outer wrapper
content = content.replace(
    '<div className="space-y-4 max-w-7xl mx-auto select-none pb-12"',
    '<div className="flex flex-col h-full space-y-4 max-w-7xl mx-auto select-none"'
)

# 2. Add blue border to all range inputs
content = content.replace(
    'rounded-lg appearance-none cursor-pointer accent-[#182350]"',
    'rounded-lg appearance-none cursor-pointer accent-[#182350] border border-[#AFD2FA]"'
)
content = content.replace(
    'rounded-lg appearance-none cursor-pointer accent-[#2E9B68]"',
    'rounded-lg appearance-none cursor-pointer accent-[#2E9B68] border border-[#AFD2FA]"'
)
content = content.replace(
    'rounded-lg appearance-none cursor-pointer accent-[#B9915E]"',
    'rounded-lg appearance-none cursor-pointer accent-[#B9915E] border border-[#AFD2FA]"'
)

# 3. Main grid
content = content.replace(
    '<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">',
    '<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 pb-4 overflow-hidden">'
)

# Left Column
content = content.replace(
    '<div className="lg:col-span-8 space-y-4">',
    '<div className="lg:col-span-8 flex flex-col min-h-0">'
)
content = content.replace(
    '<div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-4">',
    '<div className="p-5 sm:p-4 rounded-2xl bg-white border border-[#182350] shadow-xs flex flex-col flex-1 min-h-0 space-y-2">'
)
content = content.replace(
    '<div className="relative w-full py-7 px-4 bg-[#FAFAF5] rounded-xl border border-[#182350] flex items-center justify-center overflow-x-auto">',
    '<div className="relative w-full py-4 px-4 bg-[#FAFAF5] rounded-xl border border-[#182350] flex items-center justify-center overflow-x-auto flex-1 min-h-0">'
)
content = content.replace(
    '<div className="relative w-full py-5 px-4 bg-[#FAFAF5] rounded-xl border border-[#182350] flex flex-col items-center justify-center">',
    '<div className="relative w-full py-2 px-4 bg-[#FAFAF5] rounded-xl border border-[#182350] flex flex-col items-center justify-center shrink-0">'
)

# Right Column reordering and layout
right_col_start = content.find('        {/* ── RIGHT-HAND FEATURE SIDE NAVBAR / CONTROL PANEL (4 cols) ── */}')
right_col_content = content[right_col_start:]

panel_1_start = right_col_content.find('{/* Panel 1: Hold-by-Hold Allocation Sliders */}')
panel_2_start = right_col_content.find('{/* Panel 2: Trim Stabilizer & Hydrodynamic Drag Impact */}')
panel_3_start = right_col_content.find('{/* Panel 3: 6 Fuel Bunker Compartments & Auto-Balance */}')
end = right_col_content.find('      </div>\n    </div>\n  );\n}')

header = right_col_content[:panel_1_start]
panel_1 = right_col_content[panel_1_start:panel_2_start]
panel_2 = right_col_content[panel_2_start:panel_3_start]
panel_3 = right_col_content[panel_3_start:end]
footer = right_col_content[end:]

# Adjust Right Col Classes
header = header.replace(
    '<div className="lg:col-span-4 space-y-4">',
    '<div className="lg:col-span-4 flex flex-col min-h-0 gap-3">'
)

# Adjust Panel 1 (Hold Load)
panel_1 = panel_1.replace(
    '<div className="p-5 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-3">',
    '<div className="flex flex-col flex-1 min-h-0 p-4 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-2">'
)
panel_1 = panel_1.replace(
    '<div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">',
    '<div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF] shrink-0">'
)
panel_1 = panel_1.replace(
    '<div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">',
    '<div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">'
)

# Adjust Panel 3 (Fuel Bunkers)
panel_3 = panel_3.replace(
    '<div className="p-5 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-3">',
    '<div className="flex flex-col flex-1 min-h-0 p-4 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-2">'
)
panel_3 = panel_3.replace(
    '<div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">',
    '<div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF] shrink-0">'
)
panel_3 = panel_3.replace(
    '<div className="space-y-2 max-h-48 overflow-y-auto pr-1">',
    '<div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">'
)
panel_3 = panel_3.replace(
    '<div className="flex gap-2 pt-1">',
    '<div className="flex gap-2 pt-1 shrink-0">'
)

# Adjust Panel 2 (Trim Stabilizer)
panel_2 = panel_2.replace(
    '<div className="p-5 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-3">',
    '<div className="shrink-0 p-4 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-2">'
)
panel_2 = panel_2.replace(
    '<div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF]">',
    '<div className="flex items-center justify-between pb-2 border-b border-[#ECE8DF] shrink-0">'
)

# Reorder: Header, Panel 1, Panel 3, Panel 2, Footer
new_right_col = header + panel_1 + panel_3 + panel_2 + footer

content = content[:right_col_start] + new_right_col

with open("src/components/controller/CargoLayout_new.tsx", "w") as f:
    f.write(content)
