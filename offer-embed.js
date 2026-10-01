/*!
 * Offer-side (teaemp / districtg) — один <script>, integ PHP не трогаем.
 * Ставь ПОСЛЕ jquery/split, до или после validation.js — split на оффере можно не снимать.
 */
(function () {
  "use strict";

  window.__vwEmbedDisableSplit = true;

  var cfg = {
    formSelector: "form.leadform",
    offerSource: "",
    debug: false,
  };

  var storageAccessPromise = null;

  function log(msg) {
    if (cfg.debug) console.log("[vw-embed]", msg);
  }

  function applyConfig() {
    var tag = document.currentScript;
    if (!tag || !tag.dataset) return;
    if (tag.dataset.debug === "1" || tag.dataset.debug === "true") cfg.debug = true;
    if (tag.dataset.form) cfg.formSelector = tag.dataset.form;
    if (tag.dataset.offerSource) cfg.offerSource = String(tag.dataset.offerSource).trim();
  }

  function qp(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }

  function isEmbedMode() {
    return window.self !== window.top || qp("vw_embed") === "1";
  }

  function embedContext() {
    var host = window.location.hostname.replace(/^www\./i, "");
    var funnel =
      qp("funnel") ||
      qp("source") ||
      qp("vw_source") ||
      cfg.offerSource ||
      "";
    var domain =
      qp("domain") ||
      qp("form_domain") ||
      qp("vw_domain") ||
      host;
    return { host: host, domain: domain, funnel: funnel };
  }

  function ensureHidden(form, name, value) {
    if (!value) return;
    var el = form.querySelector('input[name="' + name + '"]');
    if (!el) {
      el = document.createElement("input");
      el.type = "hidden";
      el.name = name;
      form.appendChild(el);
    }
    el.value = value;
  }

  function prepareForm(form) {
    if (!form || form.tagName !== "FORM") return;
    var ctx = embedContext();
    ensureHidden(form, "domain", ctx.domain);
    ensureHidden(form, "form_domain", ctx.domain);
    ensureHidden(form, "host", ctx.host);
    if (ctx.funnel) {
      ensureHidden(form, "source", ctx.funnel);
      ensureHidden(form, "funnel", ctx.funnel);
    }
  }

  function prepareAllForms() {
    document.querySelectorAll(cfg.formSelector).forEach(function (form) {
      prepareForm(form);
      log(
        "form ready domain=" +
          embedContext().domain +
          " funnel=" +
          (embedContext().funnel || "(empty)")
      );
    });
  }

  function neutralizeSplit() {
    if (!isEmbedMode()) return;
    window.splt_submitFromValidation = function () {
      log("split validation hook disabled (embed offer)");
      return false;
    };
    if (typeof window.splt_s === "object" && window.splt_s) {
      window.splt_s.teamLeadSend = "";
      window.splt_s.teamLeadSource = "";
    }
    var splitTag = document.querySelector(
      'script[data-team-lead], script[src*="jhntsplt/jquery"]'
    );
    if (splitTag) {
      splitTag.setAttribute("data-vw-embed-saved-team-lead", splitTag.getAttribute("data-team-lead") || "");
      splitTag.removeAttribute("data-team-lead");
    }
  }

  function disableValidationSplitRouting() {
    if (!isEmbedMode()) return;
    var fn = window.leadSplitTryRoute;
    if (typeof fn !== "function" || fn.__vwEmbedWrapped) return;
    window.leadSplitTryRoute = function () {
      log("validation.js split routing off → orig send.php only");
      return Promise.resolve(false);
    };
    window.leadSplitTryRoute.__vwEmbedWrapped = true;
  }

  function ensureStorageAccess() {
    if (!document.requestStorageAccess) return Promise.resolve();
    if (!storageAccessPromise) {
      storageAccessPromise = document
        .requestStorageAccess()
        .then(function () {
          log("storage access granted");
        })
        .catch(function () {
          log("storage access skipped/denied");
        });
    }
    return storageAccessPromise;
  }

  function warmSession() {
    if (!isEmbedMode()) return;
    var url = window.location.pathname + window.location.search;
    fetch(url, { credentials: "include", cache: "no-store" })
      .then(function () {
        log("session warm (same-origin GET)");
        prepareAllForms();
      })
      .catch(function () {});
  }

  function patchFetch() {
    if (window.__vwEmbedFetchPatched) return;
    window.__vwEmbedFetchPatched = true;
    var orig = window.fetch;
    if (typeof orig !== "function") return;

    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : input && input.url;
      var opts = init ? Object.assign({}, init) : {};
      if (
        url &&
        /\/integ\/send\.php/i.test(String(url)) &&
        opts.body instanceof FormData
      ) {
        var ctx = embedContext();
        opts.body.set("domain", ctx.domain);
        opts.body.set("form_domain", ctx.domain);
        opts.body.set("host", ctx.host);
        if (ctx.funnel) {
          opts.body.set("funnel", ctx.funnel);
          opts.body.set("source", ctx.funnel);
        }
        opts.body.delete("test");
        opts.body.delete("splt_remote");
        opts.body.delete("split");
        opts.body.delete("splt_split_test");
        if (!opts.credentials) opts.credentials = "include";
        log("fetch send.php patched");
        return ensureStorageAccess().then(function () {
          return orig(input, opts);
        });
      }
      return orig.call(this, input, opts);
    };
  }

  function onSubmitCapture(e) {
    if (!isEmbedMode()) return;
    var form = e.target;
    if (!form || form.tagName !== "FORM") return;
    if (!form.matches(cfg.formSelector)) return;
    disableValidationSplitRouting();
    prepareForm(form);
    ensureStorageAccess();
    // document capture, регистрируем после split.js — режем только его capture, validation на form bubble остаётся
    e.stopImmediatePropagation();
  }

  function onPointerDown() {
    if (!isEmbedMode()) return;
    ensureStorageAccess();
  }

  applyConfig();
  patchFetch();
  neutralizeSplit();

  document.addEventListener("submit", onSubmitCapture, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("focusin", onPointerDown, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      neutralizeSplit();
      prepareAllForms();
      warmSession();
    });
  } else {
    prepareAllForms();
    warmSession();
  }

  window.addEventListener("load", function () {
    neutralizeSplit();
    disableValidationSplitRouting();
    prepareAllForms();
  });

  [0, 50, 300, 1500].forEach(function (ms) {
    setTimeout(function () {
      neutralizeSplit();
      disableValidationSplitRouting();
      prepareAllForms();
    }, ms);
  });

  if (isEmbedMode()) {
    log("embed mode top=" + (document.referrer || "").slice(0, 96));
  }

  window.vwEmbedPrepareForms = prepareAllForms;
})();
