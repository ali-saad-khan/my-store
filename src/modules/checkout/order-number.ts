/** e.g. "ORD-20260924-9F3A2B1C" — a date prefix for readability plus 32 bits of randomness. */
export function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = crypto.randomUUID().split("-")[0].toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}
