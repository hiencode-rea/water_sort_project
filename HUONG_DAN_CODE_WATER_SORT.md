# Code and Operations Guide

## Run the Project

```powershell
cd C:\TTNT\water_sort_project
pip install -r requirements.txt
cd backend
python app.py
```

Open `frontend/index.html` in a modern browser. If the browser caches old assets, use a hard refresh (`Ctrl+F5`). Asset query versions are updated when the frontend bundle changes.

## Run Tests

```powershell
cd C:\TTNT\water_sort_project\backend
python test_game.py
python test_cases_10.py
python test_edge_cases_10.py
```

## Frontend Workflow

1. Set the number of tubes and capacity.
2. Build a board manually or click **Generate Random Test**.
3. Choose BFS, DFS, or A*.
4. Click **Solve Puzzle**.
5. Use Previous, Next, Auto Play, or the search timeline.
6. Inspect the progressive tree and Open/Closed tables.

## Data Conventions

Frontend tubes use fixed-capacity arrays with empty strings. Backend tubes are compact tuples. Tube index `0` is the bottom layer and the last index is the top layer.

## Common Maintenance Rules

- Preserve the `solution_path` move format.
- Keep frontend and backend tube ordering consistent.
- Use full color strings when creating state keys.
- Keep search trace IDs stable within one solve request.
- Run all three test suites after changing state or solver logic.