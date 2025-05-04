import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import os

# הגדרת הקובץ
csv_file = "public/sp500_data.csv"

# הורדת נתוני S&P500
ticker = yf.Ticker("^GSPC")

# אם הקובץ קיים, נזהה מהו התאריך האחרון
if os.path.exists(csv_file):
    df = pd.read_csv(csv_file)
    df["Month"] = pd.to_datetime(df["Month"], dayfirst=True)
    last_date = df["Month"].max()
    start_date = last_date + timedelta(days=1)
else:
    df = pd.DataFrame(columns=["Month", "Closing"])
    start_date = datetime(1930, 1, 1)

# תאריך סיום: היום
end_date = datetime.today()

# הורדת נתונים מהתאריך האחרון ועד היום
hist = ticker.history(start=start_date, end=end_date)

if hist.empty:
    print("לא התקבלו נתונים חדשים.")
else:
    for date, row in hist.iterrows():
        formatted_date = date.strftime("%d/%m/%Y")
        closing_price = round(row["Close"], 2)
        df = pd.concat([df, pd.DataFrame([{"Month": formatted_date, "Closing": closing_price}])], ignore_index=True)
        print(f"הוספה שורה: {formatted_date} – {closing_price}")

    # שמירה מחדש לקובץ
    df.drop_duplicates(subset="Month", keep="last", inplace=True)
    df.sort_values("Month", inplace=True)
    df.to_csv(csv_file, index=False, date_format="%d/%m/%Y")
    print("✅ הקובץ עודכן בהצלחה.")