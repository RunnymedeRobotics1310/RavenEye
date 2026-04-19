import { useEffect, useRef, useState } from "react";
import { useNetworkHealth } from "~/common/storage/networkHealth.ts";
import { recordServerTime, serverNow } from "~/common/storage/serverTime.ts";
import type { RBJWT } from "~/types/RBJWT.ts";

const SESSION_KEY_ACCESS_TOKEN = "raveneye_access_token";
const SESSION_KEY_REFRESH_TOKEN = "raveneye_refresh_token";
const SESSION_KEY_USERID = "raveneye_userid";
const SESSION_KEY_LOGIN = "raveneye_login";
const SESSION_KEY_DISPLAY_NAME = "raveneye_displayName";
const SESSION_KEY_ROLES = "raveneye_roles";
export const SESSION_KEY_RAVENBRAIN_VERSION = "raveneye_ravenbrain_version";

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
      sessionStorage.setItem(SESSION_KEY_ACCESS_TOKEN, accessToken);
      sessionStorage.setItem(SESSION_KEY_USERID, jwt.userid.toString());
      sessionStorage.setItem(SESSION_KEY_LOGIN, jwt.login);
      sessionStorage.setItem(SESSION_KEY_DISPLAY_NAME, jwt.displayName);
      sessionStorage.setItem(SESSION_KEY_ROLES, JSON.stringify(jwt.roles));
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
    return response;
  } finally {
    clearTimeout(timer);
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
