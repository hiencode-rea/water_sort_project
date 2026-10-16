# app.py - File khởi chạy Backend Flask API cho hệ thống Water Sort Puzzle

from flask import Flask, request, jsonify      # Nhập Flask để tạo web server, request để nhận dữ liệu, jsonify để trả JSON
from flask_cors import CORS                     # Nhập CORS để cho phép Frontend (khác domain/port) gọi API
from state import WaterSortState                # Nhập lớp biểu diễn trạng thái từ file state.py
from solver import solve_bfs, solve_dfs, solve_astar  # Nhập 3 hàm giải thuật toán từ file solver.py

app = Flask(__name__)   # Khởi tạo ứng dụng Flask
CORS(app)               # Kích hoạt CORS cho toàn bộ các route của ứng dụng, giúp Frontend gọi API không bị chặn

@app.route('/api/solve', methods=['POST'])      # Định nghĩa endpoint /api/solve, chỉ chấp nhận phương thức POST
def api_solve():
    """Hàm xử lý khi Frontend gửi yêu cầu giải bài toán."""
    
    # Lấy dữ liệu JSON từ body của request do Frontend gửi lên
    data = request.json
    if not isinstance(data, dict):
        return jsonify({'status': 'invalid', 'error': 'Dữ liệu JSON không hợp lệ.'}), 400
    
    # Trích xuất mảng 2 chiều chứa cấu hình màu sắc của các ống nghiệm
    tubes_data = data.get('tubes')
    
    # Trích xuất số nấc màu tối đa mỗi ống (mặc định là 4 nếu người dùng không nhập)
    capacity = data.get('capacity', 4)
    
    # Trích xuất tên thuật toán người dùng chọn ('bfs', 'dfs', hoặc 'astar')
    algorithm = data.get('algorithm')

    if not isinstance(tubes_data, list) or len(tubes_data) < 2:
        return jsonify({'status': 'invalid', 'error': 'Bàn chơi phải có ít nhất 2 ống.'}), 400
    if not isinstance(capacity, int) or isinstance(capacity, bool) or not 1 <= capacity <= 10:
        return jsonify({'status': 'invalid', 'error': 'Sức chứa phải là số nguyên từ 1 đến 10.'}), 400
    if algorithm not in ('bfs', 'dfs', 'astar'):
        return jsonify({'status': 'invalid', 'error': 'Thuật toán không hợp lệ.'}), 400

    for index, tube in enumerate(tubes_data):
        if not isinstance(tube, list):
            return jsonify({'status': 'invalid', 'error': f'Ống {index + 1} vượt quá sức chứa hoặc không hợp lệ.'}), 400
        # Không cho phép màu xuất hiện sau ô trống: trạng thái phải được xếp từ đáy lên.
        seen_empty = False
        filled_count = 0
        for color in tube:
            if color == '':
                seen_empty = True
            elif seen_empty:
                return jsonify({'status': 'invalid', 'error': f'Ống {index + 1} có màu nằm sau ô trống.'}), 400
            else:
                filled_count += 1
        if filled_count > capacity:
            return jsonify({'status': 'invalid', 'error': f'Ống {index + 1} vượt quá sức chứa.'}), 400
    
    # Chuyển đổi dữ liệu từ List of Lists (JSON) sang Tuple of Tuples (để hash được trong Python)
    # Lọc bỏ các chuỗi rỗng '' (chỗ trống) do Frontend gửi lên, chỉ giữ lại các nấc màu thực tế
    # Quy ước: phần tử CUỐI của tuple là ĐỈNH ống (miệng ống), phần tử ĐẦU là ĐÁY ống
    initial_tuples = tuple(tuple(c for c in tube if c != '') for tube in tubes_data)
    
    # Khởi tạo đối tượng trạng thái ban đầu từ cấu hình vừa chuyển đổi
    initial_state = WaterSortState(initial_tuples, capacity)

    valid, validation_error = initial_state.validate()
    if not valid:
        return jsonify({'status': 'invalid', 'error': validation_error}), 400
    
    # Dựa vào tên thuật toán người dùng chọn để gọi hàm giải tương ứng
    # Makalah: solver returns (path, state_checked)
    if algorithm == 'bfs':
        path, state_checked = solve_bfs(initial_state)
    elif algorithm == 'dfs':
        path, state_checked = solve_dfs(initial_state)
    elif algorithm == 'astar':
        path, state_checked = solve_astar(initial_state)
    else:
        return jsonify({'status': 'invalid', 'error': 'Thuật toán không hợp lệ.'}), 400
        
    # Kiểm tra kết quả: nếu path là None tức là thuật toán đã duyệt hết mà không tìm thấy Goal
    if path is None:
        return jsonify({
            'status': 'no_solution',
            'message': 'Khong tim thay loi giai',
            'states_checked': state_checked
        })
        
    # Nếu tìm thấy lời giải -> đóng gói kết quả thành JSON và trả về cho Frontend
    return jsonify({
        'status': 'success',
        'total_steps': len(path),
        'solution_path': path,
        'states_checked': state_checked,
        'algorithm': algorithm
    })

if __name__ == '__main__':
    # Chạy máy chủ Flask ở chế độ debug (tự động reload khi sửa code), lắng nghe trên cổng 5000
    app.run(debug=True, port=5000)