import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function untuk fetch profile data
  const fetchUserProfile = async (userId) => {
    if (!userId) return null;
    
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('⚠️ Profile not found for user:', userId);
          return null;
        }
        console.error("❌ Error fetching profile:", error);
        return null;
      }
      
      return profile;
    } catch (err) {
      console.error("❌ Error in fetchUserProfile:", err);
      return null;
    }
  };

  // ✅ Fungsi refreshUser - DIPAKAI DI LOGIN
  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id);
      if (profile) {
        const userData = {
          ...session.user,
          ...profile
        };
        setUser(userData);
        return userData; // ✅ Return supaya bisa dipakai
      } else {
        setUser(session.user);
        return session.user;
      }
    } else {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        
        if (profile) {
          const userData = {
            ...session.user,
            ...profile
          };
          setUser(userData);
        } else {
          setUser(session.user);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        
        if (profile) {
          const userData = {
            ...session.user,
            ...profile
          };
          setUser(userData);
        } else {
          setUser(session.user);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user,
    loading,
    isAuthenticated: !!session,
    refreshUser, // ✅ Expose refresh function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}