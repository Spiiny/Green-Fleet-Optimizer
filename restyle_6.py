import re

with open("src/components/controller/CargoLayout.tsx", "r") as f:
    content = f.read()

# Find the Trim Stabilizer block
start_marker = "{/* Panel 2: Trim Stabilizer & Hydrodynamic Drag Impact */}"
end_marker = "          </div>\n        </div>\n      </div>\n    </div>\n  );\n}"

trim_start = content.find(start_marker)
# Trim Stabilizer ends just before the end of the right column
trim_end = content.find("        </div>\n      </div>\n    </div>\n  );\n}")

trim_block = content[trim_start:trim_end]
# Add a newline for cleanliness
trim_block = "          " + trim_block.strip() + "\n"

# Remove the Trim Stabilizer from its current position
content = content[:trim_start] + "        </div>\n      </div>\n    </div>\n  );\n}"

# Now find where to insert it: below the Side Profile
side_profile_end_marker = "              </div>\n            </div>\n          </div>\n        </div>"

insert_pos = content.find("            </div>\n          </div>\n        </div>\n\n        {/* ── RIGHT-HAND FEATURE SIDE NAVBAR / CONTROL PANEL (4 cols) ── */}")

if insert_pos == -1:
    print("Could not find insert position")
    exit(1)

# We want to insert it inside the Card 1 (which ends with `          </div>\n        </div>`)
# Let's find the exact end of Card 1.
# Card 1 starts at: <div className="p-5 sm:p-4 rounded-2xl bg-white border border-[#182350] shadow-xs flex flex-col flex-1 min-h-0 space-y-2">
# It contains: Header, Top-Down view, Side Profile view.
# Side Profile view ends at:
side_profile_end = """                </svg>
              </div>
            </div>"""

idx = content.find(side_profile_end)
if idx != -1:
    insert_pos_2 = idx + len(side_profile_end) + 1
    # Insert trim_block here
    new_content = content[:insert_pos_2] + "\n" + trim_block + content[insert_pos_2:]
    
    # We should also change Trim Stabilizer's flex-1 to shrink-0 since it doesn't need to take all vertical space, or maybe leave it as flex-1. 
    # Currently Trim Stabilizer has: className="flex-1 flex flex-col justify-center p-4 rounded-2xl bg-white border border-[#182350] shadow-xs space-y-3"
    # But since it's going inside Card 1 (which is already a card), it shouldn't have its own card background!
    # Or maybe it should just be placed after Card 1 as a separate card? "move the trim stabilser below the side profile dynamic pitch". Let's place it outside Card 1 as Card 2 in the left column.
    pass

# Let's place it as a separate card below Card 1.
left_col_end_marker = "          </div>\n        </div>\n\n        {/* ── RIGHT-HAND FEATURE SIDE NAVBAR / CONTROL PANEL (4 cols) ── */}"
idx3 = content.find(left_col_end_marker)

if idx3 != -1:
    # insert before the last </div> of left col
    # </div> closes Card 1
    # </div> closes lg:col-span-8
    
    # We want to insert it between Card 1 and the end of lg:col-span-8
    insert_idx = idx3 + len("          </div>\n")
    
    new_content = content[:insert_idx] + "\n" + trim_block + content[insert_idx:]
    
    with open("src/components/controller/CargoLayout_new3.tsx", "w") as f:
        f.write(new_content)
else:
    print("Failed to find insertion point")
