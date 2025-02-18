import os
import csv
import requests
from datetime import datetime

# החלף את המפתח כאן למפתח שלך
API_KEY = "0bhmMV9ffeGECne1ZojDkMaIoqBklxeq"
TICKER = "SPX"  # לדוגמה, עבור S&P 500
URL = f"https://api.polygon.io/v2/aggs/ticker/{TICKER}/prev?adjusted=true&apiKey={API_KEY}"

response = requests.get(URL)
data = response.json()

results = data.get("results", [])
if not results:
    print("No data found or invalid response.")
    exit(1)

# בוחרים את התוצאה הראשונה (הנתון העדכני ביותר)
latest_data = results[0]
close_price = latest_data.get("c", 0)  # 'c' מייצג את מחיר הסגירה
timestamp = latest_data.get("t", 0)    # 't' הוא ה-timestamp במילישניות

# המרת ה-timestamp לתאריך בפורמט YYYY-MM-DD (UTC)
date_str = datetime.utcfromtimestamp(timestamp/1000).strftime('%Y-%m-%d')

csv_file = "sp500_data.csv"
date_already_exists = False

# בדיקה אם התאריך כבר קיים בקובץ
if os.path.isfile(csv_file):
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["Date"] == date_str:
                date_already_exists = True
                break

# אם התאריך לא קיים, נוסיף שורה חדשה לקובץ
if not date_already_exists:
    write_mode = "a"
    file_is_empty = (not os.path.exists(csv_file)) or os.path.getsize(csv_file) == 0

    with open(csv_file, write_mode, newline="", encoding="utf-8") as f:
        fieldnames = ["Date", "Close"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if file_is_empty:
            writer.writeheader()
        writer.writerow({"Date": date_str, "Close": close_price})

    print(f"Appended data for {date_str} with close price {close_price}")
else:
    print(f"Data for {date_str} already exists, skipping.")
