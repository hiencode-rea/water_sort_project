# Đề xuất giải thuật A* cho bài toán Water Sort Puzzle

## 1. Mục tiêu

Đề xuất sử dụng thuật toán tìm kiếm A* để giải bài toán Water Sort Puzzle. A* kết hợp chi phí đã đi từ trạng thái ban đầu với ước lượng chi phí còn lại đến trạng thái đích, nhằm tìm lời giải hiệu quả hơn so với tìm kiếm không có thông tin heuristic trong những trường hợp phù hợp.

Ở giai đoạn niên luận, mục tiêu là xây dựng bộ giải A*, khảo sát heuristic và đánh giá thực nghiệm. Chưa khẳng định heuristic đề xuất là mới cho đến khi hoàn tất việc khảo sát tài liệu liên quan.

## 2. Mô hình bài toán

### 2.1. Trạng thái

Một trạng thái biểu diễn nội dung của tất cả các ống. Mỗi ống có sức chứa tối đa `K`; thứ tự các lớp màu trong ống được giữ nguyên.

Có thể biểu diễn trạng thái dưới dạng:

```text
state = (tube_1, tube_2, ..., tube_n)
```

Mỗi `tube_i` là một dãy màu từ đáy đến miệng ống. Cần thống nhất quy ước này trong toàn bộ chương trình.

### 2.2. Trạng thái ban đầu

Trạng thái ban đầu là cấu hình màu được cung cấp cho bộ giải. Cần kiểm tra dữ liệu đầu vào hợp lệ, chẳng hạn sức chứa ống, số lượng mỗi màu và số ống trống.

### 2.3. Trạng thái đích

Với quy tắc Water Sort thông dụng, trạng thái đích đạt được khi mỗi ống hoặc rỗng, hoặc chứa một màu duy nhất và không vượt quá sức chứa. Nếu bài toán yêu cầu mỗi màu phải nằm trọn trong một ống đầy, cần ghi rõ điều kiện này và bảo đảm cấu hình đầu vào tương thích.

### 2.4. Phép chuyển trạng thái

Một bước chuyển là rót màu từ ống nguồn sang ống đích theo quy tắc của phiên bản trò chơi đang nghiên cứu. Trong mô hình phổ biến:

- Ống nguồn không rỗng.
- Ống đích khác ống nguồn và còn chỗ trống.
- Ống đích rỗng hoặc lớp màu trên cùng của ống đích trùng với màu đang được rót.
- Lượng rót tuân theo luật trò chơi: thường là chuyển nhóm màu liên tiếp ở miệng ống, hoặc chỉ chuyển lượng vừa đủ để lấp chỗ trống nếu luật của phiên bản quy định như vậy.

**Lưu ý:** Phải chọn và ghi rõ một quy tắc rót duy nhất trước khi cài đặt, vì quy tắc này ảnh hưởng đến không gian trạng thái, số bước và tính đúng đắn của kết quả.

### 2.5. Chi phí

Gán chi phí bằng `1` cho mỗi lần rót hợp lệ. Khi đó, A* tối ưu số lần rót, không nhất thiết tối ưu thời gian thực hiện ngoài đời.

## 3. Thuật toán A*

A* đánh giá mỗi trạng thái `s` bằng:

\[
f(s) = g(s) + h(s)
\]

Trong đó:

- `g(s)`: số bước từ trạng thái ban đầu đến `s`.
- `h(s)`: ước lượng số bước tối thiểu còn lại để đi đến trạng thái đích.
- `f(s)`: chi phí ước lượng của lời giải đi qua `s`.

Ở mỗi vòng lặp, thuật toán lấy trạng thái có `f(s)` nhỏ nhất khỏi hàng đợi ưu tiên. Nếu đó là trạng thái đích, truy vết các trạng thái cha để trả về lời giải. Nếu không, sinh các trạng thái kế tiếp bằng mọi phép rót hợp lệ.

Cần lưu chi phí tốt nhất đã biết cho mỗi trạng thái. Nếu tìm thấy đường đi mới có `g` nhỏ hơn, phải cập nhật trạng thái và đưa bản ghi mới vào hàng đợi. Khi lấy một bản ghi khỏi hàng đợi, bỏ qua bản ghi lỗi thời nếu chi phí của nó không còn bằng chi phí tốt nhất hiện tại.

## 4. Heuristic

### 4.1. Heuristic cơ sở

Có thể bắt đầu với `h(s) = 0`. Trong trường hợp này, A* tương đương tìm kiếm theo chi phí đồng nhất (UCS); với chi phí mỗi bước bằng 1, hành vi tương đương BFS về thứ tự mở rộng theo độ sâu, tùy cách xử lý trạng thái trùng.

Đây là mốc cơ sở để kiểm tra tính đúng đắn của bộ giải trước khi thử heuristic phức tạp hơn.

### 4.2. CRMH — Color Run Merging Heuristic (ý tưởng đang khảo sát)

Định nghĩa một *run* là một nhóm màu liên tiếp giống nhau trong cùng một ống. Gọi `R_c(s)` là tổng số run của màu `c` trên tất cả các ống. Heuristic đang được khảo sát là:

\[
h_{\mathrm{CRMH}}(s)=\sum_c \max(0, R_c(s)-1)
\]

Công thức này ước lượng số nhóm màu dư thừa cần được hợp nhất. Đây là **heuristic ứng viên**, chưa được mặc định là admissible. Trước khi dùng để tuyên bố A* luôn tìm lời giải tối ưu, cần chứng minh rằng với mọi trạng thái `s`, `h(s)` không vượt quá chi phí tối ưu còn lại `h^*(s)`. Nếu chưa chứng minh được, chỉ nên báo cáo kết quả thực nghiệm và không khẳng định bảo đảm tối ưu.

### 4.3. RWSH — Relaxed Water Sort Heuristic (hướng nghiên cứu đề xuất)

Ý tưởng là định nghĩa một bài toán nới lỏng trong đó một nhóm màu liên tiếp có thể được chọn từ vị trí bất kỳ trong ống, không chỉ ở miệng ống, rồi chuyển sang ống khác nếu đủ sức chứa; sau khi lấy nhóm màu ra, các lớp còn lại trong ống nguồn được ghép lại theo quy ước của mô hình. Các thao tác trong bài toán nới lỏng có chi phí 1.

Gọi `d_R(s, G)` là số bước ít nhất từ `s` đến một trạng thái đích `G` trong đồ thị trạng thái nới lỏng. Khi đó:

\[
h_{\mathrm{RWSH}}(s)=d_R(s,G)
\]

Để RWSH là heuristic admissible cho bài toán gốc, cần bảo đảm mọi thao tác hợp lệ của bài toán gốc cũng là thao tác trong mô hình nới lỏng với cùng chi phí. Khi điều kiện này đúng, mọi đường đi hợp lệ của bài toán gốc đều tồn tại trong đồ thị nới lỏng; vì vậy khoảng cách tối ưu trong đồ thị nới lỏng không lớn hơn khoảng cách tối ưu của bài toán gốc.

Cần đặc tả rõ mô hình nới lỏng có hỗ trợ việc chuyển một phần nhóm màu khi ống đích chỉ còn chỗ cho một phần hay không. Nếu luật gốc cho phép chuyển một phần nhóm màu mà mô hình nới lỏng không mô phỏng được thao tác đó, lập luận admissibility ở trên không còn được bảo đảm.

RWSH hiện là tên làm việc cho hướng đề xuất này. Tính mới so với nghiên cứu trước chưa được xác nhận. Việc tính chính xác `d_R` cho từng trạng thái có thể tốn kém; cần đánh giá thời gian và bộ nhớ, đồng thời xem xét lưu đệm hoặc tiền tính toán.

## 5. Giả mã A*

```text
A_STAR(start):
    open_set = hàng đợi ưu tiên theo f
    g_score[start] = 0
    parent[start] = NONE
    push open_set (f = h(start), state = start, g = 0)

    while open_set không rỗng:
        current = pop phần tử có f nhỏ nhất

        if current.g != g_score[current.state]:
            continue  # bản ghi lỗi thời

        if IS_GOAL(current.state):
            return RECONSTRUCT_PATH(parent, current.state)

        for next_state in VALID_SUCCESSORS(current.state):
            tentative_g = g_score[current.state] + 1

            if next_state chưa có trong g_score
               hoặc tentative_g < g_score[next_state]:
                g_score[next_state] = tentative_g
                parent[next_state] = current.state
                next_f = tentative_g + h(next_state)
                push open_set (f = next_f,
                               state = next_state,
                               g = tentative_g)

    return FAILURE  # không tìm thấy lời giải trong không gian đã duyệt
```

`VALID_SUCCESSORS` phải tạo ra mọi trạng thái kế tiếp hợp lệ theo đúng luật đã định nghĩa. `RECONSTRUCT_PATH` truy vết `parent` từ trạng thái đích về trạng thái đầu rồi đảo ngược danh sách.

## 6. Biểu diễn trạng thái và tránh trạng thái trùng

Để tra cứu trạng thái hiệu quả, cần chuyển cấu hình các ống thành một khóa chuẩn hóa, ví dụ tuple của các tuple màu. Nếu các ống có thể hoán đổi cho nhau mà không làm thay đổi ý nghĩa trạng thái, có thể nghiên cứu chuẩn hóa thứ tự các ống để giảm trạng thái trùng; tuy nhiên, chỉ thực hiện khi chứng minh được phép chuẩn hóa bảo toàn luật chuyển và trạng thái đích.

Không nên dùng ký tự đầu của tên màu làm mã đại diện nếu nhiều màu có thể có cùng ký tự đầu. Hãy dùng mã màu duy nhất hoặc lưu nguyên giá trị màu trong khóa trạng thái.

## 7. Kế hoạch đánh giá thực nghiệm

So sánh tối thiểu các cấu hình sau:

1. BFS hoặc A* với `h = 0` làm mốc cơ sở.
2. A* + CRMH.
3. A* + RWSH, nếu mô hình và cách tính heuristic đã được cài đặt chính xác.
4. Có thể bổ sung các heuristic tham khảo từ tài liệu liên quan.

Với mỗi bộ test, ghi lại:

- Có tìm thấy lời giải hay không.
- Độ dài lời giải.
- Số trạng thái được mở rộng.
- Thời gian chạy.
- Bộ nhớ sử dụng.
- Thời gian tính heuristic riêng (nếu đo được).

Dùng cùng bộ test, cùng quy tắc rót, cùng điều kiện phần cứng và tiêu chí dừng cho các phương pháp. Trên các trường hợp nhỏ, dùng BFS hoặc phương pháp tối ưu độc lập để xác minh độ dài lời giải. Không chỉ báo cáo các trường hợp có lợi cho heuristic đề xuất; cần phân tích cả trường hợp không cải thiện hoặc thất bại.

## 8. Tiêu chí thành công

Đề xuất được xem là có cơ sở để phát triển tiếp khi:

- Mô hình bài toán và quy tắc rót được định nghĩa không mơ hồ.
- Bộ giải tìm được lời giải hợp lệ trên các trường hợp kiểm thử.
- Tính tối ưu được xác minh bằng chứng minh phù hợp hoặc đối chiếu với bộ giải tối ưu trên các trường hợp có thể kiểm tra.
- Heuristic được phân loại rõ: đã chứng minh admissible, đã chứng minh consistent, hay mới chỉ đánh giá thực nghiệm.
- Kết quả được tái lập và cho thấy rõ chi phí tính heuristic so với lợi ích tìm kiếm.

Không nên đặt trước mục tiêu rằng RWSH chắc chắn nhanh hơn. Đây là giả thuyết cần được kiểm tra bằng thực nghiệm.

## 9. Kết luận

A* là nền tảng phù hợp để khảo sát việc sử dụng heuristic cho Water Sort Puzzle. Lộ trình đề xuất là trước tiên hoàn thiện A* và kiểm tra bằng `h = 0`, sau đó đánh giá CRMH, rồi nghiên cứu RWSH với mô hình nới lỏng được định nghĩa chính xác. Đóng góp của đề tài cần được xác định dựa trên tính đúng đắn, kết quả thực nghiệm và đối chiếu tài liệu; chưa nên khẳng định tính mới trước khi hoàn thành các bước đó.

## 10. Tài liệu tham khảo khởi đầu

1. Takehiro Ito et al., “Sorting Balls and Water: Equivalence and Computational Complexity,” FUN 2022.  
   https://arxiv.org/abs/2202.09495

2. Emil Keyder, Jörg Hoffmann, Patrik Haslum, “Semi-Relaxed Plan Heuristics,” AAAI 2012.  
   https://ojs.aaai.org/index.php/AAAI/article/view/8434

3. Richard E. Korf and Ariel Felner, “Disjoint Pattern Database Heuristics,” *Artificial Intelligence*, 134 (2002).  
   https://doi.org/10.1016/S0004-3702(01)00092-3

4. Ariel Felner, Richard E. Korf, Sarit Hanan, “Additive Pattern Database Heuristics,” *Journal of Artificial Intelligence Research* (2004).  
   https://doi.org/10.1613/jair.1480

Các tài liệu trên là điểm bắt đầu cho tổng quan nghiên cứu, không phải bằng chứng rằng CRMH hoặc RWSH đã được xác nhận là mới.
