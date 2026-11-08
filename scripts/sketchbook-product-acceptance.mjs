import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import {createPrintsPreviewServer} from './prints-preview-server.mjs';

const server=createPrintsPreviewServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:900});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const errors=[],manifests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().endsWith('/manifest.json.gz'))manifests.push(request.url());});
  const open=()=>page.$eval('body > .book-access',el=>el.click());
  const ready=id=>page.waitForSelector(`.print-sketchbook[open][data-ready=true][data-book=${id}]`);
  async function close(){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.print-sketchbook').open);}
  async function select(handle){
    await page.$eval(`[data-go-product="${handle}"]`,el=>el.click());
    await page.waitForFunction(handle=>document.querySelector('.print-slide:not([inert])').dataset.product===handle,{},handle);
  }
  await page.goto(origin+'/v3/prints/?product=spike-planter-01',{waitUntil:'networkidle0'});
  await open();await ready('spike-planter');
  const opening=await page.$eval('.book-sheet canvas',el=>el.toDataURL());
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  await close();await select('mace-and-chain');await open();await ready('default');
  assert.ok((await page.$eval('.book-sheet img',el=>el.src)).endsWith('/sketchbook/closed.webp'));
  await close();await select('spike-planter-01');await open();await ready('spike-planter');
  assert.equal(await page.$eval('.book-sheet canvas',el=>el.toDataURL()),opening,'returning to a different book resets its page and zoom');
  assert.ok((await page.$eval('.book-sheet img',el=>el.src)).endsWith('/books/spike-planter/v1/closed.webp'));
  assert.ok(await page.$eval('.book-sheet',el=>parseFloat(getComputedStyle(el).transitionDuration)<.001),'reduced motion skips the slide');
  assert.equal(manifests.filter(url=>url.endsWith('/books/spike-planter/v1/manifest.json.gz')).length,2);
  assert.equal(manifests.filter(url=>url.endsWith('/sketchbook/manifest.json.gz')).length,1);
  await close();
  await page.goto(origin+'/p/spike-planter-01',{waitUntil:'networkidle0'});
  await open();await ready('spike-planter');await close();

  // Hold the old request across a product switch, then let it finish late.
  await page.setRequestInterception(true);
  let held,mode='hold';
  page.on('request',request=>{
    if(request.url().endsWith('/books/spike-planter/v1/manifest.json.gz') && mode==='hold'){held=request;return;}
    if(request.url().endsWith('/books/spike-planter/v1/manifest.json.gz') && mode==='fail'){
      mode='normal';void request.respond({status:503,body:'fixture'});return;
    }
    void request.continue();
  });
  await page.goto(origin+'/v3/prints/?product=spike-planter-01',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('body > .book-access');
  await open();await page.waitForSelector('.print-sketchbook[open][data-ready=false]');
  const deadline=Date.now()+5000;while(!held&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
  assert.ok(held,'old manifest request is pending');
  await close();await select('mace-and-chain');await open();await ready('default');
  mode='normal';await held.continue().catch(()=>{});
  await page.waitForNetworkIdle();
  assert.equal(await page.$eval('.print-sketchbook',el=>el.dataset.book),'default');
  assert.equal(await page.$eval('.book-status',el=>el.textContent),'');
  await close();await select('spike-planter-01');mode='fail';await open();
  await page.waitForSelector('.book-status button');
  await page.click('.book-status button');await ready('spike-planter');
  assert.equal(await page.$eval('.book-status',el=>el.textContent),'');
  assert.deepEqual(errors,[]);
  console.log('Passed: product switching, fresh opening state, per-product posters, standalone Spike, stale-load cancellation, failed-load retry.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
