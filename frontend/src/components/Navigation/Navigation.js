import "./Navigation.scss";
import { NavLink, useLocation } from 'react-router-dom';
import { Navbar, Nav, Dropdown, Container, Offcanvas } from "react-bootstrap";
import { logout, fetchMe } from "../../services/UserServices";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";


const Navigation = ({ show, setShow }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);

    const handleLogout = async () => {
        try {
            //await logout();
        } catch (e) {
            console.error(e);
        } finally {
            localStorage.clear();
            navigate('/login');
            setUser(null);
            setShow(false);
        }
    };

    useEffect(() => {
        const getUserInfo = async () => {
            if (location.pathname !== '/login' && location.pathname !== '/register') {
                try {
                    const res = await fetchMe();
                    setUser(res.data.data); 
                    console.log(res.data)
                } catch (e) {
                    console.error("Failed to fetch user info", e);
                    if (e.response?.status === 401) handleLogout();
                }
            }
        };
        getUserInfo();
    }, [location.pathname]);

    if (location.pathname === '/login' || location.pathname === '/register') return null;

    return (
        <div className="navbar-header">
            <Navbar bg="white" className="nav-header px-2">
                <Container fluid className="d-flex justify-content-between align-items-center">
                    {!show && (
                        <span style={{ cursor: "pointer" }} onClick={() => setShow(true)}>
                            <i className="fa fa-bars" style={{ fontSize: "20px" }}></i>
                        </span>
                    )}
                    <Offcanvas 
                        show={show} 
                        onHide={() => setShow(false)}
                        backdrop={window.innerWidth < 992}
                        scroll={true}
                        className="custom-sidebar"
                    >
                        <div className="sidebar-header-custom d-flex justify-content-between align-items-center p-4">
                            <h4 className="text-white fw-bold mb-0">Smart Garden</h4>
                            <span className="close-btn" onClick={() => setShow(false)}>
                                <i className="fa fa-times-circle fa-lg"></i>
                            </span>
                        </div>

                        <Offcanvas.Body className="px-3">
                            <Nav className="flex-column">
                                {user?.role === "admin" && (
                                    <>
                                        <div className="menu-label mt-1 mb-1 small fw-bold px-3" style={{color:"#b6b4b4"}}>ADMINISTRATION</div>
                                        <NavLink to="/devices" className="nav-link-item">
                                            <i className="fa fa-plug me-2"></i> Devices
                                        </NavLink>
                                        <NavLink to="/plants" className="nav-link-item">
                                            <i className="fa fa-book me-2"></i> Plants 
                                        </NavLink>
                                        <NavLink to="/users" className="nav-link-item">
                                            <i className="fa fa-users me-2"></i> Users
                                        </NavLink>
                                    </>
                                )}
                                {user?.role === "user" && (
                                    <>
                                        {/* Nhóm Monitoring & Real-time */}
                                        <div className="menu-label mt-1 mb-1 small fw-bold px-3" style={{color:"#b6b4b4"}}>MONITORING</div>
                                        <NavLink to="/" className="nav-link-item">
                                            <i className="fa fa-tachometer me-2"></i> Dashboard
                                        </NavLink>
                                        <NavLink to="/sensors" className="nav-link-item">
                                            <i className="fa fa-line-chart me-2"></i> Sensor Monitoring
                                        </NavLink>

                                        {/* Nhóm Quản lý vườn và Thiết bị */}
                                        <div className="menu-label mt-1 mb-1 small fw-bold px-3" style={{color:"#b6b4b4"}}>MANAGEMENT</div>
                                        <NavLink to="/gardens" className="nav-link-item">
                                            <i className="fa fa-leaf me-2"></i> Garden 
                                        </NavLink>
                                        <NavLink to="/plants" className="nav-link-item">
                                            <i className="fa fa-book me-2"></i> Plant 
                                        </NavLink>
                                    </>
                                )}

                                <div className="menu-label mt-1 mb-1 small fw-bold px-3" style={{color:"#b6b4b4"}}>ACCOUNT</div>
                                <NavLink to="/profile" className="nav-link-item">
                                    <i className="fa fa-user-circle me-2"></i> Profile
                                </NavLink>
                                <div className="nav-link-item text-danger" style={{ cursor: "pointer" }} onClick={handleLogout}>
                                    <i className="fa fa-sign-out me-2"></i> Logout
                                </div>
                            </Nav>
                        </Offcanvas.Body>
                    </Offcanvas>

                    <Nav className="ms-auto d-flex align-items-center">
                        <Dropdown>
                            <Dropdown.Toggle as="a" className="nav-link p-0">
                                <i className="fa fa-user-circle fa-lg"></i>
                            </Dropdown.Toggle>
                            <Dropdown.Menu align="end">
                                <Dropdown.Item as={NavLink} to="/profile">Profile</Dropdown.Item>
                                <Dropdown.Item as={NavLink} to="/login" onClick={handleLogout}>Logout</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Nav>
                </Container>
            </Navbar>
        </div>
    );
};

export default Navigation;