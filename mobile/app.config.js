// experiments.baseUrl (Expo web export):
// - Local / Railway (domínio na raiz): "/"
// - GitHub Pages: https://<user>.github.io/<repo>/ → "/<repo>/"
// - Override manual: EXPO_BASE_URL (ex.: "/" no Railway, "/repo/" no Pages)

const appJson = require("./app.json");

function normalizeBasePath(raw) {
  const noTrail = raw.trim().replace(/\/+$/, "");
  return noTrail.startsWith("/") ? `${noTrail}/` : `/${noTrail}/`;
}

function isRailwayBuild() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RAILWAY_STATIC_URL ||
      process.env.RAILWAY_PUBLIC_DOMAIN
  );
}

function isGitHubActionsPagesBuild() {
  return (
    process.env.GITHUB_ACTIONS === "true" &&
    Boolean(process.env.GITHUB_REPOSITORY?.trim())
  );
}

function isCustomDomainPagesBuild() {
  const domain = process.env.EXPO_PUBLIC_SITE_URL?.trim();
  return Boolean(domain && !domain.includes(".github.io"));
}

function getBaseUrl() {
  const explicit = process.env.EXPO_BASE_URL?.trim();
  if (explicit) {
    return normalizeBasePath(explicit);
  }

  // Railway injeta GITHUB_REPOSITORY no build, mas serve o site na raiz do domínio.
  if (isRailwayBuild()) {
    return "/";
  }

  // Domínio customizado no GitHub Pages (ex.: uniaolocacar.com.br) usa raiz "/".
  if (isGitHubActionsPagesBuild() && isCustomDomainPagesBuild()) {
    return "/";
  }

  if (isGitHubActionsPagesBuild()) {
    const repo = process.env.GITHUB_REPOSITORY.split("/")[1];
    if (repo) return `/${repo}/`;
  }

  return "/";
}

const plugins = [...(appJson.expo.plugins || [])];
if (!plugins.some((plugin) => plugin === "expo-secure-store")) {
  plugins.push("expo-secure-store");
}

module.exports = {
  expo: {
    ...appJson.expo,
    plugins,
    experiments: {
      ...(appJson.expo.experiments || {}),
      baseUrl: getBaseUrl(),
    },
  },
};
