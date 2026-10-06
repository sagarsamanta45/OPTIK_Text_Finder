# OPTIK.MATRIX 🛰️
> **Autonomous Optical Recognition & Deep Document Recon Workspace**

OPTIK.MATRIX is a high-precision, client-side, air-gapped document intelligence application. It ingests multi-page vector PDFs, Word documents (`.docx`), and camera scans (`PNG`, `JPG`, `WebP`), indexes text with a hybrid dual-engine (instant digital extraction + Tesseract.js WebAssembly OCR fallback), and triangulates search targets with tactical holographic HUD bounding box reticles on an HTML5 canvas.

---

## ⚡ Core Capabilities

- 📂 **Multi-Document Batch Shelf**: Drag and drop multiple documents at once (PDFs, DOCX, images). Switch between files seamlessly via an interactive tab shelf with live cross-document hit counters (`Doc A [12 hits]`, `Doc B [3 hits]`).
- ⚡ **Tactical 1-Click Entity Sweeps**: Instant automated document recon for:
  - 📧 **Emails & Usernames**
  - 🌐 **IP Addresses & URLs**
  - 📅 **Dates & Chronological Stamps**
  - 📞 **Phone Numbers & Identifiers**
  - 💳 **Sensitive Record Keys & Card IDs**
- 🔬 **Regex Search Engine**: Full regular expression pattern matching with dedicated `[ .* REGEX ]` toggle and non-blocking syntax validation.
- 🎯 **Precision Target Stepper & Focus Zoom**:
  - Live target navigation HUD (`ACTIVE_TARGET: 01 / 07`) with `PREV` / `NEXT` stepping.
  - Viewport auto-centering: automatically scrolls and centers the canvas on the focused target.
  - Active Crosshair Reticle: highlighted targets glow in cyan, while the locked target lights up in military gold/amber with extended crosshairs and callout badge (`TARGET #01`).
  - Viewport Magnification: Zoom controls (`FIT`, `100%`, `150%`, `200%`, `300%`) for inspecting fine print and micro-details.
- 🛡️ **OCR-Resilient Homoglyph Engine**: Solves classic OCR misreadings (e.g. `AI` ⟷ `Al` ⟷ `A1`, `0` ⟷ `O`, `1` ⟷ `I`, `—` ⟷ `-`) with Levenshtein edit distance typo tolerance.
- 🔒 **100% Air-Gapped Privacy**: Pure browser execution with zero cloud transmission or external document storage.

---

## ⌨️ Tactical Hotkeys & Shortcuts

| Hotkey | Context | Action |
| :--- | :--- | :--- |
| **`Enter`** | Search Input | Cycle to **Next Target** (or run query) |
| **`Shift + Enter`** | Search Input | Cycle to **Previous Target** |
| **`N` / `n`** | Global | Jump to **Next Target** |
| **`P` / `p`** | Global | Jump to **Previous Target** |
| **`+` / `=`** | Global | **Zoom In** |
| **`-` / `_`** | Global | **Zoom Out** |
| **`0`** | Global | **Reset Zoom to Fit** |

---

## 🏗️ Project Architecture

```
Text-Search/
├── frontend/             # Client-side UI & Optical Recon Matrix
│   ├── index.html        # Futuristic cyber landing gateway
│   ├── main.html         # Aerospace telemetry workspace & HUD
│   ├── script.js         # Batch shelf, regex engine, OCR & holographic renderer
│   └── style.css         # Glassmorphism design system & neon styling
├── backend/              # Node.js Express server & REST API
│   └── server.js         # Static server & port conflict handler
├── package.json          # Project scripts and dependencies
└── README.md             # Documentation
```

---

## 🚀 Getting Started

### 1. Installation & Launch
```bash
# Install dependencies
npm install

# Start local server
npm start
```

### 2. Accessing the Workspace
Open [http://localhost:3000](http://localhost:3000) in your browser:
- **`index.html`**: Tactical landing gateway
- **`main.html`**: Primary optical recon command deck
