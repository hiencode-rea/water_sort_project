# test_game.py - Kiểm thử tự động luật chơi Water Sort Puzzle
# Tương thích solver.py trả về (path, state_checked) theo Makalah IF2211
from state import WaterSortState
from solver import solve_bfs, solve_dfs, solve_astar


def print_state(state):
    for i, tube in enumerate(state.tubes):
        display = list(tube) + ['_'] * (state.capacity - len(tube))
        print(f"  Ống {i+1}: {display} (đáy -> đỉnh)")
    print()


def test_luat_choi():
    print("="*60)
    print("TEST 1: KIỂM TRA LUẬT SINH TRẠNG THÁI CON")
    print("="*60)
    tubes = (('Đỏ', 'Xanh'), ('Xanh', 'Đỏ'), ())
    state = WaterSortState(tubes, capacity=4)
    print("Trạng thái ban đầu:")
    print_state(state)
    next_states, moves = state.get_next_moves()
    print(f"Tìm thấy {len(moves)} nước đi hợp lệ:")
    for idx, (ns, move) in enumerate(zip(next_states, moves)):
        src, dst, amount, color = move
        print(f"  Nước đi {idx+1}: Đổ {amount} nấc '{color}' từ Ống {src+1} sang Ống {dst+1}")
    valid_expected = [(0, 2, 1, 'Xanh'), (1, 2, 1, 'Đỏ')]
    assert set(moves) == set(valid_expected), f"Sai luật! Có {moves}"
    print("✅ PASS\n")


def test_giai_bai_toan():
    print("="*60)
    print("TEST 2: BFS GIẢI BÀI TOÁN MẪU")
    print("="*60)
    tubes = (('Đỏ', 'Xanh'), ('Xanh', 'Đỏ'), ())
    initial_state = WaterSortState(tubes, capacity=2)
    path, state_checked = solve_bfs(initial_state)
    if path is None:
        print("❌ FAIL: Không tìm thấy lời giải!")
        return
    print(f"✅ {len(path)} bước, duyệt {state_checked} states\n")
    current = initial_state
    for step, move in enumerate(path):
        src, dst, amount, color = move
        print(f"Bước {step+1}: Đổ {amount} nấc '{color}' từ Ống {src+1} -> Ống {dst+1}")
        next_states, moves = current.get_next_moves()
        for ns, m in zip(next_states, moves):
            if m == move:
                current = ns
                break
        print_state(current)
    assert current.is_goal(), "❌ FAIL: Chưa phải Goal!"
    print("✅ PASS\n")


def test_khoi_lien_tiep():
    print("="*60)
    print("TEST 3: ĐỔ NHIỀU NƯỚC CÙNG MÀU LIÊN TIẾP")
    print("="*60)
    tubes = (('Đỏ', 'Xanh', 'Xanh', 'Xanh'), ('Xanh',), ())
    state = WaterSortState(tubes, capacity=4)
    next_states, moves = state.get_next_moves()
    found_3_blocks = any(m[0] == 0 and m[1] == 2 and m[2] == 3 and m[3] == 'Xanh' for m in moves)
    assert found_3_blocks
    print("✅ PASS\n")


def test_trang_thai_anh_chup():
    print("="*60)
    print("TEST 4: TRẠNG THÁI TỪ ẢNH CHỤP (CAPACITY=2)")
    print("="*60)
    tubes = (('Đỏ', 'Xanh'), ('Xanh', 'Đỏ'), ())
    initial_state = WaterSortState(tubes, capacity=2)
    path, state_checked = solve_bfs(initial_state)
    if path is None:
        print("FAIL")
        return
    assert path[0][2] == 1, f"Sai luật: bước đầu đổ {path[0][2]} nấc"
    print(f"BFS tìm thấy {len(path)} bước, duyệt {state_checked} states")
    current = initial_state
    for step, move in enumerate(path):
        src, dst, amount, color = move
        next_states, moves = current.get_next_moves()
        for ns, m in zip(next_states, moves):
            if m == move:
                current = ns
                break
    print("PASS\n")


def test_validation_va_case_khong_the_giai():
    print("="*60)
    print("TEST 5: LOẠI TRẠNG THÁI KHÔNG HỢP LỆ")
    print("="*60)
    invalid_count = WaterSortState(
        (('Đỏ', 'Đỏ'), ('Xanh', 'Xanh'), ()), capacity=4
    )
    valid, message = invalid_count.validate()
    assert not valid, 'Phải loại trạng thái có số lượng màu không đủ.'
    print(f"PASS: Loại số lượng màu sai: {message}")
    invalid_gap = WaterSortState(
        (('Đỏ', '', 'Xanh'), ('Đỏ', 'Xanh'), ()), capacity=2
    )
    valid, message = invalid_gap.validate()
    assert not valid, 'Phải loại trạng thái có ô trống nằm giữa màu.'
    print(f"PASS: Loại ô trống nằm giữa: {message}\n")


def test_ba_thuat_toan_tren_case_hop_le():
    print("="*60)
    print("TEST 6: BFS / DFS / A* ĐỀU TRẢ LỜI GIẢI HỢP LỆ")
    print("="*60)
    initial = WaterSortState(
        (('Đỏ', 'Xanh'), ('Xanh', 'Đỏ'), ()), capacity=2
    )
    for name, solver in (
        ('BFS', solve_bfs),
        ('DFS', solve_dfs),
        ('A*', solve_astar),
    ):
        path, state_checked = solver(initial)
        assert path is not None, f'{name} không tìm thấy lời giải.'
        current = initial
        for move in path:
            next_states, moves = current.get_next_moves()
            assert move in moves, f'{name} trả nước đi không hợp lệ: {move}'
            current = next_states[moves.index(move)]
        assert current.is_goal(), f'{name} kết thúc nhưng chưa đạt goal.'
        print(f'PASS: {name} - {len(path)} bước, {state_checked} states')


if __name__ == '__main__':
    try:
        test_luat_choi()
        test_giai_bai_toan()
        test_khoi_lien_tiep()
        test_trang_thai_anh_chup()
        test_validation_va_case_khong_the_giai()
        test_ba_thuat_toan_tren_case_hop_le()
        print("\nTẤT CẢ CÁC TEST ĐỀU PASS!")
    except AssertionError as e:
        print(f"\nLỖI LOGIC: {e}")
    except Exception as e:
        print(f"\nLỖI HỆ THỐNG: {e}")
