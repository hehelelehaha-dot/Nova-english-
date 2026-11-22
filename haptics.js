/* Nova 点击震动 (tap haptics). Settings toggle: localStorage nova_haptics ("0" = off, default on).
 *
 * iPhone (Safari and the home-screen app, iOS 18+): there is no Vibration API. The only web haptic is the
 * system tick of <input type="checkbox" switch>. Since iOS 26.5 (WebKit fc1ef83) the tick plays only for a
 * trusted click, so label.click() from JS no longer works. We lay a transparent <label> for a hidden switch
 * over each button: her real tap lands on the label, the browser forwards it to the switch, and the phone
 * ticks once (on finger lift). The app never sees the label's click: we stop it in the capture phase and call
 * host.click() so every onclick, <summary> toggle and e.target stays exactly as before.
 * Needs Settings > Sounds & Haptics > System Haptics on.
 *
 * Android Chrome: navigator.vibrate(8) on pointerdown, at most one pulse per 35 ms so quick taps stay crisp.
 */
(function (w, d) {
  "use strict";
  var TAP = 'button,[role="button"],summary';
  var SKIP = 'a,input,select,textarea,label,[contenteditable],[data-no-haptic],.lock';
  var LIFT = 'button,[role="button"],a,input,select,textarea,label,summary';
  var MIN_GAP_MS = 35, PULSE_MS = 8;
  var last = 0, mo = null, on = false;
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var canVibrate = typeof navigator.vibrate === "function" && !isIOS;

  function enabled() { try { return localStorage.getItem("nova_haptics") !== "0"; } catch (e) { return true; } }

  /* Android */
  function onDown(e) {
    if (e.pointerType === "mouse") return;
    var t = e.target.closest && e.target.closest(TAP);
    if (!t || t.closest(SKIP) || t.disabled) return;
    var now = performance.now(); if (now - last < MIN_GAP_MS) return; last = now;
    try { navigator.vibrate(PULSE_MS); } catch (err) {}
  }

  /* iPhone */
  function onClickCapture(e) {
    var lab = e.target;
    if (!lab || !lab.matches) return;
    if (lab.matches("input[data-hx-sw]")) { e.stopImmediatePropagation(); return; }   // forwarded copy: app never sees it
    if (!lab.matches("label[data-hx]")) return;
    e.stopImmediatePropagation();                       // the trusted click still activates the label → switch → tick
    var host = lab.parentElement;
    if (host && !host.disabled) host.click();           // replay on the real control, same target as before
    // The app may have rewritten the button (速度 1x → 0.85x) or the whole view during that click, which
    // detaches our label. The switch toggle (the tick) runs after this dispatch, so put the label back first.
    if (!lab.isConnected) {
      if (host && host.isConnected && !host.querySelector(":scope > label[data-hx]")) host.appendChild(lab);
      else { lab.style.cssText += ";position:fixed;left:-50px;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; d.body.appendChild(lab); setTimeout(function () { lab.remove(); }, 400); }
    }
  }
  function armIOS(el) {
    if (el.querySelector(":scope > label[data-hx]") || el.closest(SKIP) || el.closest("label[data-hx]")) return;
    var lab = d.createElement("label");
    lab.setAttribute("data-hx", ""); lab.setAttribute("aria-hidden", "true");
    lab.style.cssText = "position:absolute;inset:0;z-index:0;margin:0;padding:0;border:0;background:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;border-radius:inherit";
    var sw = d.createElement("input");
    sw.type = "checkbox"; sw.setAttribute("switch", ""); sw.setAttribute("data-hx-sw", ""); sw.tabIndex = -1;
    sw.style.cssText = "position:absolute;left:0;top:0;width:1px;height:1px;margin:0;opacity:0;pointer-events:none";
    lab.appendChild(sw);
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.querySelectorAll(LIFT).forEach(function (c) {      // inner controls (e.g. 🔊 on a word card) stay tappable
      if (c.closest("label[data-hx]")) return;
      if (getComputedStyle(c).position === "static") c.style.position = "relative";
      if (!c.style.zIndex) c.style.zIndex = "1";
    });
    el.appendChild(lab);
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches(TAP)) armIOS(root);
    root.querySelectorAll(TAP).forEach(armIOS);
  }
  function hostOf(n) { return n && n.nodeType === 1 ? n.closest(TAP) : null; }

  w.NovaHaptics = {
    init: function () {
      if (on || !enabled()) return; on = true;
      if (canVibrate) { d.addEventListener("pointerdown", onDown, { passive: true, capture: true }); return; }
      if (!isIOS) return;
      w.addEventListener("click", onClickCapture, true);
      scan(d.body);
      mo = new MutationObserver(function (list) {
        list.forEach(function (m) {
          m.addedNodes.forEach(scan);
          var h = hostOf(m.target);                         // button text replaced (e.g. 速度 1x → 0.85x) wipes the label: re-arm
          if (h && !h.querySelector(":scope > label[data-hx]")) armIOS(h);
        });
      });
      mo.observe(d.body, { childList: true, subtree: true });
    },
    stop: function () {
      on = false;
      d.removeEventListener("pointerdown", onDown, true);
      w.removeEventListener("click", onClickCapture, true);
      if (mo) { mo.disconnect(); mo = null; }
      d.querySelectorAll("label[data-hx]").forEach(function (l) { l.remove(); });
    },
    isIOS: isIOS, canVibrate: canVibrate
  };
})(window, document);
