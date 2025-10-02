// server.js

// 1. Import Express
const express = require('express');
const app = express();
const port = 3000; // You can use any port you like

// 2. Middleware (Optional but good practice)
// Allows Express to parse JSON data from requests (e.g., POST requests)
app.use(express.json());

// 3. Define a Simple Route
// This is the default "Home" page or API endpoint
app.get('/uptime-monthly/api', (req, res) => {
  res.send('Welcome! please scan your first item :)');
});

// 4. Start the Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});