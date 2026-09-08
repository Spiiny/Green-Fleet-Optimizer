import re

with open("src/components/controller/RouteOptimization.tsx", "r") as f:
    content = f.read()

# Add planColor to PlanCard
plan_card_start = '  const PlanCard = ({ plan, isSelected }: { plan: RoutePlan; isSelected: boolean }) => ('
plan_card_new = '  const PlanCard = ({ plan, isSelected }: { plan: RoutePlan; isSelected: boolean }) => {\n    const planColor = plan.label === "Fastest" ? "#C94B4B" : plan.label === "Efficient" ? "#2E9B68" : plan.label === "Custom" ? "#B9915E" : plan.color;\n    return ('

content = content.replace(plan_card_start, plan_card_new)

# Update dot color
dot_old = '<div className="w-2.5 h-2.5 rounded-full" style={{ background: plan.color }} />'
dot_new = '<div className="w-2.5 h-2.5 rounded-full" style={{ background: planColor }} />'
content = content.replace(dot_old, dot_new)

# Update button
button_old = """      <button
        onClick={() => onPlanSelect(plan.label)}
        className={`mt-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all cursor-pointer ${
          isSelected
            ? "bg-[#182350] text-white shadow-xs"
            : "bg-white text-[#182350] border border-[#182350] hover:bg-[#F7F5EE]"
        }`}
      >
        {isSelected ? "✓ Plan Selected" : "Select This Plan"}
      </button>
    </div>
  );"""

button_new = """      <button
        onClick={() => onPlanSelect(plan.label)}
        className="mt-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all cursor-pointer shadow-xs hover:opacity-80"
        style={{
          backgroundColor: isSelected ? planColor : "#FFFFFF",
          color: isSelected ? "#FFFFFF" : planColor,
          border: `1px solid ${planColor}`,
        }}
      >
        {isSelected ? "✓ Plan Selected" : "Select This Plan"}
      </button>
    </div>
  );
  }"""

content = content.replace(button_old, button_new)

with open("src/components/controller/RouteOptimization_new.tsx", "w") as f:
    f.write(content)
