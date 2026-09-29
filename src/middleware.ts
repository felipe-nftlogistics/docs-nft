import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Proteção extra para rotas de admin
    if (path.startsWith("/dashboard/admin") && !token?.isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // A proteção básica (exigir login) para as rotas no matcher
    // já é feita pelo `authorized: ({ token }) => !!token`
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  // Rotas que o middleware vai interceptar
  matcher: [
    "/dashboard/:path*",
    // Caso existam rotas de API que você também queira proteger globalmente:
    // "/api/categories/:path*",
    // "/api/docs/:path*", 
    // "/api/gallery/:path*",
  ],
};
