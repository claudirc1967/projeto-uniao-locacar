/**
 * Preenche e-mail e WhatsApp a partir de GET /public/support (API) ou support-config.json (build/local).
 */
(function () {
  var FALLBACK_EMAIL = "uniaolocacar@gmail.com";

  function apiBase() {
    var h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return "http://localhost:4000";
    }
    return "https://api.uniaolocacar.com.br";
  }

  function showWhatsAppLinks(cfg) {
    if (!cfg || !cfg.whatsAppUrl) return;
    document.querySelectorAll("[data-support-whatsapp]").forEach(function (el) {
      var msg = el.getAttribute("data-wa-message") || "";
      var sep = cfg.whatsAppUrl.indexOf("?") >= 0 ? "&" : "?";
      el.href = msg
        ? cfg.whatsAppUrl + sep + "text=" + encodeURIComponent(msg)
        : cfg.whatsAppUrl;
      el.removeAttribute("hidden");
    });
  }

  function applyPublicSupport(cfg) {
    var email = (cfg && cfg.supportEmail) || FALLBACK_EMAIL;
    document.querySelectorAll("[data-support-email]").forEach(function (el) {
      el.href = "mailto:" + encodeURIComponent(email);
      if (el.hasAttribute("data-support-email-label")) {
        el.textContent = email;
      }
    });
    showWhatsAppLinks(cfg);
  }

  function loadStaticConfig() {
    return fetch("/support-config.json")
      .then(function (res) {
        if (!res.ok) throw new Error("support-config missing");
        return res.json();
      })
      .catch(function () {
        return null;
      });
  }

  fetch(apiBase() + "/public/support")
    .then(function (res) {
      if (!res.ok) throw new Error("support fetch failed");
      return res.json();
    })
    .then(applyPublicSupport)
    .catch(function () {
      return loadStaticConfig().then(function (cfg) {
        applyPublicSupport(cfg);
      });
    });
})();
