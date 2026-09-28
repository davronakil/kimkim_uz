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

export function exceedsGuestCap(
  members: Array<{
    id: string;
    rsvp_status?: string | null;
    additional_guest_count?: number | null;
  }>,
  input: {
    userId: string;
    status: string;
    additionalGuestCount?: number;
    maxGuests?: number | null;
  },
): boolean {
  if (input.maxGuests == null || input.maxGuests <= 0 || input.status !== "going") return false;
  const others = goingHeadcount(members.filter((member) => member.id !== input.userId));
  const party = 1 + Math.max(0, input.additionalGuestCount ?? 0);
  return others + party > input.maxGuests;
}
