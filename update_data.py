import os
import csv
import requests
from datetime import datetime
import urllib.parse

# הגדר את המפתח שלך
API_KEY = "0bhmMV9ffeGECne1ZojDkMaIoqBklxeq"
# השתמש בסמל ^GSPC
TICKER = "^GSPC"
# קידוד URL לסמל (כדי שהתווים המיוחדים יתורגמו כראוי)
encoded_ticker = urllib.parse.quote(TICKER)

URL = f"https://api.polygon.io/v2/aggs/ticker/{encoded_ticker}/prev?adjusted=true&apiKey={API_KEY}"

response = requests.get(URL)
data = response.json()

print("Response from API:")
print(data)

results = data.get("results", [])
if not results:
    print("No data found or invalid response.")
    exit(1)

latest_data = results[0]
close_price = latest_data.get("c", 0)  # מחיר הסגירה
timestamp = latest_data.get("t", 0)    # timestamp במילישניות

# המרת ה-timestamp לתאריך בפורמט YYYY-MM-DD (UTC)
date_str = datetime.utcfromtimestamp(timestamp/1000).strftime('%Y-%m-%d')

csv_file = "sp500_data.csv"
file_exists = os.path.exists(csv_file)
file_is_empty = not file_exists or os.path.getsize(csv_file) == 0

# פותחים את הקובץ במצב append כדי להוסיף רשומה חדשה מבלי לדרוס את הנתונים הקיימים
with open(csv_file, "a", newline="", encoding="utf-8") as f:
    fieldnames = ["Date", "Close"]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    if file_is_empty:
        writer.writeheader()
    writer.writerow({"Date": date_str, "Close": close_price})

print(f"Appended data for {date_str} with close price {close_price}")
