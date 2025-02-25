import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: 'admin' | 'user';
  full_name: string;
  badge_number: string | null;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isAdmin: false,
  setSession: (session) => {
    set({ session });
    if (session) {
      // Fetch the profile after the session is set
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          set({ 
            profile: data, 
            isAdmin: data?.role === 'admin' 
          });
        }
      };
      fetchProfile();
    } else {
      set({ profile: null, isAdmin: false });
    }
  },
  setProfile: (profile) => set({
    profile,
    isAdmin: profile?.role === 'admin'
  }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, isAdmin: false });
  },
}));
