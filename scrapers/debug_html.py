"""debug 腳本：印出 MoneyDJ 頁面的 table 結構"""
import requests
from bs4 import BeautifulSoup
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.moneydj.com/",
}

url = "https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=00981A.TW"
resp = requests.get(url, headers=headers, timeout=30)
resp.encoding = "utf-8"
soup = BeautifulSoup(resp.text, "lxml")

print(f"HTTP status: {resp.status_code}")
print(f"Content length: {len(resp.text)}")
print()

tables = soup.find_all("table")
print(f"找到 {len(tables)} 個 table")
for i, t in enumerate(tables):
    rows = t.find_all("tr")
    cls = t.get("class", [])
    tid = t.get("id", "")
    text = t.get_text()[:100].replace("\n", " ").strip()
    print(f"  Table[{i}] id={tid!r} class={cls} rows={len(rows)} text={text!r}")

# 找含有數字%的 table
print()
print("=== 含 % 的 table ===")
for i, t in enumerate(tables):
    if "%" in t.get_text():
        print(f"Table[{i}]:")
        for r in t.find_all("tr")[:5]:
            cells = [c.get_text(strip=True) for c in r.find_all(["td","th"])]
            if cells:
                print(f"  {cells}")

# 找含 2330 或 4位數字的內容
print()
print("=== 含股票代號的文字 ===")
for tag in soup.find_all(string=re.compile(r"^\d{4}$")):
    parent = tag.parent
    row = parent.find_parent("tr")
    if row:
        cells = [c.get_text(strip=True) for c in row.find_all(["td","th"])]
        print(f"  代號={tag.strip()!r} 整列={cells}")
