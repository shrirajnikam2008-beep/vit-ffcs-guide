# VIT FFCS Timetable Maker — Smart Course Registration & Slot Simulator

A fast, light-themed **VIT FFCS (Fully Flexible Credit System) Timetable Maker** built for VIT Vellore and VIT Chennai students (`Winter Semester 2026–27`). Inspired by [no8am.site](https://no8am.site/) and Google Calendar.

## Key Features
- **Split-Screen Live Planner**: Searchable course, teacher, and slot selector on the left (~38%) with an instant-updating weekly VIT timetable grid on the right (~62%).
- **Authoritative VIT Slot Engine**: Supports Theory (`A1–G2`), Tutorial (`TA1–TGG2`), Lab (`L1–L60`), Workshop (`V1–V7`), Online (`OC`), and combined slot strings (`B1+TB1+TBB1`, `L41+L42+L49+L50`). Never guesses unmapped slots (`G1`, `G2`, `ANY SLOT`).
- **Automatic Real-Time Clash Detection**: Detects Theory vs. Theory, Theory vs. Lab, Lab vs. Lab, and Tutorial vs. Tutorial overlaps (including `TBB1` vs `TCC1` on Thursday Period 5) and suggests 1-click clash-free alternative teachers and sections.
- **Verified No8AM Faculty Reviews**: Integrates 3,158 professor profiles from `no8am.site` (ratings, review counts, cart demand, and profile links) without fabricating ratings when a teacher has 0 reviews.
- **Multi-Sheet Excel/CSV Importer**: Reads VIT Course Allocation workbooks (`.xlsx` / `.csv`), preserves source sheet/row traceability, and isolates cross-course anomalies.

## Quick Start

### 1. Backend (FastAPI + SQLite)
```powershell
uv run python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend (React 19 + TypeScript + Vite + Tailwind CSS)
```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

### 3. Run Automated Tests (14 Pytest Suites)
```powershell
uv run python -m pytest -v
```
