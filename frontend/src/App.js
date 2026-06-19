import { BrowserRouter as Router } from 'react-router-dom';
import { useState } from "react";
import AppRoutes from './routes/AppRoutes';
import Navigation from './components/Navigation/Navigation';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
    const [showSidebar, setShowSidebar] = useState(true);

    return (
        <Router>
            <div className={`app-container ${showSidebar ? 'sidebar-open' : 'sidebar-closed'}`}>
                <Navigation show={showSidebar} setShow={setShowSidebar} />
                
                <div className="app-main-content">
                    <AppRoutes isSidebarOpen={showSidebar} />
                </div>
            </div>
            <ToastContainer position="bottom-center" autoClose={5000} />
        </Router>
    );
}

export default App;