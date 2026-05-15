const fs = require('fs');

function patchFile(file) {
    let content = fs.readFileSync(file, 'utf8');

    content = content.replace(/event\.title\.replace/g, '(event.title || "").replace');
    content = content.replace(/title\.replace/g, '(title || "").replace');
    
    // Also fix any potential date replace issues
    content = content.replace(/new Date\(event\.date\)\.toLocaleDateString\('en-GB'\)\.replace\(\/\\\\\/\\\/g, '-'\)/g, 'event.date ? new Date(event.date).toLocaleDateString("en-GB").replace(/\\//g, "-") : ""');

    fs.writeFileSync(file, content);
}

patchFile('./components/EventDetail.tsx');
patchFile('./components/FloorPlanEditor.tsx');
patchFile('./components/FlyerGenerator.tsx');
patchFile('./components/EventCard.tsx');
console.log('Fixed replace!');
