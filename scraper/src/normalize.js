export function normalizeRecord(raw) {
  const out = { ...raw };
  // price_text like "£51.77" -> number
  const priceMatch = (raw.price_text || '').replace(',', '').match(/([0-9]+\.?[0-9]*)/);
  out.price_gbp = priceMatch ? Number(priceMatch[1]) : null;
  // ensure product_url is absolute (assume already absolute)
  try { out.product_url = new URL(raw.product_url).href; } catch (e) {}
  return out;
}
