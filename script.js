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

function formatDate(dateStr) {
    try {
        // מתאים לפורמט DD/MM/YYYY
        const [day, month, year] = dateStr.split('/').map(num => num.trim());
        const date = new Date(year, month - 1, day);
        if (isNaN(date.getTime())) {
            throw new Error("תאריך לא תקין");
        }
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } catch {
        return null;
    }
}

// פונקציות לטיפול בקבצים
function parseTransactionsFile(csvContent) {
    const parseResult = Papa.parse(csvContent, {
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
            date: formatDate(row.Date),
            action: row.Action.toLowerCase(),
            amount: parseFloat(row.Amount)
        }))
        .filter(transaction => {
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

    if (transactions.length === 0) {
        throw new Error("לא נמצאו עסקאות תקינות בקובץ");
    }

    console.log("נמצאו", transactions.length, "עסקאות תקינות");
    return transactions;
}

async function loadSP500Data() {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'sp500_data.csv', true);
        xhr.onload = function() {
            try {
                if (xhr.status === 200) {
                    const csvContent = xhr.responseText;
                    console.log("תוכן ה-CSV (100 תווים ראשונים):", csvContent.substring(0, 100));

                    const parseResult = Papa.parse(csvContent, {
                        header: true,
                        skipEmptyLines: true,
                        dynamicTyping: false,
                        transformHeader: header => header.trim()
                    });

                    if (parseResult.errors.length > 0) {
                        console.error("שגיאות פענוח:", parseResult.errors);
                        reject(new Error("שגיאה בפענוח נתוני S&P 500"));
                        return;
                    }

                    const data = parseResult.data
                        .filter(row => row.Date && row.Close)
                        .map(row => ({
                            date: formatDate(row.Date),
                            close: parseFloat(row.Close.toString().replace(',', ''))
                        }))
                        .filter(row => row.date && !isNaN(row.close));

                    if (data.length === 0) {
                        reject(new Error("לא נמצאו נתונים תקינים בקובץ S&P 500"));
                        return;
                    }

                    console.log(`נטענו ${data.length} שורות של נתוני S&P 500`);
                    resolve(data);
                } else {
                    reject(new Error(`שגיאה בטעינת הקובץ: ${xhr.status}`));
                }
            } catch (error) {
                console.error("שגיאה בעיבוד הנתונים:", error);
                reject(new Error("שגיאה בעיבוד נתוני S&P 500"));
            }
        };
        xhr.onerror = function() {
            reject(new Error("לא ניתן לטעון את נתוני S&P 500 - אנא ודא שהקובץ קיים ותקין"));
        };
        xhr.send();
    });
}

function comparePortfolioWithSP500(transactions, sp500Data) {
    const sortedTransactions = _.sortBy(transactions, 'date');
    const sp500ByDate = _.keyBy(sp500Data, 'date');
    
    let sp500Units = 0;
    let totalInvested = 0;
    let errors = [];
    let transactionCount = 0;
sortedTransactions.forEach(transaction => {
        const spData = sp500ByDate[transaction.date];
        
        if (!spData) {
            errors.push({
                type: 'warning',
                message: `אין נתוני S&P 500 לתאריך ${transaction.date}`
            });
            return;
        }

        const units = transaction.amount / spData.close;
        
        if (transaction.action === 'buy') {
            sp500Units += units;
            totalInvested += transaction.amount;
            transactionCount++;
        } else {
            if (sp500Units < units) {
                errors.push({
                    type: 'error',
                    message: `ניסיון למכור יותר יחידות מהקיים בתאריך ${transaction.date}`
                });
                return;
            }
            sp500Units -= units;
            totalInvested -= transaction.amount;
            transactionCount++;
        }
    });

    const lastPrice = _.last(sp500Data)?.close || 0;
    const finalValue = sp500Units * lastPrice;
    const returnRate = totalInvested ? ((finalValue - totalInvested) / totalInvested * 100) : 0;

    return {
        summary: {
            units: sp500Units,
            invested: totalInvested,
            currentValue: finalValue,
            returnRate: returnRate,
            lastPrice: lastPrice,
            transactionCount: transactionCount
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
    // מעדכן את אזור התוצאות
    document.getElementById('resultsArea').classList.remove('hidden');
    
    // מעדכן ערכים
    document.getElementById('currentValue').textContent = formatCurrency(result.summary.currentValue);
    document.getElementById('totalUnits').textContent = `${formatNumber(result.summary.units, 4)} יחידות`;
    document.getElementById('returnRate').textContent = `${result.summary.returnRate > 0 ? '+' : ''}${formatNumber(result.summary.returnRate)}%`;
    document.getElementById('totalInvested').textContent = `השקעה: ${formatCurrency(result.summary.invested)}`;
    document.getElementById('lastPrice').textContent = formatCurrency(result.summary.lastPrice);
    document.getElementById('totalTransactions').textContent = result.summary.transactionCount;

    // מעדכן אזהרות
    const warningsArea = document.getElementById('warningsArea');
    const warningsList = document.getElementById('warningsList');
    warningsList.innerHTML = '';

    if (result.errors.length > 0) {
        warningsArea.classList.remove('hidden');
        result.errors.forEach(error => {
            const li = document.createElement('li');
            li.className = `flex items-start p-3 rounded-lg ${
                error.type === 'error' 
                    ? 'bg-red-50 text-red-700' 
                    : 'bg-yellow-50 text-yellow-700'
            }`;
            li.innerHTML = `
                <svg class="w-5 h-5 ml-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-sm">${error.message}</span>
            `;
            warningsList.appendChild(li);
        });
    } else {
        warningsArea.classList.add('hidden');
    }
}

// טיפול בהעלאת קובץ
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // איפוס UI
    hideError();
    document.getElementById('resultsArea').classList.add('hidden');
    document.getElementById('warningsArea').classList.add('hidden');
    showLoading();

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const transactions = parseTransactionsFile(e.target.result);
                const sp500Data = await loadSP500Data();
                const result = comparePortfolioWithSP500(transactions, sp500Data);
                updateUI(result);
            } catch (err) {
                console.error("שגיאה בעיבוד הקובץ:", err);
                showError(err.message);
            } finally {
                hideLoading();
            }
        };
        reader.readAsText(file);
    } catch (err) {
        console.error("שגיאה בהעלאת הקובץ:", err);
        showError(err.message);
        hideLoading();
    }
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
        handleFileUpload({ target: { files } });
    }
});
