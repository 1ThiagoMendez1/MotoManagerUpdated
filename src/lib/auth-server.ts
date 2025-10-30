import prisma from './prisma';

export async function getCurrentUserServer() {
  console.log('🔍 getCurrentUserServer called');
  if (typeof window !== 'undefined') {
    console.log('Client-side, returning null');
    return null;
  }

  try {
    console.log('Server-side, importing next/headers');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    console.log('Auth token present:', !!authToken);

    if (authToken) {
      console.log('Verifying JWT');
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'fallback-secret') as any;
      console.log('JWT decoded:', decoded);

      console.log('Querying user from DB');
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
      console.log('User found:', !!user);
      return user ? {
        userId: user.id,
        email: user.email,
        role: user.role,
      } : null;
    }
  } catch (error) {
    console.log('Error in getCurrentUserServer:', error);
  }

  return null;
}