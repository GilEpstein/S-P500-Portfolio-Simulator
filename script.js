import Papa from 'papaparse';
import _ from 'lodash';

function startCalculation() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        alert("❌ אנא בחר קובץ CSV להעלאה!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(e) {
        try {
            // קריאת נתוני העסקאות
            const transactions = parseTransactionsFile(e.target.result);
            console.log("📂 נתוני העסקאות:", transactions);

            // קריאת נתוני S&P 500
            const sp500Data = await loadSP500Data();
            console.log("📊 נתוני S&P 500:", sp500Data);

            if (!sp500Data || sp500Data.length === 0) {
                throw new Error("לא נמצאו נתוני S&P 500");
            }

            const result = comparePortfolioWithSP500(transactions, sp500Data);
            displayResult(result);
        } catch (error) {
            console.error("❌ שגיאה:", error);
            alert(`❌ שגיאה: ${error.message}`);
        }
    };

    reader.readAsText(file);
}

function parseTransactionsFile(csvContent) {
    const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        transform: value => value.trim()
    });

    if (parseResult.errors.length > 0) {
        console.error("❌ שגיאות בפענוח הקובץ:", parseResult.errors);
        throw new Error("שגיאה בפענוח קובץ העסקאות");
    }

    return parseResult.data.map(row => ({
        date: formatDate(row.Date),
        action: row.Action.toLowerCase(),
        amount: parseFloat(row.Amount)
    })).filter(transaction => {
        // בדיקות תקינות
        if (!transaction.date || isNaN(transaction.amount)) {
            console.warn("⚠️ שורה לא תקינה:", transaction);
            return false;
        }
        if (!['buy', 'sell'].includes(transaction.action)) {
            console.warn("⚠️ פעולה לא מוכרת:", transaction);
            return false;
        }
        return true;
    });
}

async function loadSP500Data() {
    try {
        const response = await window.fs.readFile('sp500_data.csv', { encoding: 'utf8' });
        const parseResult = Papa.parse(response, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            transformHeader: header => header.trim()
        });

        if (parseResult.errors.length > 0) {
            throw new Error("שגיאה בפענוח נתוני S&P 500");
        }

        return parseResult.data.map(row => ({
            date: formatDate(row.Date),
            close: parseFloat(row.Close)
        })).filter(row => !isNaN(row.close));
    } catch (error) {
        console.error("❌ שגיאה בטעינת נתוני S&P 500:", error);
        throw new Error("לא ניתן לטעון את נתוני S&P 500");
    }
}

function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            throw new Error("תאריך לא תקין");
        }
        return date.toISOString().split('T')[0];
    } catch {
        return null;
    }
}

function comparePortfolioWithSP500(transactions, sp500Data) {
    // מיון העסקאות והנתונים לפי תאריך
    const sortedTransactions = _.sortBy(transactions, 'date');
    const sp500ByDate = _.keyBy(sp500Data, 'date');
    
    let sp500Units = 0;
    let totalInvested = 0;
    let errors = [];

    // עיבוד העסקאות
    sortedTransactions.forEach(transaction => {
        const spData = sp500ByDate[transaction.date];
        
        if (!spData) {
            errors.push(`אין נתוני S&P 500 לתאריך ${transaction.date}`);
            return;
        }

        const units = transaction.amount / spData.close;
        
        if (transaction.action === 'buy') {
            sp500Units += units;
            totalInvested += transaction.amount;
        } else { // sell
            if (sp500Units < units) {
                errors.push(`ניסיון למכור יותר יחידות מהקיים בתאריך ${transaction.date}`);
                return;
            }
            sp500Units -= units;
            totalInvested -= transaction.amount;
        }

        console.log(`📊 ${transaction.action === 'buy' ? 'קנייה' : 'מכירה'} של ${units.toFixed(4)} יחידות בתאריך ${transaction.date}`);
    });

    // חישוב הערך הסופי
    const lastPrice = _.last(sp500Data)?.close || 0;
    const finalValue = sp500Units * lastPrice;
    const returnRate = ((finalValue - totalInvested) / totalInvested * 100).toFixed(2);

    // הכנת דוח מסכם
    let report = [
        `📈 סיכום השוואה מול S&P 500:`,
        `----------------------------`,
        `סך היחידות הנוכחי: ${sp500Units.toFixed(4)}`,
        `סך ההשקעה: $${totalInvested.toFixed(2)}`,
        `שווי נוכחי: $${finalValue.toFixed(2)}`,
        `תשואה: ${returnRate}%`
    ];

    if (errors.length > 0) {
        report.push('\n⚠️ אזהרות:', ...errors);
    }

    return report.join('\n');
}

function displayResult(result) {
    const resultElement = document.getElementById('result');
    resultElement.style.whiteSpace = 'pre-line';
    resultElement.innerText = result;
}

export { startCalculation, displayResult };
