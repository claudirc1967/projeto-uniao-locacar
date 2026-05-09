// GitHub Pages — experiments.baseUrl:
// - https://<user>.github.io/<repo>/ → "/<repo>/"
// - Domínio customizado na raiz → secret EXPO_BASE_URL=/ no CI
// - Local: "/"

const appJson = require("./app.json");

function normalizeBasePath(raw) {
  const noTrail = raw.trim().replace(/\/+$/, "");
  return noTrail.startsWith("/") ? `${noTrail}/` : `/${noTrail}/`;
}

function getBaseUrl() {
  const explicit = process.env.EXPO_BASE_URL?.trim();
  if (explicit) {
    return normalizeBasePath(explicit);
  }
  if (process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY.split("/")[1];
    if (repo) return `/${repo}/`;
  }
  return "/";
}

module.exports = {
  expo: {
    ...appJson.expo,
    experiments: {
      ...(appJson.expo.experiments || {}),
      baseUrl: getBaseUrl(),
    },
  },
};
