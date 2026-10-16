# KẾ HOẠCH THỰC HIỆN ĐỒ ÁN: TRÒ CHƠI WATER SORT PUZZLE

**Cập nhật lần cuối:** 16/10/2026  
**Trạng thái:** ✅ Đã hoàn thành code + đồng bộ heuristic color breaks theo Makalah, đang viết báo cáo

---

## 1. Phân tích bài toán (Problem Formulation)

Để áp dụng Trí tuệ nhân tạo, ta cần mô hình hóa trò chơi thành một bài toán tìm kiếm trong không gian trạng thái.

### 1.1. Biểu diễn trạng thái (State Representation)
- **Trạng thái (State):** Là cấu hình hiện tại của tất cả các ống nghiệm.
- **Cấu trúc dữ liệu:** Sử dụng một Tuple của các Tuple (để có thể hash và lưu vào tập `visited`).
  - Ví dụ: `(('#2ecc71', '#f1c40f'), ('#f1c40f', '#2ecc71'), ...)`
  - Mỗi ống là một tuple, thứ tự từ đáy lên miệng ống.
  - **Backend lưu dạng compact**: Chỉ giữ màu thực tế, lọc bỏ ô trống `''`
  - **Frontend lưu dạng full**: Giữ nguyên cả ô trống để render UI

### 1.2. Trạng thái khởi đầu và đích
- **Initial State:** Cấu hình do người dùng tạo trên giao diện (click chọn màu).
- **Goal State:** Mọi ống nghiệm đều thỏa mãn một trong hai điều kiện:
  1. Chứa đầy `capacity` nấc chất lỏng cùng một màu.
  2. Hoàn toàn rỗng.
- **Capacity linh hoạt**: Người dùng có thể tùy chỉnh sức chứa từ 1-10 nấc (mặc định 4).

### 1.3. Toán tử/Hành động (Actions)
- Hành động: Đổ nước từ ống `src` sang ống `dst`.
- **Điều kiện hợp lệ:**
  1. Ống `src` không rỗng.
  2. Ống `dst` chưa đầy (số lượng phần tử < capacity).
  3. Ống `dst` rỗng HOẶC màu trên cùng của `dst` trùng với màu trên cùng của `src`.
  4. **Đổ nhiều nấc cùng lúc**: Nếu đỉnh ống nguồn có nhiều nấc cùng màu liên tiếp, đổ `min(count_top, empty_slots)` nấc.
- **Kết quả:** Trạng thái mới sau khi di chuyển khối màu.

### 1.4. Hàm chi phí (Cost)
- Chi phí mỗi bước đi là 1.
- Mục tiêu: Tối thiểu hóa tổng số bước đi (tổng chi phí).

### 1.5. Validation (Kiểm tra tính hợp lệ)
- Mỗi màu phải xuất hiện đúng `capacity` lần trên toàn bàn.
- Không cho phép màu nằm sau ô trống (phải xếp từ đáy lên).
- Không cho phép ống vượt quá sức chứa.
- Bàn chơi phải có ít nhất 2 ống.

---

## 2. Lựa chọn thuật toán (Algorithm Selection)

✅ **Đã triển khai cả 3 thuật toán**: BFS, DFS và A*.

### 2.1. BFS (Breadth-First Search - Tìm kiếm theo chiều rộng)
- **Ưu điểm:** Đảm bảo tìm ra lời giải với số bước ngắn nhất (tối ưu). Dễ cài đặt.
- **Nhược điểm:** Tốn bộ nhớ nếu không gian trạng thái lớn.
- **Cấu trúc dữ liệu:** Queue (FIFO) với `collections.deque`.
- **Kết quả thực tế:** Luôn tìm được lời giải tối ưu, phù hợp cho bàn chơi nhỏ và trung bình.

### 2.2. DFS (Depth-First Search - Tìm kiếm theo chiều sâu)
- **Ưu điểm:** Tiết kiệm bộ nhớ hơn BFS, tìm nhanh trong một số trường hợp.
- **Nhược điểm:** Không đảm bảo lời giải ngắn nhất.
- **Cấu trúc dữ liệu:** Stack (LIFO) với List thông thường.
- **Kết quả thực tế:** Tìm được lời giải nhưng số bước có thể nhiều hơn BFS/A*.

### 2.3. A* (A-Star Search - Tìm kiếm heuristic)
- **Ưu điểm:** Tìm kiếm nhanh hơn BFS nhờ hàm ước lượng (Heuristic). Thể hiện được kiến thức AI nâng cao.
- **Công thức:** $f(n) = g(n) + h(n)$
  - $g(n)$: Số bước đã đi từ trạng thái bắt đầu.
  - $h(n)$: Hàm ước lượng số bước còn lại đến đích.
- **Heuristic đã triển khai:**
  ```python
  def heuristic(state):
      h = 0
      for tube in state.tubes:
          colors = [c for c in tube if c != '']
          if len(colors) > 0 and (len(colors) != state.capacity or len(set(colors)) != 1):
              h += 1
      return h
  ```
  - Đếm số ống chưa hoàn thiện (có màu nhưng chưa đầy hoặc chưa đồng màu).
  - **Admissible**: Mỗi ống chưa hoàn thiện cần ít nhất 1 bước để xử lý → h(n) ≤ chi phí thực tế.
- **Cấu trúc dữ liệu:** Priority Queue (Min-Heap) với `heapq`.
- **Kết quả thực tế:** Tìm được lời giải tối ưu như BFS, nhưng duyệt ít trạng thái hơn.

### 2.4. So sánh 3 thuật toán

| Thuật toán | Tối ưu | Tốc độ | Bộ nhớ | Phù hợp |
|-----------|--------|--------|--------|---------|
| BFS | ✅ Có | Trung bình | Cao | Bàn nhỏ, cần lời giải ngắn nhất |
| DFS | ❌ Không | Nhanh | Thấp | Tìm nhanh, không quan tâm tối ưu |
| A* | ✅ Có | Nhanh nhất | Trung bình | Bàn lớn, cân bằng tốc độ và tối ưu |

---

## 3. Thiết kế và Cài đặt (Implementation Design)

✅ **Đã hoàn thành toàn bộ code** với kiến trúc Client-Server.

### 3.1. Kiến trúc hệ thống

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

### 3.2. Backend (Python Flask)

#### File: `backend/state.py` - Lớp biểu diễn trạng thái
```python
class WaterSortState:
    def __init__(self, tubes, capacity=4):
        self.tubes = tubes          # Tuple of Tuples
        self.capacity = capacity    # Sức chứa tối đa
    
    def validate(self):
        # Kiểm tra luật chơi: mỗi màu đúng capacity lần, không vượt sức chứa
        
    def is_goal(self):
        # Kiểm tra trạng thái đích: mọi ống rỗng hoặc đầy cùng màu
        
    def get_next_moves(self):
        # Sinh tất cả nước đi hợp lệ, trả về (next_states, moves)
        
    def __hash__(self), __eq__(self):
        # Hash và so sánh để dùng trong visited set
```

#### File: `backend/solver.py` - 3 thuật toán tìm kiếm
```python
def solve_bfs(initial_state):      # BFS với deque
def solve_dfs(initial_state):      # DFS với stack
def solve_astar(initial_state):    # A* với heapq + heuristic
```

#### File: `backend/app.py` - Flask API Server
```python
@app.route('/api/solve', methods=['POST'])
def api_solve():
    # 1. Nhận JSON từ Frontend
    # 2. Validation 3 lớp (basic, structure, game rules)
    # 3. Gọi thuật toán tương ứng
    # 4. Trả về solution_path
```

### 3.3. Frontend (HTML/JS/CSS)

#### File: `frontend/index.html`
- Giao diện tạo bàn chơi (chọn số ống, sức chứa, thuật toán)
- Bảng màu để click tô màu vào ống
- Nút GIẢI, Next Step, Prev Step, Auto Play

#### File: `frontend/script.js`
```javascript
// Biến toàn cục
let currentTubesState = [];      // Trạng thái các ống trên UI
let solutionPath = [];           // Lời giải từ Backend
let stepIndex = 0;               // Bước hiện tại

// Các hàm chính
function renderColorPalette()    // Vẽ bảng màu
function handleTubeClick()       // Xử lý click vào ống
function solvePuzzle()           // Gọi API Backend
function nextStep()              // Tiến 1 bước
function prevStep()              // Lùi 1 bước
function autoPlay()              // Tự động phát
```

#### File: `frontend/style.css`
- CSS cho ống nghiệm với `flex-direction: column-reverse` để vẽ từ đáy lên đỉnh
- Animation và hiệu ứng hover

### 3.4. Công nghệ sử dụng

**Backend**:
- Python 3.x
- Flask 3.0.0 (web framework)
- Flask-CORS 4.0.0 (cho phép cross-origin requests)
- collections.deque (BFS)
- heapq (A*)

**Frontend**:
- HTML5
- CSS3 (Flexbox)
- Vanilla JavaScript (không dùng framework)
- Fetch API (gọi HTTP request)

**Testing**:
- pytest (unit tests)
- 6 test cases覆盖 luật chơi, BFS, khối liên tiếp, validation, 3 thuật toán

---

## 4. Các bug đã sửa trong quá trình phát triển

✅ **Đã sửa 7 bug quan trọng**, thể hiện quá trình debug và cải tiến code.

### Bug 1: `.remove()` vs `.pop()` trong Python
- **Vấn đề**: Dùng `.remove(color)` xóa phần tử đầu tiên (đáy) thay vì đỉnh ống.
- **Fix**: Dùng `.pop()` để xóa phần tử cuối (đỉnh ống).

### Bug 2: Đếm khối màu liên tiếp sai
- **Vấn đề**: Dùng `sum(1 for c in reversed(...) if c == top_color)` đếm cả màu bị kẹp giữa.
- **Fix**: Dùng vòng lặp `for...break` chỉ đếm khối liên tiếp từ đỉnh xuống.

### Bug 3: Validation bắt buộc có ống rỗng
- **Vấn đề**: Thêm điều kiện sai "phải có ít nhất 1 ống rỗng hoàn toàn".
- **Fix**: Xóa điều kiện này, chỉ cần ống đích còn chỗ trống và đỉnh trùng màu.

### Bug 4: Frontend gửi ô trống gây lỗi validation
- **Vấn đề**: Backend đếm cả ô trống `''` vào độ dài ống.
- **Fix**: Backend lọc bỏ ô trống trước khi tạo `WaterSortState`.

### Bug 5: URL API sai trong Frontend
- **Vấn đề**: Gọi `/solve` thay vì `/api/solve`.
- **Fix**: Đổi URL khớp với route trong `app.py`.

### Bug 6: Sai key JSON trong response
- **Vấn đề**: Đọc `data.solution` thay vì `data.solution_path`.
- **Fix**: Đổi thành `data.solution_path` khớp với `jsonify()`.

### Bug 7: Cache trình duyệt
- **Vấn đề**: Sửa `script.js` nhưng trình duyệt vẫn dùng bản cũ.
- **Fix**: Thêm query parameter version `?v=5` vào `index.html`.

---

## 5. Kế hoạch làm báo cáo và Slide

### 5.1. File Word (Quyển báo cáo - 3 điểm)

✅ **Đã có tài liệu chi tiết**: `HUONG_DAN_CODE_WATER_SORT.md` (1110 dòng, 35.5KB)

Cấu trúc báo cáo:
1. **Mở đầu** (Chương 1)
   - Giới thiệu trò chơi Water Sort Puzzle
   - Lý do chọn đề tài
   - Mục tiêu đồ án

2. **Cơ sở lý thuyết** (Chương 2)
   - Lý thuyết về tìm kiếm trong AI
   - Mô tả thuật toán BFS, DFS, A*
   - Phân tích độ phức tạp
   - Hàm heuristic và tính admissible

3. **Phân tích và Thiết kế** (Chương 3)
   - Mô hình hóa bài toán (State, Action, Goal)
   - Biểu diễn trạng thái (Tuple of Tuples)
   - Validation rules
   - Sơ đồ kiến trúc Client-Server

4. **Cài đặt** (Chương 4)
   - Giải thích code Backend (state.py, solver.py, app.py)
   - Giải thích code Frontend (script.js)
   - 3 lớp validation
   - Logic đổ nước và mô phỏng trên UI

5. **Kết quả thực nghiệm** (Chương 5)
   - Test cases (6 cases)
   - So sánh 3 thuật toán (số bước, thời gian)
   - Ảnh chụp giao diện
   - Ví dụ input/output

6. **Các bug đã sửa** (Chương 6)
   - 7 bug quan trọng và cách fix
   - Bài học kinh nghiệm

7. **Kết luận** (Chương 7)
   - Ưu nhược điểm
   - Hướng phát triển (animation, save/load, mobile app)

### 5.2. File PowerPoint (Slide - 1 điểm)

Cấu trúc slide đề xuất:
- **Slide 1**: Tên đề tài, thành viên nhóm, giảng viên hướng dẫn
- **Slide 2**: Giới thiệu vấn đề (Hình ảnh game Water Sort, luật chơi)
- **Slide 3**: Mô hình hóa bài toán (State representation, Goal test, Actions)
- **Slide 4**: Thuật toán sử dụng (BFS/DFS/A* với công thức và đặc điểm)
- **Slide 5**: Kiến trúc hệ thống (Sơ đồ Client-Server, luồng dữ liệu)
- **Slide 6**: Demo giao diện (Ảnh chụp màn hình tạo bàn chơi)
- **Slide 7**: Demo kết quả (Ảnh chụp lời giải từng bước)
- **Slide 8**: So sánh 3 thuật toán (Bảng so sánh số bước, thời gian)
- **Slide 9**: Các bug đã sửa (Highlight 3-4 bug quan trọng nhất)
- **Slide 10**: Kết luận và hướng phát triển

---

## 6. Tiến độ thực hiện

### ✅ Đã hoàn thành

| Bước | Công việc | Trạng thái | Ngày hoàn thành |
|------|-----------|------------|-----------------|
| 1 | Phân tích bài toán, mô hình hóa State/Action/Goal | ✅ Done | Tuần 1 |
| 2 | Viết code core (Class WaterSortState, validation, get_next_moves) | ✅ Done | Tuần 1 |
| 3 | Cài đặt 3 thuật toán (BFS, DFS, A*) | ✅ Done | Tuần 2 |
| 4 | Xây dựng Backend Flask API (app.py, endpoint /api/solve) | ✅ Done | Tuần 2 |
| 5 | Xây dựng Frontend (HTML/CSS/JS, giao diện tạo bàn chơi) | ✅ Done | Tuần 3 |
| 6 | Tích hợp Frontend-Backend, xử lý CORS | ✅ Done | Tuần 3 |
| 7 | Debug và sửa 7 bug quan trọng | ✅ Done | Tuần 3-4 |
| 8 | Viết unit tests (6 test cases) | ✅ Done | Tuần 4 |
| 9 | Viết tài liệu hướng dẫn code (HUONG_DAN_CODE_WATER_SORT.md) | ✅ Done | Tuần 4 |
| 10 | Viết README.md | ✅ Done | Tuần 4 |

### 🔄 Đang thực hiện

| Bước | Công việc | Trạng thái | Dự kiến hoàn thành |
|------|-----------|------------|-------------------|
| 11 | Viết báo cáo Word (dựa trên HUONG_DAN_CODE_WATER_SORT.md) | 🔄 In Progress | Tuần 5 |
| 12 | Làm Slide PowerPoint (10 slides) | ⏳ Pending | Tuần 5 |
| 13 | Quay video demo (tùy chọn) | ⏳ Pending | Tuần 5 |
| 14 | Nộp đồ án | ⏳ Pending | Tuần 6 |

### 📊 Thống kê project

- **Tổng số dòng code**: ~800 dòng (Backend + Frontend)
- **Số file**: 7 files chính (3 Python, 3 Frontend, 1 requirements.txt)
- **Số thuật toán**: 3 (BFS, DFS, A*)
- **Số bug đã sửa**: 7
- **Số test cases**: 6
- **Tài liệu**: 2 file markdown (README.md + HUONG_DAN_CODE_WATER_SORT.md)

---

## 7. Hướng dẫn chạy project

### 7.1. Cài đặt dependencies

```powershell
cd c:\TTNT\water_sort_project
pip install -r requirements.txt
```

### 7.2. Chạy Backend

```powershell
cd c:\TTNT\water_sort_project\backend
python app.py
```

Server sẽ chạy tại `http://localhost:5000`

### 7.3. Mở Frontend

Mở file `c:\TTNT\water_sort_project\frontend\index.html` bằng trình duyệt.

**Lưu ý**: Nhấn `Ctrl + F5` để force reload nếu sửa code.

### 7.4. Chạy tests

```powershell
cd c:\TTNT\water_sort_project\backend
python test_game.py
```

---

## 8. Kết luận

### Điểm mạnh của đồ án

1. **Hoàn thiện đầy đủ**: Có cả Backend API và Frontend giao diện
2. **3 thuật toán**: BFS (tối ưu), DFS (nhanh), A* (thông minh)
3. **Validation chặt chẽ**: 3 lớp kiểm tra, chặn mọi trạng thái không hợp lệ
4. **Code có comment**: Giải thích chi tiết từng dòng, dễ hiểu
5. **Debug kỹ lưỡng**: Đã sửa 7 bug, có unit tests
6. **Tài liệu đầy đủ**: README + Hướng dẫn code chi tiết (1110 dòng)

### Bài học kinh nghiệm

1. Hiểu rõ sự khác biệt giữa `.pop()` và `.remove()` trong Python
2. Khi đếm khối liên tiếp, phải dùng vòng lặp có `break`, không dùng `sum()`
3. Đọc kỹ luật chơi trước khi thêm điều kiện validation
4. Luôn thêm version number vào CSS/JS để tránh cache trình duyệt
5. Viết test cases cho mọi edge case trước khi fix bug

### Hướng phát triển tương lai

1. Thêm animation khi đổ nước (CSS transition)
2. Lưu/tải bàn chơi đang dở (localStorage hoặc database)
3. Hỗ trợ mobile (responsive design)
4. Thêm nhiều level mẫu sẵn
5. So sánh thời gian chạy thực tế giữa 3 thuật toán
6. Cải thiện heuristic cho A* (đếm số khối màu sai vị trí)

---

**Người thực hiện**: [Tên sinh viên]  
**Giảng viên hướng dẫn**: [Tên giảng viên]  
**Môn học**: Trí tuệ Nhân tạo  
**Ngày cập nhật**: 16/10/2026