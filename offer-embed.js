/*!
 * Offer-side helper (teaemp / districtg) — один <script> на index.php offer.
 * Не трогает integ: дополняет POST domain/funnel для iframe с vw-router.
 */
(function () {
  "use strict";

  var cfg = {
    formSelector: "form.leadform",
    offerSource: "",
    debug: false,
  };

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
    var ctx = embedContext();
    ensureHidden(form, "domain", ctx.domain);
    ensureHidden(form, "form_domain", ctx.domain);
    ensureHidden(form, "host", ctx.host);
    if (ctx.funnel) {
      ensureHidden(form, "source", ctx.funnel);
      ensureHidden(form, "funnel", ctx.funnel);
    }
    log(
      "form ready domain=" + ctx.domain + " funnel=" + (ctx.funnel || "(empty)")
    );
  }

  function prepareAllForms() {
    document.querySelectorAll(cfg.formSelector).forEach(prepareForm);
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
        if (!opts.body.get("domain")) opts.body.set("domain", ctx.domain);
        if (!opts.body.get("form_domain")) {
          opts.body.set("form_domain", ctx.domain);
        }
        if (!opts.body.get("host")) opts.body.set("host", ctx.host);
        if (ctx.funnel) {
          if (!opts.body.get("funnel")) opts.body.set("funnel", ctx.funnel);
          if (!opts.body.get("source")) opts.body.set("source", ctx.funnel);
        }
        log("fetch send.php patched");
      }
      return orig.call(this, input, opts);
    };
  }

  function tryStorageAccess() {
    if (!document.requestStorageAccess) return;
    document.addEventListener(
      "click",
      function once() {
        document.removeEventListener("click", once, true);
        document.requestStorageAccess().catch(function () {});
      },
      true
    );
  }

  applyConfig();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      prepareAllForms();
    });
  } else {
    prepareAllForms();
  }
  patchFetch();
  if (window.self !== window.top) {
    tryStorageAccess();
    log("embedded in iframe top=" + (document.referrer || "").slice(0, 80));
  }

  window.vwEmbedPrepareForms = prepareAllForms;
})();
