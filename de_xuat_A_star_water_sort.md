# Proposal for an A* Algorithm for the Water Sort Puzzle

## 1. Objective

This proposal investigates the use of the A* search algorithm to solve the Water Sort Puzzle. A* combines the cost already incurred from the initial state with an estimate of the remaining cost to a goal state, with the aim of finding solutions more efficiently than uninformed search in suitable cases.

At the undergraduate thesis stage, the goal is to implement an A* solver, investigate heuristics, and conduct an empirical evaluation. The proposed heuristic should not be claimed as novel until the related literature review has been completed.

## 2. Problem Model

### 2.1. State

A state represents the contents of all tubes. Each tube has a maximum capacity of `K`, and the order of the color layers within each tube is preserved.

A state can be represented as:

```text
state = (tube_1, tube_2, ..., tube_n)
```

Each `tube_i` is a sequence of colors ordered from the bottom to the opening of the tube. This convention must be used consistently throughout the program.

### 2.2. Initial State

The initial state is the color configuration provided to the solver. The input must be validated, including tube capacity, the number of occurrences of each color, and the number of empty tubes.

### 2.3. Goal State

Under the common Water Sort rules, a goal state is reached when every tube is either empty or contains only one color without exceeding its capacity. If the problem requires every color to occupy exactly one full tube, this condition must be stated explicitly, and the initial configuration must be compatible with it.

### 2.4. State Transitions

A transition pours color from a source tube into a destination tube according to the rules of the game variant under study. In a common model:

- The source tube is not empty.
- The destination tube is different from the source and has available space.
- The destination tube is empty, or its top layer matches the color being poured.
- The amount poured follows the game rules: typically, the entire contiguous top group of the same color is transferred, or only enough is transferred to fill the available space if the variant specifies this behavior.

**Note:** A single pouring rule must be selected and clearly specified before implementation, because it affects the state space, solution length, and correctness of the results.

### 2.5. Cost

Assign a cost of `1` to each valid pour. A* then minimizes the number of pours, which does not necessarily minimize real-world execution time.

## 3. A* Algorithm

A* evaluates each state `s` using:

\[
f(s) = g(s) + h(s)
\]

Where:

- `g(s)`: the number of steps from the initial state to `s`.
- `h(s)`: an estimate of the minimum number of steps remaining to reach a goal state.
- `f(s)`: the estimated solution cost of a path through `s`.

At each iteration, the algorithm removes the state with the smallest `f(s)` from the priority queue. If it is a goal state, the solver reconstructs the solution by following parent links. Otherwise, it generates all successor states reachable by valid pours.

The best known cost must be stored for each state. If a newly found path has a smaller `g`, the state must be updated and a new entry added to the queue. When an entry is removed from the queue, it should be skipped if it is stale—that is, if its cost no longer matches the current best known cost.

## 4. Heuristics

### 4.1. Baseline Heuristic

An initial baseline is `h(s) = 0`. In this case, A* is equivalent to uniform-cost search (UCS); with a unit cost per step, its expansion order by depth is equivalent to BFS, subject to how duplicate states are handled.

This baseline can be used to verify the correctness of the solver before testing more complex heuristics.

### 4.2. CRMH — Color Run Merging Heuristic (Idea Under Investigation)

A *run* is a contiguous group of identical colors within a tube. Let `R_c(s)` be the total number of runs of color `c` across all tubes. The heuristic under investigation is:

\[
h_{\mathrm{CRMH}}(s)=\sum_c \max(0, R_c(s)-1)
\]

This formula estimates the number of surplus color groups that need to be merged. It is a **candidate heuristic** and has not been established as admissible. Before using it to claim that A* always finds an optimal solution, it must be proven that for every state `s`, `h(s)` does not exceed the optimal remaining cost `h^*(s)`. If this has not been proven, report empirical results only and do not claim guaranteed optimality.

### 4.3. RWSH — Relaxed Water Sort Heuristic (Proposed Research Direction)

The idea is to define a relaxed problem in which a contiguous color group can be selected from any position within a tube—not only from the opening—and transferred to another tube when sufficient capacity is available. After removing the group, the remaining layers in the source tube are joined according to the relaxed model. Each operation in the relaxed problem has a cost of `1`.

Let `d_R(s, G)` be the minimum number of steps from `s` to a goal state `G` in the relaxed state graph. Then:

\[
h_{\mathrm{RWSH}}(s)=d_R(s,G)
\]

For RWSH to be admissible for the original problem, every valid operation in the original problem must also be an operation in the relaxed model with the same cost. When this condition holds, every valid path in the original problem exists in the relaxed state graph; therefore, the optimal distance in the relaxed graph cannot exceed the optimal distance in the original problem.

The relaxed model must specify whether it allows transferring only part of a color group when the destination has room for only part of it. If the original rules permit partial transfers but the relaxed model does not, the admissibility argument above is not guaranteed.

RWSH is currently a working name for this proposed direction. Its novelty relative to prior work has not been confirmed. Computing the exact `d_R` for each state may be expensive; runtime and memory costs should be evaluated, along with caching or precomputation strategies.

## 5. A* Pseudocode

```text
A_STAR(start):
    open_set = priority queue ordered by f
    g_score[start] = 0
    parent[start] = NONE
    push open_set (f = h(start), state = start, g = 0)

    while open_set is not empty:
        current = pop entry with the smallest f

        if current.g != g_score[current.state]:
            continue  # stale entry

        if IS_GOAL(current.state):
            return RECONSTRUCT_PATH(parent, current.state)

        for next_state in VALID_SUCCESSORS(current.state):
            tentative_g = g_score[current.state] + 1

            if next_state is not in g_score
               or tentative_g < g_score[next_state]:
                g_score[next_state] = tentative_g
                parent[next_state] = current.state
                next_f = tentative_g + h(next_state)
                push open_set (f = next_f,
                               state = next_state,
                               g = tentative_g)

    return FAILURE  # no solution found in the explored state space
```

`VALID_SUCCESSORS` must generate every valid successor according to the defined rules. `RECONSTRUCT_PATH` follows `parent` links from the goal state back to the initial state, then reverses the list.

## 6. State Representation and Duplicate-State Avoidance

For efficient state lookup, convert the tube configuration into a canonical key, such as a tuple of color tuples. If tubes can be permuted without changing the meaning of a state, canonicalizing tube order may be investigated to reduce duplicate states. However, this should only be done after proving that the canonicalization preserves both the transition rules and the goal condition.

Do not use the first character of a color name as its identifier if different colors may share that character. Use unique color IDs or preserve the full color value in the state key.

## 7. Experimental Evaluation Plan

At a minimum, compare the following configurations:

1. BFS or A* with `h = 0` as the baseline.
2. A* + CRMH.
3. A* + RWSH, if the model and heuristic computation have been implemented correctly.
4. Optionally, additional heuristics from the related literature.

For each test case, record:

- Whether a solution was found.
- Solution length.
- Number of expanded states.
- Runtime.
- Memory usage.
- Heuristic computation time separately, if measurable.

Use the same test set, pouring rules, hardware conditions, and stopping criteria for all methods. For small cases, use BFS or an independent optimal method to verify solution length. Do not report only cases favorable to the proposed heuristic; also analyze cases where it does not improve performance or fails.

## 8. Success Criteria

The proposal is well-founded for further development when:

- The problem model and pouring rules are unambiguous.
- The solver finds valid solutions for the test cases.
- Optimality is verified through an appropriate proof or comparison with an optimal solver on verifiable cases.
- Each heuristic is clearly classified as proven admissible, proven consistent, or evaluated only empirically.
- Results are reproducible and clearly show heuristic computation costs relative to search benefits.

Do not assume in advance that RWSH will be faster. This is a hypothesis that must be tested experimentally.

## 9. Conclusion

A* is a suitable foundation for investigating heuristic search for the Water Sort Puzzle. The proposed sequence is to first complete A* and validate it with `h = 0`, then evaluate CRMH, and subsequently investigate RWSH using a precisely defined relaxed model. The contribution of the project should be determined based on correctness, experimental results, and comparison with the literature; novelty should not be claimed before these steps are complete.

## 10. Initial References

1. Takehiro Ito et al., “Sorting Balls and Water: Equivalence and Computational Complexity,” FUN 2022.  
   https://arxiv.org/abs/2202.09495

2. Emil Keyder, Jörg Hoffmann, Patrik Haslum, “Semi-Relaxed Plan Heuristics,” AAAI 2012.  
   https://ojs.aaai.org/index.php/AAAI/article/view/8434

3. Richard E. Korf and Ariel Felner, “Disjoint Pattern Database Heuristics,” *Artificial Intelligence*, 134 (2002).  
   https://doi.org/10.1016/S0004-3702(01)00092-3

4. Ariel Felner, Richard E. Korf, Sarit Hanan, “Additive Pattern Database Heuristics,” *Journal of Artificial Intelligence Research* (2004).  
   https://doi.org/10.1613/jair.1480

These references are a starting point for the literature review, not evidence that CRMH or RWSH has been established as novel.