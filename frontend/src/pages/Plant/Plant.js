import React, { useState, useEffect } from "react";
import { Table, Card, Badge, Button, Form, Spinner, InputGroup, Modal, Row, Col } from "react-bootstrap";
import { 
    fetchPlants, 
    searchPlant, 
    deletePlant, 
    fetchPlantById, 
    updatePlant, 
    createNewPlant,
    fetchMe 
} from "../../services/UserServices";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Plant = ({ isSidebarOpen }) => {
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [selectedPlant, setSelectedPlant] = useState({});
    const [isEditMode, setIsEditMode] = useState(false);
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadPlants();
        getUserInfo();
    }, []);
    
    const getUserInfo = async () => {
        try {
            const res = await fetchMe();
            setUser(res.data.data); 
            console.log(res.data)
        } catch (e) {
            console.error("Failed to fetch user info", e);
            if (e.response?.status === 401) handleLogout();
        }
    }
       
    
    const handleLogout = async () => {
        try {
            //await logout();
        } catch (e) {
            console.error(e);
        } finally {
            localStorage.clear();
            navigate('/login');
            setUser(null);
        }
    };


    const loadPlants = async () => {
        try {
            setLoading(true);
            const res = await fetchPlants();
            setPlants(res.data?.data || res.data || []);
        } catch (e) {
            toast.error("Failed to load plant list");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        try {
            if (value.trim()) {
                const res = await searchPlant(value);
                setPlants(res.data?.data || res.data || []);
            } else {
                loadPlants();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Open Modal for Create
    const handleAddClick = () => {
        setSelectedPlant({
            name: "",
            description: "",
            minTemperature: "",
            maxTemperature: "",
            minAirHumidity: "",
            maxAirHumidity: "",
            minSoilMoisture: "",
            maxSoilMoisture: ""
        });
        setIsEditMode(true);
        setIsCreateMode(true);
        setShowModal(true);
    };

    // Open Modal for View Detail
    const handleViewDetail = async (id) => {
        try {
            const res = await fetchPlantById(id);
            setSelectedPlant(res.data?.data || res.data);
            setIsEditMode(false);
            setIsCreateMode(false);
            setShowModal(true);
        } catch (e) {
            toast.error("Could not fetch detail information");
        }
    };

    // Open Modal for Edit
    const handleEditClick = (plant) => {
        setSelectedPlant({ ...plant });
        setIsEditMode(true);
        setIsCreateMode(false);
        setShowModal(true);
    };

    // Action: Create New Plant
    const handleCreatePlant = async () => {
        try {
            if (!selectedPlant.name) return toast.warning("Plant name is required");

            setActionLoading(true);
            const cleanData = {
                name: selectedPlant.name,
                description: selectedPlant.description || "",
                minTemperature: Number(selectedPlant.minTemperature),
                maxTemperature: Number(selectedPlant.maxTemperature),
                minAirHumidity: Number(selectedPlant.minAirHumidity),
                maxAirHumidity: Number(selectedPlant.maxAirHumidity),
                minSoilMoisture: Number(selectedPlant.minSoilMoisture),
                maxSoilMoisture: Number(selectedPlant.maxSoilMoisture),
            };

            await createNewPlant(cleanData);
            toast.success("New plant created successfully!");
            setShowModal(false);
            loadPlants();
        } catch (e) {
            const errorMsg = e.response?.data?.message;
            toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || "Creation failed");
        } finally {
            setActionLoading(false);
        }
    };

    // Action: Update Existing Plant
    const handleUpdatePlant = async () => {
        try {
            setActionLoading(true);
            // Remove system fields to avoid 400 Bad Request
            const { id, createdById, createdAt, updatedAt, createdBy, gardens, ...updateData } = selectedPlant;

            const cleanData = {
                ...updateData,
                minTemperature: Number(updateData.minTemperature),
                maxTemperature: Number(updateData.maxTemperature),
                minAirHumidity: Number(updateData.minAirHumidity),
                maxAirHumidity: Number(updateData.maxAirHumidity),
                minSoilMoisture: Number(updateData.minSoilMoisture),
                maxSoilMoisture: Number(updateData.maxSoilMoisture),
            };

            await updatePlant(id, cleanData);
            toast.success("Updated successfully!");
            setShowModal(false);
            loadPlants();
        } catch (e) {
            const errorMsg = e.response?.data?.message;
            toast.error(Array.isArray(errorMsg) ? errorMsg.join(", ") : errorMsg || "Update failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            // Option 1: Delete immediately from UI for instant feel (Optional)
            // setPlants(plants.filter(p => p.id !== id));

            await deletePlant(id);
            toast.success("Deleted successfully");
            
            // Reload list to sync with database
            loadPlants();
        } catch (e) {
            toast.error("Cannot delete plant that is currently in use");
            // If you used Option 1, reload here to bring back the item if delete failed
            loadPlants();
        }
    };

    return (
        <div className={`dashboard-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <div className="manage-users-container px-3">
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <div>
                        <h4 className="fw-bold mb-1">Plant Library</h4>
                    </div>
                    <div className="d-flex gap-3">
                        <InputGroup className="shadow-sm rounded-pill overflow-hidden border-0" style={{ width: '300px' }}>
                            <InputGroup.Text className="bg-white border-0 ps-3">
                                <i className="fa fa-search text-muted"></i>
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search plant..."
                                className="border-0 shadow-none"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </InputGroup>
                        {user?.role === "admin" &&
                            <Button variant="primary" className="rounded-pill px-4 shadow-sm" onClick={handleAddClick}>
                                <i className="fa fa-plus me-2"></i> Add New Plant
                            </Button>
                        }
                    </div>
                </div>

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light text-uppercase small fw-bold">
                            <tr>
                                <th className="ps-4" style={{ width: '60px' }}>No.</th>
                                <th>Plant Name</th>
                                <th className="text-center">Detail</th>
                                <th className="text-center">Temperature</th>
                                <th className="text-center">Air Humidity</th>
                                <th className="text-center">Soil Moisture</th>
                                {user?.role === "admin" &&<th className="text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                            ) : plants.map((plant, index) => (
                                <tr key={plant.id}>
                                    <td className="ps-4 text-muted small">{index + 1}</td>
                                    <td className="fw-bold">{plant.name}</td>
                                    <td className="text-center">
                                        <Button variant="link" className="text-info p-0 shadow-none" onClick={() => handleViewDetail(plant.id)}>
                                            <i className="fa fa-eye" style={{color: "grey"}}></i>
                                        </Button>
                                    </td>
                                    <td className="text-center">
                                        <Badge bg="soft-danger" className="text-danger rounded-pill fw-500">
                                            {plant.minTemperature}° - {plant.maxTemperature}°C
                                        </Badge>
                                    </td>
                                    <td className="text-center">
                                        <Badge bg="soft-primary" className="text-primary rounded-pill fw-500">
                                            {plant.minAirHumidity}% - {plant.maxAirHumidity}%
                                        </Badge>
                                    </td>
                                    <td className="text-center">
                                        <Badge bg="soft-success" className="text-success rounded-pill fw-500">
                                            {plant.minSoilMoisture}% - {plant.maxSoilMoisture}%
                                        </Badge>
                                    </td>
                                    {user?.role === "admin" &&
                                    <td className="text-center">
                                        <Button variant="link" className="text-primary p-2 shadow-none" onClick={() => handleEditClick(plant)}>
                                            <i className="fa fa-pencil-square-o fs-5"></i>
                                        </Button>
                                        <Button variant="link" className="text-danger p-2 shadow-none" onClick={() => handleDelete(plant.id)}>
                                            <i className="fa fa-trash-o fs-5"></i>
                                        </Button>
                                    </td>
                                    }
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
            </div>

            {/* MODAL: VIEW / EDIT / CREATE */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {isCreateMode ? "Add New Plant" : isEditMode ? "Edit Plant Information" : "Plant Details"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-3">
                    <Form>
                        <Row>
                            <Col md={12} className="mb-3">
                                <Form.Label className="small fw-bold">Plant Name</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    placeholder="Enter plant name"
                                    value={selectedPlant.name || ""} 
                                    disabled={!isEditMode}
                                    onChange={(e) => setSelectedPlant({...selectedPlant, name: e.target.value})}
                                />
                            </Col>
                            <Col md={12} className="mb-3">
                                <Form.Label className="small fw-bold">Description</Form.Label>
                                <Form.Control 
                                    as="textarea" rows={3}
                                    placeholder="Enter detailed description"
                                    value={selectedPlant.description || ""} 
                                    disabled={!isEditMode}
                                    onChange={(e) => setSelectedPlant({...selectedPlant, description: e.target.value})}
                                />
                            </Col>
                            <Col md={4} className="mb-3">
                                <Form.Label className="small fw-bold">Temperature (°C)</Form.Label>
                                <InputGroup size="sm">
                                    <Form.Control type="number" placeholder="Min" value={selectedPlant.minTemperature || ""} disabled={!isEditMode} onChange={(e) => setSelectedPlant({...selectedPlant, minTemperature: e.target.value})}/>
                                    <Form.Control type="number" placeholder="Max" value={selectedPlant.maxTemperature || ""} disabled={!isEditMode} onChange={(e) => setSelectedPlant({...selectedPlant, maxTemperature: e.target.value})}/>
                                </InputGroup>
                            </Col>
                            <Col md={4} className="mb-3">
                                <Form.Label className="small fw-bold">Air Humidity (%)</Form.Label>
                                <InputGroup size="sm">
                                    <Form.Control type="number" placeholder="Min" value={selectedPlant.minAirHumidity || ""} disabled={!isEditMode} onChange={(e) => setSelectedPlant({...selectedPlant, minAirHumidity: e.target.value})}/>
                                    <Form.Control type="number" placeholder="Max" value={selectedPlant.maxAirHumidity || ""} disabled={!isEditMode} onChange={(e) => setSelectedPlant({...selectedPlant, maxAirHumidity: e.target.value})}/>
                                </InputGroup>
                            </Col>
                            <Col md={4} className="mb-3">
                                <Form.Label className="small fw-bold">Soil Moisture (%)</Form.Label>
                                <InputGroup size="sm">
                                    <Form.Control type="number" placeholder="Min" value={selectedPlant.minSoilMoisture || ""} disabled={!isEditMode} onChange={(e) => setSelectedPlant({...selectedPlant, minSoilMoisture: e.target.value})}/>
                                    <Form.Control type="number" placeholder="Max" value={selectedPlant.maxSoilMoisture || ""} disabled={!isEditMode} onChange={(e) => setSelectedPlant({...selectedPlant, maxSoilMoisture: e.target.value})}/>
                                </InputGroup>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="light" className="rounded-pill px-4" onClick={() => setShowModal(false)}>
                        {isEditMode ? "Cancel" : "Close"}
                    </Button>
                    {isEditMode && (
                        <Button 
                            variant="primary" 
                            className="rounded-pill px-4 shadow" 
                            onClick={isCreateMode ? handleCreatePlant : handleUpdatePlant}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Spinner size="sm" /> : (isCreateMode ? "Create Plant" : "Save Changes")}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Plant;