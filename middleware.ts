export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/projects/:path*",
    "/discover/:path*",
    "/tools/:path*",
    "/session/:path*",
    "/tools/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/api/projects/:path*",
    "/api/outreach/:path*",
    "/api/settings/:path*",
    "/api/billing/:path*",
    "/api/stripe/:path*",
    "/api/discover/:path*",
  ],
};
