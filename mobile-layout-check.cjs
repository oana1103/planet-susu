const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.SUSU_URL || 'https://oana1103.github.io/planet-susu/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'assets/mobile.css'),'utf8')});
  await page.evaluate(()=>{musicPanel.classList.remove('open');musicToggle.parentElement.dataset.notice='轻点 ♪ 开启音乐';});
  await Promise.race([page.evaluate(()=>document.fonts.ready),new Promise(r=>setTimeout(r,6000))]);
  const results=[];
  for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024],[844,390]]){
    await page.setViewportSize({width,height});
    for(const name of ['cover','welcome','letter','menu','fourcut','memories','love','epilogue']){
      await page.evaluate(n=>{go(n);if(n==='letter'||n==='welcome')skipTyping?.();},name);
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const metrics=await page.evaluate(()=>{
        const rect=el=>{const b=el.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}};
        const visible=[...document.querySelector('.screen.active').querySelectorAll('button,h2,h3')].filter(e=>!e.closest('.outfit-list')&&e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden');
        return {docWidth:document.documentElement.scrollWidth,viewport:innerWidth,overflow:visible.filter(e=>{const b=e.getBoundingClientRect();return b.left< -2||b.right>innerWidth+2}).map(e=>e.id||e.className),shutter:document.querySelector('.screen.active #shoot-fourcut')?rect(document.querySelector('#shoot-fourcut')):null};
      });
      results.push({size:`${width}x${height}`,screen:name,...metrics});
      if(width===390)await page.screenshot({path:`/tmp/susu-mobile-${name}.png`,fullPage:true});
      if(name==='memories'){
        await page.evaluate(()=>openMemory(document.querySelector('button.star[data-memory]')));
        const modal=await page.locator('#memory-modal').boundingBox();
        results.push({size:`${width}x${height}`,screen:'video',box:modal,fits:modal.x>=0&&modal.y>=0&&modal.x+modal.width<=width+1&&modal.y+modal.height<=height+1});
        if(width===390||width===844)await page.screenshot({path:`/tmp/susu-mobile-video-${width}.png`});
        await page.evaluate(()=>closeMemory());
      }
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>go('fourcut'));
  await page.locator('#shoot-fourcut').click();
  await page.waitForSelector('.camera-scene.has-photo',{timeout:25000});
  await page.waitForFunction(()=>!shooting);
  await page.screenshot({path:'/tmp/susu-mobile-photo.png'});
  await page.evaluate(()=>closePhoto());
  for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{go('love');selectLoveScene('aquarium',true);startLoveDate();cancelLoveTimers();loveLastChoice=0;renderLoveEnding()});
    await page.locator('.love-ending-illustration').evaluate(image=>image.decode());
    await page.evaluate(async()=>{const image=new Image();image.src=loveScenes.aquarium.bg;await image.decode()});
    await page.screenshot({path:`/tmp/susu-mobile-ending-${width}.png`,fullPage:true});
    if(width<1000){await page.locator('.love-restart').scrollIntoViewIfNeeded();const b=await page.locator('.love-restart').boundingBox();if(b.y<0||b.y+b.height>height+1)errors.push('Ending restart clipped at '+width)}
    results.push({size:`${width}x${height}`,screen:'ending',docWidth:await page.evaluate(()=>document.documentElement.scrollWidth),viewport:width});
  }
  const violations=results.filter(r=>r.docWidth>r.viewport||r.overflow?.length||r.fits===false);
  console.log(JSON.stringify({errors,checks:results.length,violations,shutters:results.filter(r=>r.shutter).map(r=>({size:r.size,box:r.shutter}))},null,2));
  if(errors.length||violations.length)process.exitCode=1;
  await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1});
