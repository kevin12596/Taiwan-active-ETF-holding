"""
台灣主動型 ETF 持股爬蟲
資料來源：MoneyDJ 理財網 Basic0007
台灣時間每日 17:00 由 GitHub Actions 自動執行
"""
import os, re, time, logging
from datetime import date
import psycopg2, requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)

ETF_CODES = ["00981A", "00980A", "00991A"]
MONEYDJ_URL = "https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid={etf_code}.TW"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.moneydj.com/",
}

def fetch_holdings(etf_code: str) -> list[dict]:
    url = MONEYDJ_URL.format(etf_code=etf_code)
    logger.info(f"抓取 {etf_code}：{url}")

    for attempt in range(1, 4):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            resp.encoding = "utf-8"
            html = resp.text
            break
        except requests.RequestException as e:
            logger.warning(f"第 {attempt}/3 次失敗：{e}")
            if attempt < 3:
                time.sleep(5)
            else:
                raise RuntimeError(f"無法抓取 {etf_code}") from e

    soup = BeautifulSoup(html, "lxml")

    # MoneyDJ 持股表格固定 id: ctl00_ctl00_MainContent_MainContent_stable3
    # 格式：['名稱(代號.TW)', '比例(%)', '持有股數']
    table = soup.find("table", id=re.compile(r"stable3$"))

    if not table:
        # 備用：找 class=datalist 且含 TW 的表格
        for t in soup.find_all("table", class_="datalist"):
            if ".TW)" in t.get_text():
                table = t
                break

    if not table:
        logger.error(f"{etf_code}: 找不到持股表格")
        return []

    holdings = []
    rows = table.find_all("tr")
    for row in rows:
        cells = [c.get_text(strip=True) for c in row.find_all(["td", "th"])]
        if len(cells) < 2:
            continue
        # 格式：台積電(2330.TW)
        m = re.match(r"^(.+)\((\d{4,5})\.TW\)$", cells[0])
        if not m:
            continue
        stock_name = m.group(1)
        stock_code = m.group(2)
        try:
            weight = float(cells[1].replace(",", ""))
        except (ValueError, IndexError):
            continue
        if not (0 < weight < 50):
            continue
        holdings.append({
            "stock_code": stock_code,
            "stock_name": stock_name,
            "weight": weight,
            "rank": len(holdings) + 1,
        })
        if len(holdings) >= 10:
            break

    logger.info(f"{etf_code} 抓到 {len(holdings)} 筆")
    return holdings

def save_to_db(etf_code: str, holdings: list[dict], snapshot_date: date) -> int:
    conn = psycopg2.connect(os.environ["POSTGRES_URL"])
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
    conn.close()
    return inserted

def main():
    today = date.today()
    logger.info(f"=== 開始爬蟲，日期：{today} ===")
    success, failed = 0, []

    for code in ETF_CODES:
        try:
            holdings = fetch_holdings(code)
            if not holdings:
                failed.append(code)
                continue
            inserted = save_to_db(code, holdings, today)
            logger.info(f"{'新增' if inserted > 0 else '已存在'} {code}：{inserted} 筆")
            success += 1
        except Exception as e:
            logger.error(f"{code} 失敗：{e}")
            failed.append(code)
        time.sleep(2)

    logger.info(f"=== 完成：{success}/{len(ETF_CODES)}，失敗：{failed} ===")
    if success == 0:
        exit(1)

if __name__ == "__main__":
    main()
