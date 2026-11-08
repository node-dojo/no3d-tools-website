import assert from 'node:assert/strict';
import { createPrintsPreviewServer } from './prints-preview-server.mjs';
import puppeteer from 'puppeteer';

// The same read-only interactions can verify a hosted release before promotion.
const server = process.env.PRINTS_TEST_ORIGIN ? null : createPrintsPreviewServer();
if (server) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = process.env.PRINTS_TEST_ORIGIN || 'http://127.0.0.1:' + server.address().port;
const browser = await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
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
  const opened = async () => {
    await page.waitForSelector('.print-sketchbook[open][data-ready=true]');
    await page.waitForFunction(()=>Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('.book-sheet')).transform).m42)<1);
  };
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
  // A cold mobile load still shows the closed-cover entrance immediately.
  await page.setRequestInterception(true);
  let heldManifest;
  const hold = request => {
    if (request.url().endsWith('/books/spike-planter/v1/manifest.json.gz')) heldManifest = request;
    else void request.continue();
  };
  page.on('request',hold);
  await page.goto(origin+'/v3/prints/?product=spike-planter-01',{waitUntil:'networkidle2'});
  await page.waitForFunction(()=>document.querySelector('.print-slide:not([inert]) img')?.complete);
  const warmDeadline=Date.now()+5000;while(!heldManifest&&Date.now()<warmDeadline)await new Promise(resolve=>setTimeout(resolve,20));
  assert.ok(heldManifest,'selected book starts downloading before activation');
  assert.ok(!assets.some(url=>/three-renderer|three.module/.test(url)),'GPU renderer stays lazy');
  await page.click('#print-info-planter [data-sketchbook-open]');
  await page.waitForFunction(()=>document.querySelector('.book-sheet').getAnimations().length>0);
  const arrival = await page.$eval('.book-sheet', sheet => {
    const animation=sheet.getAnimations()[0];animation.pause();
    const duration=animation.effect.getTiming().duration;
    const offsets=[0,duration/3,duration*2/3,duration].map(time=>{
      animation.currentTime=time;
      return new DOMMatrix(getComputedStyle(sheet).transform).m42;
    });
    return {duration,offsets,poster:sheet.querySelector('img').src,posterVisible:getComputedStyle(sheet.querySelector('img')).visibility,ready:sheet.closest('dialog').dataset.ready};
  });
  assert.ok(arrival.offsets[0]>=844,'entire sheet starts below the viewport');
  assert.ok(arrival.duration>=600 && arrival.duration<=1000,'deliberate, brief entrance');
  assert.ok(arrival.offsets[1]>arrival.offsets[2] && arrival.offsets[2]>0);
  assert.ok(arrival.offsets[0]-arrival.offsets[1]>arrival.offsets[1]-arrival.offsets[2],'arrival decelerates');
  assert.ok(Math.abs(arrival.offsets[3])<1,'arrival settles at the resting position');
  assert.ok(arrival.poster.endsWith('/closed.webp') && arrival.posterVisible==='visible' && arrival.ready==='false','closed poster is visible while 3D is pending');
  assert.ok(heldManifest,'3D request is held for the cold-load check');
  await page.waitForSelector('.book-loading:not([hidden])');
  assert.equal(await page.$eval('.book-stage',el=>el.getAttribute('aria-busy')),'true');
  assert.equal(assets.filter(url=>url.endsWith('/books/spike-planter/v1/manifest.json.gz')).length,1,'open shares pending warm request');
  await heldManifest.continue();
  page.off('request',hold);
  await page.setRequestInterception(false);
  await opened();
  assert.equal(await page.$eval('.book-loading',el=>el.hidden),true,'loading dots disappear when interactive');
  assert.equal(await page.$eval('.book-stage',el=>el.getAttribute('aria-busy')),'false');
  await page.click('.book-close');await closed();
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
    let opaque=0,transparent=0,signature=0,left=w,right=0,top=h,bottom=0;
    for(let i=0;i<data.length;i+=20){
      if(data[i+3]===255)opaque++;
      if(data[i+3]===0)transparent++;
      signature=(Math.imul(signature,31)+data[i]+data[i+3])|0;
      if(data[i+3]>200){const x=(i/4)%w,y=h-1-Math.floor(i/4/w);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    }
    return {opaque,transparent,signature,left,right,top,bottom,width:w,height:h,alpha:gl.getContextAttributes().alpha};
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
  // The visible entry opens the selected book without changing catalog state.
  const entry = '#print-info-planter [data-sketchbook-open]';
  await page.click(entry);
  await opened();
  assert.equal(await page.$eval('.print-sketchbook', el=>el.dataset.book), 'spike-planter');
  assert.deepEqual(await productState(), catalog);
  const closedCover=await pixels();
  assert.ok((closedCover.right-closedCover.left)/(closedCover.bottom-closedCover.top)<.85,'icon reopens on a closed portrait cover after turning pages');
  assert.ok(Math.abs((closedCover.left+closedCover.right)/2-closedCover.width/2)<32 && Math.abs((closedCover.top+closedCover.bottom)/2-closedCover.height/2)<32,'closed cover rests in the center');
  await page.screenshot({path:'/tmp/no3d-prints-closed-arrival.png'});
  await page.click('.book-close');
  await closed();
  assert.equal(await page.$eval(entry, el=>el===document.activeElement), true, 'Close returns focus to the book control');
  // A small vertical drag springs back; a committed upward drag dismisses too.
  await page.click(entry);
  await opened();
  await touch('touchStart',[[1,190,430]]);
  await touch('touchMove',[[1,191,405]]);
  await touch('touchEnd');
  await page.waitForFunction(()=>Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('.book-sheet')).transform).m42)<1);
  assert.equal(await page.$eval('.print-sketchbook', el=>el.open), true);
  await touch('touchStart',[[1,190,430]]);
  await touch('touchMove',[[1,192,250]]);
  await touch('touchEnd');
  await closed();
  assert.deepEqual(await productState(), catalog);
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
  // A zoomed mouse drag remains a pan until the book is moved off an edge.
  await page.setViewport({width:1100,height:800,isMobile:false,hasTouch:false});
  await page.click('#print-info-mace [data-sketchbook-open]');
  await opened();
  await page.keyboard.press('+');
  await page.waitForNetworkIdle();
  await page.mouse.move(150,350);
  await page.mouse.down();
  await page.mouse.move(210,370,{steps:8});
  await page.mouse.up();
  assert.equal(await page.$eval('.print-sketchbook',el=>el.open),true,'ordinary zoomed pan does not dismiss');
  await page.mouse.move(100,370);
  await page.mouse.down();
  await page.mouse.move(1090,370,{steps:20});
  await page.mouse.up();
  await closed();
  await page.click('#print-info-mace [data-sketchbook-open]');
  await opened();
  await page.waitForNetworkIdle();
  assert.ok((await pixels()).opaque>1000,'reopening after dismissal recenters the book');
  await page.click('.book-close');
  await closed();
  assert.deepEqual(errors,[]);
  console.log('Passed: eased offscreen entrance during cold load, closed centered cover on reopen, visible book control, corner close and focus, upward/downward dismissal, zoomed offscreen pan, bottom pull, canceled lift, alpha composition, horizontal flip, pinch isolation, nested product details, standalone print, return state, wheel and keyboard.');
} finally {
  await browser.close();
  if (server) await new Promise(resolve=>server.close(resolve));
}
