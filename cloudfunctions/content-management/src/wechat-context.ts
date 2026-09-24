export interface WechatManagementContext {
  OPENID?: unknown;
  openId?: unknown;
  TCB_CUSTOM_USER_ID?: unknown;
}

export async function resolveWechatActorId(context: unknown): Promise<string | undefined> {
  if (typeof context !== 'object' || context === null) return undefined;
  const candidate = context as WechatManagementContext;
  const value = candidate.TCB_CUSTOM_USER_ID ?? candidate.OPENID ?? candidate.openId;
  return typeof value === 'string' && value.trim() ? value : undefined;
}
