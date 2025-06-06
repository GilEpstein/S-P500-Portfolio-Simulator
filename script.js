// מחשבון השוואת ביצועי תיק מול S&P 500
// ------------------------------------
// @פרופ' גיל

// הגדרת פונקציות גלובליות
window.downloadSampleFile = downloadSampleFile;
window.startCalculation = startCalculation;

// פונקציה לעדכון מונה שימוש
function updateUsageCounter() {
    try {
        // בדיקה אם קיים מונה בלוקל סטורג'
        let counter = localStorage.getItem('appUsageCounter');
        
        // אם המונה לא קיים, יוצרים אותו
        if (!counter) {
            counter = 0;
        } else {
            counter = parseInt(counter);
        }
        
        // מגדילים את המונה ב-1
        counter++;
        
        // שומרים את המונה המעודכן
        localStorage.setItem('appUsageCounter', counter);
        
        // הדפסה לקונסול לצורך מעקב
        console.log('מספר שימושים באפליקציה:', counter);
        
        return counter;
    } catch (error) {
        console.error('שגיאה בעדכון המונה:', error);
        return 0;
    }
}

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
    
    // מעדכן את מונה השימוש
    updateUsageCounter();
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
    // מעדכן את מונה השימוש
    updateUsageCounter();
    
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
        try {
            const csvData = e.target.result;
            const transactions = parseCSV(csvData);
            console.log("נתוני התיק לאחר פענוח:", transactions);

            // שימוש ב-fetch כדי לטעון את נתוני ה-S&P 500
            fetch('sp500_data.csv')
                .then(response => response.text())
                .then(sp500Text => {
                    const sp500Data = parseSP500CSV(sp500Text);
                    if (sp500Data.length === 0) {
                        throw new Error("שגיאה: קובץ נתוני S&P 500 לא נטען כראוי");
                    }
                    const result = comparePortfolioWithSP500(transactions, sp500Data);
                    updateUI(result);
                })
                .catch(error => {
                    console.error("שגיאה:", error);
                    showError(error.message);
                })
                .finally(() => {
                    hideLoading();
                });
        } catch (error) {
            console.error("שגיאה:", error);
            showError(error.message);
            hideLoading();
        }
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
    const parseResult = Papa.parse(data, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        transformHeader: header => header.trim()
    });

    if (parseResult.errors.length > 0) {
        console.error("שגיאות בפענוח S&P 500:", parseResult.errors);
        throw new Error("שגיאה בפענוח נתוני S&P 500");
    }

    const sp500Data = parseResult.data
        .map(row => ({
            date: row.Date?.trim(),
            close: parseFloat(row.Close)
        }))
        .filter(row => row.date && !isNaN(row.close));

    if (sp500Data.length === 0) {
        throw new Error("לא נמצאו נתונים תקינים בקובץ S&P 500");
    }

    return sp500Data;
}

// פונקציה להשוואת הביצועים
function comparePortfolioWithSP500(transactions, sp500Data) {
    let sp500Units = 0;
    let totalInvested = 0;
    let errors = [];

    transactions.forEach(transaction => {
        const date = transaction.date;
        const action = transaction.action;
        const amount = transaction.amount;

        const spData = sp500Data.find(row => row.date === date);
        if (!spData) {
            errors.push(`אין נתוני מסחר לתאריך ${date}`);
            return;
        }

        const spPrice = spData.close;
        const units = amount / spPrice;

        if (action === "קניה") {
            sp500Units += units;
            totalInvested += amount;
        } else if (action === "מכירה") {
            if (sp500Units < units) {
                errors.push(`ניסיון למכור יותר יחידות מהקיים בתאריך ${date}`);
                return;
            }
            sp500Units -= units;
            totalInvested -= amount;
        }
    });

    const lastValidData = sp500Data[sp500Data.length - 1];
    const lastPrice = lastValidData?.close || 0;
    const finalValue = sp500Units * lastPrice;
    const returnRate = totalInvested !== 0 ? ((finalValue - totalInvested) / totalInvested * 100) : 0;

    return {
        summary: {
            units: sp500Units,
            invested: totalInvested,
            currentValue: finalValue,
            returnRate: returnRate,
            lastPrice: lastPrice,
            lastDate: lastValidData?.date || '',
            transactionCount: transactions.length
        },
        errors: errors
    };
}

// פונקציות UI להצגת תוצאות, טעינה ושגיאות
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
    // בדיקה אם האלמנט validDate קיים לפני עדכון
    const validDateEl = document.getElementById('validDate');
    if (validDateEl) {
        validDateEl.textContent = `נתונים נכונים לתאריך: ${result.summary.lastDate}`;
    }

    // עדכון שאר הערכים
    document.getElementById('resultsArea').classList.remove('hidden');
    document.getElementById('currentValue').textContent = formatCurrency(result.summary.currentValue);
    document.getElementById('totalUnits').textContent = `${formatNumber(result.summary.units, 4)} יחידות`;
    document.getElementById('returnRate').textContent = `${result.summary.returnRate > 0 ? '+' : ''}${formatNumber(result.summary.returnRate)}%`;
    document.getElementById('totalInvested').textContent = `השקעה: ${formatCurrency(result.summary.invested)}`;
    document.getElementById('lastPrice').textContent = formatCurrency(result.summary.lastPrice);
    document.getElementById('totalTransactions').textContent = result.summary.transactionCount;

    if (result.errors.length > 0) {
        showError(result.errors.join('\n'));
    }
}

// קריאה למונה בטעינת הדף
document.addEventListener('DOMContentLoaded', function() {
    updateUsageCounter();
});

// הגדרת אירועי גרירת קבצים
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('border-blue-400', 'bg-blue-100');
});

dropZone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    dropZone.classList.remove('border-blue-400', 'bg-blue-100');
});

dropZone.addEventListener('drop', function(e) {
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
