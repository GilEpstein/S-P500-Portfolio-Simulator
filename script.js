document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];  // מקבל את הקובץ שנבחר
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvData = e.target.result;
        console.log("📂 תוכן הקובץ שהועלה:");
        console.log(csvData); // מציג את תוכן הקובץ בקונסול
        alert("✅ הקובץ נטען בהצלחה! בדוק את הקונסול (F12)");
    };
    reader.readAsText(file); // קורא את הקובץ כטקסט
});
