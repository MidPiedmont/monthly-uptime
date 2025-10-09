// server.js

// Import Dependencies
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('node:path')

// Initialize Express App
const app = express();
const port = 3000;

// Database Configuration
const DB_PATH = './data/monthly-uptime.db'; 
const TABLE_NAME = 'monthly_reports'; // Your table name

// Connect to the Database
let db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(`Database connection error: ${err.message}`);
  } else {
    console.log(`Connected to the SQLite database at ${DB_PATH}.`);
  }
});

// Middleware (for JSON request bodies, useful for POST routes later)
app.use(express.json());

// API Route
app.get('/monthly-reports', (req, res) => {
    // Extract filters from the URL query string
    const { month, year, monitor_ids } = req.query; 
    
    // Arrays to build the SQL query
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
    
    // Condition for filtering by m_id from the URL query
    if (monitor_ids) {
        // monitor_ids come in as a comma-separated string (e.g., "1,5,9")
        // split it into an array of individual IDs
        const ids = monitor_ids.split(','); 
        
        if (ids.length > 0) {
            // Create a string of '?' placeholders for the prepared statement
            const placeholders = ids.map(() => '?').join(', ');
            
            // Add the condition: filter where the 'm_id' is IN the list of placeholders
            conditions.push(`m_id IN (${placeholders})`);
            
            // Add all individual monitor IDs to the parameters array
            params.push(...ids);
        }
    }

    // Construct the full SQL query
    let sql = `SELECT * FROM ${TABLE_NAME}`;

    // Append the WHERE clause if conditions exist
    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }
    
    // Append the sorting clause
    sql += " ORDER BY year DESC, month DESC, name ASC";

    // Execute the query
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({"status": "error", "error": `Could not fetch data from the database. ${err.message}`});
            return;
        }
        
        res.json({
            "status": "success",
            "count": rows.length,
            "data": rows
        });
    });
});

// Test Route
app.get('/monthly-reports/test', (req, res) => {
  res.send('Web App Server is running. Access reports at /api/reports');
});

// Serve the public folder as static files
app.use(express.static(path.join(__dirname, 'public')));

// Start the Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Reports available at http://localhost:${port}/monthly-reports`);
});