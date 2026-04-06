import requests, re
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

for code in ["00981A", "00980A", "00991A"]:
    url = f"https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid={code}.TW"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.encoding = "utf-8"
    soup = BeautifulSoup(resp.text, "lxml")

    table3 = soup.find("table", id=re.compile(r"stable3$"))
    rows3 = []
    if table3:
        for r in table3.find_all("tr"):
            cells = [c.get_text(strip=True) for c in r.find_all(["td", "th"])]
            if cells and re.match(r"^(.+)\(\d{4,5}\.TW\)$", cells[0]):
                rows3.append(cells)

    tables = [(t.get("id", ""), len(t.find_all("tr"))) for t in soup.find_all("table") if t.get("id")]

    print(f"\n=== {code} ===")
    print(f"stable3 行數: {len(rows3)}")
    print(f"所有 table ids: {tables}")
    if rows3:
        print("前3筆:", rows3[:3])
        print("後3筆:", rows3[-3:])
