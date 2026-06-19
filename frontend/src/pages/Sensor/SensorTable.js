import React, { useState, useEffect } from "react";
import { Table, Container, Badge, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { fetchGardens } from "../../services/UserServices";

const SensorTable = ({isSidebarOpen}) => {
    const [gardens, setGardens] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await fetchGardens();
                setGardens(res.data?.data || res.data || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        loadData();
    }, []);

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

    return (
        <div className={`dashboard-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Container fluid className="p-4">
            <h3 className="fw-bold mb-4">Sensor Monitoring List</h3>
            <div className="bg-white p-3 rounded-4 shadow-sm">
                <Table hover responsive className="align-middle mb-0">
                    <thead className="bg-light">
                        <tr>
                            <th>ID</th>
                            <th>Garden Name</th>
                            <th>Plant</th>
                            <th>Mode</th>
                            <th>Description</th>
                            <th className="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {gardens.map((g, index) => (
                            <tr key={g.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sensors/${g.id}`)}>
                                <td>{index + 1}</td>
                                <td className="fw-bold text-primary">{g.gardenName}</td>
                                <td>{g.plant?.name || "Unset"}</td>
                                <td>
                                    <Badge bg={g.irrigationMode === 'auto' ? 'success' : 'secondary'}>
                                        {g.irrigationMode}
                                    </Badge>
                                </td>
                                <td className="text-muted small">{g.description || "No description"}</td>
                                <td className="text-center">
                                    <Button variant="outline-primary" size="sm" className="rounded-pill px-3">
                                        View Detail
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Container>
        </div>
    );
};

export default SensorTable;