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
