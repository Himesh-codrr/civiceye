/*!
 * CivicEye Chat — user-facing chatbot widget (no build step, no dependencies).
 *
 * Drop ONE script tag onto any page (your Vite/React app, a static site, etc.):
 *
 *   <script src="https://<your-deployment>/civiceye-chat.js" defer></script>
 *
 * THEME (auto): the widget reads the host page to match branding.
 *   - Default     → CivicEye theme (cream + navy + gold + coral)
 *   - html.amrita → Amrita Eye theme (crimson + Playfair, soft shadows)
 *   It watches the <html> class list, so it re-themes live the moment a user
 *   signs in with an @amrita.edu account and the site adds the "amrita" class.
 *
 * Optional overrides (set BEFORE the script loads):
 *
 *   <script>
 *   window.CivicEyeChatConfig = {
 *     endpoint: "https://api.example.com/api/chat",  // override API origin
 *     theme: "auto",        // "auto" | "civiceye" | "amrita"
 *     title: "CivicEye Assistant",
 *     subtitle: "Online · replies instantly",
 *     placeholder: "Ask about reporting an issue…",
 *     autoOpen: true, openDelay: 1200,
 *     launcher: { color: "#ef6b59" },   // override the bubble color
 *   };
 *   </script>
 */
(function () {
  "use strict";

  var NS = "civiceye-chat";
  if (window.__CIVICEYE_CHAT_LOADED__) return;
  window.__CIVICEYE_CHAT_LOADED__ = true;

  var cfg = window.CivicEyeChatConfig || {};
  var scriptEl = document.currentScript;
  var base = "";
  if (scriptEl && scriptEl.src) {
    try {
      base = new URL(scriptEl.src).origin;
    } catch (e) {}
  }
  var ENDPOINT = cfg.endpoint || (base ? base + "/api/chat" : "/api/chat");

  var TITLE = cfg.title || "CivicEye Assistant";
  var SUBTITLE = cfg.subtitle || "Online · replies instantly";
  var PLACEHOLDER = cfg.placeholder || "Ask about reporting an issue…";
  var L_BG_OVERRIDE = (cfg.launcher && cfg.launcher.color) || "";

  /* ───────────────────────────────────────────────────────────
   * THEME TOKENS
   * Matches the real CivicEye / Amrita Eye palettes extracted
   * from civiceye-pied.vercel.app's CSS.
   * ─────────────────────────────────────────────────────────── */
  function detectTheme() {
    var t = cfg.theme || "auto";
    if (t === "civiceye" || t === "amrita") return t;
    var html = document.documentElement;
    if (html && html.classList && html.classList.contains("amrita")) return "amrita";
    return "civiceye";
  }

  var css =
    "#cve-root{position:fixed;z-index:2147483000;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}" +
    "#cve-root *{box-sizing:border-box;margin:0;padding:0;}" +
    /* ── CivicEye (default) tokens ── */
    "#cve-root[data-theme='civiceye']{" +
    "--panel:#fffdf4;--panel-border:#172b44;--panel-shadow:6px 6px 0 #172b44;" +
    "--header:#fff8e7;--ink:#172b44;--muted:#5b6b80;--line:#172b44;" +
    "--bot:#ffffff;--bot-border:#172b44;--bot-text:#172b44;" +
    "--user:#ffd630;--user-text:#172b44;" +
    "--accent:#ef6b59;--accent-text:#ffffff;" +
    "--chip:#fffdf4;--chip-border:#172b44;--chip-text:#172b44;" +
    "--title-font:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
    "--radius:9999px;}" +
    /* ── Amrita Eye tokens ── */
    "#cve-root[data-theme='amrita']{" +
    "--panel:#ffffff;--panel-border:#f0dfe3;--panel-shadow:0 10px 40px rgba(165,22,54,.14);" +
    "--header:#ffffff;--ink:#1d1d1f;--muted:#8a6f78;--line:#f0dfe3;" +
    "--bot:#ffffff;--bot-border:#f0dfe3;--bot-text:#1d1d1f;" +
    "--user:#a51636;--user-text:#ffffff;" +
    "--accent:#a51636;--accent-text:#ffffff;" +
    "--chip:#fdf1f3;--chip-border:rgba(165,22,54,.18);--chip-text:#a51636;" +
    "--title-font:'Playfair Display',Georgia,serif;" +
    "--radius:16px;}" +
    /* ── launcher ── */
    "#cve-launcher{position:fixed;right:22px;bottom:90px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--accent-text);background:var(--accent);box-shadow:0 6px 20px rgba(15,23,42,.35);transition:transform .15s ease;}" +
    "#cve-root[data-theme='civiceye'] #cve-launcher{box-shadow:4px 4px 0 #172b44;}" +
    "#cve-launcher:hover{transform:scale(1.07);}" +
    "#cve-launcher svg{width:28px;height:28px;}" +
    "#cve-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;line-height:1;padding:3px 6px;border-radius:999px;display:none;}" +
    /* ── panel ── */
    "#cve-panel{position:fixed;right:22px;bottom:162px;width:380px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 120px);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;background:var(--panel);border:2px solid var(--panel-border);box-shadow:var(--panel-shadow);opacity:0;transform:translateY(14px) scale(.98);pointer-events:none;transition:opacity .2s ease,transform .2s ease;}" +
    "#cve-root.cve-open #cve-panel{opacity:1;transform:none;pointer-events:auto;}" +
    "#cve-root.cve-open #cve-launcher{display:none;}" +
    /* ── header ── */
    "#cve-head{background:var(--header);border-bottom:2px solid var(--line);padding:14px 16px;display:flex;align-items:center;gap:12px;}" +
    "#cve-avatar{width:38px;height:38px;border-radius:12px;background:var(--accent);color:var(--accent-text);display:flex;align-items:center;justify-content:center;flex:none;}" +
    "#cve-avatar svg{width:22px;height:22px;}" +
    "#cve-title{font-family:var(--title-font);font-size:15px;font-weight:800;color:var(--ink);}" +
    "#cve-sub{font-size:12px;color:var(--muted);}" +
    "#cve-close{background:none;border:none;color:var(--muted);cursor:pointer;margin-left:auto;font-size:20px;line-height:1;padding:4px;}" +
    "#cve-close:hover{color:var(--ink);}" +
    /* ── messages ── */
    "#cve-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--panel);}" +
    "#cve-msgs::-webkit-scrollbar{width:6px;}" +
    "#cve-msgs::-webkit-scrollbar-thumb{background:var(--line);border-radius:3px;}" +
    ".cve-row{display:flex;gap:8px;max-width:88%;}" +
    ".cve-row.cve-user{align-self:flex-end;flex-direction:row-reverse;}" +
    ".cve-bub{padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;}" +
    ".cve-row.cve-bot .cve-bub{background:var(--bot);color:var(--bot-text);border:2px solid var(--bot-border);border-top-left-radius:4px;}" +
    ".cve-row.cve-user .cve-bub{background:var(--user);color:var(--user-text);border-top-right-radius:4px;}" +
    ".cve-bub.cve-err{background:#fef2f2;color:#b91c1c;border:2px solid #fecaca;}" +
    ".cve-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--muted);margin-right:3px;animation:cveBlink 1.2s infinite;}" +
    ".cve-dot:nth-child(2){animation-delay:.15s;}" +
    ".cve-dot:nth-child(3){animation-delay:.3s;}" +
    "@keyframes cveBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}" +
    /* ── quick chips ── */
    "#cve-qs{display:flex;flex-wrap:wrap;gap:6px;padding:4px 12px 2px;}" +
    ".cve-chip{background:var(--chip);color:var(--chip-text);border:1.5px solid var(--chip-border);font-size:12px;font-weight:600;padding:6px 10px;border-radius:var(--radius);cursor:pointer;transition:transform .1s,background .15s;}" +
    ".cve-chip:hover{transform:translateY(-1px);}" +
    /* ── input row ── */
    "#cve-in{display:flex;gap:8px;padding:12px;border-top:2px solid var(--line);background:var(--panel);}" +
    "#cve-input{flex:1;border:2px solid var(--line);background:var(--bot);color:var(--ink);border-radius:14px;padding:11px 13px;font-size:13.5px;font-family:inherit;resize:none;outline:none;max-height:110px;}" +
    "#cve-input:focus{border-color:var(--accent);}" +
    "#cve-send{width:44px;height:44px;border:none;border-radius:12px;background:var(--accent);color:var(--accent-text);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;}" +
    "#cve-root[data-theme='civiceye'] #cve-send{border:2px solid #172b44;box-shadow:2px 2px 0 #172b44;}" +
    "#cve-send:disabled{opacity:.5;cursor:not-allowed;}" +
    "#cve-send svg{width:19px;height:19px;}" +
    "#cve-brand{font-size:10.5px;color:var(--muted);text-align:center;padding:0 0 8px;}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* ── DOM ────────────────────────────────────────────────────── */
  var root = document.createElement("div");
  root.id = "cve-root";
  root.innerHTML =
    '<button id="cve-launcher" aria-label="Open chat">' +
    iconChat() +
    '<span id="cve-badge"></span></button>' +
    '<div id="cve-panel" role="dialog" aria-label="' + esc(TITLE) + '">' +
    '<div id="cve-head">' +
    '<div id="cve-avatar">' + iconChat() + "</div>" +
    '<div><div id="cve-title">' + esc(TITLE) + "</div>" +
    '<div id="cve-sub">' + esc(SUBTITLE) + "</div></div>" +
    '<button id="cve-close" aria-label="Close">&times;</button>' +
    "</div>" +
    '<div id="cve-msgs"></div>' +
    '<div id="cve-qs">' +
    '<button class="cve-chip">How do I report an issue?</button>' +
    '<button class="cve-chip">I didn\u2019t get my confirmation email</button>' +
    '<button class="cve-chip">What is Amrita Eye?</button>' +
    "</div>" +
    '<div id="cve-in">' +
    '<textarea id="cve-input" rows="1" placeholder="' + esc(PLACEHOLDER) + '"></textarea>' +
    '<button id="cve-send" aria-label="Send">' + iconSend() + "</button>" +
    "</div>" +
    '<div id="cve-brand">Powered by CivicEye</div>' +
    "</div>";

  document.body.appendChild(root);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function iconChat() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  }
  function iconSend() {
    return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>';
  }

  /* ── apply theme (and react to host page changes) ─────────── */
  function applyTheme() {
    // Re-read window.CivicEyeChatConfig so brand-aware title/subtitle/
    // placeholder take effect after a sign-in brand switch (the host page
    // mutates the config object in a MutationObserver, see index.html).
    var liveCfg = window.CivicEyeChatConfig || {};
    var liveTitle = liveCfg.title || TITLE;
    var liveSub = liveCfg.subtitle || SUBTITLE;
    var livePlaceholder = liveCfg.placeholder || PLACEHOLDER;

    var t = detectTheme();
    root.setAttribute("data-theme", t);

    var titleEl = root.querySelector("#cve-title");
    if (titleEl) titleEl.textContent = liveTitle;
    var subEl = root.querySelector("#cve-sub");
    if (subEl) subEl.textContent = liveSub;
    var inp = root.querySelector("#cve-input");
    if (inp) inp.setAttribute("placeholder", livePlaceholder);
    var launcher = root.querySelector("#cve-launcher");
    if (L_BG_OVERRIDE && launcher) launcher.style.background = L_BG_OVERRIDE;
  }
  applyTheme();

  // Live re-theme: when the site toggles the "amrita" class on <html>
  // (i.e. an @amrita.edu user signs in), switch the widget palette too.
  if (typeof MutationObserver === "function" && document.documentElement) {
    var obs = new MutationObserver(function () { applyTheme(); });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  /* ── state ──────────────────────────────────────────────────── */
  var messages = [];
  var busy = false;
  var unread = 0;

  var $ = function (id) { return root.querySelector(id); };
  var launcher = $("#cve-launcher");
  var msgsEl = $("#cve-msgs");
  var inputEl = $("#cve-input");
  var sendBtn = $("#cve-send");
  var closeBtn = $("#cve-close");
  var badge = $("#cve-badge");

  function open() {
    root.classList.add("cve-open");
    unread = 0;
    badge.style.display = "none";
    if (!messages.length) greet();
    setTimeout(function () { inputEl.focus(); }, 60);
  }
  function close() {
    root.classList.remove("cve-open");
    launcher.style.display = "flex";
  }

  launcher.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  function scroll() { msgsEl.scrollTop = msgsEl.scrollHeight; }

  function addBubble(role, html, err) {
    var row = document.createElement("div");
    row.className = "cve-row cve-" + role;
    var b = document.createElement("div");
    b.className = "cve-bub" + (err ? " cve-err" : "");
    b.innerHTML = html;
    row.appendChild(b);
    msgsEl.appendChild(row);
    scroll();
    return b;
  }

  function typingBubble() {
    var row = document.createElement("div");
    row.className = "cve-row cve-bot";
    var b = document.createElement("div");
    b.className = "cve-bub";
    b.innerHTML = '<span class="cve-dot"></span><span class="cve-dot"></span><span class="cve-dot"></span>';
    row.appendChild(b);
    msgsEl.appendChild(row);
    scroll();
    return { row: row, b: b };
  }

  function greet() {
    addBubble(
      "bot",
      "Hi! 👋 I\u2019m the <b>CivicEye Assistant</b>.<br><br>I can help you report civic issues, fix account &amp; email-verification problems, and explain the <b>Amrita Eye</b> campus portal. What do you need?"
    );
  }

  function ask(text) {
    if (busy) return;
    text = (text || "").trim();
    if (!text) return;
    addBubble("user", esc(text));
    messages.push({ role: "user", content: text });
    inputEl.value = "";
    autosize();
    run();
  }

  function run() {
    busy = true;
    sendBtn.disabled = true;
    var t = typingBubble();

    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages }),
      }).then(function (res) {
        if (!res.ok || !res.body) {
          return res.text().then(function (txt) {
            throw new Error("Server responded " + res.status + (txt ? ": " + txt.slice(0, 200) : ""));
          });
        }
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buf = "";
        var acc = "";
        var msgEl = t.b;

        function pump() {
          return reader.read().then(function (r) {
            if (r.done) { finish(); return; }
            buf += decoder.decode(r.value, { stream: true });
            var lines = buf.split("\n");
            buf = lines.pop();
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i].trim();
              if (line.indexOf("data:") !== 0) continue;
              var payload = line.slice(5).trim();
              try {
                var obj = JSON.parse(payload);
                if (obj.type === "content") {
                  acc += obj.text;
                  msgEl.innerHTML = render(acc);
                  scroll();
                } else if (obj.type === "error") {
                  msgEl.remove();
                  addBubble("bot", esc(obj.message || "Something went wrong."), true);
                  return finish();
                }
              } catch (e) {}
            }
            return pump();
          }).catch(function () {
            msgEl.remove();
            addBubble("bot", "Connection lost — please check your internet and try again.", true);
            finish();
          });
        }

        function finish() {
          if (msgEl && msgEl.isConnected) {
            if (!acc) {
              msgEl.remove();
              addBubble("bot", "I didn\u2019t get a reply. Please try again.", true);
            } else {
              messages.push({ role: "assistant", content: acc });
            }
          }
          busy = false;
          sendBtn.disabled = false;
        }

        return pump();
      }).catch(function (err) {
        t.b.remove();
        addBubble("bot", esc(err && err.message ? err.message : "Could not reach the assistant."), true);
        busy = false;
        sendBtn.disabled = false;
      });
    } catch (err) {
      t.b.remove();
      addBubble("bot", "Something went wrong starting the request.", true);
      busy = false;
      sendBtn.disabled = false;
    }
  }

  function render(text) {
    var safe = esc(text);
    return safe
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\n/g, "<br>")
      .replace(/`([^`]+)`/g, "<code style='font-family:monospace;background:rgba(0,0,0,.06);padding:1px 5px;border-radius:4px;'>$1</code>");
  }

  sendBtn.addEventListener("click", function () { ask(inputEl.value); });
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(inputEl.value);
    }
  });
  function autosize() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + "px";
  }
  inputEl.addEventListener("input", autosize);

  // quick-reply chips
  root.querySelectorAll(".cve-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      open();
      ask(chip.textContent);
    });
  });

  // auto-open after a short delay for first-time visitors (once per session)
  var autoOpen = cfg.autoOpen === undefined ? true : !!cfg.autoOpen;
  if (autoOpen && !sessionStorage.getItem("cve-seen")) {
    sessionStorage.setItem("cve-seen", "1");
    setTimeout(function () {
      if (!root.classList.contains("cve-open")) open();
    }, cfg.openDelay || 1200);
  }
})();
