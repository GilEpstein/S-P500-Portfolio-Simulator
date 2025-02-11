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

                const result = comparePortfolioWithSP500(transactions, sp500Data);
                displayResult(result);
            })
            .catch(error => console.error("❌ שגיאה בטעינת sp500_data.csv:", error));
    };

    reader.readAsText(file);
}

// פונקציה לפענוח קובץ ה-CSV של המשתמש (תומכת גם בטאבים וגם בפסיקים)
function parseCSV(data) {
    const delimiter = data.includes("\t") ? "\t" : ","; // מזהה אם ההפרדה היא טאב או פסיק
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

// פונקציה לפענוח קובץ `sp500_data.csv`
function parseSP500CSV(data) {
    const rows = data.split("\n").map(row => row.split(/\s+/)); // מזהה רווחים או טאבים כהפרדה
    return rows.slice(1).map(row => ({
        date: row[0], 
        close: parseFloat(row[1])
    })).filter(row => row.date && !isNaN(row.close));
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
