import { create } from 'zustand'
import { UserRole } from '@/types'
import { authApi } from '@/services/api'

// ========================================
// COOKIE HELPER (userRole only — for SSR route guards)
// ========================================
function setRoleCookie(role: string, days: number = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `userRole=${encodeURIComponent(role)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteRoleCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `userRole=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ========================================
// NAVIGATION STORE
// ========================================
interface NavigationState {
  isNavigating: boolean;
  startNavigation: () => void;
  stopNavigation: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  isNavigating: false,
  startNavigation: () => set({ isNavigating: true }),
  stopNavigation: () => set({ isNavigating: false }),
}))

// ========================================
// SIDEBAR STORE
// ========================================
interface SidebarState {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setSidebarCollapsed: (collapsed: boolean) => set({ isCollapsed: collapsed }),
}))

// ========================================
// AUTH STORE
// ========================================
// Token storage:
//   accessToken   → HttpOnly cookie (backend-managed, never in JS)
//   refreshToken  → HttpOnly cookie (backend-managed, never in JS)
//   userRole      → localStorage + non-HttpOnly cookie (cookie for SSR guards)
//   userName      → localStorage
//   userEmail     → localStorage
//   userProfilePic → localStorage (Appwrite URL from backend)
// ========================================
interface AuthState {
  role: UserRole | null;
  userName: string | null;
  userEmail: string | null;
  userProfilePic: string | null;
  loading: boolean;
  isHydrated: boolean;
  isAuthenticated: boolean

  hydrate: () => void;
  checkSession: () => Promise<void>;
  login: (email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfilePhoto: (photoUrl: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  role: null,
  userName: null,
  userEmail: null,
  userProfilePic: null,
  loading: true,
  isHydrated: false,
  isAuthenticated: false,

  // UI gate — checks both local hydration and server-validated session
  // isAuthenticated: () => {
  //   const { role, isHydrated, sessionValid } = get();
  //   return isHydrated && sessionValid && (role === 'ADMIN' || role === 'SUPER_ADMIN');
  // },

  // Read user info from localStorage on mount, then validate session with server
  hydrate: () => {
    if (typeof window === 'undefined') return;

    const role = localStorage.getItem('userRole') as UserRole | null;
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    const rawPic = localStorage.getItem('userProfilePic');
    // Guard against stale "[object Object]" or other invalid values
    const userProfilePic = (rawPic && rawPic.startsWith('http')) ? rawPic : null;
    if (!userProfilePic && rawPic) localStorage.removeItem('userProfilePic');

    set({
      role,
      userName,
      userEmail,
      userProfilePic,
      isHydrated: true,
    });

    // Only validate session if user was previously logged in (role in localStorage)
    // If no role, user never logged in — skip server call to avoid 401 → refresh → forceLogout loop
    // if (role) {
      get().checkSession();
    // } else {
    //   set({ loading: false });
    // }
  },

  // Validate session by calling GET /auth/me — the only way to verify accessToken
  checkSession: async () => {
    set({ loading: true });
    try {
        await authApi.getMe();
        const { isHydrated, role} = get();
        set({ isAuthenticated: isHydrated && (role === 'ADMIN' || role === 'SUPER_ADMIN'), loading: false });
    } catch {
       set({ role: null, userName: null, userEmail: null, userProfilePic: null, isAuthenticated: false, loading: false });
    }
  },

  // Login — backend sets HttpOnly cookies, we store user info in localStorage
  login: async (email, password, phone) => {
    const res = await authApi.login(email, password, phone);

    const userRole = res.user.role;
    const name = res.user.name || 'Administrator';
    const userEmail = res.user.email || email;
    // profile_image_url can be null/undefined/object — only store valid URL strings
    const rawPic = res.user.profile_image_url;
    const profilePic = (typeof rawPic === 'string' && rawPic.length > 0) ? rawPic : null;

    localStorage.setItem('userRole', userRole);
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', userEmail);
    if (profilePic) localStorage.setItem('userProfilePic', profilePic);
    else localStorage.removeItem('userProfilePic');

    setRoleCookie(userRole);

    set({
      role: userRole,
      userName: name,
      userEmail,
      userProfilePic: profilePic,
      loading: false,
      isHydrated: true,
    });
  },

  // Logout — backend clears HttpOnly cookies, we clear localStorage + cookies client-side
  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue cleanup even if backend call fails
    }

    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userProfilePic');
    deleteRoleCookie();

    // Clear HttpOnly auth cookies client-side as fallback
    // (backend already clears them, but if that call failed we still want them gone)
    if (typeof document !== 'undefined') {
      document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/api/auth';
    }

    set({
      role: null,
      userName: null,
      userEmail: null,
      userProfilePic: null,
      loading: false,
    });
  },

  updateProfilePhoto: (photoUrl: string) => {
    localStorage.setItem('userProfilePic', photoUrl);
    set({ userProfilePic: photoUrl });
  },
}));