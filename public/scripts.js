// public/scripts.js
const API_ENDPOINT = 'http://localhost:3000/monthly-reports';
// Default to the previous month. We're not subtracting one because JS getMonth is index to January = 0
const DEFAULT_MONTH = new Date().getMonth();
const getDefaultYear = (DEFAULT_MONTH) => {
    const year = new Date().getFullYear();
    if (DEFAULT_MONTH == 0) {
        return DEFAULT_YEAR = year - 1
    } else {
        return DEFAULT_YEAR = year
    };
}
DEFAULT_YEAR = getDefaultYear(DEFAULT_MONTH)
console.log(DEFAULT_YEAR);



// All monitor names that should be available as filters
let availableNames = []; // Will be populated on load

/**
 * Converts the table data array into a CSV string.
 * @param {Array<Object>} data 
 */
function convertToCsv(data) {
    if (data.length === 0) return '';
    
    const header = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
        Object.values(row).map(value => 
            // Sanitize values for CSV (handle commas and quotes)
            `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
    );
    
    return [header, ...rows].join('\n');
}

/**
 * Triggers the download of the CSV file.
 * @param {string} csvString 
 */
function downloadCsv(csvString) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `uptime_report_${document.getElementById('month-select').value}_${document.getElementById('year-select').value}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Populates the Month and Year dropdowns.
 */
function populateDateFilters() {
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');

    const months = [
        { val: '1', name: 'January' }, { val: '2', name: 'February' },
        { val: '3', name: 'March' }, { val: '4', name: 'April' },
        { val: '5', name: 'May' }, { val: '6', name: 'June' },
        { val: '7', name: 'July' }, { val: '8', name: 'August' },
        { val: '9', name: 'September' }, { val: '10', name: 'October' },
        { val: '11', name: 'November' }, { val: '12', name: 'December' }
    ];

    // Populate Months
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month.val;
        option.textContent = month.name;
        monthSelect.appendChild(option);
    });

    // Populate Years (e.g., last 5 years)
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = String(year);
        option.textContent = String(year);
        yearSelect.appendChild(option);
    }

    // Set default values
    monthSelect.value = DEFAULT_MONTH;
    yearSelect.value = DEFAULT_YEAR;
}

/**
 * Populates the Name checkboxes based on the fetched data.
 * @param {Array<Object>} allData - All data retrieved from the API (used to find unique names).
 */
function populateNameFilters(allData) {
    const nameFiltersDiv = document.getElementById('name-filters');
    nameFiltersDiv.innerHTML = ''; 

    // Extract unique names and sort them
    const uniqueNames = [...new Set(allData.map(item => item.name))].sort();
    availableNames = uniqueNames; // Store for future use

    uniqueNames.forEach((name, index) => {
        const container = document.createElement('div');
        const checkbox = document.createElement('input');
        const label = document.createElement('label');

        checkbox.type = 'checkbox';
        checkbox.id = `name-${index}`;
        checkbox.value = name;
        checkbox.checked = true; // Default to selecting all names
        
        label.setAttribute('for', `name-${index}`);
        // Use the name and m_id from the first instance found for a cleaner label
        const monitorInfo = allData.find(item => item.name === name);
        label.textContent = `${name} (ID: ${monitorInfo.m_id})`;

        container.appendChild(checkbox);
        container.appendChild(label);
        nameFiltersDiv.appendChild(container);
    });
}

// --- DATA FETCHING AND RENDERING ---

// Fetches data based on current filters and renders the table.
async function fetchAndRenderData() {
    const selectedMonth = document.getElementById('month-select').value;
    const selectedYear = document.getElementById('year-select').value;
    
    // Get selected names from checkboxes
    const nameCheckboxes = document.querySelectorAll('#name-filters input:checked');
    const selectedNames = Array.from(nameCheckboxes).map(cb => cb.value).join(',');

    // Construct the URL with filters
    let url = `${API_ENDPOINT}?month=${selectedMonth}&year=${selectedYear}`;
    if (selectedNames) {
        url += `&name=${selectedNames}`;
    }

    const tableBody = document.querySelector('#report-table tbody');
    tableBody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';
    document.getElementById('download-csv').disabled = true;

    try {
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success' && result.data) {
            console.log(result.count);
            renderTable(result.data);
            
            // Attach download handler
            document.getElementById('download-csv').onclick = () => {
                downloadCsv(convertToCsv(result.data));
            };
            document.getElementById('download-csv').disabled = result.data.length === 0;

        } else {
            tableBody.innerHTML = `<tr><td colspan="8">Error fetching data: ${result.error || 'Unknown error'}</td></tr>`;
        }

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="8">Network Error: Could not connect to the API.</td></tr>`;
        console.error("Fetch error:", error);
    }
}

/**
 * Renders the fetched data into the HTML table.
 * @param {Array<Object>} data 
 */
function renderTable(data) {
    const tableBody = document.querySelector('#report-table tbody');
    tableBody.innerHTML = ''; 

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No data found for the selected filters.</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = tableBody.insertRow();
        // Ensure the order matches the table headers (Monitor ID, Name, Type, Parent, Month, Year, RT, Uptime)
        row.insertCell().textContent = item.m_id;
        row.insertCell().textContent = item.name;
        row.insertCell().textContent = item.type || 'N/A';
        row.insertCell().textContent = item.parent || 'N/A';
        // item.pretty_month holds the readable string like 'September 2025'
        row.insertCell().textContent = item.pretty_month.split(' ')[0]; // Just the Month Name
        row.insertCell().textContent = item.year;
        // Format numbers for readability
        row.insertCell().textContent = item.response_time ? item.response_time.toFixed(3) : 'N/A';
        row.insertCell().textContent = item.uptime ? item.uptime.toFixed(2) : 'N/A';
    });
}

// --- INITIALIZATION ---

async function init() {
    populateDateFilters();

    // 1. Initial fetch to get ALL unique monitor names for the filter list.
    // In a real app, this should hit an endpoint optimized for just unique names/IDs.
    // For this prototype, we'll fetch a broad sample (e.g., all of 2025) and extract names.
    
    try {
        const allNamesResponse = await fetch(`${API_ENDPOINT}?year=${DEFAULT_YEAR}`);
        const allNamesResult = await allNamesResponse.json();

        if (allNamesResult.status === 'success' && allNamesResult.data) {
            console.log('1 ' + allNamesResult.count);
            populateNameFilters(allNamesResult.data);
        }
    } catch (e) {
        console.warn("Could not populate name filters automatically. Check API connection.", e);
    }


    // 2. Set up event listeners
    document.getElementById('apply-filters').addEventListener('click', fetchAndRenderData);
    
    fetchAndRenderData(); 
}

document.addEventListener('DOMContentLoaded', init);
