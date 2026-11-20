import {cp,mkdir} from 'node:fs/promises';
await mkdir('.next/standalone/.next',{recursive:true});
await cp('public','.next/standalone/public',{recursive:true});
await cp('.next/static','.next/standalone/.next/static',{recursive:true});
if(process.platform==='win32')await cp('node_modules/@img/sharp-win32-x64/lib','.next/standalone/node_modules/@img/sharp-win32-x64/lib',{recursive:true});
console.log('Standalone assets prepared');
