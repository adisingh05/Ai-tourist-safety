import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken, ApiError } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { email, role, tourist_id }
  const [loading, setLoading] = useState(true);

  // Revalidate a stored token on launch. A network failure must NOT log the
  // user out — the app has to open when they are offline, which is precisely
  // when they may need the SOS button.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) setToken(null);
        else setUser({ offline: true }); // optimistic: token kept
      })
      .finally(() => setLoading(false));
  }, []);

  function _apply(tokenResp) {
    setToken(tokenResp.access_token);
    setUser({
      email: tokenResp.email,
      role: tokenResp.role,
      tourist_id: tokenResp.tourist_id,
    });
    return tokenResp;
  }

  const login = (email, password) => api.login({ email, password }).then(_apply);
  const signup = (payload) => api.signup(payload).then(_apply);

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
