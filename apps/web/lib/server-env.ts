export function serverApiUrl(): string {
  return process.env["API_URL"] ?? "http://127.0.0.1:8000";
}

export function serverKdsToken(): string {
  return process.env["KDS_TOKEN"] ?? "dev-kds-token";
}
