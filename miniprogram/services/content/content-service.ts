import type { ContentServiceResponse } from '../../../shared/contracts/content';

export interface ContentService {
  getTextbookContent(textbookId: string): Promise<ContentServiceResponse>;
  getHistoricalPublication(publicationId: string): Promise<ContentServiceResponse>;
}
