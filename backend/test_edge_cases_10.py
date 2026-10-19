"""10 edge/regression tests cho Water Sort.

Chạy:
    python test_edge_cases_10.py
"""

from copy import deepcopy

from app import app
from solver import solve_astar, solve_bfs, solve_dfs
from state import WaterSortState


RED = '#e74c3c'
BLUE = '#3498db'
GREEN = '#2ecc71'


def api_payload(tubes, capacity=2, algorithm='bfs'):
    return {'tubes': tubes, 'capacity': capacity, 'algorithm': algorithm}


def post(payload):
    return app.test_client().post('/api/solve', json=payload)


def expect_invalid(case_name, payload, expected_http=400):
    response = post(payload)
    data = response.get_json()
    assert response.status_code == expected_http, (
        f'{case_name}: HTTP {response.status_code}, expected {expected_http}; {data}'
    )
    assert data and data.get('status') == 'invalid', f'{case_name}: response={data}'
    assert data.get('error'), f'{case_name}: thiếu thông báo lỗi.'
    print(f'PASS {case_name}: {data["error"]}')


def test_01_missing_tubes():
    expect_invalid('01 thiếu tubes', {'capacity': 2, 'algorithm': 'bfs'})


def test_02_too_few_tubes():
    expect_invalid('02 dưới 2 ống', api_payload([['R', 'B']], 2))


def test_03_invalid_capacity_values():
    for capacity in (0, -1, 11, True, 2.5, '2'):
        expect_invalid(f'03 capacity={capacity!r}', api_payload([['R'], ['R']], capacity))


def test_04_invalid_algorithm():
    expect_invalid('04 algorithm lạ', api_payload([['R'], ['R']], 1, 'greedy'))


def test_05_tube_is_not_list():
    expect_invalid('05 tube không phải list', api_payload(['not-a-tube', ['R']], 1))


def test_06_color_after_empty_slot():
    expect_invalid('06 màu nằm sau ô trống', api_payload([['R', '', 'B'], ['R', 'B']], 2))


def test_07_over_capacity():
    expect_invalid('07 vượt sức chứa', api_payload([['R', 'B', 'R'], ['B', 'R']], 2))


def test_08_wrong_color_count():
    expect_invalid('08 số lượng màu sai', api_payload([['R', 'R'], ['B'], []], 2))


def test_09_valid_but_no_solution():
    """Hai ống đầy xen kẽ, không có ống rỗng: hợp lệ nhưng không có move."""
    tubes = [[RED, BLUE], [BLUE, RED]]
    response = post(api_payload(tubes, 2, 'astar'))
    data = response.get_json()
    assert response.status_code == 200
    assert data['status'] == 'no_solution'
    assert data['states_checked'] == 1
    assert data['search_trace']['goal_node'] is None
    print('PASS 09 trạng thái hợp lệ nhưng không có lời giải')


def test_10_hex_astar_and_trace_regression():
    """A* phải phân biệt #e74c3c và #3498db, đồng thời trace phải nhất quán."""
    tubes = [
        [RED, BLUE, RED, BLUE],
        [BLUE, RED, BLUE, RED],
        ['', '', '', ''],
    ]
    initial = WaterSortState(tuple(tuple(c for c in tube if c) for tube in tubes), 4)
    original = deepcopy(initial.tubes)
    path, checked = solve_astar(initial)
    assert path is not None and len(path) > 0
    assert checked > 1
    assert initial.tubes == original, 'A* đã mutate state đầu vào.'

    response = post(api_payload(tubes, 4, 'astar'))
    data = response.get_json()
    assert response.status_code == 200
    assert data['status'] == 'success'
    assert data['algorithm'] == 'astar'
    trace = data['search_trace']
    assert trace['nodes'] and trace['timeline']
    assert trace['goal_node'] is not None

    node_ids = {node['id'] for node in trace['nodes']}
    for frame in trace['timeline']:
        assert set(frame['open']).issubset(node_ids)
        assert set(frame['closed']).issubset(node_ids)
        assert set(frame['open']).isdisjoint(frame['closed'])
    print(f'PASS 10 A* hex regression + trace ({len(path)} bước, {checked} states)')


def main():
    tests = [
        test_01_missing_tubes,
        test_02_too_few_tubes,
        test_03_invalid_capacity_values,
        test_04_invalid_algorithm,
        test_05_tube_is_not_list,
        test_06_color_after_empty_slot,
        test_07_over_capacity,
        test_08_wrong_color_count,
        test_09_valid_but_no_solution,
        test_10_hex_astar_and_trace_regression,
    ]
    for test in tests:
        test()
    print(f'PASS: {len(tests)} edge cases')


if __name__ == '__main__':
    main()