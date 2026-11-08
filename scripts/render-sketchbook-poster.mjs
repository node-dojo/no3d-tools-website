// Render the actual web opening pose, with alpha, so the loading poster matches.
// node scripts/render-sketchbook-poster.mjs v3/assets/sketchbook/books/NAME/v1 [PROOF_DIR]
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import {createPrintsPreviewServer} from './prints-preview-server.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const [folder,proof]=process.argv.slice(2);
assert.ok(folder,'Pass the versioned asset directory.');
const relative=path.relative(root,path.resolve(folder));
assert.ok(relative.startsWith('v3/assets/sketchbook/books/'));
const temp=await fs.mkdtemp(path.join(tmpdir(),'sketchbook-poster-'));
if(proof) await fs.mkdir(proof,{recursive:true});
const server=createPrintsPreviewServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage();
  await page.setViewport({width:1024,height:1024,deviceScaleFactor:1});
  await page.goto(`http://127.0.0.1:${server.address().port}/v3/prints/`);
  const stops=await page.evaluate(async manifest=>{
    const {createThreeRenderer}=await import('/v3/js/sketchbook/three-renderer.js?v=product-books-1');
    const canvas=document.createElement('canvas');document.body.replaceChildren(canvas);
    window.proofBook=await createThreeRenderer(canvas,{three:{manifest}},{onError:error=>{throw error;}});
    proofBook.resize(1024,1024,1);proofBook.setActive(true);await proofBook.ready;
    return proofBook.navigation.pageStops;
  },'/'+relative+'/manifest.json.gz');
  const save=async filename=>{
    const png=await page.$eval('canvas',canvas=>canvas.toDataURL('image/png').split(',')[1]);
    await fs.writeFile(filename,Buffer.from(png,'base64'));
  };
  await save(path.join(temp,'open.png'));
  execFileSync('cwebp',['-quiet','-q','94','-alpha_q','100',path.join(temp,'open.png'),'-o',path.join(folder,'open.webp')]);
  if(proof) {
    await fs.copyFile(path.join(temp,'open.png'),path.join(proof,'open.png'));
    for(const [i,progress] of stops.entries()){
      await page.evaluate(progress=>proofBook.setState({progress}),progress);
      await page.waitForFunction(progress=>proofBook.getStats().displayedProgress===progress,{},progress);
      await save(path.join(proof,`stop-${String(i).padStart(2,'0')}.png`));
    }
  }
  console.log(JSON.stringify(await page.evaluate(()=>proofBook.getStats())));
  await page.evaluate(()=>proofBook.destroy());
} finally {
  await browser.close();await new Promise(resolve=>server.close(resolve));
  await fs.rm(temp,{recursive:true});
}
