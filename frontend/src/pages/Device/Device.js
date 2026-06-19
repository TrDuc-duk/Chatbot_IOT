import React, { useState, useEffect } from "react";
import { Row, Col, Card, Badge, Button, Spinner, Form } from "react-bootstrap";
import { fetchAllDevices, fetchDeviceByCode, fetchDeviceById, fetchDeviceStatus } from "../../services/UserServices";
import "./Device.scss";

const Devices = ({ isSidebarOpen }) => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchCode, setSearchCode] = useState("");

    const loadDevices = async () => {
        try {
            const res = await fetchAllDevices();
            setDevices(res.data?.data || res.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDevices();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return {
            time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            day: date.toLocaleDateString('vi-VN')
        };
    };
    // Thêm state để quản lý kết quả tìm kiếm hoặc thông báo lỗi
    const [searchId, setSearchId] = useState("");

    // 1. Tìm kiếm theo Device Code (Sử dụng fetchDeviceByCode)
    const handleSearchByCode = async (e) => {
        e.preventDefault();
        if (!searchCode.trim()) {
            loadDevices(); // Nếu trống thì load lại toàn bộ
            return;
        }

        try {
            setLoading(true);
            const res = await fetchDeviceByCode(searchCode);
            const deviceData = res.data?.data || res.data;
            setDevices(deviceData ? [deviceData] : []);
        } catch (e) {
            console.error("Device Code not found");
            setDevices([]);
        } finally {
            setLoading(false);
        }
    };

    // 2. Hàm làm mới trạng thái một thiết bị cụ thể (Sử dụng fetchDeviceStatus)
    const handleRefreshStatus = async (id) => {
        try {
            const res = await fetchDeviceStatus(id);
            const updatedStatus = res.data?.data || res.data;
            
            // Cập nhật lại chỉ thiết bị đó trong danh sách hiện tại
            setDevices(prev => prev.map(d => 
                d.id === id ? { ...d, ...updatedStatus } : d
            ));
        } catch (e) {
            console.error("Failed to refresh status");
        }
    };

    return (
    <div className={`dashboard-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="profile-inner-container px-3">
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="fw-bold mb-1">Smart Devices</h4>
                    <p className="text-muted small mb-0">Monitor and control your garden hardware</p>
                </div>
                
                <Form onSubmit={handleSearchByCode} className="d-flex shadow-sm rounded-pill overflow-hidden bg-white border border-light">
                    <Form.Control
                        placeholder="Search Device Code..."
                        className="border-0 px-3 py-2 bg-transparent"
                        style={{ width: '220px', fontSize: '0.85rem', boxShadow: 'none' }}
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                    />
                    <Button type="submit" variant="link" className="text-primary px-3 py-0">
                        <i className="fa fa-search"></i>
                    </Button>
                </Form>
            </div>

            {loading ? (
                <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
            ) : (
                <Row className="g-4">
                    {devices.length > 0 ? (
                        devices.map((device) => {
                            const lastSeen = formatDate(device.lastSeen);
                            return (
                                <Col key={device.id} xl={4} lg={6} md={12}>
                                    <Card className="border-0 shadow-sm rounded-4 device-card h-100">
                                        <Card.Body className="p-4">
                                            <div className="d-flex justify-content-between align-items-start mb-4">
                                                <div>
                                                    <Badge bg={device.isConnected ? "success" : "secondary"} className="rounded-pill px-3 py-2 mb-2">
                                                        {device.isConnected ? "● Online" : "○ Offline"}
                                                    </Badge>
                                                    <h5 className="fw-bold mb-0 text-dark">ID: {device.deviceCode}</h5>
                                                    <div className="text-muted small">
                                                        Last update: <span className="fw-500">{lastSeen.time}</span>
                                                    </div>
                                                </div>
                                                {/* Nút Refresh trạng thái nhanh */}
                                                <Button 
                                                    variant="light" 
                                                    className="rounded-circle shadow-sm text-primary"
                                                    onClick={() => handleRefreshStatus(device.id)}
                                                    style={{ width: '40px', height: '40px' }}
                                                >
                                                    <i className="fa fa-refresh"></i>
                                                </Button>
                                            </div>

                                            {/* Sensor Stats */}
                                            <Row className="g-2 mb-4">
                                                {[
                                                    { icon: "fa-thermometer-half", color: "danger", val: device.temperature, unit: "°C", label: "Temp" },
                                                    { icon: "fa-tint", color: "primary", val: device.airHumidity, unit: "%", label: "Humid" },
                                                    { icon: "fa-leaf", color: "success", val: device.soilMoisture, unit: "%", label: "Soil" }
                                                ].map((s, idx) => (
                                                    <Col xs={4} key={idx}>
                                                        <div className={`p-3 rounded-4 bg-soft-${s.color} text-center`}>
                                                            <i className={`fa ${s.icon} text-${s.color} mb-1`}></i>
                                                            <div className="fw-bold text-dark mb-0">{s.val}{s.unit}</div>
                                                            <div className="text-muted" style={{fontSize: '0.6rem'}}>{s.label}</div>
                                                        </div>
                                                    </Col>
                                                ))}
                                            </Row>

                                            {/* Actuators Status */}
                                            <div className="d-flex gap-2 pt-3 border-top">
                                                <div className="flex-grow-1 bg-light p-2 rounded-3 d-flex justify-content-between align-items-center px-3">
                                                    <span className="small fw-bold text-muted">PUMP</span>
                                                    <i className={`fa fa-power-off ${device.isPumpOn ? 'text-primary' : 'text-muted'}`}></i>
                                                </div>
                                                <div className="flex-grow-1 bg-light p-2 rounded-3 d-flex justify-content-between align-items-center px-3">
                                                    <span className="small fw-bold text-muted">LIGHT</span>
                                                    <i className={`fa fa-lightbulb-o ${device.isLedOn ? 'text-warning' : 'text-muted'}`}></i>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            );
                        })
                    ) : (
                        <div className="text-center w-100 py-5">
                            <h5 className="text-muted">No devices found.</h5>
                            <Button variant="link" onClick={loadDevices}>Clear Search</Button>
                        </div>
                    )}
                </Row>
            )}
        </div>
    </div>
);
};

export default Devices;