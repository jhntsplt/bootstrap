/*!
 * Offer iframe: свой POST в send.php (мимо split + validation submit).
 * Подключай без async/defer, последним перед </body>.
 */
(function () {
  "use strict";

  var VW_EMBED_VERSION = "3.3";

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
  window.__vwEmbedLoaded = VW_EMBED_VERSION;

  var cfg = {
    formSelector: "form.leadform",
    offerSource: "",
    debug: false,
  };

  var hijackBound = false;

  function log(msg) {
    console.info("[vw-embed]", msg);
  }

  function logDebug(msg) {
    if (cfg.debug) console.info("[vw-embed]", msg);
  }

  function findEmbedTag() {
    var cur = document.currentScript;
    if (cur && /offer-embed/i.test(cur.src || "")) return cur;
    var nodes = document.querySelectorAll('script[src*="offer-embed"]');
    return nodes.length ? nodes[nodes.length - 1] : cur || null;
  }

  function applyConfig() {
    var tag = findEmbedTag();
    if (!tag || !tag.dataset) return;
    if (tag.dataset.debug === "1" || tag.dataset.debug === "true") cfg.debug = true;
    if (tag.dataset.form) cfg.formSelector = tag.dataset.form;
    if (tag.dataset.offerSource) cfg.offerSource = String(tag.dataset.offerSource).trim();
    if (tag.dataset.funnel) cfg.offerSource = String(tag.dataset.funnel).trim();
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

  function funnelFromOfferForm() {
    var el = document.querySelector(
      cfg.formSelector + ' input[name="funnel"], ' + cfg.formSelector + ' input[name="source"]'
    );
    return el && el.value ? String(el.value).trim() : "";
  }

  function embedContext() {
    var fromName = ctxFromWindowName();
    var host = window.location.hostname.replace(/^www\./i, "");
    var funnel =
      (fromName && (fromName.funnel || fromName.source)) ||
      qp("funnel") ||
      qp("source") ||
      qp("vw_source") ||
      funnelFromOfferForm() ||
      cfg.offerSource ||
      "";
    var domain =
      (fromName && (fromName.domain || fromName.form_domain)) ||
      qp("domain") ||
      qp("form_domain") ||
      qp("vw_domain") ||
      landingFromReferrer() ||
      "";
    if (!domain && !embed) domain = host;
    return { host: host, domain: domain, funnel: funnel };
  }

  function applySendContext(fd) {
    var ctx = embedContext();
    if (!ctx.domain) {
      console.warn("[vw-embed] landing domain empty — need ?domain= or parent window.name");
    }
    fd.set("domain", ctx.domain || "");
    fd.set("form_domain", ctx.domain || "");
    fd.set("host", ctx.host || "");
    if (ctx.funnel) {
      fd.set("funnel", ctx.funnel);
      fd.set("source", ctx.funnel);
    }
    fd.delete("test");
    fd.delete("split");
    fd.delete("splt_split_test");
    /* send.php: splt_remote=1 — штатный skip session/token для POST не с первого визита оффера */
    fd.set("splt_remote", "1");
    fd.set("vw_embed", "1");
  }

  function showError(form, msg) {
    var phone = form.querySelector('input[name="fullphone"]');
    var errorMsg = form.querySelector(".error-msg");
    if (phone) phone.classList.add("error");
    if (errorMsg) {
      errorMsg.innerHTML = msg;
      errorMsg.classList.remove("hide");
    }
  }

  function resetErrors(form) {
    var phone = form.querySelector('input[name="fullphone"]');
    var errorMsg = form.querySelector(".error-msg");
    if (phone) phone.classList.remove("error");
    if (errorMsg) {
      errorMsg.innerHTML = "";
      errorMsg.classList.add("hide");
    }
  }

  function getIti(phone) {
    if (!phone) return null;
    if (window.intlTelInput && typeof window.intlTelInput.getInstance === "function") {
      return window.intlTelInput.getInstance(phone);
    }
    return phone._iti || null;
  }

  function responseError(data) {
    if (!data) return "Unknown error";
    return (
      data.error_message ||
      data.error ||
      data.message ||
      (data.crm_response &&
        data.crm_response.message &&
        (typeof data.crm_response.message === "string"
          ? data.crm_response.message
          : JSON.stringify(data.crm_response.message))) ||
      "Unknown error"
    );
  }

  function sendAction(form) {
    var action = form.getAttribute("action") || "";
    if (!action) action = "integ/send.php";
    try {
      return new URL(action, window.location.href).toString();
    } catch (e) {
      return action;
    }
  }

  async function embedSubmit(form) {
    if (!form || !embed) return false;

    resetErrors(form);
    var phone = form.querySelector('input[name="fullphone"]');
    var country = form.querySelector('input[name="country"]');
    var preloader = form.querySelector(".form-preloader");
    var iti = getIti(phone);

    if (!phone) {
      console.warn("[vw-embed] phone field missing");
      return false;
    }
    if (!iti) {
      console.warn("[vw-embed] intlTelInput not ready yet");
      showError(form, "Please wait and try again");
      return false;
    }

    if (!iti.isValidNumber()) {
      showError(form, "Invalid number");
      return true;
    }

    var originalPhone = phone.value;
    phone.value = iti.getNumber();

    if (country) {
      if (country.value === "phone") {
        country.value = iti.getSelectedCountryData().iso2.toUpperCase();
      } else if (country.value === "ip") {
        try {
          var r = await fetch("https://ipapi.co/json");
          var j = await r.json();
          country.value = j.country || "DE";
        } catch (e) {
          country.value = "DE";
        }
      } else if (country.value === "") {
        country.value = "DE";
      }
    }

    if (preloader) preloader.classList.remove("hidden");

    var fd = new FormData(form);
    applySendContext(fd);
    fd.append("js_token", Math.random().toString(36).substring(2, 15));

    var ctx = embedContext();
    log(
      "POST send.php domain=" + ctx.domain + " funnel=" + (ctx.funnel || "?")
    );

    try {
      var res = await fetch(sendAction(form), {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      var text = await res.text();
      var data = null;
      try {
        data = JSON.parse(text);
      } catch (e2) {
        throw new Error(text.slice(0, 120));
      }

      if (data && data.success) {
        window.location.href = "Thanks.php";
        return true;
      }

      phone.value = originalPhone;
      if (preloader) preloader.classList.add("hidden");
      var errText = responseError(data);
      showError(form, errText);
      console.error("[vw-embed] send.php FAIL:", errText);
      console.error("[vw-embed] raw:", text.slice(0, 800));
      return true;
    } catch (err) {
      phone.value = originalPhone;
      if (preloader) preloader.classList.add("hidden");
      showError(form, "Network error. Please try again.");
      console.error("[vw-embed]", err);
      return true;
    }
  }

  function onIntercept(ev) {
    if (!embed) return;
    var form = null;
    if (ev.type === "submit") {
      form = ev.target;
    } else {
      var btn = ev.target && ev.target.closest && ev.target.closest("button, input");
      if (!btn) return;
      var type = (btn.getAttribute("type") || "button").toLowerCase();
      if (btn.tagName === "INPUT" && type !== "submit") return;
      if (btn.tagName === "BUTTON" && type !== "submit" && type !== "") return;
      form = btn.form;
    }
    if (!form || form.tagName !== "FORM" || !form.matches(cfg.formSelector)) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();

    embedSubmit(form).then(function (handled) {
      if (handled === false) {
        logDebug("submit not handled — ITI missing");
      }
    });
  }

  function bindHijack() {
    if (!embed || hijackBound) return;
    var forms = document.querySelectorAll(cfg.formSelector);
    if (!forms.length) {
      logDebug("no " + cfg.formSelector + " yet");
      return;
    }
    hijackBound = true;
    document.addEventListener("click", onIntercept, true);
    document.addEventListener("submit", onIntercept, true);
    var ctx = embedContext();
    log(
      "hijack on " +
        forms.length +
        " form(s) domain=" +
        ctx.domain +
        " funnel=" +
        (ctx.funnel || "?")
    );
  }

  function scheduleBind() {
    bindHijack();
    setTimeout(bindHijack, 100);
    setTimeout(bindHijack, 500);
    setTimeout(bindHijack, 2000);
  }

  applyConfig();

  log(
    "v" +
      VW_EMBED_VERSION +
      " loaded embed=" +
      (embed ? "1" : "0") +
      " inIframe=" +
      (window.self !== window.top ? "1" : "0") +
      " vw_embed=" +
      qp("vw_embed")
  );

  function warmSession() {
    fetch(window.location.href, { credentials: "include", cache: "no-store" }).catch(
      function () {}
    );
  }

  if (!embed) {
    console.warn(
      "[vw-embed] not in iframe — script idle (open via VW overlay or ?vw_embed=1)"
    );
  } else {
    warmSession();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", scheduleBind);
    } else {
      scheduleBind();
    }
    window.addEventListener("load", function () {
      warmSession();
      scheduleBind();
    });
    setTimeout(function () {
      if (!hijackBound) {
        console.warn("[vw-embed] hijack not bound — form.leadform missing?");
      }
    }, 3000);
  }

  window.vwEmbedSubmit = embedSubmit;
})();
