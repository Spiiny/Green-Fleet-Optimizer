import os
import re

directory = 'src'

replacements = {
    r'#1e3a5f': '#30445F', # old border -> new border
    r'#080f20': '#0B1628', # old header bg -> new background
    r'#0d2040': '#12233B', # old grid lines -> new secondary background
    r'#0a1a2e': '#12233B', # old landmass -> new secondary background
    r'rgba\(29,111,164,0\.3\)': '#1D3554', # old accent -> new accent hover
    r'rgba\(6,15,30,0\.6\)': '#12233B', # old dark panel -> new secondary background
    r'#1D3554': '#1D3554', # just in case, already correct
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = content
    for pattern, replacement in replacements.items():
        new_content = re.sub(pattern, replacement, new_content, flags=re.IGNORECASE)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            process_file(os.path.join(root, file))

print("Done phase 3.")
