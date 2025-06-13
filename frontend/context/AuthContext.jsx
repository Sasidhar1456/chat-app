// AuthContext.jsx
import { createContext, useEffect, useState } from "react";
import axios from 'axios';
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);

    const checkAuth = async () => {
        try {
            const { data } = await axios.get("/api/auth/check", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (data.success) {
                setAuthUser(data.user);
                connectSocket(data.user);
            }
        } catch (error) {
            console.log("checkAuth error:", error);
            toast.error(error.response?.data?.message+"auth" || error.message+"auth" );
        }
    }

    const login = async (state, credentials) => {
        try {
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            console.log(data);
            console.log(data.token)
            if (data.success) {
                console.log("Hi 3")
                setAuthUser(data.userData);
                connectSocket(data.userData);
                axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
                setToken(data.token);
                localStorage.setItem("token", data.token);
                toast.success(data.message);
            } else {
                console.log("Hi 1")
                toast.error(data.message);
            }
        } catch (error) {
            console.log("Hi 2")
            toast.error(error.response?.data?.message+"log in" || error.message+"log in");
        }
    }

    const logout = async () => {
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        delete axios.defaults.headers.common["Authorization"];
        toast.success("Logged out successfully");
        if (socket) socket.disconnect();
    }

    const updateProfile = async (body) => {
        try {
            const { data } = await axios.put("/api/auth/update-profile", body, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (data.success) {
                setAuthUser(data.user);
                toast.success("Profile updated successfully");
            }
        } catch (error) {
            toast.error(error.response?.data?.message+"update" || error.message+"update ");
        }
    }

    const connectSocket = (userData) => {
    if (!userData) return;

    if (socket?.connected) socket.disconnect(); // Optional cleanup

    const newSocket = io(backendUrl, {
        query: { userId: userData._id },
        transports: ["websocket"], // Key line!
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
    });

    newSocket.on("getOnlineUsers", (userIds) => {
        setOnlineUsers(userIds);
    });

    newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
    });
    };


    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            checkAuth();
        }
    }, [token]);

    const value = {
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}