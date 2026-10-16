# Water Sort Puzzle Solver

Hệ thống web giải trò chơi Water Sort Puzzle sử dụng Flask (Backend) và HTML/JS/CSS (Frontend), tích hợp 3 thuật toán tìm kiếm: BFS, DFS và A*.

## Tính năng

- **Giao diện trực quan**: Tạo bàn chơi bằng cách click chọn màu và ống nghiệm
- **3 thuật toán giải**: BFS (tối ưu), DFS (nhanh), A* (thông minh với heuristic)
- **Validation chặt chẽ**: Kiểm tra luật chơi trước khi giải
- **Auto Play**: Tự động phát lại quá trình giải từng bước
- **Next/Prev Step**: Xem lại từng bước hoặc hoàn tác

## Cấu trúc Project

```
water_sort_project/
├── backend/
│   ├── app.py          # Flask API server
│   ├── solver.py       # 3 thuật toán BFS, DFS, A*
│   ├── state.py        # Lớp biểu diễn trạng thái bàn chơi
│   └── test_game.py    # Unit tests
├── frontend/
│   ├── index.html      # Giao diện chính
│   ├── script.js       # Logic Frontend
│   └── style.css       # Styling
├── requirements.txt    # Dependencies Python
├── README.md           # File này
└── HUONG_DAN_CODE_WATER_SORT.md  # Tài liệu chi tiết
```

## Cài đặt

### 1. Cài đặt Python dependencies

```bash
cd backend
pip install -r ../requirements.txt
```

### 2. Khởi động Backend

```bash
cd backend
python app.py
```

Server sẽ chạy tại `http://localhost:5000`

### 3. Mở Frontend

Mở file `frontend/index.html` trong trình duyệt, hoặc dùng Live Server extension trong VS Code.

**Lưu ý**: Nhấn `Ctrl + F5` để hard refresh nếu giao diện không cập nhật.

## Cách sử dụng

### Tạo bàn chơi

1. Chọn số ống nghiệm (mặc định 4)
2. Chọn sức chứa mỗi ống (mặc định 4)
3. Click "Tạo ống rỗng"
4. Chọn màu từ bảng màu bên dưới
5. Click vào ống để tô màu
6. Mỗi màu phải xuất hiện đúng `capacity` lần trên toàn bàn

### Giải bài toán

1. Chọn thuật toán: BFS, DFS hoặc A*
2. Click "GIẢI"
3. Xem kết quả:
   - **Success**: Hiển thị số bước và danh sách các bước đổ nước
   - **Invalid**: Bàn chơi không hợp lệ (thiếu/dư màu, vượt sức chứa)
   - **No Solution**: Không tìm thấy lời giải

### Xem quá trình giải

- **Next Step**: Tiến 1 bước
- **Prev Step**: Lùi 1 bước
- **Auto Play**: Tự động phát toàn bộ quá trình (0.5s/bước)

## Luật chơi Water Sort Puzzle

1. Mỗi ống có sức chứa tối đa `capacity` nấc màu
2. Chỉ được đổ nước từ đỉnh ống nguồn sang đỉnh ống đích
3. Ống đích phải còn chỗ trống
4. Ống đích phải rỗng HOẶC màu trên đỉnh trùng với màu đang đổ
5. Mục tiêu: Mỗi ống chỉ chứa 1 màu duy nhất và đầy đủ `capacity` nấc

## API Endpoint

### POST /api/solve

**Request Body**:
```json
{
  "tubes": [
    ["#2ecc71", "#f1c40f", "", ""],
    ["#f1c40f", "#2ecc71", "", ""],
    ["#2ecc71", "#2ecc71", "", ""],
    ["#f1c40f", "#f1c40f", "", ""]
  ],
  "capacity": 4,
  "algorithm": "bfs"
}
```

**Response Success**:
```json
{
  "status": "success",
  "total_steps": 4,
  "solution_path": [
    [0, 3, 1, "#f1c40f"],
    [0, 1, 1, "#2ecc71"],
    [1, 2, 2, "#2ecc71"],
    [1, 3, 1, "#f1c40f"]
  ]
}
```

**Response Invalid**:
```json
{
  "status": "invalid",
  "error": "Mỗi màu phải có đúng 4 nấc: '#2ecc71' có 3/4 nấc."
}
```

**Response No Solution**:
```json
{
  "status": "no_solution",
  "message": "Khong tim thay loi giai"
}
```

## Thuật toán

### BFS (Breadth-First Search)
- Duyệt theo chiều rộng, tầng này xong mới sang tầng tiếp
- **Ưu điểm**: Luôn tìm được lời giải ngắn nhất
- **Nhược điểm**: Tốn bộ nhớ

### DFS (Depth-First Search)
- Duyệt theo chiều sâu, đi sâu nhất có thể trước khi quay lui
- **Ưu điểm**: Tiết kiệm bộ nhớ
- **Nhược điểm**: Không đảm bảo lời giải ngắn nhất

### A* (A-Star)
- Kết hợp chi phí thực tế g(n) và hàm ước lượng h(n)
- Heuristic: Đếm số ống chưa hoàn thiện
- **Ưu điểm**: Thông minh, thường tìm được lời giải tốt
- **Nhược điểm**: Phức tạp hơn

## Validation

Backend kiểm tra các điều kiện sau trước khi giải:

1. ✅ Bàn chơi có ít nhất 2 ống
2. ✅ Sức chứa từ 1-10
3. ✅ Mỗi ống không vượt quá sức chứa
4. ✅ Không có màu nằm sau ô trống (phải xếp từ đáy lên)
5. ✅ Mỗi màu xuất hiện đúng `capacity` lần
6. ✅ Thuật toán hợp lệ (bfs/dfs/astar)

## Chạy Tests

```bash
cd backend
python test_game.py
```

Tests bao gồm 6 cases:
- Luật chơi cơ bản
- BFS mẫu
- Khối màu liên tiếp
- Trạng thái ảnh chụp
- Validation
- 3 thuật toán

## Công nghệ

- **Backend**: Python 3.x, Flask, Flask-CORS
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Thuật toán**: BFS, DFS, A* với heapq

## Tác giả

Project đồ án Trí tuệ Nhân tạo - Water Sort Puzzle Solver

## License

MIT