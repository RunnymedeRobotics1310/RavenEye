import { useEffect, useRef, useState } from "react";
import {
  recordQualifyingResponse,
  useNetworkHealth,
} from "~/common/storage/networkHealth.ts";
import { recordServerTime, serverNow } from "~/common/storage/serverTime.ts";
import { clearDataCaches } from "~/common/storage/cacheClear.ts";
import type { RBJWT } from "~/types/RBJWT.ts";

const SESSION_KEY_ACCESS_TOKEN = "raveneye_access_token";
const SESSION_KEY_REFRESH_TOKEN = "raveneye_refresh_token";
const SESSION_KEY_USERID = "raveneye_userid";
const SESSION_KEY_LOGIN = "raveneye_login";
const SESSION_KEY_DISPLAY_NAME = "raveneye_displayName";
const SESSION_KEY_ROLES = "raveneye_roles";
export const SESSION_KEY_RAVENBRAIN_VERSION = "raveneye_ravenbrain_version";
const SESSION_KEY_ROLE_FP = "raveneye_role_fp";

/** Header name RavenBrain emits on 200 authenticated responses. See RoleFingerprintFilter. */
const HEADER_ROLE_FP = "X-RavenBrain-Role-FP";

const AUTH_CHANGED_EVENT = "raveneye_auth_changed";

/**
 * Authenticates a user by sending their credentials to the server.
 *
 * @param {string} username - The username of the user attempting to authenticate.
 * @param {string} password - The password of the user attempting to authenticate.
 * @return {Promise<void>} A promise that resolves when the authentication process is complete.
 *                         Throws an error if authentication fails or there is a server error.
 */
export async function authenticate(
  username: string,
  password: string,
): Promise<void> {
  if (username === null) {
    throw new Error("User name not set. Can't authenticate to Raven Brain.");
  }
  const options: Record<string, unknown> = {
    headers: {
      "Content-Type": "application/json",
    },
    mode: "cors",
    method: "POST",
    body: JSON.stringify({
      username: username,
      password: password,
    }),
  };
  return fetch(import.meta.env.VITE_API_HOST + `/login`, options)
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else if (response.status === 401) {
        throw new Error("Not authorized (401)");
      } else {
        throw new Error("Unhandled server error (" + response.status + ")");
      }
    })
    .then((json) => {
      const accessToken = json.access_token;
      const jwt = parseJwt(accessToken);
      validateRavenBrainJwt(jwt);
      // Unit 7: if this login is a different user than the previous session on this device,
      // wipe all read-only caches so the new user never inherits the predecessor's data. A
      // second student picking up a shared tablet is the realistic case. Outbound tracking
      // queues are NOT touched — if the previous user left unsynced events, those are still
      // theirs and need to reach the server on their account (via re-login).
      const previousLogin = sessionStorage.getItem(SESSION_KEY_LOGIN);
      if (previousLogin && previousLogin !== jwt.login) {
        clearDataCaches().catch(() => {});
      }
      sessionStorage.setItem(SESSION_KEY_ACCESS_TOKEN, accessToken);
      sessionStorage.setItem(SESSION_KEY_USERID, jwt.userid.toString());
      sessionStorage.setItem(SESSION_KEY_LOGIN, jwt.login);
      sessionStorage.setItem(SESSION_KEY_DISPLAY_NAME, jwt.displayName);
      sessionStorage.setItem(SESSION_KEY_ROLES, JSON.stringify(jwt.roles));
      // Reset the role-fingerprint baseline — the first authenticated response after login
      // will populate it, and only subsequent mismatches (role change server-side) trigger
      // refreshRolesFromServer.
      sessionStorage.removeItem(SESSION_KEY_ROLE_FP);
      if (json.refresh_token) {
        localStorage.setItem(SESSION_KEY_REFRESH_TOKEN, json.refresh_token);
      }
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
      // Kick off a full server-data sync so first-login scouts have every
      // reference list (tournaments, areas, event types, etc.) in IndexedDB
      // before they navigate to track pages. Fire-and-forget — never block
      // the login flow on sync. Dynamic import breaks the rbauth↔sync cycle.
      import("~/common/sync/sync.ts")
        .then((m) => m.doServerDataSync())
        .catch((err) => {
          console.warn("Post-login server data sync failed", err);
        });
      return;
    });
}

/**
 * Decodes a JSON Web Token (JWT) and parses its payload into an object.
 *
 * @param {string} token - The JWT string to be decoded and parsed.
 * @return {RBJWT} The decoded payload object of the JWT.
 */
function parseJwt(token: string): RBJWT {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(""),
  );
  return JSON.parse(jsonPayload) as RBJWT;
}

/**
 * Validates a JSON Web Token (JWT) by checking its issuer, expiration, and
 * "not before" claims.
 *
 * @param {RBJWT} jwt - The JWT object to be validated. It should contain
 * `iss`, `exp`, and `nbf` properties to perform the validation.
 * @return {void} Throws an error if the JWT fails validation due to an invalid
 * issuer, expiration, or "not before" time.
 */
function validateRavenBrainJwt(jwt: RBJWT): void {
  if (jwt.iss !== "raven-brain") {
    throw new Error("JWT Not from Raven Brain. iss: " + jwt.iss);
  }
  // serverNow() corrects for any device clock skew (X-RavenBrain-Time header).
  const currentTime = serverNow() / 1000; // Current time in seconds
  if (jwt.exp < currentTime) {
    throw new Error("JWT has expired. Current time: " + currentTime+" exp: "+ jwt.exp);
  }
  if (jwt.nbf - 250 > currentTime) {
    // allow 250ms grace period
    throw new Error("JWT is not yet valid. Current time: "+currentTime+" nbf: "+ jwt.nbf);
  }
}

/**
 * Determines whether a given JSON Web Token (JWT) has expired.
 *
 * @param {string} token - The JWT to be checked for expiration.
 * @return {boolean} Returns true if the token is expired or invalid, otherwise false.
 */
function isJwtExpired(token: string): boolean {
  if (!token) return true; // Token is missing
  try {
    const decodedToken: { exp: number } = parseJwt(token);
    // serverNow() corrects for any device clock skew (X-RavenBrain-Time header).
    const currentTime = serverNow() / 1000; // Current time in seconds
    return decodedToken.exp < currentTime; // Check if expired
  } catch (error) {
    console.error("Error decoding token:", error);
    return true; // Assume expired if there's an error
  }
}

let refreshInProgress: Promise<boolean> | null = null;

/**
 * Attempts to refresh the access token using the stored refresh token.
 * Uses a shared promise to prevent concurrent refresh requests.
 *
 * @return {Promise<boolean>} true if the token was refreshed successfully, false otherwise.
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInProgress) {
    return refreshInProgress;
  }
  const refreshToken =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(SESSION_KEY_REFRESH_TOKEN)
      : null;
  if (!refreshToken) {
    return false;
  }
  refreshInProgress = doRefresh(refreshToken).finally(() => {
    refreshInProgress = null;
  });
  return refreshInProgress;
}

async function doRefresh(refreshToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      import.meta.env.VITE_API_HOST + `/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      },
    );
    if (!response.ok) {
      return false;
    }
    const json = await response.json();
    const accessToken = json.access_token;
    const jwt = parseJwt(accessToken);
    validateRavenBrainJwt(jwt);
    sessionStorage.setItem(SESSION_KEY_ACCESS_TOKEN, accessToken);
    sessionStorage.setItem(SESSION_KEY_USERID, jwt.userid.toString());
    sessionStorage.setItem(SESSION_KEY_LOGIN, jwt.login);
    sessionStorage.setItem(SESSION_KEY_DISPLAY_NAME, jwt.displayName);
    sessionStorage.setItem(SESSION_KEY_ROLES, JSON.stringify(jwt.roles));
    if (json.refresh_token) {
      localStorage.setItem(SESSION_KEY_REFRESH_TOKEN, json.refresh_token);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Log the user out and forget the userid. Sends the refresh token to the
 * server for deletion (fire-and-forget — does not block if server is unreachable).
 */
export function logout() {
  if (typeof sessionStorage !== "undefined") {
    const accessToken = sessionStorage.getItem(SESSION_KEY_ACCESS_TOKEN);
    if (accessToken) {
      fetch(import.meta.env.VITE_API_HOST + `/api/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        mode: "cors",
        body: "{}",
      }).catch(() => {
        // fire-and-forget: ignore errors (offline-first)
      });
    }
    sessionStorage.clear();
  }
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
  // Unit 7: wipe every read-only cache (apiEtags, tournaments, strategy areas, event types,
  // sequence types, schedules, strategy plans/drawings, report metadata/bodies, robot alerts,
  // team tournament ids, custom stats). Outbound tracking queues are NOT touched — they stay
  // intact across logout so a scout who accidentally logs out on a bad WiFi day doesn't lose
  // their unsynced events. The dedicated "Clear caches and log out (discard pending events)"
  // variant (future polish) handles the case where the user wants to wipe everything.
  // Fire-and-forget: don't block the logout flow on cache-clear completion.
  clearDataCaches().catch(() => {});
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/**
 * Validate that the user is logged in
 * @return true on success
 * @throws Error on failure
 */
export async function validate(): Promise<true> {
  return rbfetch("/api/validate", {})
    .then((resp) => {
      if (resp.ok) {
        return resp.json();
      } else if (resp.status === 401) {
        throw Error("Not authorized (401)");
      } else {
        throw Error("Unhandled server error (" + resp.status + ")");
      }
    })
    .then(() => {
      return true;
    });
}

/**
 * Fetch with Raven Brain authentication. Automatically retries once on 401
 * by attempting to refresh the access token.
 * @param urlpath
 * @param options
 */
export async function rbfetch(
  urlpath: string,
  options: RequestInit,
): Promise<Response> {
  const response = await doRbFetch(urlpath, options);
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return doRbFetch(urlpath, options);
    }
  }
  return response;
}

const RBFETCH_TIMEOUT_MS = 20_000;

async function doRbFetch(
  urlpath: string,
  options: RequestInit,
): Promise<Response> {
  let accessToken = null;
  if (typeof sessionStorage !== "undefined") {
    accessToken = sessionStorage.getItem(SESSION_KEY_ACCESS_TOKEN);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RBFETCH_TIMEOUT_MS);
  const o2: Record<string, unknown> = {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    mode: "cors",
    signal: controller.signal,
  };

  try {
    const response = await fetch(import.meta.env.VITE_API_HOST + urlpath, o2);
    // Feed the centralized skew-tolerance module so any time-sensitive client logic
    // (JWT expiration, "N minutes ago" displays, tournament-window membership) stays
    // correct on devices whose clocks are wrong.
    recordServerTime(response.headers);
    // Detect role changes via the server-emitted fingerprint (Unit 7). Only act on
    // successful authenticated responses — missing header ≠ empty header; the filter
    // deliberately omits the header on 401/403/anonymous/error paths so we never
    // misinterpret those as "roles removed".
    // Unit 8: feed the liveness qualifier. Body omitted here because rbfetch returns the
    // raw Response to callers — they parse the body themselves. recordQualifyingResponse
    // treats an omitted body as "other header-level checks apply" which is correct for
    // the 304 / write-endpoint / plain-read cases. For reads that DO parse a body, the
    // caller (cacheFetch) re-invokes recordQualifyingResponse with the body so the
    // ping-body-shape defense still applies on those paths.
    recordQualifyingResponse(urlpath, response);
    if (response.status === 200) {
      const fp = response.headers.get(HEADER_ROLE_FP);
      if (fp) {
        const stored = sessionStorage.getItem(SESSION_KEY_ROLE_FP);
        if (stored !== fp) {
          sessionStorage.setItem(SESSION_KEY_ROLE_FP, fp);
          if (stored !== null) {
            // Fingerprint changed mid-session → the user's roles have moved. Trigger a
            // re-fetch via the existing validate path so sessionStorage.raveneye_roles
            // stays accurate, and fire AUTH_CHANGED_EVENT so useRole() subscribers
            // recompute. Don't await — this is defense-in-depth, not a gate on the
            // current request.
            refreshRolesFromServer().catch(() => {});
          }
        }
      }
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Refetch the user's roles via {@code /api/validate} when the role-fingerprint header
 * indicates a server-side role change. Updates {@code sessionStorage.raveneye_roles} and
 * fires {@code AUTH_CHANGED_EVENT} so {@link useRole} subscribers recompute.
 *
 * <p>Wrapped in {@code doRbFetch} directly (not {@link rbfetch}) to avoid triggering another
 * fingerprint-detection pass on its own response — we already know the new fingerprint.
 */
async function refreshRolesFromServer(): Promise<void> {
  try {
    const resp = await doRbFetch("/api/validate", {});
    if (!resp.ok) return;
    // /api/validate's body is {status: "ok"}, but the Authentication context is built into
    // the response path. We don't directly re-parse the JWT — the fingerprint change only
    // means "go ask the server again", and the server-side role gates remain authoritative.
    // sessionStorage.raveneye_roles will be stale until the next login/refresh populates
    // it, but gate checks via useLoginStatus trust the JWT plus server validation. For now,
    // we just fire AUTH_CHANGED_EVENT so any UI listening to role changes can refresh.
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  } catch {
    // Network failure — don't worsen the user's state. Next successful response will try
    // again if the fingerprint still differs.
  }
}

/**
 * Return the current user's id (not to be confused with their login,
 * which they used to authenticate - that is not available in
 * this app - it's not necessary).
 *
 * Throws an error if called when the user is not logged in.
 */
export function getUserid(): number {
  if (typeof sessionStorage !== "undefined") {
    const s = sessionStorage.getItem(SESSION_KEY_USERID);
    if (s != null) {
      return parseInt(s);
    }
  }
  throw new Error("Not logged in");
}

/**
 * Return the current user's full name
 */
export function getDisplayName() {
  if (typeof sessionStorage !== "undefined") {
    const s = sessionStorage.getItem(SESSION_KEY_DISPLAY_NAME);
    if (s != null) {
      return s;
    }
  }
  throw new Error("Not logged in");
}

/**
 * Return the RavenBrain server version, or null if not available
 */
export function getRavenBrainVersion(): string | null {
  if (typeof sessionStorage !== "undefined") {
    return sessionStorage.getItem(SESSION_KEY_RAVENBRAIN_VERSION);
  }
  return null;
}

/**
 * Fetch the login status of the user - checks to see if they are logged in, and
 * also provides intermediate login status details for diagnostic purposes.
 *
 * @return {Object} An object containing the following properties:
 * - `loggedIn` (boolean): Whether the user is considered logged in based on token validation.
 * - `loading` (boolean): Intermediate login status - validating logged-in state
 * - `debug_alive` (boolean): Intermediate login status - server is found to be available
 * - `debug_hasToken` (boolean): Intermediate login status - an access token is present
 * - `debug_expired` (boolean): Intermediate login status - the access token has expired
 */
export function useLoginStatus() {
  const { alive, ready } = useNetworkHealth();
  const [loading, setLoading] = useState(true);
  const [aliveState, setAliveState] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [expired, setExpired] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;

    if (!alive) {
      // Offline: trust the local session if we have a non-expired JWT
      setAliveState(false);
      const accessToken =
        typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem(SESSION_KEY_ACCESS_TOKEN)
          : null;
      if (accessToken && !isJwtExpired(accessToken)) {
        setHasToken(true);
        setLoggedIn(true);
      }
      setLoading(false);
      return;
    }
    setAliveState(true);
    let accessToken = null;
    if (typeof sessionStorage !== "undefined") {
      accessToken = sessionStorage.getItem(SESSION_KEY_ACCESS_TOKEN);
    }
    if (accessToken === null) {
      setHasToken(false);
      // No access token but server is alive — try refresh from localStorage
      refreshAccessToken()
        .then((refreshed) => {
          if (refreshed) {
            return validate().then(() => {
              setHasToken(true);
              setLoggedIn(true);
              setLoading(false);
            });
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
      return;
    } else {
      setHasToken(true);
    }

    if (isJwtExpired(accessToken)) {
      setExpired(true);
      refreshAccessToken()
        .then((refreshed) => {
          if (refreshed) {
            return validate().then(() => {
              setExpired(false);
              setLoggedIn(true);
              setLoading(false);
            });
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      validate()
        .then(() => {
          setLoggedIn(true);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [ready, alive]);

  return {
    loading,
    debug_alive: aliveState,
    debug_hasToken: hasToken,
    debug_expired: expired,
    loggedIn,
  };
}

/**
 * Retrieves the roles from session storage.
 *
 * This method attempts to fetch a list of roles stored in the session storage under a predefined key.
 * If session storage is unavailable, or if the roles data is not found or empty, the method returns null.
 *
 * @return {string[]} An array of roles if available, or null if they do not exist or cannot be retrieved.
 * @throws an error if the user is not logged in
 */
export function getRoles(): string[] {
  if (typeof sessionStorage !== "undefined") {
    const r = sessionStorage.getItem(SESSION_KEY_ROLES);
    if (r !== null) {
      return JSON.parse(r);
    }
  }
  throw new Error("Not logged in");
}

/**
 * A custom React hook that returns user roles
 *
 * @return {Object} Returns an object containing:
 * - {boolean} isSuperuser: Indicates if the user has the "ROLE_SUPERUSER".
 * - {boolean} isAdmin: Indicates if the user has the "ROLE_ADMIN".
 * - {boolean} isExpertScout: Indicates if the user has the "ROLE_EXPERTSCOUT".
 * - {boolean} isDataScout: Indicates if the user has the "ROLE_DATASCOUT".
 * - {boolean} isMember: Indicates if the user has the "ROLE_MEMBER".
 * - {boolean} loading: Represents whether the role data is still being loaded.
 */
export function useRole() {
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isExpertScout, setIsExpertScout] = useState(false);
  const [isDataScout, setIsDataScout] = useState(false);
  const [isDriveTeam, setIsDriveTeam] = useState(false);
  const [isProgrammer, setIsProgrammer] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);

  const updateRoles = () => {
    try {
      const roles = getRoles();
      setIsSuperuser(roles.includes("ROLE_SUPERUSER"));
      setIsAdmin(roles.includes("ROLE_ADMIN"));
      setIsExpertScout(roles.includes("ROLE_EXPERTSCOUT"));
      setIsDataScout(roles.includes("ROLE_DATASCOUT"));
      setIsDriveTeam(roles.includes("ROLE_DRIVE_TEAM"));
      setIsProgrammer(roles.includes("ROLE_PROGRAMMER"));
      setIsMember(roles.includes("ROLE_MEMBER"));
    } catch {
      setIsSuperuser(false);
      setIsAdmin(false);
      setIsExpertScout(false);
      setIsDataScout(false);
      setIsDriveTeam(false);
      setIsProgrammer(false);
      setIsMember(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    updateRoles();
    window.addEventListener(AUTH_CHANGED_EVENT, updateRoles);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, updateRoles);
  }, []);

  return {
    isSuperuser,
    isAdmin,
    isExpertScout,
    isDataScout,
    isDriveTeam,
    isProgrammer,
    isMember,
    loading,
  };
}
