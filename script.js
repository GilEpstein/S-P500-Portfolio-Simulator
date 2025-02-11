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
                drawChart(transactions, sp500Data);
            })
            .catch(error => console.error("❌ שגיאה בטעינת sp500_data.csv:", error));
    };

    reader.readAsText(file);
}

// פונקציה לפענוח קובץ ה-CSV של המשתמש
function parseCSV(data) {
    const delimiter = data.includes("\t") ? "\t" : ","; 
    const rows = data.split("\n").map(row => row.split(delimiter));
    const headers = rows[0].map(header => header.trim());

    return rows.slice(1).map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index]?.trim();
        });
        return obj;
    }).filter(row => Object.keys(row).length > 1);
}

// ✅ פונקציה לפענוח `sp500_data.csv` - הסרת הכותרת `Date,Close` ותמיכה בהפרדות שונות
function parseSP500CSV(data) {
    const rows = data.split("\n").map(row => row.trim()).filter(row => row.length > 0); // מסיר שורות ריקות

    if (rows.length < 2) {
        console.error("❌ `sp500_data.csv` מכיל מעט מדי נתונים!");
        return [];
    }

    rows.shift(); // מסיר את הכותרת (Date,Close)

    return rows.map(row => {
        const columns = row.includes(",") ? row.split(",") : row.split(/\s+/); // תומך גם ברווחים וגם בפסיקים
        if (columns.length !== 2) return null; // וידוא שיש בדיוק שני עמודות

        return {
            date: columns[0].trim(),
            close: parseFloat(columns[1].trim())
        };
    }).filter(row => row !== null && !isNaN(row.close)); // מסנן שורות ריקות או שגויות
}

// פונקציה להשוואה בין תיק המשתמש ל-S&P 500
function comparePortfolioWithSP500(transactions, sp500Data) {
    let sp500Units = 0;
    let totalValue = 0;

    transactions.forEach(transaction => {
        const date = transaction["Date"];
        const action = transaction["Action"];
        const amount = parseFloat(transaction["Amount"]);

        const spPrice = sp500Data.find(row => row.date === date)?.close;
        if (!spPrice) return;

        const units = amount / spPrice;
        if (action.toLowerCase() === "buy") sp500Units += units;
        if (action.toLowerCase() === "sell") sp500Units -= units;
    });

    const lastPrice = sp500Data[sp500Data.length - 1]?.close || 0;
    totalValue = sp500Units * lastPrice;

    return `📈 שווי התיק אילו היה מושקע ב-S&P 500: ${totalValue.toFixed(2)} דולר`;
}

// פונקציה להצגת התוצאה
function displayResult(result) {
    document.getElementById('result').innerText = result;
}

// פונקציה לציור הגרף
function drawChart(transactions, sp500Data) {
    const labels = transactions.map(t => t.Date);
    const portfolioValues = [];
    let sp500Units = 0;
    
    transactions.forEach(transaction => {
        const date = transaction["Date"];
        const action = transaction["Action"];
        const amount = parseFloat(transaction["Amount"]);
        
        const spPrice = sp500Data.find(row => row.date === date)?.close;
        if (!spPrice) return;

        const units = amount / spPrice;
        if (action.toLowerCase() === "buy") sp500Units += units;
        if (action.toLowerCase() === "sell") sp500Units -= units;

        const totalValue = sp500Units * spPrice;
        portfolioValues.push(totalValue);
    });

    const ctx = document.getElementById('comparisonChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'שווי התיק (אם היה מושקע ב-S&P 500)',
                data: portfolioValues,
                borderColor: 'blue',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}
