<!-- תיבת העלאת קובץ -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div id="dropZone" class="drop-zone">
                <label for="fileInput" class="block w-full cursor-pointer">
                    <div class="flex flex-col items-center p-8 border-2 border-dashed border-blue-200 rounded-lg hover:border-blue-400 bg-blue-50 hover:bg-blue-100">
                        <svg class="w-16 h-16 mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <h3 class="text-lg font-semibold text-gray-700 mb-2">העלה קובץ עסקאות</h3>
                        <p class="text-sm text-gray-500 text-center">גרור לכאן קובץ CSV או לחץ לבחירה</p>
                    </div>
                </label>
                <input id="fileInput" type="file" accept=".csv" class="hidden">
            </div>

            <!-- אזור טעינה -->
            <div id="loadingArea" class="hidden text-center py-8">
                <div class="loading-spinner w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p class="text-gray-600">מעבד את הנתונים...</p>
            </div>

            <!-- אזור שגיאות -->
            <div id="errorArea" class="hidden mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-center text-red-700">
                    <svg class="w-5 h-5 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span id="errorMessage" class="font-medium"></span>
                </div>
            </div>

            <!-- אזור תוצאות -->
            <div id="resultsArea" class="hidden mt-8 space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- שווי נוכחי -->
                    <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6">
                        <div class="flex items-center justify-between mb-4">
                            <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <h3 class="text-lg font-semibold">שווי נוכחי</h3>
                        </div>
                        <p id="currentValue" class="text-3xl font-bold mb-2">$0.00</p>
                        <p id="totalUnits" class="text-blue-100">0 יחידות</p>
                    </div>
                    
                    <!-- תשואה -->
                    <div class="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6">
                        <div class="flex items-center justify-between mb-4">
                            <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                            </svg>
                            <h3 class="text-lg font-semibold">תשואה כוללת</h3>
                        </div>
                        <p id="returnRate" class="text-3xl font-bold mb-2">0%</p>
                        <p id="totalInvested" class="text-green-100">השקעה: $0</p>
                    </div>
                </div>

                <div class="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <svg class="w-5 h-5 ml-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        פרטים נוספים
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 bg-gray-50 rounded-lg">
                            <p class="text-sm text-gray-500 mb-1">מחיר אחרון</p>
                            <p id="lastPrice" class="text-xl font-semibold">$0.00</p>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-lg">
                            <p class="text-sm text-gray-500 mb-1">מספר עסקאות</p>
                            <p id="totalTransactions" class="text-xl font-semibold">0</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
// ✅ פונקציה לפענוח נתוני S&P 500
function parseSP500CSV(data) {
    const rows = data.split("\n").map(row => row.trim()).filter(row => row.length > 0);

    if (rows.length < 2) {
        console.error("❌ קובץ נתוני S&P 500 מכיל מעט מדי נתונים!");
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

// ✅ פונקציה להשוואה בין תיק המשתמש ל-S&P 500
function comparePortfolioWithSP500(transactions, sp500Data) {
    let sp500Units = 0;
    let totalInvested = 0;

    transactions.forEach(transaction => {
        const date = transaction.date;
        const action = transaction.action;
        const amount = transaction.amount;

        console.log(`🔍 מחפש מחיר סגירה לתאריך ${date}...`);

        const spData = sp500Data.find(row => row.date === date);
        if (!spData) {
            console.warn(`⚠️ אין נתוני מסחר לתאריך ${date}, העסקה לא תיכלל בחישוב`);
            return;
        }

        const spPrice = spData.close;
        console.log(`✅ נמצא מחיר סגירה ${spPrice} לתאריך ${date}`);

        const units = amount / spPrice;
        if (action === "קניה") {
            sp500Units += units;
            totalInvested += amount;
            console.log(`💰 רכישת ${units.toFixed(4)} יחידות S&P 500 בתאריך ${date}`);
        }
        if (action === "מכירה") {
            sp500Units -= units;
            totalInvested -= amount;
            console.log(`💸 מכירת ${units.toFixed(4)} יחידות S&P 500 בתאריך ${date}`);
        }
    });

    const lastPrice = sp500Data[sp500Data.length - 1]?.close || 0;
    const finalValue = sp500Units * lastPrice;
    const returnRate = ((finalValue - totalInvested) / totalInvested * 100);

    console.log(`📊 סך הכל ${sp500Units.toFixed(4)} יחידות S&P 500`);
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
