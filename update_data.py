import requests
import csv
from datetime import datetime

# החלף במפתח ה-API שלך מ-Polygon.io
API_KEY = "הכנס_כאן_את_המפתח_שלך"

# הטיקר של S&P 500 ב-Polygon יכול להיות SPX או SPY (תלוי מה אתה מעדיף)
TICKER = "SPX"

# קריאה ל-API של Polygon.io לקבלת נתוני יום קודם (Previous Close)
# תיעוד: https://polygon.io/docs/stocks#get_v2_aggs_ticker__ticker__prev
url = f"https://api.polygon.io/v2/aggs/ticker/{TICKER}/prev?adjusted=true&apiKey={API_KEY}"

response = requests.get(url)
data = response.json()

# מוציאים את הרשימה עם התוצאות
results = data.get("results", [])
if not results:
    print("No data found or invalid response from Polygon.io")
    exit(1)

# ניקח את האובייקט הראשון מתוך התוצאות (יום העסקים האחרון)
latest_data = results[0]
close_price = latest_data.get("c", 0)  # c מייצג את מחיר הסגירה
timestamp = latest_data.get("t", 0)    # t הוא חותמת זמן במילישניות

# ממירים את ה-Timestamp לתאריך (פורמט YYYY-MM-DD)
date_str = datetime.utcfromtimestamp(timestamp / 1000).strftime('%Y-%m-%d')

# כותבים את התוצאות לקובץ CSV (sp500_data.csv)
with open("sp500_data.csv", "w", newline="", encoding="utf-8") as csvfile:
    fieldnames = ["Date", "Close"]
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerow({"Date": date_str, "Close": close_price})

print(f"Updated data for {date_str} with close price {close_price}")
