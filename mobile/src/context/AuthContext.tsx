import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, AuthTokens, UserRole } from "../types";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  API_URL_KEY,
  updateApiBaseUrl,
  getApiBaseUrl,
} from "../api/client";
import { ENV } from "../config/env";

const USER_DATA_KEY = "@eworks_user_data";

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  apiUrl: string;
  login: (user: User, tokens: AuthTokens) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  setCustomApiUrl: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiUrl, setApiUrl] = useState<string>(ENV.DEFAULT_API_BASE_URL);

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedUrl = await getApiBaseUrl();
        setApiUrl(storedUrl);

        const storedToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
        const storedRefresh = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_DATA_KEY);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setRole(parsedUser.role || "CUSTOMER");
          setTokens({
            access: storedToken,
            refresh: storedRefresh || "",
          });
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error("Failed to restore auth session:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const login = async (newUser: User, newTokens: AuthTokens) => {
    setUser(newUser);
    setRole(newUser.role);
    setTokens(newTokens);
    setIsAuthenticated(true);

    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newTokens.access);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newTokens.refresh);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(newUser));
  };

  const logout = async () => {
    setUser(null);
    setTokens(null);
    setIsAuthenticated(false);
    setRole("CUSTOMER");

    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
  };

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updated)).catch(() => {});
    }
  };

  const setCustomApiUrl = async (url: string) => {
    await updateApiBaseUrl(url);
    setApiUrl(url);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        role,
        isAuthenticated,
        isLoading,
        apiUrl,
        login,
        logout,
        switchRole,
        setCustomApiUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

