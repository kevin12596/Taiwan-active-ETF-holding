import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("環境變數 POSTGRES_URL 未設定");
  return neon(url);
}

export interface Holding {
  etf_code: string;
  stock_code: string;
  stock_name: string;
  weight: number;
  rank: number;
  snapshot_date: string;
}

export interface HoldingWithChange extends Holding {
  prev_weight: number | null;
  weight_delta: number | null;
  is_new: boolean;
  is_out?: boolean;
  overlap_count: number;
}

export interface EtfMeta {
  etf_code: string;
  aum_100m_twd: number | null; // 億元，null 表示尚無資料
}

export async function getAvailableDates(): Promise<string[]> {
  const db = getDb();
  const rows = await db`
    SELECT DISTINCT snapshot_date::text AS snapshot_date
    FROM etf_holdings
    ORDER BY snapshot_date DESC
    LIMIT 90
  `;
  return rows.map((r) => r.snapshot_date);
}

export async function getHoldingsByDate(date: string, etfCodes?: string[]): Promise<Holding[]> {
  const db = getDb();
  const rows = etfCodes?.length
    ? await db`
        SELECT etf_code, stock_code, stock_name,
               CAST(weight AS FLOAT) AS weight, rank,
               snapshot_date::text AS snapshot_date
        FROM etf_holdings
        WHERE snapshot_date = ${date}
          AND etf_code = ANY(${etfCodes})
        ORDER BY etf_code, rank ASC
      `
    : await db`
        SELECT etf_code, stock_code, stock_name,
               CAST(weight AS FLOAT) AS weight, rank,
               snapshot_date::text AS snapshot_date
        FROM etf_holdings
        WHERE snapshot_date = ${date}
        ORDER BY etf_code, rank ASC
      `;
  return rows as Holding[];
}

// 一次查詢取得所有 ETF 的前期持股（避免 N+1）
export async function getPrevHoldingsForAll(
  currentDate: string,
  etfCodes: string[]
): Promise<Record<string, Holding[]>> {
  const db = getDb();
  const rows = await db`
    SELECT h.etf_code, h.stock_code, h.stock_name,
           CAST(h.weight AS FLOAT) AS weight, h.rank,
           h.snapshot_date::text AS snapshot_date
    FROM etf_holdings h
    INNER JOIN (
      SELECT etf_code, MAX(snapshot_date) AS prev_date
      FROM etf_holdings
      WHERE snapshot_date < ${currentDate}
        AND etf_code = ANY(${etfCodes})
      GROUP BY etf_code
    ) latest ON h.etf_code = latest.etf_code
            AND h.snapshot_date = latest.prev_date
    ORDER BY h.etf_code, h.rank ASC
  `;
  const result: Record<string, Holding[]> = {};
  for (const code of etfCodes) result[code] = [];
  for (const r of rows) {
    result[r.etf_code as string].push(r as Holding);
  }
  return result;
}

// 取得某日各 ETF 的產業分布
export async function getSectorsByDate(
  date: string,
  etfCodes: string[]
): Promise<Record<string, { sector_name: string; weight: number }[]>> {
  const db = getDb();
  const rows = await db`
    SELECT etf_code, sector_name, CAST(weight AS FLOAT) AS weight
    FROM etf_sectors
    WHERE snapshot_date = ${date}
      AND etf_code = ANY(${etfCodes})
    ORDER BY etf_code, weight DESC
  `;
  const result: Record<string, { sector_name: string; weight: number }[]> = {};
  for (const code of etfCodes) result[code] = [];
  for (const r of rows) {
    result[r.etf_code as string].push({
      sector_name: r.sector_name as string,
      weight: r.weight as number,
    });
  }
  return result;
}

// 取得某支股票在各 ETF 的歷史比重（最近 N 期）
export async function getStockTrend(
  stockCode: string,
  limitDays = 90
): Promise<{ etf_code: string; snapshot_date: string; weight: number }[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - limitDays);
  const sinceStr = since.toISOString().split("T")[0];
  const rows = await db`
    SELECT etf_code,
           snapshot_date::text AS snapshot_date,
           CAST(weight AS FLOAT) AS weight
    FROM etf_holdings
    WHERE stock_code = ${stockCode}
      AND snapshot_date >= ${sinceStr}
    ORDER BY etf_code, snapshot_date ASC
  `;
  return rows as { etf_code: string; snapshot_date: string; weight: number }[];
}

// 取得某 ETF 的 AUM 歷史趨勢
export async function getAumTrend(
  etfCode: string
): Promise<{ snapshot_date: string; aum_100m_twd: number }[]> {
  const db = getDb();
  const rows = await db`
    SELECT snapshot_date::text AS snapshot_date,
           CAST(aum_100m_twd AS FLOAT) AS aum_100m_twd
    FROM etf_aum
    WHERE etf_code = ${etfCode}
    ORDER BY snapshot_date ASC
  `;
  return rows as { snapshot_date: string; aum_100m_twd: number }[];
}

// 取得最新一期各 ETF 的 AUM
export async function getLatestAum(
  etfCodes: string[]
): Promise<Record<string, number | null>> {
  const db = getDb();
  const rows = await db`
    SELECT DISTINCT ON (etf_code)
           etf_code,
           CAST(aum_100m_twd AS FLOAT) AS aum_100m_twd
    FROM etf_aum
    WHERE etf_code = ANY(${etfCodes})
    ORDER BY etf_code, snapshot_date DESC
  `;
  const result: Record<string, number | null> = {};
  for (const code of etfCodes) result[code] = null;
  for (const r of rows) result[r.etf_code as string] = r.aum_100m_twd as number;
  return result;
}
