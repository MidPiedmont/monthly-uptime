// server.js

// 1. Import Dependencies
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

// 2. Initialize Express App
const app = express();
const port = 3000;

// 3. Database Configuration
const DB_PATH = './data/monthly-uptime.db'; 
const TABLE_NAME = 'monthly_reports'; // Your table name

// Connect to the Database
// Ensure your 'data' directory and 'monthly-uptime.db' file exist!
let db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    // If you see this, double-check the path and file permissions!
    console.error(`Database connection error: ${err.message}`);
  } else {
    console.log(`Connected to the SQLite database at ${DB_PATH}.`);
  }
});

// Middleware (for JSON request bodies, useful for POST routes later)
app.use(express.json());

// 4. API Route to Fetch All Reports
// Access this route at: http://localhost:3000/api/reports
app.get('/monthly-reports', (req, res) => {
    // Extract potential filters from the query string
    const { month, year, name } = req.query;
    
    const conditions = [];
    const params = [];

    // Build the WHERE clause dynamically
    
    if (month) {
        conditions.push("month = ?");
        params.push(month);
    }
    
    if (year) {
        conditions.push("year = ?");
        params.push(year);
    }
    
    if (name) {
        // Split the input string (e.g., "Appeals,Billing,Portal") into an array
        const namesArray = name.split(',').map(n => n.trim());
        
        // Create a string of '?' placeholders for the SQL IN clause (e.g., '?, ?, ?')
        const placeholders = namesArray.map(() => '?').join(', ');
        
        // Add the condition: filter where the 'name' is IN the list of placeholders
        conditions.push(`name IN (${placeholders})`);
        
        // Add all individual names to the parameters array
        params.push(...namesArray);
    }

    // 3. Construct the full SQL query
    let sql = `SELECT * FROM ${TABLE_NAME}`;

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }
    
    // Append the sorting clause
    sql += " ORDER BY year DESC, month DESC, name ASC";

    // 4. Execute the query with dynamic parameters
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({"error": "Could not fetch data from the database."});
            console.error(`SQL Error: ${err.message}`);
            return;
        }
        
        res.json({
            "status": "success",
            "count": rows.length,
            "data": rows
        });
    });
});

// 5. Root Route (Sanity Check)
app.get('/monthly-reports/test', (req, res) => {
  res.send('Web App Server is running. Access reports at /api/reports');
});

// 6. Start the Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Reports available at http://localhost:${port}/monthly-reports`);
});