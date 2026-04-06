"""
探索 TWSE / 公開資訊觀測站 是否有主動型 ETF 的完整每日持股
主動型 ETF 在台灣有每日完整持股揭露義務
"""
import requests, json
from datetime import date

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
TODAY = date.today().strftime("%Y%m%d")
CODES = ["00981A", "00980A", "00991A"]

# 嘗試 TWSE ETF 持股明細 API
print("=== TWSE ETF 持股查詢 ===")
urls_to_try = [
    f"https://www.twse.com.tw/ETF/etfDiv?response=json&ETFid=00981A&lang=zh",
    f"https://www.twse.com.tw/ETF/fund/ETFortfolio?response=json&date={TODAY}&stockNo=00981A",
    f"https://openapi.twse.com.tw/v1/ETF/DailyInfo",
    f"https://www.twse.com.tw/rwd/zh/ETF/etfPortfolio?date={TODAY}&ETFid=00981A&response=json",
]

for url in urls_to_try:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        print(f"\n{url[:80]}")
        print(f"  status={resp.status_code}, content-type={resp.headers.get('content-type','')[:50]}")
        if resp.status_code == 200:
            try:
                data = resp.json()
                print(f"  json keys: {list(data.keys()) if isinstance(data, dict) else f'list[{len(data)}]'}")
                if isinstance(data, list) and len(data) > 0:
                    print(f"  first item: {data[0]}")
                elif isinstance(data, dict):
                    for k, v in list(data.items())[:3]:
                        print(f"  {k}: {str(v)[:100]}")
            except Exception:
                print(f"  text preview: {resp.text[:200]}")
    except Exception as e:
        print(f"  ERROR: {e}")
