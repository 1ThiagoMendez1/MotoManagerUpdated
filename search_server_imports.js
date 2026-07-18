const fs = require('fs');
const path = require('path');

function search(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            search(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('lib/supabase/server') || content.includes('next/headers')) {
                console.log('FOUND:', fullPath);
            }
        }
    }
}

search('c:\\MIVRA PROYECTS\\Motomanager\\MotoManagerUpdated-1.2.0\\src');
