import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3002/inspection.html');
 await page.waitForFunction(()=>document.querySelector('#observedMetric')?.textContent==='52'&&!document.querySelector('#reanalyzeBtn').disabled);
 for(const [id,total,missing] of [['complete','53','0'],['socket','52','1'],['bits','52','1'],['extension','52','1']]){
  await page.locator('[data-sample="'+id+'"]').click();
  await page.waitForFunction(({total,missing})=>document.querySelector('#observedMetric').textContent===total&&document.querySelector('#missingMetric').textContent===missing&&!document.querySelector('#reanalyzeBtn').disabled,{total,missing});
  assert.ok(await page.locator('.sample-card.active').getAttribute('data-sample')===id);
  console.log('PASS scenario '+id);
 }
 await page.locator('#overlaySwitch').click();assert.equal(await page.locator('.bbox').count(),0);
 await page.locator('#overlaySwitch').click();assert.ok(await page.locator('.bbox').count()>0);console.log('PASS overlay toggle');
 await page.locator('#fileInput').setInputFiles('public/samples/complete_reference.jpg');
 await page.waitForFunction(()=>document.querySelector('#observedMetric').textContent==='—');
 assert.equal(await page.locator('.bbox').count(),0);assert.equal(await page.locator('#verdictCount').innerText(),'待分析');console.log('PASS upload does not fabricate results');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));console.log('PASS mobile horizontal layout');
 await page.locator('[data-sample="socket"]').click();await page.waitForFunction(()=>document.querySelector('#observedMetric').textContent==='52'&&!document.querySelector('#reanalyzeBtn').disabled);
 await page.setViewportSize({width:1440,height:1050});
 await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('#toast').classList.remove('show')});await page.waitForTimeout(200);
 await page.screenshot({path:'C:/Users/dell/Documents/Codex/2026-11-20/codex-pi-magpie-herdr-docker-codex/outputs/reference-workbench.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript errors');
}finally{await browser.close()}

