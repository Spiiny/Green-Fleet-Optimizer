import os
import re

directory = 'src'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace background gradients and glow box shadows in inline styles
    content = re.sub(r'background:\s*["\']linear-gradient[^"\']+["\'],?', '', content)
    content = re.sub(r'boxShadow:\s*["\'][^"\']+["\'],?', '', content)
    content = re.sub(r'backdropFilter:\s*["\'][^"\']+["\'],?', '', content)
    
    # Also replace linear-gradient within backgroundImage
    content = re.sub(r'backgroundImage:\s*`\s*linear-gradient[^`]+`,?', '', content)
    
    # Replace rgba(0,201,167,...) with var(--ring) or var(--primary) in borders
    content = re.sub(r'rgba\(0,201,167,[0-9.]+\)', 'var(--primary)', content)
    
    # Replace other old hex colors and rgba with var values where appropriate
    content = re.sub(r'rgba\(30,58,95,[0-9.]+\)', 'var(--border)', content)
    content = re.sub(r'rgba\(13,31,60,[0-9.]+\)', 'var(--card)', content)
    content = re.sub(r'#020c1b', '#0B1628', content)
    content = re.sub(r'#0a1f3d', '#12233B', content)
    content = re.sub(r'#061422', '#0B1628', content)
    
    # Fix style empty brackets
    content = re.sub(r'style=\{\{\s*\}\}', '', content)
    
    # Add new base styles to Buttons that had gradients removed
    # Find style={role === r ? { color: "#0B1628" } : { color: "#5a7fa8" }} 
    # Actually just let's inject solid colors where gradients were.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            process_file(os.path.join(root, file))

print("Done phase 2.")
