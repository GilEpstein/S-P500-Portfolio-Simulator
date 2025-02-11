function parseCSV(data) {
    // מפצל לפי שורות
    const rows = data.split("\n").map(row => row.split(/\s+/)); // מזהה רווחים/טאבים כהפרדה

    // הכותרות (Date, Close)
    const headers = rows[0].map(header => header.trim());

    // ממיר את השורות לאובייקטים
    const parsedRows = rows.slice(1).map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index]?.trim(); // מסיר רווחים מיותרים
        });

        return obj;
    });

    return parsedRows.filter(row => Object.keys(row).length > 1); // מסנן שורות ריקות
}
