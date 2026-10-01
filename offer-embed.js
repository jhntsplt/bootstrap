/*!
 * Offer (teaemp / districtg): один CDN-скрипт, PHP integ не трогаем.
 * Ставь ПЕРЕД jquery/split на оффере (sync, без defer/async).
 */
(function () {
  "use strict";

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

  var embed = isEmbedMode();
  window.__vwEmbedDisableSplit = true;

  /* Старый split на CDN вешает document capture submit — глушим до загрузки split.js */
  if (embed) {
    var origAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === "submit" && this === document && typeof listener === "function") {
        var wrapped = function (ev) {
          var t = ev.target;
          if (t && t.tagName === "FORM" && t.matches && t.matches("form.leadform")) {
            return;
          }
          return listener.call(this, ev);
        };
        return origAdd.call(this, type, wrapped, options);
      }
      return origAdd.call(this, type, listener, options);
    };
  }

  var cfg = {
    formSelector: "form.leadform",
    offerSource: "",
    debug: false,
  };

  var parentCtx = null;

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

  function ctxFromWindowName() {
    var n = window.name || "";
    if (n.indexOf("vwEmbed:") !== 0) return null;
    try {
      return JSON.parse(n.slice(8));
    } catch (e) {
      return null;
    }
  }

  function landingFromReferrer() {
    try {
      if (!document.referrer) return "";
      var here = window.location.hostname.replace(/^www\./i, "");
      var h = new URL(document.referrer).hostname.replace(/^www\./i, "");
      if (!h || h === here) return "";
      return h;
    } catch (e) {
      return "";
    }
  }

  function embedContext() {
    var fromName = ctxFromWindowName();
    var host = window.location.hostname.replace(/^www\./i, "");
    var funnel =
      (fromName && (fromName.funnel || fromName.source)) ||
      (parentCtx && (parentCtx.funnel || parentCtx.source || parentCtx.vw_source)) ||
      qp("funnel") ||
      qp("source") ||
      qp("vw_source") ||
      cfg.offerSource ||
      "";
    var domain =
      (fromName && (fromName.domain || fromName.form_domain)) ||
      (parentCtx && (parentCtx.domain || parentCtx.form_domain || parentCtx.vw_domain)) ||
      qp("domain") ||
      qp("form_domain") ||
      qp("vw_domain") ||
      landingFromReferrer() ||
      host;
    return { host: host, domain: domain, funnel: funnel };
  }

  function applySendContext(formData) {
    if (!formData || typeof formData.set !== "function") return;
    var ctx = embedContext();
    formData.set("domain", ctx.domain || "");
    formData.set("form_domain", ctx.domain || "");
    formData.set("host", ctx.host || "");
    if (ctx.funnel) {
      formData.set("funnel", ctx.funnel);
      formData.set("source", ctx.funnel);
    }
    formData.delete("test");
    formData.delete("splt_remote");
    formData.delete("split");
    formData.delete("splt_split_test");
  }

  function ensureHidden(form, name, value) {
    if (value === undefined || value === null || value === "") return;
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
    });
    var ctx = embedContext();
    log("form ready domain=" + ctx.domain + " funnel=" + (ctx.funnel || "(empty)"));
  }

  function neutralizeSplit() {
    if (!embed) return;
    window.splt_submitFromValidation = function () {
      return false;
    };
    if (typeof window.splt_s === "object" && window.splt_s) {
      window.splt_s.teamLeadSend = "";
      window.splt_s.teamLeadSource = "";
    }
    var splitTag = document.querySelector(
      'script[data-team-lead], script[src*="jhntsplt/jquery"]'
    );
    if (splitTag) splitTag.removeAttribute("data-team-lead");
  }

  function disableValidationSplitRouting() {
    if (!embed) return;
    if (typeof window.leadSplitTryRoute !== "function") return;
    if (window.leadSplitTryRoute.__vwEmbedWrapped) return;
    window.leadSplitTryRoute = function () {
      return Promise.resolve(false);
    };
    window.leadSplitTryRoute.__vwEmbedWrapped = true;
  }

  function patchFormData() {
    if (!embed || window.__vwEmbedFormDataPatched) return;
    window.__vwEmbedFormDataPatched = true;
    var Orig = window.FormData;
    window.FormData = function (arg) {
      var fd = arg !== undefined ? new Orig(arg) : new Orig();
      if (
        embed &&
        arg &&
        arg.nodeType === 1 &&
        arg.tagName === "FORM" &&
        (!arg.matches || arg.matches(cfg.formSelector))
      ) {
        applySendContext(fd);
        log("FormData domain=" + embedContext().domain);
      }
      return fd;
    };
  }

  function patchFetch() {
    if (window.__vwEmbedFetchPatched) return;
    window.__vwEmbedFetchPatched = true;
    var orig = window.fetch;
    if (typeof orig !== "function") return;

    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : input && input.url;
      var opts = init ? Object.assign({}, init) : {};
      if (embed && url && /\/integ\/send\.php/i.test(String(url))) {
        if (opts.body instanceof FormData) {
          applySendContext(opts.body);
          if (!opts.credentials) opts.credentials = "include";
          log("fetch send.php domain=" + embedContext().domain);
        }
      }
      return orig.call(this, input, opts);
    };
  }

  function onParentMessage(e) {
    if (!e || !e.data || e.data.type !== "vw_embed_ctx") return;
    parentCtx = e.data;
    prepareAllForms();
  }

  function watchForms() {
    if (!embed || !window.MutationObserver) return;
    var obs = new MutationObserver(function () {
      prepareAllForms();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  applyConfig();
  patchFormData();
  patchFetch();
  neutralizeSplit();
  window.addEventListener("message", onParentMessage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      neutralizeSplit();
      disableValidationSplitRouting();
      prepareAllForms();
    });
  } else {
    prepareAllForms();
  }

  watchForms();
  disableValidationSplitRouting();

  [0, 100, 500, 2000].forEach(function (ms) {
    setTimeout(function () {
      neutralizeSplit();
      disableValidationSplitRouting();
      prepareAllForms();
    }, ms);
  });

  if (embed) {
    log("embed iframe referrer=" + (document.referrer || "").slice(0, 80));
  }

  window.vwEmbedPrepareForms = prepareAllForms;
})();
