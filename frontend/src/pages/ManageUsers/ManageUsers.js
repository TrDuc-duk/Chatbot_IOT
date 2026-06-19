import React, { useState, useEffect } from "react";
import { Row, Col, Card, Table, Button, Form, Badge, Spinner, Modal } from "react-bootstrap";
import { fetchAllUsers, statisticsUsers, addNewUsersAdmin, deleteUserAdmin, updateUserAdmin, fetchUserAdmin } from "../../services/UserServices";
import "./ManageUsers.scss";

const ManageUsers = ({ isSidebarOpen }) => {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ total: 0, admin: 0, user: 0 });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null); // null = mode thêm mới, !null = mode edit

    // Form State
    const [formData, setFormData] = useState({ username: "", email: "", password: "", role: "user" });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [userRes, statsRes] = await Promise.all([fetchAllUsers(), statisticsUsers()]);

            // 1. Xử lý danh sách người dùng
            const userData = userRes.data?.data || [];
            setUsers(userData);

            // 2. Xử lý thống kê (Mapping lại dữ liệu từ Backend)
            const s = statsRes.data?.data || {};
            
            // Tìm số lượng admin và user trong mảng byRole
            const adminCount = s.byRole?.find(r => r.role?.toLowerCase() === 'admin')?.count || 0;
            const userCount = s.byRole?.find(r => r.role?.toLowerCase() === 'user')?.count || 0;

            setStats({
            total: s.totalUsers || 0,
            admin: adminCount,
            user: userCount,
            recent: s.recentRegistrations || 0
            });
        } catch (e) {
            console.error("Fetch data error:", e);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setSelectedUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                // Lấy đúng roleName (string) thay vì để nguyên cả object
                role: user.role?.roleName || "user", 
                password: "" // Để trống vì Backend không cho update password ở đây
            });
        } else {
            setSelectedUser(null);
            setFormData({ username: "", email: "", password: "", role: "user" });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedUser) {
                // CHẾ ĐỘ EDIT: Chỉ gửi username, email và role. TUYỆT ĐỐI không gửi password.
                const updatePayload = {
                    username: formData.username,
                    email: formData.email,
                    role: formData.role // Đảm bảo giá trị là 'admin' hoặc 'user'
                };
                
                await updateUserAdmin(selectedUser.id, updatePayload);
            } else {
                // CHẾ ĐỘ ADD NEW: Gửi toàn bộ bao gồm password
                await addNewUsersAdmin(formData);
            }
            
            setShowModal(false);
            loadData(); // Tải lại danh sách
        } catch (error) {
            // Hiển thị lỗi từ Backend để dễ debug
            const message = error.response?.data?.message || "Action failed!";
            alert(Array.isArray(message) ? message.join(", ") : message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            await deleteUserAdmin(id);
            loadData();
        }
    };

    const [searchId, setSearchId] = useState("");

    // Hàm tìm kiếm theo ID
    const handleSearch = async (e) => {
        e.preventDefault();
        
        // Nếu thanh search trống, load lại toàn bộ danh sách
        if (!searchId.trim()) {
            loadData();
            return;
        }

        try {
            setLoading(true);
            const res = await fetchUserAdmin(searchId);
            // Lưu ý: API fetch cá nhân thường trả về 1 object đơn lẻ trong res.data.data
            const userData = res.data?.data || res.data;
            
            if (userData) {
                setUsers([userData]); // Đưa vào mảng để hàm .map không bị lỗi
            } else {
                setUsers([]);
            }
        } catch (e) {
            console.error("User not found");
            setUsers([]); // Không tìm thấy thì để bảng trống
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchId === "") {
            loadData();
        }
    }, [searchId]);

    if (loading) return <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>;

    return (
        <div className={`dashboard-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <div className="manage-users-container">
                
                {/* 1. Header & Quick Stats */}
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <div>
                        <h4 className="fw-bold mb-1">User Management</h4>
                        <p className="text-muted mb-0">Overview of all registered accounts</p>
                    </div>
                    <Button variant="primary" className="rounded-pill px-4" onClick={() => handleOpenModal()}>
                        <i className="fa fa-plus me-2"></i> Add New User
                    </Button>
                </div>

                <Row className="g-3 mb-4">
                    {[
                        { label: "Total Users", value: stats.total, icon: "fa-users", color: "primary" },
                        { label: "Administrators", value: stats.admin, icon: "fa-shield", color: "danger" },
                        { label: "Standard Users", value: stats.user, icon: "fa-user", color: "success" }
                    ].map((s, i) => (
                        <Col key={i} md={4}>
                            <Card className="border-0 shadow-sm rounded-4 stat-card">
                                <Card.Body className="d-flex align-items-center p-3">
                                    <div className={`icon-box bg-soft-${s.color} text-${s.color} rounded-circle me-3`}>
                                        <i className={`fa ${s.icon}`}></i>
                                    </div>
                                    <div>
                                        <div className="text-muted small fw-bold">{s.label}</div>
                                        <h3 className="fw-bold mb-0">{s.value}</h3>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* 2. User Table */}
                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Table hover responsive className="mb-0 user-table align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th className="ps-4 text-center">No.</th>
                                <th className="ps-4">Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                        {users.length > 0 ? (
                            users.map((u, index) => ( // Thêm index vào đây
                                <tr key={u.id}>
                                    <td className="ps-4 text-center text-muted small">{index + 1}</td>
                                    <td className="fw-600">{u.username}</td>
                                    <td className="text-secondary">{u.email}</td>
                                    <td>
                                        <Badge 
                                            bg={u.role?.roleName?.toLowerCase() === 'admin' ? 'danger' : 'info'} 
                                            className="rounded-pill px-3 py-2 fw-500"
                                            style={{ fontSize: '0.7rem' }}
                                        >
                                            {/* Sửa lỗi hiển thị [Object object] */}
                                            {u.role?.roleName ? u.role.roleName.toUpperCase() : 'USER'}
                                        </Badge>
                                    </td>
                                    <td className="text-center">
                                        <Button variant="link" className="text-primary p-2 me-2" onClick={() => handleOpenModal(u)}>
                                            <i className="fa fa-pencil-square-o"></i>
                                        </Button>
                                        <Button variant="link" className="text-danger p-2" onClick={() => handleDelete(u.id)}>
                                            <i className="fa fa-trash-o"></i>
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center py-5 text-muted">
                                    No users found in the system.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    </Table>
                </Card>

                {/* 3. Add/Edit Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered className="user-modal">
                    <Form onSubmit={handleSubmit}>
                        <Modal.Header closeButton className="border-0 pb-0">
                            <Modal.Title className="fw-bold">{selectedUser ? "Edit User" : "Add New User"}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-4">
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Username</Form.Label>
                                <Form.Control type="text" className="bg-light border-0" required
                                    value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Email</Form.Label>
                                <Form.Control type="email" className="bg-light border-0" required
                                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </Form.Group>
                            {!selectedUser && ( // Password chỉ hiện khi tạo mới
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Password</Form.Label>
                                    <Form.Control type="password" className="bg-light border-0" required
                                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </Form.Group>
                            )}
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Role</Form.Label>
                                <Form.Select className="bg-light border-0" 
                                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </Form.Select>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer className="border-0 pt-0">
                            <Button variant="light" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" className="px-4">Save Changes</Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </div>
        </div>
    );
};

export default ManageUsers;