#!/bin/bash
# This script runs monthly to get a whole month's worth of averaged uptime and response data

# --- Configuration ---
UPTIME_KUMA_DB="../uptime-kuma/data/kuma.db"
OUTPUT_DB="./data/monthly-uptime.db"
OUTPUT_TABLE="monthly_reports"

# --- Date Calculation ---
# Calculates the start and end dates for the *last* complete month
START_DATE=$(date --date="$(date +'%Y-%m-01') - 1 month" +%Y-%m-%d)
END_DATE=$(date --date="$(date +'%Y-%m-01') - 1 second" +%Y-%m-%d)

# New numerical and pretty date variables
PRETTY_MONTH=$(date -d "last month" +'%B %Y')
MONTH_NUM=$(date -d "last month" +'%m')
YEAR_NUM=$(date -d "last month" +'%Y')

# Check if the source database file exists
if [ ! -f "$UPTIME_KUMA_DB" ]; then
    echo "Error: Source database file not found at $UPTIME_KUMA_DB"
    exit 1
fi

# --- Check if ran this month ---
if [ -f "$OUTPUT_DB" ]; then
    echo "Checking if report for $PRETTY_MONTH already exists..."
    
    # Query to check if a row with the current numerical month/year combination exists
    CHECK_RESULT=$(sqlite3 "$OUTPUT_DB" "SELECT EXISTS(SELECT 1 FROM $OUTPUT_TABLE WHERE year = '$YEAR_NUM' AND month = '$MONTH_NUM' LIMIT 1);")
    
    if [ "$CHECK_RESULT" == "1" ]; then
        echo "Report for $PRETTY_MONTH already exists in $OUTPUT_DB (based on numerical date check). Exiting."
        exit 0
    fi
    echo "No existing report found. Proceeding with generation."
fi

# --- Database Setup ---
echo "Creating/Ensuring table structure in $OUTPUT_DB..."

sqlite3 "$OUTPUT_DB" "
CREATE TABLE IF NOT EXISTS $OUTPUT_TABLE (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    m_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    parent TEXT,
    pretty_month TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    response_time REAL,
    uptime REAL,
    -- Ensure only one report row exists per monitor ID per month/year
    UNIQUE(m_id, month, year)
);
"

# --- SQL Execution Block ---
echo "Extracting and loading data for $PRETTY_MONTH from $START_DATE to $END_DATE..."

SQL_EXECUTION="
ATTACH DATABASE '$UPTIME_KUMA_DB' AS source;

INSERT INTO $OUTPUT_TABLE (m_id, name, type, parent, pretty_month, month, year, response_time, uptime)
SELECT
    m.id AS m_id,
    m.name,
    m.type,
    m.parent,
    '$PRETTY_MONTH' AS pretty_month,
    $MONTH_NUM AS month,
    $YEAR_NUM AS year,
    AVG(CASE WHEN h.status = 1 THEN h.ping ELSE NULL END) AS response_time,
    CAST(SUM(CASE WHEN h.status = 1 THEN 1 ELSE 0 END) AS REAL) * 100 / SUM(CASE WHEN h.status IN (0, 1) THEN 1 ELSE 0 END) AS uptime
FROM
    source.monitor AS m
LEFT JOIN
    source.heartbeat AS h ON m.id = h.monitor_id
WHERE
    h.time >= '$START_DATE' AND h.time < '$END_DATE'
GROUP BY
    m.id, m.name, m.type, m.parent;
"

# Execute the entire script against the OUTPUT_DB
if sqlite3 "$OUTPUT_DB" "$SQL_EXECUTION"; then
    echo "Successfully loaded report for $PRETTY_MONTH into $OUTPUT_DB."
else
    echo "Error: Failed to execute the SQL query or insert data."
    exit 1
fi

exit 0
