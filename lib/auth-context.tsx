'use client';

/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the application.
 * Handles user login, logout, registration, and role-based access control.
 *
 * Usage:
 *   const { user, userProfile, signIn, signOut } = useAuth();
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Available user roles in the system
 * - admin: Full access to all features
 * - office_desk: Access to POS, payroll, analytics, and client management
 * - sales_rep: Access to bookings, clients, and scheduling
 * - detailing_tech: Access to assigned jobs, timeclock, and personal schedule
 * - affiliate: Access to affiliate dashboard and earnings
 * - client: Customer-facing portal (future feature)
 */
export type UserRole = 'admin' | 'office_desk' | 'sales_rep' | 'detailing_tech' | 'affiliate' | 'client';

/**
 * User profile stored in Firestore /users collection
 */
export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
  // Optional employee fields
  hourlyRate?: number;
  // Optional client fields
  address?: string;
  vehicles?: string[];
  notes?: string;
}

/**
 * Auth context value type
 */
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profile: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// ============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================

/**
 * Role hierarchy for comparing access levels
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  client: 0,
  affiliate: 1,
  detailing_tech: 2,
  sales_rep: 3,
  office_desk: 4,
  admin: 5,
};

/**
 * Routes accessible by each role
 * Used by ProtectedRoute component and AdminSidebar
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    '/admin',
    '/admin/my-jobs',
    '/admin/my-profile',
    '/admin/workspace',
    '/admin/bookings',
    '/admin/clients',
    '/admin/employees',
    '/admin/sync-roles',
    '/admin/schedule',
    '/admin/timeclock',
    '/admin/pos',
    '/admin/notifications',
    '/admin/payroll',
    '/admin/analytics',
    '/admin/settings',
    '/admin/migrate-roles',
    '/admin/sales',
    '/admin/affiliates',
  ],
  office_desk: [
    '/admin',
    '/admin/my-jobs',
    '/admin/my-profile',
    '/admin/workspace',
    '/admin/bookings',
    '/admin/clients',
    '/admin/employees',
    '/admin/schedule',
    '/admin/timeclock',
    '/admin/pos',
    '/admin/notifications',
    '/admin/sales',
  ],
  sales_rep: [
    '/admin',
    '/admin/my-jobs',
    '/admin/my-profile',
    '/admin/workspace',
    '/admin/bookings',
    '/admin/clients',
    '/admin/schedule',
    '/admin/notifications',
    '/admin/sales',
  ],
  detailing_tech: [
    '/admin',
    '/admin/my-jobs',
    '/admin/my-profile',
    '/admin/workspace',
    '/admin/bookings',
    '/admin/clients',
    '/admin/schedule',
    '/admin/timeclock',
    '/admin/notifications',
  ],
  affiliate: [
    '/affiliate/dashboard',
    '/affiliate/dashboard/referrals',
    '/affiliate/dashboard/commissions',
    '/affiliate/dashboard/payouts',
  ],
  client: [],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a role has access to a specific route
 * @param role - User's role
 * @param path - Route path to check
 * @returns boolean - Whether access is allowed
 */
export function hasAccessToPath(role: UserRole | undefined, path: string): boolean {
  if (!role) return false;

  const permissions = ROLE_PERMISSIONS[role] || [];

  // Check exact match or if path is a sub-route of an allowed path
  return permissions.some(allowedPath =>
    path === allowedPath || path.startsWith(allowedPath + '/')
  );
}

/**
 * Get human-readable display name for a role
 * @param role - User role
 * @returns string - Display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    admin: 'Admin',
    office_desk: 'Office Desk',
    sales_rep: 'Sales Rep',
    detailing_tech: 'Detailing Tech',
    affiliate: 'Affiliate Partner',
    client: 'Client',
  };
  return displayNames[role] || role;
}

/**
 * Check if a role is admin
 * @param role - User's role
 * @returns boolean - Whether user is admin
 */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin';
}

/**
 * Check if a role has at least the specified minimum role level
 * @param role - User's current role
 * @param minRole - Minimum required role
 * @returns boolean - Whether user has at least the minimum role
 */
export function hasMinRole(role: UserRole | undefined, minRole: UserRole): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

/**
 * Check if the user is viewing their own data
 * @param targetUserId - The user ID being accessed
 * @param currentUserId - The current logged-in user's ID
 * @returns boolean - Whether viewing own data
 */
export function isOwnData(targetUserId: string | undefined, currentUserId: string | undefined): boolean {
  if (!targetUserId || !currentUserId) return false;
  return targetUserId === currentUserId;
}

// ============================================================================
// AUTH CONTEXT & PROVIDER
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component
 * Wraps the app and provides auth state to all children
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user profile from Firestore
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile);
          } else {
            console.warn('User profile not found in Firestore');
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  /**
   * Create new user account and Firestore profile
   */
  const signUp = async (email: string, password: string, profile: Partial<UserProfile>) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Create user profile in Firestore
    const newProfile: UserProfile = {
      uid,
      email,
      role: profile.role || 'client',
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      phone: profile.phone || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...profile
    };

    await setDoc(doc(db, 'users', uid), newProfile);
    setUserProfile(newProfile);
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access auth context
 * Must be used within an AuthProvider
 *
 * @example
 * const { user, userProfile, signIn, signOut } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
