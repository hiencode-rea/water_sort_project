# GIẢI THÍCH THUẬT TOÁN - WATER SORT PUZZLE

Tài liệu này giải thích chi tiết cách triển khai các thuật toán tìm kiếm AI cho bài toán Water Sort Puzzle, dựa trên paper Makalah IF2211: "A* Algorithm Application for Solving the Water Sort Puzzle".

---

## MỤC LỤC

1. [Bảng ánh xạ thuật ngữ Makalah ↔ Python](#1-bảng-ánh-xạ-thuật-ngữ)
2. [Biểu diễn trạng thái](#2-biểu-diễn-trạng-thái)
3. [Toán tử chuyển trạng thái](#3-toán-tử-chuyển-trạng-thái)
4. [Thuật toán BFS](#4-thuật-toán-bfs)
5. [Thuật toán DFS](#5-thuật-toán-dfs)
6. [Thuật toán A* và Heuristic Color Breaks](#6-thuật-toán-a-và-heuristic-color-breaks)
7. [Tính chất Admissible và Consistent của Heuristic](#7-tính-chất-admissible-và-consistent)

---

## 1. BẢNG ÁNH XẠ THUẬT NGỮ

Paper Makalah viết bằng C++. Bảng sau ánh xạ từng khái niệm sang code Python trong `solver.py`:

| Khái niệm Makalah (C++) | Triển khai Python | Giải thích |
|--------------------------|-------------------|------------|
| `board` (`vector<vector<char>>`) | `state.tubes` (tuple of tuples) | Cấu hình các ống nghiệm |
| `matrixToStr(board)` | `matrix_to_str(tubes)` | Chuyển board → string làm key cho closedList |
| `isSolved(board)` | `state.is_goal()` | Kiểm tra trạng thái đích |
| `getPossibleMoves(board)` | `state.get_next_moves()` | Sinh successor states + moves |
| `applyMove(board, move)` | Tích hợp trong `get_next_moves()` | Tạo trạng thái mới sau khi đổ |
| `openList` (priority_queue) | `open_list` (heapq) | Hàng đợi ưu tiên cho A* |
| `closedList` (`map<string,int>`) | `closed_list` (dict: str→int) | Lưu min g_cost cho mỗi trạng thái |
| `State {board, path, cost}` | `tuple(state, path, current_g)` | Cấu trúc lưu trong openList |
| `currentG` / `nextG` | `current_g` / `next_g` | Chi phí thực tế từ start đến node |
| `stateChecked` | `state_checked` | Đếm số states đã process (metric) |
| `countTopSameColors()` | `count_top` trong `get_next_moves()` | Đếm nấc cùng màu liên tiếp ở đỉnh |
| `top()` | `src_colors[-1]` | Màu trên đỉnh ống |
| `isEmpty()` / `isFull()` | `not src_colors` / `empty_slots == 0` | Kiểm tra ống rỗng/đầy |
| `emptySlots()` | `capacity - len(dst_colors)` | Số chỗ trống còn lại |
| `countColorBreaks()` | `count_color_breaks(state)` | Hàm heuristic cho A* |

---

## 2. BIỂU DIỄN TRẠNG THÁI

### 2.1. Cấu trúc dữ liệu

Trạng thái được biểu diễn bằng **Tuple of Tuples** — kiểu dữ liệu bất biến (immutable), có thể hash được, phù hợp làm key trong `set` (visited) hoặc `dict` (closedList).

```python
# Ví dụ: 3 ống, capacity = 4
tubes = (('Đỏ', 'Xanh'), ('Xanh', 'Đỏ'), ())
# Ống 0: đáy='Đỏ', đỉnh='Xanh' (2 nấc)
# Ống 1: đáy='Xanh', đỉnh='Đỏ' (2 nấc)
# Ống 2: rỗng hoàn toàn
```

**Quy ước quan trọng:**
- Phần tử **đầu** tuple = **đáy** ống
- Phần tử **cuối** tuple = **đỉnh** ống (miệng ống)
- Backend lưu dạng **compact**: chỉ chứa màu thực tế, không có chuỗi `''` xen giữa
- Frontend lưu dạng **full**: có ô trống `''` để render UI

### 2.2. String Representation (matrix_to_str)

Hàm `matrix_to_str()` chuyển tuple → string duy nhất, dùng làm key trong `closedList` của A*:

```python
def matrix_to_str(tubes):
    parts = []
    for tube in tubes:
        s = ''.join(c[0] if c else '.' for c in tube) if tube else ''
        parts.append(s)
    return '|'.join(parts)

# Ví dụ: (('Đỏ','Xanh'), ('Xanh',), ()) → "ĐX|X|"
```

Tương đương hàm `matrixToStr()` trong Makalah C++.

---

## 3. TOÁN TỬ CHUYỂN TRẠNG THÁI

### 3.1. Luật đổ nước

Từ trạng thái hiện tại, hàm `get_next_moves()` sinh ra tất cả nước đi hợp lệ:

1. **Chọn ống nguồn** `i`: bỏ qua nếu rỗng
2. **Xác định màu đỉnh**: `top_color = src_colors[-1]`
3. **Đếm khối liên tiếp** từ đỉnh xuống: `count_top` = số nấc cùng màu nằm liền nhau ở đỉnh
4. **Thử đổ sang ống đích** `j` (j ≠ i):
   - Ống đích chưa đầy (`empty_slots > 0`)
   - Ống đích rỗng HOẶC đỉnh ống đích trùng `top_color`
   - Lượng đổ: `pour_amount = min(count_top, empty_slots)`

### 3.2. Tại sao phải đếm khối liên tiếp?

Water Sort cho phép đổ nhiều nấc cùng màu liên tiếp một lúc. Ví dụ:
- Ống nguồn: `('Đỏ', 'Xanh', 'Xanh', 'Xanh')` → đỉnh Xanh, 3 nấc Xanh liên tiếp
- Ống đích rỗng, capacity=4 → đổ cả 3 nấc Xanh sang

**Bug đã sửa**: Ban đầu dùng `sum(1 for c in src if c == top_color)` → SAI vì đếm cả Xanh nằm dưới Đỏ. Phải dùng vòng lặp `reversed()` có `break`.

### 3.3. Trả về

```python
return next_states, moves

---

## 4. THUẬT TOÁN BFS (Breadth-First Search)

### 4.1. Nguyên lý (Makalah Section II.A)

BFS khám phá không gian trạng thái theo **từng tầng độ sâu**. Mọi node ở độ sâu d được duyệt trước khi xét độ sâu d+1. Đảm bảo tìm lời giải **ngắn nhất** (optimal).

### 4.2. Cấu trúc dữ liệu

| Thành phần | Makalah C++ | Python |
|------------|-------------|--------|
| openList | `queue<State>` | `deque([(state, path)])` |
| closedList | `set<string>` | `visited = set([initial_state])` |

### 4.3. Pseudocode ↔ Code

```python
def solve_bfs(initial_state):
    queue = deque([(initial_state, [])])       # openList: FIFO
    visited = set([initial_state])               # closedList
    state_checked = 0                            # metric

    while queue:
        current_state, path = queue.popleft()    # Lấy ĐẦU hàng đợi
        state_checked += 1

        if current_state.is_goal():              # isSolved()
            return path, state_checked

        next_states, moves = current_state.get_next_moves()  # getPossibleMoves()
        for ns, move in zip(next_states, moves):
            if ns not in visited:                # Chưa có trong closedList
                visited.add(ns)
                queue.append((ns, path + [move]))

    return None, state_checked                   # Không có lời giải
```

### 4.4. Độ phức tạp
- **Thời gian**: O(V + E) với V = số trạng thái, E = số cạnh
- **Không gian**: O(b^d) với b = branching factor, d = depth of solution
- **Tính tối ưu**: ✅ Luôn tìm đường đi ngắn nhất

### 4.5. Chữ ký trả về

Tất cả solver trả về **tuple `(path, state_checked)`**:
- `path`: list các move dạng `(src, dst, amount, color)`, hoặc `None` nếu không giải được
- `state_checked`: số trạng thái đã process (dùng làm metric so sánh hiệu năng)

---

## 5. THUẬT TOÁN DFS (Depth-First Search)

### 5.1. Nguyên lý (Makalah Section II.A)

DFS đi **sâu nhất có thể** theo một nhánh trước khi backtracking. Tiết kiệm bộ nhớ hơn BFS nhưng **không đảm bảo tối ưu**.

### 5.2. Cấu trúc dữ liệu

| Thành phần | Makalah C++ | Python |
|------------|-------------|--------|
| openList | `stack<State>` | `list [(state, path)]` dùng `.pop()` |
| closedList | `set<string>` | `visited = set()` |

### 5.3. Điểm khác biệt so với BFS

Chỉ thay **1 dòng duy nhất**: `queue.popleft()` (FIFO) → `stack.pop()` (LIFO).

```python
def solve_dfs(initial_state):
    stack = [(initial_state, [])]                # openList: LIFO
    visited = set([initial_state])
    state_checked = 0

    while stack:
        current_state, path = stack.pop()        # Lấy ĐỈNH ngăn xếp (khác BFS!)
        state_checked += 1

        if current_state.is_goal():
            return path, state_checked

        next_states, moves = current_state.get_next_moves()
        for ns, move in zip(next_states, moves):
            if ns not in visited:
                visited.add(ns)
                stack.append((ns, path + [move]))

    return None, state_checked
```

### 5.4. Độ phức tạp
- **Thời gian**: O(V + E)
- **Không gian**: O(V) — tốt hơn BFS rất nhiều
- **Tính tối ưu**: ❌ Không đảm bảo đường đi ngắn nhất

---

## 6. THUẬT TOÁN A* VÀ HEURISTIC COLOR BREAKS

### 6.1. Công thức cốt lõi (Makalah Section III.C)

$$f(n) = g(n) + h(n)$$

- $g(n)$: Chi phí thực tế từ start đến node n (= số bước đã đi)
- $h(n)$: Ước lượng chi phí từ n đến goal (**heuristic**)

### 6.3. Cấu trúc dữ liệu A* (Makalah Section III.C)

| Thành phần | Makalah C++ | Python |
|------------|-------------|--------|
| openList | `priority_queue<State>` sorted by f(n) | `heapq` chứa `(f_n, counter, state, path, g)` |
| closedList | `map<string, int>` board→min_g_cost | `dict: matrix_to_str(tubes) → min_g_cost` |
| counter | tie-breaker | `int` tăng dần để tránh so sánh object |

**Lưu ý quan trọng về closedList:**
- BFS/DFS dùng `set` vì chỉ cần biết đã duyệt hay chưa
- A* dùng `dict` mapping string → minimum g_cost, vì có thể tìm lại cùng 1 trạng thái qua đường đi **ngắn hơn**

### 6.4. Pseudocode ↔ Code

```python
def solve_astar(initial_state):
    counter = 0
    current_g = 0
    h = count_color_breaks(initial_state)         # Heuristic ban đầu
    open_list = [(h, counter, initial_state, [], current_g)]  # heapq

    closed_list = {}                               # map<string, int>
    initial_key = matrix_to_str(initial_state.tubes)
    closed_list[initial_key] = current_g
    state_checked = 0

    while open_list:
        f_n, _, current_state, path, current_g = heapq.heappop(open_list)
        state_checked += 1

        if current_state.is_goal():
            return path, state_checked

        next_states, moves = current_state.get_next_moves()

        for ns, move in zip(next_states, moves):
            next_g = current_g + 1                 # Mỗi bước cost = 1
            ns_key = matrix_to_str(ns.tubes)

            # Chỉ expand nếu MỚI hoặc tìm được đường NGẮN HƠN
            if ns_key not in closed_list or next_g < closed_list[ns_key]:
                closed_list[ns_key] = next_g       # Update min g_cost
                h_cost = count_color_breaks(ns)    # Tính heuristic
                f_next = next_g + h_cost           # f(n) = g(n) + h(n)
                counter += 1                       # Tie-breaker
                heapq.heappush(open_list, (f_next, counter, ns, path + [move], next_g))

    return None, state_checked
```

---

## 7. TÍNH CHẤT ADMISSIBLE VÀ CONSISTENT CỦA HEURISTIC

### 7.1. Admissible (Không đánh giá quá cao)

Một heuristic là admissible nếu $h(n) \leq h^*(n)$ với mọi n, trong đó $h^*(n)$ là chi phí thực tế tối ưu từ n đến goal.

**Chứng minh cho count_color_breaks:**
- Mỗi color break trong 1 ống nghĩa là có ít nhất 2 khối màu khác nhau xen kẽ
- Để loại bỏ 1 color break, cần **ít nhất 1 nước đổ** (di chuyển khối trên đỉnh sang ống khác)
- Do đó: số water breaks ≤ số bước tối thiểu cần thiết
- Vậy $h(n) \leq h^*(n)$ → **Admissible** ✅

### 7.2. Consistent (Monotone / Thỏa bất đẳng thức tam giác)

Heuristic consistent nếu $h(n) \leq c(n, n') + h(n')$ với mọi cạnh (n → n').

**Chứng minh:**
- Một nước đổ hợp lệ di chuyển `pour_amount` nấc cùng màu từ đỉnh ống này sang ống khác
- Nước đổ này có thể giải quyết **tối đa 1 color break** (ở biên giới giữa khối đang đổ và phần còn lại)
- Đồng thời có thể tạo ra **tối đa 1 color break mới** (nếu đổ lên ống có màu khác ở đỉnh)
- Net change: $h(n') - h(n) \geq -1$, tức là $h(n) \leq 1 + h(n')$
- Vì $c(n, n') = 1$ → $h(n) \leq c(n,n') + h(n')$ → **Consistent** ✅

### 7.3. Ý nghĩa

Vì heuristic vừa admissible vừa consistent, A* **đảm bảo tìm lời giải tối ưu** (ngắn nhất) giống BFS, nhưng thường duyệt **ít trạng thái hơn** nhờ hướng dẫn của heuristic.

Kết quả thực tế từ test_game.py Test 6:
- BFS: 3 bước, duyệt 6 states
- DFS: 3 bước, duyệt 4 states (may mắn chọn đúng nhánh)
- A*: 3 bước, duyệt 6 states

---

**Tài liệu tham khảo:**
- Paper Makalah IF2211: "A* Algorithm Application for Solving the Water Sort Puzzle"
- Source code: `backend/solver.py`, `backend/state.py`
- Cập nhật lần cuối: 16/10/2026

</new_text>
- $f(n)$: Tổng chi phí ước lượng qua node n

A* luôn expand node có $f(n)$ nhỏ nhất trong openList.

### 6.2. Hàm Heuristic: count_color_breaks (Makalah Section III.D)

Đây là thay đổi **quan trọng nhất** so với phiên bản cũ. Thay vì đếm "số ống chưa hoàn thiện" (không admissible), ta dùng **color breaks**.

**Định nghĩa Color Break:**
Một "color break" xảy ra khi 2 nấc màu liền kề trong cùng 1 ống (duyệt từ đáy lên đỉnh) có màu **khác nhau**.

```python
def count_color_breaks(state):
    h = 0
    for tube in state.tubes:
        colors = [c for c in tube if c != '']
        if not colors:
            continue  # isEmpty -> skip

        prev_color = None
        for current_color in colors:      # Duyệt từ đáy lên đỉnh
            if prev_color is not None and current_color != prev_color:
                h += 1                    # Phát hiện color break!
            prev_color = current_color
    return h
```

**Ví dụ minh họa:**
- Ống `('Đỏ', 'Đỏ', 'Xanh', 'Xanh')`: Đỏ→Đỏ (không break), Đỏ→Xanh (break!), Xanh→Xanh (không break) → h đóng góp = 1
- Ống `('Đỏ', 'Xanh', 'Đỏ')`: Đỏ→Xanh (break!), Xanh→Đỏ (break!) → h đóng góp = 2
- Ống `('Đỏ', 'Đỏ', 'Đỏ', 'Đỏ')`: không có break → h đóng góp = 0 (hoàn thiện)
- Ống rỗng `()`: bỏ qua → h đóng góp = 0

Tổng h = sum(color breaks trên tất cả các ống).

</new_text>
# next_states: list các WaterSortState mới
# moves: list các tuple (src_idx, dst_idx, pour_amount, color)
```

</new_text>