export interface TenantContext {
  tenantId: string;
}

// For client-side, we'll use a simple global variable
// In a real app, you might use localStorage or sessionStorage
let currentTenantId: string | null = null;

export async function getTenantId(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    // Client-side: use localStorage
    const tenantId = localStorage.getItem('tenantId');
    return tenantId;
  }

  // Server-side: try to get from cookies first, then global variable
  try {
    // For server-side rendering, we need to get tenant from cookies
    // This is a simplified approach - in production you'd use proper session handling
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (authToken) {
      // Decode JWT to get tenant info
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'fallback-secret') as any;
      return decoded.tenantId;
    }
  } catch (error) {
    // If cookie parsing fails, fall back to global variable
    console.log('Cookie parsing failed, using global variable');
  }

  return currentTenantId;
}

export async function getCurrentUser() {
  if (typeof window !== 'undefined') {
    // Client-side: not available
    return null;
  }

  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (authToken) {
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'fallback-secret') as any;
      return {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        email: decoded.email,
        role: decoded.role,
      };
    }
  } catch (error) {
    console.log('Token verification failed');
  }

  return null;
}

export function setTenantId(tenantId: string): void {
  if (typeof window !== 'undefined') {
    // Client-side: use localStorage
    localStorage.setItem('tenantId', tenantId);
  } else {
    // Server-side: use global variable
    currentTenantId = tenantId;
  }
}

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  const previousTenantId = currentTenantId;
  currentTenantId = tenantId;
  try {
    return fn();
  } finally {
    currentTenantId = previousTenantId;
  }
}

export function withTenant<T extends any[], R>(
  fn: (tenantId: string, ...args: T) => R
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    const user = await getCurrentUser();
    if (user) {
      // Use authenticated user's tenant
      return fn(user.tenantId, ...args);
    }

    // For server-side operations without auth, try to get tenant from localStorage (client-side)
    // This is a fallback for development/testing
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : currentTenantId;
    if (!tenantId) {
      throw new Error('Authentication required');
    }
    return fn(tenantId, ...args);
  };
}