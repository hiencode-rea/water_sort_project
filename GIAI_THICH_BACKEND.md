# GIẢI THÍCH TOÀN BỘ BACKEND - WATER SORT PUZZLE

Tài liệu này giải thích chi tiết từng phần của Backend để bạn trình bày cho người khác hiểu.

---

## MỤC LỤC

1. [Tổng quan kiến trúc Backend](#1-tổng-quan-kiến-trúc-backend)
2. [File state.py - Biểu diễn trạng thái](#2-file-statepy)
3. [File solver.py - 3 thuật toán AI](#3-file-solverpy)
4. [File app.py - Flask API Server](#4-file-apppy)
5. [Luồng dữ liệu End-to-End](#5-luồng-dữ-liệu)
6. [Câu hỏi thường gặp khi bảo vệ](#6-câu-hỏi-bảo-vệ)

---

## 1. TỔNG QUAN KIẾN TRÚC BACKEND

### Backend làm gì?

Backend là phần xử lý logic chạy trên server. Trong project này:
- **Ngôn ngữ**: Python 3.x
- **Framework**: Flask (web server nhẹ)
- **Nhiệm vụ chính**:
  1. Nhận cấu hình bàn chơi từ Frontend qua HTTP POST
  2. Kiểm tra tính hợp lệ (validation)
  3. Chạy thuật toán AI (BFS/DFS/A*) để tìm lời giải
  4. Trả về danh sách các bước đổ nước dưới dạng JSON

### Cấu trúc thư mục

```
backend/
├── app.py          # Flask server, nhận request, trả response
├── state.py        # Class WaterSortState, biểu diễn trạng thái
├── solver.py       # 3 hàm giải: solve_bfs, solve_dfs, solve_astar
└── test_game.py    # Unit tests
```

### Luồng xử lý tổng quát

```
Frontend (JS) → POST /api/solve → app.py → validate → solver.py → BFS/DFS/A*
                                                                          ↓
Frontend hiển thị ← JSON response ← jsonify(solution_path) ←───── tìm thấy goal
```

### Tại sao dùng Tuple thay vì List?

- **Tuple** bất biến (immutable) → hash được → dùng làm key trong `set` (visited set).
- **List** không hash được → không thêm vào `visited = set()` được.
- Quy ước: `(('Red','Blue'), ('Green',), ())` — phần tử CUỐI là đỉnh ống, ĐẦU là đáy.

---

## 2. FILE state.py - BIỂU DIỄN TRẠNG THÁI

File quan trọng nhất, chứa class `WaterSortState` với 5 phương thức chính.

### 2.1. Hàm khởi tạo `__init__`

```python
def __init__(self, tubes, capacity=4):
    self.tubes = tubes          # Tuple of Tuples
    self.capacity = capacity    # Số nấc màu tối đa mỗi ống
```

**Giải thích**:
- `tubes`: ví dụ `(('Red','Blue'), ('Green',), ())` nghĩa là 3 ống:
  - Ống 0: đáy Red, đỉnh Blue (2 nấc)
  - Ống 1: chỉ có Green (1 nấc)
  - Ống 2: rỗng hoàn toàn
- `capacity`: mặc định 4, người dùng tùy chỉnh được.

### 2.2. Hàm kiểm tra hợp lệ `validate()`

Đảm bảo bàn chơi tuân thủ đúng luật Water Sort trước khi đưa vào solver.

**Các bước kiểm tra**:

| Bước | Kiểm tra | Lý do |
|------|----------|-------|
| 1 | `capacity >= 1` | Sức chứa phải nguyên dương |
| 2 | `len(tubes) >= 2` | Ít nhất 2 ống mới chơi được |
| 3 | `len(tube) <= capacity` | Không ống nào vượt sức chứa |
| 4 | Không có chuỗi `''` | Backend dùng dạng compact |
| 5 | Mỗi màu là string | Tránh lỗi kiểu dữ liệu |
| 6 | Mỗi màu xuất hiện đúng `capacity` lần | Luật Water Sort |

**Bug đã sửa**: Trước đây có điều kiện "phải có ít nhất 1 ống rỗng". SAI vì Water Sort vẫn giải được khi không có ống rỗng, miễn là ống đích còn chỗ và đỉnh trùng màu.

**Return**: `(True, '')` nếu hợp lệ, `(False, 'thông báo lỗi')` nếu không.

### 2.3. Hàm kiểm tra đích `is_goal()`

```python
def is_goal(self):
    for tube in self.tubes:
        colors = [c for c in tube if c != '']
        if len(colors) > 0:
            if len(colors) != self.capacity or len(set(colors)) != 1:
                return False
    return True
```

**Logic**: Duyệt từng ống, bỏ qua ống rỗng. Ống có màu phải ĐẦY và CÙNG MÀU. Mọi ống thỏa mãn → return True.

**Ví dụ Goal**: `(('Red','Red','Red','Red'), ('Blue','Blue','Blue','Blue'), ())`


### 2.4. Hàm sinh trạng thái con `get_next_moves()`

Đây là hàm phức tạp nhất, mô phỏng luật đổ nước của Water Sort.

```python
def get_next_moves(self):
    next_states = []
    moves = []
    for i, src_tube in enumerate(self.tubes):
        src_colors = [c for c in src_tube if c != '']
        if not src_colors:
            continue  # Ống rỗng → bỏ qua
        top_color = src_colors[-1]  # Màu trên đỉnh
```

**Bước 1 - Xác định màu đỉnh**: Lấy phần tử cuối cùng (quy ước: cuối = đỉnh ống).

**Bước 2 - Đếm khối màu liên tiếp từ đỉnh xuống**:

```python
        count_top = 0
        for color in reversed(src_colors):
            if color != top_color:
                break  # Gặp màu khác → dừng NGAY
            count_top += 1
```

Khi đổ nước, bạn đổ CẢ KHỐI màu giống nhau trên đỉnh, không phải từng nấc. Ví dụ ống `['Red','Blue','Blue','Blue']` → đỉnh Blue, đếm ngược thấy 3 Blue liên tiếp → `count_top = 3`.

**Bug đã sửa**: Ban đầu dùng `sum(1 for c in reversed(...) if c == top_color)` → SAI vì đếm cả Blue nằm dưới Red. Phải dùng vòng lặp có `break`.

**Bước 3 - Thử đổ sang từng ống đích**:

```python
        for j, dst_tube in enumerate(self.tubes):
            if i == j:
                continue  # Không đổ vào chính mình
            dst_colors = [c for c in dst_tube if c != '']
            empty_slots = self.capacity - len(dst_colors)
            if empty_slots == 0:
                continue  # Ống đích đầy → bỏ qua
```

**Bước 4 - Kiểm tra điều kiện đổ hợp lệ**:

```python
            if not dst_colors or dst_colors[-1] == top_color:
                pour_amount = min(count_top, empty_slots)
```

Chỉ được đổ khi: ống đích RỖNG hoàn toàn, HOẶC đỉnh ống đích TRÙNG MÀU với màu đang đổ. `pour_amount = min(count_top, empty_slots)`: có 3 nấc Blue nhưng ống đích chỉ còn 2 chỗ → chỉ đổ 2.

**Bước 5 - Tạo trạng thái mới**:

```python
                new_tubes = list(list(t) for t in self.tubes)
                for _ in range(pour_amount):
                    new_tubes[i].pop()              # Xóa đỉnh ống nguồn
                    new_tubes[j].append(top_color)  # Thêm lên đỉnh ống đích
                new_state_tuple = tuple(tuple(t) for t in new_tubes)
                next_states.append(WaterSortState(new_state_tuple, self.capacity))
                moves.append((i, j, pour_amount, top_color))
    return next_states, moves
```

Phải chuyển Tuple → List để sửa, rồi List → Tuple lại để hash được. Return 2 list song song: `next_states` (State mới) và `moves` (hành động dạng `(nguồn, đích, số_lượng, màu)`).

### 2.5. Hàm `__hash__` và `__eq__`

```python
def __hash__(self):
    return hash(self.tubes)

def __eq__(self, other):
    return self.tubes == other.tubes
```

BFS/DFS/A* dùng `visited = set()` tránh duyệt trùng. `set` yêu cầu phần tử hashable. Tuple hashable sẵn nên hoạt động. `__eq__` giúp so sánh 2 State khi kiểm tra `if ns not in visited`.