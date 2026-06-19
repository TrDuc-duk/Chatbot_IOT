import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { fetchMe, updateProfile, changePassword } from "../../services/UserServices";
import "./Account.scss";

const Account = ({ isSidebarOpen }) => {
    const [user, setUser] = useState({ username: "", email: "", role: "" });
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [pwdData, setPwdData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

    const [changePwdMode, setChangePwdMode] = useState(false);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            setLoading(true);
            const res = await fetchMe();
            setUser(res.data.data);
        } catch (e) {
            setStatus({ type: "danger", message: "Failed to load profile data." });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await updateProfile({ username: user.username, email: user.email });
            setStatus({ type: "success", message: "Profile updated successfully!" });
            setEditMode(false);
        } catch (e) {
            setStatus({ type: "danger", message: "Update failed." });
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwdData.newPassword !== pwdData.confirmPassword) {
            return setStatus({ type: "danger", message: "Passwords do not match!" });
        }
        try {
            await changePassword({
                currentPassword: pwdData.oldPassword,
                newPassword: pwdData.newPassword,
            });

            setStatus({ type: "success", message: "Password changed successfully!" });
            setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" });
            setChangePwdMode(false);
        } catch (e) {
            setStatus({ type: "danger", message: "Failed to change password." });
        }
    };

    if (loading) return (
        <div className="text-center mt-5 p-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading Profile...</p>
        </div>
    );

    return (
        // Container chính phủ toàn màn hình
        <div className={`dashboard-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            
            {/* Div giới hạn độ rộng và căn giữa nội dung */}
            <div className="profile-inner-container">
                
                {status.message && (
                    <Alert 
                        variant={status.type} 
                        className="border-0 shadow-sm mb-4"
                        onClose={() => setStatus({ type: "", message: "" })} 
                        dismissible
                    >
                        {status.message}
                    </Alert>
                )}

                <Row className="g-4">
                    {/* LEFT COLUMN: PROFILE INFO */}
                    <Col lg={7}>
                        <Card className="border-0 shadow-sm rounded-4 h-100">
                            <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div>
                                        <h5 className="fw-bold mb-1">Account Details</h5>
                                        <p className="text-muted small mb-0">Manage your information</p>
                                    </div>
                                    <div className="d-flex gap-2">
                                    <Button 
                                        variant={editMode ? "light" : "primary"} 
                                        className="rounded-pill px-3 btn-sm"
                                        onClick={() => setEditMode(!editMode)}
                                    >
                                        <i className={`fa ${editMode ? 'fa-times' : 'fa-pencil'} me-2`}></i>
                                        {editMode ? "Cancel" : "Edit Profile"}
                                    </Button>
                                    <Button 
                                        variant={changePwdMode ? "outline-danger" : "danger"} 
                                        className="rounded-pill px-3 btn-sm"
                                        onClick={() => setChangePwdMode(!changePwdMode)}
                                    >
                                        <i className="fa fa-key me-2"></i>
                                        {changePwdMode ? "Close Security" : "Change Password"}
                                    </Button>

                                </div>
                                </div>

                                <Form onSubmit={handleUpdateProfile}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-600 text-secondary">Username</Form.Label>
                                        <Form.Control
                                            type="text"
                                            className="border-0 bg-light rounded-3 py-2"
                                            value={user.username}
                                            disabled={!editMode}
                                            onChange={(e) => setUser({ ...user, username: e.target.value })}
                                        />
                                    </Form.Group>
                                    
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-600 text-secondary">Email Address</Form.Label>
                                        <Form.Control
                                            type="email"
                                            className="border-0 bg-light rounded-3 py-2"
                                            value={user.email}
                                            disabled={!editMode}
                                            onChange={(e) => setUser({ ...user, email: e.target.value })}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-600 text-secondary">Role</Form.Label>
                                        <div className="d-flex mt-1">
                                            <span className="badge bg-soft-primary text-primary px-3 py-2 rounded-pill shadow-none" style={{ backgroundColor: '#eef2ff' }}>
                                                {user.role?.toUpperCase()}
                                            </span>
                                        </div>
                                    </Form.Group>

                                    {editMode && (
                                        <Button variant="primary" type="submit" className="w-100 rounded-3 py-2 shadow-sm fw-bold">
                                            Save Changes
                                        </Button>
                                    )}
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                    {changePwdMode && (
                    <Col lg={5} className="animate__animated animate__fadeInRight">
                        <Card className="border-0 shadow-sm rounded-4 h-100"> 
                            <Card.Body className="p-4">
                                <h5 className="fw-bold mb-4">Change Password</h5>
                                <Form onSubmit={handleChangePassword}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-600 text-secondary">Current Password</Form.Label>
                                        <Form.Control
                                            type="password" placeholder="Enter current password"
                                            className="border-0 bg-light py-2 rounded-3"
                                            value={pwdData.oldPassword}
                                            onChange={(e) => setPwdData({ ...pwdData, oldPassword: e.target.value })}
                                            required
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-600 text-secondary">New Password</Form.Label>
                                        <Form.Control
                                            type="password" placeholder="New password"
                                            className="border-0 bg-light py-2 rounded-3"
                                            value={pwdData.newPassword}
                                            onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                                            required
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-600 text-secondary">Confirm New Password</Form.Label>
                                        <Form.Control
                                            type="password" placeholder="Repeat new password"
                                            className="border-0 bg-light py-2 rounded-3"
                                            value={pwdData.confirmPassword}
                                            onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                                            required
                                        />
                                    </Form.Group>
                                    <Button variant="danger" type="submit" className="w-100 rounded-3 py-2 fw-bold">
                                        Confirm Change
                                    </Button>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                )}
                </Row>
            </div>
        </div>
    );
};

export default Account;