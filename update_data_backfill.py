import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import os

# Define CSV path
csv_file = "sp500_data.csv"

# Fetch ticker
ticker = yf.Ticker("^GSPC")

# Try to load existing data
if os.path.exists(csv_file):
    df = pd.read_csv(csv_file)

    if 'Date' in df.columns:
        df["Date"] = pd.to_datetime(df["Date"], dayfirst=True, errors='coerce')
        last_date = df["Date"].max()
        start_date = last_date + timedelta(days=1)
    else:
        print("⚠️ Warning: 'Date' column not found. Creating new structure.")
        df = pd.DataFrame(columns=["Date", "Close"])
        start_date = datetime(1930, 1, 1)
else:
    df = pd.DataFrame(columns=["Date", "Close"])
    start_date = datetime(1930, 1, 1)

end_date = datetime.today()

# Download new data
hist = ticker.history(start=start_date, end=end_date)

if hist.empty:
    print("ℹ️ No new data available.")
else:
    for date, row in hist.iterrows():
        formatted_date = date.strftime("%d/%m/%Y")
        closing_price = round(row["Close"], 2)
        df = pd.concat([df, pd.DataFrame([{"Date": formatted_date, "Close": closing_price}])], ignore_index=True)
        print(f"✅ Added: {formatted_date} – {closing_price}")

    # Remove duplicates and sort
    df.drop_duplicates(subset="Date", keep="last", inplace=True)
    df.sort_values("Date", inplace=True)
    df.to_csv(csv_file, index=False)
    print("✅ CSV updated successfully.")
