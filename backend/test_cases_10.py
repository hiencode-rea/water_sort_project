"""10 test cases deterministic cho Water Sort.

Các board được tạo bằng cách xáo trộn một goal state bằng những nước đi hợp lệ,
nhờ đó mọi case đều hợp lệ và chắc chắn có lời giải.
"""

import random

from solver import solve_astar, solve_bfs, solve_dfs
from state import WaterSortState


SOLVERS = (('BFS', solve_bfs), ('DFS', solve_dfs), ('A*', solve_astar))


def apply_move(state, move):
    """Áp dụng một move bằng chính luật sinh successor của game."""
    next_states, moves = state.get_next_moves()
    assert move in moves, f'Move không hợp lệ: {move}'
    return next_states[moves.index(move)]


def make_goal(color_count, capacity, empty_tubes=1):
    colors = [f'color-{index + 1}' for index in range(color_count)]
    tubes = tuple(tuple(color for _ in range(capacity)) for color in colors)
    return WaterSortState(tubes + ((),) * empty_tubes, capacity)


def random_mixed_state(color_count, capacity, empty_tubes, seed):
    """Tạo board từ permutation màu, thay vì chỉ đổi vị trí các tube goal."""
    rng = random.Random(seed)
    colors = [f'color-{index + 1}' for index in range(color_count)]
    cells = [color for color in colors for _ in range(capacity)]
    for _ in range(100):
        rng.shuffle(cells)
        tubes = tuple(
            tuple(cells[index * capacity:(index + 1) * capacity])
            for index in range(color_count)
        ) + ((),) * empty_tubes
        state = WaterSortState(tubes, capacity)
        if not state.is_goal():
            return state
    raise AssertionError('Không tạo được board mixed từ seed cố định.')


def verify_solution(initial, path, algorithm_name):
    assert path is not None, f'{algorithm_name} không tìm thấy lời giải.'
    current = initial
    for index, move in enumerate(path, start=1):
        next_states, moves = current.get_next_moves()
        assert move in moves, f'{algorithm_name} có move sai ở bước {index}: {move}'
        current = next_states[moves.index(move)]
    assert current.is_goal(), f'{algorithm_name} kết thúc nhưng chưa đạt goal.'


CASES = [
    ('2 màu, sức chứa 2, xáo trộn ngắn', 2, 2, 1, 11),
    ('2 màu, sức chứa 2, xáo trộn dài', 2, 2, 1, 23),
    ('2 màu, sức chứa 3', 2, 3, 1, 31),
    ('3 màu, sức chứa 2', 3, 2, 1, 41),
    ('3 màu, sức chứa 3', 3, 3, 1, 53),
    ('3 màu, thêm 2 ống rỗng', 3, 3, 2, 61),
    ('4 màu, sức chứa 2', 4, 2, 1, 71),
    ('4 màu, sức chứa 3', 4, 3, 1, 83),
    ('4 màu, thêm 2 ống rỗng', 4, 3, 2, 97),
    ('5 màu, sức chứa 2', 5, 2, 1, 109),
]


def main():
    total = 0
    for case_number, (label, color_count, capacity, empty_tubes, seed) in enumerate(CASES, start=1):
        goal = make_goal(color_count, capacity, empty_tubes)
        initial = random_mixed_state(color_count, capacity, empty_tubes, seed)
        valid, error = initial.validate()
        assert valid, f'Case {case_number} không hợp lệ: {error}'

        print(f'CASE {case_number:02d}: {label}')
        print(f'  board={initial.tubes}')
        for name, solver in SOLVERS:
            path, checked = solver(initial)
            verify_solution(initial, path, name)
            print(f'  PASS {name}: {len(path)} bước, duyệt {checked} states')
            total += 1
        print()

    print(f'PASS: {len(CASES)} case x {len(SOLVERS)} thuật toán = {total} lượt kiểm tra')


if __name__ == '__main__':
    main()