// Next.js 16 renamed the `middleware` file convention to `proxy` (Node runtime).
// NextAuth's `auth` wrapper runs the `authorized` callback for each request to
// gate access; unauthenticated users are redirected to the sign-in page.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    // Run on everything except Next internals, the auth API, and static assets.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|.*\\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest)$).*)",
  ],
};
