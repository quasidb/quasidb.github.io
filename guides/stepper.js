/* QDB Guides: a small step-through animation player shared by the guide pages.
   Stepper(host, {
     id, title, sub,                 // header text
     intro,                          // caption before step 1 (HTML)
     steps:[{name, cap, len}],       // cap is HTML or fn(ctx) -> HTML; len = animation length in "beats"
     draw(t, box) -> {svg, below},   // t runs 0..steps.length; below = optional HTML under the chart
     legend, controls,               // optional HTML blocks
     beat: ms per beat (default 330), onReset()
   })
   Path(past, steps) turns a past series plus each step's path into a value-at-time helper. */
(function(){
  var REDUCED=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function track(n){try{window.goatcounter&&goatcounter.count&&goatcounter.count({path:n,title:n,event:true})}catch(e){}}
  function ease(f){return f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2}

  function Path(past,steps){
    var pts=past.slice(), start=[];
    steps.forEach(function(s){start.push(pts.length-1);pts=pts.concat(s.path)});
    var N=steps.length;
    function at(t){
      var i=Math.min(Math.floor(t),N-1), f=t-i; if(t>=N){i=N-1;f=1} if(t<=0){i=0;f=0}
      var idx=start[i]+f*steps[i].path.length, fi=Math.floor(idx), fr=idx-fi, h=pts.slice(0,fi+1);
      if(fr>1e-6&&fi+1<pts.length){var a=pts[fi],b=pts[fi+1];h.push(Array.isArray(a)?a.map(function(v,k){return v+(b[k]-v)*fr}):a+(b-a)*fr)}
      return {hist:h,step:i,f:f,e:ease(f)};
    }
    return {pts:pts,total:pts.length,k0:past.length-1,at:at};
  }

  function Stepper(host,c){
    var N=c.steps.length;
    host.innerHTML='<div class="scene"><div class="sc-head"><b>'+esc(c.title||"")+'</b><span>'+esc(c.sub||"")+'</span></div>'+
      (c.controls||"")+'<div class="chartbox"></div><div class="below"></div>'+(c.legend||"")+
      '<div class="cap" aria-live="polite"><span class="sn"></span><p></p></div>'+
      '<div class="sc-ctl"><button type="button" class="btn" data-a="back">◀ Back</button><button type="button" class="btn primary" data-a="play"></button><span class="dots" aria-hidden="true">'+
      c.steps.map(function(){return "<i></i>"}).join("")+'</span></div></div>';
    var box=host.querySelector(".chartbox"), below=host.querySelector(".below"), sn=host.querySelector(".sn"), cp=host.querySelector(".cap p"),
        bBack=host.querySelector('[data-a="back"]'), bPlay=host.querySelector('[data-a="play"]'), dots=host.querySelectorAll(".dots i");
    var t=0, busy=false, api={};
    function render(){
      var r=c.draw(t,box); box.innerHTML=r.svg; below.innerHTML=r.below||"";
      var k=Math.ceil(t-1e-6), st=c.steps[k-1];
      sn.textContent=k===0?"Setting the scene":"Step "+k+" of "+N+(st.name?" · "+st.name:"");
      var cap=k===0?c.intro:st.cap; cp.innerHTML=typeof cap==="function"?cap(api):cap;
      for(var j=0;j<dots.length;j++) dots[j].classList.toggle("on",j<k);
      bBack.disabled=busy||t<=0; bPlay.disabled=busy;
      bPlay.textContent=t>=N?"↺ Replay":(t===0?"▶ Play step 1":"▶ Play step "+(Math.floor(t)+1));
      if(c.onRender) c.onRender(api);
    }
    function play(){
      if(busy) return;
      if(t>=N){t=0;if(c.onReset)c.onReset(api);render();return}
      var from=Math.floor(t), dur=(c.steps[from].len||4)*(c.beat||330);
      track("guide-"+c.id+"-step"+(from+1));
      if(REDUCED){t=from+1;render();return}
      busy=true;t=from+1e-6;render();
      var t0=performance.now();
      (function fr(now){var f=Math.min(1,(now-t0)/dur);t=from+f;if(f>=1){busy=false;t=from+1}render();if(busy)requestAnimationFrame(fr)})(t0);
    }
    bPlay.addEventListener("click",play);
    bBack.addEventListener("click",function(){if(busy)return;t=Math.max(0,Math.ceil(t)-1);render()});
    var rz;window.addEventListener("resize",function(){clearTimeout(rz);rz=setTimeout(function(){if(!busy&&host.contains(box))render()},150)});
    api.render=render; api.t=function(){return t}; api.host=host; api.busy=function(){return busy};
    render();
    return api;
  }
  window.QDBGuide={Stepper:Stepper,Path:Path,esc:esc,track:track,ease:ease,REDUCED:REDUCED};
})();
