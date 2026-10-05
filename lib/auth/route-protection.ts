export const PROTECTED_PREFIXES = ["/dashboard", "/courses", "/tasks", "/schedule", "/advisor"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function shouldRedirectToLogin(pathname: string, isAuthenticated: boolean): boolean {
  return isProtectedPath(pathname) && !isAuthenticated;
}
