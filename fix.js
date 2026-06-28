const fs = require('fs');
let c = fs.readFileSync('components/MobileChat.tsx', 'utf-8');
c = c.replace(/\\\$/g, '$');
fs.writeFileSync('components/MobileChat.tsx', c);
