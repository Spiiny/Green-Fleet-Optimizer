import re

with open("src/components/controller/RouteOptimization.tsx", "r") as f:
    content = f.read()

# Import AnimatedButton
if "import CreepyButton" not in content:
    content = content.replace('import { useState } from "react";', 'import { useState } from "react";\nimport CreepyButton from "../ui/AnimatedButton";')

# Replace button
old_button = """      <button
        onClick={() => onPlanSelect(plan.label)}
        className="mt-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all cursor-pointer shadow-xs hover:opacity-80"
        style={{
          backgroundColor: isSelected ? planColor : "#FFFFFF",
          color: isSelected ? "#FFFFFF" : planColor,
          border: `1px solid ${planColor}`,
        }}
      >
        {isSelected ? "✓ Plan Selected" : "Select This Plan"}
      </button>"""

new_button = """      <div className="mt-4">
        <CreepyButton
          onClick={() => onPlanSelect(plan.label)}
          className="w-full text-[11px]"
          coverStyle={{
            backgroundColor: isSelected ? planColor : "#FFFFFF",
            color: isSelected ? "#FFFFFF" : planColor,
            border: `1px solid ${planColor}`,
          }}
        >
          {isSelected ? "✓ PLAN SELECTED" : "SELECT THIS PLAN"}
        </CreepyButton>
      </div>"""

content = content.replace(old_button, new_button)

with open("src/components/controller/RouteOptimization_new.tsx", "w") as f:
    f.write(content)
