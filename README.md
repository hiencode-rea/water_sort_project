# Water Sort Puzzle Solver

An educational full-stack application that solves Water Sort Puzzle boards with **Breadth-First Search (BFS)**, **Depth-First Search (DFS)**, and **A\***. The project includes an interactive browser interface, a Flask API, search-tree visualization, Open/Closed list inspection, deterministic test suites, and a random test-board generator.

## Features

- Interactive board editor with configurable tube count and capacity.
- Random valid test-board generation with one empty tube.
- BFS, DFS, and A* search implementations.
- Color Breaks heuristic for A*.
- Step-by-step playback with Previous, Next, and Auto Play controls.
- Progressive search-tree rendering synchronized with playback.
- Open List and Closed List tables for every search frame.
- Search-node previews rendered as miniature Water Sort boards.
- Search-state colors: blue Open, red next expansion, grey explored, green goal, gold goal path, and purple reserved for depth-pruned IDS nodes.
- Strict API validation and regression coverage for hexadecimal colors.

## Architecture

```text
Browser frontend (HTML/CSS/Vanilla JS)
        │ POST /api/solve
        ▼
Flask API (backend/app.py)
        │ validation and serialization
        ▼
WaterSortState (backend/state.py)
        │ successor generation and goal checks
        ▼
Search algorithms (backend/solver.py)
        │ solution path, metrics, and search trace
        ▼
JSON response → playback, graph, Open/Closed tables
```

## Repository Structure

```text
water_sort_project/
├── backend/
│   ├── app.py                    # Flask API
│   ├── solver.py                 # BFS, DFS, A*, and trace generation
│   ├── state.py                  # Immutable puzzle-state model
│   ├── test_game.py              # Original functional tests
│   ├── test_cases_10.py          # Ten valid boards × three algorithms
│   └── test_edge_cases_10.py     # Ten validation and regression tests
├── frontend/
│   ├── index.html                # Application layout
│   ├── script.js                 # Editor, API client, playback, graph
│   └── style.css                 # Responsive visual system
├── requirements.txt
├── LICENSE
└── README.md
```

## Requirements

- Python 3.10 or newer
- Flask 3.x
- Flask-CORS 4.x
- A modern browser

## Installation and Usage

```powershell
git clone https://github.com/hiencode-rea/water_sort_project.git
cd water_sort_project
pip install -r requirements.txt
cd backend
python app.py
```

The API listens on `http://localhost:5000`. Open `frontend/index.html` directly or serve the frontend with a local static server.

## API

### `POST /api/solve`

```json
{
  "tubes": [
    ["#e74c3c", "#3498db", "#e74c3c", "#3498db"],
    ["#3498db", "#e74c3c", "#3498db", "#e74c3c"],
    ["", "", "", ""]
  ],
  "capacity": 4,
  "algorithm": "astar"
}
```

Successful responses contain `solution_path`, `states_checked`, and `search_trace`. Each move is `[source_index, destination_index, amount, color]`.

`search_trace` contains state nodes with parent and cost metadata, Open/Closed membership for each search event, the goal node identifier, and the selected algorithm.

## State Model

The backend stores boards as tuples of tuples. The first element of a tube is its bottom layer and the last element is its top layer. Backend tubes are compact; the frontend keeps fixed-capacity arrays for rendering.

A valid board must satisfy:

1. At least two tubes are present.
2. Capacity is an integer from 1 to 10.
3. No tube exceeds capacity.
4. Colors are contiguous from the bottom.
5. Every distinct color appears exactly `capacity` times.

## Algorithms

| Algorithm | Data structure | Optimal? | Typical behavior |
|---|---|---:|---|
| BFS | FIFO queue | Yes | Shortest solution, higher memory use |
| DFS | LIFO stack | No | Often fast, not necessarily shortest |
| A* | Priority queue | Yes with the current heuristic | Uses `f(n) = g(n) + h(n)` |

A* uses the Color Breaks heuristic. State keys preserve complete color values; this avoids collisions between hexadecimal colors such as `#e74c3c` and `#3498db`, which both begin with `#`.

## Testing

```powershell
cd backend
python test_game.py
python test_cases_10.py
python test_edge_cases_10.py
```

The edge suite covers malformed requests, invalid capacities, invalid algorithms, broken tube layouts, unsolvable but valid boards, state immutability, A* hexadecimal-color regression, and Open/Closed trace consistency.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).