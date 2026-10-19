# Project Plan and Delivery Notes

## Completed Scope

- Formalized Water Sort as a graph-search problem.
- Implemented immutable state handling and strict validation.
- Implemented BFS, DFS, and A*.
- Added Color Breaks heuristic and collision-safe state keys.
- Built Flask API integration.
- Built a responsive Vanilla JavaScript frontend.
- Added step playback and Auto Play.
- Added progressive search-tree visualization.
- Added Open/Closed list inspection.
- Added miniature board previews inside graph nodes.
- Added random valid test-state generation.
- Added ten valid scenarios and ten edge/regression scenarios.

## Current Test Inventory

| Suite | Coverage |
|---|---|
| `test_game.py` | Core rules and regression checks |
| `test_cases_10.py` | Ten valid boards × BFS/DFS/A* |
| `test_edge_cases_10.py` | Ten invalid-input and regression cases |

## Future Improvements

- Add Iterative Deepening Search and purple depth-pruned nodes.
- Add animated pour transitions.
- Add board save/load support.
- Add automated browser tests.
- Improve heuristic quality for larger boards.
- Add a production static-server configuration.