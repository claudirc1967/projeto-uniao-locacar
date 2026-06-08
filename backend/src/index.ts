import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createContext } from "./context.js";
import { startHighlightExpirationScheduler } from "./highlights/scheduler.js";
import { appRouter } from "./router.js";

const port = Number(process.env.PORT ?? 4000);
const sampleAdsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "sample-ads"
);

const resetPasswordPageHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redefinir senha - União Locacar</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Arial, Helvetica, sans-serif;
        background: #f5f7fb;
        color: #172033;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      main {
        width: min(100%, 440px);
        background: #fff;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 16px 40px rgba(23, 32, 51, 0.12);
      }

      h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }

      p {
        margin: 0 0 20px;
        color: #5b6475;
        line-height: 1.45;
      }

      label {
        display: block;
        margin: 14px 0 6px;
        font-weight: 700;
      }

      input {
        width: 100%;
        border: 1px solid #ccd3df;
        border-radius: 12px;
        padding: 13px 14px;
        font: inherit;
      }

      input:focus {
        border-color: #2f6fed;
        outline: 3px solid rgba(47, 111, 237, 0.16);
      }

      .password-field {
        position: relative;
      }

      .password-field input {
        padding-right: 92px;
      }

      .toggle-password {
        position: absolute;
        top: 50%;
        right: 8px;
        width: auto;
        margin: 0;
        padding: 8px 10px;
        transform: translateY(-50%);
        border-radius: 999px;
        background: transparent;
        color: #2f6fed;
        font-size: 13px;
        font-weight: 700;
      }

      .toggle-password:disabled {
        cursor: pointer;
        opacity: 1;
      }

      button {
        width: 100%;
        margin-top: 20px;
        border: 0;
        border-radius: 999px;
        padding: 14px 18px;
        background: #2f6fed;
        color: #fff;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      button:disabled {
        cursor: wait;
        opacity: 0.7;
      }

      .message {
        display: none;
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: 12px;
        line-height: 1.4;
      }

      .message.error {
        display: block;
        background: #fff1f1;
        color: #b42318;
      }

      .message.success {
        display: block;
        background: #ecfdf3;
        color: #027a48;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Redefinir senha</h1>
      <p>Informe sua nova senha. Se o código não estiver preenchido, cole o código recebido por e-mail.</p>

      <form id="reset-form">
        <label for="token">Código</label>
        <input id="token" name="token" autocomplete="one-time-code" required />

        <label for="password">Nova senha</label>
        <div class="password-field">
          <input id="password" name="password" type="password" autocomplete="new-password" minlength="6" required />
          <button class="toggle-password" type="button" data-target="password" aria-label="Mostrar nova senha">Mostrar</button>
        </div>

        <label for="confirm-password">Confirmar nova senha</label>
        <div class="password-field">
          <input id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="6" required />
          <button class="toggle-password" type="button" data-target="confirm-password" aria-label="Mostrar confirmação de senha">Mostrar</button>
        </div>

        <button id="submit-button" type="submit">Redefinir senha</button>
      </form>

      <div id="message" class="message" role="status" aria-live="polite"></div>
    </main>

    <script>
      const params = new URLSearchParams(window.location.search);
      const tokenInput = document.getElementById('token');
      const passwordInput = document.getElementById('password');
      const confirmPasswordInput = document.getElementById('confirm-password');
      const form = document.getElementById('reset-form');
      const button = document.getElementById('submit-button');
      const message = document.getElementById('message');

      tokenInput.value = params.get('token') || '';

      function showMessage(type, text) {
        message.className = 'message ' + type;
        message.textContent = text;
      }

      document.querySelectorAll('.toggle-password').forEach((toggle) => {
        toggle.addEventListener('click', () => {
          const target = document.getElementById(toggle.dataset.target);
          if (!target) return;

          const isHidden = target.type === 'password';
          target.type = isHidden ? 'text' : 'password';
          toggle.textContent = isHidden ? 'Ocultar' : 'Mostrar';
          toggle.setAttribute(
            'aria-label',
            (isHidden ? 'Ocultar ' : 'Mostrar ') +
              (toggle.dataset.target === 'password'
                ? 'nova senha'
                : 'confirmação de senha')
          );
        });
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const token = tokenInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password !== confirmPassword) {
          showMessage('error', 'As senhas não conferem.');
          return;
        }

        button.disabled = true;
        button.textContent = 'Redefinindo...';
        showMessage('', '');

        try {
          const response = await fetch('/trpc/auth.resetPassword', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ json: { token, password } }),
          });
          const payload = await response.json().catch(() => null);

          if (!response.ok) {
            const errorMessage =
              payload?.error?.json?.message ||
              payload?.error?.message ||
              'Não foi possível redefinir a senha.';
            throw new Error(errorMessage);
          }

          form.reset();
          showMessage('success', 'Senha alterada com sucesso. Você já pode fazer login no app.');
        } catch (error) {
          showMessage(
            'error',
            error instanceof Error ? error.message : 'Não foi possível redefinir a senha.'
          );
        } finally {
          button.disabled = false;
          button.textContent = 'Redefinir senha';
        }
      });
    </script>
  </body>
</html>`;

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/reset-password", (_req, res) => {
  res.type("html").send(resetPasswordPageHtml);
});

app.use("/sample-ads", express.static(sampleAdsDir));

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API tRPC em http://localhost:${port}/trpc`);
  startHighlightExpirationScheduler();
});

export { appRouter };
export type { AppRouter } from "./router.js";
