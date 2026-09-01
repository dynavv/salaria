import { Category } from '../types';

export function matchCategoryFromText(
  text: string,
  type: 'expense' | 'income' | 'transfer',
  categories: Category[]
): Category | null {
  if (!text || type === 'transfer') return null;

  const norm = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!norm) return null;
  const wrappedNorm = ` ${norm} `;

  const filtered = categories.filter((c) => c.type === type);
  let bestCat: Category | null = null;
  let maxScore = 0;

  for (const cat of filtered) {
    if (!cat.keywords) continue;
    const kws = cat.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    for (const rawKw of kws) {
      const kwNorm = rawKw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .trim();
      if (!kwNorm) continue;

      const wrappedKw = ` ${kwNorm} `;
      if (wrappedNorm.includes(wrappedKw) && kwNorm.length > maxScore) {
        maxScore = kwNorm.length;
        bestCat = cat;
      }
    }
  }

  return bestCat;
}
