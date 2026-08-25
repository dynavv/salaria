import * as cheerio from 'cheerio';
import { db } from '../db';

export interface ParsedTransaction {
  id: string;
  rawText: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountId: string;
  note: string;
  confidence: number; // 0 to 1
  isDuplicate?: boolean;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  unparsedMessages: Array<{
    date: string;
    text: string;
    reason: string;
  }>;
  totalParsed: number;
  totalAmountExpense: number;
  totalAmountIncome: number;
  dateRange: {
    start: string;
    end: string;
  };
}

interface CategoryRule {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  keywords: string[];
}

// Fetch active categories from DB
function getCategories(): CategoryRule[] {
  const rows = db.prepare('SELECT id, name, type, icon, color, keywords FROM categories').all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    icon: r.icon,
    color: r.color,
    keywords: r.keywords.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean)
  }));
}

// Convert Vietnamese text into normalized search string (lowercase, remove excess spaces)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses Vietnamese money strings like:
 * - 50k, 50 K, 50.000, 50,000, 50000, 50000đ, 50000 vnd
 * - 1.5tr, 1,5tr, 1.5 triệu, 1.5 củ, 1.5m
 * - 2tr5, 2củ5, 1m2
 * - -50k, +15tr
 */
export function extractMoneyAndNote(rawLine: string): {
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  note: string;
  confidence: number;
} | null {
  const line = rawLine.trim();
  if (!line) return null;

  // Check explicit prefix
  let explicitType: 'expense' | 'income' | 'transfer' | null = null;
  if (line.startsWith('+') || /^thu\s*[:\-\s]/i.test(line)) {
    explicitType = 'income';
  } else if (line.startsWith('-') || /^chi\s*[:\-\s]/i.test(line)) {
    explicitType = 'expense';
  } else if (/^(ck|chuyển|chuyen)\s*[:\-\s]/i.test(line)) {
    explicitType = 'transfer';
  }

  // Regex patterns for Vietnamese amount expressions:
  // 1. "2tr5", "2củ5", "1m2", "3trieu5"
  const splitMillionPattern = /(?:^|\s)([-+]?\s*\d+)\s*(?:tr|triệu|trieu|củ|cu|m)\s*(\d+)(?:\s|$|[^\w\d])/i;
  
  // 2. Standard million: "1.5tr", "1,5 triệu", "10tr", "10 củ"
  const standardMillionPattern = /(?:^|\s)([-+]?\s*\d+(?:[.,]\d+)?)\s*(?:tr|triệu|trieu|củ|cu|m|million)(?:\s|$|[^\w\d])/i;

  // 3. Thousands: "50k", "150 k", "500k", "50 nghìn", "50 ngàn", "50k5"
  const thousandPattern = /(?:^|\s)([-+]?\s*\d+(?:[.,]\d+)?)\s*(?:k|nghìn|nghin|ngàn|ngan)(?:\s|$|[^\w\d])/i;

  // 4. Exact standard number: "50.000", "150,000", "50000đ", "100000 vnd", "100000" (at least 3-4 digits unless currency symbol attached)
  const exactCurrencyPattern = /(?:^|\s)([-+]?\s*\d{1,3}(?:[.,]\d{3})+(?:\s*(?:đ|d|vnd|vnđ))?)(?:\s|$|[^\w\d])/i;
  const rawNumberPattern = /(?:^|\s)([-+]?\s*\d{4,9})(?:\s*(?:đ|d|vnd|vnđ))?(?:\s|$|[^\w\d])/i;

  let amount = 0;
  let matchedStr = '';
  let confidence = 0.8;

  // Test Pattern 1: 2tr5
  let match = line.match(splitMillionPattern);
  if (match) {
    const whole = parseFloat(match[1].replace(/\s+/g, ''));
    const frac = parseFloat(match[2]);
    const fracMultiplier = frac >= 10 ? Math.pow(10, 6 - frac.toString().length) : 100000;
    amount = Math.abs(whole) * 1000000 + frac * fracMultiplier;
    matchedStr = match[0];
    confidence = 0.95;
  }

  // Test Pattern 2: 1.5tr
  if (!amount) {
    match = line.match(standardMillionPattern);
    if (match) {
      const val = parseFloat(match[1].replace(/\s+/g, '').replace(',', '.'));
      amount = Math.abs(val) * 1000000;
      matchedStr = match[0];
      confidence = 0.95;
    }
  }

  // Test Pattern 3: 50k
  if (!amount) {
    match = line.match(thousandPattern);
    if (match) {
      const val = parseFloat(match[1].replace(/\s+/g, '').replace(',', '.'));
      amount = Math.abs(val) * 1000;
      matchedStr = match[0];
      confidence = 0.95;
    }
  }

  // Test Pattern 4: 50.000đ or 50.000
  if (!amount) {
    match = line.match(exactCurrencyPattern);
    if (match) {
      const cleanNum = match[1].replace(/[^\d]/g, '');
      amount = parseInt(cleanNum, 10);
      matchedStr = match[0];
      confidence = 0.9;
    }
  }

  // Test Pattern 5: Plain number 50000
  if (!amount) {
    match = line.match(rawNumberPattern);
    if (match) {
      const cleanNum = match[1].replace(/[^\d]/g, '');
      const parsedVal = parseInt(cleanNum, 10);
      // Avoid phone numbers, years (e.g. 2026), or pin codes if context doesn't look like money
      if (parsedVal !== 2024 && parsedVal !== 2025 && parsedVal !== 2026 && parsedVal >= 1000) {
        amount = parsedVal;
        matchedStr = match[0];
        confidence = 0.75;
      }
    }
  }

  // Test Pattern 6: Shorthand 2-3 digit number without unit (e.g. "cafe 35" -> 35.000₫, "45 cơm tấm" -> 45.000₫, "ăn tối 120" -> 120.000₫)
  if (!amount) {
    const shorthandPattern = /(?:^|\s)([-+]?\s*\d{2,3})(?:\s|$|[^\w\d])/i;
    match = line.match(shorthandPattern);
    if (match) {
      const cleanNum = match[1].replace(/[^\d]/g, '');
      const parsedVal = parseInt(cleanNum, 10);
      if (parsedVal >= 10 && parsedVal <= 999) {
        amount = parsedVal * 1000;
        matchedStr = match[0];
        confidence = 0.7;
      }
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return null;
  }

  // Extract clean note by removing matched money substring and leading +, -, colons
  let cleanNote = line
    .replace(matchedStr.trim(), '')
    .replace(/^[+\-:\s]+/, '')
    .replace(/[+\-:\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If note is empty, provide placeholder from matched text or raw line
  if (!cleanNote) {
    cleanNote = 'Chi tiêu';
  }

  // Determine type if not explicitly marked
  let finalType: 'expense' | 'income' | 'transfer' = explicitType || 'expense';
  if (!explicitType) {
    const norm = normalizeText(line);
    // Ignore "lương khô" / "luong kho" from salary income
    if (norm.includes('luong kho') || norm.includes('lương khô')) {
      finalType = 'expense';
    } else {
      const incomeKeywords = ['luong cty', 'lương cty', 'nhan luong', 'nhận lương', 'ck luong', 'ck lương', 'salary', 'thuong', 'thưởng', 'bonus', 'nhan tien', 'nhận tiền', 'hoan tien', 'hoàn tiền', 'lai', 'lãi', 'cashback', 'ck den', 'ck đến'];
      // If starts with + or contains clear salary receipt
      if (incomeKeywords.some(kw => norm.includes(kw))) {
        finalType = 'income';
      }
    }
  }

  return {
    amount,
    type: finalType,
    note: cleanNote,
    confidence
  };
}

/**
 * Auto-matches category from note and raw message text using category keyword dictionary
 */
export function matchCategory(text: string, type: 'expense' | 'income' | 'transfer', categories: CategoryRule[]): CategoryRule | null {
  const norm = normalizeText(text);
  const filteredCats = categories.filter(c => c.type === (type === 'income' ? 'income' : 'expense'));

  let bestMatch: CategoryRule | null = null;
  let highestScore = 0;

  for (const cat of filteredCats) {
    for (const kw of cat.keywords) {
      if (!kw) continue;
      
      // Exact word match has higher weight than substring match
      const regex = new RegExp(`(?:^|\\b|\\s)${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\b|\\s)`, 'i');
      if (regex.test(norm)) {
        const score = kw.length * 2; // longer keyword match = more specific
        if (score > highestScore) {
          highestScore = score;
          bestMatch = cat;
        }
      } else if (norm.includes(kw)) {
        const score = kw.length;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = cat;
        }
      }
    }
  }

  // Fallback if no specific keyword matched
  if (!bestMatch) {
    if (type === 'income') {
      bestMatch = filteredCats.find(c => c.id === 'cat_other_income') || filteredCats[0] || null;
    } else {
      bestMatch = filteredCats.find(c => c.id === 'cat_other_expense') || filteredCats[0] || null;
    }
  }

  return bestMatch;
}

/**
 * Parses raw Telegram Export HTML content into structured transactions
 */
export function parseTelegramHtml(htmlContent: string, defaultAccountId: string = 'acc_cash'): ParseResult {
  const $ = cheerio.load(htmlContent);
  const categories = getCategories();
  const transactions: ParsedTransaction[] = [];
  const unparsedMessages: Array<{ date: string; text: string; reason: string }> = [];

  let totalExpense = 0;
  let totalIncome = 0;
  let minDate = '';
  let maxDate = '';

  // Select all Telegram message blocks
  // Telegram export standard: <div class="message default clearfix" id="message123">
  const messageElements = $('.message.default, .message.service, .message');

  messageElements.each((index, el) => {
    const $el = $(el);

    // Skip service messages if they don't have text
    const textEl = $el.find('.text');
    if (textEl.length === 0) return;

    // Telegram raw text (may contain <br> tags)
    // Replace <br> with newline to handle multi-line messages
    textEl.find('br').replaceWith('\n');
    const rawText = textEl.text().trim();
    if (!rawText) return;

    // Extract Date & Time
    // Date title attribute usually: "28.08.2026 14:30:15 UTC+07:00" or inside .date details
    let dateStr = '';
    let timeStr = '12:00';

    const dateDetails = $el.find('.date.details, .date');
    const titleAttr = dateDetails.attr('title');

    if (titleAttr) {
      // e.g. "28.08.2026 14:30:15" or "28.08.2026 14:30:15 UTC+07:00"
      const dateMatch = titleAttr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}:\d{1,2}))?/);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3];
        dateStr = `${year}-${month}-${day}`;
        if (dateMatch[4]) {
          timeStr = dateMatch[4];
        }
      }
    }

    // Fallback date from text header if title is not present
    if (!dateStr) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }

    // Update global date range
    if (!minDate || dateStr < minDate) minDate = dateStr;
    if (!maxDate || dateStr > maxDate) maxDate = dateStr;

    // Split multi-line messages (e.g. user logged 3 items in one Telegram message)
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const parsed = extractMoneyAndNote(line);
      if (!parsed) {
        unparsedMessages.push({
          date: dateStr,
          text: line,
          reason: 'Không phát hiện số tiền hợp lệ'
        });
        continue;
      }

      const matchedCat = matchCategory(parsed.note + ' ' + line, parsed.type, categories);

      const tx: ParsedTransaction = {
        id: `tx_import_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        rawText: line,
        date: dateStr,
        time: timeStr,
        amount: parsed.amount,
        type: parsed.type,
        categoryId: matchedCat ? matchedCat.id : null,
        categoryName: matchedCat ? matchedCat.name : (parsed.type === 'income' ? 'Thu nhập khác' : 'Chi tiêu khác'),
        categoryIcon: matchedCat ? matchedCat.icon : 'Tag',
        categoryColor: matchedCat ? matchedCat.color : '#64748b',
        accountId: defaultAccountId,
        note: parsed.note,
        confidence: parsed.confidence
      };

      if (parsed.type === 'expense') {
        totalExpense += parsed.amount;
      } else if (parsed.type === 'income') {
        totalIncome += parsed.amount;
      }

      transactions.push(tx);
    }
  });

  // If no Telegram HTML structure found, try parsing as raw text lines
  if (transactions.length === 0 && messageElements.length === 0) {
    const rawLines = htmlContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const today = new Date().toISOString().split('T')[0];
    
    for (const line of rawLines) {
      const parsed = extractMoneyAndNote(line);
      if (parsed) {
        const matchedCat = matchCategory(parsed.note + ' ' + line, parsed.type, categories);
        transactions.push({
          id: `tx_import_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          rawText: line,
          date: today,
          time: '12:00',
          amount: parsed.amount,
          type: parsed.type,
          categoryId: matchedCat ? matchedCat.id : null,
          categoryName: matchedCat ? matchedCat.name : 'Chi tiêu',
          categoryIcon: matchedCat ? matchedCat.icon : 'Tag',
          categoryColor: matchedCat ? matchedCat.color : '#64748b',
          accountId: defaultAccountId,
          note: parsed.note,
          confidence: parsed.confidence
        });

        if (parsed.type === 'expense') totalExpense += parsed.amount;
        if (parsed.type === 'income') totalIncome += parsed.amount;
      }
    }
  }

  return {
    transactions,
    unparsedMessages,
    totalParsed: transactions.length,
    totalAmountExpense: totalExpense,
    totalAmountIncome: totalIncome,
    dateRange: {
      start: minDate || new Date().toISOString().split('T')[0],
      end: maxDate || new Date().toISOString().split('T')[0]
    }
  };
}
