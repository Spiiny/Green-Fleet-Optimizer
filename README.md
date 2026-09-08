# Green Fleet Optimizer

Green Fleet Optimizer is an advanced maritime fleet management and multi-objective routing optimization platform. The system couples an interactive controller operations interface with a quantum-inspired optimization engine for vessel scheduling, speed optimization, and carbon emissions reduction.

---

## Architecture Overview

```
Green-Fleet-Optimizer/
├── frontend/                     # Interactive Controller & Fleet Operations UI (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── controller/      # Fleet Overview, Live Map, Route Optimization, What-If Analysis
│   │   │   ├── captain/         # Captain Dashboard & voyage reporting
│   │   │   └── ui/              # Animated components, search palettes, profile modal
│   │   ├── data/                # Fleet and order datasets
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                      # Maritime Optimization Engine (Python)
│   ├── fleetopt/
│   │   ├── benchmark/           # Standard benchmark problem runners and indicator calculations
│   │   ├── inner/               # Speed-solve non-linear voyage optimization
│   │   ├── io/                  # Data loaders and schema validation
│   │   ├── master/              # QUBO, DSB, and option generation
│   │   ├── model/               # Emissions (CII/EEXI), network graph, and port constraints
│   │   ├── outer/               # MOEA/D-AWA, SMS-EMOA, and Pareto archiving
│   │   └── repair/              # Feasibility repair decoders
│   ├── data/                    # Maritime operational CSVs (legs, vessels, tides, bunkers)
│   ├── scripts/                 # Benchmarking and ablation study scripts
│   ├── tests/                   # Pytest suite
│   ├── requirements.txt
│   └── README.md
│
└── README.md
```

---

## Getting Started

### Frontend (React + Vite)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

---

### Backend (Python Optimization Engine)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Run tests:
   ```bash
   pytest
   ```
5. Run benchmark evaluation:
   ```bash
   python scripts/evaluate_zdt.py
   ```

---

## License

All rights reserved.
