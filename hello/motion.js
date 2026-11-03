/* Very slow procedural color field: 3–5 minute primary periods, perceptible gentle travel, no loop seam. */
(() => {
  'use strict';
  const canvas = document.getElementById('flow');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, lastTime = null, elapsed = 0, width = 0, height = 0;
  const fields = [
    { x:.14, y:.55, r:.73, rgb:'245,178,119', phase:1.3, rate:.035 },
    { x:.84, y:.66, r:.64, rgb:'223,97,14', phase:3.8, rate:.027 },
    { x:.48, y:.97, r:.78, rgb:'235,111,17', phase:5.1, rate:.031 },
    { x:.65, y:.14, r:.70, rgb:'254,248,239', phase:2.1, rate:.023 },
    { x:.06, y:.03, r:.65, rgb:'254,248,239', phase:4.3, rate:.020 }
  ];
  function resize() {
    // Modest backing resolution keeps motion light on mobile screens.
    const rect = canvas.getBoundingClientRect();
    const viewW = Math.max(innerWidth, rect.width || 0);
    const viewH = Math.max(innerHeight, rect.height || 0);
    const scale = Math.min(1, 960 / Math.max(viewW, viewH));
    width = canvas.width = Math.max(1, Math.round(viewW * scale));
    height = canvas.height = Math.max(1, Math.round(viewH * scale));
    draw(elapsed);
  }
  function draw(t) {
    const base = context.createLinearGradient(0,0,0,height);
    base.addColorStop(0,'#fef8ef');base.addColorStop(.42,'#edc5a0');base.addColorStop(1,'#e86d13');
    context.fillStyle=base;context.fillRect(0,0,width,height);
    const maxDim=Math.max(width,height);
    for(const f of fields){
      const a=t*f.rate+f.phase;
      const x=width*(f.x+.19*Math.sin(a)+.065*Math.sin(a*Math.SQRT2+.8));
      const y=height*(f.y+.16*Math.cos(a*.83)+.055*Math.sin(a*Math.sqrt(3)));
      const radius=maxDim*f.r*(1+.065*Math.sin(a*.71));
      const gradient=context.createRadialGradient(x,y,0,x,y,radius);
      gradient.addColorStop(0,`rgba(${f.rgb},.84)`);gradient.addColorStop(.45,`rgba(${f.rgb},.45)`);gradient.addColorStop(1,`rgba(${f.rgb},0)`);
      context.fillStyle=gradient;context.fillRect(0,0,width,height);
    }
    const topEdgeH=Math.max(1,height*.16);
    const topFeather=context.createLinearGradient(0,0,0,topEdgeH);
    topFeather.addColorStop(0,'rgba(254,248,239,1)');
    topFeather.addColorStop(.25,'rgba(254,248,239,.72)');
    topFeather.addColorStop(.55,'rgba(254,248,239,.32)');
    topFeather.addColorStop(.8,'rgba(254,248,239,.08)');
    topFeather.addColorStop(1,'rgba(254,248,239,0)');
    context.fillStyle=topFeather;context.fillRect(0,0,width,topEdgeH);
    const botStart=Math.floor(height*.86);
    const botFeather=context.createLinearGradient(0,botStart,0,height);
    botFeather.addColorStop(0,'rgba(232,109,19,0)');
    botFeather.addColorStop(.2,'rgba(232,109,19,.08)');
    botFeather.addColorStop(.45,'rgba(232,109,19,.32)');
    botFeather.addColorStop(.75,'rgba(232,109,19,.72)');
    botFeather.addColorStop(1,'rgba(232,109,19,1)');
    context.fillStyle=botFeather;context.fillRect(0,botStart,width,height-botStart);
  }
  function tick(now){
    if(lastTime!==null)elapsed+=Math.min(now-lastTime,64)/1000;
    lastTime=now;draw(elapsed);frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);lastTime=null;
    if(!document.hidden&&!preference.matches)frame=requestAnimationFrame(tick);
    else draw(elapsed);
  }
  window.addEventListener('resize',resize,{passive:true});
  if(window.visualViewport)window.visualViewport.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',sync);
  preference.addEventListener('change',sync);
  resize();sync();
})();
