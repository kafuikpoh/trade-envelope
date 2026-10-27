// Formatting only. No business calculations live in the UI.
export const usd = (n: number, dp = 2) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
export const signed = (n: number, dp = 2) =>
  `${n >= 0 ? "+" : "−"}${usd(Math.abs(n), dp)}`;
export const shortDate = (s: string) =>
  new Date(s).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
export const dateRange = (a: string, b: string) =>
  `${shortDate(a)} – ${shortDate(b)}`;
