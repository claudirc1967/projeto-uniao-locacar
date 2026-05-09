// Dynamic Expo config: GitHub Pages serves project sites at https://<user>.github.io/<repo>/
// so asset paths must use that prefix. GITHUB_REPOSITORY is set automatically in Actions ("owner/repo").
// Local `expo start --web` / export without env keeps base "/".

const appJson = require("./app.json");

/**
 * @returns {string} e.g. "/" locally or "/projeto-uniao-locacar/" on GitHub Actions
 */
function getBaseUrl() {
  if (process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY.split("/")[1];
    if (repo) return `/${repo}/`;
  }
  const explicit = process.env.EXPO_BASE_URL?.trim();
  if (explicit) {
    const noTrail = explicit.replace(/\/+$/, "");
    return noTrail.startsWith("/") ? `${noTrail}/` : `/${noTrail}/`;
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
