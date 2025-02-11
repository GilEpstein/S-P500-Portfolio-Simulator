function startCalculation() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        alert("❌ אנא בחר קובץ CSV להעלאה!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const csvData = e.target.result;
        const transactions = parseCSV(csvData);

        console.log("📂 נתוני התיק לאחר פענוח:", transactions);

        fetch('sp500_data.csv')
            .then(response => response.text())
            .then(data => {
                console.log("📊 תוכן גולמי של sp500_data.csv:");
                console.log(data);

                const sp500Data = parseSP500CSV(data);
                console.log("📊 נתוני S&P 500 לאחר פענוח:", sp500Data);

                if (sp500Data.length === 0) {
                    alert("❌ שגיאה: `sp500_data.csv` לא נטען כראוי!");
                    return;
                }

                const result = comparePortfolioWithSP500(transactions, sp500Data);
                displayResult(result);
            })
            .catch(error => console.error("❌ שגיאה בטעינת sp500_data.csv:", error));
    };

    reader.readAsText(file);
}

// ✅ פונקציה לפענוח קובץ הקניות והמכירות
function parseCSV(data) {
    const rows = data.split("\n").map(row => row.trim()).filter(row => row.length > 0); // מסיר שורות ריקות
    const headers = rows[0].split(",").map(header => header.trim());

    return rows.slice(1).map(row => {
        const values = row.split(",");
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index]?.trim();
        });
        return obj;
    }).filter(row => row.Date && row.Action && row.Amount); // מסנן שורות ריקות
}

// ✅ פונקציה לפענוח `sp500_data.csv`
function parseSP500CSV(data) {
    const rows = data.split("\n").map(row => row.trim()).filter(row => row.length > 0); // מסיר שורות ריקות

    if (rows.length < 2) {
        console.error("❌ `sp500_data.csv` מכיל מעט מדי נתונים!");
        return [];
    }

    rows.shift(); // מסיר את הכותרת (Date,Close)

    return rows.map(row => {
        const columns = row.split(","); // מפריד לפי פסיקים
        if (columns.length !== 2) return null; // מוודא שיש בדיוק שני עמודות

        return {
            date: columns[0].trim(),
            close: parseFloat(columns[1].trim())
        };
    }).filter(row => row !== null && !isNaN(row.close)); // מסנן שורות ריקות או שגויות
}

// ✅ פונקציה להשוואה בין תיק המשתמש ל-S&P 500
function comparePortfolioWithSP500(transactions, sp500Data) {
    let sp500Units = 0;
    let totalValue = 0;

    transactions.forEach(transaction => {
        const date = transaction["Date"];
        const action = transaction["Action"].toLowerCase();
        const amount = parseFloat(transaction["Amount"]);

        // בודק אם התאריך קיים בנתונים של S&P 500
        const spPrice = sp500Data.find(row => row.date === date)?.close;
        
        if (!spPrice) {
            console.warn(`⚠️ אין מסחר בתאריך ${date}, העסקה לא בוצעה.`);
            return; // מדלג על העסקה אם אין נתון
        }

        const units = amount / spPrice;
        if (action === "buy") sp500Units += units;
        if (action === "sell") sp500Units -= units;
    });

    // שימוש במחיר האחרון שיש בנתוני S&P 500 כדי לחשב את הערך הסופי
    const lastPrice = sp500Data[sp500Data.length - 1]?.close || 0;
    totalValue = sp500Units * lastPrice;

    return `📈 שווי התיק אילו היה מושקע ב-S&P 500: ${totalValue.toFixed(2)} דולר`;
}

// ✅ פונקציה להצגת התוצאה
function displayResult(result) {
    document.getElementById('result').innerText = result;
}
