import React, { useState, useEffect } from 'react';
import UserLogin from './UserLogin';
import AdminDashboard from './AdminDashboard';
import App from './Dashboard'; // Import the original dashboard
import './index.css';

function AppWrapper() {
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const role = localStorage.getItem('userRole');
    if (token && role) {
      setUserToken(token);
      setUserRole(role);
    }
  }, []);

  const handleLogin = (token, role) => {
    setUserToken(token);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    setUserToken(null);
    setUserRole(null);
    setIsAdminMode(false);
  };

  // Show login if no token
  if (!userToken) {
    return <UserLogin onLogin={handleLogin} />;
  }

  // Show admin dashboard if in admin mode
  if (isAdminMode) {
    return (
      <AdminDashboard 
        token={userToken} 
        onLogout={handleLogout}
        userRole={userRole}
        onBackToDashboard={() => setIsAdminMode(false)}
      />
    );
  }

  // Show main dashboard with admin button if user is admin
  return (
    <App 
      userToken={userToken}
      userRole={userRole}
      onLogout={handleLogout}
      onAdminMode={() => setIsAdminMode(true)}
    />
  );
}

export default AppWrapper;