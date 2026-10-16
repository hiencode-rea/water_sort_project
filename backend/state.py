# state.py - File định nghĩa lớp biểu diễn trạng thái của bài toán Water Sort Puzzle

class WaterSortState:
    """Lớp biểu diễn một trạng thái cụ thể của hệ thống các ống nghiệm."""

    def __init__(self, tubes, capacity=4):
        # Hàm khởi tạo, nhận vào cấu hình các ống và sức chứa tối đa mỗi ống
        self.tubes = tubes          # Lưu trữ trạng thái các ống (Tuple of Tuples), ví dụ: (('Red','Blue'), ('Green',))
        self.capacity = capacity    # Số nấc màu tối đa mà mỗi ống có thể chứa (mặc định là 4, người dùng có thể tùy chỉnh)

    def validate(self):
        """Kiểm tra cấu hình có thể là một bàn Water Sort hợp lệ hay không.

        Mỗi màu phải xuất hiện đúng capacity lần; nếu ít hơn hoặc nhiều hơn
        thì không thể tạo ra các ống thắng theo luật chuẩn.
        """
        if not isinstance(self.capacity, int) or self.capacity < 1:
            return False, 'Sức chứa phải là số nguyên dương.'

        if not isinstance(self.tubes, tuple) or len(self.tubes) < 2:
            return False, 'Bàn chơi phải có ít nhất 2 ống.'

        color_counts = {}

        for tube_index, tube in enumerate(self.tubes):
            if len(tube) > self.capacity:
                return False, f'Ống {tube_index + 1} vượt quá sức chứa.'

            # Backend lưu dạng compact: màu phải liên tục, không có ô rỗng giữa.
            if any(color == '' for color in tube):
                return False, f'Ống {tube_index + 1} chứa ô trống không hợp lệ.'

            for color in tube:
                if not isinstance(color, str) or not color.strip():
                    return False, f'Màu trong ống {tube_index + 1} không hợp lệ.'
                color_counts[color] = color_counts.get(color, 0) + 1

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

        # Không bắt buộc phải có ống rỗng hoàn toàn.
        # Water Sort vẫn cho phép đổ giữa các ống còn chỗ trống nếu màu trên
        # đỉnh ống đích trùng với màu đang đổ.
        return True, ''

    def is_goal(self):
        """Kiểm tra xem trạng thái hiện tại có phải là trạng thái đích (đã giải xong) hay không."""
        # Duyệt qua từng ống nghiệm trong danh sách các ống
        for tube in self.tubes:
            # Lọc ra các nấc màu thực tế trong ống (bỏ qua chuỗi rỗng '' đại diện cho chỗ trống)
            colors = [c for c in tube if c != '']

            # Nếu ống có chứa ít nhất 1 nấc màu (không rỗng)
            if len(colors) > 0:
                # Kiểm tra 2 điều kiện để ống được coi là "hoàn thiện":
                # 1. Số lượng màu phải bằng đúng sức chứa tối đa (capacity)
                # 2. Tất cả các màu phải giống nhau (set(colors) chỉ còn 1 phần tử duy nhất)
                if len(colors) != self.capacity or len(set(colors)) != 1:
                    # Nếu vi phạm bất kỳ điều kiện nào -> chưa phải trạng thái đích
                    return False
        # Nếu tất cả các ống đều rỗng hoặc đã hoàn thiện -> đây là trạng thái đích
        return True

    def get_next_moves(self):
        """Sinh ra tất cả các trạng thái con hợp lệ từ trạng thái hiện tại và danh sách hành động tương ứng."""
        next_states = []    # Danh sách lưu các đối tượng WaterSortState mới (trạng thái con)
        moves = []          # Danh sách lưu thông tin hành động tương ứng với mỗi trạng thái con

        # Duyệt qua từng ống nguồn (src) bằng chỉ số i
        for i, src_tube in enumerate(self.tubes):
            # Lấy danh sách các màu thực tế trong ống nguồn (bỏ qua chỗ trống '')
            src_colors = [c for c in src_tube if c != '']

            # Nếu ống nguồn rỗng thì không có gì để đổ -> bỏ qua
            if not src_colors:
                continue

            # Xác định màu nằm trên cùng (miệng ống) của ống nguồn
            top_color = src_colors[-1]

            # Đếm số nấc CÙNG MÀU LIÊN TIẾP từ đỉnh xuống đáy.
            # Phải dừng ngay khi gặp màu khác; không được đếm các màu giống nhau
            # nằm phía dưới một màu khác.
            count_top = 0
            for color in reversed(src_colors):
                if color != top_color:
                    break
                count_top += 1

            # Duyệt qua từng ống đích (dst) bằng chỉ số j để thử đổ nước sang
            for j, dst_tube in enumerate(self.tubes):
                # Không được đổ từ ống nguồn sang chính nó
                if i == j:
                    continue

                # Lấy danh sách các màu thực tế trong ống đích
                dst_colors = [c for c in dst_tube if c != '']

                # Tính số lượng chỗ trống còn lại trong ống đích
                empty_slots = self.capacity - len(dst_colors)

                # Nếu ống đích đã đầy -> không thể đổ thêm -> bỏ qua
                if empty_slots == 0:
                    continue

                # Điều kiện hợp lệ để đổ nước:
                # Ống đích đang rỗng HOẶC màu trên cùng của ống đích trùng với màu trên cùng của ống nguồn
                if not dst_colors or dst_colors[-1] == top_color:
                    # Số lượng màu thực sự được đổ = min(số màu giống nhau ở đỉnh ống nguồn, số chỗ trống ống đích)
                    pour_amount = min(count_top, empty_slots)

                    # Tạo bản sao sâu (deep copy) của danh sách ống để thao tác sinh trạng thái mới
                    # Chuyển từ Tuple sang List để có thể thay đổi giá trị
                    new_tubes = list(list(t) for t in self.tubes)

                    # Thực hiện việc đổ 'pour_amount' khối màu từ ống i sang ống j
                    # Lưu ý: phần tử CUỐI của list là đỉnh ống (miệng ống), phần tử ĐẦU là đáy
                    for _ in range(pour_amount):
                        new_tubes[i].pop()                 # Xóa 1 khối màu từ ĐỈNH ống nguồn (pop phần tử cuối)
                        new_tubes[j].append(top_color)     # Thêm 1 khối màu lên ĐỈNH ống đích (append vào cuối)

                    # Chuyển ngược lại thành Tuple of Tuples để đảm bảo tính bất biến (có thể hash được)
                    new_state_tuple = tuple(tuple(t) for t in new_tubes)

                    # Tạo đối tượng trạng thái mới và thêm vào danh sách trạng thái con
                    next_states.append(WaterSortState(new_state_tuple, self.capacity))

                    # Lưu lại thông tin hành động: (ống nguồn, ống đích, lượng đổ, màu đổ)
                    moves.append((i, j, pour_amount, top_color))

        # Trả về đồng thời danh sách trạng thái con và danh sách hành động tương ứng
        return next_states, moves

    def __hash__(self):
        """Hàm băm để có thể lưu trạng thái vào tập hợp (Set) hoặc làm khóa của Từ điển (Dict)."""
        # Băm dựa trên cấu trúc Tuple của các ống (Tuple là kiểu dữ liệu có thể hash được)
        return hash(self.tubes)

    def __eq__(self, other):
        """Hàm so sánh bằng, dùng để kiểm tra xem 2 trạng thái có giống hệt nhau không (tránh duyệt trùng lặp)."""
        # Hai trạng thái bằng nhau khi và chỉ khi cấu hình các ống của chúng giống hệt nhau
        return self.tubes == other.tubes
