// Dataset intelligence layer — derives executive-grade business conclusions
// from raw uploaded rows. Used by CEO Brief and Executive Copilot so both
// surfaces reason over the same findings rather than generic KPI templates.
import type { DatasetColumn, DatasetRow, KpiSummary } from "./types";

const REGION_KEYS = ["region", "country", "state", "territory", "market", "location", "city", "zone", "area", "geo"];
const CATEGORY_KEYS = ["category", "product", "segment", "department", "sku", "type", "industry", "brand", "line"];
const CUSTOMER_KEYS = ["customer", "client", "account", "buyer"];
const REVENUE_KEYS = ["revenue", "sales", "amount", "gross", "income", "total"];
const PROFIT_KEYS = ["profit", "net_income", "net", "margin_value", "earnings"];
const MARKETING_KEYS = ["marketing", "ad_spend", "adspend", "campaign", "spend"];
const DATE_KEYS = ["date", "month", "period", "quarter", "week", "day", "timestamp"];

export interface GroupStat {
  name: string;
  total: number;
  share: number; // 0-1
  profit?: number;
  margin?: number; // pct
}

export interface BusinessIntelligence {
  metricName: "Revenue" | "Profit" | "Records";
  hasDimensions: boolean;
  regionDim: string | null;
  categoryDim: string | null;
  customerDim: string | null;
  regions: GroupStat[];
  categories: GroupStat[];
  topCustomers: GroupStat[];
  bestRegion: GroupStat | null;
  worstRegion: GroupStat | null;
  bestCategory: GroupStat | null;
  worstCategory: GroupStat | null;
  categoryConcentrationPct: number; // top category share
  regionConcentrationPct: number;
  customerConcentrationPct: number; // top 5 customers as % of revenue
  marketingRoi: number | null; // revenue / marketing spend
  growthPct: number;
  marginPct: number;
  totalRevenue: number;
  totalProfit: number;
  trendDirection: "up" | "down" | "flat";
  trendConsistency: number; // 0-100
  forecastUpsidePct: number;
  highlights: string[]; // human-ready bullet sentences
}

function pickCol(schema: DatasetColumn[], candidates: string[], type?: DatasetColumn["type"]): string | null {
  const lower = schema.map((c) => ({ ...c, l: c.name.toLowerCase() }));
  for (const cand of candidates) {
    const m = lower.find((c) => c.l.includes(cand) && (!type || c.type === type));
    if (m) return m.name;
  }
  return null;
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[,$%\s]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function aggregate(
  rows: DatasetRow[],
  dimCol: string,
  metricCol: string | null,
  profitCol: string | null,
): GroupStat[] {
  const map = new Map<string, { total: number; profit: number }>();
  for (const r of rows) {
    const raw = r[dimCol];
    if (raw === null || raw === undefined || raw === "") continue;
    const key = String(raw);
    const v = metricCol ? toNum(r[metricCol]) : 1;
    const p = profitCol ? toNum(r[profitCol]) : 0;
    const cur = map.get(key) ?? { total: 0, profit: 0 };
    cur.total += v;
    cur.profit += p;
    map.set(key, cur);
  }
  const arr = Array.from(map.entries()).map(([name, v]) => ({
    name,
    total: v.total,
    profit: v.profit,
    margin: v.total > 0 ? (v.profit / v.total) * 100 : 0,
  }));
  arr.sort((a, b) => b.total - a.total);
  const grand = arr.reduce((a, b) => a + b.total, 0);
  return arr.map((x) => ({ ...x, share: grand > 0 ? x.total / grand : 0 }));
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export function computeBusinessIntelligence(
  rows: DatasetRow[],
  schema: DatasetColumn[],
  kpis: KpiSummary | null,
): BusinessIntelligence {
  const regionCol = pickCol(schema, REGION_KEYS);
  const categoryCol = pickCol(schema, CATEGORY_KEYS);
  const customerCol = pickCol(schema, CUSTOMER_KEYS);
  const revCol = pickCol(schema, REVENUE_KEYS, "number");
  const profCol = pickCol(schema, PROFIT_KEYS, "number");
  const mktCol = pickCol(schema, MARKETING_KEYS, "number");
  const metricCol = revCol ?? profCol;
  const metricName: BusinessIntelligence["metricName"] = revCol ? "Revenue" : profCol ? "Profit" : "Records";

  const regions = regionCol ? aggregate(rows, regionCol, metricCol, profCol) : [];
  const categories = categoryCol ? aggregate(rows, categoryCol, metricCol, profCol) : [];
  const topCustomers = customerCol ? aggregate(rows, customerCol, metricCol, profCol).slice(0, 10) : [];

  const totalRevenue = revCol ? rows.reduce((a, r) => a + toNum(r[revCol]), 0) : kpis?.metrics.find((m) => m.key === "revenue")?.value ?? 0;
  const totalProfit = profCol ? rows.reduce((a, r) => a + toNum(r[profCol]), 0) : kpis?.metrics.find((m) => m.key === "profit")?.value ?? 0;
  const totalMarketing = mktCol ? rows.reduce((a, r) => a + toNum(r[mktCol]), 0) : 0;
  const marketingRoi = totalMarketing > 0 ? totalRevenue / totalMarketing : null;

  const growthPct = kpis?.metrics.find((m) => m.key === "growth")?.value ?? 0;
  const marginPct = kpis?.metrics.find((m) => m.key === "margin")?.value ?? (totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0);

  // Trend consistency via coefficient of variation on revenue series.
  let trendConsistency = 50;
  const series = kpis?.series ?? [];
  if (series.length >= 3) {
    const vals = series.map((s) => s.revenue);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sigma = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
    const cv = mean > 0 ? sigma / mean : 1;
    trendConsistency = Math.max(0, Math.min(100, Math.round(100 - cv * 100)));
  }
  const trendDirection: BusinessIntelligence["trendDirection"] = growthPct > 2 ? "up" : growthPct < -2 ? "down" : "flat";
  const forecastUpsidePct = growthPct > 0 ? Math.min(25, growthPct) : 0;

  const bestRegion = regions[0] ?? null;
  const worstRegion = regions.length > 1 ? regions[regions.length - 1] : null;
  const bestCategory = categories[0] ?? null;
  const worstCategory = categories.length > 1 ? categories[categories.length - 1] : null;
  const categoryConcentrationPct = (bestCategory?.share ?? 0) * 100;
  const regionConcentrationPct = (bestRegion?.share ?? 0) * 100;
  const top5CustGrand = topCustomers.slice(0, 5).reduce((a, b) => a + b.total, 0);
  const customerConcentrationPct = totalRevenue > 0 ? (top5CustGrand / totalRevenue) * 100 : 0;

  const highlights: string[] = [];
  if (bestRegion) highlights.push(`${bestRegion.name} leads ${metricName.toLowerCase()} with ${fmtMoney(bestRegion.total)} (${fmtPct(bestRegion.share * 100)} of total).`);
  if (worstRegion && worstRegion !== bestRegion) highlights.push(`${worstRegion.name} is the weakest region at ${fmtMoney(worstRegion.total)} — review go-to-market fit.`);
  if (bestCategory) highlights.push(`${bestCategory.name} is the top category at ${fmtPct(categoryConcentrationPct)} of ${metricName.toLowerCase()}.`);
  if (worstCategory && worstCategory !== bestCategory && (worstCategory.margin ?? 0) < (bestCategory?.margin ?? 0)) {
    highlights.push(`${worstCategory.name} drags margin at ${fmtPct(worstCategory.margin ?? 0)} — investigate cost structure.`);
  }
  if (customerConcentrationPct > 40) highlights.push(`Top 5 customers represent ${fmtPct(customerConcentrationPct)} of revenue — material concentration risk.`);
  if (marketingRoi !== null) highlights.push(`Marketing ROI is ${marketingRoi.toFixed(2)}x (${fmtMoney(totalRevenue)} revenue / ${fmtMoney(totalMarketing)} spend).`);
  highlights.push(`Trend is ${trendDirection} at ${fmtPct(growthPct)} half-over-half; consistency score ${trendConsistency}/100.`);

  return {
    metricName,
    hasDimensions: regions.length > 0 || categories.length > 0,
    regionDim: regionCol,
    categoryDim: categoryCol,
    customerDim: customerCol,
    regions,
    categories,
    topCustomers,
    bestRegion,
    worstRegion,
    bestCategory,
    worstCategory,
    categoryConcentrationPct,
    regionConcentrationPct,
    customerConcentrationPct,
    marketingRoi,
    growthPct,
    marginPct,
    totalRevenue,
    totalProfit,
    trendDirection,
    trendConsistency,
    forecastUpsidePct,
    highlights,
  };
}

// Quick formatted intelligence brief for use as conversational context.
export function intelligenceBriefText(intel: BusinessIntelligence): string {
  const lines: string[] = [];
  lines.push(`Revenue ${fmtMoney(intel.totalRevenue)} · Profit ${fmtMoney(intel.totalProfit)} · Margin ${fmtPct(intel.marginPct)} · Growth ${fmtPct(intel.growthPct)}.`);
  for (const h of intel.highlights) lines.push("• " + h);
  return lines.join("\n");
}

export { fmtMoney as formatMoney, fmtPct as formatPct };
// Tiny re-export so callers don't need to know about DATE_KEYS internals.
export const _DATE_KEYS = DATE_KEYS;
