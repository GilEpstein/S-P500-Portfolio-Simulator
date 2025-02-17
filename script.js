// מחשבון השוואת ביצועי תיק מול S&P 500
// ------------------------------------
// @פרופ' גיל

// פונקציית הורדת קובץ דוגמה
function downloadSampleFile() {
    const csvContent = `תאריך,פעולה,סכום
31/12/2023,קניה,1000
15/01/2024,מכירה,500`;

    // יצירת קובץ עם תמיכה בעברית
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "דוגמה_לקובץ_עסקאות.csv";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
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

// פונקציה ראשית לחישוב
function startCalculation() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        showError("אנא בחר קובץ CSV להעלאה");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    hideError();
    showLoading();

    reader.onload = function(e) {
        const csvData = e.target.result;
        const transactions = parseCSV(csvData);

        console.log("נתוני התיק לאחר פענוח:", transactions);

        fetch('sp500_data.csv')
            .then(response => response.text())
            .then(data => {
                console.log("נתוני S&P 500 התקבלו");
                const sp500Data = parseSP500CSV(data);

                if (sp500Data.length === 0) {
                    showError("שגיאה: קובץ נתוני S&P 500 לא נטען כראוי");
                    return;
                }

                const result = comparePortfolioWithSP500(transactions, sp500Data);
                updateUI(result);
            })
            .catch(error => {
                console.error("שגיאה בטעינת נתוני S&P 500:", error);
                showError("לא ניתן לטעון את נתוני S&P 500");
            })
            .finally(() => {
                hideLoading();
            });
    };

    reader.readAsText(file);
}

// פונקציה לפענוח קובץ העסקאות
function parseCSV(data) {
    const parseResult = Papa.parse(data, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        transform: value => value.trim()
    });

    if (parseResult.errors.length > 0) {
        console.error("שגיאות בפענוח:", parseResult.errors);
        throw new Error("שגיאה בפענוח קובץ העסקאות");
    }

    const transactions = parseResult.data
        .map(row => ({
            date: row['תאריך'],
            action: row['פעולה'],
            amount: parseFloat(row['סכום'])
        }))
        .filter(transaction => {
            if (!transaction.date || isNaN(transaction.amount)) {
                console.warn("שורה לא תקינה:", transaction);
                return false;
            }
            if (!['קניה', 'מכירה'].includes(transaction.action)) {
                console.warn("פעולה לא מוכרת:", transaction);
                return false;
            }
            return true;
        });

    if (transactions.length === 0) {
        throw new Error("לא נמצאו עסקאות תקינות בקובץ");
    }

    return transactions;
}
// פונקציה לפענוח נתוני S&P 500
function parseSP500CSV(data) {
    const rows = data.split("\n").map(row => row.trim()).filter(row => row.length > 0);

    if (rows.length < 2) {
        console.error("קובץ נתוני S&P 500 מכיל מעט מדי נתונים");
        return [];
    }

    rows.shift(); // מסיר את שורת הכותרת

    return rows.map(row => {
        const columns = row.split(",");
        if (columns.length !== 2) return null;

        return {
            date: columns[0].trim(),
            close: parseFloat(columns[1].trim())
        };
    }).filter(row => row !== null && !isNaN(row.close));
}

// פונקציה להשוואת הביצועים
function comparePortfolioWithSP500(transactions, sp500Data) {
    let sp500Units = 0;
    let totalInvested = 0;

    transactions.forEach(transaction => {
        const date = transaction.date;
        const action = transaction.action;
        const amount = transaction.amount;

        const spData = sp500Data.find(row => row.date === date);
        if (!spData) {
            console.warn(`אין נתוני מסחר לתאריך ${date}`);
            return;
        }

        const spPrice = spData.close;
        const units = amount / spPrice;

        if (action === "קניה") {
            sp500Units += units;
            totalInvested += amount;
        } else if (action === "מכירה") {
            sp500Units -= units;
            totalInvested -= amount;
        }
    });

    const lastPrice = sp500Data[sp500Data.length - 1]?.close || 0;
    const finalValue = sp500Units * lastPrice;
    const returnRate = totalInvested !== 0 ? ((finalValue - totalInvested) / totalInvested * 100) : 0;

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

// אירועי גרירת קבצים
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
