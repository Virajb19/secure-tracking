import { create } from 'zustand'
import { UserRole } from '@/types'
import { authApi } from '@/services/api'

// ========================================
// COOKIE HELPERS
// ========================================
function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
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

  startNavigation: () => {
    set({ isNavigating: true });
  },

  stopNavigation: () => {
    set({ isNavigating: false });
  },
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

  toggleSidebar: () => {
    set((state) => ({ isCollapsed: !state.isCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ isCollapsed: collapsed });
  },
}))

// ========================================
// AUTH STORE
// ========================================
interface AuthState {
  token: string | null;
  role: UserRole | null;
  userName: string | null;
  userProfilePic: string | null;
  loading: boolean;
  isHydrated: boolean;

  isAuthenticated: () => boolean;
  hydrate: () => void;
  login: (email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  role: null,
  userName: null,
  userProfilePic: null,
  loading: true,
  isHydrated: false,

  // ----------------------------------------
  // AUTH CHECK
  // ----------------------------------------
  isAuthenticated: () => {
    const { token, role } = get();
    return Boolean(token && (role === 'ADMIN' || role === 'SUPER_ADMIN'));
  },

  // ----------------------------------------
  // HYDRATE FROM localStorage
  // ----------------------------------------
  hydrate: () => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('accessToken');
    const role = localStorage.getItem('userRole') as UserRole | null;
    const userName = localStorage.getItem('userName');
    const userProfilePic = localStorage.getItem('userProfilePic');

    set({
      token,
      role,
      userName,
      userProfilePic,
      loading: false,
      isHydrated: true,
    });
  },

  // ----------------------------------------
  // LOGIN
  // ----------------------------------------
  login: async (email, password, phone) => {
    const res = await authApi.login(email, password, phone);

    const accessToken = res.access_token;
    const userRole = res.user.role;
    const name = res.user.name || 'Administrator';
    const profilePic = res.user.profile_image_url || null;

    // Set localStorage
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('userName', name);
    if (profilePic) {
      localStorage.setItem('userProfilePic', profilePic);
    }

    // Set cookies for server-side auth
    setCookie('accessToken', accessToken);
    setCookie('userRole', userRole);
    setCookie('userName', name);
    if (profilePic) {
      setCookie('userProfilePic', profilePic);
    }

    set({
      token: accessToken,
      role: userRole,
      userName: name,
      userProfilePic: profilePic,
      loading: false,
    });
  },

  // ----------------------------------------
  // LOGOUT
  // ----------------------------------------
  logout: () => {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userProfilePic');

    // Clear cookies
    deleteCookie('accessToken');
    deleteCookie('userRole');
    deleteCookie('userName');
    deleteCookie('userProfilePic');

    set({
      token: null,
      role: null,
      userName: null,
      userProfilePic: null,
      loading: false,
    });
  },
}));