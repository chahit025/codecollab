import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "../config/axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for token in localStorage
    const token = localStorage.getItem("token");
    if (token) {
      // Set axios default header
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Enable withCredentials to send cookies with requests
      axios.defaults.withCredentials = true;
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      // Enable withCredentials to send cookies with requests
      const response = await axios.get("/api/user/profile", { withCredentials: true });
      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        throw new Error("No user data in response");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Enable withCredentials to receive cookies from the server
      const response = await axios.post("/api/user/login", { email, password }, { withCredentials: true });
      const { token, user } = response.data;
      
      // Store token in localStorage
      localStorage.setItem("token", token);
      
      // Set axios default header
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Enable withCredentials for all future requests
      axios.defaults.withCredentials = true;
      
      setUser(user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || "Login failed",
      };
    }
  };

  const logout = async () => {
    try {
      // Enable withCredentials to send cookies with the request
      await axios.get("/api/user/logout", { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear token from localStorage
      localStorage.removeItem("token");
      
      // Remove Authorization header
      delete axios.defaults.headers.common["Authorization"];
      
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const handleJoinRoom = (type) => {
    if (!isAuthenticated) {
      // Redirect to login and pass the desired room join route in state
      navigate("/login", {
        state: { redirectTo: `/room/join?type=${type}` },
      });
      return;
    }

    // Redirect directly to the join room for authenticated users
    navigate(`/room/join?type=${type}`);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        loading,
        handleJoinRoom,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
