export function parseQuickExpense(text: string): { amount: number; description: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([\d\s.,]+)\s+(.+)$/);
  if (!match) return null;

  const amountRaw = match[1].replace(/\s/g, "").replace(",", ".");
  const amount = Number(amountRaw);
  const description = match[2].trim();

  if (!Number.isFinite(amount) || amount <= 0 || description.length < 1) {
    return null;
  }

  return { amount, description };
}
