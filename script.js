// Global variables
let lotsData = [];
let filteredData = [];

// DOM elements
const searchInput = document.getElementById('biotrack-search');
const clearBtn = document.getElementById('clear-search');
const resultsContainer = document.getElementById('results-container');
const noResultsDiv = document.getElementById('no-results');
const countSpan = document.getElementById('count');
const searchTermSpan = document.getElementById('search-term');
const lastUpdatedSpan = document.getElementById('last-updated');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadLotsData();
    setupEventListeners();
    setLastUpdated();
});

// Set last updated timestamp
function setLastUpdated() {
    const now = new Date();
    const formatted = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Denver'
    });
    lastUpdatedSpan.textContent = formatted + ' (MT)';
}

// Load and parse CSV data
async function loadLotsData() {
    try {
        const response = await fetch('data/lots.csv');
        const csvText = await response.text();
        lotsData = parseCSV(csvText);
        filteredData = [...lotsData];
        displayResults();
        updateResultsCount();
    } catch (error) {
        console.error('Error loading lots data:', error);
        showError('Error loading product data. Please refresh the page.');
    }
}

// Simple CSV parser
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            data.push(row);
        }
    }
    
    return data;
}

// Parse a single CSV line (handles quotes and commas)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Setup event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    clearBtn.addEventListener('click', clearSearch);
    
    // Focus search input on page load
    searchInput.focus();
    
    // Clear search on Escape key
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            clearSearch();
        }
    });
}

// Handle search input
function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (searchTerm === '') {
        filteredData = [...lotsData];
    } else {
        filteredData = lotsData.filter(lot => {
            // Search in BioTrack ID (remove hyphens for matching)
            const biotrackMatch = lot.BioTrack_ID.toLowerCase().replace(/-/g, '').includes(searchTerm.replace(/-/g, ''));
            
            // Search in product name
            const productMatch = lot.Product_Name.toLowerCase().includes(searchTerm);
            
            // Search in strain
            const strainMatch = lot.Strain.toLowerCase().includes(searchTerm);
            
            return biotrackMatch || productMatch || strainMatch;
        });
    }
    
    displayResults();
    updateResultsCount();
    
    if (filteredData.length === 0 && searchTerm !== '') {
        showNoResults(searchTerm);
    } else {
        hideNoResults();
    }
}

// Clear search
function clearSearch() {
    searchInput.value = '';
    searchInput.focus();
    handleSearch();
}

// Display results
function displayResults() {
    resultsContainer.innerHTML = '';
    
    filteredData.forEach(lot => {
        const card = createLotCard(lot);
        resultsContainer.appendChild(card);
    });
}

// Create a lot card element
function createLotCard(lot) {
    const card = document.createElement('div');
    card.className = 'lot-card';
    
    card.innerHTML = `
        <div class="biotrack-id">${lot.BioTrack_ID}</div>
        
        <div class="product-info">
            <div class="product-name">${lot.Product_Name}</div>
            <div>
                <span class="product-type">${lot.Product_Type}</span>
                ${lot.Strain && lot.Strain !== 'N/A' ? `<span class="strain">${lot.Strain}</span>` : ''}
            </div>
        </div>
        
        <div class="field-grid">
            <div class="field">
                <div class="field-label">Net Contents</div>
                <div class="field-value">${lot.Net_Contents}${lot.Servings ? ` (${lot.Servings} servings)` : ''}</div>
            </div>
            
            <div class="field">
                <div class="field-label">Manufacturer</div>
                <div class="field-value">${lot.Manufacturer}<br>License #${lot.License_Number}<br>${lot.Business_City}</div>
            </div>
        </div>
        
        ${createPotencySection(lot)}
        
        <div class="field-grid">
            <div class="field">
                <div class="field-label">Lab</div>
                <div class="field-value">${lot.Lab_Name}${lot.Lab_ID ? ` (${lot.Lab_ID})` : ''}</div>
            </div>
            
            <div class="field">
                <div class="field-label">Dates</div>
                <div class="field-value">
                    ${lot.Product_Type === 'Flower' && lot.Harvest_Date ? `Harvest: ${formatDate(lot.Harvest_Date)}<br>` : ''}
                    Mfg: ${formatDate(lot.Manufacturing_Date)}<br>
                    Pack: ${formatDate(lot.Pack_Date)}<br>
                    ${lot.Best_By_Date ? `Best by: ${formatDate(lot.Best_By_Date)}<br>` : ''}
                    COA Sample: ${formatDate(lot.COA_Sample_Date)}
                </div>
            </div>
        </div>
        
        ${lot.Ingredients ? `
        <div class="field">
            <div class="field-label">Ingredients</div>
            <div class="field-value">${lot.Ingredients}</div>
        </div>
        ` : ''}
        
        ${lot.Allergens ? `
        <div class="field">
            <div class="field-label">Allergens</div>
            <div class="field-value">${lot.Allergens}</div>
        </div>
        ` : ''}
        
        ${lot.Nutrition ? `
        <div class="field">
            <div class="field-label">Nutrition Information</div>
            <div class="field-value">${lot.Nutrition}</div>
        </div>
        ` : ''}
        
        <div class="warnings">
            <div class="field-label">Warnings</div>
            <div class="field-value">${lot.Warnings}</div>
        </div>
        
        <a href="coas/${lot.COA_Filename}" class="coa-link" target="_blank" rel="noopener noreferrer">
            View COA (PDF)
        </a>
        
        <div class="metadata">
            COA ID: ${lot.COA_Filename} | Last updated: ${formatDate(lot.Last_Updated)}
        </div>
    `;
    
    return card;
}

// Create potency section based on product type
function createPotencySection(lot) {
    if (lot.Product_Type === 'Edible' || lot.Product_Type === 'Topical') {
        // Show mg/serving and mg/package for edibles and topicals
        return `
        <div class="potency-grid">
            ${lot.THC_mg_serving ? `
            <div class="potency-item">
                <div class="potency-label">THC</div>
                <div class="potency-value">${lot.THC_mg_serving}mg/srv<br>${lot.THC_mg_package}mg/pkg</div>
            </div>
            ` : ''}
            ${lot.CBD_mg_serving ? `
            <div class="potency-item">
                <div class="potency-label">CBD</div>
                <div class="potency-value">${lot.CBD_mg_serving}mg/srv<br>${lot.CBD_mg_package}mg/pkg</div>
            </div>
            ` : ''}
            ${lot.Total_Cannabinoids && lot.Product_Type === 'Topical' ? `
            <div class="potency-item">
                <div class="potency-label">Total</div>
                <div class="potency-value">${lot.Total_Cannabinoids}</div>
            </div>
            ` : ''}
        </div>
        `;
    } else {
        // Show percentages for flower, pre-rolls, and concentrates
        return `
        <div class="potency-grid">
            ${lot.THC_Percent ? `
            <div class="potency-item">
                <div class="potency-label">THC</div>
                <div class="potency-value">${lot.THC_Percent}%</div>
            </div>
            ` : ''}
            ${lot.THCa_Percent ? `
            <div class="potency-item">
                <div class="potency-label">THCa</div>
                <div class="potency-value">${lot.THCa_Percent}%</div>
            </div>
            ` : ''}
            ${lot.CBD_Percent ? `
            <div class="potency-item">
                <div class="potency-label">CBD</div>
                <div class="potency-value">${lot.CBD_Percent}%</div>
            </div>
            ` : ''}
            ${lot.CBDa_Percent ? `
            <div class="potency-item">
                <div class="potency-label">CBDa</div>
                <div class="potency-value">${lot.CBDa_Percent}%</div>
            </div>
            ` : ''}
            ${lot.Total_Cannabinoids ? `
            <div class="potency-item">
                <div class="potency-label">Total</div>
                <div class="potency-value">${lot.Total_Cannabinoids}%</div>
            </div>
            ` : ''}
        </div>
        `;
    }
}

// Format date string
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

// Update results count
function updateResultsCount() {
    countSpan.textContent = filteredData.length;
}

// Show no results message
function showNoResults(searchTerm) {
    searchTermSpan.textContent = searchTerm;
    noResultsDiv.classList.remove('hidden');
}

// Hide no results message
function hideNoResults() {
    noResultsDiv.classList.add('hidden');
}

// Show error message
function showError(message) {
    resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #dc3545; background: #fff; border-radius: 8px; border: 1px solid #f5c6cb;">
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}