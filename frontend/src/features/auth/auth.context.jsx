import { createContext, useState, useEffect } from "react";
import { getMe } from "./services/auth.api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const getAndSetUser = async () => {
      try {
        const data = await getMe();
        if (isMounted && data?.user) {
          setUser(data.user);
        }
      } catch (err) {
        // Not logged in or session expired
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    getAndSetUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, setLoading }}>
      { children }
    </AuthContext.Provider>
  );
};