import fs from 'node:fs'
const required=['src/main.jsx','src/App.jsx','src/Student.jsx','src/Staff.jsx','src/Principal.jsx','src/Admin.jsx','src/api.js','src/index.css']
for(const path of required){if(!fs.existsSync(path))throw Error(`Missing ${path}`)}
console.log(`Frontend source check: ${required.length} required files exist`)
