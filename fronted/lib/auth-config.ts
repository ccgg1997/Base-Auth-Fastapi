export const AUTH_COOKIE_NAME = "docker_c_session";
export const AUTH_REQUEST_TIMEOUT_MS = 10_000;

export function getBackendUrl() {
  return (process.env.BACKEND_URL ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
}
