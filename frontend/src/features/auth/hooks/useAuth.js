import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { login, logout, register, getMe, sendOtp, verifyOtp } from "../services/auth.api";

export const useAuth = () => {
  const context = useContext(AuthContext);
  const { user, setUser, loading, setLoading } = context;

  const handleLogin = async ({ email, password }) => {
    try {
      setLoading(true);
      const data = await login({ email, password });
      
      setUser(data.user);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async ({ username, email, password, otp }) => {
    try {
        setLoading(true);
        const data = await register({ username, email, password, otp });
        return data;
    } catch (error) {
        throw error;
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const data = await logout();
      setUser(null);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async ({ email, otp }) => {
    try {
      setLoading(true);
      const data = await verifyOtp({ email, otp });
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getAndSetUser = async () => {
      try {
        const data = await getMe();
        if (data?.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.log("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };
    getAndSetUser();
  }, []);

  return {
    user,
    setUser,
    loading,
    handleLogin,
    handleRegister,
    handleLogout,
    handleOtpLogin
  };
};