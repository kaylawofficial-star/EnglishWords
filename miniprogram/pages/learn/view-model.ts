import type { TextbookContent } from '../../../shared/contracts/content';

export interface LearnViewModel {
  textbookName: string;
  currentUnitName: string;
  totalWords: number;
}

export function createLearnViewModel(content: TextbookContent): LearnViewModel {
  const currentUnit = [...content.units].sort((left, right) => left.order - right.order)[0];

  return {
    textbookName: content.textbook.displayName,
    currentUnitName: currentUnit?.name ?? '尚未配置单元',
    totalWords: content.entries.length,
  };
}
