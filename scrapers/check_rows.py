"""
探索 MoneyDJ 是否有超過前10大的完整持股頁面
檢查 Basic0006、Ind0002、Chart0005 等可能的持股明細頁
"""
import requests, re
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
CODE = "00981A"
PAGES = ["Basic0006", "Basic0007", "Basic0008", "Ind0001", "Ind0002", "Chart0005", "Chart0006"]

for page in PAGES:
    url = f"https://www.moneydj.com/ETF/X/Basic/{page}.xdjhtm?etfid={CODE}.TW"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"{page}: HTTP {resp.status_code}")
            continue
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "lxml")
        # 找含有 .TW) 格式的行數
        tw_rows = [r for r in soup.find_all("tr") if ".TW)" in r.get_text()]
        tables = [(t.get("id", "")[:40], len(t.find_all("tr"))) for t in soup.find_all("table") if t.get("id") and ".TW)" in t.get_text()]
        print(f"{page}: {len(tw_rows)} .TW rows, tables={tables}")
        if tw_rows:
            sample = [c.get_text(strip=True) for c in tw_rows[0].find_all(["td","th"])]
            print(f"  sample: {sample[:4]}")
    except Exception as e:
        print(f"{page}: ERROR {e}")
