import assert from 'node:assert/strict';
import { createPrintsPreviewServer } from './prints-preview-server.mjs';
import puppeteer from 'puppeteer';

const server = createPrintsPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage();
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const errors = [], assets = [];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().includes('/sketchbook/')) assets.push(request.url());});
  const cdp = await page.createCDPSession();
  function touch(type,points=[]) {
    return cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y}))});
  }
  async function productState() {
    return page.evaluate(() => ({
      href:location.href, scroll:scrollY, product:document.querySelector('.print-slide:not([inert])')?.dataset.product,
      carousel:document.querySelector('[data-print-carousel]')?.scrollLeft,
      detail:document.querySelector('[data-print-details]')?.open,
      detailScroll:document.querySelector('[data-print-details]')?.scrollTop,
      gallery:document.querySelector('[data-gallery]')?.scrollLeft,
      photoTop:document.querySelector('.print-slide:not([inert]) img, .landing-print-backdrop')?.getBoundingClientRect().top
    }));
  }
  const opened = () => page.waitForSelector('.print-sketchbook[open][data-ready=true]');
  const closed = () => page.waitForFunction(()=>!document.querySelector('.print-sketchbook').open);
  async function lift() {
    const before = await productState();
    await touch('touchStart',[[1,190,800]]);
    await touch('touchMove',[[1,190,752]]);
    assert.equal(await page.$eval('.print-sketchbook',el=>el.open),true);
    const start = await page.$eval('.book-sheet',el=>new DOMMatrix(getComputedStyle(el).transform).m42);
    await touch('touchMove',[[1,190,646]]);
    const end = await page.$eval('.book-sheet',el=>new DOMMatrix(getComputedStyle(el).transform).m42);
    assert.ok(Math.abs(start-end-106)<2,'only the book tracks the finger');
    assert.deepEqual(await productState(),before,'product stays fixed during the pull');
    await touch('touchEnd');
    await opened();
    await page.waitForFunction(()=>Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('.book-sheet')).transform).m42)<1);
    return before;
  }
  async function lower(before) {
    await touch('touchStart',[[1,190,360]]);
    await touch('touchMove',[[1,193,430]]);
    await touch('touchMove',[[1,195,540]]);
    await touch('touchEnd');
    await closed();
    assert.deepEqual(await productState(),before,'same URL, product, gallery and scroll after lowering');
  }
  await page.goto(origin+'/v3/prints/?product=spike-planter-01',{waitUntil:'networkidle0'});
  assert.ok(!assets.some(url=>/manifest|poses|textures|three-renderer/.test(url)),'lazy 3D load');
  await touch('touchStart',[[1,190,800]]);
  await touch('touchMove',[[1,190,769]]);
  await touch('touchEnd');
  await closed();
  const catalog = await lift();
  assert.equal(await page.$eval('.print-sketchbook',el=>el.dataset.book),'spike-planter');
  assert.ok(assets.some(url=>url.endsWith('/books/spike-planter/v1/manifest.json.gz')));
  assert.ok(!assets.some(url=>url.endsWith('/sketchbook/manifest.json.gz')),'Spike does not load the default geometry');
  const pixels = () => page.$eval('.book-sheet canvas',canvas=>{
    const gl=canvas.getContext('webgl2'),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    const data=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,data);
    let opaque=0,transparent=0,signature=0;
    for(let i=0;i<data.length;i+=20){
      if(data[i+3]===255)opaque++;
      if(data[i+3]===0)transparent++;
      signature=(Math.imul(signature,31)+data[i]+data[i+3])|0;
    }
    return {opaque,transparent,signature,alpha:gl.getContextAttributes().alpha};
  });
  const neutral=await pixels();
  assert.ok(neutral.alpha && neutral.opaque>1000 && neutral.transparent>1000,'book has opaque ink and transparent surround');
  assert.equal(await page.$eval('.print-sketchbook',el=>getComputedStyle(el,'::backdrop').backgroundColor),'rgba(0, 0, 0, 0)');
  await page.screenshot({path:'/tmp/no3d-prints-sketchbook-mobile.png'});
  await touch('touchStart',[[1,270,390]]);
  await touch('touchMove',[[1,100,393]]);
  await touch('touchEnd');
  await page.waitForNetworkIdle();
  assert.notEqual((await pixels()).signature,neutral.signature,'horizontal drag turns the book');
  await touch('touchStart',[[1,110,350],[2,240,350]]);
  await touch('touchMove',[[1,70,490],[2,310,495]]);
  await touch('touchEnd');
  assert.ok(await page.$eval('.print-sketchbook',el=>el.open),'two-finger downward pan stays in the book');
  await lower(catalog);
  await page.click('.print-hotspot[data-details="spike-planter-01"]');
  await page.waitForSelector('.print-details[open]');
  await page.$eval('.print-details', el=>Promise.all(el.getAnimations().map(a=>a.finished)));
  await page.focus('[data-gallery]');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>document.querySelector('[data-gallery-position]').textContent.startsWith('2 /'));
  await page.$eval('.print-details',el=>el.scrollTo({top:220,behavior:'instant'}));
  await page.waitForNetworkIdle();
  const details=await lift();
  assert.equal(await page.$eval('.print-sketchbook',el=>el.dataset.book),'spike-planter');
  await lower(details);
  await page.goto(origin+'/p/mace-and-chain',{waitUntil:'networkidle0'});
  await page.evaluate(()=>scrollTo({top:420,behavior:'instant'}));
  const landing=await lift();
  assert.equal(await page.$eval('.print-sketchbook',el=>el.dataset.book),'default');
  await lower(landing);
  await page.goto(origin+'/v3/prints/',{waitUntil:'networkidle0'});
  await page.mouse.move(225,320);
  await page.mouse.wheel({deltaY:180});await opened();
  await page.waitForNetworkIdle();
  await page.mouse.wheel({deltaY:-180});await closed();
  await page.focus('body > .book-access');
  await page.keyboard.press('Enter');await opened();
  await page.keyboard.press('Escape');await closed();
  assert.deepEqual(errors,[]);
  console.log('Passed: bottom pull, canceled lift, alpha composition, horizontal flip, pinch isolation, nested product details, standalone print, return state, wheel and keyboard.');
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
