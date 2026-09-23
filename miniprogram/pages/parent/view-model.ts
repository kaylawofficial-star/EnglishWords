import type { TextbookContent } from '../../../shared/contracts/content';

export interface ParentViewModel {
  textbookName: string;
  edition: string;
  year: number;
  gradeLabel: string;
  termLabel: string;
  unitCount: number;
}

export function createParentViewModel(content: TextbookContent): ParentViewModel {
  return {
    textbookName: content.textbook.displayName,
    edition: content.textbook.edition,
    year: content.textbook.year,
    gradeLabel: `${toChineseNumber(content.textbook.grade)}年级`,
    termLabel: content.textbook.term === 'first' ? '上册' : '下册',
    unitCount: content.units.length,
  };
}

function toChineseNumber(value: number): string {
  const labels = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return labels[value] ?? String(value);
}
