const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
let changed = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Dialog contents
    content = content.replace(/bg-white text-black/g, 'bg-card text-card-foreground');
    // Inputs, Selects, Textareas
    content = content.replace(/bg-white text-black border-black\/30/g, 'bg-background text-foreground border-input');
    content = content.replace(/bg-white border-black\/30/g, 'bg-background border-input');
    // Random bg-white in components
    content = content.replace(/className="([^"]*)bg-white([^"]*)"/g, 'className="$1bg-card$2"');
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changed++;
        console.log('Updated:', file);
    }
});

console.log(`Updated ${changed} files.`);
