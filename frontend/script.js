// script.js - File xử lý logic giao diện người dùng và gọi API Backend cho Water Sort Puzzle

// Danh sách 8 màu sắc mặc định (mã hex) để người dùng chọn
const AVAILABLE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e'];

// Biến toàn cục lưu trữ trạng thái hiện tại của các ống nghiệm trên UI (mảng 2 chiều)
let currentTubesState = [];

// Màu đang được chọn từ bảng màu (mặc định là màu đầu tiên)
let selectedColor = AVAILABLE_COLORS[0];

// Mảng lưu trữ lịch sử các bước giải (full quá trình) nhận từ API Backend
let solutionPath = [];

// Chỉ số bước hiện tại đang hiển thị trên giao diện
let stepIndex = 0;

// Biến lưu interval ID cho chức năng Auto Play (để có thể dừng lại)
let autoPlayInterval = null;
/**
 * Lấy URL API Backend dựa trên IP người dùng nhập trong ô Server IP.
 * Hỗ trợ cả localhost và LAN network.
 */
function getApiUrl() {
    var ipInput = document.getElementById('serverIp');
    var ip = ipInput ? ipInput.value.trim() : '127.0.0.1';
    if (!ip) ip = '127.0.0.1';
    // Xóa http:// hoặc https:// nếu người dùng nhập thừa
    ip = ip.replace(/^https?:\/\//, '');
    // Xóa trailing slash
    ip = ip.replace(/\/$/, '');
    return 'http://' + ip + ':5000/api/solve';
}



// Trace tìm kiếm do backend trả về để dựng cây và bảng Open/Closed.
let searchTrace = null;
let selectedTraceNode = null;

/**
 * Sự kiện window.onload: Chạy khi toàn bộ trang web đã load xong.
 * Gọi 2 hàm khởi tạo: vẽ bảng màu và tạo các ống rỗng ban đầu.
 */
window.onload = function() {
    renderColorPalette();
    generateEmptyTubes();
    document.getElementById('traceSlider').addEventListener('input', function(event) {
        renderTraceAt(Number(event.target.value));
    });
};

const COLOR_NAMES = {
    '#e74c3c': 'Đỏ',
    '#3498db': 'Xanh dương',
    '#2ecc71': 'Xanh lá',
    '#f1c40f': 'Vàng',
    '#9b59b6': 'Tím',
    '#e67e22': 'Cam',
    '#1abc9c': 'Ngọc lam',
    '#34495e': 'Xám xanh'
};

function colorName(color) {
    return COLOR_NAMES[String(color).toLowerCase()] || color;
}

function boardLabel(state) {
    return state.map(function(tube, index) {
        return 'Ống ' + (index + 1) + ': ' + (tube.length ? tube.map(colorName).join(' · ') : 'trống');
    }).join('  |  ');
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(character) {
        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character];
    });
}

function renderNodeBoard(node, nodeWidth, nodeHeight) {
    const state = node.state || [];
    const capacity = parseInt(document.getElementById('capacityInput').value, 10) || 4;
    const padding = 8;
    const tubeGap = 5;
    const tubeWidth = Math.max(11, Math.min(18, (nodeWidth - padding * 2 - tubeGap * Math.max(0, state.length - 1)) / Math.max(1, state.length)));
    const tubeHeight = Math.max(48, nodeHeight - 36);
    const startX = (nodeWidth - (state.length * tubeWidth + Math.max(0, state.length - 1) * tubeGap)) / 2;
    const startY = 8;
    let markup = '';
    state.forEach(function(tube, tubeIndex) {
        const x = startX + tubeIndex * (tubeWidth + tubeGap);
        const clipId = 'node-tube-clip-' + node.id + '-' + tubeIndex;
        markup += '<defs><clipPath id="' + clipId + '"><rect x="' + (x + 1) + '" y="' + (startY + 1) + '" width="' + (tubeWidth - 2) + '" height="' + (tubeHeight - 2) + '" rx="' + Math.min(6, tubeWidth / 2) + '"></rect></clipPath></defs>';
        markup += '<rect class="node-tube" x="' + x + '" y="' + startY + '" width="' + tubeWidth + '" height="' + tubeHeight + '" rx="6"></rect>';
        tube.slice(0, capacity).forEach(function(color, layerIndex) {
            const blockHeight = tubeHeight / capacity;
            const y = startY + tubeHeight - ((layerIndex + 1) * blockHeight);
            markup += '<rect class="node-color" clip-path="url(#' + clipId + ')" x="' + (x + 1) + '" y="' + y.toFixed(2) + '" width="' + (tubeWidth - 2) + '" height="' + (blockHeight + 1).toFixed(2) + '" fill="' + escapeHtml(color) + '"><title>' + escapeHtml(colorName(color)) + '</title></rect>';
        });
    });
    return markup;
}

function renderTraceAt(traceIndex) {
    if (!searchTrace) return;
    const timeline = searchTrace.timeline || [];
    const frame = timeline[Math.max(0, Math.min(traceIndex, timeline.length - 1))] || { open: [], closed: [], active: null };
    const slider = document.getElementById('traceSlider');
    slider.value = traceIndex;
    document.getElementById('traceSliderValue').value = traceIndex;
    document.getElementById('traceOpenCount').innerText = frame.open.length;
    document.getElementById('traceClosedCount').innerText = frame.closed.length;
    document.getElementById('openListMeta').innerText = frame.open.length + ' node';
    document.getElementById('closedListMeta').innerText = frame.closed.length + ' node';
    renderTraceTables(frame);
    renderSearchGraph(frame.active, frame);
}

function renderTraceTables(frame) {
    const nodes = searchTrace.nodes || [];
    function table(ids) {
        if (!ids.length) return '<div class="empty-trace">Danh sách rỗng.</div>';
        return '<div class="state-row header"><span>ID</span><span>STATE</span><span>g</span><span>h</span><span>f</span></div>' + ids.map(function(id) {
            const node = nodes[id];
            return '<div class="state-row" data-node-id="' + node.id + '"><strong>#' + node.id + '</strong><span class="state-board" title="' + escapeHtml(boardLabel(node.state)) + '">' + escapeHtml(boardLabel(node.state)) + '</span><span>' + node.g + '</span><span>' + node.h + '</span><span>' + node.f + '</span></div>';
        }).join('');
    }
    document.getElementById('openListTable').innerHTML = table(frame.open);
    document.getElementById('closedListTable').innerHTML = table(frame.closed);
    document.querySelectorAll('.state-row[data-node-id]').forEach(function(row) {
        row.onclick = function() { selectTraceNode(Number(row.dataset.nodeId)); };
    });
}

function renderSearchGraph(activeId, suppliedFrame) {
    const root = document.getElementById('searchGraph');
    const frame = suppliedFrame || getTraceFrameForActive(activeId);
    const visibleIds = getVisibleNodeIds(frame);
    const nodes = (searchTrace.nodes || []).filter(function(node) { return visibleIds.has(node.id); });
    if (!nodes.length) { root.innerHTML = '<div class="empty-trace">Chạy solver để dựng cây tìm kiếm.</div>'; return; }
    const depth = {};
    nodes.forEach(function(node) { depth[node.id] = node.parent === null ? 0 : (depth[node.parent] || 0) + 1; });
    const columns = {};
    nodes.forEach(function(node) { (columns[depth[node.id]] ||= []).push(node); });
    const maxDepth = Math.max.apply(null, Object.keys(columns).map(Number));
    const maxTubes = Math.max.apply(null, nodes.map(function(node) { return node.state.length; }));
    const nodeWidth = Math.max(132, Math.min(220, 28 + maxTubes * 22));
    const levelGap = nodeWidth + 70;
    const width = Math.max(620, (maxDepth + 1) * levelGap);
    const nodeHeight = 108;
    const rowGap = nodeHeight + 22;
    const height = Math.max(320, Math.max.apply(null, Object.values(columns).map(function(list) { return list.length; })) * rowGap + 35);
    const positions = {};
    const leftMargin = nodeWidth / 2 + 42;
    Object.keys(columns).forEach(function(level) { columns[level].forEach(function(node, index) { positions[node.id] = { x: leftMargin + Number(level) * levelGap, y: 55 + index * rowGap }; }); });
    let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Cây trạng thái tìm kiếm">';
    nodes.forEach(function(node) { if (node.parent !== null && positions[node.parent]) svg += '<line class="graph-edge" x1="' + (positions[node.parent].x + nodeWidth / 2) + '" y1="' + (positions[node.parent].y + nodeHeight / 2) + '" x2="' + (positions[node.id].x - nodeWidth / 2) + '" y2="' + (positions[node.id].y + nodeHeight / 2) + '"></line>'; });
    const visualState = getVisualNodeState(frame);
    nodes.forEach(function(node) {
        const p = positions[node.id];
        const cls = 'graph-node ' + visualState[node.id];
        svg += '<g class="' + cls + '" data-node-id="' + node.id + '" transform="translate(' + (p.x - nodeWidth / 2) + ',' + p.y + ')" tabindex="0">';
        svg += '<rect class="node-card" x="0" y="0" width="' + nodeWidth + '" height="' + nodeHeight + '" rx="10"></rect>';
        svg += '<text class="node-id" x="' + (nodeWidth / 2) + '" y="' + (nodeHeight - 8) + '">#' + node.id + '</text>';
        svg += renderNodeBoard(node, nodeWidth, nodeHeight);
        svg += '</g>';
    });
    root.innerHTML = svg + '</svg>';
    root.querySelectorAll('.graph-node').forEach(function(node) { node.onclick = function() { selectTraceNode(Number(node.dataset.nodeId)); }; });
    document.getElementById('traceNodeCount').innerText = nodes.length;
}

function getVisibleNodeIds(frame) {
    const ids = new Set([0]);
    (frame.open || []).concat(frame.closed || []).concat(frame.active === null || frame.active === undefined ? [] : [frame.active]).forEach(function(id) {
        let cursor = searchTrace.nodes[id];
        while (cursor) {
            ids.add(cursor.id);
            cursor = cursor.parent === null ? null : searchTrace.nodes[cursor.parent];
        }
    });
    return ids;
}

function getTraceFrameForActive(activeId) {
    if (!searchTrace) return { open: [], closed: [], active: activeId, goal: null };
    const timeline = searchTrace.timeline || [];
    for (let index = timeline.length - 1; index >= 0; index--) {
        if (timeline[index].active === activeId) return timeline[index];
    }
    return timeline[timeline.length - 1] || { open: [], closed: [], active: activeId };
}

function getVisualNodeState(frame) {
    const state = {};
    const open = new Set(frame.open || []);
    const closed = new Set(frame.closed || []);
    const goalFound = searchTrace.goal_node !== null && searchTrace.goal_node !== undefined && (closed.has(searchTrace.goal_node) || frame.active === searchTrace.goal_node);
    const path = goalFound ? getGoalPathIds() : new Set();
    (searchTrace.nodes || []).forEach(function(node) {
        if (node.id === searchTrace.goal_node && goalFound) state[node.id] = 'goal-state';
        else if (path.has(node.id)) state[node.id] = 'goal-path';
        else if (node.id === (frame.open || [])[0]) state[node.id] = 'next-expanded';
        else if (open.has(node.id)) state[node.id] = 'open-state';
        else if (closed.has(node.id)) state[node.id] = 'explored-state';
        else state[node.id] = 'unseen-state';
    });
    return state;
}

function getGoalPathIds() {
    const ids = new Set();
    if (!searchTrace || searchTrace.goal_node === null || searchTrace.goal_node === undefined) return ids;
    let cursor = searchTrace.nodes[searchTrace.goal_node];
    while (cursor) {
        ids.add(cursor.id);
        cursor = cursor.parent === null ? null : searchTrace.nodes[cursor.parent];
    }
    ids.delete(searchTrace.goal_node);
    return ids;
}

function selectTraceNode(nodeId) {
    selectedTraceNode = searchTrace.nodes.find(function(node) { return node.id === nodeId; });
    if (!selectedTraceNode) return;
    document.getElementById('selectedNodeInfo').innerHTML = '<strong>Node #' + selectedTraceNode.id + '</strong> · ' + boardLabel(selectedTraceNode.state) + (selectedTraceNode.move ? ' · Move ' + selectedTraceNode.move[0] + ' → ' + selectedTraceNode.move[1] : ' · Initial state');
}

function getNodePath(nodeId) {
    const nodes = searchTrace ? searchTrace.nodes : [];
    const moves = [];
    let cursor = nodes[nodeId];
    while (cursor && cursor.parent !== null) {
        moves.unshift(cursor.move);
        cursor = nodes[cursor.parent];
    }
    return moves;
}

function sameMove(left, right) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every(function(value, index) { return value === right[index]; });
}

function getSolutionNodeIds() {
    const ids = new Set([0]);
    if (!searchTrace || !Array.isArray(solutionPath)) return ids;
    (searchTrace.nodes || []).forEach(function(node) {
        const path = getNodePath(node.id);
        if (path.length === solutionPath.length && path.every(function(move, index) { return sameMove(move, solutionPath[index]); })) ids.add(node.id);
    });
    return ids;
}

function findSolutionNode(step) {
    if (!searchTrace) return null;
    if (step === 0) return searchTrace.nodes[0] || null;
    return (searchTrace.nodes || []).find(function(node) {
        const path = getNodePath(node.id);
        return path.length === step && path.every(function(move, index) { return sameMove(move, solutionPath[index]); });
    }) || null;
}

function syncGraphToSolutionStep() {
    if (!searchTrace) return;
    const node = findSolutionNode(stepIndex);
    if (node) {
        const timeline = searchTrace.timeline || [];
        let frameIndex = 0;
        if (stepIndex > 0) {
            for (let index = timeline.length - 1; index >= 0; index--) {
                if (timeline[index].active === node.id) { frameIndex = index; break; }
            }
            if (frameIndex < 0) frameIndex = Math.min(stepIndex, Math.max(0, timeline.length - 1));
        }
        renderTraceAt(frameIndex);
        selectTraceNode(node.id);
    }
}

/**
 * Vẽ bảng chọn màu (color palette) lên giao diện.
 * Mỗi ô màu là 1 div với class 'color-swatch'.
 */
function renderColorPalette() {
    const palette = document.getElementById('colorPalette');
    palette.innerHTML = ''; // Xóa nội dung cũ nếu có
    const capacity = parseInt(document.getElementById('capacityInput').value) || 0;

    // Duyệt qua từng mã màu trong danh sách
    AVAILABLE_COLORS.forEach(function(color) {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = color;

        // Nếu là màu đang được chọn thì thêm class active (viền đậm)
        if (color === selectedColor) {
            swatch.classList.add('active');
        }

        // Gán sự kiện click: khi bấm vào ô màu -> cập nhật màu đang chọn
        swatch.onclick = function() {
            selectedColor = color;
            // Bỏ active tất cả các ô, rồi thêm active cho ô vừa click
            document.querySelectorAll('.color-swatch').forEach(function(s) {
                s.classList.remove('active');
            });
            swatch.classList.add('active');
        };

        palette.appendChild(swatch); // Thêm ô màu vào DOM

        // Hiển thị số nấc hiện có của màu để tránh tô thiếu hoặc tô dư.
        const countLabel = document.createElement('small');
        countLabel.className = 'color-count';
        countLabel.dataset.color = color;
        countLabel.innerText = '0/' + capacity;
        palette.appendChild(countLabel);
    });

    updateColorCounts();
}

/** Đếm số nấc của từng màu đang có trên bàn. */
function getColorCounts() {
    const counts = {};
    AVAILABLE_COLORS.forEach(function(color) { counts[color] = 0; });
    currentTubesState.forEach(function(tube) {
        tube.forEach(function(color) {
            if (color !== '' && counts[color] !== undefined) counts[color]++;
        });
    });
    return counts;
}

/** Cập nhật nhãn số lượng màu trên bảng màu. */
function updateColorCounts() {
    const capacity = parseInt(document.getElementById('capacityInput').value) || 0;
    const counts = getColorCounts();
    document.querySelectorAll('.color-count').forEach(function(label) {
        const color = label.dataset.color;
        label.innerText = counts[color] + '/' + capacity;
        label.style.color = counts[color] > capacity ? '#e74c3c' : '#34495e';
    });
}

/**
 * Tạo N ống nghiệm rỗng dựa trên input số lượng ống và sức chứa.
 */
function generateEmptyTubes() {
    const numTubes = parseInt(document.getElementById('numTubes').value);
    const capacity = parseInt(document.getElementById('capacityInput').value);

    // Khởi tạo mảng 2 chiều: N ống, mỗi ống là mảng C phần tử chuỗi rỗng ''
    currentTubesState = Array.from({ length: numTubes }, function() {
        return Array(capacity).fill('');
    });

    resetSolutionState();

    renderTubes(); // Gọi hàm vẽ lại giao diện các ống
    renderColorPalette(); // Cập nhật mẫu số theo sức chứa mới
}

function resetSolutionState() {
    solutionPath = [];
    stepIndex = 0;
    searchTrace = null;
    selectedTraceNode = null;
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    document.getElementById('stepInfo').innerText = 'Chưa có lời giải.';
    document.getElementById('btnNext').disabled = true;
    document.getElementById('btnPrev').disabled = true;
    document.getElementById('btnSolve').disabled = false;
    document.getElementById('btnAutoPlay').innerText = '▶ Auto Play';
    const slider = document.getElementById('traceSlider');
    slider.disabled = true;
    slider.value = 0;
    slider.max = 0;
    document.getElementById('traceSliderValue').value = 0;
    document.getElementById('traceNodeCount').innerText = 0;
    document.getElementById('traceOpenCount').innerText = 0;
    document.getElementById('traceClosedCount').innerText = 0;
    document.getElementById('openListMeta').innerText = '0 node';
    document.getElementById('closedListMeta').innerText = '0 node';
    document.getElementById('searchGraph').innerHTML = '<div class="empty-trace">Chạy solver để dựng cây tìm kiếm.</div>';
    document.getElementById('openListTable').innerHTML = '<div class="empty-trace">Chưa có dữ liệu.</div>';
    document.getElementById('closedListTable').innerHTML = '<div class="empty-trace">Chưa có dữ liệu.</div>';
    document.getElementById('selectedNodeInfo').innerText = 'Chọn một node trên cây để xem trạng thái.';
}

function generateRandomTestState() {
    let numTubes = parseInt(document.getElementById('numTubes').value, 10) || 3;
    let capacity = parseInt(document.getElementById('capacityInput').value, 10) || 4;
    numTubes = Math.max(3, Math.min(15, numTubes));
    capacity = Math.max(2, Math.min(10, capacity));
    document.getElementById('numTubes').value = numTubes;
    document.getElementById('capacityInput').value = capacity;

    const colorCount = Math.min(numTubes - 1, AVAILABLE_COLORS.length);
    numTubes = colorCount + 1;
    document.getElementById('numTubes').value = numTubes;
    const colors = AVAILABLE_COLORS.slice(0, colorCount);
    let candidate = [];
    for (let attempt = 0; attempt < 100; attempt++) {
        const cells = colors.flatMap(function(color) { return Array(capacity).fill(color); });
        for (let index = cells.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [cells[index], cells[swapIndex]] = [cells[swapIndex], cells[index]];
        }
        const filledTubeCount = colorCount;
        candidate = [];
        for (let index = 0; index < filledTubeCount; index++) {
            candidate.push(cells.slice(index * capacity, (index + 1) * capacity));
        }
        candidate.push(Array(capacity).fill(''));
        const mixed = candidate.some(function(tube) { return tube.length > 1 && new Set(tube).size > 1; });
        if (mixed) break;
    }

    currentTubesState = candidate;
    resetSolutionState();
    renderTubes();
    renderColorPalette();
}

/**
 * Vẽ lại toàn bộ các ống nghiệm lên màn hình dựa trên biến currentTubesState.
 * Mỗi ống là 1 div chứa các block màu xếp từ dưới lên (dùng flex-direction: column-reverse).
 */
function renderTubes() {
    const container = document.getElementById('tubesContainer');
    container.innerHTML = ''; // Xóa các ống cũ trên UI
    const capacity = parseInt(document.getElementById('capacityInput').value);

    // Duyệt qua từng ống để vẽ
    currentTubesState.forEach(function(tube, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'tube-wrapper';

        // Nhãn tên ống (Ống 1, Ống 2,...)
        const label = document.createElement('div');
        label.className = 'tube-label';
        label.innerText = 'Ống ' + (index + 1);

        // Div đại diện cho thân ống nghiệm
        const tubeDiv = document.createElement('div');
        tubeDiv.className = 'tube';
        // Thiết lập chiều cao cho ống dựa trên sức chứa (mỗi nấc 30px)
        tubeDiv.style.height = (capacity * 30) + 'px';

        // Duyệt từng nấc trong ống để tạo block màu
        tube.forEach(function(colorValue) {
            const block = document.createElement('div');
            block.className = 'color-block';
            if (colorValue !== '') {
                block.style.backgroundColor = colorValue;
            } else {
                block.style.backgroundColor = 'transparent';
            }
            tubeDiv.appendChild(block);
        });

        // Gán sự kiện click vào ống: thêm màu đang chọn vào vị trí trống đầu tiên
        tubeDiv.onclick = function() {
            handleTubeClick(index);
        };

        wrapper.appendChild(label);
        wrapper.appendChild(tubeDiv);
        container.appendChild(wrapper);
    });
}

/**
 * Xử lý khi người dùng click vào 1 ống nghiệm.
 * Thêm màu đang được chọn (selectedColor) vào vị trí trống thấp nhất của ống.
 */
function handleTubeClick(tubeIndex) {
    const tube = currentTubesState[tubeIndex];
    const counts = getColorCounts();
    const capacity = parseInt(document.getElementById('capacityInput').value);

    // Một màu chỉ được xuất hiện tối đa capacity lần trong toàn bộ bàn.
    if ((counts[selectedColor] || 0) >= capacity) {
        alert('Màu này đã đủ ' + capacity + ' nấc trên bàn!');
        return;
    }

    // Tìm vị trí trống đầu tiên (từ dưới lên, tức là index nhỏ nhất có giá trị '')
    const emptyIdx = tube.indexOf('');
    if (emptyIdx !== -1) {
        // Nếu còn chỗ trống -> đặt màu vào đó
        tube[emptyIdx] = selectedColor;
        renderTubes(); // Vẽ lại UI
        updateColorCounts();
    } else {
        alert('Ống này đã đầy!');
    }
}

/** Kiểm tra nhanh số lượng màu trước khi gửi yêu cầu giải. */
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

/**
 * Gọi API Backend để giải bài toán Water Sort với trạng thái hiện tại.
 * Gửi dữ liệu qua POST request dạng JSON.
 */
function solvePuzzle() {
    if (!validateUIBeforeSolve()) return;

    const algo = document.getElementById('algoSelect').value;
    const capacity = parseInt(document.getElementById('capacityInput').value);

    // Chuẩn bị payload gửi lên server
    const payload = {
        tubes: currentTubesState,
        algorithm: algo,
        capacity: capacity
    };

    // Vô hiệu hóa nút GIẢI trong lúc chờ kết quả
    document.getElementById('btnSolve').disabled = true;
    document.getElementById('stepInfo').innerText = 'Đang giải...';

    fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        document.getElementById('btnSolve').disabled = false;

        if (data.error) {
            document.getElementById('stepInfo').innerText = 'Lỗi: ' + data.error;
            return;
        }

        if (data.status === 'invalid') {
            document.getElementById('stepInfo').innerText = 'Dữ liệu không hợp lệ: ' + data.error;
            return;
        }

        if (data.status === 'no_solution') {
            searchTrace = data.search_trace || null;
            if (searchTrace) {
                const slider = document.getElementById('traceSlider');
                slider.disabled = false;
                slider.max = Math.max(0, searchTrace.timeline.length - 1);
                renderTraceAt(0);
                syncGraphToSolutionStep();
            }
            document.getElementById('stepInfo').innerText = 'Không tìm thấy lời giải cho trạng thái này.';
            return;
        }

        if (data.status !== 'success' || !Array.isArray(data.solution_path)) {
            document.getElementById('stepInfo').innerText = 'Backend trả về dữ liệu không hợp lệ.';
            return;
        }

        // Lưu đường đi giải vào biến toàn cục (Backend trả về key 'solution_path')
        solutionPath = data.solution_path;
        stepIndex = 0;
        searchTrace = data.search_trace || null;
        if (searchTrace) {
            const slider = document.getElementById('traceSlider');
            slider.disabled = false;
            slider.max = Math.max(0, searchTrace.timeline.length - 1);
            renderTraceAt(0);
            syncGraphToSolutionStep();
        }

        // Cập nhật thông báo thành công, KHÔNG gọi generateEmptyTubes() để tránh xóa mất solutionPath
        document.getElementById('stepInfo').innerText = solutionPath.length === 0
            ? 'Trạng thái đã được giải sẵn.'
            : 'Tìm thấy ' + solutionPath.length + ' bước. Bấm Tiến/Auto Play để xem.';
        document.getElementById('btnNext').disabled = solutionPath.length === 0;
        document.getElementById('btnPrev').disabled = true;
    })
    .catch(function(err) {
        document.getElementById('btnSolve').disabled = false;
        document.getElementById('stepInfo').innerText = 'Lỗi kết nối server: ' + err.message;
    });
}

/**
 * Tiến 1 bước trong quá trình giải (đổ nước từ ống này sang ống kia).
 * Quy ước: index 0 = đáy ống, index cuối = đỉnh ống (miệng ống).
 * Khi đổ: lấy từ ĐỈNH ống nguồn -> đặt lên ĐỈNH ống đích.
 */
function nextStep() {
    if (stepIndex >= solutionPath.length) return;

    // Backend trả về mỗi bước dạng [src, dst, amount, color]
    const src = solutionPath[stepIndex][0];
    const dst = solutionPath[stepIndex][1];
    const amount = solutionPath[stepIndex][2];
    const color = solutionPath[stepIndex][3];

    // Mô phỏng đổ nước đúng luật: lấy từ ĐỈNH ống src -> đặt lên ĐỈNH ống dst
    // Quy ước mảng: index 0 = đáy, index cuối = đỉnh. CSS column-reverse sẽ vẽ đúng thứ tự này.
    for (let k = 0; k < amount; k++) {
        // 1. Xóa 1 nấc màu từ ĐỈNH ống nguồn (duyệt ngược từ cuối lên, tìm phần tử khác '' đầu tiên)
        for (let i = currentTubesState[src].length - 1; i >= 0; i--) {
            if (currentTubesState[src][i] !== '') {
                currentTubesState[src][i] = '';
                break;
            }
        }

        // 2. Thêm 1 nấc màu lên ĐỈNH ống đích.
        // Mảng luôn có dạng [màu, màu, '', '']; index 0 là đáy,
        // vì vậy ô trống đầu tiên chính là vị trí đỉnh tiếp theo.
        const dstEmptyIdx = currentTubesState[dst].indexOf('');
        if (dstEmptyIdx !== -1) {
            currentTubesState[dst][dstEmptyIdx] = color;
        }
    }

    renderTubes();
    document.getElementById('stepInfo').innerText =
        'Bước ' + (stepIndex + 1) + '/' + solutionPath.length + ': Đổ từ Ống ' + (src+1) + ' sang Ống ' + (dst+1);
    stepIndex++;

    document.getElementById('btnPrev').disabled = false;
    syncGraphToSolutionStep();
    if (stepIndex >= solutionPath.length) {
        document.getElementById('stepInfo').innerText += ' - HOÀN THÀNH!';
        document.getElementById('btnNext').disabled = true;
        if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; document.getElementById('btnAutoPlay').innerText = '\u25B6 Auto Play'; }
    }
}

/**
 * Lùi 1 bước (hoàn tác hành động đổ nước vừa rồi).
 * Ngược lại: lấy từ ĐỈNH ống đích -> đặt lại ĐỈNH ống nguồn.
 */
function prevStep() {
    if (stepIndex <= 0) return;
    stepIndex--;

    const src = solutionPath[stepIndex][0];
    const dst = solutionPath[stepIndex][1];
    const amount = solutionPath[stepIndex][2];
    const color = solutionPath[stepIndex][3];

    // Hoàn tác đúng luật: lấy từ ĐỈNH ống đích -> đặt lại ĐỈNH ống nguồn
    for (let k = 0; k < amount; k++) {
        // 1. Xóa 1 nấc màu từ ĐỈNH ống đích
        for (let i = currentTubesState[dst].length - 1; i >= 0; i--) {
            if (currentTubesState[dst][i] !== '') {
                currentTubesState[dst][i] = '';
                break;
            }
        }

        // 2. Đặt lại lên ĐỈNH ống nguồn.
        // Ô trống đầu tiên là vị trí tiếp theo sau khối màu hiện có.
        const srcEmptyIdx = currentTubesState[src].indexOf('');
        if (srcEmptyIdx !== -1) {
            currentTubesState[src][srcEmptyIdx] = color;
        }
    }

    renderTubes();
    document.getElementById('stepInfo').innerText =
        'Bước ' + stepIndex + '/' + solutionPath.length + ': Đã lùi lại.';
    document.getElementById('btnNext').disabled = false;
    syncGraphToSolutionStep();
    if (stepIndex === 0) document.getElementById('btnPrev').disabled = true;
}

/**
 * Tự động phát (Auto Play) toàn bộ quá trình giải, mỗi bước cách nhau 0.5 giây.
 */
function autoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        document.getElementById('btnAutoPlay').innerText = '\u25B6 Auto Play';
        return;
    }

    document.getElementById('btnAutoPlay').innerText = '\u23F8 Pause';
    autoPlayInterval = setInterval(function() {
        if (stepIndex >= solutionPath.length) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            document.getElementById('btnAutoPlay').innerText = '\u25B6 Auto Play';
            return;
        }
        nextStep();
    }, 500);
}