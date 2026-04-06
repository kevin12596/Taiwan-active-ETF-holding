"""
深入探索 TWSE T86（ETF申購買回基準組合）API
今天是週日，試最近的交易日
"""
import requests, json
from datetime import date, timedelta

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
CODES = ["00981A", "00980A", "00991A"]

# 找最近的交易日（往前最多找 5 天）
today = date.today()
candidates = [(today - timedelta(days=i)).strftime("%Y%m%d") for i in range(6)]

print("=== T86 API 探索 ===")
for code in CODES:
    for d in candidates:
        url = f"https://www.twse.com.tw/fund/T86?response=json&date={d}&stockNo={code}"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            continue
        try:
            data = resp.json()
        except Exception:
            continue
        if data.get("stat") == "OK" or (isinstance(data.get("total"), int) and data["total"] > 0):
            print(f"\n{code} @ {d}: FOUND!")
            print(f"  keys: {list(data.keys())}")
            if "fields" in data:
                print(f"  fields: {data['fields']}")
            if "data" in data:
                print(f"  data[{len(data['data'])}] rows")
                print(f"  first row: {data['data'][0]}")
                print(f"  last  row: {data['data'][-1]}")
            break
        else:
            print(f"{code} @ {d}: stat={data.get('stat')}, total={data.get('total')}")
            break  # 只試第一個日期看格式
