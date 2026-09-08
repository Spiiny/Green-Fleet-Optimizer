import re

with open("src/components/controller/CargoLayout.tsx", "r") as f:
    content = f.read()

# Fix the bug with the mismatched div tags from previous python script
content = content.replace(
"""              </button>
            </div>
          </div>
        </div>
{/* Panel 2: Trim Stabilizer & Hydrodynamic Drag Impact */}
          <div className="shrink-0 p-4 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-2">
""",
"""              </button>
            </div>
          </div>

          {/* Panel 2: Trim Stabilizer & Hydrodynamic Drag Impact */}
          <div className="flex-1 flex flex-col justify-center p-4 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-3">
""")

content = content.replace(
"""            </div>
          </div>

                </div>
    </div>
  );
}""",
"""            </div>
          </div>
        </div>
      </div>
    </div>
  );
}""")

# Minimize 2D Top-Down
# Currently it is: <div className="relative w-full py-4 px-4 bg-[#FAFAF5] rounded-xl border border-[#182350] flex items-center justify-center overflow-x-auto flex-1 min-h-0">
# Let's reduce padding and remove flex-1 so it's minimized, but maybe use shrink-0
content = content.replace(
    '<div className="relative w-full py-4 px-4 bg-[#FAFAF5] rounded-xl border border-[#182350] flex items-center justify-center overflow-x-auto flex-1 min-h-0">',
    '<div className="relative w-full py-1 px-4 bg-[#FAFAF5] rounded-xl border border-[#182350] flex items-center justify-center overflow-x-auto shrink-0 h-40">'
)

# And make the Left Col Card 1 flex-1 instead of giving flex-1 to the top-down
# Wait, Card 1 is already flex-1. If Top-Down is shrink-0, then Side Profile can be flex-1 to expand, or we can just leave it as is so it doesn't take up the whole screen if it doesn't need to.
# Let's also adjust the SVG inside Top-Down to scale down if needed.
# The SVG is width="670" height="160". If we wrap it in a container that scales it down? It uses viewBox. We can add a class to scale it. 
# <svg ... className="drop-shadow-xs" ...> -> <svg ... className="drop-shadow-xs w-full h-auto max-h-32" ...>

content = content.replace(
    'className="drop-shadow-xs"\n                style={{',
    'className="drop-shadow-xs h-full w-auto max-w-full"\n                style={{'
)

with open("src/components/controller/CargoLayout_new2.tsx", "w") as f:
    f.write(content)
