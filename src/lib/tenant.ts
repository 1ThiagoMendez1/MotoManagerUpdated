export async function getCurrentUser() {
  console.log('🔍 getCurrentUser called (client-safe version)');
  if (typeof window !== 'undefined') {
    console.log('Client-side, returning null');
    return null;
  }

  // For client-side compatibility, return null
  // The actual authentication is handled in server actions
  return null;
}

export function withAuth<T extends any[], R>(
  fn: (...args: T) => R
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    console.log('🔄 withAuth called');

    // Import the server-side auth function dynamically to avoid client-side execution
    const { getCurrentUserServer } = await import('./auth-server');
    const user = await getCurrentUserServer();
    console.log('User from getCurrentUserServer:', user);

    if (!user) {
      throw new Error('Authentication required');
    }

    return fn(...args);
  };
}