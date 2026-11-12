/* QDB Assistant: the AI chat widget for quasidb.com.
 *
 * Add to a page with:  <script src="/chat/chat.js" defer></script>
 *
 * Questions go to the qdb-chat Cloudflare Worker (worker/), which asks Claude
 * and answers from the site's own content. The conversation stays in this
 * browser tab (sessionStorage) and is not stored by QDB anywhere.
 */
(function () {
  "use strict";

  // Address of the deployed Worker. Empty = the widget stays hidden.
  var ENDPOINT = "";

  var script = document.currentScript;
  var endpoint = ((script && script.getAttribute("data-endpoint")) || ENDPOINT).replace(/\/+$/, "");
  if (!endpoint || window.__qdbChat) return;
  window.__qdbChat = true;

  var STORE = "qdb-chat-v1";
  var DISCORD = "https://discord.gg/2Ccf67favj";
  var CONTACT = "https://quasidb.com/#contact";
  var WELCOME =
    "Hi, I'm the QDB Assistant, an AI that knows this site inside out. Ask me about the QDB Sheet, the plans, the free tools or how to read the crowd.\n\n" +
    "I can't give trade signals or personal financial advice. To reach Dave himself, use the [QDB Discord](" + DISCORD + ") or the [contact form](" + CONTACT + ").";
  var SUGGESTIONS = [
    "What's in the QDB Sheet?",
    "Which plan is right for me?",
    "How do I read retail sentiment?",
    "I've paid. How do I get access?"
  ];

  var state = load();
  var busy = false;

  /* ---------- styles ---------- */
  var css =
    ".qdbc{--qc-bg:#101624;--qc-panel:#141b2b;--qc-line:#232d42;--qc-text:#e8edf6;--qc-muted:#93a0b8;--qc-accent:#f5b83d;--qc-buy:#22c55e;--qc-blue:#3b82f6;" +
    "font-family:'Space Grotesk',system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.45;color:var(--qc-text);position:fixed;right:20px;bottom:20px;z-index:2147483000}" +
    ".qdbc *{box-sizing:border-box}" +
    ".qdbc-launch{display:flex;align-items:center;gap:10px;background:var(--qc-panel);color:var(--qc-text);border:1px solid var(--qc-line);border-radius:999px;padding:10px 16px 10px 12px;cursor:pointer;font:inherit;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.45);transition:transform .15s,border-color .15s}" +
    ".qdbc-launch:hover{transform:translateY(-2px);border-color:var(--qc-accent)}" +
    ".qdbc-launch .qdbc-ico{width:30px;height:30px;border-radius:50%;background:var(--qc-accent);color:#0b0f17;display:grid;place-items:center;font-weight:800;font-size:16px;position:relative}" +
    ".qdbc-dot{position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:var(--qc-buy);border:2px solid var(--qc-panel)}" +
    ".qdbc-launch>span:last-child{text-align:left}.qdbc-launch small{display:block;font-weight:400;font-size:12px;color:var(--qc-muted);text-align:left}" +
    ".qdbc-panel{position:absolute;right:0;bottom:0;width:380px;height:min(600px,calc(100vh - 40px));display:flex;flex-direction:column;background:var(--qc-bg);border:1px solid var(--qc-line);border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.55)}" +
    ".qdbc-panel[hidden],.qdbc-launch[hidden]{display:none}" +
    ".qdbc-head{display:flex;align-items:center;gap:10px;padding:12px 12px 12px 14px;background:var(--qc-panel);border-bottom:1px solid var(--qc-line)}" +
    ".qdbc-head .qdbc-ico{width:34px;height:34px;border-radius:50%;background:var(--qc-accent);color:#0b0f17;display:grid;place-items:center;font-weight:800;position:relative;flex:none}" +
    ".qdbc-title{flex:1;min-width:0}.qdbc-title b{display:block;font-size:15px}.qdbc-title span{font-size:12px;color:var(--qc-muted)}" +
    ".qdbc-hbtn{background:none;border:1px solid transparent;color:var(--qc-muted);border-radius:8px;padding:6px 8px;cursor:pointer;font:inherit;font-size:13px}" +
    ".qdbc-hbtn:hover{color:var(--qc-text);border-color:var(--qc-line)}" +
    ".qdbc-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}" +
    ".qdbc-msg{max-width:88%;padding:9px 12px;border-radius:14px;white-space:normal;overflow-wrap:anywhere}" +
    ".qdbc-msg p{margin:0 0 .5em}.qdbc-msg p:last-child{margin:0}.qdbc-msg ul{margin:.2em 0 .5em;padding-left:1.2em}.qdbc-msg li{margin:.15em 0}" +
    ".qdbc-msg a{color:var(--qc-accent);text-decoration:underline}" +
    ".qdbc-bot{align-self:flex-start;background:var(--qc-panel);border:1px solid var(--qc-line);border-bottom-left-radius:4px}" +
    ".qdbc-me{align-self:flex-end;background:var(--qc-blue);color:#fff;border-bottom-right-radius:4px}" +
    ".qdbc-err{border-color:rgba(239,68,68,.5)}" +
    ".qdbc-typing{display:inline-flex;gap:4px}.qdbc-typing i{width:7px;height:7px;border-radius:50%;background:var(--qc-muted);animation:qdbc-b 1s infinite}" +
    ".qdbc-typing i:nth-child(2){animation-delay:.15s}.qdbc-typing i:nth-child(3){animation-delay:.3s}" +
    "@keyframes qdbc-b{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}" +
    ".qdbc-sugg{display:flex;flex-wrap:wrap;gap:6px}" +
    ".qdbc-sugg button{background:none;border:1px solid var(--qc-line);color:var(--qc-text);border-radius:999px;padding:6px 11px;font:inherit;font-size:13px;cursor:pointer}" +
    ".qdbc-sugg button:hover{border-color:var(--qc-accent);color:var(--qc-accent)}" +
    ".qdbc-form{display:flex;gap:8px;padding:10px;border-top:1px solid var(--qc-line);background:var(--qc-panel)}" +
    ".qdbc-form textarea{flex:1;resize:none;background:var(--qc-bg);color:var(--qc-text);border:1px solid var(--qc-line);border-radius:12px;padding:9px 11px;font:inherit;font-size:16px;line-height:1.35;max-height:110px}" +
    ".qdbc-form textarea:focus{outline:none;border-color:var(--qc-accent)}" +
    ".qdbc-send{background:var(--qc-accent);color:#0b0f17;border:0;border-radius:12px;padding:0 14px;font:inherit;font-weight:700;cursor:pointer}" +
    ".qdbc-send:disabled{opacity:.5;cursor:default}" +
    ".qdbc-note{font-size:11.5px;color:var(--qc-muted);padding:0 12px 10px;background:var(--qc-panel);text-align:center}" +
    ".qdbc-note a{color:var(--qc-muted)}" +
    "@media (max-width:520px){.qdbc{right:12px;bottom:12px}.qdbc.qdbc-open{left:0;right:0;top:0;bottom:0}" +
    ".qdbc-open .qdbc-panel{position:fixed;inset:0;width:100%;height:100%;border-radius:0;border:0}}" +
    "@media (prefers-reduced-motion:reduce){.qdbc-launch,.qdbc-typing i{transition:none;animation:none}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- markup ---------- */
  var root = el("div", "qdbc");
  root.innerHTML =
    '<button type="button" class="qdbc-launch" aria-label="Open the QDB Assistant chat">' +
    '<span class="qdbc-ico" aria-hidden="true">Q<span class="qdbc-dot"></span></span>' +
    '<span>Ask QDB<small>AI assistant · online</small></span></button>' +
    '<div class="qdbc-panel" role="dialog" aria-label="QDB Assistant chat" hidden>' +
    '<div class="qdbc-head"><span class="qdbc-ico" aria-hidden="true">Q<span class="qdbc-dot"></span></span>' +
    '<div class="qdbc-title"><b>QDB Assistant</b><span>AI · answers instantly, any time</span></div>' +
    '<button type="button" class="qdbc-hbtn qdbc-new" title="Start a new chat">New chat</button>' +
    '<button type="button" class="qdbc-hbtn qdbc-close" aria-label="Close chat">✕</button></div>' +
    '<div class="qdbc-log" aria-live="polite"></div>' +
    '<form class="qdbc-form"><textarea rows="1" maxlength="800" placeholder="Ask a question…" aria-label="Your question"></textarea>' +
    '<button type="submit" class="qdbc-send">Send</button></form>' +
    '<div class="qdbc-note">AI answers can be wrong. Educational only, not financial advice. QDB doesn\'t save your chat. ' +
    '<a href="' + DISCORD + '" target="_blank" rel="noopener">Ask Dave on Discord</a></div>' +
    "</div>";

  var launch = root.querySelector(".qdbc-launch");
  var panel = root.querySelector(".qdbc-panel");
  var log = root.querySelector(".qdbc-log");
  var form = root.querySelector(".qdbc-form");
  var input = form.querySelector("textarea");
  var send = form.querySelector(".qdbc-send");

  launch.addEventListener("click", function () { open(true); });
  root.querySelector(".qdbc-close").addEventListener("click", function () { open(false); });
  root.querySelector(".qdbc-new").addEventListener("click", function () {
    if (busy) return;
    state.messages = [];
    save();
    render();
    input.focus();
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
  });
  input.addEventListener("input", grow);
  root.addEventListener("keydown", function (e) { if (e.key === "Escape") open(false); });

  // Show the widget only when the assistant is switched on.
  fetch(endpoint + "/status", { method: "GET" })
    .then(function (r) { return r.json(); })
    .then(function (s) {
      if (!s || !s.online) return;
      document.body.appendChild(root);
      if (state.open) open(true, true);
    })
    .catch(function () {});

  /* ---------- behaviour ---------- */
  function open(on, restoring) {
    state.open = on;
    save();
    panel.hidden = !on;
    launch.hidden = on;
    root.classList.toggle("qdbc-open", on);
    if (on) {
      render();
      if (!restoring) {
        input.focus();
        track("chat-open");
      }
    } else {
      launch.focus();
    }
  }

  function ask(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    input.value = "";
    grow();
    state.messages.push({ role: "user", content: text.slice(0, 800) });
    save();
    busy = true;
    send.disabled = true;
    render(true);
    track("chat-question");

    var history = state.messages.filter(function (m) { return !m.error; }).map(function (m) {
      return { role: m.role, content: m.content };
    });

    fetch(endpoint + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (r.ok && data.reply) return { role: "assistant", content: data.reply };
          return { role: "assistant", error: true, content: data.error || offline() };
        });
      })
      .catch(function () { return { role: "assistant", error: true, content: offline() }; })
      .then(function (msg) {
        state.messages.push(msg);
        save();
        busy = false;
        send.disabled = false;
        render();
        input.focus();
      });
  }

  function offline() {
    return "I couldn't connect just now. Please try again in a moment, or reach Dave on the [QDB Discord](" + DISCORD + ") or the [contact form](" + CONTACT + ").";
  }

  function render(typing) {
    log.innerHTML = "";
    log.appendChild(bubble("assistant", WELCOME));
    if (!state.messages.length) {
      var sugg = el("div", "qdbc-sugg");
      SUGGESTIONS.forEach(function (q) {
        var b = el("button");
        b.type = "button";
        b.textContent = q;
        b.addEventListener("click", function () { ask(q); });
        sugg.appendChild(b);
      });
      log.appendChild(sugg);
    }
    state.messages.forEach(function (m) {
      var b = bubble(m.role, m.content);
      if (m.error) b.classList.add("qdbc-err");
      log.appendChild(b);
    });
    if (typing) {
      var t = el("div", "qdbc-msg qdbc-bot");
      t.innerHTML = '<span class="qdbc-typing" aria-label="The assistant is typing"><i></i><i></i><i></i></span>';
      log.appendChild(t);
    }
    log.scrollTop = log.scrollHeight;
  }

  function bubble(role, text) {
    var b = el("div", "qdbc-msg " + (role === "user" ? "qdbc-me" : "qdbc-bot"));
    if (role === "user") b.textContent = text;
    else b.innerHTML = format(text);
    return b;
  }

  // Tiny, safe formatter: escapes everything, then allows **bold**,
  // [text](https://...) links, bare https:// links, "- " lists and paragraphs.
  function format(text) {
    var blocks = esc(text).split(/\n{2,}/);
    return blocks.map(function (block) {
      var lines = block.split("\n");
      if (lines.every(function (l) { return /^\s*[-*•] /.test(l); })) {
        return "<ul>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^\s*[-*•] /, "")) + "</li>"; }).join("") + "</ul>";
      }
      return "<p>" + lines.map(inline).join("<br>") + "</p>";
    }).join("");
  }

  function inline(s) {
    var links = [];
    s = s.replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, function (_, t, u) {
      links.push(link(u, t));
      return "\u0000" + (links.length - 1) + "\u0000";
    });
    s = s.replace(/https:\/\/[^\s<]+[^\s<.,;:!?)'"]/g, function (u) {
      links.push(link(u, u.replace(/^https:\/\//, "")));
      return "\u0000" + (links.length - 1) + "\u0000";
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return links[+i]; });
  }

  function link(url, label) {
    var internal = /^https:\/\/(www\.)?quasidb\.com(\/|$)/.test(url.replace(/&amp;/g, "&"));
    return '<a href="' + url + '"' + (internal ? "" : ' target="_blank" rel="noopener"') + ">" + label + "</a>";
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function grow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 110) + "px";
  }

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  // Counts opens and questions in GoatCounter (never the text of a question).
  function track(name) {
    try {
      if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: name, event: true });
    } catch (e) {}
  }

  function load() {
    try {
      var s = JSON.parse(sessionStorage.getItem(STORE) || "null");
      if (s && Array.isArray(s.messages)) return s;
    } catch (e) {}
    return { open: false, messages: [] };
  }

  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }
})();
