# solver.py - File chứa các thuật toán tìm kiếm lời giải cho bài toán Water Sort Puzzle
# Dựa trên paper Makalah IF2211: "A* Algorithm Application for Solving the Water Sort Puzzle"
# Quy ước đặt tên biến/hàm tuân theo Makalah (C++) nhưng triển khai bằng Python.
#
# Bảng ánh xạ thuật ngữ Makalah -> Code Python:
#   board (vector<vector<char>>)  -> state.tubes (tuple of tuples)
#   matrixToStr()                 -> matrix_to_str()
#   isSolved()                    -> state.is_goal()
#   getPossibleMoves()            -> state.get_next_moves()
#   applyMove()                   -> tích hợp trong get_next_moves()
#   openList (priority_queue)     -> open_list (heapq)
#   closedList (map<string,int>)  -> closed_list (dict: str -> min g_cost)
#   State struct {board,path,cost}-> tuple (state, path, current_g)
#   currentG / nextG              -> current_g / next_g
#   stateChecked                  -> state_checked
#   countTopSameColors()          -> tích hợp trong get_next_moves() (count_top)
#   top()                         -> src_colors[-1]
#   isEmpty() / isFull()          -> not src_colors / empty_slots == 0
#   emptySlots()                  -> capacity - len(dst_colors)

from collections import deque
import heapq


# =====================================================================
# a) Thuật toán BFS (Breadth-First Search - Uninformed Search)
# Makalah Section II.A: BFS explores all nodes at one depth level
# before moving to the next. Guarantees optimal solution.
# Time Complexity: O(V+E), Space Complexity: O(b^d)
# =====================================================================
def solve_bfs(initial_state):
    """
    Giải bài toán bằng BFS (Uninformed Search).
    Trả về tuple (path, state_checked) hoặc (None, state_checked).

    Thuật ngữ Makalah:
    - openList -> queue (FIFO)
    - closedList -> visited (set)
    - stateChecked -> state_checked
    """
    # openList: hàng đợi FIFO, mỗi phần tử là (board, path)
    # path = sequence of moves dẫn tới state hiện tại
    queue = deque([(initial_state, [])])

    # closedList: tập hợp lưu states đã duyệt
    # Dùng set thay vì map vì BFS không cần lưu min g_cost
    visited = set([initial_state])

    # stateChecked: biến đếm số states đã process (Makalah metric)
    state_checked = 0

    while queue:
        # Lấy state ở ĐẦU hàng đợi (FIFO - First In First Out)
        current_state, path = queue.popleft()
        state_checked += 1

        # isSolved(board): kiểm tra goal state
        if current_state.is_goal():
            return path, state_checked

        # getPossibleMoves(): sinh successor states
        next_states, moves = current_state.get_next_moves()

        for ns, move in zip(next_states, moves):
            if ns not in visited:
                visited.add(ns)
                queue.append((ns, path + [move]))

    # openList empty -> no solution exists
    return None, state_checked


# =====================================================================
# b) Thuật toán DFS (Depth-First Search - Uninformed Search)
# Makalah Section II.A: DFS delves as deeply as possible into a branch
# before backtracking. Memory efficient but NOT optimal.
# Time Complexity: O(V+E), Space Complexity: O(V)
# =====================================================================
def solve_dfs(initial_state):
    """
    Giải bài toán bằng DFS (Uninformed Search).
    Trả về tuple (path, state_checked) hoặc (None, state_checked).

    Thuật ngữ Makalah:
    - openList -> stack (LIFO)
    - closedList -> visited (set)
    """
    # openList: ngăn xếp LIFO
    stack = [(initial_state, [])]

    # closedList: tập states đã duyệt
    visited = set([initial_state])

    # stateChecked: số states đã process
    state_checked = 0

    while stack:
        # Lấy state ở ĐỈNH ngăn xếp (LIFO - Last In First Out)
        current_state, path = stack.pop()
        state_checked += 1

        # isSolved(board)
        if current_state.is_goal():
            return path, state_checked

        # getPossibleMoves()
        next_states, moves = current_state.get_next_moves()

        for ns, move in zip(next_states, moves):
            if ns not in visited:
                visited.add(ns)
                stack.append((ns, path + [move]))

    # openList empty -> no solution exists
    return None, state_checked


# =====================================================================
# c) Thuật toán A* (A-Star Search - Informed Search)
# Makalah Section III.C: The solve function using A* algorithm.
# f(n) = g(n) + h(n)
# - openList: priority_queue sorted by f(n)
# - closedList: map<string, int> mapping board string -> minimum g_cost
# - stateChecked: number of distinct board configurations processed
#
# Makalah Section III.D: Heuristic based on "color breaks".
# A color break occurs when currentColor differs from prevColor
# in a bottle (bottom to top), both being actual colors (not '.').
# Admissible: each break requires at least 1 move to resolve.
# Consistent: single move resolves at most 1 color break.
# =====================================================================
def matrix_to_str(tubes):
    """
    Chuyển đổi board (tuple of tuples) thành unique string representation.
    Tương đương hàm matrixToStr trong Makalah C++.
    Dùng làm key trong closedList map.

    Ví dụ: (('Red','Blue'), ('Green',), ()) -> "RB|G||"
    Quy ước: dùng ký tự đầu của màu để tạo string ngắn gọn.
    """
    parts = []
    for tube in tubes:
        s = ''.join(c[0] if c else '.' for c in tube) if tube else ''
        parts.append(s)
    return '|'.join(parts)


def count_color_breaks(state):
    """
    Hàm Heuristic h(n) dựa trên "color breaks" từ Makalah Section III.D.

    Logic: Duyệt từng bottle từ bottom to top (đáy lên đỉnh).
    Khi currentColor khác prevColor (cả 2 đều là màu thực, không phải empty),
    tăng h lên 1. Đây gọi là 1 "color break".

    Ví dụ bottle ['A','A','B','B'] -> 1 break (A->B) -> h += 1
    Ví dụ bottle ['A','A','B','A'] -> 2 breaks (A->B, B->A) -> h += 2

    Admissible: mỗi color break cần ít nhất 1 operation để sort.
    Consistent: 1 move thường resolve tối đa 1 color break.
    """
    h = 0
    for tube in state.tubes:
        # Lọc bỏ ô trống, chỉ giữ màu thực tế
        colors = [c for c in tube if c != '']
        if not colors:
            continue  # isEmpty -> skip

        prev_color = None
        for current_color in colors:
            # Duyệt từ đáy lên đỉnh (left to right trong list)
            if prev_color is not None and current_color != prev_color:
                # Phát hiện color break: currentColor khác prevColor
                h += 1
            prev_color = current_color

    return h


def solve_astar(initial_state):
    """
    Giải bài toán bằng A* (Informed Search).
    Makalah Section III.C: The solve function.

    Trả về tuple (path, state_checked) hoặc (None, state_checked).

    Cấu trúc dữ liệu theo Makalah:
    - openList: priority_queue chứa State structs (board, path, cost)
      -> Python: heapq chứa tuple (f_n, counter, state, path, current_g)
    - closedList: map<string, int> -> dict: matrix_to_str(board) -> min g_cost
    - stateChecked: int đếm số states processed
    """
    # counter: tie-breaker khi 2 states có cùng f(n)
    # Tránh lỗi so sánh object trong heapq
    counter = 0

    # currentG: actual path cost (number of moves) từ start đến current state
    current_g = 0

    # h: heuristic estimate từ initial_state đến goal
    h = count_color_breaks(initial_state)

    # openList: priority_queue sorted by f(n) = g(n) + h(n)
    # Tuple format: (f_n, counter, state, path, current_g)
    open_list = [(h, counter, initial_state, [], current_g)]

    # closedList: map từ string representation -> minimum g_cost
    # Dùng để prevent cycles và redundant exploration
    # Nếu state đã có trong closedList với g_cost nhỏ hơn -> skip
    closed_list = {}
    initial_key = matrix_to_str(initial_state.tubes)
    closed_list[initial_key] = current_g

    # stateChecked: meticulously tracks number of states processed
    state_checked = 0

    while open_list:
        # Extract lowest-cost state từ openList (min-heap)
        f_n, _, current_state, path, current_g = heapq.heappop(open_list)
        state_checked += 1

        # isSolved(currentState.board): check if goal state reached
        if current_state.is_goal():
            # solutions.size() = len(path) -> solution length
            return path, state_checked

        # getPossibleMoves(): generate valid transitions
        next_states, moves = current_state.get_next_moves()

        for ns, move in zip(next_states, moves):
            # nextG = currentG + 1 (each move costs 1 step)
            next_g = current_g + 1

            # Convert board -> string key cho closedList lookup
            ns_key = matrix_to_str(ns.tubes)

            # Check: nếu successor mới HOẶC reachable với lower cost
            # closedList stores minimum g_costs -> only update if next_g < stored
            if ns_key not in closed_list or next_g < closed_list[ns_key]:
                # Update closedList với minimum g_cost mới
                closed_list[ns_key] = next_g

                # Tính h(n) cho successor: heuristic estimate to goal
                h_cost = count_color_breaks(ns)

                # f(n) = g(n) + h(n)
                f_next = next_g + h_cost

                # Tăng counter cho tie-breaking trong priority_queue
                counter += 1

                # Push successor vào openList
                # heapq tự sort theo f(n) nhỏ nhất ở đỉnh
                heapq.heappush(open_list, (f_next, counter, ns, path + [move], next_g))

    # openList empty -> no solution exists
    return None, state_checked