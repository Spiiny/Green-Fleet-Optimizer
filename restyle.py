import os
import re

directory = 'src'

replacements = {
    # Typography
    r'\bfont-mono\b': 'font-sans',
    
    # Text colors
    r'\btext-blue-[56789]00\b': 'text-muted-foreground',
    r'\btext-blue-[234]00\b': 'text-secondary-foreground',
    r'\btext-(cyan|teal)-[3456]00\b': 'text-primary',
    r'\btext-green-[3456]00\b': 'text-success',
    r'\btext-red-[3456]00\b': 'text-danger',
    r'\btext-(yellow|amber)-[3456]00\b': 'text-warning',
    
    # Backgrounds
    r'\bbg-blue-(900|950)\b': 'bg-secondary',
    r'\bbg-blue-800\b': 'bg-accent',
    r'\bhover:bg-blue-(800|900)\b': 'hover:bg-accent',
    r'\bbg-(cyan|teal)-[456]00\b': 'bg-primary',
    r'\bbg-green-[456]00\b': 'bg-success',
    r'\bbg-red-[456]00\b': 'bg-danger',
    r'\bbg-(yellow|amber)-[456]00\b': 'bg-warning',
    
    # Background Opacity variants
    r'\bbg-blue-[89]00/[0-9]+\b': 'bg-secondary/50',
    r'\bbg-(cyan|teal)-[45]00/[0-9]+\b': 'bg-primary/20',
    r'\bhover:bg-blue-[89]00/[0-9]+\b': 'hover:bg-accent/50',
    r'\bhover:bg-(cyan|teal)-[45]00/[0-9]+\b': 'hover:bg-primary/20',

    # Borders
    r'\bborder-blue-[789]00\b': 'border-border',
    r'\bborder-blue-[789]00/[0-9]+\b': 'border-border',
    r'\bborder-blue-[456]00\b': 'border-muted-foreground',
    r'\bborder-(cyan|teal)-[456]00\b': 'border-primary',
    r'\bborder-(cyan|teal)-[456]00/[0-9]+\b': 'border-primary/50',
    r'\bhover:border-blue-[456]00\b': 'hover:border-muted-foreground',
    r'\bhover:border-(cyan|teal)-[456]00\b': 'hover:border-primary',
    r'\bhover:border-(cyan|teal)-[456]00/[0-9]+\b': 'hover:border-primary/50',
    
    # Glows and effects
    r'\bglow-green\b': '',
    r'\bglow-blue\b': '',
    r'\bbackdrop-blur-(sm|md|lg|xl)\b': '',
    r'\bbg-gradient-to-[a-z]+\b': '',
    r'\bfrom-blue-[0-9]+\b': '',
    r'\bfrom-cyan-[0-9]+\b': '',
    r'\bfrom-teal-[0-9]+\b': '',
    r'\bto-blue-[0-9]+\b': '',
    r'\bto-cyan-[0-9]+\b': '',
    r'\bto-teal-[0-9]+\b': '',
    r'\bto-transparent\b': '',
    r'\bfrom-transparent\b': '',
    r'\bvia-blue-[0-9]+\b': '',
    r'\bvia-cyan-[0-9]+\b': '',
    
    # Shadows
    r'\bshadow-\[.*?\]\b': 'shadow-sm',
    
    # Hardcoded Hex colors in inline styles or SVGs
    r'#00c9a7': '#18A6A6',
    r'#1d6fa4': '#1D3554',
    r'#0d1f3c': '#172B46',
    r'#060f1e': '#0B1628',
    r'#e8f0fe': '#F1F5F9',
    r'#ef4444': '#C94B4B',
    r'#3b82f6': '#1D3554', # blue-500 to accent
    r'#10b981': '#2E9B68',
    r'#f59e0b': '#D99A2B',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = content
    for pattern, replacement in replacements.items():
        new_content = re.sub(pattern, replacement, new_content)
        
    # Clean up double spaces left by removing classes
    new_content = re.sub(r' +', ' ', new_content)
    new_content = new_content.replace('className=" ', 'className="')
    new_content = new_content.replace(' "', '"')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            process_file(os.path.join(root, file))

print("Done.")
