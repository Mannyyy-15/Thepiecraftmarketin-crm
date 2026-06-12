const fs = require('fs');
let c = fs.readFileSync('app/employee/projects/[id]/page.tsx', 'utf8');

// Replace routing
c = c.replace(/\/admin\/projects/g, '/employee/projects');
c = c.replace(/\/admin\/clients/g, '/employee/projects'); // Fallback if they try to click client link

// Remove Delete button
c = c.replace(/<button onClick=\{handleDelete\}[\s\S]*?<\/button>/g, '');

// Remove Edit button
c = c.replace(/<Button size="sm" variant="outline" onClick=\{openEdit\}[\s\S]*?<\/Button>/g, '');

// Remove Export PDF button
c = c.replace(/<Button size="sm" variant="outline" onClick=\{printDocument\}[\s\S]*?<\/Button>/g, '');

// Remove KPI mini cards block
c = c.replace(/\{\/\* ── KPI mini cards ───────────────────────────────────────────────── \*\/\}[\s\S]*?\{\/\* ── Team & Workload ──────────────────────────────────────────────── \*\/\}/g, '{/* ── Team & Workload ──────────────────────────────────────────────── */}');

// Remove Invoice History block completely
c = c.replace(/\{\/\* ── Invoice History \(full width\) ─────────────────────────────────── \*\/\}[\s\S]*?<\/div>(\s*)$/m, '</div>\n');

// Additional precise cleanup of Invoice History
const invIndex = c.indexOf('{/* ── Invoice History');
if (invIndex !== -1) {
    const endBento = c.indexOf('</BentoCard>', invIndex);
    if (endBento !== -1) {
        c = c.substring(0, invIndex) + c.substring(endBento + '</BentoCard>'.length);
    }
}

fs.writeFileSync('app/employee/projects/[id]/page.tsx', c);
console.log("Cleanup complete!");
