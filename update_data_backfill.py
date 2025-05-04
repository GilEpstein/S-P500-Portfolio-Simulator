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

    if 'Month' in df.columns:
        df["Month"] = pd.to_datetime(df["Month"], dayfirst=True, errors='coerce')
        last_date = df["Month"].max()
        start_date = last_date + timedelta(days=1)
    else:
        print("⚠️ Warning: 'Month' column not found. Creating new structure.")
        df = pd.DataFrame(columns=["Month", "Closing"])
        start_date = datetime(1930, 1, 1)
else:
    df = pd.DataFrame(columns=["Month", "Closing"])
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
        df = pd.concat([df, pd.DataFrame([{"Month": formatted_date, "Closing": closing_price}])], ignore_index=True)
        print(f"✅ Added: {formatted_date} – {closing_price}")

    # Remove duplicates and sort
    df["Month"] = pd.to_datetime(df["Month"], dayfirst=True, errors='coerce')
    df.drop_duplicates(subset="Month", keep="last", inplace=True)
    df.sort_values("Month", inplace=True)
    df.to_csv(csv_file, index=False)
    print("✅ CSV updated successfully.")
