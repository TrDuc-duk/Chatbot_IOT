import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button, Badge, Spinner, Modal, Form, Container } from "react-bootstrap";
import { fetchGardens, createNewGarden, updateGarden, deleteGarden, fetchPlants } from "../../services/UserServices";
import { toast } from "react-toastify";
import "./Garden.scss";

const Garden = ({ isSidebarOpen }) => {
    const [gardens, setGardens] = useState([]);
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // const [selectedGarden, setSelectedGarden] = useState({
    //     gardenName: "",
    //     description: "",
    //     plantId: "",
    //     irrigationMode: "manual"
    // });

    const [selectedGarden, setSelectedGarden] = useState({
        gardenName: "",
        description: "",
        plantId: "",
        irrigationMode: "manual",
        autoIrrigationThreshold: 30, 
        autoIrrigationDuration: 60,
        ledAutoMode: false,
        deviceCode: ""
    });
    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [gRes, pRes] = await Promise.all([fetchGardens(), fetchPlants()]);
            setGardens(gRes.data?.data || gRes.data || []);
            setPlants(pRes.data?.data || pRes.data || []);
        } catch (e) { toast.error("Connection error!"); }
        finally { setLoading(false); }
    };

    // const handleSubmit = async () => {
    //     if (!selectedGarden.gardenName) return toast.warning("Garden name is required");
        
    //     try {
    //         setActionLoading(true);
    //         const payload = {
    //             gardenName: selectedGarden.gardenName.trim(),
    //             description: selectedGarden.description || "",
    //             plantId: selectedGarden.plantId ? Number(selectedGarden.plantId) : null,
    //             irrigationMode: selectedGarden.irrigationMode || "manual",
    //             // Thêm deviceCode vào đây để Backend tìm/tạo Device
    //             deviceCode: selectedGarden.deviceCode ? selectedGarden.deviceCode.trim() : null
    //         };

    //         if (isEditMode) {
    //             await updateGarden(selectedGarden.id, payload);
    //             toast.success("Garden updated successfully!");
    //         } else {
    //             await createNewGarden(payload);
    //             toast.success("New garden created successfully!");
    //         }
            
    //         setShowModal(false);
    //         loadData();
    //     } catch (e) {
    //         // Hiển thị lỗi Conflict (409) hoặc Validation (400) từ Backend
    //         const msg = e.response?.data?.message;
    //         toast.error(Array.isArray(msg) ? msg[0] : msg || "Operation failed");
    //     } finally {
    //         setActionLoading(false);
    //     }
    // };

    const handleSubmit = async () => {
    if (!selectedGarden.gardenName) return toast.warning("Garden name is required");
    
    try {
        setActionLoading(true);
        
        // 1. Tạo Payload cơ bản (Chỉ chứa các trường Backend CreateDTO chắc chắn chấp nhận)
        const basePayload = {
            gardenName: selectedGarden.gardenName.trim(),
            description: selectedGarden.description || "",
            plantId: selectedGarden.plantId ? Number(selectedGarden.plantId) : null,
            irrigationMode: selectedGarden.irrigationMode,
            deviceCode: selectedGarden.deviceCode ? selectedGarden.deviceCode.trim() : null
        };

        // 2. Tạo Payload bổ sung (Các trường gây lỗi ở Create nhưng chạy được ở Update)
        const extraPayload = {
            autoIrrigationThreshold: Number(selectedGarden.autoIrrigationThreshold),
            autoIrrigationDuration: Number(selectedGarden.autoIrrigationDuration),
            ledAutoMode: selectedGarden.ledAutoMode
        };

        if (isEditMode) {
            // Trường hợp Edit: Gửi tất cả cùng lúc (vì update không bị chặn DTO khắt khe)
            await updateGarden(selectedGarden.id, { ...basePayload, ...extraPayload });
            toast.success("Garden updated!");
        } else {
            // TRƯỜNG HỢP TẠO MỚI (Lách luật):
            // Bước A: Gọi create với payload cơ bản
            const response = await createNewGarden(basePayload);
            const newGardenId = response.data?.id || response.data?.data?.id;

            // Bước B: Nếu là chế độ Auto, gọi tiếp Update để ghi đè Threshold/Duration/LED
            if (newGardenId && (selectedGarden.irrigationMode === 'auto' || selectedGarden.ledAutoMode)) {
                await updateGarden(newGardenId, extraPayload);
            }
            toast.success("New garden created and configured!");
        }
        
        setShowModal(false);
        loadData();
    } catch (e) {
        console.error("Error details:", e.response?.data);
        const msg = e.response?.data?.message;
        toast.error(Array.isArray(msg) ? msg[0] : msg || "Operation failed");
    } finally {
        setActionLoading(false);
    }
};

    const handleDelete = async (id) => {
        try {
            await deleteGarden(id);
            toast.success("Deleted");
            loadData();
        } catch (e) { toast.error("Failed to delete"); }
    };

    return (
        <div className={`dashboard-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <div className="dashboard-content-area">
                <Container fluid>
                    {/* Header: Dàn hàng ngang hoàn toàn */}
                    <div className="d-flex justify-content-between align-items-center mb-5">
                        <div>
                            <h2 className="fw-bold text-dark mb-1">Garden Management</h2>
                        </div>
                        <Button variant="primary" className="rounded-pill px-4 py-2 shadow-sm" 
                            onClick={() => {
                                setSelectedGarden({gardenName: "", description: "", plantId: "", irrigationMode: "manual", deviceCode: ""});
                                setIsEditMode(false); setShowModal(true);
                            }}>
                            <i className="fa fa-plus me-2"></i> Register New Garden
                        </Button>
                    </div>

                    {loading ? (
                        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
                    ) : (
                        <Row className="g-4">
                            {gardens.map((g) => (
                                <Col key={g.id} xs={12} sm={6} lg={4} xl={3}>
                                    <Card className="garden-card-custom h-100 shadow-sm border-0">
                                        <Card.Body className="p-4 d-flex flex-column">
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div className="p-2 bg-soft-success rounded-3 text-success">
                                                    <i className="fa fa-leaf fs-4"></i>
                                                </div>
                                                <div className="d-flex gap-1">
                                                    <Button 
                                                        variant="link" 
                                                        className="text-primary p-1" 
                                                        onClick={() => {
                                                            setSelectedGarden({
                                                                ...g,
                                                                // Trích xuất deviceCode từ object device lồng bên trong
                                                                deviceCode: g.device?.deviceCode || "" 
                                                            });
                                                            setIsEditMode(true); 
                                                            setShowModal(true);
                                                        }}
                                                    >
                                                        <i className="fa fa-edit"></i>
                                                    </Button>
                                                    <Button variant="link" className="text-danger p-1" onClick={() => handleDelete(g.id)}>
                                                        <i className="fa fa-trash"></i>
                                                    </Button>
                                                </div>
                                            </div>

                                            <h5 className="fw-bold text-dark mb-1">{g.gardenName}</h5>
                                            <div className="mb-3">
                                                <Badge bg={g.irrigationMode === 'auto' ? 'success' : 'secondary'} className="rounded-pill text-uppercase" style={{fontSize: '0.7rem'}}>
                                                    {g.irrigationMode} MODE
                                                </Badge>
                                            </div>
                                            
                                            <p className="text-muted small flex-grow-1 mb-3">
                                                {g.description || "No description provided for this zone."}
                                            </p>

                                            <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                                                <div className="small text-truncate me-2">
                                                    <span className="text-muted">Plant: </span>
                                                    <span className="fw-bold d-block text-truncate">{g.plant?.name || "Unset"}</span>
                                                </div>
                                                <Button variant="outline-primary" size="sm" className="rounded-pill px-3" 
                                                    onClick={() => window.location.href = `/sensors/${g.id}`}>
                                                    Monitoring
                                                </Button>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Container>
            </div>

            {/* Modal remains similar but ensure it doesn't send bad fields */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">{isEditMode ? "Update Garden" : "New Garden"}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="px-4">
                    <Form>
                        {/* Garden Name */}
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Garden Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={selectedGarden.gardenName}
                                onChange={(e) => setSelectedGarden({...selectedGarden, gardenName: e.target.value})} 
                            />
                        </Form.Group>

                        {/* Device Code */}
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-primary">
                                <i className="fa fa-microchip me-1"></i> Device Code (ESP32 ID)
                            </Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="e.g. ESP32_001"
                                value={selectedGarden.deviceCode || ""} 
                                onChange={(e) => setSelectedGarden({...selectedGarden, deviceCode: e.target.value})}
                            />
                        </Form.Group>

                        <Row>
                            {/* Plant Type - Đã thêm lại ở đây */}
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Plant Type</Form.Label>
                                    <Form.Select 
                                        value={selectedGarden.plantId || ""} 
                                        onChange={(e) => setSelectedGarden({...selectedGarden, plantId: e.target.value})}
                                    >
                                        <option value="">Select a plant...</option>
                                        {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            {/* Irrigation Mode */}
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Irrigation Mode</Form.Label>
                                    <Form.Select 
                                        value={selectedGarden.irrigationMode} 
                                        onChange={(e) => setSelectedGarden({...selectedGarden, irrigationMode: e.target.value})}
                                    >
                                        <option value="manual">Manual</option>
                                        <option value="auto">Auto</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            {/* LED Mode - ledAutoMode trong DB là Boolean */}
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">LED Mode</Form.Label>
                                    <Form.Select 
                                        value={selectedGarden.ledAutoMode ? "true" : "false"} 
                                        onChange={(e) => setSelectedGarden({...selectedGarden, ledAutoMode: e.target.value === "true"})}
                                    >
                                        <option value="false">Manual</option>
                                        <option value="true">Auto</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Input cho Threshold và Duration khi chọn Auto */}
                        {selectedGarden.irrigationMode === 'auto' && (
                            <div className="p-3 mb-3 border rounded bg-light shadow-sm">
                                <Row>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold text-primary">Threshold (%)</Form.Label>
                                            <Form.Control 
                                                type="number" 
                                                placeholder="e.g. 30"
                                                value={selectedGarden.autoIrrigationThreshold || ""}
                                                onChange={(e) => setSelectedGarden({...selectedGarden, autoIrrigationThreshold: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold text-warning">Duration (s)</Form.Label>
                                            <Form.Control 
                                                type="number" 
                                                placeholder="e.g. 60"
                                                value={selectedGarden.autoIrrigationDuration || ""}
                                                onChange={(e) => setSelectedGarden({...selectedGarden, autoIrrigationDuration: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </div>
                        )}

                        {/* Description */}
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Description</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={2} 
                                value={selectedGarden.description}
                                onChange={(e) => setSelectedGarden({...selectedGarden, description: e.target.value})} 
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0 px-4 pb-4">
                    <Button variant="light" className="rounded-pill px-4" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" className="rounded-pill px-4 shadow" onClick={handleSubmit} disabled={actionLoading}>
                        {actionLoading ? <Spinner size="sm" /> : (isEditMode ? "Update" : "Create")}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Garden;