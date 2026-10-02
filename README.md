# PhotoLab – Phòng thí nghiệm nhiếp ảnh

Website học nhiếp ảnh tương tác bằng HTML, CSS, JavaScript thuần: không framework, không bước build, không cần server.
Nội dung bám theo cấu trúc 20 tuần của giáo trình *Digital Photography Complete Course* (DK).

## Triển khai lên GitHub Pages (miễn phí)

GitHub Pages miễn phí với repo **public** trên tài khoản GitHub Free. Repo private cần gói trả phí.

**Cách 1 – Tải lên qua trình duyệt**

1. Tạo repo mới trên GitHub, ví dụ `photolab`, để chế độ Public.
2. Chọn *Add file → Upload files*, kéo toàn bộ nội dung thư mục này vào: `index.html`, `.nojekyll`, các thư mục `css/`, `js/`, `scenes/` (thư mục `tools/` không bắt buộc). File `index.html` phải nằm ở gốc repo.
3. Vào *Settings → Pages*. Ở mục *Build and deployment*, chọn *Deploy from a branch*, nhánh `main`, thư mục `/ (root)`, rồi bấm *Save*.
4. Đợi 1–2 phút. Trang chạy tại `https://<tên-tài-khoản>.github.io/photolab/`.

Lưu ý: tệp `.nojekyll` bắt đầu bằng dấu chấm nên một số hệ điều hành ẩn nó đi. Nếu không tải được cũng không sao, trang vẫn chạy.

**Cách 2 – Dùng git**

```bash
cd photolab
git init
git add .
git commit -m "PhotoLab"
git branch -M main
git remote add origin https://github.com/<tên-tài-khoản>/photolab.git
git push -u origin main
```

Sau đó bật Pages như bước 3 ở trên.

## Cập nhật nội dung

Sửa file rồi đẩy lên lại là xong. GitHub Pages và trình duyệt có thể giữ bản cũ trong vài phút. Để học sinh thấy ngay bản mới, tăng số phiên bản trong `index.html`, ví dụ `?v=1` thành `?v=2` ở tất cả các dòng `<link>` và `<script>`.

## Ảnh thật trong Lab

Lab có hai nhóm cảnh:

- **Ảnh thật**: ảnh chụp thực tế, chia theo trong nhà/ngoài trời và thiếu/đủ/thừa sáng. Ảnh gốc được coi là phơi sáng chuẩn của cảnh; Lab mô phỏng phơi sáng, nhiễu, cân bằng trắng, vùng nét theo khẩu và khoảng lấy nét (dựa trên bản đồ độ sâu), nhòe chuyển động, lia máy, rung tay, flash, xóa phông kiểu điện thoại, méo và tối góc ống kính.
- **Cảnh dựng 2.5D**: 6 cảnh vẽ bằng vector, giữ lại để học những gì ảnh thật không làm được: đổi vị trí đứng (nén phối cảnh – Tuần 7), chủ thể chạy liên tục qua khung, vệt đèn xe dài.

Một tấm ảnh chỉ có một góc nhìn, nên với ảnh thật: zoom là cắt khung (không rộng hơn ảnh gốc), phối cảnh không đổi, và vùng đã cháy trắng trong ảnh gốc không lấy lại được khi giảm sáng.

### Repo đã có sẵn

4 gói cảnh mẫu (`demo-…`) làm từ ảnh thuộc phạm vi công cộng đi kèm thư viện scikit-image: chân dung phi hành gia (NASA), tách cà phê, mèo (CC0), bệ phóng tên lửa (SpaceX). Các ảnh này độ phân giải thấp (≤ 640 px), chỉ để Lab chạy được ngay.

### Tạo các gói cảnh từ danh mục ảnh

`scenes/catalog.json` liệt kê sẵn các ảnh miễn phí bản quyền đã chọn (bảng bên dưới). Chạy một lần trên máy của bạn (macOS/Linux, Python 3.9+):

```bash
pip3 install -r tools/requirements.txt
python3 tools/tao_goi_canh.py
```

Công cụ sẽ tự tải từng ảnh, đọc EXIF (khẩu, tốc độ, ISO, tiêu cự) để tính độ sáng của cảnh, ước lượng bản đồ độ sâu bằng mô hình MiDaS (tải khoảng 66 MB ở lần đầu, lưu ở `tools/models/`), tách vùng chủ thể, dựng nền phía sau chủ thể cho cảnh chuyển động, rồi ghi vào `scenes/<id>/` và cập nhật `scenes/index.json`. Mỗi ảnh mất khoảng 5–20 giây.

Sau đó commit thư mục `scenes/` lên GitHub là xong. Không đưa `tools/models/` lên (đã có trong `.gitignore`).

Các tùy chọn: `--only id1,id2` chỉ tạo vài cảnh, `--force` tạo lại cảnh đã có.

### Kiểm tra và sửa từng cảnh

Mở Lab, chọn từng ảnh và để ý:

- **Vùng chủ thể** (dùng cho nhòe chuyển động, lia máy, chế độ chân dung điện thoại) được tách tự động nên có thể lệch. Muốn sửa, vẽ một ảnh đen trắng cùng tỉ lệ (trắng = chủ thể) bằng Photopea, GIMP hay Photoshop, lưu thành `scenes/<id>/mask-tay.png`, rồi chạy `python3 tools/tao_goi_canh.py --only <id> --force`.
- **Khoảng cách** tới chủ thể (`subject.dist`) và tới hậu cảnh xa nhất (`bgDist`) trong `catalog.json` quyết định độ mờ khi mở khẩu. Đây là ước lượng của mình từ mô tả ảnh – nếu thấy hậu cảnh mờ quá hoặc nét quá, chỉnh lại rồi chạy lại cảnh đó.
- **Nhiệt độ màu** (`K`) và độ sáng (`ev`, nếu ảnh không có EXIF) cũng là ước lượng, chỉnh được tương tự.

### Thêm ảnh mới

Thêm một mục vào `scenes/catalog.json`. Trường `source` nhận:

- `{"type": "wordpress", "page": "https://wordpress.org/photos/photo/…/"}` – ảnh trong WordPress Photo Directory (CC0, có sẵn EXIF)
- `{"type": "pexels", "id": 1234567}` – số cuối trong link ảnh Pexels
- `{"type": "unsplash", "id": "abcDEF123"}` – mã cuối trong link ảnh Unsplash
- `{"type": "url", "url": "https://…/anh.jpg", "page": "…"}` hoặc `{"type": "file", "path": "anh/goc.jpg"}`

Chọn ảnh tốt cho Lab: **hậu cảnh còn nét** (chụp khẩu f/5.6 trở lên, hoặc ảnh điện thoại), **chủ thể chuyển động đã được đóng băng** (tốc độ 1/500 trở lên), **không cháy trắng** ở vùng quan trọng, ISO thấp. Lab chỉ làm mờ thêm được chứ không làm nét lại.

Ba ô còn trống trong danh mục (`"skip": true`) là chân dung ngoài trời có mặt người rõ, lớp học trong nhà và thể thao trong nhà – WordPress Photo Directory không nhận ảnh có khuôn mặt nhận diện được, nên các ô này cần chọn ảnh từ Pexels/Unsplash. Điền `source.id`, xóa dòng `"skip": true` rồi chạy lại công cụ.

### Giấy phép ảnh

- WordPress Photo Directory: CC0, không cần ghi công (Lab vẫn hiện tên tác giả và link gốc).
- Pexels, Unsplash: miễn phí sử dụng và chỉnh sửa, không bắt buộc ghi công; không được bán lại ảnh nguyên bản. Ảnh có người: tránh dùng theo cách gây hiểu lầm hoặc xúc phạm người trong ảnh.
- Lab hiện nguồn ảnh ngay dưới khung ngắm cho mọi ảnh thật.

### Danh mục ảnh đã chọn

| id | Cảnh | Điều kiện | Nguồn | Giấy phép |
|---|---|---|---|---|
| `bai-cat-trang` | Bãi cát trắng giữa trưa | Ngoài trời · Thừa sáng | [link](https://wordpress.org/photos/photo/33969819f3/) | CC0  |
| `nguoc-sang-mat-troi` | Ngược sáng: mặt trời sau lưng | Ngoài trời · Thừa sáng | [link](https://wordpress.org/photos/photo/8166a2391d/) | CC0  |
| `nuoc-bat-tung` | Nước bắn tung dưới nắng | Ngoài trời · Thừa sáng | [link](https://wordpress.org/photos/photo/78965c4fdd/) | CC0  |
| `bmx` | Biểu diễn xe đạp BMX | Ngoài trời · Đủ sáng | [link](https://wordpress.org/photos/photo/74067ab967/) | CC0  |
| `truot-van` | Trượt ván trên quảng trường | Ngoài trời · Đủ sáng | [link](https://wordpress.org/photos/photo/1156abdb1b/) | CC0  |
| `pho-ha-noi` | Phố Hà Nội giờ cao điểm | Ngoài trời · Đủ sáng | [link](https://wordpress.org/photos/photo/3567ab29ca/) | CC0  |
| `doi-nhin-thung-lung` | Trên đồi nhìn xuống thung lũng | Ngoài trời · Đủ sáng | [link](https://wordpress.org/photos/photo/7756aad041/) | CC0  |
| `hoang-hon-tren-nui` | Hoàng hôn trên núi | Ngoài trời · Thiếu sáng | [link](https://wordpress.org/photos/photo/726ab26475/) | CC0  |
| `hem-dem` | Con hẻm ban đêm | Ngoài trời · Thiếu sáng | [link](https://wordpress.org/photos/photo/4536785066/) | CC0  |
| `o-den-dem` | Phố treo ô phát sáng | Ngoài trời · Thiếu sáng | [link](https://wordpress.org/photos/photo/116694d051/) | CC0  |
| `nga-tu-chang-vang` | Ngã tư lúc chạng vạng | Ngoài trời · Thiếu sáng | [link](https://wordpress.org/photos/photo/8566a283d1/) | CC0  |
| `bo-canh-cung` | Bọ cánh cứng trên lá (macro) | Ngoài trời · Đủ sáng | [link](https://wordpress.org/photos/photo/808684ba64/) | CC0  |
| `nhom-sinh-vien` | Nhóm sinh viên ngoài trời | Ngoài trời · Đủ sáng | [link](https://www.pexels.com/photo/7973041/) | Giấy phép Pexels  |
| `goc-cafe-sang` | Góc quán sáng sủa | Trong nhà · Thừa sáng | [link](https://wordpress.org/photos/photo/5668dc86b5/) | CC0  |
| `hoa-lan` | Bình hoa lan trên bàn kính | Trong nhà · Đủ sáng | [link](https://wordpress.org/photos/photo/4066a2219a/) | CC0  |
| `hoi-truong` | Hội trường hội thảo | Trong nhà · Thiếu sáng | [link](https://wordpress.org/photos/photo/42665084e5/) | CC0  |
| `den-chum` | Đèn chùm trong phòng tối | Trong nhà · Thiếu sáng | [link](https://wordpress.org/photos/photo/36063626f6/) | CC0  |
| `ban-trang-tri-toi` | Bàn trang trí ánh sáng yếu | Trong nhà · Thiếu sáng | [link](https://wordpress.org/photos/photo/1186a269ac/) | CC0  |
| `ngon-nen` | Ngọn nến trong bóng tối | Trong nhà · Thiếu sáng | [link](https://wordpress.org/photos/photo/8106294884/) | CC0  |
| `hoa-nhac` | Đám đông ở buổi hòa nhạc | Trong nhà · Thiếu sáng | [link](https://unsplash.com/photos/gKgL1WlE5KM) | Giấy phép Unsplash  |
| `chan-dung-ngoai-troi` | Chân dung ngoài trời (cần chọn ảnh) | Ngoài trời · Đủ sáng | — | Giấy phép Pexels cần chọn ảnh |
| `lop-hoc` | Lớp học / nhóm trong nhà (cần chọn ảnh) | Trong nhà · Đủ sáng | — | Giấy phép Pexels cần chọn ảnh |
| `the-thao-trong-nha` | Thể thao trong nhà (cần chọn ảnh) | Trong nhà · Thiếu sáng | — | Giấy phép Pexels cần chọn ảnh |

Mình chọn ảnh qua mô tả và EXIF trên trang gốc, chưa xem được từng ảnh, nên hãy duyệt lại một lượt trong Lab sau khi tạo gói; ảnh nào chưa hợp thì thay bằng ảnh khác cùng điều kiện.

## Xem thử trên máy

Cảnh dựng 2.5D chạy được khi mở thẳng `index.html`. **Ảnh thật cần chạy qua máy chủ web** (trình duyệt chặn đọc file khi mở trực tiếp), nên khi thử trên máy hãy dùng:

```bash
python3 -m http.server 8000
# mở http://localhost:8000
```

## Cấu trúc

```
index.html        khung trang, nạp CSS và JS
.nojekyll         báo GitHub Pages phục vụ file tĩnh nguyên trạng
css/styles.css    giao diện xám trung tính, khung ngắm DSLR/EVF/điện thoại
js/util.js        tiện ích: dãy khẩu/tốc độ/ISO, thấu kính mỏng, vòng mờ, độ sâu trường ảnh, Kelvin → RGB
js/data.js        dữ liệu: cảm biến, thân máy, 13 ống kính, 4 điện thoại, cảnh, cân bằng trắng, kính lọc,
                  từ điển ký hiệu ống kính các hãng, loại ống kính, 20 tuần, câu hỏi ôn tập
js/scenes.js      6 cảnh dựng bằng các lớp phẳng ở các độ sâu khác nhau
js/photo.js       bộ dựng ảnh thật: cắt khung theo tiêu cự, làm mờ theo bản đồ độ sâu, nhòe chuyển động/lia máy,
                  vùng sáng vượt trắng thành bokeh, flash theo khoảng cách
scenes/           các gói cảnh ảnh thật (mỗi cảnh một thư mục) + index.json + catalog.json
tools/            công cụ Python tạo gói cảnh (chỉ chạy trên máy bạn, không cần đưa lên GitHub)
js/engine.js      bộ dựng ảnh: phối cảnh, mờ DoF/chuyển động/rung tay, bokeh, vệt đèn, flash, đo sáng,
                  tráng ảnh (phơi sáng, cân bằng trắng, nhiễu, HDR, méo/viền màu/tối góc), histogram
js/sim.js         logic máy ảnh: Auto/P/A/S/M, ISO tự động, AF-S/AF-C/MF, Pro mode điện thoại,
                  giao diện Lab, chụp – xem lại – cuộn phim – so sánh, thẻ "Vì sao ảnh trông như vậy"
js/pages.js       trang Ống kính, Lý thuyết, Thử thách (14 bài tự chấm), Lộ trình 20 tuần, Ôn tập
```

Các file JS phải nạp đúng thứ tự như trong `index.html` vì file sau dùng biến của file trước.

## Thêm nội dung

- **Điện thoại mới**: thêm một mục vào `PHONES` trong `js/data.js` (tiêu cự tương đương, khẩu, cảm biến, dải Pro mode).
- **Ống kính mới**: thêm vào `LENSES` (dải tiêu cự, khẩu theo tiêu cự, khoảng lấy nét gần nhất, méo, tối góc, số lá khẩu).
- **Thử thách mới**: thêm vào mảng `CH` trong `js/pages.js`, gồm `p` (máy và cảnh mở sẵn), hàm `ck` chấm ảnh và `hint` gợi ý.
- **Câu hỏi**: thêm vào `QUIZ` trong `js/data.js` (tuần, câu hỏi, đáp án, giải thích).

## Dữ liệu học sinh

Tiến độ thử thách, tuần đã học và điểm ôn tập lưu trong `localStorage` của từng trình duyệt (khóa `photolab:*`).
Không có tài khoản hay máy chủ: đổi máy hoặc xóa dữ liệu trình duyệt thì tiến độ bắt đầu lại.

## Giới hạn của mô phỏng

Hình ảnh dùng mô hình quang học đơn giản (thấu kính mỏng, vòng mờ, nhiễu photon và nhiễu đọc) trên cảnh 2.5D vẽ bằng vector.
Đủ để thấy đúng xu hướng – khẩu với vùng nét, tốc độ với độ nhòe, ISO với nhiễu, tiêu cự và vị trí đứng với phối cảnh,
đồng hồ đo sáng bị đánh lừa – nhưng không thay được ảnh chụp thật. Thông số điện thoại theo công bố của hãng (2025–2026);
dải chỉnh trong chế độ Pro là gần đúng.
