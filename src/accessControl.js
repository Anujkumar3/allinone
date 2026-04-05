const TEAM_ACCESS_ALLOWLIST = [
  "ajay.balakrishnan@nokia.com",
  "anuj.kumar@nokia.com",
  "ambresh.a.ext@nokia.com",
  "amulya.ps.ext@nokia.com",
  "biswabhusan.mishra@nokia.com",
  "chamarthi.dedeepya@nokia.com",
  "cheruvu.tejaswini@nokia.com",
  "deepak.2.n@nokia.com",
  "deepalaxmi.hegde_k@nokia.com",
  "deepalaxmi.hegde.k@nokia.com",
  "dhanush.n@nokia.com",
  "dileep.n.ext@nokia.com",
  "eliza.priyadarshinee@nokia.com",
  "jayamani.t.ext@nokia.com",
  "kavya.1.m@nokia.com",
  "kiran.mohan_e@nokia.com",
  "krishnama_bala.srinivas_prabhu@nokia.com",
  "mohammed.mizfar_n@nokia.com",
  "naveen.uppaluru.ext@nokia.com",
  "nidhi.balachandra_bhat@nokia.com",
  "prabhulinga.prabhulinga@nokia.com",
  "pramod.haviruth@nokia.com",
  "priya.s_m@nokia.com",
  "priyanka.1.s.ext@nokia.com",
  "puneeth.g_l@nokia.com",
  "rajneesh.yadav@nokia.com",
  "ravi.prasad@nokia.com",
  "richi.mathur@nokia.com",
  "s.komathy@nokia.com",
  "sainath.nair@nokia.com",
  "shreyash.sahu.ext@nokia.com",
  "sindhu.murugesan.ext@nokia.com",
  "stefano.mauri@nokia.com",
  "tejraj.choudhary@nokia.com",
  "vagish.gupta.ext@nokia.com",
  "yasaswini.vissa@nokia.com"
];

const ALLOWED_SET = new Set(TEAM_ACCESS_ALLOWLIST.map((email) => String(email).trim().toLowerCase()));

function toCompact(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9]/g, "");
}

function toCompactNoDigits(value) {
  return toCompact(value).replace(/[0-9]/g, "");
}

const ALLOWED_BY_COMPACT = new Map();
const ALLOWED_BY_COMPACT_NO_DIGITS = new Map();

TEAM_ACCESS_ALLOWLIST.forEach((email) => {
  const normalized = String(email || "").trim().toLowerCase();
  const compact = toCompact(normalized);
  const compactNoDigits = toCompactNoDigits(normalized);
  if (compact && !ALLOWED_BY_COMPACT.has(compact)) {
    ALLOWED_BY_COMPACT.set(compact, normalized);
  }
  if (compactNoDigits && !ALLOWED_BY_COMPACT_NO_DIGITS.has(compactNoDigits)) {
    ALLOWED_BY_COMPACT_NO_DIGITS.set(compactNoDigits, normalized);
  }
});

function resolveAllowedEmailForIdentity(...values) {
  for (const raw of values) {
    if (Array.isArray(raw)) {
      const resolved = resolveAllowedEmailForIdentity(...raw);
      if (resolved) return resolved;
      continue;
    }
    const value = String(raw || "").trim().toLowerCase();
    if (!value) continue;
    if (ALLOWED_SET.has(value)) return value;
    const compact = toCompact(value);
    if (compact && ALLOWED_BY_COMPACT.has(compact)) {
      return ALLOWED_BY_COMPACT.get(compact);
    }
    const compactNoDigits = toCompactNoDigits(value);
    if (compactNoDigits && ALLOWED_BY_COMPACT_NO_DIGITS.has(compactNoDigits)) {
      return ALLOWED_BY_COMPACT_NO_DIGITS.get(compactNoDigits);
    }
  }
  return "";
}

function isAllowedUserEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  if (ALLOWED_SET.has(normalized)) return true;
  return Boolean(resolveAllowedEmailForIdentity(normalized));
}

module.exports = {
  TEAM_ACCESS_ALLOWLIST,
  isAllowedUserEmail,
  resolveAllowedEmailForIdentity
};
