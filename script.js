document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];  
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvData = e.target.result;
        console.log("📂 תוכן הקובץ הגולמי:");
        console.log(csvData); // מציג את הקובץ כפי שהוא

        const parsedData = parseCSV(csvData); // פענוח ה-CSV

        console.log("📊 נתוני הקובץ לאחר פענוח:");
        console.log(parsedData); // מציג את הנתונים בצורה רגילה

        alert("✅ הקובץ נטען ופוענח! בדוק את הקונסול (F12)");
    };
    reader.readAsText(file);
});

function parseCSV(data) {
    const rows = data.split("\n").map(row => row.split(",")); 
    console.log("📝 שורות גולמיות לאחר פיצול:", rows);

    const headers = rows[0];  
    const parsedRows = rows.slice(1).map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            obj[header.trim()] = row[index]?.trim(); 
        });
        return obj;
    });

    return parsedRows.filter(row => Object.keys(row).length > 1); 
}
