import { cookies } from 'next/headers';
import { UserRole } from '@/types';

export interface ServerAuthData {
  isAuthenticated: boolean;
  token: string | null;
  role: UserRole | null;
  userName: string | null;
  userProfilePic: string | null;
}

export async function getServerAuth(): Promise<ServerAuthData> {
  const cookieStore = await cookies();
  
  const token = cookieStore.get('accessToken')?.value || null;
  const role = cookieStore.get('userRole')?.value as UserRole | null;
  const userName = cookieStore.get('userName')?.value || null;
  const userProfilePic = cookieStore.get('userProfilePic')?.value || null;

  const isAuthenticated = Boolean(
    token && (role === 'ADMIN' || role === 'SUPER_ADMIN')
  );

  return {
    isAuthenticated,
    token,
    role,
    userName,
    userProfilePic,
  };
}
