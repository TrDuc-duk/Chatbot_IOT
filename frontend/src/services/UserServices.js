import axios from "../setup/axios";

const login = (data) => {
    return axios.post("/api/auth/login", data);
};

const registerAccount = (data) => {
    return axios.post("/api/auth/register", data);
};

const logout = () => {
    return axios.post("/api/auth/logout");
};

const refresh = () => {
    return axios.post("/api/auth/refresh");
};

const fetchMe = () => {
    return axios.get("/api/auth/me");
};

const fetchProfile = () => {
    return axios.get("/api/users/profile");
};

const updateProfile = (data) => {
    return axios.put("/api/users/profile", data);
};

const changePassword = (data) => {
    return axios.post("/api/users/change-password", data);
};

const fetchAllUsers = () => {
    return axios.get("/api/users");
};

const statisticsUsers = () => {
    return axios.get("/api/users/statistics");
};

const addNewUsersAdmin = (userData) => {
    return axios.post("/api/users", userData);
};

const fetchUserAdmin = (id) => {
    return axios.get(`/api/users/${id}`);
};

const updateUserAdmin = (id, userData) => {
    return axios.put(`/api/users/${id}`, userData);
};

const deleteUserAdmin = (id) => {
    return axios.delete(`/api/users/${id}`);
};

const fetchAllDevices = () => {
    return axios.get("/api/devices");
}

const fetchDeviceById = (id) => {
    return axios.get(`/api/devices/${id}`);
};

const fetchDeviceByCode = (deviceCode) => {
    return axios.get(`/api/devices/code/${deviceCode}`);
};

const fetchDeviceStatus = (id) => {
    return axios.get(`/api/devices/${id}/status`);
};

const createNewGarden = (data) => {
    return axios.post("/api/gardens", data);
}

const fetchGardens = () => {
    return axios.get("/api/gardens");
}

const fetchGardenById = (id) => {
    return axios.get(`/api/gardens/${id}`);
};

const updateGarden = (id, data) => {
    return axios.put(`/api/gardens/${id}`, data);
};

const deleteGarden = (id) => {
    return axios.delete(`/api/gardens/${id}`);
};

const turnOnPump = (id, duration) => {
    return axios.post(`/api/gardens/${id}/pump/on`, { durationSeconds: duration });
};

const turnOffPump = (id) => {
    return axios.post(`/api/gardens/${id}/pump/off`, {});
};

const turnOnLED = (id) => {
    return axios.post(`/api/gardens/${id}/led/on`, {});
};

const turnOffLED = (id) => {
    return axios.post(`/api/gardens/${id}/led/off`, {});
};

const fetchRealtimeGarden = (id) => {
    return axios.get(`/api/gardens/${id}/status`);
};

const createNewPlant = (data) => {
    return axios.post("/api/plants", data);
}

const fetchPlants = () => {
    return axios.get("/api/plants");
}

const searchPlant = (keyword) => {
    return axios.get(`/api/plants/search?q=${encodeURIComponent(keyword)}`);
};

const fetchPlantById = (id) => {
    return axios.get(`/api/plants/${id}`);
};

const updatePlant = (id, data) => {
    return axios.put(`/api/plants/${id}`, data);
};

const deletePlant = (id) => {
    return axios.delete(`/api/plants/${id}`);
};

const fetchSensorLog = (id) => {
    return axios.get(`/api/gardens/${id}/sensors/logs`);
};

const fetchSensorLatest = (id) => {
    return axios.get(`/api/gardens/${id}/sensors/latest`);
};

const fetchSensorStatistics = (id) => {
    return axios.get(`/api/gardens/${id}/sensors/statistics`);
};

const fetchIrrigationStatus = (id) => {
    return axios.get(`/api/gardens/${id}/irrigation/status`);
};

const fetchIrrigationLog = (id) => {
    return axios.get(`/api/gardens/${id}/irrigation/logs`);
};

const fetchIrrigationStatistics = (id) => {
    return axios.get(`/api/gardens/${id}/irrigation/statistics`);
};

export {
    login,
    registerAccount,
    logout,
    refresh,
    fetchMe,
    fetchProfile,
    updateProfile,
    changePassword,
    fetchAllUsers,
    statisticsUsers,
    addNewUsersAdmin,
    fetchUserAdmin,
    updateUserAdmin,
    deleteUserAdmin,
    fetchAllDevices,
    fetchDeviceById,
    fetchDeviceByCode,
    fetchDeviceStatus,
    createNewGarden,
    fetchGardens,
    fetchGardenById,
    updateGarden,
    deleteGarden,
    turnOnPump,
    turnOffPump,
    turnOffLED,
    turnOnLED,
    fetchRealtimeGarden,
    createNewPlant,
    fetchPlants,
    searchPlant,
    fetchPlantById,
    updatePlant,
    deletePlant,
    fetchSensorLog,
    fetchSensorLatest,
    fetchSensorStatistics,
    fetchIrrigationStatus,
    fetchIrrigationLog,
    fetchIrrigationStatistics
};