import Cookies from "js-cookie";

export const TOKEN_COOKIE = "saludplus_token";

export function getToken() {
  return Cookies.get(TOKEN_COOKIE);
}

export function saveToken(token: string, expiresInSeconds: number) {
  Cookies.set(TOKEN_COOKIE, token, {
    expires: expiresInSeconds / 86_400,
    sameSite: "strict",
    secure: window.location.protocol === "https:",
    path: "/",
  });
}

export function clearToken() {
  Cookies.remove(TOKEN_COOKIE, { path: "/" });
}
