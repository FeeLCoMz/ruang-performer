// Simple notification util for global toast
export function shouldShowInvitationToast(prevCount, newCount) {
  return typeof prevCount === 'number' && typeof newCount === 'number' && newCount > prevCount;
}
