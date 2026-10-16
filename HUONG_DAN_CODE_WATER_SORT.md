# Hướng dẫn Code Water Sort Puzzle Solver

Tài liệu chi tiết giải thích cấu trúc code, thuật toán và các bug đã sửa trong quá trình phát triển.

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Backend - Flask API](#2-backend---flask-api)
3. [State Management](#3-state-management)
4. [Solver Algorithms](#4-solver-algorithms)
5. [Frontend - Giao diện người dùng](#5-frontend---giao-diện-người-dùng)
6. [Các bug đã sửa](#6-các-bug-đã-sửa)
7. [Testing](#7-testing)

---

## 1. Tổng quan kiến trúc

### Mô hình Client-Server

```
┌─────────────┐         HTTP POST          ┌──────────────┐
│  Frontend   │  ───────────────────────>  │   Backend    │
│  (Browser)  │  <───────────────────────  │   (Flask)    │
│             │         JSON Response       │              │
│ - HTML/CSS  │                             │ - app.py     │
│ - script.js │                             │ - solver.py  │
└─────────────┘                             │ - state.py   │
                                            └──────────────┘
```

### Luồng dữ liệu

1. **Người dùng tạo bàn chơi** → Frontend lưu vào `currentTubesState`
2. **Click "GIẢI"** → Frontend gửi POST request tới `/api/solve`
3. **Backend validate** → Kiểm tra luật chơi trong `app.py` và `state.py`
4. **Backend solve** → Gọi thuật toán BFS/DFS/A* trong `solver.py`
5. **Trả về solution_path** → Mảng các bước `[src, dst, amount, color]`
6. **Frontend render** → Hiển thị từng bước với Next/Prev/AutoPlay

### Quy ước dữ liệu cốt lõi

**Backend (Python)**:
- Lưu dạng **compact**: Chỉ giữ màu thực tế, lọc bỏ `''`
- Ví dụ: `('#2ecc71', '#f1c40f')` = đáy xanh, đỉnh vàng
- Index 0 = đáy, index cuối = đỉnh

**Frontend (JavaScript)**:
- Lưu dạng **full**: Giữ nguyên cả ô trống `''`
- Ví dụ: `['#2ecc71', '#f1c40f', '', '']` = 2 màu + 2 trống
- Index 0 = đáy, index cuối = đỉnh
- CSS `flex-direction: column-reverse` để vẽ đúng thứ tự vật lý

---

## 2. Backend - Flask API

### File: `backend/app.py`

#### Khởi tạo Flask Server

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
from state import WaterSortState
from solver import solve_bfs, solve_dfs, solve_astar

app = Flask(__name__)
CORS(app)  # Cho phép Frontend gọi API từ domain/port khác
```

**Giải thích**:
- `Flask(__name__)`: Tạo ứng dụng web
- `CORS(app)`: Kích hoạt Cross-Origin Resource Sharing, cho phép `index.html` (mở từ file system) gọi API tới `localhost:5000`

#### Endpoint POST /api/solve

```python
@app.route('/api/solve', methods=['POST'])
def api_solve():
    data = request.json
    
    # Extract parameters
    tubes_data = data.get('tubes')
    capacity = data.get('capacity', 4)
    algorithm = data.get('algorithm')
```

**Validation Layer 1 - Basic checks**:

```python
# Kiểm tra kiểu dữ liệu và giá trị cơ bản
if not isinstance(tubes_data, list) or len(tubes_data) < 2:
    return jsonify({'status': 'invalid', 'error': 'Bàn chơi phải có ít nhất 2 ống.'}), 400

if not isinstance(capacity, int) or not 1 <= capacity <= 10:
    return jsonify({'status': 'invalid', 'error': 'Sức chứa phải là số nguyên từ 1 đến 10.'}), 400

if algorithm not in ('bfs', 'dfs', 'astar'):
    return jsonify({'status': 'invalid', 'error': 'Thuật toán không hợp lệ.'}), 400
```

**Validation Layer 2 - Tube structure**:

```python
for index, tube in enumerate(tubes_data):
    if not isinstance(tube, list):
        return jsonify({'status': 'invalid', 'error': f'Ống {index + 1} không hợp lệ.'}), 400
    
    seen_empty = False
    filled_count = 0
    
    for color in tube:
        if color == '':
            seen_empty = True
        elif seen_empty:
            # Màu nằm sau ô trống = vi phạm luật xếp từ đáy lên
            return jsonify({'status': 'invalid', 'error': f'Ống {index + 1} có màu nằm sau ô trống.'}), 400
        else:
            filled_count += 1
    
    if filled_count > capacity:
        return jsonify({'status': 'invalid', 'error': f'Ống {index + 1} vượt quá sức chứa.'}), 400
```

**Chuyển đổi dữ liệu**:

```python
# Frontend gửi: [['#2ecc71', '#f1c40f', '', ''], ...]
# Backend cần: (('#2ecc71', '#f1c40f'), ...)

initial_tuples = tuple(
    tuple(c for c in tube if c != '')  # Lọc bỏ ô trống
    for tube in tubes_data
)

initial_state = WaterSortState(initial_tuples, capacity)
```

**Validation Layer 3 - Game rules**:

```python
valid, validation_error = initial_state.validate()
if not valid:
    return jsonify({'status': 'invalid', 'error': validation_error}), 400
```

**Gọi thuật toán**:

```python
if algorithm == 'bfs':
    path = solve_bfs(initial_state)
elif algorithm == 'dfs':
    path = solve_dfs(initial_state)
elif algorithm == 'astar':
    path = solve_astar(initial_state)

if path is None:
    return jsonify({'status': 'no_solution', 'message': 'Khong tim thay loi giai'})

return jsonify({
    'status': 'success',
    'total_steps': len(path),
    'solution_path': path
})
```

**Chạy server**:

```python
if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

- `debug=True`: Tự động reload khi sửa code
- `port=5000`: Lắng nghe tại localhost:5000

---

## 3. State Management

### File: `backend/state.py`

#### Lớp WaterSortState

```python
class WaterSortState:
    def __init__(self, tubes, capacity=4):
        self.tubes = tubes          # Tuple of Tuples
        self.capacity = capacity    # Sức chứa tối đa mỗi ống
```

**Ví dụ**:
```python
state = WaterSortState(
    tubes=(('#2ecc71', '#f1c40f'), ('#f1c40f', '#2ecc71')),
    capacity=4
)
# Ống 1: đáy xanh, đỉnh vàng
# Ống 2: đáy vàng, đỉnh xanh
```

#### Phương thức validate()

Kiểm tra bàn chơi có hợp lệ theo luật Water Sort không:

```python
def validate(self):
    # 1. Kiểm tra sức chứa
    if not isinstance(self.capacity, int) or self.capacity < 1:
        return False, 'Sức chứa phải là số nguyên dương.'
    
    # 2. Kiểm tra số ống
    if not isinstance(self.tubes, tuple) or len(self.tubes) < 2:
        return False, 'Bàn chơi phải có ít nhất 2 ống.'
    
    # 3. Đếm số lần xuất hiện của mỗi màu
    color_counts = {}
    for tube_index, tube in enumerate(self.tubes):
        if len(tube) > self.capacity:
            return False, f'Ống {tube_index + 1} vượt quá sức chứa.'
        
        if any(color == '' for color in tube):
            return False, f'Ống {tube_index + 1} chứa ô trống không hợp lệ.'
        
        for color in tube:
            if not isinstance(color, str) or not color.strip():
                return False, f'Màu trong ống {tube_index + 1} không hợp lệ.'
            color_counts[color] = color_counts.get(color, 0) + 1
    
    # 4. Mỗi màu phải xuất hiện đúng capacity lần
    if not color_counts:
        return False, 'Bàn chơi chưa có màu nào.'
    
    invalid_colors = [color for color, count in color_counts.items()
                      if count != self.capacity]
    if invalid_colors:
        details = ', '.join(
            f"'{color}' có {color_counts[color]}/{self.capacity} nấc"
            for color in invalid_colors
        )
        return False, f'Mỗi màu phải có đúng {self.capacity} nấc: {details}.'
    
    return True, ''
```

**Tại sao mỗi màu phải đúng capacity lần?**

Trong Water Sort Puzzle chuẩn:
- Mỗi màu bắt đầu bị phân tán khắp các ống
- Mục tiêu: gom mỗi màu vào 1 ống riêng
- Nếu màu A có 3 nấc nhưng capacity = 4 → không thể tạo ống thắng (cần 4 nấc cùng màu)
- Nếu màu B có 5 nấc nhưng capacity = 4 → thừa 1 nấc, không thể xếp gọn

#### Phương thức is_goal()

Kiểm tra trạng thái đã giải xong chưa:

```python
def is_goal(self):
    for tube in self.tubes:
        colors = [c for c in tube if c != '']
        
        if len(colors) > 0:
            # Ống hoàn thiện = đầy đủ capacity nấc VÀ cùng 1 màu
            if len(colors) != self.capacity or len(set(colors)) != 1:
                return False
    
    return True
```

**Ví dụ**:
- `('#2ecc71', '#2ecc71', '#2ecc71', '#2ecc71')` → ✅ Hoàn thiện (4 xanh)
- `('#2ecc71', '#2ecc71', '#f1c40f')` → ❌ Chưa hoàn thiện (2 màu khác nhau)
- `('#2ecc71', '#2ecc71')` → ❌ Chưa hoàn thiện (chỉ 2/4 nấc)
- `()` → ✅ Hoàn thiện (ống rỗng)

#### Phương thức get_next_moves()

Sinh ra tất cả nước đi hợp lệ từ trạng thái hiện tại:

```python
def get_next_moves(self):
    next_states = []
    moves = []
    
    # Duyệt từng cặp (ống nguồn i, ống đích j)
    for i, src_tube in enumerate(self.tubes):
        src_colors = [c for c in src_tube if c != '']
        
        if not src_colors:
            continue  # Ống nguồn rỗng
        
        top_color = src_colors[-1]  # Màu trên đỉnh
        
        # Đếm số nấc CÙNG MÀU LIÊN TIẾP từ đỉnh xuống
        count_top = 0
        for color in reversed(src_colors):
            if color != top_color:
                break  # Dừng ngay khi gặp màu khác
            count_top += 1
        
        for j, dst_tube in enumerate(self.tubes):
            if i == j:
                continue  # Không đổ vào chính nó
            
            dst_colors = [c for c in dst_tube if c != '']
            empty_slots = self.capacity - len(dst_colors)
            
            if empty_slots == 0:
                continue  # Ống đích đầy
            
            # Điều kiện đổ: ống đích rỗng HOẶC đỉnh trùng màu
            if not dst_colors or dst_colors[-1] == top_color:
                pour_amount = min(count_top, empty_slots)
                
                # Tạo trạng thái mới
                new_tubes = list(list(t) for t in self.tubes)
                
                for _ in range(pour_amount):
                    new_tubes[i].pop()              # Xóa từ đỉnh nguồn
                    new_tubes[j].append(top_color)  # Thêm vào đỉnh đích
                
                new_state_tuple = tuple(tuple(t) for t in new_tubes)
                next_states.append(WaterSortState(new_state_tuple, self.capacity))
                moves.append((i, j, pour_amount, top_color))
    
    return next_states, moves
```

**Giải thích logic đổ nước**:

1. **Xác định màu đỉnh**: `top_color = src_colors[-1]`
2. **Đếm khối liên tiếp**: Duyệt ngược từ đỉnh, dừng khi gặp màu khác
   - Ví dụ: `('#f1c40f', '#2ecc71', '#2ecc71')` → đỉnh là `#2ecc71`, đếm được 2 nấc
3. **Kiểm tra ống đích**:
   - Còn chỗ trống? `empty_slots > 0`
   - Rỗng hoặc đỉnh trùng màu? `not dst_colors or dst_colors[-1] == top_color`
4. **Tính lượng đổ**: `min(count_top, empty_slots)`
   - Không đổ nhiều hơn số nấc cùng màu ở đỉnh nguồn
   - Không đổ nhiều hơn chỗ trống ở đích
5. **Thực hiện đổ**:
   - `pop()` từ đỉnh nguồn (xóa phần tử cuối)
   - `append()` vào đỉnh đích (thêm vào cuối)

#### Hash và Equality

```python
def __hash__(self):
    return hash(self.tubes)

def __eq__(self, other):
    return self.tubes == other.tubes
```

**Tại sao cần hash?**

Các thuật toán BFS/DFS/A* dùng `visited = set()` để tránh duyệt trùng lặp. Set trong Python yêu cầu phần tử phải hashable. Tuple là hashable, nên ta băm dựa trên `self.tubes`.

---

## 4. Solver Algorithms

### File: `backend/solver.py`

#### a) BFS - Breadth-First Search

```python
from collections import deque

def solve_bfs(initial_state):
    queue = deque([(initial_state, [])])  # (state, path)
    visited = set([initial_state])
    
    while queue:
        current_state, path = queue.popleft()  # FIFO
        
        if current_state.is_goal():
            return path
        
        next_states, moves = current_state.get_next_moves()
        
        for ns, move in zip(next_states, moves):
            if ns not in visited:
                visited.add(ns)
                queue.append((ns, path + [move]))
    
    return None
```

**Đặc điểm**:
- Dùng **Queue (FIFO)**: First In First Out
- Duyệt hết tầng này mới sang tầng tiếp
- **Luôn tìm được lời giải ngắn nhất** (nếu tồn tại)
- Tốn bộ nhớ: lưu toàn bộ frontier

**Ví dụ duyệt**:
```
Tầng 0: [A]
Tầng 1: [B, C, D]
Tầng 2: [E, F, G, H, I]
...
```

#### b) DFS - Depth-First Search

```python
def solve_dfs(initial_state):
    stack = [(initial_state, [])]  # (state, path)
    visited = set([initial_state])
    
    while stack:
        current_state, path = stack.pop()  # LIFO
        
        if current_state.is_goal():
            return path
        
        next_states, moves = current_state.get_next_moves()
        
        for ns, move in zip(next_states, moves):
            if ns not in visited:
                visited.add(ns)
                stack.append((ns, path + [move]))
    
    return None
```

**Đặc điểm**:
- Dùng **Stack (LIFO)**: Last In First Out
- Đi sâu nhất có thể theo 1 nhánh trước khi quay lui
- **Không đảm bảo lời giải ngắn nhất**
- Tiết kiệm bộ nhớ hơn BFS

**Ví dụ duyệt**:
```
A → B → E → (quay lui) → F → (quay lui) → C → G → ...
```

#### c) A* - A-Star Search

```python
import heapq

def heuristic(state):
    """Đếm số ống chưa hoàn thiện."""
    h = 0
    for tube in state.tubes:
        colors = [c for c in tube if c != '']
        if len(colors) > 0 and (len(colors) != state.capacity or len(set(colors)) != 1):
            h += 1
    return h

def solve_astar(initial_state):
    counter = 0  # Tie-breaker khi f(n) bằng nhau
    pq = [(heuristic(initial_state), counter, initial_state, [])]
    visited = set([initial_state])
    
    while pq:
        f, _, current_state, path = heapq.heappop(pq)  # Min-heap
        
        if current_state.is_goal():
            return path
        
        next_states, moves = current_state.get_next_moves()
        
        for ns, move in zip(next_states, moves):
            if ns not in visited:
                visited.add(ns)
                g = len(path) + 1  # Chi phí thực tế
                h = heuristic(ns)   # Ước lượng
                counter += 1
                heapq.heappush(pq, (g + h, counter, ns, path + [move]))
    
    return None
```

**Công thức**: `f(n) = g(n) + h(n)`
- `g(n)`: Chi phí thực tế từ gốc đến n (số bước đã đi)
- `h(n)`: Ước lượng từ n đến đích (heuristic)
- `f(n)`: Tổng chi phí ước lượng

**Heuristic function**:
```python
def heuristic(state):
    h = 0
    for tube in state.tubes:
        colors = [c for c in tube if c != '']
        # Ống chưa hoàn thiện = có màu nhưng chưa đầy hoặc chưa đồng màu
        if len(colors) > 0 and (len(colors) != state.capacity or len(set(colors)) != 1):
            h += 1
    return h
```

**Tại sao heuristic này admissible?**

Heuristic admissible = không bao giờ overestimate (đánh giá quá cao).

- Mỗi ống chưa hoàn thiện cần ít nhất 1 bước để xử lý
- `h(n)` đếm số ống chưa hoàn thiện → luôn ≤ số bước thực tế
- Do đó A* với heuristic này **tìm được lời giải tối ưu**

**Đặc điểm**:
- Dùng **Priority Queue (Min-Heap)**
- Luôn mở rộng trạng thái có `f(n)` nhỏ nhất
- Thông minh hơn BFS/DFS nhờ heuristic
- Thường tìm được lời giải tốt với ít bước duyệt hơn

---

## 5. Frontend - Giao diện người dùng

### File: `frontend/script.js`

#### Biến toàn cục

```javascript
const AVAILABLE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', 
                          '#9b59b6', '#e67e22', '#1abc9c', '#34495e'];

let currentTubesState = [];      // Trạng thái các ống trên UI
let selectedColor = AVAILABLE_COLORS[0];  // Màu đang chọn
let solutionPath = [];           // Lời giải từ Backend
let stepIndex = 0;               // Bước hiện tại
let autoPlayInterval = null;     // Interval ID cho Auto Play
```

#### Khởi tạo trang

```javascript
window.onload = function() {
    renderColorPalette();
    generateEmptyTubes();
};
```

#### Render bảng màu

```javascript
function renderColorPalette() {
    const palette = document.getElementById('colorPalette');
    palette.innerHTML = '';
    const capacity = parseInt(document.getElementById('capacityInput').value) || 0;
    
    AVAILABLE_COLORS.forEach(function(color) {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = color;
        
        if (color === selectedColor) {
            swatch.classList.add('active');
        }
        
        swatch.onclick = function() {
            selectedColor = color;
            document.querySelectorAll('.color-swatch').forEach(function(s) {
                s.classList.remove('active');
            });
            swatch.classList.add('active');
        };
        
        palette.appendChild(swatch);
        
        // Hiển thị số nấc: "2/4"
        const countLabel = document.createElement('small');
        countLabel.className = 'color-count';
        countLabel.dataset.color = color;
        countLabel.innerText = '0/' + capacity;
        palette.appendChild(countLabel);
    });
    
    updateColorCounts();
}
```

#### Đếm số nấc mỗi màu

```javascript
function getColorCounts() {
    const counts = {};
    AVAILABLE_COLORS.forEach(function(color) { counts[color] = 0; });
    
    currentTubesState.forEach(function(tube) {
        tube.forEach(function(color) {
            if (color !== '' && counts[color] !== undefined) {
                counts[color]++;
            }
        });
    });
    
    return counts;
}

function updateColorCounts() {
    const capacity = parseInt(document.getElementById('capacityInput').value) || 0;
    const counts = getColorCounts();
    
    document.querySelectorAll('.color-count').forEach(function(label) {
        const color = label.dataset.color;
        label.innerText = counts[color] + '/' + capacity;
        label.style.color = counts[color] > capacity ? '#e74c3c' : '#34495e';
    });
}
```

**Mục đích**: Ngăn người dùng tô thừa màu. Nếu `counts[color] >= capacity`, hiển thị màu đỏ và chặn click.

#### Tạo ống rỗng

```javascript
function generateEmptyTubes() {
    const numTubes = parseInt(document.getElementById('tubeCountInput').value);
    const capacity = parseInt(document.getElementById('capacityInput').value);
    
    currentTubesState = [];
    for (let i = 0; i < numTubes; i++) {
        currentTubesState.push(new Array(capacity).fill(''));
    }
    
    solutionPath = [];
    stepIndex = 0;
    
    document.getElementById('btnNext').disabled = true;
    document.getElementById('btnPrev').disabled = true;
    
    renderTubes();
    renderColorPalette();  // Cập nhật mẫu số theo sức chứa mới
}
```

#### Render ống nghiệm

```javascript
function renderTubes() {
    const container = document.getElementById('tubesContainer');
    container.innerHTML = '';
    
    currentTubesState.forEach(function(tube, index) {
        const tubeDiv = document.createElement('div');
        tubeDiv.className = 'tube';
        tubeDiv.onclick = function() { handleTubeClick(index); };
        
        const label = document.createElement('div');
        label.className = 'tube-label';
        label.innerText = 'Ống ' + (index + 1);
        tubeDiv.appendChild(label);
        
        const tubeBody = document.createElement('div');
        tubeBody.className = 'tube-body';
        
        tube.forEach(function(color) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            if (color !== '') {
                slot.style.backgroundColor = color;
            }
            tubeBody.appendChild(slot);
        });
        
        tubeDiv.appendChild(tubeBody);
        container.appendChild(tubeDiv);
    });
}
```

**CSS quan trọng**:
```css
.tube-body {
    display: flex;
    flex-direction: column-reverse;  /* Vẽ từ đáy lên đỉnh */
}
```

Với `column-reverse`:
- Mảng `['#2ecc71', '#f1c40f', '', '']`
- Index 0 (`#2ecc71`) vẽ ở **đáy**
- Index 1 (`#f1c40f`) vẽ **trên** index 0
- Index 2, 3 (`''`) vẽ ở **đỉnh** (trống)

#### Xử lý click vào ống

```javascript
function handleTubeClick(tubeIndex) {
    const tube = currentTubesState[tubeIndex];
    const counts = getColorCounts();
    const capacity = parseInt(document.getElementById('capacityInput').value);
    
    // Chặn tô thừa màu
    if ((counts[selectedColor] || 0) >= capacity) {
        alert('Màu này đã đủ ' + capacity + ' nấc trên bàn!');
        return;
    }
    
    // Tìm ô trống đầu tiên (từ đáy lên)
    const emptyIdx = tube.indexOf('');
    
    if (emptyIdx !== -1) {
        tube[emptyIdx] = selectedColor;
        renderTubes();
        updateColorCounts();
    } else {
        alert('Ống này đã đầy!');
    }
}
```

#### Validate trước khi giải

```javascript
function validateUIBeforeSolve() {
    const capacity = parseInt(document.getElementById('capacityInput').value);
    const counts = getColorCounts();
    const errors = [];
    
    Object.keys(counts).forEach(function(color) {
        if (counts[color] > 0 && counts[color] !== capacity) {
            errors.push(color + ': ' + counts[color] + '/' + capacity);
        }
    });
    
    if (errors.length > 0) {
        document.getElementById('stepInfo').innerText =
            'Chưa hợp lệ - mỗi màu phải đủ ' + capacity + ' nấc: ' + errors.join(', ');
        return false;
    }
    return true;
}
```

#### Gọi API giải

```javascript
function solvePuzzle() {
    if (!validateUIBeforeSolve()) return;
    
    const algo = document.getElementById('algoSelect').value;
    
    fetch('http://localhost:5000/api/solve', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            tubes: currentTubesState,
            capacity: parseInt(document.getElementById('capacityInput').value),
            algorithm: algo
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            solutionPath = data.solution_path;
            stepIndex = 0;
            document.getElementById('stepInfo').innerText =
                'Tìm thấy lời giải: ' + data.total_steps + ' bước';
            document.getElementById('btnNext').disabled = false;
        } else if (data.status === 'invalid') {
            document.getElementById('stepInfo').innerText = 'Lỗi: ' + data.error;
        } else if (data.status === 'no_solution') {
            document.getElementById('stepInfo').innerText = 'Không tìm thấy lời giải';
        }
    })
    .catch(error => {
        document.getElementById('stepInfo').innerText = 'Lỗi kết nối Backend';
    });
}
```

#### Next Step - Tiến 1 bước

```javascript
function nextStep() {
    if (stepIndex >= solutionPath.length) return;
    
    const src = solutionPath[stepIndex][0];
    const dst = solutionPath[stepIndex][1];
    const amount = solutionPath[stepIndex][2];
    const color = solutionPath[stepIndex][3];
    
    for (let k = 0; k < amount; k++) {
        // 1. Xóa từ đỉnh nguồn (duyệt ngược)
        for (let i = currentTubesState[src].length - 1; i >= 0; i--) {
            if (currentTubesState[src][i] !== '') {
                currentTubesState[src][i] = '';
                break;
            }
        }
        
        // 2. Thêm vào đỉnh đích (ô trống đầu tiên)
        const dstEmptyIdx = currentTubesState[dst].indexOf('');
        if (dstEmptyIdx !== -1) {
            currentTubesState[dst][dstEmptyIdx] = color;
        }
    }
    
    renderTubes();
    document.getElementById('stepInfo').innerText =
        'Bước ' + (stepIndex + 1) + '/' + solutionPath.length + 
        ': Đổ từ Ống ' + (src+1) + ' sang Ống ' + (dst+1);
    stepIndex++;
    
    document.getElementById('btnPrev').disabled = false;
    if (stepIndex >= solutionPath.length) {
        document.getElementById('stepInfo').innerText += ' - HOÀN THÀNH!';
        document.getElementById('btnNext').disabled = true;
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            document.getElementById('btnAutoPlay').innerText = '▶ Auto Play';
        }
    }
}
```

**Logic đổ nước trong Frontend**:

Backend trả về: `[src, dst, amount, color]`

Frontend mô phỏng:
1. **Xóa từ đỉnh nguồn**: Duyệt ngược từ cuối mảng, tìm phần tử khác `''` đầu tiên → đặt thành `''`
2. **Thêm vào đỉnh đích**: Tìm `indexOf('')` đầu tiên → đặt thành `color`

#### Prev Step - Lùi 1 bước

```javascript
function prevStep() {
    if (stepIndex <= 0) return;
    stepIndex--;
    
    const src = solutionPath[stepIndex][0];
    const dst = solutionPath[stepIndex][1];
    const amount = solutionPath[stepIndex][2];
    const color = solutionPath[stepIndex][3];
    
    for (let k = 0; k < amount; k++) {
        for (let i = currentTubesState[dst].length - 1; i >= 0; i--) {
            if (currentTubesState[dst][i] !== '') {
                currentTubesState[dst][i] = '';
                break;
            }
        }
        const srcEmptyIdx = currentTubesState[src].indexOf('');
        if (srcEmptyIdx !== -1) {
            currentTubesState[src][srcEmptyIdx] = color;
        }
    }
    
    renderTubes();
    document.getElementById('stepInfo').innerText =
        'Bước ' + stepIndex + '/' + solutionPath.length + ': Đã lùi lại.';
    document.getElementById('btnNext').disabled = false;
    if (stepIndex === 0) document.getElementById('btnPrev').disabled = true;
}
```

#### Auto Play

```javascript
function autoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        document.getElementById('btnAutoPlay').innerText = '▶ Auto Play';
        return;
    }
    
    document.getElementById('btnAutoPlay').innerText = '⏸ Pause';
    autoPlayInterval = setInterval(function() {
        if (stepIndex >= solutionPath.length) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            document.getElementById('btnAutoPlay').innerText = '▶ Auto Play';
            return;
        }
        nextStep();
    }, 500);  // 0.5 giây mỗi bước
}
```

---

## 6. Các bug đã sửa

### Bug 1: `.remove()` vs `.pop()` trong Python

**Vấn đề**:
```python
# Sai
new_tubes[i].remove(top_color)  # Xóa phần tử ĐẦU TIÊN khớp

# Đúng
new_tubes[i].pop()  # Xóa phần tử CUỐI (đỉnh ống)
```

**Giải thích**:
- `.remove(color)` xóa phần tử đầu tiên có giá trị `color` (từ đáy lên)
- `.pop()` xóa phần tử cuối (đỉnh ống)
- Water Sort đòi hỏi đổ từ **đỉnh**, nên phải dùng `.pop()`

**Ví dụ**:
```python
tube = ['#f1c40f', '#2ecc71', '#2ecc71']  # đáy vàng, đỉnh xanh

# Sai: .remove('#2ecc71')
tube.remove('#2ecc71')  # → ['#f1c40f', '#2ecc71']  (xóa index 1)

# Đúng: .pop()
tube.pop()  # → ['#f1c40f', '#2ecc71']  (xóa index 2, đỉnh ống)
```

### Bug 2: Đếm khối màu liên tiếp sai

**Vấn đề**:
```python
# Sai
count_top = sum(1 for c in reversed(src_colors) if c == top_color)

# Đúng
count_top = 0
for color in reversed(src_colors):
    if color != top_color:
        break
    count_top += 1
```

**Giải thích**:
- `sum(...)` đếm **tất cả** các nấc cùng màu, kể cả bị kẹp giữa màu khác
- Vòng lặp `for...break` chỉ đếm **khối liên tiếp** từ đỉnh xuống

**Ví dụ**:
```python
src_colors = ['#f1c40f', '#2ecc71', '#f1c40f', '#2ecc71']
top_color = '#2ecc71'

# Sai: sum(...) → count_top = 2 (đếm cả index 1 và 3)
# Đúng: for...break → count_top = 1 (chỉ đếm index 3, dừng tại index 2)
```

### Bug 3: Validation bắt buộc có ống rỗng

**Vấn đề**:
```python
if not self.is_goal() and not any(len(tube) == 0 for tube in self.tubes):
    return False, 'Bàn chưa giải nhưng không có ống rỗng.'
```

**Giải thích**:
- Hiểu sai rằng **bắt buộc** phải có ống rỗng hoàn toàn
- Thực tế chỉ cần: ống đích còn chỗ trống VÀ (rỗng HOẶC đỉnh trùng màu)

**Ví dụ trạng thái hợp lệ không có ống rỗng**:
```
Ống 1: Xanh - Vàng | Ống 2: Vàng - Xanh
Ống 3: Xanh - Xanh | Ống 4: Vàng - Vàng
```
Vẫn giải được trong 4 bước. **Fix**: Xóa điều kiện này.

### Bug 4: Frontend gửi ô trống gây lỗi validation

**Vấn đề**: Frontend gửi `["#3498db", "#3498db", "", ""]`, Backend cũ đếm cả ô trống vào độ dài ống.

**Fix**: Backend lọc bỏ ô trống trước khi tạo `WaterSortState`:
```python
initial_tuples = tuple(
    tuple(c for c in tube if c != '')  # Chỉ giữ màu thực tế
    for tube in tubes_data
)
```

### Bug 5: URL API sai trong Frontend

**Vấn đề**:
```javascript
fetch('http://localhost:5000/solve', ...)  // Sai
fetch('http://localhost:5000/api/solve', ...)  // Đúng
```

**Fix**: Đổi URL thành `/api/solve` khớp với route trong `app.py`.

### Bug 6: Sai key JSON trong response

**Vấn đề**:
```javascript
solutionPath = data.solution;       // Sai
solutionPath = data.solution_path;  // Đúng
```

**Fix**: Đổi thành `data.solution_path` khớp với key trong `jsonify()`.

### Bug 7: Cache trình duyệt

**Vấn đề**: Sửa `script.js` nhưng trình duyệt vẫn dùng bản cũ do cache.

**Fix**: Thêm query parameter version vào `index.html`:
```html
<link rel="stylesheet" href="style.css?v=5">
<script src="script.js?v=5"></script>
```
Mỗi lần sửa code, tăng version number để force reload.

---

## 7. Testing

### File: `backend/test_game.py`

Chạy tests:
```bash
cd backend
python test_game.py
```

### Test Cases

#### Case 1: Luật chơi cơ bản
```python
def test_basic_rules():
    tubes = (('R', 'B'), ('B', 'R'), ())
    state = WaterSortState(tubes, capacity=2)
    assert state.validate()[0] == True
```

#### Case 2: BFS mẫu
```python
def test_bfs_sample():
    tubes = (('R', 'B'), ('B', 'R'), ())
    state = WaterSortState(tubes, capacity=2)
    path = solve_bfs(state)
    assert path is not None
    assert len(path) == 3
```

#### Case 3: Khối màu liên tiếp
```python
def test_consecutive_blocks():
    tubes = (('Y', 'G', 'Y', 'G'), (), ())
    state = WaterSortState(tubes, capacity=4)
    next_states, moves = state.get_next_moves()
    for move in moves:
        assert move[2] == 1  # amount = 1
```

#### Case 4: Trạng thái ảnh chụp
```python
def test_screenshot_state():
    tubes = (
        ('#2ecc71', '#f1c40f'), ('#f1c40f', '#2ecc71'),
        ('#2ecc71', '#2ecc71'), ('#f1c40f', '#f1c40f')
    )
    state = WaterSortState(tubes, capacity=4)
    path = solve_bfs(state)
    assert path is not None and len(path) == 4
```

#### Case 5: Validation
```python
def test_validation():
    # Thiếu màu
    state = WaterSortState((('R',), ('B',), ()), capacity=2)
    valid, error = state.validate()
    assert valid == False and '1/2 nấc' in error
    
    # Dư màu
    state = WaterSortState((('R','R','R'), ('B','B','B'), ()), capacity=2)
    valid, error = state.validate()
    assert valid == False and '3/2 nấc' in error
```

#### Case 6: 3 thuật toán
```python
def test_all_algorithms():
    state = WaterSortState((('R','B'), ('B','R'), ()), capacity=2)
    assert solve_bfs(state) is not None
    assert solve_dfs(state) is not None
    assert solve_astar(state) is not None
    assert len(solve_bfs(state)) == len(solve_astar(state))
```

---

## Tổng kết

### Điểm mạnh

1. **Validation chặt chẽ**: 3 lớp kiểm tra (basic, structure, game rules)
2. **3 thuật toán**: BFS (tối ưu), DFS (nhanh), A* (thông minh)
3. **Giao diện trực quan**: Click để tô màu, xem từng bước giải
4. **Code có comment**: Giải thích chi tiết từng dòng

### Điểm cần cải thiện

1. **Performance**: Với bàn lớn (>6 ống, capacity >4), BFS/DFS có thể chậm
2. **Heuristic**: Có thể cải thiện heuristic cho A* để nhanh hơn
3. **UI/UX**: Thêm animation khi đổ nước, highlight ống đang chọn
4. **Save/Load**: Lưu bàn chơi đang dở, tải lại sau

### Bài học kinh nghiệm

1. **`.pop()` vs `.remove()`**: Hiểu rõ sự khác biệt khi thao tác list
2. **Đếm khối liên tiếp**: Phải dùng vòng lặp có `break`, không dùng `sum()`
3. **Luật chơi**: Đọc kỹ luật, không thêm điều kiện sai (như bắt buộc có ống rỗng)
4. **Cache trình duyệt**: Luôn thêm version number khi deploy frontend
5. **Testing**: Viết test cases cho mọi edge case trước khi fix bug

---

## Tài liệu tham khảo

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Python heapq](https://docs.python.org/3/library/heapq.html)
- [Water Sort Puzzle - Wikipedia](https://en.wikipedia.org/wiki/Water_Sort_Puzzle)
- [A* Search Algorithm](https://en.wikipedia.org/wiki/A*_search_algorithm)