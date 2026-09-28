export function goingHeadcount(
  members: Array<{
    rsvp_status?: string | null;
    additional_guest_count?: number | null;
  }>,
): number {
  return members.reduce((total, member) => {
    if ((member.rsvp_status ?? "going") !== "going") return total;
    return total + 1 + Math.max(0, member.additional_guest_count ?? 0);
  }, 0);
}
