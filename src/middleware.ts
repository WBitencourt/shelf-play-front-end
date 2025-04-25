import { NextResponse, type NextRequest, type MiddlewareConfig } from 'next/server';

const publicRoutes = [
  { path: '/auth/challenges/new_password_required', whenAuthenticated: 'redirect' },
  { path: '/auth/login', whenAuthenticated: 'redirect' },
  { path: '/auth/password_reset', whenAuthenticated: 'redirect' },
  { path: '/auth/password_reset_confirm', whenAuthenticated: 'redirect' },
  { path: '/test', whenAuthenticated: 'next' },
] as const

const REDIRECT_WHEN_AUTHENTICATED = '/home'
const REDIRECT_WHEN_NOT_AUTHENTICATED = '/auth/login'

export async function middleware(request: NextRequest) {
  // console.log('middleware', new Date().toString(), request.url)
  // return NextResponse.next();

  const path = request.nextUrl.pathname;
  const publicRoute = publicRoutes.find(route => route.path === path);

  const authRefreshToken = request.cookies.get('everest_server.refresh_token');
  const authToken = request.cookies.get('everest_server.access_token');

  const haveAuthToken = authToken && authToken.value.length > 0;
  const haveRefreshToken = authRefreshToken && authRefreshToken.value.length > 0;

  const haveCredentials = (haveRefreshToken && haveAuthToken) || (haveRefreshToken && !haveAuthToken);

  if(!haveCredentials && publicRoute) {
    return NextResponse.next();
  }

  if(!haveCredentials && !publicRoute) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = REDIRECT_WHEN_NOT_AUTHENTICATED;

    const response = NextResponse.next()

    response.cookies.set({
      name: 'everest.intended_url_after_login',
      value: path,
      path: '/',
      secure: false,
      httpOnly: false,
    })

    NextResponse.redirect(redirectUrl);

    return response;
  }

  if (haveCredentials && publicRoute && publicRoute.whenAuthenticated === 'redirect') {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = REDIRECT_WHEN_AUTHENTICATED;

    return NextResponse.redirect(redirectUrl);
  }

  if (haveCredentials && !publicRoute) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config: MiddlewareConfig = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],

}
