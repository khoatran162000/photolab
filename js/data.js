/* ===== PhotoLab · dữ liệu ===== */
'use strict';
const D = (() => {
  const SENSORS = {
    FF:   { id: 'FF', name: 'Full-frame 35mm', w: 36, h: 24 },
    APSC: { id: 'APSC', name: 'APS-C', w: 23.5, h: 15.6 },
    MFT:  { id: 'MFT', name: 'Micro Four Thirds', w: 17.3, h: 13 },
    ONE:  { id: 'ONE', name: '1 inch', w: 13.2, h: 8.8 },
    P13:  { id: 'P13', name: '1/1.3″', w: 9.6, h: 7.2 },
    P128: { id: 'P128', name: '1/1.28″', w: 9.8, h: 7.35 },
    P156: { id: 'P156', name: '1/1.56″', w: 8.2, h: 6.15 },
    P25:  { id: 'P25', name: '1/2.5″', w: 5.76, h: 4.32 },
    P255: { id: 'P255', name: '1/2.55″', w: 5.6, h: 4.2 },
    P306: { id: 'P306', name: '1/3.06″', w: 4.7, h: 3.52 },
    P394: { id: 'P394', name: '1/3.94″', w: 3.66, h: 2.74 },
    P5:   { id: 'P5', name: '1/5″', w: 2.88, h: 2.16 }
  };
  const FF_DIAG = Math.hypot(36, 24);
  for (const k in SENSORS) {
    const s = SENSORS[k]; s.diag = Math.hypot(s.w, s.h); s.crop = FF_DIAG / s.diag; s.area = s.w * s.h;
  }

  /* ---------- Thân máy ---------- */
  const BODIES = [
    { id: 'dslr_apsc', kind: 'dslr', name: 'DSLR APS-C', ref: 'Tham khảo: Canon EOS 90D, Nikon D7500', sensor: 'APSC',
      iso: [100, 25600], shutter: [1 / 8000, 30], ibis: 0, fps: 10, sync: 1 / 250, popup: 12, mp: 32,
      note: 'Kính ngắm quang học (OVF): bạn nhìn qua gương lật và lăng kính nên thấy cảnh như mắt thường – không thấy trước độ sáng, nhiễu hay cân bằng trắng cho tới khi chụp hoặc bật Live View.' },
    { id: 'dslr_ff', kind: 'dslr', name: 'DSLR Full-frame', ref: 'Tham khảo: Canon EOS 5D Mark IV, Nikon D850', sensor: 'FF',
      iso: [100, 25600], shutter: [1 / 8000, 30], ibis: 0, fps: 7, sync: 1 / 200, popup: 0, mp: 45,
      note: 'Cảm biến lớn cho dải tương phản động rộng, ít nhiễu ở ISO cao. Thân máy chuyên nghiệp thường không có đèn flash cóc.' },
    { id: 'ml_apsc', kind: 'ml', name: 'Mirrorless APS-C', ref: 'Tham khảo: Fujifilm X-T5, Sony a6700', sensor: 'APSC',
      iso: [100, 25600], shutter: [1 / 8000, 30], ibis: 5, fps: 15, sync: 1 / 250, popup: 0, mp: 26,
      note: 'Kính ngắm điện tử (EVF) lấy hình trực tiếp từ cảm biến: thấy trước độ sáng, cân bằng trắng, có zebra và focus peaking. Chống rung trên thân (IBIS).' },
    { id: 'ml_ff', kind: 'ml', name: 'Mirrorless Full-frame', ref: 'Tham khảo: Sony A7 IV, Canon EOS R6 Mark II, Nikon Z6III', sensor: 'FF',
      iso: [100, 51200], shutter: [1 / 8000, 30], ibis: 5, fps: 20, sync: 1 / 250, popup: 0, mp: 33,
      note: 'Kết hợp cảm biến lớn với EVF và lấy nét nhận diện mắt. Không có gương lật nên thân máy gọn hơn DSLR.' }
  ];

  /* ---------- Ống kính cho máy ảnh ---------- */
  // fr: dải tiêu cự; nw: khẩu lớn nhất ở đầu rộng/tele; nmin: khẩu nhỏ nhất; mfd: khoảng lấy nét gần nhất (m, từ cảm biến)
  // mag: độ phóng đại tối đa (ở tiêu cự dài nhất); is: số stop chống rung; dist: méo (dương = phình/barrel) ở đầu rộng/tele
  const LENSES = [
    { id: 'kit', format: 'APSC', name: 'Kit 18–55mm f/3.5–5.6 IS', mark: '18-55mm 1:3.5-5.6 IS', fr: [18, 55], nw: [3.5, 5.6], nmin: [22, 36], mfd: 0.25, mag: 0.36, is: 4, blades: 7, dist: [0.05, -0.012], vig: 0.55, ca: 0.55, filter: 58, weight: 215, type: 'Zoom tiêu chuẩn (kit)',
      about: 'Ống kính đi kèm máy. Nhẹ, đa dụng nhưng khẩu độ nhỏ nên khó xóa phông và yếu trong thiếu sáng.' },
    { id: 'uw1018', format: 'APSC', name: '10–18mm f/4.5–5.6 IS', mark: '10-18mm 1:4.5-5.6 IS', fr: [10, 18], nw: [4.5, 5.6], nmin: [22, 29], mfd: 0.22, mag: 0.15, is: 4, blades: 7, dist: [0.075, 0.025], vig: 0.6, ca: 0.6, filter: 67, weight: 240, type: 'Zoom siêu rộng',
      about: 'Tương đương 15–27 mm trên full-frame. Dành cho phong cảnh, nội thất, kiến trúc.' },
    { id: 'tele55250', format: 'APSC', name: '55–250mm f/4–5.6 IS', mark: '55-250mm 1:4-5.6 IS', fr: [55, 250], nw: [4, 5.6], nmin: [22, 32], mfd: 0.85, mag: 0.29, is: 4, blades: 7, dist: [-0.004, -0.02], vig: 0.45, ca: 0.5, filter: 58, weight: 375, type: 'Zoom tele (kit thứ hai)',
      about: 'Tương đương 88–400 mm. Rẻ, nhẹ, đủ dùng cho thể thao ban ngày và động vật.' },
    { id: 'super18200', format: 'APSC', name: '18–200mm f/3.5–6.3 OS (superzoom)', mark: '18-200mm 1:3.5-6.3 OS', fr: [18, 200], nw: [3.5, 6.3], nmin: [22, 40], mfd: 0.39, mag: 0.33, is: 4, blades: 7, dist: [0.065, -0.03], vig: 0.65, ca: 0.95, filter: 62, weight: 430, type: 'Superzoom du lịch',
      about: 'Một ống kính cho mọi thứ. Đánh đổi: méo hình rõ, viền màu, khẩu độ nhỏ ở đầu tele.' },
    { id: 'p50', format: 'FF', name: '50mm f/1.8', mark: '50mm 1:1.8', fr: [50, 50], nw: [1.8, 1.8], nmin: [22, 22], mfd: 0.35, mag: 0.21, is: 0, blades: 7, dist: [0.006, 0.006], vig: 0.7, ca: 0.4, filter: 49, weight: 160, type: 'Prime tiêu chuẩn',
      about: '“Nifty fifty”: rẻ, sáng, nhẹ. Trên APS-C tương đương 75–80 mm – một ống chân dung tốt.' },
    { id: 'p85', format: 'FF', name: '85mm f/1.4', mark: '85mm 1:1.4', fr: [85, 85], nw: [1.4, 1.4], nmin: [16, 16], mfd: 0.85, mag: 0.12, is: 0, blades: 9, dist: [-0.003, -0.003], vig: 0.8, ca: 0.35, filter: 77, weight: 640, type: 'Prime tele ngắn (chân dung)',
      about: 'Tiêu cự chân dung kinh điển: nén nhẹ phối cảnh, khuôn mặt cân đối, nền mờ rất mịn.' },
    { id: 'z2470', format: 'FF', name: '24–70mm f/2.8', mark: '24-70mm 1:2.8', fr: [24, 70], nw: [2.8, 2.8], nmin: [22, 22], mfd: 0.38, mag: 0.21, is: 0, blades: 9, dist: [0.035, -0.012], vig: 0.6, ca: 0.3, filter: 82, weight: 900, type: 'Zoom tiêu chuẩn chuyên nghiệp',
      about: 'Ống “ngựa thồ” của dân sự kiện, cưới hỏi: khẩu f/2.8 không đổi suốt dải zoom.' },
    { id: 'z70200', format: 'FF', name: '70–200mm f/2.8 IS', mark: '70-200mm 1:2.8 IS', fr: [70, 200], nw: [2.8, 2.8], nmin: [32, 32], mfd: 1.0, mag: 0.21, is: 5, blades: 9, dist: [-0.008, -0.018], vig: 0.5, ca: 0.25, filter: 77, weight: 1070, type: 'Zoom tele chuyên nghiệp',
      about: 'Thể thao, sân khấu, chân dung nén nền. Nặng – nên có chân tripod collar khi dùng chân máy.' },
    { id: 'z100400', format: 'FF', name: '100–400mm f/4.5–5.6 IS', mark: '100-400mm 1:4.5-5.6 IS', fr: [100, 400], nw: [4.5, 5.6], nmin: [32, 40], mfd: 0.98, mag: 0.31, is: 5, blades: 9, dist: [-0.01, -0.016], vig: 0.4, ca: 0.3, filter: 77, weight: 1570, type: 'Zoom siêu tele',
      about: 'Chim, động vật hoang dã, thể thao từ xa. Cần tốc độ nhanh hơn tiêu cự (1/500 s ở 400 mm) hoặc chống rung.' },
    { id: 'z1635', format: 'FF', name: '16–35mm f/4 IS', mark: '16-35mm 1:4 IS', fr: [16, 35], nw: [4, 4], nmin: [22, 22], mfd: 0.28, mag: 0.23, is: 4, blades: 9, dist: [0.05, 0.005], vig: 0.6, ca: 0.35, filter: 77, weight: 615, type: 'Zoom siêu rộng',
      about: 'Phong cảnh, kiến trúc, nội thất. Đứng gần tiền cảnh để tạo chiều sâu; cẩn thận đường thẳng đứng hội tụ khi ngửa máy.' },
    { id: 'fish15', format: 'FF', name: 'Fisheye 15mm f/2.8', mark: 'FISHEYE 15mm 1:2.8', fr: [15, 15], nw: [2.8, 2.8], nmin: [22, 22], mfd: 0.2, mag: 0.14, is: 0, blades: 7, dist: [0, 0], fisheye: true, vig: 0.4, ca: 0.5, filter: 0, weight: 330, type: 'Mắt cá chéo 180°',
      about: 'Góc nhìn chéo 180°: mọi đường thẳng không đi qua tâm đều bị bẻ cong. Hiệu chỉnh ống kính không “nắn” được kiểu méo này.' },
    { id: 'macro100', format: 'FF', name: 'Macro 100mm f/2.8 IS 1:1', mark: 'MACRO 100mm 1:2.8 IS 1:1', fr: [100, 100], nw: [2.8, 2.8], nmin: [32, 32], mfd: 0.30, mag: 1.0, is: 4, blades: 9, dist: [0, 0], vig: 0.4, ca: 0.2, filter: 67, weight: 625, type: 'Macro 1:1',
      about: 'Phóng đại 1:1 (vật hiện trên cảm biến đúng kích thước thật). Khoảng làm việc dài, không làm côn trùng sợ.' },
    { id: 'ts24', format: 'FF', name: 'Tilt-shift 24mm f/3.5', mark: 'TS 24mm 1:3.5', fr: [24, 24], nw: [3.5, 3.5], nmin: [22, 22], mfd: 0.21, mag: 0.34, is: 0, blades: 8, dist: [0.01, 0.01], vig: 0.5, ca: 0.3, filter: 82, weight: 780, mfOnly: true, tilt: true, type: 'Tilt-shift',
      about: 'Nghiêng (tilt) làm mặt phẳng nét bị nghiêng – tạo hiệu ứng “mô hình thu nhỏ” khi đảo chiều. Chỉ lấy nét tay.' }
  ];

  /* ---------- Điện thoại ---------- */
  // feq: tiêu cự tương đương FF; N: khẩu (cố định) hoặc Ns: danh sách khẩu; sensor: mã cảm biến; crop: thêm hệ số cắt (zoom số học)
  const PHONES = [
    { id: 's26u', kind: 'phone', brand: 'samsung', name: 'Galaxy S26 Ultra', ref: 'Samsung · 2026 · chế độ Chuyên nghiệp (Pro)',
      cams: [
        { id: 'uw', label: '0.6', feq: 13, N: 1.9, sensor: 'P25', mp: 50, mfd: 0.025, mag: 0.4, ois: 0, af: true },
        { id: 'w', label: '1', feq: 23, N: 1.4, sensor: 'P13', mp: 200, mfd: 0.12, mag: 0.12, ois: 3, af: true, main: true },
        { id: 't3', label: '3', feq: 69, N: 2.4, sensor: 'P394', mp: 12, mfd: 0.4, mag: 0.1, ois: 3, af: true },
        { id: 't5', label: '5', feq: 115, N: 2.9, sensor: 'P25', mp: 50, mfd: 0.5, mag: 0.14, ois: 3, af: true }
      ],
      pro: { label: 'Chuyên nghiệp|Pro', iso: [50, 3200], shutter: [1 / 12000, 30], ev: 2, wb: [2300, 10000], isoManual: true, apMode: 'fixed', proCams: ['uw', 'w', 't3', 't5'], samsungRule: true },
      note: 'Khẩu độ trên điện thoại Samsung là cố định – trong chế độ Pro bạn điều khiển ISO, tốc độ, EV, cân bằng trắng (K) và lấy nét tay. Thông số Pro mode là mô phỏng gần đúng, có thể khác theo phần mềm.' },
    { id: 'a57', kind: 'phone', brand: 'samsung', name: 'Galaxy A57', ref: 'Samsung · 2026 · tầm trung',
      cams: [
        { id: 'uw', label: '0.6', feq: 13, N: 2.2, sensor: 'P306', mp: 12, mfd: 0.3, mag: 0.05, ois: 0, af: false },
        { id: 'w', label: '1', feq: 23, N: 1.8, sensor: 'P156', mp: 50, mfd: 0.12, mag: 0.1, ois: 3, af: true, main: true },
        { id: 'macro', label: 'Macro', feq: 25, N: 2.4, sensor: 'P5', mp: 5, mfd: 0.04, mag: 0.6, ois: 0, af: false, fixedFocus: 0.04 }
      ],
      pro: { label: 'Chuyên nghiệp|Pro', iso: [50, 3200], shutter: [1 / 6000, 30], ev: 2, wb: [2300, 10000], isoManual: true, apMode: 'fixed', proCams: ['uw', 'w'], samsungRule: true },
      note: 'Camera góc siêu rộng lấy nét cố định; camera macro 5 MP lấy nét cố định ở ~4 cm. Không có tele quang học – “2x” là cắt ảnh từ camera chính.' },
    { id: 'ip18p', kind: 'phone', brand: 'apple', name: 'iPhone 18 Pro', ref: 'Apple · 2026 · Pro controls + khẩu độ thay đổi',
      cams: [
        { id: 'uw', label: '0.5', feq: 13, N: 2.2, sensor: 'P255', mp: 48, mfd: 0.02, mag: 0.5, ois: 0, af: true },
        { id: 'w', label: '1', feq: 24, Ns: [1.48, 1.8, 2.8, 4.0], N: 1.8, sensor: 'P128', mp: 48, mfd: 0.15, mag: 0.1, ois: 4, af: true, main: true },
        { id: 't4', label: '4', feq: 100, N: 2.8, sensor: 'P255', mp: 48, mfd: 0.2, mag: 0.25, ois: 4, af: true },
        { id: 't8', label: '8', feq: 200, N: 2.8, sensor: 'P255', crop: 2, mp: 12, mfd: 0.2, mag: 0.5, ois: 4, af: true }
      ],
      pro: { label: 'Điều khiển Pro|Pro controls', iso: [32, 3072], shutter: [1 / 8000, 1], ev: 2, wb: [2500, 10000], isoManual: false, apMode: 'list', proCams: ['uw', 'w', 't4', 't8'] },
      third: { label: 'App bên thứ ba|Manual ISO', iso: [32, 3072], shutter: [1 / 8000, 1], ev: 0, wb: [2500, 10000], isoManual: true, apMode: 'list', proCams: ['uw', 'w', 't4', 't8'] },
      note: 'Lần đầu iPhone có khẩu độ cơ học: 4 nấc f/1.48 – f/1.8 – f/2.8 – f/4.0 trên camera chính (Pro controls: khẩu, tốc độ, cân bằng trắng, biểu đồ histogram; ISO do máy tự chọn). 8x là cắt giữa cảm biến tele 4x.' },
    { id: 'ip17', kind: 'phone', brand: 'apple', name: 'iPhone 17', ref: 'Apple · 2025 · bản tiêu chuẩn',
      cams: [
        { id: 'uw', label: '0.5', feq: 13, N: 2.2, sensor: 'P255', mp: 48, mfd: 0.02, mag: 0.5, ois: 0, af: true },
        { id: 'w', label: '1', feq: 26, N: 1.6, sensor: 'P156', mp: 48, mfd: 0.15, mag: 0.1, ois: 4, af: true, main: true },
        { id: 'w2', label: '2', feq: 52, N: 1.6, sensor: 'P156', crop: 2, mp: 12, mfd: 0.15, mag: 0.2, ois: 4, af: true }
      ],
      pro: null,
      third: { label: 'App bên thứ ba|Halide, Lightroom…', iso: [32, 3072], shutter: [1 / 8000, 1], ev: 0, wb: [2500, 10000], isoManual: true, apMode: 'fixed', proCams: ['uw', 'w', 'w2'] },
      note: 'Ứng dụng Camera gốc không cho chỉnh tốc độ màn trập hay ISO – chỉ có bù sáng (EV) và Photographic Styles. Muốn chỉnh tay phải dùng app bên thứ ba. “2x” là cắt từ cảm biến 48 MP.' }
  ];

  /* ---------- Cảnh (thông số ánh sáng; hình vẽ ở scenes.js) ---------- */
  const SCENES_META = [
    { id: 'portrait', trim: { evaluative: 0.24, center: -0.89, spot: 0 }, name: 'Chân dung ngược sáng', place: 'Vườn cà phê lúc hoàng hôn', ev: 10.3, K: 4300, D: 2.5, Drange: [0.6, 15], camY: 1.55, week: 6,
      teach: 'Xóa phông, bokeh từ dây đèn, nén phối cảnh bằng tele, đo sáng bị lừa khi trời sau lưng sáng, đèn flash bù sáng.' },
    { id: 'street', trim: { evaluative: -0.2, center: -0.21, spot: 0 }, name: 'Xe máy trên phố', place: 'Phố cổ ban ngày', ev: 14, K: 5600, D: 8, Drange: [3, 30], camY: 1.4, week: 11, moving: true,
      teach: 'Đóng băng chuyển động, lia máy (panning), AF-S và AF-C khi xe chạy về phía máy.' },
    { id: 'landscape', trim: { evaluative: -0.13, center: -0.33, spot: 0 }, name: 'Thác nước vùng núi', place: 'Trời nhiều mây sáng', ev: 13, K: 6300, D: 25, Drange: [8, 80], camY: 1.6, week: 8,
      teach: 'Độ sâu trường ảnh lớn, khoảng siêu tiêu (hyperfocal), nước mượt bằng tốc độ chậm + kính ND, kính GND cân bầu trời.' },
    { id: 'night', trim: { evaluative: 1.94, center: 0.22, spot: 0 }, name: 'Phố đêm', place: 'Ngã tư có đèn đường', ev: 6, K: 3400, D: 10, Drange: [4, 30], camY: 1.5, week: 18, moving: true,
      teach: 'ISO cao và nhiễu, vệt đèn xe với phơi sáng dài, tripod, đo sáng cảnh tối.' },
    { id: 'indoor', trim: { evaluative: -0.97, center: -1.14, spot: 0 }, name: 'Tĩnh vật đèn sợi đốt', place: 'Bàn gỗ trong phòng', ev: 7, K: 2800, D: 1.5, Drange: [0.6, 4], camY: 1.05, week: 15,
      teach: 'Cân bằng trắng (Kelvin), bảng màu chuẩn, chế độ ảnh (Picture Style), ánh sáng yếu trong nhà.' },
    { id: 'macro', trim: { evaluative: -1.28, center: -1.15, spot: 0 }, name: 'Bọ rùa trên hoa', place: 'Vườn buổi sáng', ev: 13.3, K: 5500, D: 0.4, Drange: [0.04, 2], camY: 0, week: 10,
      teach: 'Độ phóng đại, khoảng lấy nét tối thiểu, DoF cực mỏng, rung máy khi phóng đại lớn.' }
  ];

  const WB_PRESETS = [
    { id: 'auto', name: 'Tự động (AWB)', K: null },
    { id: 'day', name: 'Ánh nắng', K: 5200 },
    { id: 'cloud', name: 'Trời mây', K: 6000 },
    { id: 'shade', name: 'Bóng râm', K: 7000 },
    { id: 'tung', name: 'Đèn sợi đốt', K: 3200 },
    { id: 'fluo', name: 'Huỳnh quang', K: 4000 },
    { id: 'flash', name: 'Flash', K: 5500 },
    { id: 'k', name: 'Nhiệt độ màu (K)', K: 0 }
  ];

  const KELVIN_POINTS = [
    { K: 1850, name: 'Nến' }, { K: 3000, name: 'Đèn sợi đốt' }, { K: 4000, name: 'Huỳnh quang' },
    { K: 5000, name: 'Nắng' }, { K: 5500, name: 'Flash' }, { K: 6000, name: 'Trời mây' },
    { K: 7000, name: 'Bóng râm' }, { K: 10000, name: 'Trời xanh' }
  ];

  const STYLES = [
    { id: 'std', name: 'Chuẩn', c: 0.08, s: 1.08 },
    { id: 'land', name: 'Phong cảnh', c: 0.15, s: 1.28, gb: 1.1 },
    { id: 'port', name: 'Chân dung', c: 0.0, s: 1.0, warm: 1.03, soft: 1 },
    { id: 'neu', name: 'Trung tính', c: -0.06, s: 0.88 },
    { id: 'mono', name: 'Đơn sắc', c: 0.1, s: 0, mono: [0.2126, 0.7152, 0.0722] },
    { id: 'monoY', name: 'Đơn sắc + kính vàng', c: 0.12, s: 0, mono: [0.35, 0.6, 0.05] },
    { id: 'monoR', name: 'Đơn sắc + kính đỏ', c: 0.16, s: 0, mono: [0.75, 0.25, 0.0] }
  ];

  const FILTERS = [
    { id: 'none', name: 'Không', stops: 0 },
    { id: 'cpl', name: 'Phân cực (CPL)', stops: 1.5, cpl: true },
    { id: 'gnd', name: 'GND 3 stop (nửa trên tối)', stops: 0, gnd: 3 },
    { id: 'nd3', name: 'ND8 (3 stop)', stops: 3 },
    { id: 'nd6', name: 'ND64 (6 stop)', stops: 6 },
    { id: 'nd10', name: 'ND1000 (10 stop)', stops: 10 }
  ];

  /* ---------- Từ điển ký hiệu ống kính ---------- */
  const BRANDS = [
    { id: 'canon', re: /\bcanon\b/i, name: 'Canon' },
    { id: 'nikon', re: /\bnikon\b|\bnikkor\b/i, name: 'Nikon' },
    { id: 'sony', re: /\bsony\b/i, name: 'Sony' },
    { id: 'fuji', re: /\bfuji(film)?\b|\bfujinon\b/i, name: 'Fujifilm' },
    { id: 'sigma', re: /\bsigma\b/i, name: 'Sigma' },
    { id: 'tamron', re: /\btamron\b/i, name: 'Tamron' },
    { id: 'om', re: /\bolympus\b|\bom system\b|\bzuiko\b/i, name: 'OM System / Olympus' },
    { id: 'pana', re: /\bpanasonic\b|\blumix\b/i, name: 'Panasonic' }
  ];
  // [mã, hãng (null = chung), ý nghĩa]
  const CODES = [
    ['EF', 'canon', 'Ngàm EF – ống kính cho DSLR full-frame của Canon (dùng được cả trên thân APS-C).'],
    ['EF-S', 'canon', 'Ngàm EF-S – thiết kế riêng cho DSLR APS-C của Canon, vòng tròn ảnh nhỏ hơn.'],
    ['RF', 'canon', 'Ngàm RF – mirrorless full-frame của Canon.'],
    ['RF-S', 'canon', 'RF-S – ống kính mirrorless cho cảm biến APS-C của Canon.'],
    ['L', 'canon', 'Dòng L (“Luxury”) – dòng chuyên nghiệp cao cấp, viền đỏ, chống chịu thời tiết.'],
    ['IS', 'canon', 'Image Stabilizer – chống rung quang học trong ống kính.'],
    ['USM', 'canon', 'Ultrasonic Motor – mô-tơ lấy nét siêu âm, nhanh và êm.'],
    ['STM', 'canon', 'Stepping Motor – mô-tơ bước, rất êm, hợp quay video.'],
    ['NANO', 'canon', 'Nano USM – mô-tơ kết hợp tốc độ của USM và độ êm của STM.'],
    ['DO', 'canon', 'Diffractive Optics – thấu kính nhiễu xạ giúp ống tele gọn nhẹ hơn.'],
    ['TS-E', 'canon', 'Tilt-Shift – ống kính nghiêng/dịch quang học, lấy nét tay.'],
    ['AF-S', 'nikon', 'Ống kính có mô-tơ Silent Wave tích hợp – lấy nét tự động trên mọi thân Nikon.'],
    ['AF-P', 'nikon', 'Mô-tơ bước (Pulse motor) – rất êm, hợp quay phim.'],
    ['DX', 'nikon', 'Thiết kế cho cảm biến APS-C (Nikon gọi là DX), hệ số cắt 1.5x.'],
    ['FX', 'nikon', 'Định dạng full-frame của Nikon.'],
    ['Z', 'nikon', 'Ngàm Z – mirrorless của Nikon.'],
    ['NIKKOR', 'nikon', 'Tên thương hiệu ống kính của Nikon.'],
    ['VR', 'nikon', 'Vibration Reduction – chống rung quang học.'],
    ['ED', null, 'Extra-low Dispersion – thấu kính tán sắc thấp, giảm viền màu (quang sai màu).'],
    ['G', 'nikon', 'Loại G – không có vòng khẩu độ, khẩu do thân máy điều khiển.'],
    ['E', 'nikon', 'Loại E – khẩu độ điều khiển điện từ, chính xác khi chụp liên tiếp.'],
    ['N', 'nikon', 'Nano Crystal Coat – lớp phủ giảm lóa và bóng ma.'],
    ['S', 'nikon', 'S-Line – dòng ống kính Z cao cấp về chất lượng quang học.'],
    ['MICRO', 'nikon', 'Nikon gọi ống macro là “Micro” – phóng đại tới 1:1.'],
    ['PC-E', 'nikon', 'Perspective Control – ống tilt-shift của Nikon.'],
    ['FE', 'sony', 'Ống kính ngàm E cho cảm biến full-frame của Sony.'],
    ['E', 'sony', 'Ngàm E – nếu không có chữ F thì thiết kế cho cảm biến APS-C.'],
    ['OSS', 'sony', 'Optical SteadyShot – chống rung quang học.'],
    ['G', 'sony', 'Dòng G – dòng chất lượng cao của Sony.'],
    ['GM', 'sony', 'G Master – dòng cao cấp nhất của Sony, tối ưu độ nét và bokeh.'],
    ['PZ', null, 'Power Zoom – zoom bằng mô-tơ, mượt khi quay video.'],
    ['ZA', 'sony', 'Thiết kế hợp tác với Zeiss.'],
    ['XF', 'fuji', 'Dòng XF – ống kính cao cấp của Fujifilm (thân kim loại, thường có vòng khẩu).'],
    ['XC', 'fuji', 'Dòng XC – dòng phổ thông, gọn nhẹ, giá mềm.'],
    ['R', 'fuji', 'Có vòng chỉnh khẩu độ (Ring) trên thân ống kính.'],
    ['LM', 'fuji', 'Linear Motor – mô-tơ tuyến tính, lấy nét nhanh và êm.'],
    ['WR', null, 'Weather Resistant – chống bụi và ẩm.'],
    ['OIS', null, 'Optical Image Stabilization – chống rung quang học.'],
    ['DG', 'sigma', 'Sigma DG – thiết kế cho full-frame.'],
    ['DC', 'sigma', 'Sigma DC – thiết kế cho APS-C.'],
    ['DN', 'sigma', 'Sigma DN – thiết kế cho máy mirrorless.'],
    ['HSM', 'sigma', 'Hyper Sonic Motor – mô-tơ siêu âm của Sigma.'],
    ['OS', 'sigma', 'Optical Stabilizer – chống rung quang học.'],
    ['ART', 'sigma', 'Dòng Art – ưu tiên chất lượng quang học, thường là khẩu lớn.'],
    ['CONTEMPORARY', 'sigma', 'Dòng Contemporary – gọn nhẹ, cân bằng giá và chất lượng.'],
    ['SPORTS', 'sigma', 'Dòng Sports – tele cho thể thao, động vật, chống chịu tốt.'],
    ['DI', 'tamron', 'Di – thiết kế cho full-frame (dùng được cả APS-C).'],
    ['DI II', 'tamron', 'Di II – thiết kế cho DSLR APS-C.'],
    ['DI III', 'tamron', 'Di III – thiết kế cho mirrorless full-frame.'],
    ['DI III-A', 'tamron', 'Di III-A – thiết kế cho mirrorless APS-C.'],
    ['VC', 'tamron', 'Vibration Compensation – chống rung quang học.'],
    ['USD', 'tamron', 'Ultrasonic Silent Drive – mô-tơ siêu âm.'],
    ['VXD', 'tamron', 'Voice-coil eXtreme-torque Drive – mô-tơ cuộn dây, lấy nét rất nhanh.'],
    ['RXD', 'tamron', 'Rapid eXtra-silent stepping Drive – mô-tơ bước êm.'],
    ['G2', 'tamron', 'Generation 2 – phiên bản thế hệ thứ hai.'],
    ['M.ZUIKO', 'om', 'Thương hiệu ống kính Micro Four Thirds của Olympus/OM System (hệ số cắt 2x).'],
    ['DIGITAL', 'om', 'Thiết kế cho máy ảnh số.'],
    ['PRO', 'om', 'Dòng PRO – cao cấp, chống chịu thời tiết.'],
    ['VARIO', 'pana', 'Ống kính zoom (tiêu cự thay đổi).'],
    ['POWER', 'pana', 'Đi kèm O.I.S.: chống rung quang học thế hệ cải tiến.'],
    ['ASPH', null, 'Có thấu kính phi cầu (aspherical) – giảm méo và quang sai.'],
    ['APO', null, 'Apochromatic – hiệu chỉnh quang sai màu rất tốt.'],
    ['MACRO', null, 'Có khả năng chụp cận; ống macro “thật” phóng đại 1:1.'],
    ['FISHEYE', null, 'Mắt cá – góc nhìn tới 180°, méo hình cầu đặc trưng.'],
    ['II', null, 'Phiên bản thứ hai (Mark II) của cùng thiết kế.'],
    ['III', null, 'Phiên bản thứ ba (Mark III).'],
    ['IV', null, 'Phiên bản thứ tư.'],
    ['IF', null, 'Internal Focusing – lấy nét trong, thân ống kính không dài ra khi lấy nét.']
  ];
  const LENS_EXAMPLES = [
    'Canon EF-S 18-55mm f/3.5-5.6 IS STM', 'Canon RF 24-70mm F2.8 L IS USM', 'Nikon AF-S DX NIKKOR 35mm f/1.8G',
    'NIKKOR Z 70-200mm f/2.8 VR S', 'Sony FE 85mm F1.4 GM II', 'Sony E PZ 16-50mm F3.5-5.6 OSS II',
    'Fujifilm XF 56mm F1.2 R WR', 'Sigma 18-35mm F1.8 DC HSM Art', 'Tamron 28-75mm F/2.8 Di III VXD G2',
    'Canon EF 100mm f/2.8L Macro IS USM', 'Canon TS-E 24mm f/3.5L II', 'OM SYSTEM M.Zuiko Digital ED 12-40mm F2.8 PRO II'
  ];

  /* ---------- Các loại ống kính & mục đích ---------- */
  const LENS_TYPES = [
    { id: 'fisheye', name: 'Mắt cá', feq: '8–16 mm', aov: 'tới 180°', look: 'Bẻ cong mọi đường thẳng không đi qua tâm ảnh, như nhìn qua quả cầu.', use: 'Ảnh sáng tạo, không gian rất hẹp, thể thao mạo hiểm, bầu trời toàn cảnh.', avoid: 'Kiến trúc cần đường thẳng, chân dung cận mặt.', preset: { device: 'ml_ff', lens: 'fish15', scene: 'landscape' } },
    { id: 'uw', name: 'Siêu rộng', feq: '14–24 mm', aov: '84–114°', look: 'Tiền cảnh to, hậu cảnh nhỏ và xa; ngửa máy làm nhà “ngả ra sau”.', use: 'Phong cảnh có tiền cảnh mạnh, nội thất, kiến trúc, bầu trời sao.', avoid: 'Chân dung gần (mũi to, mặt méo).', preset: { device: 'ml_ff', lens: 'z1635', focal: 16, scene: 'landscape' } },
    { id: 'wide', name: 'Góc rộng', feq: '24–35 mm', aov: '63–84°', look: 'Kể chuyện có bối cảnh, phối cảnh tự nhiên hơn siêu rộng.', use: 'Đường phố, phóng sự, phong cảnh, ảnh nhóm, du lịch.', avoid: 'Chân dung cận.', preset: { device: 'ml_ff', lens: 'z2470', focal: 28, scene: 'street' } },
    { id: 'normal', name: 'Tiêu chuẩn', feq: '40–58 mm', aov: '≈ 47° (50 mm)', look: 'Gần với cách mắt người nhìn: tiêu cự xấp xỉ đường chéo cảm biến (43 mm trên full-frame).', use: 'Đời thường, đường phố, chân dung nửa người, tĩnh vật.', avoid: 'Cảnh cần bao quát rất rộng hoặc chủ thể ở rất xa.', preset: { device: 'ml_ff', lens: 'p50', scene: 'portrait' } },
    { id: 'shorttele', name: 'Tele ngắn', feq: '60–130 mm', aov: '19–39°', look: 'Nén nhẹ phối cảnh, khuôn mặt cân đối, dễ tách nền.', use: 'Chân dung (85–105 mm), chi tiết kiến trúc và phong cảnh.', avoid: 'Phòng chật, cảnh rộng.', preset: { device: 'ml_ff', lens: 'p85', scene: 'portrait' } },
    { id: 'tele', name: 'Tele vừa', feq: '135–300 mm', aov: '8–18°', look: 'Hậu cảnh bị “kéo sát” chủ thể, vùng nét mỏng, dễ rung máy.', use: 'Thể thao, động vật hoang dã, đường phố từ xa, chân dung nén nền.', avoid: 'Cầm tay ở tốc độ chậm; ánh sáng yếu nếu khẩu nhỏ.', preset: { device: 'ml_ff', lens: 'z70200', focal: 200, scene: 'street' } },
    { id: 'supertele', name: 'Siêu tele', feq: 'trên 300 mm', aov: 'dưới 8°', look: 'Phóng đại rất lớn, phối cảnh dẹt, rung máy bị phóng đại theo.', use: 'Chim, thú ở xa, thể thao từ khán đài, chụp trăng.', avoid: 'Cầm tay chậm hơn 1/tiêu cự; ngày nóng (hơi nóng làm mờ).', preset: { device: 'ml_apsc', lens: 'z100400', focal: 400, scene: 'street' } },
    { id: 'macro', name: 'Macro', feq: '50–200 mm', aov: 'tùy tiêu cự', look: 'Phóng đại 1:1 hoặc hơn; vùng nét chỉ vài milimét.', use: 'Côn trùng, hoa, sản phẩm, chi tiết nhỏ.', avoid: 'Chủ thể di chuyển nhanh khi không có flash/tripod.', preset: { device: 'ml_ff', lens: 'macro100', scene: 'macro' } },
    { id: 'ts', name: 'Tilt-shift', feq: '17–90 mm', aov: 'tùy tiêu cự', look: 'Mặt phẳng nét nghiêng – thành phố trông như mô hình; hoặc dịch ống để giữ đường thẳng đứng.', use: 'Kiến trúc, sản phẩm, hiệu ứng mô hình thu nhỏ.', avoid: 'Chụp nhanh – mọi thứ đều chỉnh tay.', preset: { device: 'ml_ff', lens: 'ts24', scene: 'street', tilt: 6 } },
    { id: 'superzoom', name: 'Zoom đa dụng', feq: '27–300 mm', aov: '8–75°', look: 'Một ống kính cho cả chuyến đi, đổi lại méo hình, viền màu và khẩu nhỏ ở đầu tele.', use: 'Du lịch, khi không muốn thay ống kính.', avoid: 'Thiếu sáng, khi cần chất lượng cao nhất.', preset: { device: 'dslr_apsc', lens: 'super18200', focal: 18, scene: 'landscape' } }
  ];

  /* ---------- Lộ trình 20 tuần (bám theo giáo trình) ---------- */
  const WEEKS = [
    { n: 1, t: 'Những bức ảnh đầu tiên', k: ['Điều gì làm nên một bức ảnh tốt', 'Chọn cài đặt theo chủ đề', 'Nhập và xem lại ảnh'], go: [{ label: 'Chụp thử ở chế độ Tự động', preset: { device: 'dslr_apsc', lens: 'kit', scene: 'street', mode: 'auto' } }] },
    { n: 2, t: 'Lấy nét', k: ['Lấy nét tay và tự động', 'Chọn điểm AF', 'AF-S và AF-C', 'Lấy nét vô cực'], go: [{ label: 'AF tự chọn điểm bị lừa bởi tiền cảnh', preset: { device: 'dslr_apsc', lens: 'kit', focal: 55, scene: 'portrait', afArea: 'auto', mode: 'A', N: 5.6, D: 2.2 } }, { label: 'AF-S và AF-C khi xe chạy tới', preset: { device: 'ml_ff', lens: 'z70200', focal: 135, scene: 'street', approach: true, afMode: 'S', mode: 'S', t: 1 / 1000, isoAuto: true } }] },
    { n: 3, t: 'Chế độ chụp', k: ['Auto, P, A/Av, S/Tv, M', 'Program shift', 'Chế độ cảnh', 'Bù sáng'], go: [{ label: 'Thử các chế độ trên cảnh ngược sáng', preset: { device: 'dslr_apsc', lens: 'kit', scene: 'portrait', mode: 'P' } }] },
    { n: 4, t: 'Phơi sáng chuẩn', k: ['Tam giác phơi sáng', 'Stop và 1/3 stop', 'Đo sáng 18% xám', 'Histogram, cảnh báo vùng cháy'], go: [{ label: 'Chế độ M và histogram', preset: { device: 'ml_apsc', lens: 'kit', scene: 'landscape', mode: 'M', N: 8, t: 1 / 250, iso: 100 } }] },
    { n: 5, t: 'Độ tương phản', k: ['Dải tương phản động', 'Cảm biến lớn và nhỏ', 'HDR', 'Đèn bù sáng'], go: [{ label: 'Bầu trời cháy: thử kính GND', preset: { device: 'dslr_apsc', lens: 'kit', focal: 18, scene: 'landscape', mode: 'A', N: 11 } }, { label: 'So sánh với HDR điện thoại', preset: { device: 's26u', scene: 'portrait', phoneMode: 'photo' } }] },
    { n: 6, t: 'Độ sâu trường ảnh', k: ['Khẩu, khoảng cách, tiêu cự', '1/3 trước – 2/3 sau điểm nét', 'Khoảng siêu tiêu', 'Nút xem trước DoF'], go: [{ label: 'Xóa phông chân dung', preset: { device: 'ml_ff', lens: 'p85', scene: 'portrait', mode: 'A', N: 1.4 } }, { label: 'Nét từ trước ra sau', preset: { device: 'ml_ff', lens: 'z1635', focal: 16, scene: 'landscape', mode: 'A', N: 11, support: 'tripod' } }] },
    { n: 7, t: 'Ống kính', k: ['Tiêu cự và góc nhìn', 'Prime và zoom', 'Méo, tối góc, quang sai màu', 'Phối cảnh do vị trí đứng'], go: [{ label: 'Bài tập đổi phối cảnh', preset: { device: 'ml_ff', lens: 'z2470', focal: 24, scene: 'portrait', mode: 'A', N: 4, keepSize: true } }] },
    { n: 8, t: 'Ống kính góc rộng', k: ['Gần và xa', 'Phong cảnh có tiền cảnh', 'Đường thẳng đứng hội tụ'], go: [{ label: 'Siêu rộng với tiền cảnh đá', preset: { device: 'dslr_ff', lens: 'z1635', focal: 16, scene: 'landscape', mode: 'A', N: 11, support: 'tripod' } }] },
    { n: 9, t: 'Ống kính tele', k: ['Phối cảnh dẹt', 'Tele ngắn, vừa, siêu tele', 'Tốc độ nhanh hơn tiêu cự', 'Chống rung'], go: [{ label: 'Tele 400 mm cầm tay', preset: { device: 'ml_apsc', lens: 'z100400', focal: 400, scene: 'street', mode: 'S', t: 1 / 125 } }] },
    { n: 10, t: 'Chụp cận cảnh', k: ['Cận cảnh và macro 1:1', 'Khoảng làm việc và khoảng lấy nét', 'DoF cực mỏng'], go: [{ label: 'Macro 1:1', preset: { device: 'ml_ff', lens: 'macro100', scene: 'macro', mode: 'A', N: 8 } }, { label: 'Ống kit có làm macro được không?', preset: { device: 'dslr_apsc', lens: 'kit', focal: 55, scene: 'macro', mode: 'A', N: 8 } }] },
    { n: 11, t: 'Diễn tả chuyển động', k: ['Màn trập hoạt động thế nào', 'Đóng băng và làm nhòe', 'Lia máy'], go: [{ label: 'Lia máy 1/30 giây', preset: { device: 'dslr_apsc', lens: 'kit', focal: 35, scene: 'street', mode: 'S', t: 1 / 30, pan: true } }, { label: 'Nước mượt như lụa', preset: { device: 'dslr_ff', lens: 'z2470', focal: 35, scene: 'landscape', mode: 'S', t: 2, support: 'tripod' } }] },
    { n: 12, t: 'Cách bố cục', k: ['Quy tắc một phần ba', 'Đường dẫn, đường cong, đường chéo'], go: [{ label: 'Bật lưới 1/3', preset: { device: 'ml_apsc', lens: 'kit', scene: 'landscape', grid: true } }] },
    { n: 13, t: 'Bố cục như chuyên gia', k: ['Tương phản trong bố cục', 'Phản chiếu'], go: [] },
    { n: 14, t: 'Bài học về màu sắc', k: ['Bánh xe màu', 'Màu bổ túc, tương đồng', 'Picture Style'], go: [{ label: 'Picture Style trên phong cảnh', preset: { device: 'dslr_apsc', lens: 'kit', scene: 'landscape', style: 'land' } }] },
    { n: 15, t: 'Màu của ánh sáng', k: ['Nhiệt độ màu (Kelvin)', 'Cân bằng trắng tự động, cài sẵn, tùy chỉnh'], go: [{ label: 'Trả lại màu trắng dưới đèn vàng', preset: { device: 'ml_apsc', lens: 'kit', focal: 35, scene: 'indoor', wb: 'day' } }] },
    { n: 16, t: 'Ánh sáng tự nhiên', k: ['Ánh sáng và bóng đổ', 'Giờ vàng'], go: [{ label: 'Giờ vàng: giữ màu ấm', preset: { device: 'ml_ff', lens: 'p85', scene: 'portrait', wb: 'day' } }] },
    { n: 17, t: 'Đèn flash', k: ['Guide Number và khoảng cách', 'Flash bù sáng (fill)', 'Đồng bộ màn trập'], go: [{ label: 'Flash bù sáng khi ngược sáng', preset: { device: 'dslr_apsc', lens: 'kit', focal: 35, scene: 'portrait', mode: 'A', N: 5.6, flash: 'fill' } }] },
    { n: 18, t: 'Chụp thiếu sáng', k: ['Ánh sáng môi trường', 'Khẩu lớn', 'ISO 800–6400', 'Tripod và tốc độ chậm'], go: [{ label: 'Phố đêm cầm tay', preset: { device: 'ml_ff', lens: 'p50', scene: 'night', mode: 'A', N: 1.8, isoAuto: true } }, { label: 'Vệt đèn với tripod', preset: { device: 'dslr_apsc', lens: 'kit', focal: 24, scene: 'night', mode: 'M', N: 11, t: 8, iso: 100, support: 'tripod' } }] },
    { n: 19, t: 'Đen trắng', k: ['Khi nào ảnh đen trắng hiệu quả', 'Kính màu cho ảnh đen trắng'], go: [{ label: 'Đơn sắc + kính đỏ', preset: { device: 'ml_apsc', lens: 'kit', scene: 'landscape', style: 'monoR' } }] },
    { n: 20, t: 'Thực hiện dự án', k: ['Câu chuyện ảnh', 'Biên tập bộ ảnh', 'Gắn từ khóa'], go: [] }
  ];

  /* ---------- Câu hỏi ôn tập (tự soạn theo nội dung giáo trình) ---------- */
  const QUIZ = [
    { w: 4, q: 'Từ f/4 chuyển sang f/5.6, lượng sáng tới cảm biến thay đổi thế nào?', a: ['Tăng gấp đôi', 'Giảm một nửa', 'Không đổi', 'Giảm còn 1/4'], c: 1, e: 'Mỗi stop khẩu (f/4 → f/5.6) giảm một nửa lượng sáng.' },
    { w: 4, q: 'Cặp nào cho cùng mức phơi sáng với f/8 · 1/125 giây · ISO 100?', a: ['f/5.6 · 1/250 · ISO 100', 'f/5.6 · 1/60 · ISO 100', 'f/11 · 1/250 · ISO 100', 'f/8 · 1/250 · ISO 100'], c: 0, e: 'Mở khẩu thêm 1 stop và tăng tốc thêm 1 stop – hai thay đổi bù cho nhau.' },
    { w: 4, q: 'Đồng hồ đo sáng trong máy “nghĩ” mọi cảnh đều phản xạ bao nhiêu ánh sáng?', a: ['50%', '18% (xám trung tính)', '100%', '5%'], c: 1, e: 'Máy đo phản xạ hiệu chuẩn theo xám 18%. Cảnh tuyết trắng vì vậy dễ bị thiếu sáng.' },
    { w: 4, q: 'Histogram dồn hết sang mép phải, có vạch dựng đứng ở cạnh phải nghĩa là gì?', a: ['Ảnh thiếu sáng', 'Vùng sáng bị cháy, mất chi tiết', 'Ảnh hoàn hảo', 'Nhiễu cao'], c: 1, e: 'Dữ liệu bị “cắt” ở mép phải = điểm ảnh đã trắng hoàn toàn. Hãy bù sáng âm.' },
    { w: 4, q: 'Chế độ đo sáng nào chỉ đo khoảng 1–5% khung hình?', a: ['Đánh giá (Matrix)', 'Trung tâm', 'Điểm (Spot)', 'Trung bình'], c: 2, e: 'Spot đo một vùng rất nhỏ – hợp khi chủ thể nhỏ nằm trên nền rất sáng hoặc rất tối.' },
    { w: 3, q: 'Bạn muốn tự chọn khẩu độ để kiểm soát độ sâu trường ảnh, máy tự chọn tốc độ. Dùng chế độ nào?', a: ['S/Tv', 'A/Av', 'M', 'Auto'], c: 1, e: 'Ưu tiên khẩu độ (A/Av).' },
    { w: 3, q: 'Ở chế độ ưu tiên tốc độ, trời quá sáng có thể gây ra điều gì?', a: ['Ảnh cháy sáng vì không còn khẩu nhỏ hơn', 'Ảnh tối', 'Mất nét', 'Không chụp được'], c: 0, e: 'Nếu khẩu nhỏ nhất vẫn chưa đủ chặn sáng, ảnh sẽ dư sáng – lúc này cần ISO thấp hơn hoặc kính ND.' },
    { w: 6, q: 'Ba yếu tố quyết định độ sâu trường ảnh là gì?', a: ['ISO, tốc độ, khẩu', 'Khẩu độ, khoảng cách tới chủ thể, tiêu cự', 'Cân bằng trắng, khẩu, ISO', 'Chỉ khẩu độ'], c: 1, e: 'Khẩu lớn, đứng gần, tiêu cự dài → vùng nét mỏng.' },
    { w: 6, q: 'Vùng nét trải ra quanh điểm lấy nét theo tỉ lệ xấp xỉ?', a: ['1/2 trước – 1/2 sau', '1/3 trước – 2/3 sau', '2/3 trước – 1/3 sau', 'Chỉ phía sau'], c: 1, e: 'Quy tắc gần đúng 1/3 – 2/3 (ở khoảng cách gần, vùng nét cân hơn).' },
    { w: 6, q: 'Lấy nét tại khoảng siêu tiêu (hyperfocal) mang lại điều gì?', a: ['Nền mờ nhất', 'Nét từ nửa khoảng siêu tiêu đến vô cực', 'Giảm nhiễu', 'Tăng tốc lấy nét'], c: 1, e: 'Đây là cách tối đa độ sâu trường ảnh cho phong cảnh.' },
    { w: 7, q: 'Ống kính “tiêu chuẩn” là ống có tiêu cự xấp xỉ…', a: ['Chiều rộng cảm biến', 'Đường chéo cảm biến', '50 mm trên mọi máy', 'Gấp đôi đường chéo'], c: 1, e: 'Trên full-frame đường chéo ≈ 43 mm, nên 40–58 mm được xem là tiêu chuẩn.' },
    { w: 7, q: 'Ống 50 mm gắn trên thân APS-C (hệ số 1.5x) cho góc nhìn tương đương…', a: ['33 mm', '50 mm', '75 mm', '100 mm'], c: 2, e: '50 × 1.5 = 75 mm. Tiêu cự thật không đổi, chỉ góc nhìn hẹp lại.' },
    { w: 7, q: 'Điều gì thực sự làm thay đổi phối cảnh (tỉ lệ kích thước tiền cảnh/hậu cảnh)?', a: ['Tiêu cự', 'Vị trí đứng chụp', 'Khẩu độ', 'Kích thước cảm biến'], c: 1, e: 'Phối cảnh do khoảng cách. Tele “nén” vì buộc bạn đứng xa; góc rộng “kéo giãn” vì buộc bạn đứng gần.' },
    { w: 7, q: 'Méo hình “thùng” (barrel) – đường thẳng cong phình ra – thường gặp ở?', a: ['Ống tele', 'Ống góc rộng', 'Ống macro', 'Mọi ống như nhau'], c: 1, e: 'Góc rộng gây méo thùng, tele gây méo gối (pincushion).' },
    { w: 7, q: 'Tối góc (vignetting) do quang học giảm khi nào?', a: ['Khi mở khẩu lớn nhất', 'Khi khép khẩu nhỏ lại', 'Khi tăng ISO', 'Khi dùng tốc độ nhanh'], c: 1, e: 'Khép khẩu 1–2 stop thường làm hết tối góc.' },
    { w: 9, q: 'Với ống 400 mm trên full-frame cầm tay, tốc độ tối thiểu nên chọn khoảng?', a: ['1/30', '1/125', '1/500', '1/15'], c: 2, e: 'Quy tắc: nhanh hơn 1/tiêu cự tương đương. Chống rung có thể nới vài stop.' },
    { w: 9, q: 'Khi gắn máy lên tripod, nên làm gì với chống rung ống kính?', a: ['Bật mức cao nhất', 'Tắt đi', 'Không ảnh hưởng', 'Chỉ bật khi chụp đêm'], c: 1, e: 'Hệ chống rung có thể tự tạo rung khi máy đã đứng yên.' },
    { w: 10, q: 'Ảnh được gọi là macro khi…', a: ['Chụp ở khoảng cách dưới 1 m', 'Vật hiện trên cảm biến bằng hoặc lớn hơn kích thước thật (1:1)', 'Dùng khẩu f/2.8', 'Dùng ống 100 mm'], c: 1, e: 'Tỉ lệ 1:1 trở lên. Nhỏ hơn chỉ là cận cảnh.' },
    { w: 10, q: '“Khoảng lấy nét” (focusing distance) được đo từ đâu?', a: ['Mặt trước ống kính', 'Mặt phẳng cảm biến', 'Ngàm ống kính', 'Loa che nắng'], c: 1, e: 'Từ mặt trước ống tới vật là khoảng làm việc (working distance).' },
    { w: 11, q: 'Để đóng băng một cầu thủ đang chạy, tốc độ tối thiểu nên khoảng?', a: ['1/60', '1/125', '1/500', '1/8'], c: 2, e: 'Thể thao nhanh cần từ 1/500 s; đua xe còn nhanh hơn.' },
    { w: 11, q: 'Kỹ thuật lia máy (panning) tạo ra điều gì?', a: ['Cả ảnh đều nét', 'Chủ thể nét, nền nhòe vệt', 'Chủ thể nhòe, nền nét', 'Nhiễu ít hơn'], c: 1, e: 'Máy di chuyển cùng chủ thể với tốc độ khoảng 1/30–1/60 s.' },
    { w: 15, q: 'Ánh sáng đèn sợi đốt có nhiệt độ màu khoảng?', a: ['1850 K', '3000 K', '5500 K', '10000 K'], c: 1, e: 'Thấp hơn → đỏ/cam hơn. Flash và nắng trưa ~5000–5500 K.' },
    { w: 15, q: 'Đặt cân bằng trắng “Ánh nắng” khi chụp dưới đèn sợi đốt, ảnh sẽ…', a: ['Ám xanh', 'Ám vàng cam', 'Trung tính', 'Đen trắng'], c: 1, e: 'Máy không hiệu chỉnh độ ấm của đèn nên ảnh giữ màu cam.' },
    { w: 17, q: 'Đèn flash GN 40 (m, ISO 100), chủ thể cách 5 m. Khẩu cần dùng?', a: ['f/4', 'f/5.6', 'f/8', 'f/11'], c: 2, e: 'Khẩu = GN ÷ khoảng cách = 40 ÷ 5 = 8.' },
    { w: 17, q: 'Khoảng cách từ flash tới chủ thể tăng gấp đôi thì ánh sáng nhận được còn…', a: ['1/2', '1/4', '1/8', 'Không đổi'], c: 1, e: 'Định luật nghịch đảo bình phương.' },
    { w: 18, q: 'Tăng ISO để chụp trong tối có tác dụng phụ chính nào?', a: ['Mất nét', 'Nhiễu hạt tăng', 'Méo hình', 'Sai màu'], c: 1, e: 'ISO 800–6400 là vùng hợp lý cho thiếu sáng; cảm biến lớn chịu ISO cao tốt hơn.' },
    { w: 5, q: 'Cảm biến nhỏ (như điện thoại) thường có dải tương phản động…', a: ['Rộng hơn full-frame', 'Hẹp hơn', 'Bằng nhau', 'Không liên quan'], c: 1, e: 'Điện thoại bù lại bằng HDR ghép nhiều khung hình.' },
    { w: 2, q: 'Chế độ lấy nét nào phù hợp với chủ thể đang di chuyển về phía máy?', a: ['AF-S (One-Shot)', 'AF-C (AI Servo)', 'MF', 'Lấy nét vô cực'], c: 1, e: 'AF-C liên tục dự đoán và cập nhật khoảng lấy nét.' }
  ];

  return { SENSORS, FF_DIAG, BODIES, LENSES, PHONES, SCENES_META, WB_PRESETS, KELVIN_POINTS, STYLES, FILTERS, BRANDS, CODES, LENS_EXAMPLES, LENS_TYPES, WEEKS, QUIZ };
})();
