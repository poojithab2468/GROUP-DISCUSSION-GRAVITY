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
        } else { 
            results.push(file);
        }
    });
    return results;
}

const dir = path.join(__dirname, 'app', '(tabs)', '(rooms)');
let files = walk(dir);
files.push(path.join(__dirname, 'app', '(tabs)', '(home)', 'index.tsx'));

files.forEach(file => {
    if (!file.endsWith('.tsx')) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace Socket Context imports
    content = content.replace(/\.\.\/\.\.\/context\/SocketContext/g, '@/context/SocketContext');
    content = content.replace(/\.\.\/\.\.\/\.\.\/context\/SocketContext/g, '@/context/SocketContext');
    content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/context\/SocketContext/g, '@/context/SocketContext');
    
    // Replace Push routes
    content = content.replace(/\/\(rooms\)\//g, '/(tabs)/(rooms)/');
    content = content.replace(/router\.push\('\/\(rooms\)'\)/g, "router.push('/(tabs)/(rooms)')");
    
    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
});
