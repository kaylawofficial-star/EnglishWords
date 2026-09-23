export interface AdminIdentity {
  actorId: string;
}

export interface AdminAuthProvider {
  requireAdmin(context: unknown): Promise<AdminIdentity>;
}

export class AllowlistAdminAuthProvider implements AdminAuthProvider {
  constructor(
    private readonly resolveActorId: (context: unknown) => Promise<string | undefined>,
    private readonly allowedActorIds: ReadonlySet<string>,
  ) {}

  async requireAdmin(context: unknown): Promise<AdminIdentity> {
    const actorId = await this.resolveActorId(context);
    if (!actorId || !this.allowedActorIds.has(actorId)) throw new Error('Unauthorized');
    return { actorId };
  }
}

