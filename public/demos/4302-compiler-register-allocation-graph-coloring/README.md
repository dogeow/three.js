# Compiler Register Allocation — Chaitin-Briggs Graph Coloring Visualization

## Overview

Interactive 3D visualization of the **Chaitin-Briggs register allocation algorithm** using graph coloring. Watch as the compiler decides which variables can share CPU registers and which must spill to memory.

## Files

- `index.html` — Host page with importmap for Three.js
- `main.js` — Complete Three.js implementation (17 KB, ~380 lines)

## How It Works

### Algorithm Phases (animated step-by-step)

1. **Simplify** (degree < K): Pick a variable that interferes with fewer than K other variables, remove it from the graph, push onto a stack.
2. **Spill** (degree ≥ K): When every remaining variable interferes with ≥ K others, pick one to **spill** — it gets stored in memory instead of a register.
3. **Select**: Pop variables from the stack and assign them the first available register color (one that none of their neighbors use).

### 3D Visualization

| Element | Representation |
|---------|---------------|
| Sphere nodes | Program variables (a–h) |
| Edges | Interference between variables |
| 4 colors | 4 available CPU registers (R0–R3) |
| Gray sphere | Spilled to memory |
| Orange sphere | Pushed onto algorithm stack |
| White highlight | Currently active node |

## Controls

- **▶ Run Coloring** — Start the algorithm animation
- **Speed slider** — Adjust step delay (100–1500 ms)
- **Orbit** (mouse drag) — Rotate 3D view
- **Scroll** — Zoom in/out

## Running

Serve the directory with any static HTTP server, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Algorithm Notes

- **K = 4 registers** — Classic x86 convention (EAX, EBX, ECX, EDX or their subsets)
- Spilled variables incur a **memory load/store cost** on every use — that's why register allocation matters
- Real compilers like LLVM use iterative coalescing and degree-aware heuristics beyond this basic formulation
