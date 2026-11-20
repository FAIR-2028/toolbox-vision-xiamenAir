import {chromium} from 'playwright-core';
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{const p=await b.newPage();await p.goto('https://hhz.kk0808.com/apidoc#model/tt-6.1-sol',{waitUntil:'domcontentloaded',timeout:45000});await p.waitForTimeout(6000);console.log((await p.locator('body').innerText()).slice(0,18000))}finally{await b.close()}
