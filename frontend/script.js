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



/**
 * Sự kiện window.onload: Chạy khi toàn bộ trang web đã load xong.
 * Gọi 2 hàm khởi tạo: vẽ bảng màu và tạo các ống rỗng ban đầu.
 */
window.onload = function() {
    renderColorPalette();
    generateEmptyTubes();
};

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

    // Reset trạng thái lời giải cũ
    solutionPath = [];
    stepIndex = 0;
    document.getElementById('stepInfo').innerText = 'Chưa có lời giải.';
    document.getElementById('btnNext').disabled = true;
    document.getElementById('btnPrev').disabled = true;

    renderTubes(); // Gọi hàm vẽ lại giao diện các ống
    renderColorPalette(); // Cập nhật mẫu số theo sức chứa mới
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