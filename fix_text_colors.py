import re

# ─────────────────────────────────────────────
# 1. VesselSidebar.tsx — selected card fix
# ─────────────────────────────────────────────
path = r"src\components\controller\VesselSidebar.tsx"
txt = open(path, encoding="utf-8").read()

# Change selected card from solid teal fill → subtle teal-border
txt = txt.replace(
    'background: isSelected ?"var(--primary)" :"transparent",',
    'background: isSelected ? "rgba(24,166,166,0.14)" : "transparent",'
)
txt = txt.replace(
    'border: `1px solid ${isSelected ?"var(--primary)" :"transparent"}`,',
    'border: `1px solid ${isSelected ? "#18A6A6" : "transparent"}`,'
)
# Methanol fuelColors value is dark #1D3554 — unreadable on dark bg
txt = txt.replace(
    'Methanol:"#1D3554",',
    'Methanol:"#5b9bd5",'
)

open(path, "w", encoding="utf-8").write(txt)
print("VesselSidebar.tsx fixed")

# ─────────────────────────────────────────────
# 2. RouteOptimization.tsx — badge + fuel btn
# ─────────────────────────────────────────────
path = r"src\components\controller\RouteOptimization.tsx"
txt = open(path, encoding="utf-8").read()

# "Active Plan" badge: teal bg + teal text → teal bg + white text
txt = txt.replace(
    'style={{ background:"var(--primary)", border:"1px solid var(--primary)", color:"#18A6A6" }}',
    'style={{ background:"rgba(24,166,166,0.15)", border:"1px solid #18A6A6", color:"#F1F5F9" }}'
)

# Fuel type selected button: teal bg + teal text → teal bg + white text
txt = txt.replace(
    '? { background:"var(--primary)", border:"1px solid #18A6A6", color:"#18A6A6" }',
    '? { background:"#18A6A6", border:"1px solid #18A6A6", color:"#0B1628" }'
)

# Unselected fuel buttons: make muted text lighter
txt = txt.replace(
    ': { border:"1px solid #30445F", color:"#5a7fa8" }',
    ': { border:"1px solid #30445F", color:"#A8B5C7" }'
)

open(path, "w", encoding="utf-8").write(txt)
print("RouteOptimization.tsx fixed")

# ─────────────────────────────────────────────
# 3. OrdersFlow.tsx — confirmation banner fix
# ─────────────────────────────────────────────
path = r"src\components\controller\OrdersFlow.tsx"
txt = open(path, encoding="utf-8").read()

# Confirmation banner: solid teal bg + teal text → teal bg + white text
txt = txt.replace(
    'style={{ borderColor:"var(--primary)", background:"var(--primary)" }}',
    'style={{ borderColor:"#18A6A6", background:"rgba(24,166,166,0.15)" }}'
)
txt = txt.replace(
    '<div className="font-bold text-primary">Final Plan Confirmed:',
    '<div className="font-bold" style={{ color:"#F1F5F9" }}>Final Plan Confirmed:'
)
txt = txt.replace(
    '<div className="text-xs text-muted-foreground">Captain {vessel.captain}',
    '<div className="text-xs" style={{ color:"#A8B5C7" }}>Captain {vessel.captain}'
)

# Vessel icon box: teal bg + invisible emoji → use subtle teal
txt = txt.replace(
    'style={{ background:"var(--primary)", border:"1px solid var(--primary)" }}',
    'style={{ background:"rgba(24,166,166,0.2)", border:"1px solid #18A6A6" }}'
)

open(path, "w", encoding="utf-8").write(txt)
print("OrdersFlow.tsx fixed")

print("\nAll text color fixes applied!")
