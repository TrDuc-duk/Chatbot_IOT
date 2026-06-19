import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerAccount } from "../../services/UserServices";
import { toast } from "react-toastify";
import "./Account.scss"; 

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const handleOnChange = (event, id) => {
        setFormData({
            ...formData,
            [id]: event.target.value
        });
    };

    const handleRegister = async () => {
        const { username, email, password, confirmPassword } = formData;

        // 1. Validate cơ bản tại Frontend
        if (!username || !email || !password) {
            toast.error("Vui lòng điền đầy đủ thông tin!");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp!");
            return;
        }

        try {
            // 2. Chỉ gửi những field Backend yêu cầu (tránh lỗi forbidNonWhitelisted)
            const dataToSubmit = {
                username: username.trim(),
                email: email.trim(),
                password: password
            };

            const response = await registerAccount(dataToSubmit);

            // 3. Xử lý thành công
            if (response) {
                toast.success("Đăng ký tài khoản thành công!");
                navigate("/login");
            }
        } catch (error) {
            // 4. Xử lý lỗi từ Backend (ValidationPipe)
            const errorMsg = error.response?.data?.message;
            toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || "Đăng ký thất bại");
        }
    };

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-12 col-md-4 mx-auto d-flex flex-column gap-3">
                    <h4 className="text-center">Create New Account</h4>
                    
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Username (3-50 characters)"
                        value={formData.username}
                        onChange={(e) => handleOnChange(e, "username")}
                    />

                    <input
                        type="email"
                        className="form-control"
                        placeholder="Email (e.g. name@gmail.com)"
                        value={formData.email}
                        onChange={(e) => handleOnChange(e, "email")}
                    />

                    <input
                        type="password"
                        className="form-control"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => handleOnChange(e, "password")}
                    />

                    <input
                        type="password"
                        className="form-control"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleOnChange(e, "confirmPassword")}
                    />

                    <button className="btn btn-primary" onClick={handleRegister}>
                        Register Now
                    </button>

                    <div className="text-center mt-2">
                        <span>Already have an account? </span>
                        <a href="/login" className="text-decoration-none">Login here</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;