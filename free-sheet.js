/* Share buttons for the free teaser QDB Sheet.
   Markup: <div class="fs-share" data-fs-share="home"></div>  (the value tags the GoatCounter events) */
(function(){
  var URL_SHARE = 'https://quasidb.com/#free-sheet';
  var TEXT = 'Free QDB Sheet: retail FX sentiment ranked by the QDB Score, plus the crowd\'s most one-sided pairs. No sign-up needed.';
  var ICONS = {
    x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-6.9L4.8 22H1.7l8.1-9.3L1 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20z"/></svg>',
    telegram:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 4.3l-3.2 15.1c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13 1.4 11.5c-1-.3-1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5z"/></svg>',
    whatsapp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3z"/></svg>',
    copy:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>'
  };
  function track(name){ try{ if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({path:name, title:name, event:true}); }catch(e){} }
  function link(net){
    var u = encodeURIComponent(URL_SHARE), t = encodeURIComponent(TEXT);
    if (net==='x') return 'https://twitter.com/intent/tweet?text='+t+'&url='+u+'&via=quasidb';
    if (net==='telegram') return 'https://t.me/share/url?url='+u+'&text='+t;
    if (net==='whatsapp') return 'https://wa.me/?text='+encodeURIComponent(TEXT+' '+URL_SHARE);
  }
  function copy(text){
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function(ok, no){
      var ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy') ? ok() : no(); }catch(e){ no(); } finally { document.body.removeChild(ta); }
    });
  }
  document.querySelectorAll('[data-fs-share]').forEach(function(box){
    var where = box.getAttribute('data-fs-share') || 'page';
    box.innerHTML = '<span class="fs-lbl">Share it</span>'+
      '<button type="button" data-net="x">'+ICONS.x+'X</button>'+
      '<button type="button" data-net="telegram">'+ICONS.telegram+'Telegram</button>'+
      '<button type="button" data-net="whatsapp">'+ICONS.whatsapp+'WhatsApp</button>'+
      '<button type="button" data-net="copy">'+ICONS.copy+'<span>Copy link</span></button>';
    box.addEventListener('click', function(e){
      var b = e.target.closest('button[data-net]'); if (!b) return;
      var net = b.getAttribute('data-net');
      track('free-sheet-share-'+net+'-'+where);
      if (net==='copy'){
        var s=b.querySelector('span');
        copy(URL_SHARE).then(function(){ s.textContent='Link copied'; b.classList.add('done'); },
                             function(){ s.textContent=URL_SHARE; })
          .then(function(){ setTimeout(function(){ s.textContent='Copy link'; b.classList.remove('done'); }, 2500); });
        return;
      }
      window.open(link(net), '_blank', 'noopener');
    });
  });
})();
