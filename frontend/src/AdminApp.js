import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import './index.css';

function AdminApp() {
  const [adminToken, setAdminToken] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setAdminToken(token);
    }
  }, []);

  const handleAdminLogin = (token) => {
    setAdminToken(token);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
  };

  if (adminToken) {
    return <AdminDashboard token={adminToken} onLogout={handleAdminLogout} />;
  }

  return <AdminLogin onLogin={handleAdminLogin} />;
}

// Only render if this is the admin page
if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
  const container = document.getElementById('root');
  const root = createRoot(container);
  root.render(<AdminApp />);
} else {
  // Import and render the main app
  import('./App').then(({ default: App }) => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    root.render(<App />);
  });
}