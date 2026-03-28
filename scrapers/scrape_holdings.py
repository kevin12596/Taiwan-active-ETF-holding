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
    html = None
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
    holdings = []

    # 找包含持股比重資料的 table
    target_table = None
    for table in soup.find_all("table"):
        text = table.get_text()
        # 持股表格特徵：含有 4 位數股票代號 + 百分比
        if re.search(r"\d{4}", text) and "%" in text and len(table.find_all("tr")) >= 5:
            target_table = table
            break

    if not target_table:
        logger.error(f"找不到 {etf_code} 的持股表格")
        return []

    rank = 0
    for row in target_table.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if not cells:
            continue
        texts = [c.get_text(strip=True) for c in cells]

        stock_code = stock_name = None
        weight = None

        for i, t in enumerate(texts):
            # 比對股票代號 (純4~5位數字，或帶.TW後綴)
            m = re.match(r"^(\d{4,5})(\.TW)?$", t)
            if m:
                stock_code = m.group(1)
                # 下一格是名稱
                if i + 1 < len(texts) and texts[i + 1]:
                    stock_name = texts[i + 1]
                # 找比重 (找 xx.xx% 格式)
                for t2 in texts:
                    pm = re.search(r"(\d{1,3}\.\d{1,3})%?$", t2)
                    if pm:
                        try:
                            w = float(pm.group(1))
                            if 0 < w < 30:  # 合理持股比重
                                weight = w
                                break
                        except ValueError:
                            pass
                break

        if stock_code and stock_name and weight is not None:
            rank += 1
            holdings.append({"stock_code": stock_code, "stock_name": stock_name, "weight": weight, "rank": rank})
        if rank >= 10:
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
    if today.weekday() >= 5:
        logger.warning(f"{today} 為週末，跳過")
        return

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
