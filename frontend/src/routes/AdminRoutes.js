import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { fetchMe } from "../services/UserServices";

const AdminRoute = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("accessToken"); // Kiểm tra token trước khi gọi API

    useEffect(() => {
        const checkAuth = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetchMe();
                setUser(res.data.data || res); 
            } catch (err) {
                console.error("Auth check failed:", err);
                localStorage.clear();
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [token]);

    // Trong lúc đang đợi API trả về
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    // Nếu không có token hoặc gọi API lỗi (không có user)
    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    // Kiểm tra role sau khi đã có dữ liệu từ API
    return user.role === "admin" 
        ? children 
        : <Navigate to="/users" replace />;
};

export default AdminRoute;