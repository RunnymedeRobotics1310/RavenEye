import { useEffect, useState } from "react";
import { ping } from "~/common/storage/rb.ts";
import type { RBJWT } from "~/types/RBJWT.ts";

const SESSION_KEY_ACCESS_TOKEN = "raveneye_access_token";
const SESSION_KEY_USERID = "raveneye_userid";
const SESSION_KEY_LOGIN = "raveneye_login";
const SESSION_KEY_DISPLAY_NAME = "raveneye_displayName";
const SESSION_KEY_ROLES = "raveneye_roles";
export const SESSION_KEY_RAVENBRAIN_VERSION = "raveneye_ravenbrain_version";

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
  const currentTime = Date.now() / 1000; // Current time in seconds
  if (jwt.exp < currentTime) {
    throw new Error("JWT has expired. Current time: " + currentTime+" exp: "+ jwt.exp);
  }
  if (jwt.nbf - 2 > currentTime) {
    // allow 2ms grace period
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
    const currentTime = Date.now() / 1000; // Current time in seconds
    return decodedToken.exp < currentTime; // Check if expired
  } catch (error) {
    console.error("Error decoding token:", error);
    return true; // Assume expired if there's an error
  }
}

/**
 * Log the user out and forget the userid
 */
export function logout() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.clear();
  }
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
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
 * Fetch with Raven Brain authentication
 * @param urlpath
 * @param options
 */
export async function rbfetch(
  urlpath: string,
  options: RequestInit,
): Promise<Response> {
  let accessToken = null;
  if (typeof sessionStorage !== "undefined") {
    accessToken = sessionStorage.getItem(SESSION_KEY_ACCESS_TOKEN);
  }
  const o2: Record<string, unknown> = {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  o2.mode = "cors";

  return fetch(import.meta.env.VITE_API_HOST + urlpath, o2);
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
  const [loading, setLoading] = useState(true);
  const [alive, setAlive] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [expired, setExpired] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    ping()
      .then((result) => {
        if (!result) {
          setAlive(false);
          setLoading(false);
          return;
        }
        setAlive(true);
        let accessToken = null;
        if (typeof sessionStorage !== "undefined") {
          accessToken = sessionStorage.getItem(SESSION_KEY_ACCESS_TOKEN);
        }
        if (accessToken === null) {
          setHasToken(false);
          setLoading(false);
          return;
        } else {
          setHasToken(true);
        }

        if (isJwtExpired(accessToken)) {
          setExpired(true);
          setLoading(false);
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
      })
      .catch(() => {
        setAlive(false);
        setLoading(false);
      });
  }, []);

  return {
    loading,
    debug_alive: alive,
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
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const roles = getRoles();
    if (roles) {
      setIsSuperuser(roles.includes("ROLE_SUPERUSER"));
      setIsAdmin(roles.includes("ROLE_ADMIN"));
      setIsExpertScout(roles.includes("ROLE_EXPERTSCOUT"));
      setIsDataScout(roles.includes("ROLE_DATASCOUT"));
      setIsMember(roles.includes("ROLE_MEMBER"));
    }
    setLoading(false);
  }, []);
  return {
    isSuperuser,
    isAdmin,
    isExpertScout,
    isDataScout,
    isMember,
    loading,
  };
}
