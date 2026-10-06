// ==========================================
// DOM Elements
// ==========================================
const imageInput = document.getElementById('imageInput');
const fileDropZone = document.getElementById('fileDropZone');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const analyzeBtn = document.getElementById('analyzeBtn');
const analyzeBtnText = document.getElementById('analyzeBtnText');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const statusMsg = document.getElementById('statusMsg');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Target Stepper Elements
const targetStepperBar = document.getElementById('targetStepperBar');
const targetCounter = document.getElementById('targetCounter');
const prevTargetBtn = document.getElementById('prevTargetBtn');
const nextTargetBtn = document.getElementById('nextTargetBtn');
const stepperSnippetDisplay = document.getElementById('stepperSnippetDisplay');
const focusTargetBtn = document.getElementById('focusTargetBtn');

// Viewport Stage & Zoom Controls
const canvasScrollStage = document.querySelector('.canvas-scroll-stage');
const primaryWorkspace = document.querySelector('.primary-workspace');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');

// Multi-Page Controls
const pageControls = document.getElementById('pageControls');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageIndicator = document.getElementById('pageIndicator');

// Progress Bar Elements
const progressContainer = document.getElementById('progressContainer');
const progressStatus = document.getElementById('progressStatus');
const progressPercent = document.getElementById('progressPercent');
const progressBarFill = document.getElementById('progressBarFill');

// Extracted Text Inspector Elements
const viewTextBtn = document.getElementById('viewTextBtn');
const viewTextBtnLabel = document.getElementById('viewTextBtnLabel');
const textDrawer = document.getElementById('textDrawer');
const textDrawerContent = document.getElementById('textDrawerContent');
const textCount = document.getElementById('textCount');
const copyTextBtn = document.getElementById('copyTextBtn');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');

// Telemetry Sidebar Elements
const telemetrySidebar = document.getElementById('telemetrySidebar');
const toggleInfoPaneBtn = document.getElementById('toggleInfoPaneBtn');
const sideWordCount = document.getElementById('sideWordCount');
const sideMatchCount = document.getElementById('sideMatchCount');
const sideConfidence = document.getElementById('sideConfidence');
const sideDocFormat = document.getElementById('sideDocFormat');
const canvasResolutionDisplay = document.getElementById('canvasResolutionDisplay');
const docTypeBadge = document.getElementById('docTypeBadge');
const targetsFeed = document.getElementById('targetsFeed');
const sideTargetsFound = document.getElementById('sideTargetsFound');
const liveUtcClock = document.getElementById('liveUtcClock');

// Document Batch Shelf Elements
const docShelfBar = document.getElementById('docShelfBar');
const shelfChipsList = document.getElementById('shelfChipsList');
const addDocBtn = document.getElementById('addDocBtn');

// Regex & Tactical Entity Recon Elements
const regexToggleBtn = document.getElementById('regexToggleBtn');
const entitySweepBtns = document.querySelectorAll('.entity-sweep-btn');

// Command Rail Elements
const railIngestBtn = document.getElementById('railIngestBtn');
const railOcrBtn = document.getElementById('railOcrBtn');
const railSearchFocusBtn = document.getElementById('railSearchFocusBtn');
const railClearBtn = document.getElementById('railClearBtn');

// ==========================================
// Application State
// ==========================================
let documentType = 'none'; // 'image' | 'pdf' | 'docx'
let currentFileName = '';
let currentImage = new Image();
let currentPdf = null;
let currentPdfPage = 1;
let totalPages = 1;
let cleanCanvasData = null; // Clean snapshot of un-highlighted page
let digitalWordsData = [];  // Preserved high-precision digital text
let wordsData = [];         // Active index of all searchable words on current page
let activeMatches = [];      // Currently highlighted search matches
let currentMatchIndex = -1;  // Currently active focused target index
let currentZoomScale = 1.0;  // Viewport zoom scale
let isZoomFit = true;        // Whether canvas is in responsive FIT mode
let lastSearchQuery = '';    // Cache last search query for stepping on Enter
let isAnalyzing = false;
let loadedDocuments = [];   // Multi-document queue
let activeDocIndex = -1;    // Currently active document index
let isRegexMode = false;     // Regex search mode toggle
let activeEntityFilter = ''; // Active 1-click entity sweep category

// Configure PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Friendly status labels for Tesseract logger
const ocrStatusLabels = {
  'loading tesseract core': 'CORE: LOADING_WASM_BINARY',
  'initializing tesseract': 'CORE: INITIALIZING_ENGINE',
  'initialized tesseract': 'CORE: ENGINE_ACTIVE',
  'loading language traineddata': 'NET: FETCHING_TRAINEDDATA',
  'loaded language traineddata': 'NET: TRAINEDDATA_MOUNTED',
  'initializing api': 'OPTICAL: CALIBRATING_DETECTORS',
  'initialized api': 'OPTICAL: DETECTORS_LOCKED',
  'recognizing text': 'NEURAL: SCANNING_GLYPH_LAYER'
};

// ==========================================
// Live UTC Clock & Telemetry Initializer
// ==========================================
function updateClock() {
  if (!liveUtcClock) return;
  const now = new Date();
  liveUtcClock.textContent = now.toTimeString().substring(0, 8);
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// Helper Functions
// ==========================================
function setStatus(text, type = 'info') {
  if (!statusMsg) return;
  statusMsg.textContent = `>> ${text}`;
  statusMsg.className = `cyber-status-text font-mono ${type}`;
}

function updateProgress(statusText, percentVal) {
  if (!progressContainer) return;
  if (statusText) progressStatus.textContent = statusText;
  if (typeof percentVal === 'number' && !isNaN(percentVal)) {
    const clamped = Math.min(100, Math.max(0, Math.round(percentVal)));
    progressPercent.textContent = `${clamped < 10 ? '0' : ''}${clamped}%`;
    progressBarFill.style.width = `${clamped}%`;
  }
}

function showProgress() {
  if (!progressContainer) return;
  updateProgress('INITIALIZING_NEURAL_CORE', 0);
  progressContainer.classList.remove('hidden');
}

function hideProgress(delay = 600) {
  if (!progressContainer) return;
  setTimeout(() => {
    progressContainer.classList.add('hidden');
    updateProgress('STANDBY', 0);
  }, delay);
}

function updatePageControls() {
  if (!pageControls) return;
  if (totalPages > 1) {
    pageControls.classList.remove('hidden');
    pageIndicator.textContent = `${currentPdfPage < 10 ? '0' : ''}${currentPdfPage} / ${totalPages < 10 ? '0' : ''}${totalPages}`;
    prevPageBtn.disabled = currentPdfPage <= 1;
    nextPageBtn.disabled = currentPdfPage >= totalPages;
  } else {
    pageControls.classList.add('hidden');
  }
}

function updateSidebarTelemetry() {
  if (sideWordCount) sideWordCount.textContent = wordsData.length;
  if (sideMatchCount) sideMatchCount.textContent = activeMatches.length;
  if (sideDocFormat) sideDocFormat.textContent = documentType.toUpperCase();
  if (canvasResolutionDisplay) {
    canvasResolutionDisplay.textContent = `${canvas.width} × ${canvas.height} PX`;
  }
  if (docTypeBadge) {
    docTypeBadge.textContent = `FORMAT: ${documentType.toUpperCase()}`;
  }
  if (sideConfidence) {
    if (digitalWordsData.length > 0) {
      sideConfidence.textContent = '100% (DIGITAL)';
      sideConfidence.className = 'metric-val font-mono cyan-glow';
    } else if (wordsData.length > 0) {
      sideConfidence.textContent = '96.4% (NEURAL)';
      sideConfidence.className = 'metric-val font-mono violet-glow';
    } else {
      sideConfidence.textContent = 'STANDBY';
      sideConfidence.className = 'metric-val font-mono';
    }
  }
}

function updateTextDrawer() {
  if (!textCount || !textDrawerContent) return;
  textCount.textContent = wordsData.length;
  if (wordsData.length === 0) {
    textDrawerContent.textContent = 'NO_DATA_AVAILABLE';
    if (viewTextBtnLabel) viewTextBtnLabel.textContent = 'STREAM: 0 WORDS';
  } else {
    textDrawerContent.textContent = wordsData.map((w) => w.text).join(' ');
    if (viewTextBtnLabel) viewTextBtnLabel.textContent = `STREAM: ${wordsData.length} WORDS`;
  }
  updateSidebarTelemetry();
}

function redrawBaseDocument() {
  if (documentType === 'image') {
    if (currentImage.complete && currentImage.naturalWidth > 0) {
      ctx.drawImage(currentImage, 0, 0);
    }
  } else if (cleanCanvasData) {
    ctx.putImageData(cleanCanvasData, 0, 0);
  }
}

// Drawer Toggle Handlers
if (viewTextBtn) {
  viewTextBtn.addEventListener('click', () => {
    textDrawer.classList.toggle('hidden');
  });
}

if (closeDrawerBtn) {
  closeDrawerBtn.addEventListener('click', () => {
    textDrawer.classList.add('hidden');
  });
}

if (copyTextBtn) {
  copyTextBtn.addEventListener('click', () => {
    const textToCopy = textDrawerContent.textContent || '';
    if (!textToCopy || textToCopy === 'NO_DATA_AVAILABLE') {
      setStatus('NO TEXT AVAILABLE TO COPY', 'warning');
      return;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      setStatus('STREAM BUFFER COPIED TO CLIPBOARD', 'success');
      copyTextBtn.textContent = '✅ COPIED';
      setTimeout(() => {
        copyTextBtn.textContent = '📋 COPY RAW';
      }, 1500);
    }).catch(() => {
      setStatus('CLIPBOARD WRITE DENIED BY PERMISSION', 'warning');
    });
  });
}

// Sidebar Toggle
if (toggleInfoPaneBtn && telemetrySidebar) {
  toggleInfoPaneBtn.addEventListener('click', () => {
    telemetrySidebar.classList.toggle('collapsed');
    telemetrySidebar.classList.toggle('active-mobile');
  });
}

// Command Rail Actions
if (railIngestBtn) railIngestBtn.addEventListener('click', () => imageInput.click());
if (railOcrBtn) railOcrBtn.addEventListener('click', () => analyzeBtn.click());
if (railSearchFocusBtn) railSearchFocusBtn.addEventListener('click', () => searchInput.focus());
if (railClearBtn) {
  railClearBtn.addEventListener('click', () => {
    wordsData = [];
    digitalWordsData = [];
    activeMatches = [];
    loadedDocuments = [];
    activeDocIndex = -1;
    currentMatchIndex = -1;
    activeEntityFilter = '';
    isRegexMode = false;
    if (regexToggleBtn) regexToggleBtn.classList.remove('active');
    if (entitySweepBtns) entitySweepBtns.forEach(b => b.classList.remove('active'));
    if (targetStepperBar) targetStepperBar.classList.add('hidden');
    documentType = 'none';
    currentPdf = null;
    cleanCanvasData = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    fileNameDisplay.textContent = 'INGEST DOSSIER (PDF / DOCX / IMAGE)';
    searchInput.value = '';
    applyZoom(1.0, true);
    updateDocumentShelfUI();
    updatePageControls();
    updateTextDrawer();
    populateTargetsFeed([]);
    setStatus('WORKSPACE PURGED // READY FOR NEW INGESTION', 'info');
  });
}

// Drag & Drop Ingestion Handlers
if (fileDropZone) {
  ['dragenter', 'dragover'].forEach((eventName) => {
    fileDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      fileDropZone.style.borderColor = 'var(--cyan-neon)';
      fileDropZone.style.background = 'rgba(0, 240, 255, 0.1)';
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    fileDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      fileDropZone.style.borderColor = '';
      fileDropZone.style.background = '';
    });
  });

  fileDropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBatchIngestion(e.dataTransfer.files);
    }
  });
}

// ==========================================
// High-Contrast Image Preprocessing for OCR
// ==========================================
function createPreprocessedOcrImage(sourceCanvas) {
  const minWidth = 1800;
  const scale = sourceCanvas.width < minWidth ? Math.min(2.5, minWidth / sourceCanvas.width) : 1.0;

  const offscreen = document.createElement('canvas');
  offscreen.width = Math.round(sourceCanvas.width * scale);
  offscreen.height = Math.round(sourceCanvas.height * scale);
  const octx = offscreen.getContext('2d');

  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(sourceCanvas, 0, 0, offscreen.width, offscreen.height);

  try {
    const imgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imgData.data;

    // Contrast stretching & binarization pre-filter
    const contrast = 1.25;
    const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const enhanced = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
    }

    octx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Preprocessing pixel access error:', err);
  }

  return {
    dataUrl: offscreen.toDataURL('image/png'),
    scale: scale
  };
}

// ==========================================
// 1. Unified Multi-Format Batch Ingestion & Shelf
// ==========================================
function detectFormat(file) {
  const fileName = (file.name || '').toLowerCase();
  const fileType = file.type || '';
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) return 'pdf';
  if (
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc') ||
    fileType.includes('wordprocessingml') ||
    fileType.includes('msword')
  ) return 'docx';
  if (fileType.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileName)) return 'image';
  return 'unknown';
}

function updateDocumentShelfUI() {
  if (!docShelfBar || !shelfChipsList) return;

  if (loadedDocuments.length === 0) {
    docShelfBar.classList.add('hidden');
    shelfChipsList.innerHTML = '';
    return;
  }

  docShelfBar.classList.remove('hidden');
  shelfChipsList.innerHTML = '';

  loadedDocuments.forEach((doc, idx) => {
    const chip = document.createElement('div');
    const isActive = (idx === activeDocIndex);
    chip.className = `doc-chip font-mono ${isActive ? 'active' : ''}`;

    const hitBadge = doc.hitCount > 0 ? `<span class="doc-chip-hits">${doc.hitCount} hits</span>` : '';

    chip.innerHTML = `
      <span class="doc-chip-format">${doc.format.toUpperCase()}</span>
      <span class="doc-chip-name" title="${doc.name}">${doc.name}</span>
      ${hitBadge}
      <button class="doc-chip-remove" title="Remove dossier" type="button">✕</button>
    `;

    chip.addEventListener('click', async (e) => {
      if (e.target.classList.contains('doc-chip-remove')) {
        e.stopPropagation();
        await removeDocumentFromShelf(idx);
        return;
      }
      if (activeDocIndex !== idx) {
        await activateDocument(idx);
      }
    });

    shelfChipsList.appendChild(chip);
  });
}

async function removeDocumentFromShelf(index) {
  if (index < 0 || index >= loadedDocuments.length) return;
  loadedDocuments.splice(index, 1);

  if (loadedDocuments.length === 0) {
    activeDocIndex = -1;
    wordsData = [];
    digitalWordsData = [];
    activeMatches = [];
    currentMatchIndex = -1;
    documentType = 'none';
    currentPdf = null;
    cleanCanvasData = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    if (fileNameDisplay) fileNameDisplay.textContent = 'INGEST DOSSIER (PDF / DOCX / IMAGE)';
    if (targetStepperBar) targetStepperBar.classList.add('hidden');
    applyZoom(1.0, true);
    updatePageControls();
    updateTextDrawer();
    populateTargetsFeed([]);
    updateDocumentShelfUI();
    setStatus('ALL DOSSIERS REMOVED // STANDBY FOR INGESTION', 'info');
  } else {
    const nextIdx = Math.min(index, loadedDocuments.length - 1);
    await activateDocument(nextIdx);
  }
}

async function activateDocument(index) {
  if (index < 0 || index >= loadedDocuments.length) return;

  // Snapshot current active document state before switching
  if (activeDocIndex >= 0 && activeDocIndex < loadedDocuments.length) {
    const curDoc = loadedDocuments[activeDocIndex];
    curDoc.wordsData = [...wordsData];
    curDoc.digitalWordsData = [...digitalWordsData];
    curDoc.cleanCanvasData = cleanCanvasData;
    curDoc.currentPage = currentPdfPage;
    curDoc.totalPages = totalPages;
    curDoc.currentPdf = currentPdf;
    curDoc.currentImage = currentImage;
    curDoc.documentType = documentType;
  }

  activeDocIndex = index;
  const doc = loadedDocuments[index];
  currentFileName = doc.name;
  documentType = doc.format;

  if (fileNameDisplay) {
    fileNameDisplay.textContent = `DOSSIER: ${doc.name.toUpperCase()}`;
  }

  activeMatches = [];
  currentMatchIndex = -1;
  if (targetStepperBar) targetStepperBar.classList.add('hidden');

  updateDocumentShelfUI();

  // If already rendered in memory, restore instantly
  if (doc.cleanCanvasData && doc.wordsData && doc.wordsData.length > 0) {
    currentPdf = doc.currentPdf;
    totalPages = doc.totalPages || 1;
    currentPdfPage = doc.currentPage || 1;
    wordsData = [...doc.wordsData];
    digitalWordsData = [...doc.digitalWordsData];
    cleanCanvasData = doc.cleanCanvasData;
    canvas.width = cleanCanvasData.width;
    canvas.height = cleanCanvasData.height;
    ctx.putImageData(cleanCanvasData, 0, 0);
    applyZoom(1.0, true);
    updatePageControls();
    updateTextDrawer();
    updateSidebarTelemetry();

    if (searchInput.value.trim()) {
      performSearch();
    } else {
      populateTargetsFeed([]);
      setStatus(`ACTIVATED ${doc.name.toUpperCase()} // ${wordsData.length} WORDS READY`, 'info');
    }
    return;
  }

  // Otherwise, route to initial loader
  if (doc.format === 'pdf') {
    await loadPdfDocument(doc.file);
  } else if (doc.format === 'docx') {
    await loadWordDocument(doc.file);
  } else if (doc.format === 'image') {
    loadImageDocument(doc.file);
  }

  if (searchInput.value.trim()) {
    setTimeout(performSearch, 350);
  }
}

async function handleBatchIngestion(files) {
  if (!files || files.length === 0) return;
  const fileList = Array.from(files);

  let firstNewDocIndex = -1;

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const fmt = detectFormat(file);
    if (fmt === 'unknown') {
      setStatus(`SKIPPING UNSUPPORTED FILE: ${file.name.toUpperCase()}`, 'warning');
      continue;
    }

    const existingIdx = loadedDocuments.findIndex(d => d.name === file.name && d.file && d.file.size === file.size);
    if (existingIdx >= 0) {
      if (firstNewDocIndex === -1) firstNewDocIndex = existingIdx;
      continue;
    }

    const docObj = {
      id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: file.name,
      file: file,
      format: fmt,
      totalPages: 1,
      currentPage: 1,
      pdfDoc: null,
      currentImage: null,
      wordsData: [],
      digitalWordsData: [],
      cleanCanvasData: null,
      hitCount: 0
    };
    loadedDocuments.push(docObj);
    if (firstNewDocIndex === -1) {
      firstNewDocIndex = loadedDocuments.length - 1;
    }
  }

  if (loadedDocuments.length === 0) {
    setStatus('UNSUPPORTED_FORMAT // SELECT PDF, DOCX, OR RASTER IMAGE', 'error');
    return;
  }

  updateDocumentShelfUI();

  if (firstNewDocIndex >= 0) {
    await activateDocument(firstNewDocIndex);
  }
}

// Single file backwards compatibility
async function handleFileIngestion(file) {
  if (!file) return;
  await handleBatchIngestion([file]);
}

imageInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleBatchIngestion(e.target.files);
    imageInput.value = '';
  }
});

if (addDocBtn) {
  addDocBtn.addEventListener('click', () => {
    imageInput.click();
  });
}

// A. Image File Loader
function loadImageDocument(file) {
  documentType = 'image';
  totalPages = 1;
  currentPdf = null;
  updatePageControls();
  setStatus('INGESTING RASTER IMAGE MATRIX...', 'info');

  const reader = new FileReader();

  reader.onload = (event) => {
    currentImage = new Image();
    currentImage.onload = () => {
      canvas.width = currentImage.width;
      canvas.height = currentImage.height;
      ctx.drawImage(currentImage, 0, 0);
      cleanCanvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setStatus('IMAGE LOADED // CLICK "ANALYZE PAGE" TO RUN NEURAL OCR', 'info');
      updateTextDrawer();
    };

    currentImage.onerror = () => {
      setStatus('CORRUPT_IMAGE_STREAM // UNABLE TO RENDER', 'error');
    };

    currentImage.src = event.target.result;
  };

  reader.onerror = () => {
    setStatus('DISK_READ_FAILURE', 'error');
  };

  reader.readAsDataURL(file);
}

// B. PDF File Loader (via PDF.js)
async function loadPdfDocument(file) {
  documentType = 'pdf';
  setStatus('INITIALIZING PDF RENDER PIPELINE...', 'info');

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    currentPdf = await loadingTask.promise;
    totalPages = currentPdf.numPages;
    currentPdfPage = 1;

    updatePageControls();
    await renderPdfPage(currentPdfPage);
  } catch (error) {
    console.error('PDF parsing error:', error);
    setStatus(`PDF_READ_ERROR // ${error.message.toUpperCase()}`, 'error');
  }
}

async function renderPdfPage(pageNum) {
  if (!currentPdf) return;
  setStatus(`RENDERING ORBITAL PAGE ${pageNum} / ${totalPages}...`, 'info');

  try {
    const page = await currentPdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    await page.render(renderContext).promise;

    cleanCanvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Extract embedded digital text with pixel-perfect font-metrics calibration
    wordsData = [];
    digitalWordsData = [];
    const textContent = await page.getTextContent();

    if (textContent && textContent.items && textContent.items.length > 0) {
      ctx.save();

      textContent.items.forEach((item) => {
        if (!item.str || !item.str.trim()) return;

        const tx = item.transform[4];
        const ty = item.transform[5];
        const [vx, vy] = viewport.convertToViewportPoint(tx, ty);

        const itemWidth = item.width * viewport.scale;
        const rawFontH = item.height || Math.abs(item.transform[3]) || 12;
        const fontHeight = Math.max(8, rawFontH * viewport.scale);

        // Retrieve style if provided by PDF.js text content
        const style = (textContent.styles && textContent.styles[item.fontName]) ? textContent.styles[item.fontName] : null;
        const fontFam = (style && style.fontFamily) ? `"${style.fontFamily}", sans-serif` : 'sans-serif';
        const fontSize = Math.max(8, Math.round(fontHeight));
        ctx.font = `${fontSize}px ${fontFam}`;

        const asc = (style && typeof style.ascent === 'number' && style.ascent > 0) ? Math.min(1.1, style.ascent) : 0.88;
        const desc = (style && typeof style.descent === 'number' && style.descent < 0) ? Math.min(0.4, Math.abs(style.descent)) : 0.22;
        const y0 = Math.round(vy - fontHeight * asc);
        const y1 = Math.round(vy + Math.max(3, fontHeight * desc));

        // Measure entire string with canvas engine to determine exact normalization ratio
        const fullMeasured = ctx.measureText(item.str).width;
        const scale = (fullMeasured > 0 && itemWidth > 0) ? (itemWidth / fullMeasured) : 1.0;

        // Extract every word and its precise character offsets inside item.str
        const wordRegex = /\S+/g;
        let match;
        while ((match = wordRegex.exec(item.str)) !== null) {
          const word = match[0];
          const charStart = match.index;
          const charEnd = charStart + word.length;

          // Prefix before the word and prefix including the word
          const prefixBefore = item.str.substring(0, charStart);
          const prefixWithWord = item.str.substring(0, charEnd);

          const startOffset = charStart === 0 ? 0 : ctx.measureText(prefixBefore).width * scale;
          const endOffset = (charEnd === item.str.length && fullMeasured > 0)
            ? itemWidth
            : ctx.measureText(prefixWithWord).width * scale;

          let x0 = Math.round(vx + startOffset);
          let x1 = Math.round(vx + endOffset);

          // Handle RTL if text direction is right-to-left
          if (item.dir === 'rtl') {
            const rightAlignedX0 = Math.round(vx + itemWidth - endOffset);
            const rightAlignedX1 = Math.round(vx + itemWidth - startOffset);
            x0 = rightAlignedX0;
            x1 = rightAlignedX1;
          }

          digitalWordsData.push({
            text: word,
            bbox: {
              x0,
              y0,
              x1: Math.max(x0 + 4, x1),
              y1
            },
            charStart,
            charEnd,
            fullStr: item.str,
            scale,
            vx,
            vy,
            fontHeight
          });
        }
      });

      ctx.restore();

      // Sort words in visual reading order: top-to-bottom, left-to-right
      digitalWordsData.sort((a, b) => {
        const lineTolerance = 6;
        const yDiff = a.bbox.y0 - b.bbox.y0;
        if (Math.abs(yDiff) > lineTolerance) {
          return yDiff;
        }
        return a.bbox.x0 - b.bbox.x0;
      });
    }

    wordsData = [...digitalWordsData];
    updateTextDrawer();

    if (wordsData.length > 0) {
      setStatus(`DIGITAL DOSSIER READY // ${wordsData.length} WORDS INDEXED // READY TO TRIANGULATE`, 'success');
    } else {
      setStatus(`SCANNED PAGE LOADED (NO EMBEDDED TEXT) // CLICK "ANALYZE PAGE" TO RUN OCR`, 'info');
    }
  } catch (error) {
    console.error('Error rendering PDF page:', error);
    setStatus(`RENDER_EXCEPTION // ${error.message.toUpperCase()}`, 'error');
  }
}

// Multi-Page Navigation Listeners
prevPageBtn.addEventListener('click', async () => {
  if (currentPdf && currentPdfPage > 1) {
    currentPdfPage--;
    updatePageControls();
    searchInput.value = '';
    populateTargetsFeed([]);
    await renderPdfPage(currentPdfPage);
  }
});

nextPageBtn.addEventListener('click', async () => {
  if (currentPdf && currentPdfPage < totalPages) {
    currentPdfPage++;
    updatePageControls();
    searchInput.value = '';
    populateTargetsFeed([]);
    await renderPdfPage(currentPdfPage);
  }
});

// C. Word Document Loader (via Mammoth.js)
async function loadWordDocument(file) {
  documentType = 'docx';
  totalPages = 1;
  currentPdf = null;
  updatePageControls();
  setStatus('PARSING WORD DOSSIER STREAM...', 'info');

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    const fullText = result.value || '';

    if (!fullText.trim()) {
      setStatus('WORD DOSSIER CONTAINS EMPTY STREAM', 'warning');
      return;
    }

    renderDocxToCanvas(fullText);
  } catch (error) {
    console.error('Word document loading error:', error);
    setStatus(`DOCX_PARSER_EXCEPTION // ${error.message.toUpperCase()}`, 'error');
  }
}

function renderDocxToCanvas(text) {
  const pageWidth = 900;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 28;
  const fontSize = 16;

  ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

  const rawParagraphs = text.split(/\r?\n/);
  const lines = [];

  rawParagraphs.forEach((para) => {
    const trimmed = para.trim();
    if (!trimmed) {
      lines.push([]);
      return;
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    let curLine = [];
    let curLineWidth = 0;

    words.forEach((word) => {
      const metrics = ctx.measureText(word + ' ');
      if (curLineWidth + metrics.width > contentWidth && curLine.length > 0) {
        lines.push(curLine);
        curLine = [word];
        curLineWidth = metrics.width;
      } else {
        curLine.push(word);
        curLineWidth += metrics.width;
      }
    });

    if (curLine.length > 0) {
      lines.push(curLine);
    }
  });

  const pageHeight = Math.max(1100, margin * 2 + lines.length * lineHeight + 50);
  canvas.width = pageWidth;
  canvas.height = pageHeight;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  ctx.fillStyle = '#1e293b';
  ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
  ctx.textBaseline = 'top';

  digitalWordsData = [];
  let curY = margin;

  lines.forEach((line) => {
    if (line.length === 0) {
      curY += lineHeight * 0.6;
      return;
    }

    let curX = margin;
    line.forEach((word) => {
      const metrics = ctx.measureText(word);
      ctx.fillText(word, curX, curY);

      digitalWordsData.push({
        text: word,
        bbox: {
          x0: Math.round(curX),
          y0: Math.round(curY),
          x1: Math.round(curX + metrics.width),
          y1: Math.round(curY + lineHeight)
        }
      });

      const spaceMetrics = ctx.measureText(' ');
      curX += metrics.width + spaceMetrics.width;
    });

    curY += lineHeight;
  });

  wordsData = [...digitalWordsData];
  cleanCanvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  updateTextDrawer();
  setStatus(`WORD DOSSIER PROCESSED // ${wordsData.length} WORDS INDEXED // READY TO TRIANGULATE`, 'success');
}

// ==========================================
// 2. High-Accuracy OCR Analysis Handler
// (Preserves digital text & uses preprocessed canvas)
// ==========================================
analyzeBtn.addEventListener('click', async () => {
  if (isAnalyzing) return;

  if (documentType === 'none') {
    setStatus('INGEST A DOSSIER (PDF / DOCX / IMAGE) TO INITIALIZE OCR', 'error');
    return;
  }

  isAnalyzing = true;
  analyzeBtn.disabled = true;
  analyzeBtnText.textContent = 'SCANNING...';
  setStatus('ACTIVATING NEURAL OCR ENGINE... MONITORING TELEMETRY', 'info');
  showProgress();

  redrawBaseDocument();

  try {
    const ocrPre = createPreprocessedOcrImage(canvas);
    const ocrScale = ocrPre.scale || 1.0;

    const result = await Tesseract.recognize(ocrPre.dataUrl, 'eng', {
      logger: (info) => {
        const readableStatus = ocrStatusLabels[info.status] || info.status || 'NEURAL_PROCESSING';
        const pct = typeof info.progress === 'number' ? Math.round(info.progress * 100) : 0;
        updateProgress(readableStatus, pct);
      }
    });

    updateProgress('OCR_MATRIX_SYNCHRONIZED', 100);

    const rawOcrWords = (result && result.data && result.data.words) ? result.data.words : [];
    const ocrWords = rawOcrWords.map(w => {
      const b = w.bbox || {};
      return {
        text: w.text,
        confidence: w.confidence,
        bbox: {
          x0: Math.round((b.x0 || 0) / ocrScale),
          y0: Math.round((b.y0 || 0) / ocrScale),
          x1: Math.round((b.x1 || 0) / ocrScale),
          y1: Math.round((b.y1 || 0) / ocrScale)
        }
      };
    });

    // If digital text exists, merge without overwriting
    if (digitalWordsData.length > 0) {
      const merged = [...digitalWordsData];

      ocrWords.forEach((ow) => {
        const owClean = cleanWord(ow.text);
        if (!owClean) return;
        const existsInDigital = digitalWordsData.some(
          (dw) => cleanWord(dw.text) === owClean
        );
        if (!existsInDigital) {
          merged.push(ow);
        }
      });

      wordsData = merged;
      setStatus(`DIGITAL TEXT SYNCHRONIZED WITH OCR // ${wordsData.length} TOTAL WORDS INDEXED`, 'success');
    } else {
      wordsData = ocrWords;
      if (wordsData.length > 0) {
        setStatus(`OCR RECON COMPLETE // ${wordsData.length} WORDS DETECTED // READY TO SEARCH`, 'success');
      } else {
        setStatus('ZERO_GLYPHS_DETECTED // RE-CHECK IMAGE CONTRAST OR DPI', 'warning');
      }
    }

    redrawBaseDocument();
    updateTextDrawer();
    hideProgress(700);
  } catch (error) {
    console.error('OCR Error:', error);
    redrawBaseDocument();
    setStatus(`OCR_EXECUTION_FAILURE // ${error.message.toUpperCase()}`, 'error');
    hideProgress(300);
  } finally {
    isAnalyzing = false;
    analyzeBtn.disabled = false;
    analyzeBtnText.textContent = 'ANALYZE PAGE';
  }
});

// ==========================================
// 3. OCR-Resilient Phrase & Word Search Engine
// With Sci-Fi Holographic HUD Highlighting
// ==========================================

function cleanWord(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

// Normalizes common OCR misreadings
function normalizeOcrText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\bal\b/g, 'ai')   // 'Al' -> 'ai'
    .replace(/\ba1\b/g, 'ai')   // 'A1' -> 'ai'
    .replace(/0/g, 'o')         // 0 <-> o
    .replace(/1/g, 'i')         // 1 <-> i
    .replace(/5/g, 's')         // 5 <-> s
    .replace(/8/g, 'b')         // 8 <-> b
    .replace(/vv/g, 'w')        // vv <-> w
    .replace(/rn/g, 'm');       // rn <-> m
}

// Levenshtein edit distance
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = [];
  for (let i = 0; i <= b.length; i++) row[i] = i;
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

// Token Matcher with OCR-awareness & Symbol Resiliency
function isTokenMatch(searchToken, wordText) {
  if (!searchToken || !wordText) return false;

  const sClean = cleanWord(searchToken);
  const wClean = cleanWord(wordText);

  // If either token has no letters/digits (e.g. pure punctuation like '-', '.', ':', '/', '&')
  if (!sClean || !wClean) {
    const sRaw = searchToken.trim().toLowerCase();
    const wRaw = wordText.trim().toLowerCase();
    if (!sRaw || !wRaw) return false;
    return sRaw === wRaw || wRaw.includes(sRaw) || sRaw.includes(wRaw);
  }

  // 1. Direct equality or substring in either direction
  if (wClean === sClean || wClean.includes(sClean) || sClean.includes(wClean)) return true;

  // 2. OCR homoglyph normalization match (handles 'Al' <-> 'AI')
  const sNorm = normalizeOcrText(sClean);
  const wNorm = normalizeOcrText(wClean);
  if (wNorm === sNorm || wNorm.includes(sNorm) || sNorm.includes(wNorm)) return true;

  // 3. Raw text substring
  const rawWord = wordText.toLowerCase();
  const rawToken = searchToken.toLowerCase();
  if (rawWord.includes(rawToken) || rawToken.includes(rawWord)) return true;

  // 4. Fuzzy distance tolerance for OCR misrecognitions
  if (sClean.length >= 4 && Math.abs(sClean.length - wClean.length) <= 1) {
    if (levenshtein(sClean, wClean) <= 1 || levenshtein(sNorm, wNorm) <= 1) return true;
  }
  if (sClean.length >= 7 && Math.abs(sClean.length - wClean.length) <= 2) {
    if (levenshtein(sClean, wClean) <= 2 || levenshtein(sNorm, wNorm) <= 2) return true;
  }

  return false;
}

// Sci-Fi Holographic HUD Highlight with Chamfer Corner Reticles
function drawHolographicHudBox(ctx, x0, y0, width, height, strokeWidth) {
  const pad = Math.max(3, Math.round(height * 0.08));
  const x = Math.max(0, x0 - pad);
  const y = Math.max(0, y0 - pad);
  const w = width + pad * 2;
  const h = height + pad * 2;

  ctx.save();
  // Neon Cyan Hologram
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 10;
  ctx.lineWidth = Math.max(2, strokeWidth);
  ctx.strokeStyle = '#00f0ff';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.22)';

  // Main Bounding Box
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  // Aerospace HUD Reticle Corners (L-shaped tick marks)
  const arm = Math.min(10, Math.round(Math.min(w, h) * 0.25));
  ctx.lineWidth = Math.max(3, strokeWidth + 1);
  ctx.strokeStyle = '#ffffff';

  // Top-Left L
  ctx.beginPath();
  ctx.moveTo(x, y + arm);
  ctx.lineTo(x, y);
  ctx.lineTo(x + arm, y);
  ctx.stroke();

  // Top-Right L
  ctx.beginPath();
  ctx.moveTo(x + w - arm, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + arm);
  ctx.stroke();

  // Bottom-Left L
  ctx.beginPath();
  ctx.moveTo(x, y + h - arm);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + arm, y + h);
  ctx.stroke();

  // Bottom-Right L
  ctx.beginPath();
  ctx.moveTo(x + w - arm, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - arm);
  ctx.stroke();

  ctx.restore();
}

// Active Locked Target Crosshair Reticle (Tactical Amber/Gold with Callout Badge)
function drawActiveCrosshairBox(ctx, x0, y0, width, height, strokeWidth, targetNumber) {
  const pad = Math.max(4, Math.round(height * 0.12));
  const x = Math.max(0, x0 - pad);
  const y = Math.max(0, y0 - pad);
  const w = width + pad * 2;
  const h = height + pad * 2;

  ctx.save();
  // Amber Glow
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 18;
  ctx.lineWidth = Math.max(3, strokeWidth + 1);
  ctx.strokeStyle = '#f59e0b';
  ctx.fillStyle = 'rgba(245, 158, 11, 0.32)';

  // Main Bounding Box
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  // Extended Tactical Crosshair Arms
  const arm = Math.min(18, Math.max(8, Math.round(Math.min(w, h) * 0.35)));
  const ext = 8;
  ctx.lineWidth = Math.max(3.5, strokeWidth + 2);
  ctx.strokeStyle = '#ffffff';

  // Top-Left Crosshair
  ctx.beginPath();
  ctx.moveTo(x - ext, y);
  ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - ext);
  ctx.lineTo(x, y + arm);
  ctx.stroke();

  // Top-Right Crosshair
  ctx.beginPath();
  ctx.moveTo(x + w + ext, y);
  ctx.lineTo(x + w - arm, y);
  ctx.moveTo(x + w, y - ext);
  ctx.lineTo(x + w, y + arm);
  ctx.stroke();

  // Bottom-Left Crosshair
  ctx.beginPath();
  ctx.moveTo(x - ext, y + h);
  ctx.lineTo(x + arm, y + h);
  ctx.moveTo(x, y + h + ext);
  ctx.lineTo(x, y + h - arm);
  ctx.stroke();

  // Bottom-Right Crosshair
  ctx.beginPath();
  ctx.moveTo(x + w + ext, y + h);
  ctx.lineTo(x + w - arm, y + h);
  ctx.moveTo(x + w, y + h + ext);
  ctx.lineTo(x + w, y + h - arm);
  ctx.stroke();

  // Target Locked Callout Badge
  const badgeText = `TARGET #${targetNumber < 10 ? '0' : ''}${targetNumber}`;
  const badgeFont = `bold ${Math.max(10, Math.min(16, Math.round(height * 0.5)))}px 'JetBrains Mono', monospace`;
  ctx.font = badgeFont;
  const tw = ctx.measureText(badgeText).width;
  const bw = tw + 14;
  const bh = Math.max(18, Math.min(26, Math.round(height * 0.65)));
  const bx = x;
  const by = y - bh - 6 > 0 ? y - bh - 6 : y + h + 6;

  ctx.fillStyle = '#030712';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, by, bw, bh);

  ctx.fillStyle = '#f59e0b';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, bx + 7, by + bh / 2);

  ctx.restore();
}

function groupWordsIntoLines(words) {
  if (words.length <= 1) return [words];

  const lines = [];
  let currentLine = [words[0]];

  for (let i = 1; i < words.length; i++) {
    const prev = currentLine[currentLine.length - 1];
    const curr = words[i];

    const prevH = prev.bbox.y1 - prev.bbox.y0;
    const currH = curr.bbox.y1 - curr.bbox.y0;
    const minH = Math.min(prevH, currH);

    const verticalOverlap =
      Math.min(prev.bbox.y1, curr.bbox.y1) - Math.max(prev.bbox.y0, curr.bbox.y0);

    if (verticalOverlap > 0.4 * minH) {
      currentLine.push(curr);
    } else {
      lines.push(currentLine);
      currentLine = [curr];
    }
  }
  lines.push(currentLine);
  return lines;
}

function matchPhraseAt(words, startIndex, searchTokens) {
  let wordIdx = startIndex;
  const matched = [];

  for (let tIdx = 0; tIdx < searchTokens.length; tIdx++) {
    const token = searchTokens[tIdx];

    while (
      wordIdx < words.length &&
      !cleanWord(words[wordIdx].text) &&
      cleanWord(token)
    ) {
      wordIdx++;
    }

    if (wordIdx >= words.length) return null;

    const w = words[wordIdx];
    const isMatch = isTokenMatch(token, w.text);

    if (!isMatch) {
      return null;
    }

    if (!matched.includes(w)) {
      matched.push(w);
    }

    // Check if the current word also covers the next search token (e.g. "Pvt.Ltd." covering "Pvt" and "Ltd")
    const nextToken = tIdx + 1 < searchTokens.length ? searchTokens[tIdx + 1] : null;
    if (nextToken && isTokenMatch(nextToken, w.text) && cleanWord(w.text).length > cleanWord(token).length) {
      continue;
    }

    wordIdx++;
  }

  return {
    matchedWords: matched,
    nextIndex: wordIdx
  };
}

// High-Precision Continuous Line & Phrase Matcher
function findContinuousLineMatches(words, rawQuery) {
  const qClean = rawQuery.trim().toLowerCase();
  if (!qClean) return [];

  const lines = groupWordsIntoLines(words);
  const foundMatches = [];

  lines.forEach((lineWords) => {
    let charOffset = 0;
    const wordMap = [];
    const parts = [];

    lineWords.forEach((w) => {
      const start = charOffset;
      const end = start + w.text.length;
      wordMap.push({ word: w, start, end });
      parts.push(w.text);
      charOffset = end + 1; // space between words
    });

    const lineStr = parts.join(' ').toLowerCase();
    let idx = 0;
    while ((idx = lineStr.indexOf(qClean, idx)) !== -1) {
      const mStart = idx;
      const mEnd = idx + qClean.length;

      // Find words participating in this match
      const matchingItems = wordMap.filter(item => item.start < mEnd && item.end > mStart);
      const matchedWords = matchingItems.map(item => item.word);

      if (matchedWords.length > 0) {
        // If single word and query is a sub-word, calculate precision sub-word bounding box if possible
        if (matchedWords.length === 1 && matchingItems.length === 1) {
          const item = matchingItems[0];
          const w = item.word;
          const subStart = Math.max(0, mStart - item.start);
          const subEnd = Math.min(w.text.length, mEnd - item.start);

          if ((subStart > 0 || subEnd < w.text.length) && w.charStart !== undefined && w.fullStr !== undefined && w.scale !== undefined && w.vx !== undefined) {
            ctx.save();
            const fontSize = Math.max(8, Math.round(w.fontHeight || 12));
            ctx.font = `${fontSize}px sans-serif`;
            const subX0 = Math.round(w.vx + ctx.measureText(w.fullStr.substring(0, w.charStart + subStart)).width * w.scale);
            const subX1 = Math.round(w.vx + ctx.measureText(w.fullStr.substring(0, w.charStart + subEnd)).width * w.scale);
            ctx.restore();

            foundMatches.push({
              matchedWords: [{
                text: w.text.substring(subStart, subEnd),
                bbox: {
                  x0: subX0,
                  y0: w.bbox.y0,
                  x1: Math.max(subX0 + 4, subX1),
                  y1: w.bbox.y1
                }
              }],
              matchedText: rawQuery
            });
            idx += Math.max(1, qClean.length);
            continue;
          }
        }

        foundMatches.push({
          matchedWords,
          matchedText: rawQuery
        });
      }

      idx += Math.max(1, qClean.length);
    }
  });

  return foundMatches;
}

// Render all matches (inactive in Cyan, active focused match in Gold Amber crosshairs)
function renderAllMatches() {
  redrawBaseDocument();
  if (activeMatches.length === 0) return;

  const strokeWidth = Math.max(3, Math.round(canvas.width * 0.003));

  // 1. Draw inactive matches first
  activeMatches.forEach((match, idx) => {
    if (idx === currentMatchIndex) return;
    const lines = groupWordsIntoLines(match.matchedWords);
    lines.forEach((lineWords) => {
      const x0 = Math.min(...lineWords.map((w) => w.bbox.x0));
      const y0 = Math.min(...lineWords.map((w) => w.bbox.y0));
      const x1 = Math.max(...lineWords.map((w) => w.bbox.x1));
      const y1 = Math.max(...lineWords.map((w) => w.bbox.y1));
      drawHolographicHudBox(ctx, x0, y0, x1 - x0, y1 - y0, strokeWidth);
    });
  });

  // 2. Draw active focused match on top
  if (currentMatchIndex >= 0 && currentMatchIndex < activeMatches.length) {
    const activeMatch = activeMatches[currentMatchIndex];
    const lines = groupWordsIntoLines(activeMatch.matchedWords);
    lines.forEach((lineWords) => {
      const x0 = Math.min(...lineWords.map((w) => w.bbox.x0));
      const y0 = Math.min(...lineWords.map((w) => w.bbox.y0));
      const x1 = Math.max(...lineWords.map((w) => w.bbox.x1));
      const y1 = Math.max(...lineWords.map((w) => w.bbox.y1));
      drawActiveCrosshairBox(ctx, x0, y0, x1 - x0, y1 - y0, strokeWidth, currentMatchIndex + 1);
    });
  }
}

// Smoothly scroll and center the viewport on the active match
function scrollToMatch(match) {
  if (!match || !canvasScrollStage || !canvas.width || !canvas.height) return;

  const lines = groupWordsIntoLines(match.matchedWords);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  lines.forEach((lineWords) => {
    lineWords.forEach((w) => {
      minX = Math.min(minX, w.bbox.x0);
      minY = Math.min(minY, w.bbox.y0);
      maxX = Math.max(maxX, w.bbox.x1);
      maxY = Math.max(maxY, w.bbox.y1);
    });
  });

  if (minX === Infinity) return;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const canvasRect = canvas.getBoundingClientRect();
  const scaleX = canvasRect.width / canvas.width;
  const scaleY = canvasRect.height / canvas.height;

  const renderX = cx * scaleX;
  const renderY = cy * scaleY;

  const stageWidth = canvasScrollStage.clientWidth;
  const stageHeight = canvasScrollStage.clientHeight;

  const canvasOffsetLeft = canvas.offsetLeft;
  const canvasOffsetTop = canvas.offsetTop;

  const targetScrollLeft = Math.max(0, canvasOffsetLeft + renderX - stageWidth / 2);
  const targetScrollTop = Math.max(0, canvasOffsetTop + renderY - stageHeight / 2);

  canvasScrollStage.scrollTo({
    left: targetScrollLeft,
    top: targetScrollTop,
    behavior: 'smooth'
  });

  // Ensure canvas viewport card is in view
  if (primaryWorkspace) {
    const stageBox = canvasScrollStage.getBoundingClientRect();
    const workBox = primaryWorkspace.getBoundingClientRect();
    if (stageBox.top < workBox.top + 40 || stageBox.bottom > workBox.bottom + 80) {
      canvasScrollStage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

// Focus on a specific target match
function focusMatch(index, shouldScroll = true) {
  if (activeMatches.length === 0) {
    currentMatchIndex = -1;
    if (targetStepperBar) targetStepperBar.classList.add('hidden');
    return;
  }

  // Seamless wrap-around
  currentMatchIndex = ((index % activeMatches.length) + activeMatches.length) % activeMatches.length;

  const currentMatch = activeMatches[currentMatchIndex];
  const targetNum = currentMatchIndex + 1;
  const total = activeMatches.length;
  const snippet = currentMatch.matchedWords.map((w) => w.text).join(' ');

  // Update Stepper Readouts
  if (targetCounter) {
    targetCounter.textContent = `${targetNum < 10 ? '0' : ''}${targetNum} / ${total < 10 ? '0' : ''}${total}`;
  }
  if (stepperSnippetDisplay) {
    stepperSnippetDisplay.textContent = `LOCKED: "${snippet}"`;
    stepperSnippetDisplay.title = snippet;
  }
  if (targetStepperBar) {
    targetStepperBar.classList.remove('hidden');
  }

  // Update Sidebar feed active highlight
  if (targetsFeed) {
    const allCards = targetsFeed.querySelectorAll('.target-item-card');
    allCards.forEach((c, i) => {
      if (i === currentMatchIndex) {
        c.classList.add('active-target');
        c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        c.classList.remove('active-target');
      }
    });
  }

  // Redraw with focused crosshair
  renderAllMatches();

  // Scroll to Match
  if (shouldScroll) {
    scrollToMatch(currentMatch);
  }

  setStatus(`LOCKED TARGET #${targetNum} OF ${total}: "${snippet.toUpperCase()}"`, 'info');
}

function populateTargetsFeed(matches) {
  if (!targetsFeed || !sideTargetsFound) return;
  sideTargetsFound.textContent = `${matches.length} TARGETS`;
  targetsFeed.innerHTML = '';

  if (matches.length === 0) {
    targetsFeed.innerHTML = '<div class="empty-feed-placeholder font-mono">&gt; Awaiting search query execution...</div>';
    return;
  }

  matches.forEach((m, idx) => {
    const card = document.createElement('div');
    card.className = `target-item-card font-mono ${idx === currentMatchIndex ? 'active-target' : ''}`;
    const textSnippet = m.matchedWords.map((w) => w.text).join(' ');
    const bbox = m.matchedWords[0].bbox;
    const entityBadge = m.entityLabel ? `<span class="target-entity-badge">${m.entityLabel}</span>` : '';

    card.innerHTML = `
      <div class="target-item-header">
        <span>#${idx + 1 < 10 ? '0' : ''}${idx + 1} MATCH${entityBadge}</span>
        <span>X:${bbox.x0} Y:${bbox.y0}</span>
      </div>
      <div class="target-item-text font-space">"${textSnippet}"</div>
    `;

    card.addEventListener('click', () => {
      focusMatch(idx, true);
    });

    targetsFeed.appendChild(card);
  });
}

// ==========================================
// Viewport Zoom & Scaling Handler
// ==========================================
function applyZoom(scale, isFit = false) {
  isZoomFit = isFit;
  if (!canvas) return;

  if (isFit) {
    canvas.style.width = '100%';
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    if (zoomLevelDisplay) zoomLevelDisplay.textContent = 'FIT';
  } else {
    currentZoomScale = Math.min(3.0, Math.max(0.4, scale));
    const targetW = Math.round(canvas.width * currentZoomScale);
    canvas.style.width = `${targetW}px`;
    canvas.style.maxWidth = 'none';
    canvas.style.height = 'auto';
    if (zoomLevelDisplay) zoomLevelDisplay.textContent = `${Math.round(currentZoomScale * 100)}%`;
  }

  // If a target is active, re-center after zoom calculation
  if (currentMatchIndex >= 0 && activeMatches[currentMatchIndex]) {
    setTimeout(() => {
      scrollToMatch(activeMatches[currentMatchIndex]);
    }, 120);
  }
}

if (zoomInBtn) {
  zoomInBtn.addEventListener('click', () => {
    const nextScale = isZoomFit ? 1.25 : currentZoomScale + 0.25;
    applyZoom(nextScale, false);
  });
}

if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', () => {
    const nextScale = isZoomFit ? 0.75 : currentZoomScale - 0.25;
    applyZoom(nextScale, false);
  });
}

if (zoomResetBtn) {
  zoomResetBtn.addEventListener('click', () => {
    applyZoom(1.0, true);
  });
}

// Stepper Button Listeners
if (prevTargetBtn) {
  prevTargetBtn.addEventListener('click', () => {
    if (activeMatches.length > 0) {
      focusMatch(currentMatchIndex - 1, true);
    }
  });
}

if (nextTargetBtn) {
  nextTargetBtn.addEventListener('click', () => {
    if (activeMatches.length > 0) {
      focusMatch(currentMatchIndex + 1, true);
    }
  });
}

if (focusTargetBtn) {
  focusTargetBtn.addEventListener('click', () => {
    if (activeMatches.length > 0 && currentMatchIndex >= 0) {
      focusMatch(currentMatchIndex, true);
    }
  });
}

// ==========================================
// Regex & Tactical Entity Recon Engine
// ==========================================
const ENTITY_PATTERNS = {
  email: {
    label: 'EMAIL',
    regexStr: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    status: 'SWEEPING FOR ELECTRONIC MAIL IDENTIFIERS...'
  },
  url: {
    label: 'URL/IP',
    regexStr: '(?:https?:\\/\\/|www\\.)[^\\s/$.?#].[^\\s]*|\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    status: 'SWEEPING FOR NETWORK ENDPOINTS, URLS & IP ADDRESSES...'
  },
  date: {
    label: 'DATE',
    regexStr: '\\b(?:\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}|\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{2,4})\\b',
    status: 'SWEEPING FOR CALENDAR DATES & CHRONOLOGICAL STAMPS...'
  },
  phone: {
    label: 'PHONE',
    regexStr: '\\b(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b|\\b\\d{10}\\b',
    status: 'SWEEPING FOR TELEPHONE NUMBERS & CALL SIGNS...'
  },
  id: {
    label: 'SENSITIVE_ID',
    regexStr: '\\b(?:\\d{3}-\\d{2}-\\d{4}|\\d{4}[-\\s]\\d{4}[-\\s]\\d{4}[-\\s]\\d{4}|[A-Z]{2}\\d{6,8})\\b',
    status: 'SWEEPING FOR SENSITIVE IDENTIFIERS & RECORD KEYS...'
  }
};

function findRegexMatches(words, regexStr, entityLabel = '') {
  let regex;
  try {
    regex = new RegExp(regexStr, 'gi');
  } catch (err) {
    return { error: err.message, matches: [] };
  }

  const lines = groupWordsIntoLines(words);
  const foundMatches = [];

  lines.forEach((lineWords) => {
    let charOffset = 0;
    const wordMap = [];
    const parts = [];

    lineWords.forEach((w) => {
      const start = charOffset;
      const end = start + w.text.length;
      wordMap.push({ word: w, start, end });
      parts.push(w.text);
      charOffset = end + 1;
    });

    const lineStr = parts.join(' ');
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(lineStr)) !== null) {
      if (m[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      const mStart = m.index;
      const mEnd = mStart + m[0].length;

      const matchedWords = wordMap
        .filter(item => item.start < mEnd && item.end > mStart)
        .map(item => item.word);

      if (matchedWords.length > 0) {
        foundMatches.push({
          matchedWords,
          entityLabel: entityLabel || (activeEntityFilter ? activeEntityFilter.toUpperCase() : 'REGEX'),
          matchedText: m[0]
        });
      }
    }
  });

  return { error: null, matches: foundMatches };
}

function updateCrossDocumentHitCounts(query, isRegex) {
  if (loadedDocuments.length <= 1) return;

  loadedDocuments.forEach((doc, idx) => {
    if (idx === activeDocIndex) {
      doc.hitCount = activeMatches.length;
      return;
    }

    if (!doc.wordsData || doc.wordsData.length === 0) {
      doc.hitCount = 0;
      return;
    }

    if (isRegex) {
      const { matches } = findRegexMatches(doc.wordsData, query, activeEntityFilter);
      doc.hitCount = matches ? matches.length : 0;
    } else {
      const lineMatches = findContinuousLineMatches(doc.wordsData, query);
      const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      let count = lineMatches.length;
      if (tokens.length > 0) {
        for (let i = 0; i < doc.wordsData.length; i++) {
          const m = matchPhraseAt(doc.wordsData, i, tokens);
          if (m) {
            const tmWords = m.matchedWords;
            const isDup = lineMatches.some(lm => lm.matchedWords && lm.matchedWords.some(lw => tmWords.includes(lw)));
            if (!isDup) {
              count++;
            }
            if (tokens.length > 1) i = m.nextIndex - 1;
          }
        }
      }
      doc.hitCount = count;
    }
  });

  updateDocumentShelfUI();
}

function performSearch() {
  if (documentType === 'none') {
    setStatus('INGEST A DOCUMENT OR IMAGE FIRST BEFORE SEARCHING', 'error');
    return;
  }

  if (wordsData.length === 0) {
    setStatus('NO OPTICAL DATA INDEXED // CLICK "ANALYZE PAGE" TO RUN OCR', 'warning');
    return;
  }

  const rawQuery = searchInput.value.trim();
  if (!rawQuery) {
    setStatus('ENTER A TARGET KEYWORD, PHRASE, OR REGEX PATTERN', 'warning');
    return;
  }

  lastSearchQuery = rawQuery;
  activeMatches = [];

  if (isRegexMode) {
    const { error, matches } = findRegexMatches(wordsData, rawQuery, activeEntityFilter);
    if (error) {
      setStatus(`INVALID REGEX PATTERN // ${error.toUpperCase()}`, 'error');
      return;
    }
    activeMatches = matches;
  } else {
    // 1. Exact continuous line & phrase search (handles punctuation, dashes, full phrases)
    const lineMatches = findContinuousLineMatches(wordsData, rawQuery);

    // 2. Token-level search with OCR resilience & homoglyph normalization
    const searchTokens = rawQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const tokenMatches = [];
    if (searchTokens.length > 0) {
      for (let i = 0; i < wordsData.length; i++) {
        const match = matchPhraseAt(wordsData, i, searchTokens);

        if (match) {
          tokenMatches.push(match);
          if (searchTokens.length > 1) {
            i = match.nextIndex - 1;
          }
        }
      }
    }

    // Merge line matches and token matches, eliminating duplicate spans
    const combined = [...lineMatches];
    tokenMatches.forEach(tm => {
      const tmWords = tm.matchedWords;
      const isDup = combined.some(cm => {
        if (!cm.matchedWords || !tmWords) return false;
        return cm.matchedWords.some(cw => tmWords.includes(cw));
      });
      if (!isDup) {
        combined.push(tm);
      }
    });

    activeMatches = combined;
  }

  updateCrossDocumentHitCounts(rawQuery, isRegexMode);
  populateTargetsFeed(activeMatches);
  updateSidebarTelemetry();

  if (activeMatches.length === 0) {
    currentMatchIndex = -1;
    if (targetStepperBar) targetStepperBar.classList.add('hidden');
    redrawBaseDocument();
    setStatus(`TARGET_MISS // 0 MATCHES FOUND FOR "${rawQuery.toUpperCase()}"`, 'warning');
  } else {
    focusMatch(0, true);
    const modeLabel = isRegexMode ? (activeEntityFilter ? `${activeEntityFilter.toUpperCase()} SWEEP` : 'REGEX') : 'SEARCH';
    setStatus(`TARGET_ACQUIRED // ${activeMatches.length} ${modeLabel} MATCHES TRIANGULATED`, 'success');
  }
}

searchBtn.addEventListener('click', performSearch);

if (regexToggleBtn) {
  regexToggleBtn.addEventListener('click', () => {
    isRegexMode = !isRegexMode;
    regexToggleBtn.classList.toggle('active', isRegexMode);
    if (!isRegexMode) {
      entitySweepBtns.forEach(b => b.classList.remove('active'));
      activeEntityFilter = '';
    }
    if (searchInput.value.trim()) {
      performSearch();
    }
  });
}

if (entitySweepBtns) {
  entitySweepBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const entityKey = btn.getAttribute('data-entity');
      const config = ENTITY_PATTERNS[entityKey];
      if (!config) return;

      const wasActive = btn.classList.contains('active');
      entitySweepBtns.forEach(b => b.classList.remove('active'));

      if (wasActive) {
        activeEntityFilter = '';
        isRegexMode = false;
        if (regexToggleBtn) regexToggleBtn.classList.remove('active');
        searchInput.value = '';
        activeMatches = [];
        redrawBaseDocument();
        populateTargetsFeed([]);
        if (targetStepperBar) targetStepperBar.classList.add('hidden');
        setStatus('ENTITY SWEEP DISARMED // STANDBY', 'info');
        updateCrossDocumentHitCounts('', false);
        return;
      }

      btn.classList.add('active');
      activeEntityFilter = entityKey;
      isRegexMode = true;
      if (regexToggleBtn) regexToggleBtn.classList.add('active');
      searchInput.value = config.regexStr;

      setStatus(config.status, 'info');
      performSearch();
    });
  });
}

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const query = searchInput.value.trim();
    // If pressing Enter on the same query with active matches, cycle through matches!
    if (activeMatches.length > 0 && query.toLowerCase() === lastSearchQuery.toLowerCase()) {
      if (e.shiftKey) {
        focusMatch(currentMatchIndex - 1, true);
      } else {
        focusMatch(currentMatchIndex + 1, true);
      }
    } else {
      performSearch();
    }
  }
});

// Global Keyboard Navigation (When not typing in an input)
document.addEventListener('keydown', (e) => {
  const activeEl = document.activeElement;
  const isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

  if (!isInputActive) {
    if (e.key === 'n' || e.key === 'N') {
      if (activeMatches.length > 0) {
        e.preventDefault();
        focusMatch(currentMatchIndex + 1, true);
      }
    } else if (e.key === 'p' || e.key === 'P') {
      if (activeMatches.length > 0) {
        e.preventDefault();
        focusMatch(currentMatchIndex - 1, true);
      }
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      const nextScale = isZoomFit ? 1.25 : currentZoomScale + 0.25;
      applyZoom(nextScale, false);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      const nextScale = isZoomFit ? 0.75 : currentZoomScale - 0.25;
      applyZoom(nextScale, false);
    } else if (e.key === '0') {
      e.preventDefault();
      applyZoom(1.0, true);
    }
  }
});