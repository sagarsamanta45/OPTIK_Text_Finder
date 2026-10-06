const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Text Search API backend is operational',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Text Finder Application',
    version: '1.0.0',
    capabilities: [
      'Client-side OCR with Tesseract.js',
      'Canvas bounding-box text highlighting',
      'Extensible backend API'
    ]
  });
});

// Fallback: send index.html for unmatched non-API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(` Text Finder Server is running!`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Static Path: ${frontendPath}`);
  console.log(`========================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[!] Error: Port ${PORT} is already in use by another process.`);
    console.error(`[i] The server is likely already running at http://localhost:${PORT}`);
    console.error(`[i] To terminate other node instances, run: Stop-Process -Name node\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
