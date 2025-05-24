import requests
import pandas as pd
from datetime import datetime
import os
from urllib.parse import urlencode

# Define CSV path
FILE_NAME = "sp500_data.csv"

API_KEY = os.environ["API_KEY"]
SYMBOL = "^GSPC"
API_DATE_FORMAT="%Y-%m-%d"
API_PARAMS = {
    "symbol": "^GSPC",
    "apikey": API_KEY,
    "from": datetime(year=1929, month=1, day=1).strftime(API_DATE_FORMAT),
    "to": datetime.now().strftime(API_DATE_FORMAT),
}
API_ENDPOINT = f"https://financialmodelingprep.com/stable/historical-price-eod/full?{urlencode(API_PARAMS)}"


response = requests.get(API_ENDPOINT)

if response.status_code != 200:
    msg = f"Error while fetching data: {response.content}"
    print(msg)
    raise Exception(msg)


table = pd.DataFrame(response.json())
table.rename(columns={"date": "Month", "close": "Closing"}, inplace=True)
table.drop(columns="symbol", inplace=True)
table.to_csv(FILE_NAME, index=False)
