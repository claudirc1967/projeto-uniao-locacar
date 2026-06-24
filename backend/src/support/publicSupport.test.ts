import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getPublicSupportConfig } from "./publicSupport.js";

describe("getPublicSupportConfig", () => {
  afterEach(() => {
    delete process.env.ADMIN_SUPPORT_EMAIL;
    delete process.env.ADMIN_SUPPORT_WHATSAPP;
  });

  it("retorna null quando vars ausentes", () => {
    const cfg = getPublicSupportConfig();
    assert.equal(cfg.supportEmail, null);
    assert.equal(cfg.supportWhatsApp, null);
    assert.equal(cfg.whatsAppUrl, null);
  });

  it("normaliza e-mail e WhatsApp", () => {
    process.env.ADMIN_SUPPORT_EMAIL = " UniaoLocacar@gmail.com ";
    process.env.ADMIN_SUPPORT_WHATSAPP = "+55 (31) 99547-7155";
    const cfg = getPublicSupportConfig();
    assert.equal(cfg.supportEmail, "uniaolocacar@gmail.com");
    assert.equal(cfg.supportWhatsApp, "5531995477155");
    assert.equal(cfg.whatsAppUrl, "https://wa.me/5531995477155");
  });
});
