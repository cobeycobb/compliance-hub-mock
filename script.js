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
document.addEventListener('DOMContentLoaded', async function() {
    await loadLotsData();
    setupEventListeners();
    setLastUpdated();
    initFromUrl();
    updateHeaderOffset();
});

// Also update after all resources (like images) load and on resize
window.addEventListener('load', updateHeaderOffset);
window.addEventListener('resize', updateHeaderOffset);

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

// Initialize search state and focus from URL (for QR/deep links)
function initFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q') || params.get('biotrack') || params.get('search');
        if (q) {
            searchInput.value = q;
            handleSearch();
            // Scroll first result into view for convenience
            const firstCard = resultsContainer.querySelector('.lot-card');
            if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Support anchors like #BT000118 or #lot-BT000118
        if (window.location.hash) {
            const raw = window.location.hash.replace('#', '');
            const normalized = raw.replace(/\s+/g, '').toLowerCase();
            const byId = document.getElementById(raw) || document.getElementById(`lot-${raw}`) ||
                document.getElementById(`lot-${normalized}`);
            if (byId) byId.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } catch (e) {
        // Non-fatal; ignore URL parsing errors
    }
}

// Simple CSV parser with RFC 4180 compliance
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            data.push(row);
        } else {
            console.warn(`Row ${i + 1} has ${values.length} fields but expected ${headers.length}`);
        }
    }
    
    return data;
}

// RFC 4180 compliant CSV line parser
function parseCSVLine(line) {
    const result = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        const nextChar = i < line.length - 1 ? line[i + 1] : null;
        
        if (!inQuotes) {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(field);
                field = '';
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                if (nextChar === '"') {
                    // Escaped quote
                    field += '"';
                    i++; // Skip next quote
                } else {
                    // End of quoted field
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        }
        i++;
    }
    
    result.push(field);
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

// Compute sticky offset to match header height exactly
function updateHeaderOffset() {
    try {
        const headerEl = document.querySelector('header');
        if (!headerEl) return;
        const h = headerEl.offsetHeight;
        if (h && !Number.isNaN(h)) {
            document.documentElement.style.setProperty('--header-offset', `${h}px`);
        }
    } catch (_) { /* ignore */ }
}

// Handle search input
function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (searchTerm === '') {
        filteredData = [...lotsData];
    } else {
        filteredData = lotsData.filter(lot => {
            // Search in BioTrack ID (remove spaces and hyphens for matching)
            const bioTrackId = (lot.BioTrackID || '').toLowerCase().replace(/[\s-]/g, '');
            const biotrackMatch = bioTrackId.includes(searchTerm.replace(/[\s-]/g, ''));
            
            // Search in product name (main product name)
            const productMatch = (lot.Product || '').toLowerCase().includes(searchTerm);
            
            // Search in strain
            const strainMatch = (lot.Strain || '').toLowerCase().includes(searchTerm);
            
            // Search in manufacturer
            const manufacturerMatch = (lot['manufactured by'] || '').toLowerCase().includes(searchTerm);
            
            return biotrackMatch || productMatch || strainMatch || manufacturerMatch;
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
    const card = document.createElement('article');
    card.className = 'lot-card';
    
    // New CSV format uses: Product, Type, Strain, BioTrackID, TotalTHC, TotalCBD, TotalCannabinoids, PdfUrl
    const productName = lot.Product || 'Item';  // Main product name from Product column
    const strain = lot.Strain || '-';
    const productType = lot.Type || '';
    const bioTrackId = lot.BioTrackID || '';
    const packageDate = lot['package date'] || '';
    // Assign a stable id to support anchors and deep links
    const safeId = String(bioTrackId).toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '');
    if (safeId) card.id = `lot-${safeId}`;
    
    card.innerHTML = `
        <!-- Header with View COA button and large product name -->
        <div class="card-header-new" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div class="card-header-left" style="flex: 1;">
                <h2 class="product-name-large" style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.2;">${productName}</h2>
                <div style="margin-top: 2px; font-size: 12px; color: #64748b;">${strain}${productType ? ` • ${productType}` : ''}</div>
                ${bioTrackId ? `<div class="biotrack-chip" aria-label="BioTrack number" style="margin-top: 4px;"><span class="biotrack-label">BioTrack number:</span><span class="biotrack-code">${bioTrackId}</span></div>` : ''}
            </div>
            <div class="coa-actions" style="margin-left: 12px;">
                ${lot.PdfUrl ? `
                <a href="${lot.PdfUrl}" target="_blank" rel="noopener noreferrer" 
                   style="display: inline-block; border-radius: 8px; background: #10b981; color: #fff; padding: 8px 16px; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"
                   onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">View COA</a>
                ` : `
                <button style="display: inline-block; border-radius: 8px; background: #d1d5db; color: #6b7280; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: default; opacity: 0.6;" disabled>No COA</button>
                `}
            </div>
        </div>

        ${createPotencyBubbles(lot)}
        
        <!-- Facts strip -->
        <div class="facts-grid">
            ${lot['Manufacture date'] ? `
            <div class="fact-item">
                <span class="fact-label">Manufactured</span>
                <span class="fact-value">${formatDate(lot['Manufacture date'])}</span>
            </div>` : ''}
            ${packageDate ? `
            <div class="fact-item">
                <span class="fact-label">Packaged</span>
                <span class="fact-value">${formatDate(packageDate)}</span>
            </div>` : ''}
            ${lot['Testing lab'] ? `
            <div class="fact-item">
                <span class="fact-label">Lab</span>
                <span class="fact-value">${lot['Testing lab']}</span>
            </div>` : ''}
            ${lot['manufactured by'] ? `
            <div class="fact-item">
                <span class="fact-label">Manufacturer</span>
                <span class="fact-value">${lot['manufactured by']}</span>
            </div>` : ''}
        </div>
        
        <!-- Extra fields grid showing compliance details -->
        <div class="extra-fields-grid" style="margin-top: 8px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
            ${createExtraField('Type', lot.Type)}
            ${createExtraField('Expiration Date', formatDate(lot['expiration date']))}
            ${createExtraField('Grown By', lot['Grown by'])}
            ${createExtraField('Pesticides Used', lot['Pesticides used'])}
            ${createExtraField('Solvents Used', lot['solvents used'])}
            ${createExtraField('Intended Use', lot['intended use'])}
            ${createExtraField('Warning 1', lot['warning 1'])}
            ${createExtraField('Warning 2', lot['warning 2'])}
            ${createExtraField('Poison Control', lot['poison control'] || lot['poison contorl'])}
        </div>
    `;
    
    return card;
}

// Helper function to create extra field items
function createExtraField(label, value, type = 'text') {
    if (!value || value === '-' || value === 'None') return '';
    
    if (type === 'link' && value.startsWith('http')) {
        return `
            <div style="border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; padding: 6px; font-size: 11px;">
                <div style="color: #64748b; font-weight: 500; margin-bottom: 1px;">${label}</div>
                <a href="${value}" target="_blank" rel="noopener noreferrer" style="color: #0ea5e9; text-decoration: underline; word-break: break-all;">Open COA</a>
            </div>
        `;
    }
    
    return `
        <div style="border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; padding: 6px; font-size: 11px;">
            <div style="color: #64748b; font-weight: 500; margin-bottom: 1px;">${label}</div>
            <div style="color: #1e293b; white-space: pre-wrap; word-break: break-words; line-height: 1.2;">${String(value || '-')}</div>
        </div>
    `;
}

// Create potency bubbles based on new CSV format
function createPotencyBubbles(lot) {
    const bubbles = [];
    
    // New CSV format uses: TotalTHC, TotalCBD, TotalCannabinoids
    if (lot.TotalTHC) {
        bubbles.push(`
            <div class="potency-bubble thc">
                <span>THC Total</span>
                <span class="potency-value">${lot.TotalTHC}</span>
            </div>
        `);
    }
    
    if (lot.TotalCBD) {
        bubbles.push(`
            <div class="potency-bubble cbd">
                <span>CBD Total</span>
                <span class="potency-value">${lot.TotalCBD}</span>
            </div>
        `);
    }
    
    if (lot.TotalCannabinoids) {
        bubbles.push(`
            <div class="potency-bubble total">
                <span>Total Cannabinoids</span>
                <span class="potency-value">${lot.TotalCannabinoids}</span>
            </div>
        `);
    }
    
    if (bubbles.length === 0) {
        return '';
    }
    
    return `
        <div class="potency-bubbles">
            ${bubbles.join('')}
        </div>
    `;
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
