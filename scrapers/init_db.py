"""資料庫初始化腳本 — 執行一次即可：python init_db.py"""
import os, psycopg2

def init_database():
    db_url = os.environ.get("POSTGRES_URL")
    if not db_url:
        raise ValueError("環境變數 POSTGRES_URL 未設定")
    print("連線至資料庫...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # 持股資料主表
    cur.execute("""
        CREATE TABLE IF NOT EXISTS etf_holdings (
            id            SERIAL PRIMARY KEY,
            etf_code      VARCHAR(10)    NOT NULL,
            stock_code    VARCHAR(10)    NOT NULL,
            stock_name    VARCHAR(50)    NOT NULL,
            weight        DECIMAL(6, 3)  NOT NULL,
            rank          INTEGER        NOT NULL,
            snapshot_date DATE           NOT NULL,
            created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (etf_code, stock_code, snapshot_date)
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_etf_holdings_date ON etf_holdings (snapshot_date DESC);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_etf_holdings_etf_date ON etf_holdings (etf_code, snapshot_date DESC);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_etf_holdings_stock ON etf_holdings (stock_code, snapshot_date DESC);")

    # ETF 規模（AUM）資料表
    cur.execute("""
        CREATE TABLE IF NOT EXISTS etf_aum (
            id            SERIAL PRIMARY KEY,
            etf_code      VARCHAR(10)    NOT NULL,
            aum_100m_twd  DECIMAL(10, 2) NOT NULL,   -- 億元台幣
            snapshot_date DATE           NOT NULL,
            created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (etf_code, snapshot_date)
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_etf_aum_etf_date ON etf_aum (etf_code, snapshot_date DESC);")

    conn.commit()
    cur.close()
    conn.close()
    print("資料庫初始化完成")

if __name__ == "__main__":
    init_database()
