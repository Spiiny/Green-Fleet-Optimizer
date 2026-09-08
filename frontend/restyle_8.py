import re

with open("src/components/controller/CargoLayout.tsx", "r") as f:
    content = f.read()

# Remove 'appearance-none' from slider classes to allow the browser to render the thumb natively with accent-color
content = content.replace('appearance-none cursor-pointer', 'cursor-pointer')

with open("src/components/controller/CargoLayout_new5.tsx", "w") as f:
    f.write(content)
