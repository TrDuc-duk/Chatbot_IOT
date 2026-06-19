import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Button, Table, Spinner, Badge, ProgressBar } from "react-bootstrap";
import { io } from "socket.io-client";
import {
    fetchGardenById,
    fetchRealtimeGarden,
    fetchSensorLog,
    turnOnPump,
    turnOffPump,
    turnOnLED,
    turnOffLED, updateGarden
} from "../../services/UserServices";
import { toast } from "react-toastify";
import "./Sensor.scss";

const Sensor = ({ isSidebarOpen }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const socketRef = useRef(null);

    const [garden, setGarden] = useState(null);
    const [latestSensor, setLatestSensor] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [pumpDuration, setPumpDuration] = useState(60); // Mặc định 60 giây
    const [threshold, setThreshold] = useState(0);
    const [autoDuration, setAutoDuration] = useState(0);

    // 1. Tải dữ liệu ban đầu qua API
    const loadInitialData = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const [gardenRes, statusRes, logsRes] = await Promise.all([
                fetchGardenById(id),
                fetchRealtimeGarden(id),  // Lấy từ Device table thay vì SensorLog
                fetchSensorLog(id)
            ]);

            setGarden(gardenRes.data?.data || gardenRes.data);
            // Lấy sensor data từ Device table
            const deviceData = statusRes.data?.data?.device || statusRes.data?.device;
            if (deviceData) {
                setLatestSensor({
                    temperature: deviceData.sensors?.temperature,
                    airHumidity: deviceData.sensors?.airHumidity,
                    soilMoisture: deviceData.sensors?.soilMoisture,
                    isDark: deviceData.sensors?.isDark,
                    isPumpOn: deviceData.isPumpOn,
                    isLedOn: deviceData.isLedOn
                });
            }
            setLogs(logsRes.data?.data || logsRes.data || []);
        } catch (e) {
            toast.error("Failed to sync with garden sensors");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);


    useEffect(() => {
        const socket = io("http://localhost:3000/garden", {
            transports: ["websocket", "polling"],
            reconnectionAttempts: 5

        });
        const currentId = Number(id);
        socket.on("connect", () => {
            console.log("Connected to Socket. ID:", socket.id);
            socket.emit("garden:join", { gardenId: currentId });
            console.log(`Đã gửi yêu cầu join vào room: garden_${currentId}`);

        });

        socket.on("sensor:update", (newData) => {
            console.log("Nhận dữ liệu Sensor real-time:", newData);
            // Cập nhật sensor data từ Device table, giữ nguyên trạng thái pump/LED
            setLatestSensor(prev => ({
                ...prev,
                temperature: newData.temperature,
                airHumidity: newData.airHumidity,
                soilMoisture: newData.soilMoisture,
                isDark: newData.isDark
            }));
            setLogs(prevLogs => {
                const logEntry = {
                    ...newData,
                    recordedAt: newData.timestamp || newData.recordedAt || new Date().toISOString()

                };
                return [logEntry, ...prevLogs].slice(0, 10);

            });
            console.log(" Đã cập nhật UI cho vườn:", currentId);
        });

        // socket.on("device:status", (statusData) => {
        //     console.log("📱 Trạng thái thiết bị thay đổi:", statusData);
        //     if (Number(statusData.gardenId) === currentId) {
        //         setLatestSensor(prev => ({ ...prev, ...statusData }));
        //     }
        // });

        // socket.onAny((eventName, payload) => {
        //     if (eventName !== "connect") {
        //         loadInitialData();
        //         console.log(`🔍 Server đang phát sự kiện tên là: [${eventName}]`, payload);
        //     }
        // });

        socket.on("device:status", (statusData) => {
            console.log("📱 Trạng thái thiết bị thay đổi:", statusData);
            if (Number(statusData.gardenId) === currentId) {
                // Cập nhật ngay lập tức trạng thái LED và Bơm vào state
                setLatestSensor(prev => ({
                    ...prev,
                    isLedOn: statusData.isLedOn,
                    isPumpOn: statusData.isPumpOn
                }));
            }
        });

        socket.on("connect_error", (err) => console.error("Socket Error:", err));
        socketRef.current = socket;
        return () => {
            if (socketRef.current) {
                // Rời phòng trước khi ngắt kết nối
                socketRef.current.emit("garden:leave", { gardenId: currentId });
                socketRef.current.disconnect();
            }
        };

    }, [id]);

    useEffect(() => {
        if (garden) {
            setThreshold(garden.autoIrrigationThreshold || 30);
            setAutoDuration(garden.autoIrrigationDuration || 60); // Lấy từ DB
        }
    }, [garden]);

    const handleUpdateAutoSettings = async () => {
        try {
            setActionLoading(true);
            await updateGarden(id, {
                autoIrrigationThreshold: Number(threshold),
                autoIrrigationDuration: Number(autoDuration) // Gửi kèm thời gian tưới
            });
            toast.success("Đã cập nhật cấu hình tự động!");
        } catch (e) {
            toast.error("Lỗi cập nhật");
        } finally {
            setActionLoading(false);
        }
    };

    // const handleDeviceControl = async (device, currentStatus) => {
    //     try {
    //         setActionLoading(true);
    //         const newStatus = !currentStatus;

    //         if (device === 'pump') {
    //             if (newStatus) {
    //                 // Khi BẬT thì gửi kèm thời gian
    //                 await turnOnPump(id, pumpDuration); 
    //                 toast.info(`Sending ON command for ${pumpDuration}s...`);
    //             } else {
    //                 await turnOffPump(id);
    //             }
    //         } else {
    //             newStatus ? await turnOnLED(id) : await turnOffLED(id);
    //         }
    //     } catch (e) {
    //         toast.error(e.response?.data?.message || `Control command failed`);
    //     } finally {
    //         setActionLoading(false);
    //     }
    // };

    const handleDeviceControl = async (device, currentStatus) => {
        try {
            setActionLoading(true);
            const newStatus = !currentStatus;

            if (device === 'pump') {
                newStatus ? await turnOnPump(id, pumpDuration) : await turnOffPump(id);
            } else {
                newStatus ? await turnOnLED(id) : await turnOffLED(id);
            }

            // CẬP NHẬT NGAY LẬP TỨC (Optimistic Update)
            setLatestSensor(prev => ({
                ...prev,
                [device === 'pump' ? 'isPumpOn' : 'isLedOn']: newStatus
            }));

            toast.success(`${device.toUpperCase()} turned ${newStatus ? 'ON' : 'OFF'}`);
        } catch (e) {
            toast.error(e.response?.data?.message || `Control command failed`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSwitchMode = async (newMode) => {
        if (!garden) return;
        try {
            setActionLoading(true);
            const payload = {
                gardenName: garden.gardenName.trim(),
                description: garden.description || "",
                plantId: garden.plantId ? Number(garden.plantId) : null,
                irrigationMode: newMode, // Chế độ mới
                deviceCode: garden.deviceCode ? garden.deviceCode.trim() : null
            };

            await updateGarden(id, payload);

            // Cập nhật lại state local để UI thay đổi ngay lập tức
            setGarden(prev => ({ ...prev, irrigationMode: newMode }));
            toast.success(`Switched to ${newMode.toUpperCase()} mode!`);
        } catch (e) {
            toast.error("Failed to switch irrigation mode");
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSwitchLedMode = async (isAuto) => {
        if (!garden) return;
        try {
            setActionLoading(true);
            await updateGarden(id, { ledAutoMode: isAuto }); // Gửi boolean true/false
            setGarden(prev => ({ ...prev, ledAutoMode: isAuto }));
            toast.success(`LED mode updated to ${isAuto ? 'AUTO' : 'MANUAL'}`);
        } catch (e) {
            toast.error("Failed to switch LED mode");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="text-center">
                    <Spinner animation="grow" variant="primary" />
                    <p className="mt-2 text-muted fw-bold">Connecting to Garden Live Stream...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`dashboard-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <Container fluid className="py-4 px-lg-4">
                {/* Header Section */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div className="d-flex align-items-center">
                        <Button variant="white" className="shadow-sm rounded-circle me-3 border" onClick={() => navigate(-1)}>
                            <i className="fa fa-chevron-left"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">{garden?.gardenName}</h2>
                            <div className="d-flex align-items-center gap-2">
                                <span className="pulse-indicator"></span>
                                <span className="text-muted small fw-medium">
                                    Live monitoring
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="primary" className="rounded-pill px-4 shadow-sm" onClick={() => loadInitialData(true)}>
                            <i className="fa fa-refresh me-2"></i> Full Sync
                        </Button>
                    </div>
                </div>

                {/* Main Stats */}
                <Row className="g-4 mb-4">
                    <SensorMetricCard
                        icon="thermometer-half" color="danger" label="Temperature"
                        value={latestSensor?.temperature} unit="°C"
                        subtext="Ambient temp"
                    />
                    <SensorMetricCard
                        icon="tint" color="primary" label="Air Humidity"
                        value={latestSensor?.airHumidity} unit="%"
                        subtext="Atmospheric moisture"
                    />
                    <SensorMetricCard
                        icon="leaf" color="success" label="Soil Moisture"
                        value={latestSensor?.soilMoisture} unit="%"
                        subtext={`Auto-water threshold: ${garden?.autoIrrigationThreshold}%`}
                    />
                </Row>

                <Row className="g-4">
                    {/* Control Panel */}
                    <Col lg={4}>
                        <Card className="border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                            <div className="bg-dark p-3 text-white">
                                <h5 className="mb-0 fw-bold"><i className="fa fa-sliders me-2"></i>Live Controls</h5>
                            </div>
                            <Card.Body className="p-4">
                                {garden?.irrigationMode === 'auto' ? (
                                    <AutoThresholdControl
                                        threshold={threshold}
                                        setThreshold={setThreshold}
                                        duration={autoDuration}
                                        setDuration={setAutoDuration}
                                        onUpdate={handleUpdateAutoSettings}
                                        loading={actionLoading}
                                    />
                                ) : (
                                    <ControlSwitch
                                        label="Water Pump" icon="tint" color="info"
                                        active={latestSensor?.isPumpOn}
                                        loading={actionLoading}
                                        onToggle={() => handleDeviceControl('pump', latestSensor?.isPumpOn)}
                                        showInput={true}
                                        duration={pumpDuration}
                                        setDuration={setPumpDuration}
                                    />
                                )}

                                <hr className="my-4" />

                                <ControlSwitch
                                    label="Grow Lights" icon="sun-o" color="warning"
                                    active={latestSensor?.isLedOn} loading={actionLoading}
                                    onToggle={() => handleDeviceControl('led', latestSensor?.isLedOn)}
                                    isAutoMode={garden?.ledAutoMode} // Truyền trạng thái auto để hiển thị label
                                />
                                <div className="mt-4 p-3 bg-light rounded-3 border">
                                    <div className="d-flex justify-content-between x-small fw-bold mb-2 text-muted uppercase">
                                        <span>Current Status</span>
                                        <span>{latestSensor?.isPumpOn ? 'Irrigating...' : 'Standby'}</span>
                                    </div>
                                    <ProgressBar
                                        animated={latestSensor?.isPumpOn}
                                        variant={latestSensor?.isPumpOn ? "info" : "success"}
                                        now={100}
                                        style={{ height: '4px' }}
                                        className="mb-3"
                                    />
                                    <div className="pt-2 pb-2 border-top">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="x-small fw-bold text-muted uppercase">Irrigation Mode</span>
                                            <div className="btn-group shadow-sm" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                                                <Button
                                                    variant={garden?.irrigationMode === 'manual' ? "primary" : "white"}
                                                    size="sm"
                                                    className="x-small border-0 px-3"
                                                    onClick={() => garden?.irrigationMode !== 'manual' && handleSwitchMode('manual')}
                                                    disabled={actionLoading}
                                                    style={{ fontSize: '11px', fontWeight: 'bold' }}
                                                >
                                                    MANUAL
                                                </Button>
                                                <Button
                                                    variant={garden?.irrigationMode === 'auto' ? "primary" : "white"}
                                                    size="sm"
                                                    className="x-small border-0 px-3"
                                                    onClick={() => garden?.irrigationMode !== 'auto' && handleSwitchMode('auto')}
                                                    disabled={actionLoading}
                                                    style={{ fontSize: '11px', fontWeight: 'bold' }}
                                                >
                                                    AUTO
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-top">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="x-small fw-bold text-muted uppercase">LED Mode</span>
                                            <div className="btn-group shadow-sm" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                                                <Button
                                                    variant={garden?.ledAutoMode === false ? "primary" : "white"}
                                                    size="sm"
                                                    className="x-small px-3 border-0"
                                                    onClick={() => handleSwitchLedMode(false)}
                                                    style={{ fontSize: '11px', fontWeight: 'bold' }}
                                                >
                                                    MANUAL
                                                </Button>
                                                <Button
                                                    variant={garden?.ledAutoMode === true ? "primary" : "white"}
                                                    size="sm"
                                                    className="x-small px-3 border-0"
                                                    onClick={() => handleSwitchLedMode(true)}
                                                    style={{ fontSize: '11px', fontWeight: 'bold' }}
                                                >
                                                    AUTO
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* History Table */}
                    <Col lg={8}>
                        <Card className="border-0 shadow-sm rounded-4 h-100">
                            <Card.Header className="bg-white border-0 p-4 pb-0">
                                <h5 className="fw-bold mb-0">Live Sensor Logs</h5>
                            </Card.Header>
                            <Card.Body className="p-4">
                                <div className="table-responsive">
                                    <Table hover borderless className="align-middle">
                                        <thead className="table-light">
                                            <tr className="text-muted small">
                                                <th className="rounded-start">Time</th>
                                                <th>Temp</th>
                                                <th>Air Humid</th>
                                                <th>Soil Humid</th>
                                                <th>Light/Dark</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.slice(0, 10).map((log, idx) => (
                                                <tr key={idx} className="border-bottom">
                                                    <td className="py-3 fw-medium small">
                                                        {new Date(log.recordedAt || Date.now()).toLocaleTimeString()}
                                                    </td>
                                                    <td><span className="fw-bold text-danger">{log.temperature}°C</span></td>
                                                    <td><span className="fw-bold text-primary">{log.airHumidity || log.airHumidity}%</span></td>
                                                    <td><span className="fw-bold text-success">{log.soilMoisture}%</span></td>
                                                    <td>
                                                        <Badge
                                                            bg={log.isDark ? "dark" : "warning"}
                                                            className={`text-${log.isDark ? "white" : "dark"} border`}
                                                        >
                                                            {log.isDark ? "Dark" : "Light"}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

// --- Sub-components (Giữ nguyên cấu trúc nhưng sửa props nếu cần) ---
const SensorMetricCard = ({ icon, color, label, value, unit, subtext }) => (
    <Col xl={4} md={6}>
        <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="p-4 text-center">
                <div className={`icon-circle bg-soft-${color} text-${color} mb-3 mx-auto`}>
                    <i className={`fa fa-${icon} fs-3`}></i>
                </div>
                <h6 className="text-muted text-uppercase fw-bold small mb-1">{label}</h6>
                <h2 className={`fw-bold text-${color} mb-2`}>
                    {value !== undefined ? `${value}${unit}` : "--"}
                </h2>
                <div className="small text-muted fw-medium">{subtext}</div>
            </Card.Body>
        </Card>
    </Col>
);

const ControlSwitch = ({ label, icon, active, color, onToggle, loading, showInput, duration, setDuration }) => (
    <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
            <div className={`p-2 bg-light rounded-3 text-${color} me-3`}>
                <i className={`fa fa-${icon} fs-5`}></i>
            </div>
            <div>
                <div className="fw-bold small">{label}</div>
                <div className={`small fw-bold text-${active ? color : 'muted'}`}>
                    {active ? "ON" : "OFF"}
                </div>
            </div>
        </div>

        <div className="d-flex align-items-center gap-2">
            {/* Nếu là máy bơm và đang tắt, cho phép nhập thời gian */}
            {showInput && !active && (
                <div className="d-flex align-items-center border rounded-pill px-2 bg-white">
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        style={{ width: '50px', border: 'none', textAlign: 'center', outline: 'none', fontSize: '12px' }}
                    />
                    <span className="text-muted small">s</span>
                </div>
            )}

            <Button
                variant={active ? color : "outline-secondary"}
                className="rounded-pill px-3 btn-sm shadow-sm"
                onClick={onToggle}
                disabled={loading}
            >
                {loading ? <Spinner size="sm" /> : (active ? "Turn Off" : "Turn On")}
            </Button>
        </div>
    </div>
);

const AutoThresholdControl = ({ threshold, setThreshold, duration, setDuration, onUpdate, loading }) => (
    <div className="p-3 bg-light rounded-3 border shadow-sm">
        {/* Hàng 1: Info và Inputs */}
        <div className="d-flex align-items-center justify-content-between mb-3">
            {/* Trái: Icon & Nhãn */}
            <div className="d-flex align-items-center">
                <div className="p-2 bg-white shadow-sm rounded-3 text-info me-2">
                    <i className="fa fa-tint fs-6"></i>
                </div>
                <div>
                    <div className="fw-bold small" style={{ fontSize: '14px', lineHeight: '1.2' }}>Water Pump</div>
                    <div className="d-flex align-items-center gap-1">
                        <i className="fa fa-robot text-primary" style={{ fontSize: '10px' }}></i>
                        <span className="fw-bold text-primary text-uppercase" style={{ fontSize: '10px' }}>Auto Mode</span>
                    </div>
                </div>
            </div>

            {/* Phải: Nhóm 2 ô Input - Đã bỏ icon và fix lỗi mất số */}
            <div className="d-flex gap-2">
                {/* Ngưỡng % */}
                <div className="d-flex align-items-center border rounded-pill px-2 bg-white shadow-sm" style={{ height: '32px' }}>
                    <input
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="border-0 text-center fw-bold text-primary p-0"
                        style={{ width: '38px', outline: 'none', fontSize: '14px', background: 'transparent' }}
                    />
                    <span className="text-muted ms-1" style={{ fontSize: '12px' }}>%</span>
                </div>

                {/* Thời gian s */}
                <div className="d-flex align-items-center border rounded-pill px-2 bg-white shadow-sm" style={{ height: '32px' }}>
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="border-0 text-center fw-bold text-warning p-0"
                        style={{ width: '38px', outline: 'none', fontSize: '14px', background: 'transparent' }}
                    />
                    <span className="text-muted ms-1" style={{ fontSize: '12px' }}>s</span>
                </div>
            </div>
        </div>

        {/* Hàng 2: Nút Send */}
        <Button
            variant="primary"
            className="w-100 rounded-pill shadow-sm d-flex align-items-center justify-content-center"
            onClick={onUpdate}
            disabled={loading}
            style={{ height: '30px', fontSize: '14px', fontWeight: '600', backgroundColor: '#3b469b', border: 'none' }}
        >
            {loading ? <Spinner animation="border" size="sm" /> : (
                <>
                    <i className="fa fa-paper-plane me-2" style={{ fontSize: '12px' }}></i>
                    Send
                </>
            )}
        </Button>
    </div>
);

export default Sensor;