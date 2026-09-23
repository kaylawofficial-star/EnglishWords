import type { ManagedContentState, ReviewRecord, AuditEvent } from '../../shared/contracts/content-management';
import { InMemoryContentRepository } from './in-memory-content-repository';
import type { ContentRepository, ManagedDraftBundle, PublishTransactionInput, WithdrawTransactionInput } from './content-repository';

export interface CloudStatePort {
  loadState(): Promise<ManagedContentState>;
  runTransaction<T>(change: (state: ManagedContentState) => Promise<{ state: ManagedContentState; result: T }> | { state: ManagedContentState; result: T }): Promise<T>;
}

export class CloudContentRepository implements ContentRepository {
  constructor(private readonly port: CloudStatePort) {}

  async findAssetByNormalizedWord(word: string) { return (await this.reader()).findAssetByNormalizedWord(word); }
  async getDraftBundle(id: string) { return (await this.reader()).getDraftBundle(id); }
  async listState() { return this.port.loadState(); }
  async findPublicationByRequestId(id: string) { return (await this.reader()).findPublicationByRequestId(id); }
  async getPublication(id: string) { return (await this.reader()).getPublication(id); }

  async saveDraftBundle(bundle: ManagedDraftBundle, expectedRevision?: number) {
    return this.write(async (repo) => { await repo.saveDraftBundle(bundle, expectedRevision); });
  }
  async appendReview(review: ReviewRecord) { return this.write(async (repo) => { await repo.appendReview(review); }); }
  async appendAudit(audit: AuditEvent) { return this.write(async (repo) => { await repo.appendAudit(audit); }); }
  async publishAtomically(input: PublishTransactionInput) { return this.write((repo) => repo.publishAtomically(input)); }
  async rollbackAtomically(input: PublishTransactionInput) { return this.write((repo) => repo.rollbackAtomically(input)); }
  async withdrawAtomically(input: WithdrawTransactionInput) { return this.write(async (repo) => { await repo.withdrawAtomically(input); }); }

  private async reader() { return new InMemoryContentRepository(await this.port.loadState()); }
  private async write<T>(command: (repository: InMemoryContentRepository) => Promise<T>): Promise<T> {
    return this.port.runTransaction(async (state) => {
      const repository = new InMemoryContentRepository(state);
      const result = await command(repository);
      return { state: await repository.listState(), result };
    });
  }
}
