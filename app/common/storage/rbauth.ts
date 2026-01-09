import { useEffect, useState } from "react";
import { isJwtExpired, parseJwt } from "~/common/util.ts";
import { ping } from "~/common/storage/rb.ts";

const ACCESS_TOKEN_KEY = "ravenbrain_access_token";
const ROLES_KEY = "ravenbrain_roles";
const USERID_KEY = "ravenbrain_user_id";
const FULL_NAME_KEY = "ravenbrain_full_name";

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
      const payload = parseJwt(accessToken);
      localStorage.setItem(USERID_KEY, username);
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      sessionStorage.setItem(FULL_NAME_KEY, payload.fullName);
      sessionStorage.setItem(ROLES_KEY, JSON.stringify(payload.roles));
      return;
    });
}

/**
 * Log the user out and forget the userid
 */
export function logout() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(FULL_NAME_KEY);
    sessionStorage.removeItem(ROLES_KEY);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(USERID_KEY);
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
    accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
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
 * Return the login user id
 */
export function getUserid() {
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(USERID_KEY);
  }
  return null;
}

/**
 * Return the current user's full name
 */
export function getFullName() {
  if (typeof sessionStorage !== "undefined") {
    return sessionStorage.getItem(FULL_NAME_KEY);
  }
  return null;
}

export function useLoginStatus() {
  const [loading, setLoading] = useState(true);
  const [alive, setAlive] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
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
          accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        }
        if (accessToken === null) {
          setAuthenticated(false);
          setLoading(false);
          return;
        } else {
          setAuthenticated(true);
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

  return { loading, alive, authenticated, expired, loggedIn };
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
 * - {null|string} error: Contains an error message if roles fail to load, null otherwise.
 */
export function useRole() {
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isExpertScout, setIsExpertScout] = useState(false);
  const [isDataScout, setIsDataScout] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  useEffect(() => {
    function getRoles() {
      if (typeof sessionStorage === "undefined") {
        return null;
      }
      const r = sessionStorage.getItem(ROLES_KEY);
      if (r === null || r === "") {
        return null;
      } else {
        return JSON.parse(r);
      }
    }

    try {
      const roles = getRoles();
      if (roles) {
        setIsSuperuser(roles.includes("ROLE_SUPERUSER"));
        setIsAdmin(roles.includes("ROLE_ADMIN"));
        setIsExpertScout(roles.includes("ROLE_EXPERTSCOUT"));
        setIsDataScout(roles.includes("ROLE_DATASCOUT"));
        setIsMember(roles.includes("ROLE_MEMBER"));
      }
      setLoading(false);
    } catch (e) {
      setError("Failed to load roles: " + e);
      setLoading(false);
    }
  }, []);
  return {
    isSuperuser,
    isAdmin,
    isExpertScout,
    isDataScout,
    isMember,
    loading,
    error,
  };
}
