# Search Algorithm Guide

## 1. Search Model

Each Water Sort board is a node in a graph. A legal pour creates an edge to a successor state. The goal is reached when every non-empty tube is full and contains one color only.

## 2. BFS

BFS uses a FIFO queue and expands states level by level. With unit move costs, the first goal found is an optimal solution in number of pours. Its main drawback is memory usage.

## 3. DFS

DFS uses a LIFO stack and follows one branch deeply before backtracking. It can use less memory and may find a solution quickly, but it does not guarantee the shortest path.

## 4. A*

A* prioritizes nodes using:

```text
f(n) = g(n) + h(n)
```

- `g(n)`: number of pours from the initial state.
- `h(n)`: estimated remaining cost.

The current heuristic counts color transitions inside tubes. A transition from one color to another represents a color break that must eventually be separated by a pour.

## 5. Open and Closed Lists

- **Open List** contains discovered states waiting to be expanded.
- **Closed List** contains states already expanded.
- A state key must uniquely identify the full board.
- A* stores the best known `g` cost for each key.

The frontend visualizes these structures per search frame and synchronizes them with the solution playback.

## 6. Visual State Legend

| Color | Meaning |
|---|---|
| Blue | Node is in Open List |
| Red | Node selected for the next expansion |
| Grey | Node has been explored |
| Green | Goal state |
| Gold | Path from goal back to root |
| Purple | Reserved for depth-pruned IDS nodes |

Only nodes revealed by the current replay frame are rendered. Pressing Next reveals the next frame; pressing Previous removes it.