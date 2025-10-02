#!/bin/bash

# --- Configuration ---
UPTIME_KUMA_DB="../uptime-kuma/data/kuma.db"
OUTPUT_DB="./data/monthly-uptime.db"
OUTPUT_TABLE="monthly_reports"

# --- Date Calculation ---
END_DATE=$(date -d "this month" +%Y-%m-%d)
START_DATE=$(date -d "last month" +%Y-%m-%d)
REPORT_MONTH_YEAR=$(date -d "last month" +'%B %Y')

# Check if the source database file exists
if [ ! -f "$UPTIME_KUMA_DB" ]; then
    echo "Error: Source database file not found at $UPTIME_KUMA_DB"
    exit 1
fi

# --- Check if ran this month ---
if [ -f "$OUTPUT_DB" ]; then
    echo "Checking if report for $REPORT_MONTH_YEAR already exists..."
    
    # Query to check if a row with the current REPORT_MONTH_YEAR exists
    CHECK_RESULT=$(sqlite3 "$OUTPUT_DB" "SELECT EXISTS(SELECT 1 FROM $OUTPUT_TABLE WHERE report_month = '$REPORT_MONTH_YEAR' LIMIT 1);")
    
    if [ "$CHECK_RESULT" == "1" ]; then
        echo "Report for $REPORT_MONTH_YEAR already exists in $OUTPUT_DB. Exiting."
        exit 0
    fi
    echo "No existing report found. Proceeding with generation."
fi

# --- Database Setup ---
echo "Creating/Ensuring table structure in $OUTPUT_DB..."

sqlite3 "$OUTPUT_DB" "
CREATE TABLE IF NOT EXISTS $OUTPUT_TABLE (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_month TEXT NOT NULL,
    name TEXT NOT NULL,
    response_time REAL,
    uptime REAL,
    UNIQUE(report_month, name)
);
"

# --- SQL Execution Block ---
echo "Extracting and loading data for $REPORT_MONTH_YEAR from $START_DATE to $END_DATE..."

SQL_EXECUTION="
ATTACH DATABASE '$UPTIME_KUMA_DB' AS source;

INSERT INTO $OUTPUT_TABLE (report_month, name, response_time, uptime)
SELECT
    '$REPORT_MONTH_YEAR' AS report_month,
    m.name,
    AVG(CASE WHEN h.status = 1 THEN h.ping ELSE NULL END) AS response_time,
    CAST(SUM(CASE WHEN h.status = 1 THEN 1 ELSE 0 END) AS REAL) * 100 / SUM(CASE WHEN h.status IN (0, 1) THEN 1 ELSE 0 END) AS uptime
FROM
    source.monitor AS m
LEFT JOIN
    source.heartbeat AS h ON m.id = h.monitor_id
WHERE
    h.time >= '$START_DATE' AND h.time < '$END_DATE'
GROUP BY
    m.name;
"

# Execute the entire script against the OUTPUT_DB
if sqlite3 "$OUTPUT_DB" "$SQL_EXECUTION"; then
    echo "Successfully loaded report for $REPORT_MONTH_YEAR into $OUTPUT_DB."
else
    echo "Error: Failed to execute the SQL query or insert data."
    exit 1
fi

exit 0
