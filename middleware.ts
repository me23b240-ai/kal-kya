import { NextRequest, NextResponse } from "next/server";

// Only "/" ever auto-redirects, and only based on the visitor's own last choice.
// Visiting /solo directly is always honoured as-is, so there is no redirect loop.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/" && req.cookies.get("kalkya_mode")?.value === "single") {
    return NextResponse.redirect(new URL("/solo", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
