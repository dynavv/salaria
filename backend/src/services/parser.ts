/**
 * 💎 SALARIA BACKEND — TEXT & MONEY PARSING SERVICE
 */

import { Category, ParsedMoney } from '../types';

// Helper: Normalize Vietnamese text
export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

// Check system noise / promotions / ads / vouchers / game events
export function isNoiseMessage(text: string): boolean {
  const norm = normalizeText(text);
  const noise = [
    'preparing your receipt', 'adding the location', 'your receipt is ready',
    'dang nhap thanh cong', 'ma xac thuc', 'ma otp', 'dac quyen',
    'han muc len den', 'chung minh thu nhap', 'dang ky vay',
    'khoan vay', 'vay tieu dung', 'mo the tin dung', 'uu dai danh rieng',
    'qua tang', 'trung thuong', 'co hoi trung', 'trung voucher', 'voucher',
    'giftcode', 'san ngay', 'san deal', 'giam den', 'giam ngay', 'nhan ngay',
    'nhap ma', 'ma giam', 'vong quay', 'nap ngay', 'come-back', 'lock-in',
    'hoi vien', 'hoan tien', 'hoan tien den', 'tich diem', 'khuyen mai',
    'dai ngan ki bi', 'freeship', 'sieu hoi', 'mua 1 tang 1', 'deal hot',
    'flash sale', 'chuc mung ban da nhan', 'nhan thuong', 'quay so',
    'doi qua', 'game', 'linh thu',
    'tam giu', 'xac nhan tam giu', 'khong thanh cong', 'that bai', 'nap them tien', 'can nap them'
  ];
  return noise.some(k => norm.includes(k));
}

// Lightweight Regex Parser for Vietnamese Bank & Chat text
export function parseMoneyAndNote(rawText: string): ParsedMoney | null {
  const line = (rawText || '').trim();
  if (!line || isNoiseMessage(line)) return null;

  const cleanAmtLine = line.replace(
    /(?:Số dư khả dụng|So du kha dung|Số dư|So du|Hạn mức khả dụng|Han muc kha dung|HM khả dụng|HM kha dung|\bHM\b|Hạn mức|Han muc|\bSD\b)\s*[:\s]*[+-]?\s*[\d.,]+\s*(?:VND|vnd|đ|d|₫|\$|USD)?.*?(?=(?:\bND\b|Nội dung|Noi dung|\bGD\b|tại|tai)|$)/gis,
    ' '
  );

  let explicitType: 'income' | 'expense' | null = null;
  if (line.startsWith('+') || /^thu\s*[:\-\s]/i.test(line)) {
    explicitType = 'income';
  } else if (line.startsWith('-') || /^chi\s*[:\-\s]/i.test(line)) {
    explicitType = 'expense';
  }

  let amount = 0;
  let matchedStr = '';

  // 1. Explicit keyword prefix: "Số tiền: -32,000 VND", "GD: +500,000"
  const explicitKwPattern = /(?:Số tiền|So tien|\bGD\b|Giao dịch|Giao dich)\s*[:\s]*([+-]?\s*[đ₫$]?\s*[\d.,]+(?:\s*(?:VND|vnd|đ|₫|\$|USD|\bđ\b))?)/i;
  let match = cleanAmtLine.match(explicitKwPattern);
  if (match) {
    const rawAmt = match[1];
    if (rawAmt.includes('-')) explicitType = 'expense';
    else if (rawAmt.includes('+')) explicitType = 'income';
    const digits = rawAmt.replace(/[^\d]/g, '');
    if (digits) {
      amount = parseInt(digits, 10);
      matchedStr = match[0];
    }
  }

  // 2. Currency symbol prefix: "₫32,649", "đ32.649", "$50.00", "+₫50,000"
  if (!amount) {
    const prefixCurrencyPattern = /(?:^|[\s|:(-])([+-]?\s*[đ₫$]\s*[\d.,]+)/i;
    match = cleanAmtLine.match(prefixCurrencyPattern);
    if (match) {
      const rawAmt = match[1];
      if (rawAmt.includes('-')) explicitType = 'expense';
      else if (rawAmt.includes('+')) explicitType = 'income';
      const digits = rawAmt.replace(/[^\d]/g, '');
      if (digits && parseInt(digits, 10) >= 1000) {
        amount = parseInt(digits, 10);
        matchedStr = match[0];
      }
    }
  }

  // 3. Currency symbol suffix: "32,649 VND", "32.649đ", "50000 VNĐ"
  if (!amount) {
    const suffixCurrencyPattern = /(?:^|[\s|:(-])([+-]?\s*\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:VND|vnd|VNĐ|vnđ|đ|₫|\$|USD|\bđ\b)(?!\w)/i;
    match = cleanAmtLine.match(suffixCurrencyPattern);
    if (match) {
      const rawFull = match[0];
      const rawNum = match[1];
      if (rawFull.includes('-')) explicitType = 'expense';
      else if (rawFull.includes('+')) explicitType = 'income';
      const digits = rawNum.replace(/[^\d]/g, '');
      if (digits && parseInt(digits, 10) >= 1000) {
        amount = parseInt(digits, 10);
        matchedStr = match[0];
      }
    }
  }

  // 4. Split million: "2tr5", "2củ5", "1m2", "3trieu5"
  if (!amount) {
    const splitMillionPattern = /(?:^|\s)([-+]?\s*\d+)\s*(?:tr|triệu|trieu|củ|cu|m)\s*(\d+)(?:\s|$|[^\w\d])/i;
    match = line.match(splitMillionPattern);
    if (match) {
      const whole = parseInt(match[1].replace(/[^\d]/g, ''), 10);
      const fracStr = match[2];
      const frac = parseInt(fracStr, 10) * Math.pow(10, 6 - fracStr.length);
      amount = whole * 1000000 + frac;
      matchedStr = match[0];
      if (match[1].includes('-')) explicitType = 'expense';
      if (match[1].includes('+')) explicitType = 'income';
    }
  }

  // 5. Shorthand "k" / "tr" / "củ": "35k", "15tr", "500k", "-45k", "+15tr"
  if (!amount) {
    const shorthandPattern = /(?:^|\s)([-+]?\s*\d+(?:[.,]\d+)?)\s*(k|nghìn|nghin|ng|tr|triệu|trieu|củ|cu|m)(?:\s|$|[^\w\d])/i;
    match = line.match(shorthandPattern);
    if (match) {
      const num = parseFloat(match[1].replace(',', '.').replace(/[^\d.]/g, ''));
      const unit = match[2].toLowerCase();
      if (['k', 'nghìn', 'nghin', 'ng'].includes(unit)) {
        amount = Math.round(num * 1000);
      } else {
        amount = Math.round(num * 1000000);
      }
      matchedStr = match[0];
      if (match[1].includes('-')) explicitType = 'expense';
      if (match[1].includes('+')) explicitType = 'income';
    }
  }

  if (!amount || amount <= 0) return null;

  const type = explicitType || 'expense';
  let note = line;
  if (matchedStr) {
    note = note.replace(matchedStr, ' ');
  }
  note = note
    .replace(/^[-+]\s*/, '')
    .replace(/(?:Số tiền|So tien|\bGD\b|Giao dịch|Giao dich|\bND\b|Nội dung|Noi dung|tai|tại)\s*[:\s]*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!note) {
    note = type === 'income' ? 'Thu nhập' : 'Chi tiêu';
  }

  return { amount, type, note };
}

// Layer 1: Fast-Path Word-Boundary Keyword Matching (Longest-Keyword-First)
export function matchCategoryFast(note: string, categories: Category[]): string | null {
  if (!note || !categories || !categories.length) return null;
  const normNote = ` ${normalizeText(note)} `;

  // 1. Thu thập toàn bộ từ khóa kèm category_id
  const allKeywords: { categoryId: string; keyword: string }[] = [];
  for (const cat of categories) {
    if (!cat.keywords) continue;
    const kwList = cat.keywords.split(',').map(k => normalizeText(k.trim())).filter(Boolean);
    for (const kw of kwList) {
      allKeywords.push({ categoryId: cat.id, keyword: kw });
    }
  }

  // 2. Sắp xếp từ khóa theo độ dài giảm dần (ưu tiên từ ghép / cụm từ dài trước từ đơn ngắn)
  allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);

  // 3. Khớp regex theo ranh giới từ (word boundary)
  for (const item of allKeywords) {
    const escaped = item.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const regex = new RegExp(`(?:^|\\s|[.,;!?:/-])${escaped}(?:$|\\s|[.,;!?:/-])`, 'i');
    if (regex.test(normNote)) {
      return item.categoryId;
    }
  }
  return null;
}

// Helper: Tìm kiếm danh mục theo tên linh hoạt (Fuzzy Category Name Matching)
export function findCategoryByFuzzyName(inputName: string, categories: Category[]): Category | null {
  if (!inputName || !categories || !categories.length) return null;
  const normInput = normalizeText(inputName)
    .replace(/^(doi sang|chuyen sang|danh muc|sang|vao|muc)\s+/i, '')
    .trim();
  if (!normInput) return null;

  // 1. Khớp chính xác hoặc phần trước dấu &
  let matched = categories.find(c => {
    const normCat = normalizeText(c.name);
    return normCat === normInput || normCat.split('&')[0].trim() === normInput;
  });
  if (matched) return matched;

  // 2. Khớp chuỗi con
  matched = categories.find(c => {
    const normCat = normalizeText(c.name);
    return normCat.includes(normInput) || normInput.includes(normCat.split('&')[0].trim());
  });
  if (matched) return matched;

  // 3. Khớp ID danh mục
  matched = categories.find(c => c.id.toLowerCase() === normInput || c.id.replace('cat_', '').toLowerCase() === normInput);
  return matched || null;
}

// Build Prompt for AI
export function buildAIPrompt(text: string, categories: Category[]): string {
  const catListStr = categories.map(c => `- ID: "${c.id}", Tên: "${c.name}", Loại: "${c.type}"`).join('\n');
  return `Bạn là trợ lý AI phân loại chi tiêu tài chính cá nhân tiếng Việt cho ứng dụng Salaria.
Nhiệm vụ: Phân tích nội dung giao dịch ngân hàng/tin nhắn và chọn category_id phù hợp nhất.

DANH SÁCH DANH MỤC HỢP LỆ:
${catListStr}
- ID: "cat_other_expense", Tên: "Chi tiêu khác" (Chỉ dùng cho các khoản chi lặt vặt có chủ đích rõ ràng: đám cưới, ma chay, phạt giao thông, từ thiện, đóng quỹ, phí ngân hàng...)

QUY TẮC PHÂN LOẠI:
1. Đồ ăn, thức uống, nhà hàng, quán ăn, cafe, lẩu, nướng, trà sữa, siêu thị thực phẩm (Highlands, Starbucks, Phở, Cơm, Haidilao, Manwah, KFM, WinMart, KingFoodMart, Kichi...) -> cat_food
2. Xăng xe, gửi xe, Grab, Be, bảo dưỡng xe, taxi, rửa xe, cầu đường -> cat_transport
3. Điện, nước, internet, tiền nhà, phí dịch vụ chung cư, rác -> cat_housing
4. Shopee, Lazada, Tiki, Tiktok Shop, quần áo, mỹ phẩm, phụ kiện, đồ điện tử, đồ gia dụng -> cat_shopping
5. Xem phim, CGV, Netflix, Spotify, game, du lịch, khách sạn -> cat_entertainment
6. Học tập, sách, khóa học, học phí, ứng dụng học ngoại ngữ (ELSA, Duolingo, Coursera, Udemy, IELTS, TOEIC...) -> cat_education
7. Khám bệnh, thuốc, y tế, nha khoa, kính mắt -> cat_health
8. Cắt tóc, gym, spa, yoga, thể thao -> cat_personal_care
9. Lương -> cat_salary, Thưởng/Tip -> cat_bonus
10. ĐẶC BIỆT: Nếu text quá mơ hồ, chỉ có mã giao dịch vô nghĩa hoặc không có bất kỳ dấu hiệu nào về mục đích chi tiêu (ví dụ: "chuyen khoan", "ck", "anh nam", "01283921") -> category_id phải là null, confidence < 0.5.

HÃY TRẢ VỀ TRỰC TIẾP DUY NHẤT MỘT JSON OBJECT (TUYỆT ĐỐI KHÔNG SUY NGHĨ HAY GIẢI THÍCH LAN MAN) theo cấu trúc:
{
  "category_id": "ID danh mục (ví dụ cat_education, cat_food...) hoặc null",
  "confidence": 0.95,
  "clean_note": "Tên món/dịch vụ ngắn gọn (ví dụ: ELSA Speak, Haidilao, Cơm tấm... TUYỆT ĐỐI KHÔNG điền tên danh mục vào đây)",
  "reason": "Giải thích ngắn gọn"
}`;
}
