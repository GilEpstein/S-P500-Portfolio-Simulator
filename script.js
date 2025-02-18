// מחשבון השוואת ביצועי תיק מול S&P 500
// ------------------------------------
// @פרופ' גיל

// פונקציה לטעינת נתוני S&P 500
async function loadSP500Data() {
    try {
        const response = await window.fs.readFile('1929 2025.csv', { encoding: 'utf8' });
        const result = Papa.parse(response, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });
        
        // המרת הנתונים לפורמט שאנחנו משתמשים בו
        return result.data.map(row => ({
            date: row.Date,
            close: row.Close
        }));
    } catch (error) {
        console.error("Error loading SP500 data:", error);
        return [];
    }
}

// הגדרת פונקציות גלובליות
window.downloadSampleFile = downloadSampleFile;
window.startCalculation = startCalculation;

// פונקציית הורדת קובץ דוגמה
function downloadSampleFile() {
    const csvContent = `תאריך,פעולה,סכום
29/12/2023,קניה,1000
02/01/2024,מכירה,500`;

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
async function startCalculation() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        showError("אנא בחר קובץ CSV להעלאה");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    hideError();
    showLoading();

    try {
        const sp500Data = await loadSP500Data();
        
        if (sp500Data.length === 0) {
            throw new Error("לא ניתן לטעון את נתוני S&P 500");
        }

        reader.onload = function(e) {
            try {
                const csvData = e.target.result;
                console.log("CSV Data:", csvData);
                
                const transactions = parseCSV(csvData);
                console.log("Parsed Transactions:", transactions);
                
                const result = comparePortfolioWithSP500(transactions, sp500Data);
                console.log("Calculation Result:", result);
                
                updateUI(result);
            } catch (error) {
                console.error("שגיאה:", error);
                showError(error.message);
            } finally {
                hideLoading();
            }
        };

        reader.readAsText(file);
    } catch (error) {
        console.error("שגיאה בטעינת נתוני S&P 500:", error);
        showError(error.message);
        hideLoading();
    }
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

// פונקציה להשוואת הביצועים
function comparePortfolioWithSP500(transactions, sp500Data) {
    let sp500Units = 0;
    let totalInvested = 0;
    let skippedDates = [];
    let validTransactions = [];
    let errors = [];

    // מיון העסקאות לפי תאריך
    transactions.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateA - dateB;
    });

    transactions.forEach(transaction => {
        const date = transaction.date;
        const spData = sp500Data.find(row => row.date === date);
        
        if (!spData) {
            skippedDates.push(date);
            return;
        }

        validTransactions.push(transaction);
        const action = transaction.action;
        const amount = transaction.amount;
        const spPrice = spData.close;
        const units = amount / spPrice;

        if (action === "קניה") {
            sp500Units += units;
            totalInvested += amount;
        } else if (action === "מכירה") {
            if (sp500Units < units) {
                errors.push(`שגיאה: ניסיון למכור ${formatNumber(units, 4)} יחידות בתאריך ${date} כאשר קיימות רק ${formatNumber(sp500Units, 4)} יחידות`);
                return;
            }
            sp500Units -= units;
            totalInvested -= amount;
        }
    });

    if (skippedDates.length > 0) {
        errors.push(`לתשומת לבך: הימים הבאים לא נכללו בחישוב כיוון שלא התקיים בהם מסחר: ${skippedDates.join(', ')}`);
    }

    const lastValidData = sp500Data[sp500Data.length - 1];
    const finalValue = sp500Units * lastValidData.close;
    const returnRate = totalInvested !== 0 ? ((finalValue - totalInvested) / totalInvested * 100) : 0;

    return {
        summary: {
            units: sp500Units,
            invested: totalInvested,
            currentValue: finalValue,
            returnRate: returnRate,
            lastPrice: lastValidData.close,
            lastDate: lastValidData.date,
            validTransactions: validTransactions.length,
            totalTransactions: transactions.length,
            skippedTransactions: skippedDates.length
        },
        errors: errors
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
    const resultsArea = document.getElementById('resultsArea');
    resultsArea.classList.remove('hidden');
    
    document.getElementById('currentValue').textContent = formatCurrency(result.summary.currentValue);
    document.getElementById('totalUnits').textContent = `${formatNumber(result.summary.units, 4)} יחידות`;
    document.getElementById('returnRate').textContent = `${result.summary.returnRate > 0 ? '+' : ''}${formatNumber(result.summary.returnRate)}%`;
    document.getElementById('totalInvested').textContent = `השקעה: ${formatCurrency(result.summary.invested)}`;
    document.getElementById('lastPrice').textContent = formatCurrency(result.summary.lastPrice);
    document.getElementById('lastPriceDate').textContent = `תאריך: ${result.summary.lastDate}`;
    document.getElementById('totalTransactions').textContent = 
        `${result.summary.validTransactions} מתוך ${result.summary.totalTransactions}`;

    if (result.errors.length > 0) {
        showError(result.errors.join('\n'));
    }
}

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
