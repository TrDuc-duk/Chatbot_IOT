import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/Dashboard';
import Login from '../pages/Login/Login';
import Account from '../pages/Account/Account';
import Register from '../pages/Account/RegisterAccount';
import PrivateRoute from './PrivateRoutes';
import AdminRoute from './AdminRoutes';
import UserRoute from './UserRoutes';
import ManageUsers from '../pages/ManageUsers/ManageUsers';
import Devices from '../pages/Device/Device';
import Plant from '../pages/Plant/Plant';
import Garden from '../pages/Garden/Garden';
import SensorTable from '../pages/Sensor/SensorTable';
import Sensor from '../pages/Sensor/Sensor';

const AppRoutes = (props) => {
    return (
        <Routes>
            <Route path="/" element={<UserRoute><Dashboard isSidebarOpen={props.isSidebarOpen} /></UserRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<PrivateRoute><Account isSidebarOpen={props.isSidebarOpen}/></PrivateRoute>} />
            <Route path="/register" element={<Register />}/>
            <Route path="/users" element={<AdminRoute><ManageUsers isSidebarOpen={props.isSidebarOpen}/></AdminRoute>}/>
            <Route path="/devices" element={<AdminRoute><Devices isSidebarOpen={props.isSidebarOpen}/></AdminRoute>} />
            <Route path="/plants" element={<PrivateRoute><Plant isSidebarOpen={props.isSidebarOpen}/></PrivateRoute>} />
            <Route path="/gardens" element={<UserRoute><Garden isSidebarOpen={props.isSidebarOpen}/></UserRoute>} />
            <Route path="/sensors" element={<UserRoute><SensorTable isSidebarOpen={props.isSidebarOpen}/></UserRoute>} />
            <Route path="/sensors/:id" element={<UserRoute><Sensor isSidebarOpen={props.isSidebarOpen}/></UserRoute>} />
        </Routes>
    );
}

export default AppRoutes;