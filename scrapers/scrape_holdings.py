"""
台灣主動型 ETF 持股爬蟲
資料來源：MoneyDJ 理財網 Basic0007
台灣時間每日 17:00 由 GitHub Actions 自動執行
"""
import os, re, time, logging
from datetime import date, datetime, timedelta, timezone
import psycopg2, requests
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

ETF_CODES = ["00981A", "00988A", "00991A"]
MONEYDJ_URL = "https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid={etf_code}.TW"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.moneydj.com/",
}


def get_snapshot_date() -> date:
    """
    取得本次快照應記錄的交易日（以台灣時區 UTC+8 為準）。
    若今天是週末（手動觸發），回傳最近的週五。
    """
    tw_tz = timezone(timedelta(hours=8))
    today = datetime.now(tw_tz).date()
    weekday = today.weekday()  # 0=週一, 6=週日
    if weekday == 5:   # 週六
        return today - timedelta(days=1)
    if weekday == 6:   # 週日
        return today - timedelta(days=2)
    return today


def fetch_page(etf_code: str) -> BeautifulSoup | None:
    """抓取 MoneyDJ 頁面，回傳 BeautifulSoup 物件"""
    url = MONEYDJ_URL.format(etf_code=etf_code)
    for attempt in range(1, 4):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            resp.encoding = "utf-8"
            return BeautifulSoup(resp.text, "lxml")
        except requests.RequestException as e:
            logger.warning(f"{etf_code} 第 {attempt}/3 次請求失敗：{e}")
            if attempt < 3:
                time.sleep(5)
    return None


def parse_holdings(etf_code: str, soup: BeautifulSoup) -> list[dict]:
    """
    從 MoneyDJ 持股表格解析前10大持股
    表格 id 結尾為 stable3，格式：名稱(代號.TW) | 比例(%) | 持有股數
    """
    table = soup.find("table", id=re.compile(r"stable3$"))
    if not table:
        # 備用：找 class=datalist 且含「代號.交易所)」格式的表格
        # 支援 .TW / .US / .KS / .HK 等各交易所後綴
        for t in soup.find_all("table", class_="datalist"):
            if re.search(r"\([A-Z0-9]{1,10}\.[A-Z]{2,3}\)", t.get_text()):
                table = t
                break

    if not table:
        logger.error(f"{etf_code}: 找不到持股表格")
        return []

    holdings = []
    for row in table.find_all("tr"):
        cells = [c.get_text(strip=True) for c in row.find_all(["td", "th"])]
        if len(cells) < 2:
            continue
        # 格式：台股「台積電(2330.TW)」、美股「Sandisk(SNDK.US)」、韓股「Samsung(009150.KS)」等
        m = re.match(r"^(.+)\(([A-Z0-9]{1,10})\.([A-Z]{2,3})\)$", cells[0])
        if not m:
            continue
        # 只保留代號，去掉交易所後綴（.TW / .US / .KS ...）
        stock_code = m.group(2)
        try:
            weight = float(cells[1].replace(",", ""))
        except (ValueError, IndexError):
            continue
        if not (0 < weight < 50):
            continue
        holdings.append({
            "stock_code": stock_code,
            "stock_name": m.group(1),
            "weight": weight,
            "rank": len(holdings) + 1,
        })
        if len(holdings) >= 10:
            break

    logger.info(f"{etf_code} 抓到 {len(holdings)} 筆持股")
    return holdings


def parse_aum_and_sectors(etf_code: str, soup: BeautifulSoup) -> tuple[float | None, list[dict]]:
    """
    從產業分類表格（stable2）解析 AUM 與產業分布
    格式：[顏色, 產業名稱, 投資金額(萬元), 比例(%)]
    回傳：(aum_億元, [{sector_name, weight}])
    """
    table = soup.find("table", id=re.compile(r"stable2$"))
    if not table:
        return None, []
    total_10k = 0.0
    sectors = []
    for row in table.find_all("tr"):
        cells = [c.get_text(strip=True) for c in row.find_all(["td", "th"])]
        if len(cells) < 4 or not cells[1] or not cells[2]:
            continue
        try:
            amount = float(cells[2].replace(",", ""))
            weight = float(cells[3].replace(",", "").rstrip("%"))
        except ValueError:
            continue
        if amount <= 0 or weight <= 0:
            continue
        total_10k += amount
        sectors.append({"sector_name": cells[1], "weight": round(weight, 3)})
    aum_100m = round(total_10k / 10000, 2) if total_10k > 0 else None
    if aum_100m:
        logger.info(f"{etf_code} AUM 估算：{aum_100m} 億元，{len(sectors)} 個產業")
    return aum_100m, sectors


def save_holdings(etf_code: str, holdings: list[dict], snapshot_date: date, conn) -> int:
    cur = conn.cursor()
    inserted = 0
    for h in holdings:
        cur.execute(
            "INSERT INTO etf_holdings (etf_code,stock_code,stock_name,weight,rank,snapshot_date) "
            "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (etf_code,stock_code,snapshot_date) DO NOTHING",
            (etf_code, h["stock_code"], h["stock_name"], h["weight"], h["rank"], snapshot_date),
        )
        if cur.rowcount > 0:
            inserted += 1
    conn.commit()
    cur.close()
    return inserted


def save_aum(etf_code: str, aum: float, snapshot_date: date, conn) -> None:
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO etf_aum (etf_code, aum_100m_twd, snapshot_date) "
        "VALUES (%s,%s,%s) ON CONFLICT (etf_code, snapshot_date) DO NOTHING",
        (etf_code, aum, snapshot_date),
    )
    conn.commit()
    cur.close()


def save_sectors(etf_code: str, sectors: list[dict], snapshot_date: date, conn) -> None:
    if not sectors:
        return
    cur = conn.cursor()
    cur.executemany(
        "INSERT INTO etf_sectors (etf_code, sector_name, weight, snapshot_date) "
        "VALUES (%s,%s,%s,%s) ON CONFLICT (etf_code, sector_name, snapshot_date) DO NOTHING",
        [(etf_code, s["sector_name"], s["weight"], snapshot_date) for s in sectors],
    )
    conn.commit()
    cur.close()


def main():
    snapshot_date = get_snapshot_date()
    logger.info(f"=== 開始爬蟲，快照日期：{snapshot_date} ===")

    conn = psycopg2.connect(os.environ["POSTGRES_URL"])
    success, failed = 0, []

    for code in ETF_CODES:
        try:
            soup = fetch_page(code)
            if soup is None:
                logger.error(f"❌ {code}: 頁面抓取失敗（已重試3次）")
                failed.append(code)
                continue

            holdings = parse_holdings(code, soup)
            if not holdings:
                logger.error(f"❌ {code}: 持股解析失敗（抓到0筆）")
                failed.append(code)
                continue

            if len(holdings) < 10:
                logger.warning(f"⚠️  {code}: 只抓到 {len(holdings)} 筆（預期10筆），仍寫入")

            inserted = save_holdings(code, holdings, snapshot_date, conn)
            status = f"新增 {inserted} 筆" if inserted > 0 else "已存在，略過"
            logger.info(f"✅ {code} 持股：{status}")

            aum, sectors = parse_aum_and_sectors(code, soup)
            if aum:
                save_aum(code, aum, snapshot_date, conn)
            if sectors:
                save_sectors(code, sectors, snapshot_date, conn)

            success += 1

        except Exception as e:
            logger.error(f"❌ {code} 處理失敗：{e}", exc_info=True)
            failed.append(code)

        time.sleep(2)

    conn.close()
    logger.info(f"=== 完成：{success}/{len(ETF_CODES)} 成功，失敗：{failed or '無'} ===")

    if failed:
        logger.error(f"以下 ETF 本次未能抓取資料：{failed}")
    if success == 0:
        exit(1)


if __name__ == "__main__":
    main()
