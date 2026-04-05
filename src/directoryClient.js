/**
 * Fetch user profile from Nokia Directory.
 * Default: https://directory.int.net.nokia.com/en/index.php
 * The directory also exposes https://directory.int.net.nokia.com/oauth2/authorization/azure — that URL
 * starts OAuth2 login (302 to Microsoft); it does not accept search params or return profile data.
 * Used when user "applies" – no need to store hierarchy locally for auth context.
 */

const https = require("https");
const http = require("http");

const DEFAULT_DIRECTORY_BASE = "https://directory.int.net.nokia.com/en/index.php";
const DIRECTORY_BASE = process.env.DIRECTORY_URL || DEFAULT_DIRECTORY_BASE;
const DIRECTORY_INSECURE = String(process.env.DIRECTORY_INSECURE || "false").toLowerCase() === "true";
const DIRECTORY_DEBUG = String(process.env.DIRECTORY_DEBUG || "0") === "1";
const DIRECTORY_USER = process.env.DIRECTORY_USER || process.env.DIRECTORY_EMAIL || "";
const DIRECTORY_PASSWORD = process.env.DIRECTORY_PASSWORD || "";

let azureGraphClient;
function getAzureGraphClient() {
  if (!azureGraphClient) {
    try {
      azureGraphClient = require("./azureGraphClient");
    } catch (_) {
      azureGraphClient = { isConfigured: () => false, fetchUserProfileByEmail: () => Promise.resolve(null) };
    }
  }
  return azureGraphClient;
}

function getConfig() {
  const base = DIRECTORY_BASE.replace(/\/?$/, "");
  const auth =
    DIRECTORY_USER && DIRECTORY_PASSWORD
      ? "Basic " + Buffer.from(DIRECTORY_USER + ":" + DIRECTORY_PASSWORD).toString("base64")
      : null;
  return {
    baseUrl: base,
    insecure: DIRECTORY_INSECURE,
    auth
  };
}

/**
 * Extract profile fields from directory HTML (profile page content).
 * Matches Nokia directory layout: Email:, Business Title:, Team:, Responsible:, Responsible ID:, etc.
 */
function parseProfileFromHtml(html) {
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const get = (label, pattern) => {
    const re = new RegExp(`${label}\\s*[:\\s]*([^\\n]+)`, "i");
    const m = text.match(re) || text.match(new RegExp(`${label}[^\\d]*([^\\n<]+)`, "i"));
    return m ? m[1].trim() : null;
  };

  const email = get("Email", "([^\\s]+@[^\\s]+)") || get("Mail", "([^\\s]+@[^\\s]+)");
  const businessTitle = get("Business Title", ".+") || get("Title", ".+");
  const team = get("Team", ".+") || get("Org", ".+");
  const division = get("Division", ".+");
  const businessGroup = get("Business Group", ".+");
  const responsible = get("Responsible", ".+") || get("Manager", ".+");
  const responsibleIdRaw = get("Responsible ID", "\\d+") || get("Manager ID", "\\d+");
  const responsibleId = responsibleIdRaw ? String(responsibleIdRaw).trim() : null;
  const nokiaId = get("NokiaID", "\\d+");
  const name = get("Name", ".+") || get("Account Name", ".+");

  // Name often appears at top of page: "You are here: ... Full Name" or first heading
  const nameFromBreadcrumb = text.match(/You are here:\s*[^\n]*\n\s*([^\n]+)/i);
  const displayName = (nameFromBreadcrumb && nameFromBreadcrumb[1].trim()) || name;

  return {
    name: displayName || name || email || "(Unknown)",
    email: email || "",
    title: businessTitle || null,
    orgUnit: team || division || businessGroup || null,
    team,
    division,
    businessGroup,
    level: team && team.match(/\(L\d+\)/)?.[0] || null,
    responsible: responsible || null,
    responsibleId: responsibleId || nokiaId || null,
    nokiaId: nokiaId || null
  };
}

/**
 * Try to parse response as JSON (single object or wrapper with user/profile key).
 */
function parseProfileFromJson(body) {
  const data = typeof body === "string" ? JSON.parse(body) : body;
  const profile = data.user || data.profile || data.person || data;
  if (!profile || typeof profile !== "object") return null;
  return {
    name: profile.name || profile.displayName || profile.Name || "",
    email: profile.email || profile.mail || profile.Email || "",
    title: profile.title || profile["Business Title"] || profile.jobTitle || null,
    orgUnit: profile.orgUnit || profile.Team || profile.Division || profile["Business Group"] || null,
    team: profile.Team || profile.team || null,
    division: profile.Division || profile.division || null,
    businessGroup: profile["Business Group"] || null,
    level: profile.level || profile.Level || null,
    responsible: profile.Responsible || profile.managerName || profile.responsible || null,
    responsibleId: profile["Responsible ID"] != null ? String(profile["Responsible ID"]) : (profile.managerId || null),
    nokiaId: profile.NokiaID != null ? String(profile.NokiaID) : null
  };
}

/**
 * Build minimal profile from requested email when directory returns 200 but parser misses fields.
 * Also scan HTML for the email string to confirm it's the right profile page.
 */
function buildProfileFromResponse(body, requestedEmail) {
  const trimmed = (body && String(body).trim()) || "";
  let profile = null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      profile = parseProfileFromJson(body);
    } catch (_) {}
  }
  if (!profile) profile = parseProfileFromHtml(body);
  if (!profile) profile = {};
  profile.email = profile.email || requestedEmail;
  if (!profile.name && requestedEmail) profile.name = requestedEmail.split("@")[0].replace(/[._]/g, " ") || requestedEmail;
  return profile;
}

/**
 * Fetch user profile from directory by email.
 * Base URL: https://directory.int.net.nokia.com/en/index.php
 * Tries GET with ?mail=, ?email=, ?search=, etc., then POST with same param names (form body).
 * If directory returns 200 we parse HTML/JSON and return profile (at least with that email).
 */
function fetchUserProfile(userEmail) {
  const email = String(userEmail || "").trim();
  console.log("[directory] fetchUserProfile called email=" + email);
  if (!email) return Promise.resolve(null);

  const config = getConfig();
  const baseUrl = config.baseUrl.startsWith("https") ? config.baseUrl : `https://${config.baseUrl.replace(/^\/\//, "")}`;
  console.log("[directory] baseUrl=" + baseUrl);
  const localPart = email.split("@")[0] || "";
  const surname = localPart.includes(".") ? localPart.split(".").pop() : localPart;

  // Directory may expect POST (form), not GET. Try POST first with email, then GET.
  const queryParamsToTry = [
    ["email", email],
    ["mail", email],
    ["search", email],
    ["q", email],
    ["query", email],
    ["searchterm", email],
    ["S", surname],
    ["uid", email]
  ];

  let firstResponseLogged = false;
  /** Sentinel: directory 302'd to OAuth → skip rest of directory and try Microsoft Graph */
  const OAUTH_REDIRECT = { _oauthRedirect: true };
  function handleResponse(res, body, resolve, logLabel) {
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    if (!firstResponseLogged) {
      firstResponseLogged = true;
      console.log("[directory] first response:", logLabel, "status=" + res.statusCode, "length=" + body.length, ok ? "-> using profile" : "-> no profile (try VPN / DIRECTORY_INSECURE)");
      if (!ok && body.length > 0 && body.length < 800) {
        console.log("[directory] body snippet:", String(body).replace(/\s+/g, " ").slice(0, 300));
      }
    }
    if (!ok) {
      resolve(null);
      return;
    }
    resolve(buildProfileFromResponse(body, email));
  }

  function doFetch(method, queryParam, queryValue) {
    return new Promise((resolve) => {
      let url;
      try {
        url = new URL(baseUrl);
      } catch (err) {
        console.log("[directory] URL parse error", err.message, "baseUrl=" + baseUrl);
        resolve(null);
        return;
      }
      let postBody = null;
      if (method === "GET") {
        url.searchParams.set(queryParam, String(queryValue));
      } else {
        postBody = `${encodeURIComponent(queryParam)}=${encodeURIComponent(String(queryValue))}`;
      }
      const fullUrl = url.toString();
      if (!firstResponseLogged) console.log("[directory] calling", method, fullUrl, postBody ? " body=" + postBody : "");

      const isHttps = url.protocol === "https:";
      const transport = isHttps ? https : http;
      const options = {
        method,
        headers: { Accept: "text/html, application/json" },
        agent: isHttps && config.insecure ? new https.Agent({ rejectUnauthorized: false }) : undefined
      };
      if (config.auth) options.headers.Authorization = config.auth;
      if (postBody) {
        options.headers["Content-Type"] = "application/x-www-form-urlencoded";
        options.headers["Content-Length"] = Buffer.byteLength(postBody);
      }

      const logLabel = method + " " + queryParam + "=" + (String(queryValue).length > 20 ? "..." : String(queryValue));
      const req = transport.request(url, options, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, url.toString()).toString();
            const isOAuth = /oauth2|azure|login|sso/i.test(redirectUrl);
            if (!firstResponseLogged) {
              console.log("[directory] 302 redirect ->", redirectUrl);
              if (isOAuth) console.log("[directory] Directory uses OAuth/SSO; will try Microsoft Graph if AZURE_* is set.");
            }
            if (isOAuth) {
              resolve(OAUTH_REDIRECT);
              return;
            }
            const opt2 = {
              method: "GET",
              headers: { Accept: "text/html, application/json", ...(config.auth && { Authorization: config.auth }) },
              agent: options.agent
            };
            const url2 = new URL(redirectUrl);
            const transport2 = url2.protocol === "https:" ? https : http;
            const req2 = transport2.request(url2, opt2, (res2) => {
              let body2 = "";
              res2.on("data", (c) => { body2 += c; });
              res2.on("end", () => handleResponse(res2, body2, resolve, logLabel + " (after redirect)"));
            });
            req2.on("error", () => resolve(null));
            req2.setTimeout(10000, () => { req2.destroy(); resolve(null); });
            req2.end();
            return;
          }
          handleResponse(res, body, resolve, logLabel);
        });
      });
      req.on("error", (err) => {
        console.log("[directory]", logLabel, "error", err.code || err.message);
        resolve(null);
      });
      req.setTimeout(15000, () => {
        console.log("[directory]", logLabel, "timeout");
        req.destroy();
        resolve(null);
      });
      req.end(postBody || undefined);
    });
  }

  function tryNext(tries, usePost) {
    if (tries.length === 0) return Promise.resolve(null);
    const [param, value] = tries[0];
    const method = usePost ? "POST" : "GET";
    return doFetch(method, param, value).then((profile) => {
      if (profile && profile.email) return profile;
      if (profile && profile._oauthRedirect) return profile;
      return tryNext(tries.slice(1), usePost);
    });
  }

  // Try POST first (directory form often uses POST), then GET
  return tryNext(queryParamsToTry, true)
    .then((profile) => {
      if (profile && profile.email) return profile;
      if (profile && profile._oauthRedirect) return profile;
      return tryNext(queryParamsToTry, false);
    })
    .then((profile) => {
      if (profile && profile.email) return profile;
      if (profile && profile._oauthRedirect) {
        const azure = getAzureGraphClient();
        if (azure.isConfigured()) {
          console.log("[directory] 302 to OAuth; fetching profile from Microsoft Graph for", email);
          return azure.fetchUserProfileByEmail(email);
        }
        console.log("[directory] Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in .env to fetch profile from Microsoft Graph.");
        return null;
      }
      const azure = getAzureGraphClient();
      if (azure.isConfigured()) {
        console.log("[directory] trying Microsoft Graph for", email);
        return azure.fetchUserProfileByEmail(email);
      }
      return null;
    });
}

module.exports = {
  fetchUserProfile,
  parseProfileFromHtml,
  parseProfileFromJson,
  getConfig
};
