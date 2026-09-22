import type { ContentServiceResponse } from '../../../shared/contracts/content';

export interface ContentService {
  getTextbookContent(textbookId: string): Promise<ContentServiceResponse>;
}
