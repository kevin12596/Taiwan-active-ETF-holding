"""
嘗試 TWSE ETF 申購清單（PCF）— 每日完整持股揭露
"""
import requests, json, re
from datetime import date
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
TODAY = date.today().strftime("%Y%m%d")
CODE = "00981A"

urls_to_try = [
    # TWSE PCF API (各種格式嘗試)
    f"https://www.twse.com.tw/ETF/fundDiscolure?response=json&date={TODAY}&stockNo={CODE}",
    f"https://www.twse.com.tw/rwd/zh/ETF/PCF?response=json&date={TODAY}&stockNo={CODE}",
    f"https://www.twse.com.tw/fund/T86?response=json&date={TODAY}&stockNo={CODE}",
    # Yahoo Finance internal API
    f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{CODE}.TW?modules=topHoldings",
    # 公開資訊觀測站
    f"https://mops.twse.com.tw/mops/web/ajax_t78sb08?encodeURIComponent=1&step=1&firstin=1&off=1&keyword4=&code1=&TYPEK2=&checkbtn=&queryName=co_id&inpuType=co_id&TYPEK=all&isnew=false&co_id={CODE}&year=&season=",
]

for url in urls_to_try:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        print(f"\n{url[:90]}")
        print(f"  status={resp.status_code}, type={resp.headers.get('content-type','')[:40]}")
        if resp.status_code == 200 and resp.text.strip():
            try:
                data = resp.json()
                if isinstance(data, dict):
                    print(f"  json keys: {list(data.keys())[:6]}")
                    # 找可能含有持股的欄位
                    for k, v in data.items():
                        if isinstance(v, list) and len(v) > 0:
                            print(f"  {k}[{len(v)}]: {str(v[0])[:100]}")
                elif isinstance(data, list):
                    print(f"  list[{len(data)}]: {str(data[0])[:100] if data else 'empty'}")
            except Exception:
                soup = BeautifulSoup(resp.text, "lxml")
                rows_with_code = [r for r in soup.find_all("tr") if re.search(r'\d{4,5}', r.get_text())]
                print(f"  HTML: {len(rows_with_code)} rows with numeric codes")
                if rows_with_code:
                    print(f"  sample: {rows_with_code[0].get_text()[:100]}")
    except Exception as e:
        print(f"  ERROR: {e}")
