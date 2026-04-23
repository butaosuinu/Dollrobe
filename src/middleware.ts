import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/garments",
  "/dolls",
  "/scan",
  "/locations",
  "/archive",
  "/digest",
  "/print",
  "/nfc-write",
];

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

const isProtectedPath = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

const hasSessionCookie = (req: NextRequest): boolean =>
  SESSION_COOKIE_NAMES.some((name) => req.cookies.get(name) !== undefined);

export const middleware = (req: NextRequest): NextResponse => {
  const { pathname, search } = req.nextUrl;
  const authed = hasSessionCookie(req);

  if (authed && (pathname === "/" || pathname === "/login")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!authed && isProtectedPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!api|trpc|_next/static|_next/image|serwist|favicon.ico|manifest.json|icon.png|apple-icon.png|icons/|lp/|opencv.js|opencv_js.wasm|.*\\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico|woff|woff2|ttf|otf|wasm|js|css|map)$).*)",
  ],
};
