import "./Login.scss";
import "../../components/Common/Common.scss";
import React from "react";
import { useEffect, useState } from "react";
import { login, logout } from "../../services/UserServices";
import { useNavigate } from "react-router-dom";

const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const showPasswordVisiblity = () => {
        setShowPassword(showPassword ? false : true);
    };

    //login
    const handleLogin = async () => {
        if (!formData.email || !formData.password) {
            alert("Please fill in email and password");
            return;
        }

        console.log("FormData hiện tại:", formData);

        try {
            const response = await login(formData);

            console.log("Login response:", response.data);

            if (response.data?.success) {
                const { user, tokens } = response.data.data;

                // Lưu token
                localStorage.setItem("accessToken", tokens.accessToken);
                localStorage.setItem("refreshToken", tokens.refreshToken);
                localStorage.setItem("user", JSON.stringify(user));
                if(user.role === "user") navigate("/");
                else navigate("/users");
            }
        } catch (error) {
            console.error("Login error:", error);
            console.log("Backend error:", error.response?.data);
            alert("Đăng nhập thất bại!");
        }
    };


    //register new account
    const handleRegister = () => {
        navigate("/register");
    };

    const handlePressEnter = (event) => {
        if (event.code === "Enter") {
            handleLogin();
        }
    };

    return (
        <div className="container mt-5">
            <div className="row mx-auto">
                <div className="col-12 col-md-4 mx-auto text-center d-flex flex-column gap-4">
                    <h4>Login</h4>
                    <input
                        type="email"
                        style={{ borderWidth: "1.3px" }}
                        className="form-control"
                        placeholder="Email"
                        value={formData.email}
                        onChange={(event) => {
                            setFormData({
                                ...formData,
                                email: event.target.value,
                            });
                        }}
                    />
                    <div className="position-relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            style={{ borderWidth: "1.3px" }}
                            className="form-control"
                            placeholder="Mật khẩu"
                            value={formData.password}
                            onChange={(event) => {
                                setFormData({
                                    ...formData,
                                    password: event.target.value,
                                });
                            }}
                            onKeyDown={(event) => handlePressEnter(event)}
                        />
                        <i
                            className={`fa ${
                                showPassword ? "fa fa-eye-slash" : "fa fa-eye"
                            }`}
                            onClick={showPasswordVisiblity}
                            style={{
                                position: "absolute",
                                top: "50%",
                                right: "15px",
                                transform: "translateY(-50%)",
                                cursor: "pointer",
                                color: "#878585",
                            }}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handleLogin}>
                        Login
                    </button>
                    <div className="login-divider">
                        <span>OR</span>
                    </div>
                    <span className="text-center">
                        <a
                            className="register-account"
                            onClick={handleRegister}
                        >
                            Create new account
                        </a>
                    </span>
                </div>
            </div>
        </div>
    );
};
export default Login;
