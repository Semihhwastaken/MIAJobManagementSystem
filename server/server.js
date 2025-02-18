const express = require("express");
const app = express();

// JSON veri alma desteği
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend çalışıyor!");
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
