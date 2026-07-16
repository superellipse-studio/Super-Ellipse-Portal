// Fetches a live USD -> IDR rate from a free, no-key-required API.
// Cached by Next.js for 1 hour (revalidate: 3600) so we don't hammer the API
// on every page load.

export interface ExchangeRate {
  rate: number;
  date: string; // YYYY-MM-DD
}

export async function getUsdToIdrRate(): Promise<ExchangeRate | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.IDR;
    if (!rate || typeof rate !== "number") return null;

    let date = new Date().toISOString().slice(0, 10);
    if (data.time_last_update_utc) {
      const parsed = new Date(data.time_last_update_utc);
      if (!isNaN(parsed.getTime())) date = parsed.toISOString().slice(0, 10);
    }
    return { rate, date };
  } catch {
    return null;
  }
}
