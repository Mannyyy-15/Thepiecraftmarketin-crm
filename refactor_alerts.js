const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const appDir = path.join(__dirname, 'app');

walkDir(appDir, (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('alert(') && !content.includes('confirm(')) return;

  console.log(`Processing ${filePath}`);

  // 1. Add import
  if (!content.includes('useToast')) {
    const importStatement = `import { useToast } from "@/providers/ToastProvider";\n`;
    // insert after the last import, or at the top after "use client"
    if (content.includes('"use client";')) {
      content = content.replace('"use client";\n', `"use client";\n${importStatement}`);
    } else {
      content = importStatement + content;
    }
  }

  // 2. Add hook to the main component
  // We'll look for `export default function `
  const exportMatch = content.match(/export default function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/);
  if (exportMatch && !content.includes('const { toast, confirmDialog } = useToast();')) {
    const insertion = `\n  const { toast, confirmDialog } = useToast();\n`;
    content = content.replace(exportMatch[0], exportMatch[0] + insertion);
  }

  // 3. Replace alerts
  // Simple heuristic: if the alert message has "Error" or "Failed" or "Please", make it "error" or "info"
  content = content.replace(/alert\((.*?)\)/g, (match, p1) => {
    let type = '"info"';
    if (p1.toLowerCase().includes('error') || p1.toLowerCase().includes('fail') || p1.toLowerCase().includes('please')) {
      type = '"error"';
    } else if (p1.toLowerCase().includes('success')) {
      type = '"success"';
    }
    return `toast(${p1}, ${type})`;
  });

  // 4. Replace confirms
  content = content.replace(/confirm\((.*?)\)/g, `await confirmDialog($1)`);

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log("Done");
