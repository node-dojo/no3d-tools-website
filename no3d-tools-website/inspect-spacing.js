// Quick script to check spacing
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
console.log('Checking HTML structure...');
console.log('Header is inside site-container:', html.includes('<div class="site-container">') && html.includes('<header class="site-header">'));
