import { UnifiedEvent } from "../types/UnifiedEvents";

export const isWithdrawn = (event: UnifiedEvent): boolean => Boolean(event.withdrawnAt);

/** The event with its withdrawn marking set or cleared and the change stamped as a modification. */
export function withWithdrawal(event: UnifiedEvent, withdrawn: boolean, at: string, role: string, reason?: string | null): UnifiedEvent {
  const { withdrawnAt: _at, withdrawnByRole: _role, withdrawnReason: _reason, ...rest } = event;
  const changed: UnifiedEvent = { ...rest, lastModifiedAt: at, lastModifiedByRole: role };
  if (withdrawn) {
    changed.withdrawnAt = at;
    changed.withdrawnByRole = role;
    changed.withdrawnReason = reason ?? null;
  }
  return changed;
}
