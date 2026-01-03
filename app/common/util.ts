export function parseJwt(token: string): any {
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
  return JSON.parse(jsonPayload);
}

export function isJwtExpired(token: string): boolean {
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
