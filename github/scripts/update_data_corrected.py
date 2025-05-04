import yfinance as yf
import pandas as pd
from datetime import datetime

# Fetch historical data for the last month
ticker = yf.Ticker("^GSPC")
hist = ticker.history(period="1mo")

if hist.empty:
    raise Exception("No data received from Yahoo Finance.")

# Get the last closing value
last = hist.tail(1).iloc[0]
closing = round(last["Close"], 2)
date = last.name.strftime("%d/%m/%Y")

# Corrected path to match actual data location
csv_file = "public/sp500_data.csv"
df = pd.read_csv(csv_file)

# Add new data if not already present
if not df['Month'].astype(str).str.contains(date).any():
    df = pd.concat([df, pd.DataFrame([{"Month": date, "Closing": closing}])], ignore_index=True)
    df.to_csv(csv_file, index=False)
    print(f"Added new row: {date}, {closing}")
else:
    print(f"Data for {date} already exists.")
