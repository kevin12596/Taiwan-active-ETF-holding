"""
嘗試 Yahoo Finance 台灣的 ETF 完整持股 API
"""
import requests, re, json
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

CODE = "00981A"

# Yahoo Finance 台灣 ETF 持股頁
urls_to_try = [
    f"https://tw.stock.yahoo.com/quote/{CODE}/holding",
    f"https://finance.yahoo.com/quote/{CODE}.TW/holdings/",
]

for url in urls_to_try:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        print(f"\n{url}")
        print(f"  status={resp.status_code}")
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "lxml")
            # 找含有股票代號格式的文字
            text = soup.get_text()
            matches = re.findall(r'\d{4,5}(?:\.\w+)?', text)
            stock_codes = [m for m in matches if re.match(r'^\d{4,5}$', m)]
            print(f"  可能的股票代號: {stock_codes[:20]}")
            # 找表格
            tables = soup.find_all("table")
            print(f"  tables: {len(tables)}")
            for t in tables[:2]:
                rows = t.find_all("tr")
                print(f"    table rows: {len(rows)}, sample: {rows[0].get_text()[:80] if rows else 'empty'}")
    except Exception as e:
        print(f"  ERROR: {e}")
