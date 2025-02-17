// מחשבון השוואת ביצועי תיק מול S&P 500
// ------------------------------------
// @פרופ' גיל

function downloadSampleCSV() {
    // תוכן הקובץ לדוגמה
    const csvContent = `Date,Action,Amount
31/12/2023,buy,1000
15/01/2024,sell,500
01/02/2024,buy,2000
15/02/2024,buy,1500
28/02/2024,sell,800`;

    // יצירת Blob מהתוכן
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // יצירת קישור להורדה
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'example_transactions.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function startCalculation() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        showError("❌ אנא בחר קובץ CSV להעלאה!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    hideError();
    showLoading();

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
                    showError("❌ שגיאה: `sp500_data.csv` לא נטען כראוי!");
                    return;
                }

                const result = comparePortfolioWithSP500(transactions, sp500Data);
                updateUI(result);
            })
            .catch(error => {
                console.error("❌ שגיאה בטעינת sp500_data.csv:", error);
                showError("לא ניתן לטעון את נתוני S&P 500");
            })
            .finally(() => {
                hideLoading();
            });
    };

    reader.readAsText(file);
}

// פונקציות עזר
function formatNumber(number, decimals = 2) {
    return new Intl.NumberFormat('he-IL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

function formatCurrency(number) {
    return `$${formatNumber(number)}`;
}

// ✅ פונקציה לפענוח קובץ הקניות והמכירות
function parseCSV(data) {
    const rows = data.split("\n").map(row => row.trim()).filter(row => row.length > 0);
    const headers = rows[0].split(",").map(header => header.trim());

    return rows.slice(1).map(row => {
        const values = row.split(",");
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index]?.trim();
        });
        return obj;
    }).filter(row => row.Date && row.Action && row.Amount);
}
// ✅ פונקציה לפענוח `sp500_data.csv`
function parseSP500CSV(data) {
    const rows = data.split("\n").map(row => row.trim()).filter(row => row.length > 0);

    if (rows.length < 2) {
        console.error("❌ `sp500_data.csv` מכיל מעט מדי נתונים!");
        return [];
    }

    rows.shift(); // מסיר את הכותרת (Date,Close)

    return rows.map(row => {
        const columns = row.split(",");
        if (columns.length !== 2) return null;

        return {
            date: columns[0].trim(),
            close: parseFloat(columns[1].trim())
        };
    }).filter(row => row !== null && !isNaN(row.close));
}

// ✅ פונקציה להשוואה בין תיק המשתמש ל-S&P 500
function comparePortfolioWithSP500(transactions, sp500Data) {
    let sp500Units = 0;
    let totalInvested = 0;

    transactions.forEach(transaction => {
        const date = transaction["Date"];
        const action = transaction["Action"].toLowerCase();
        const amount = parseFloat(transaction["Amount"]);

        console.log(`🔍 מחפש מחיר סגירה לתאריך ${date}...`);

        const spData = sp500Data.find(row => row.date === date);
        if (!spData) {
            console.warn(`⚠️ אין מסחר בתאריך ${date}, העסקה לא בוצעה.`);
            return;
        }

        const spPrice = spData.close;
        console.log(`✅ נמצא מחיר סגירה ${spPrice} לתאריך ${date}`);

        const units = amount / spPrice;
        if (action === "buy") {
            sp500Units += units;
            totalInvested += amount;
            console.log(`💰 קניית ${units.toFixed(4)} יחידות S&P 500 בתאריך ${date}`);
        }
        if (action === "sell") {
            sp500Units -= units;
            totalInvested -= amount;
            console.log(`💸 מכירת ${units.toFixed(4)} יחידות S&P 500 בתאריך ${date}`);
        }
    });

    const lastPrice = sp500Data[sp500Data.length - 1]?.close || 0;
    const finalValue = sp500Units * lastPrice;
    const returnRate = ((finalValue - totalInvested) / totalInvested * 100);

    console.log(`📊 סך הכל ${sp500Units.toFixed(4)} יחידות S&P 500.`);
    console.log(`📈 שווי התיק הסופי לפי מחיר אחרון (${lastPrice}): ${finalValue.toFixed(2)} דולר`);

    return {
        summary: {
            units: sp500Units,
            invested: totalInvested,
            currentValue: finalValue,
            returnRate: returnRate,
            lastPrice: lastPrice,
            transactionCount: transactions.length
        },
        errors: []
    };
}

// פונקציות UI
function showError(message) {
    const errorArea = document.getElementById('errorArea');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorArea.classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorArea').classList.add('hidden');
}

function showLoading() {
    document.getElementById('loadingArea').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingArea').classList.add('hidden');
}

function updateUI(result) {
    // מעדכן את אזור התוצאות
    document.getElementById('resultsArea').classList.remove('hidden');
    
    // מעדכן ערכים
    document.getElementById('currentValue').textContent = formatCurrency(result.summary.currentValue);
    document.getElementById('totalUnits').textContent = `${formatNumber(result.summary.units, 4)} יחידות`;
    document.getElementById('returnRate').textContent = `${result.summary.returnRate > 0 ? '+' : ''}${formatNumber(result.summary.returnRate)}%`;
    document.getElementById('totalInvested').textContent = `השקעה: ${formatCurrency(result.summary.invested)}`;
    document.getElementById('lastPrice').textContent = formatCurrency(result.summary.lastPrice);
    document.getElementById('totalTransactions').textContent = result.summary.transactionCount;
}

// הגדרת גרירת קבצים
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-blue-400', 'bg-blue-100');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-400', 'bg-blue-100');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-400', 'bg-blue-100');
    
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length) {
        document.getElementById('fileInput').files = files;
        startCalculation();
    }
});

// האזנה לשינויים בקובץ
document.getElementById('fileInput').addEventListener('change', startCalculation);
