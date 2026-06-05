// scripts/rebuild.js
const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../src/template.html');
const TOOLS_DIR = path.join(__dirname, '../src/tools');
const OUTPUT_DIR = path.join(__dirname, '../');

console.log("[Rebuild] Loading master template.html...");

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error("[Fatal Error] src/template.html is missing!");
  process.exit(1);
}

const templateHTML = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

if (!fs.existsSync(TOOLS_DIR)) {
  console.log("[Rebuild] Creating src/tools directory...");
  fs.mkdirSync(TOOLS_DIR, { recursive: true });
}

// Read all modular tool files
const toolFiles = fs.readdirSync(TOOLS_DIR).filter(file => file.endsWith('.html'));
console.log(`[Rebuild] Detected ${toolFiles.length} modular files to stitch.`);

toolFiles.forEach(file => {
  const toolFilePath = path.join(TOOLS_DIR, file);
  let toolHTML = fs.readFileSync(toolFilePath, 'utf-8');

  // Extract custom page title from a comment at the top of the file: <!-- TITLE: My Page Title -->
  const titleMatch = toolHTML.match(/<!-- TITLE:\s*(.*?)\s*-->/);
  const pageTitle = titleMatch ? titleMatch[1] : "Social & Utility Suite";

  // Inject content into the master template wrapper
  let compiledHTML = templateHTML
    .replace('{{CONTENT}}', toolHTML)
    .replace('<title>Social & Utility Suite</title>', `<title>${pageTitle}</title>`);

  // Write the completed file directly to the root folder (e.g. tools-student.html)
  const outputFileName = file.startsWith('index') ? 'index.html' : `tools-${file}`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  fs.writeFileSync(outputPath, compiledHTML, 'utf-8');
  console.log(`[Rebuild Success] Stitched and updated: ${outputFileName}`);
});

console.log("[Rebuild] All operations completed successfully.");
