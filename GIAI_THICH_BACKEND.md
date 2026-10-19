# Backend Engineering Guide

## 1. Responsibilities

The Flask backend performs four responsibilities:

1. Receive a board and algorithm selection from the frontend.
2. Validate the request and the Water Sort rules.
3. Execute BFS, DFS, or A*.
4. Return the solution path, metrics, and search trace as JSON.

## 2. Modules

| File | Responsibility |
|---|---|
| `app.py` | Flask application, CORS, request validation, response serialization |
| `state.py` | Immutable state model, goal detection, successor generation |
| `solver.py` | BFS, DFS, A*, heuristic, and Open/Closed trace generation |

## 3. State Representation

The backend uses `tuple[tuple[str, ...], ...]` so that a board can be hashed and stored in a visited set or closed-list dictionary.

```python
(('#e74c3c', '#3498db'), ('#3498db', '#e74c3c'), ())
```

The first value is the bottom layer; the last value is the top layer. The frontend may use empty-string placeholders, but the API compacts them before constructing `WaterSortState`.

## 4. Validation Pipeline

Validation is performed at the API boundary and again by the state model:

- `tubes` must be a list containing at least two lists.
- `capacity` must be an integer from 1 through 10.
- `algorithm` must be `bfs`, `dfs`, or `astar`.
- No tube may exceed capacity.
- No color may appear after an empty slot.
- Every color must occur exactly `capacity` times.

Invalid requests return HTTP 400 with:

```json
{"status": "invalid", "error": "..."}
```

## 5. Successor Generation

`WaterSortState.get_next_moves()`:

1. Reads the top color of each non-empty source tube.
2. Counts only the contiguous top block of that color.
3. Skips full destinations.
4. Allows a pour into an empty destination or a destination with the same top color.
5. Transfers `min(top_block, empty_slots)` layers.
6. Returns successor states and matching move tuples.

Moves use the format:

```text
(source_index, destination_index, amount, color)
```

## 6. Search Trace

`solve_with_trace()` produces:

- `nodes`: state snapshots with `id`, `parent`, `move`, `g`, `h`, `f`, and status.
- `timeline`: Open and Closed membership after search events.
- `goal_node`: the discovered goal node.

The frontend uses the timeline to progressively reveal the tree as the user presses Next, Previous, or Auto Play.

## 7. A* State-Key Regression

State keys must preserve complete color strings. Taking only `color[0]` is unsafe for hexadecimal colors because every color begins with `#`. The implementation therefore uses the full tuple representation.