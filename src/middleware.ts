import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パス：トップ、スタッフ選択、静的アセット
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/select-staff") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);

  if (isPublic) return NextResponse.next();

  // クッキーで認証
  const staffId = request.cookies.get("selected_staff_id")?.value;
  if (!staffId) {
    const url = request.nextUrl.clone();
    url.pathname = "/select-staff";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
