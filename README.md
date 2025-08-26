# Canvas Organics Compliance Hub (Mock)

A demonstration website showing how cannabis consumers can access complete compliance information via BioTrack number search.

## Purpose

This mock demonstrates the proposed user flow for New Mexico Cannabis Control Division (CCD) review:
1. Consumer scans QR code on product packaging
2. Lands on this compliance hub page
3. Enters BioTrack number from product label
4. Instantly views complete compliance information including COA access

## Features

- **Real-time search** by BioTrack ID, product name, or strain
- **Complete compliance display** with all required labeling fields
- **Mobile-responsive design** optimized for smartphone use
- **Direct COA access** via PDF links
- **Regulator-friendly layout** for easy information verification

## File Structure

```
/
├── index.html          # Main page
├── styles.css          # Mobile-first responsive styles
├── script.js           # Search functionality (vanilla JS)
├── data/
│   └── lots.csv        # 20 sample product lots
├── coas/
│   └── COA_SAMPLE_*.pdf # Placeholder COA files (20)
├── img/
│   └── logo.png        # Canvas Organics logo
└── docs/
    ├── field-mapping.pdf    # CCD review documentation
    └── screenshots/         # Page mockups for review
```

## Sample Data

The mock includes 20 diverse product lots:
- 6× Flower (various strains, weights)
- 5× Pre-Roll (regular)
- 3× Infused Pre-Roll
- 3× Concentrate (shatter, rosin, vape)
- 2× Edibles (gummies, chocolate)
- 1× Topical (balm)

## Local Testing

```bash
# Serve locally
python3 -m http.server 8000

# Visit http://localhost:8000
```

## GitHub Pages Deployment

1. Push to GitHub repository
2. Enable Pages in repository settings
3. Deploy from `main` branch
4. Site will be available at: `https://[username].github.io/compliance-hub-mock/`

## CCD Review Package

For CCD submission:
- **Site URL**: [Your GitHub Pages URL]
- **Field Mapping**: `docs/field-mapping.pdf`
- **Screenshots**: `docs/screenshots/`

## Technical Notes

- No frameworks used - vanilla HTML/CSS/JS for maximum compatibility
- CSV-based data for easy content updates
- Mobile-first responsive design
- Print-friendly styles included
- WCAG accessibility considerations

## Next Steps

Upon CCD approval:
1. Replace placeholder data with production CSV
2. Update COA links to real lab results
3. Implement production hosting
4. Generate QR codes linking to specific BioTrack searches

---

**NOTICE**: This is a mock demonstration with placeholder data. Not for actual compliance use.