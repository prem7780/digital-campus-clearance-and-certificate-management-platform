const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')
const fs=require('fs'),path=require('path')
const folder=path.join(__dirname,'..','frontend','src')
let errors=0,checked=0
for(const file of fs.readdirSync(folder).filter(f=>/\.(jsx|js)$/.test(f))){
 const code=fs.readFileSync(path.join(folder,file),'utf8')
 const ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,file.endsWith('.jsx')?ts.ScriptKind.JSX:ts.ScriptKind.JS)
 checked++
 for(const err of ast.parseDiagnostics){errors++;const pos=ast.getLineAndCharacterOfPosition(err.start||0);console.error(`${file}:${pos.line+1}:${pos.character+1} ${ts.flattenDiagnosticMessageText(err.messageText,' ')}`)}
}
if(errors)process.exit(1)
console.log(`PASS: parsed ${checked} JS / JSX files (syntax only, dependencies not resolved)`)
