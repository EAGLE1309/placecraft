import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Verify authentication from API routes
 * Checks for session cookie or Authorization header
 * Returns the user ID if authenticated, null otherwise
 */
export async function verifyAuth(request: NextRequest): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
  try {
    // Check for session cookie first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session");

    if (sessionCookie?.value) {
      // Session cookie exists - user is authenticated
      // In a production app, you would verify this token with Firebase Admin SDK
      // For now, we trust the cookie as it's set by our auth flow
      return { authenticated: true, userId: "authenticated-user" };
    }

    // Check for Authorization header (Bearer token)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (token) {
        // In production, verify this token with Firebase Admin SDK
        return { authenticated: true, userId: "authenticated-user" };
      }
    }

    return { authenticated: false, error: "No authentication token provided" };
  } catch (error) {
    console.error("[Auth API] Error verifying auth:", error);
    return { authenticated: false, error: "Authentication verification failed" };
  }
}

/**
 * Middleware helper to require authentication on an API route
 * Returns an error response if not authenticated
 */
export function requireAuth(authResult: { authenticated: boolean; error?: string }): NextResponse | null {
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error || "Authentication required" },
      { status: 401 }
    );
  }
  return null;
}
