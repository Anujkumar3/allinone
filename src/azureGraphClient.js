/**
 * Fetch user profile from Microsoft Graph API using Azure AD auth.
 * Use when directory redirects to Azure login (OAuth): get a token and call Graph instead.
 *
 * Two options:
 * A) Client credentials (recommended): app-only token, can look up any user by email.
 *    Set: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
 *    App needs application permission User.Read.All (admin consent).
 * B) Resource Owner Password (ROPC): token for one user, then read that user's profile.
 *    Set: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, DIRECTORY_USER, DIRECTORY_PASSWORD
 *    ROPC must be enabled for the app; MFA accounts may fail.
 */

const https = require("https");

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || "5d471751-9675-428d-917b-70f44f9630b0";
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || "";
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || "";
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

function postForm(url, params) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = new URLSearchParams(params).toString();
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body)
      }
    };
    const req = https.request(
      u,
      options,
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
            else reject(new Error(json.error_description || json.error || data));
          } catch (e) {
            reject(new Error(data || "Invalid response"));
          }
        });
      }
    );
    req.on("error", reject);
    req.end(body);
  });
}

/**
 * Get access token using client credentials (app-only).
 */
function getTokenClientCredentials() {
  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) return Promise.resolve(null);
  const url = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
  return postForm(url, {
    grant_type: "client_credentials",
    client_id: AZURE_CLIENT_ID,
    client_secret: AZURE_CLIENT_SECRET,
    scope: GRAPH_SCOPE
  })
    .then((r) => r.access_token)
    .catch((e) => {
      console.log("[azure] client_credentials token error:", e.message);
      return null;
    });
}

/**
 * Get access token using Resource Owner Password Credentials (user login).
 * Requires DIRECTORY_USER and DIRECTORY_PASSWORD; app must allow ROPC.
 */
function getTokenROPC() {
  const user = process.env.DIRECTORY_USER || process.env.DIRECTORY_EMAIL || "";
  const password = process.env.DIRECTORY_PASSWORD || "";
  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !user || !password) return Promise.resolve(null);
  const url = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
  return postForm(url, {
    grant_type: "password",
    client_id: AZURE_CLIENT_ID,
    client_secret: AZURE_CLIENT_SECRET,
    scope: GRAPH_SCOPE,
    username: user,
    password: password
  })
    .then((r) => r.access_token)
    .catch((e) => {
      console.log("[azure] ROPC token error:", e.message);
      return null;
    });
}

function getJson(url, accessToken) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      u,
      {
        method: "GET",
        headers: { Authorization: "Bearer " + accessToken, Accept: "application/json" }
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          if (res.statusCode === 404) {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(data || "Invalid response"));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

/**
 * Map Microsoft Graph user to our profile shape.
 */
function graphUserToProfile(user) {
  const email = (user && (user.mail || user.userPrincipalName)) || "";
  if (!user || !email) return null;
  const manager = user.manager && typeof user.manager === "object" ? user.manager : null;
  return {
    name: user.displayName || email,
    email: email,
    title: user.jobTitle || null,
    orgUnit: user.department || user.officeLocation || null,
    team: user.department || null,
    division: null,
    businessGroup: null,
    level: null,
    responsible: manager ? manager.displayName || null : null,
    responsibleId: manager && manager.id ? manager.id : null,
    nokiaId: user.id || null
  };
}

/**
 * Fetch user profile from Microsoft Graph by email.
 * Tries client_credentials first (look up any user), then ROPC (profile of the logged-in user only).
 */
function fetchUserProfileByEmail(email) {
  const mail = String(email || "").trim();
  if (!mail) return Promise.resolve(null);

  return getTokenClientCredentials().then((token) => {
    if (token) {
      const filter = encodeURIComponent("mail eq '" + mail.replace(/'/g, "''") + "'");
      const url = `https://graph.microsoft.com/v1.0/users?$filter=${filter}&$select=id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation&$expand=manager($select=id,displayName)`;
      return getJson(url, token).then((resp) => {
        const users = resp && resp.value && resp.value.length ? resp.value : [];
        const user = users[0] || null;
        return graphUserToProfile(user);
      }).catch((e) => {
        console.log("[azure] Graph request error:", e.message);
        return null;
      });
    }
    return getTokenROPC().then((token) => {
      if (!token) return null;
      return getJson("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,jobTitle,department,officeLocation", token)
        .then((user) => {
          if (user && user.mail && user.mail.toLowerCase() === mail.toLowerCase()) return graphUserToProfile(user);
          return null;
        })
        .catch((e) => {
          console.log("[azure] Graph /me error:", e.message);
          return null;
        });
    });
  });
}

function isConfigured() {
  return !!(AZURE_CLIENT_ID && AZURE_CLIENT_SECRET);
}

/**
 * Fetch calendar events for a user (Outlook/Microsoft 365) for a date range.
 * Requires application permission Calendars.Read (admin consent) when using client_credentials.
 * With ROPC, only the signed-in user's calendar is readable (delegated Calendars.Read).
 */
function fetchCalendarEvents(email, startDateTime, endDateTime) {
  const start = startDateTime ? new Date(startDateTime).toISOString() : null;
  const end = endDateTime ? new Date(endDateTime).toISOString() : null;
  if (!start || !end) return Promise.resolve({ configured: false, events: [], message: "Missing start or end date." });

  return getTokenClientCredentials().then((token) => {
    if (!token) return { configured: false, events: [], message: "Azure Graph not configured or no token." };
    const user = encodeURIComponent(email);
    const params = new URLSearchParams({ startDateTime: start, endDateTime: end });
    const url = `https://graph.microsoft.com/v1.0/users/${user}/calendarView?${params.toString()}&$select=subject,start,end,location,isAllDay,isOnlineMeeting,onlineMeetingProvider,onlineMeeting,onlineMeetingUrl,webLink`;
    return getJson(url, token)
      .then((resp) => {
        const events = (resp && resp.value) ? resp.value.map((e) => ({
          id: e.id || null,
          subject: e.subject || "(No title)",
          start: e.start && e.start.dateTime,
          end: e.end && e.end.dateTime,
          isAllDay: e.isAllDay || false,
          location: e.location && e.location.displayName || null,
          isOnlineMeeting: Boolean(e.isOnlineMeeting),
          onlineMeetingProvider: e.onlineMeetingProvider || null,
          teamsJoinUrl: (e.onlineMeeting && e.onlineMeeting.joinUrl) || e.onlineMeetingUrl || null,
          webLink: e.webLink || null,
          isTeamsMeeting: Boolean(
            (e.onlineMeeting && e.onlineMeeting.joinUrl) ||
            e.onlineMeetingUrl ||
            String(e.onlineMeetingProvider || "").toLowerCase().includes("teams")
          )
        })) : [];
        return { configured: true, events };
      })
      .catch((err) => {
        console.log("[azure] calendarView error:", err && err.message);
        return { configured: true, events: [], message: err && err.message ? String(err.message) : "Calendar request failed." };
      });
  });
}

module.exports = {
  fetchUserProfileByEmail,
  fetchCalendarEvents,
  getTokenClientCredentials,
  getTokenROPC,
  isConfigured
};
