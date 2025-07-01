import React, { useState, useEffect } from 'react';
import UserLogin from './UserLogin';
import AdminDashboard from './AdminDashboard';
import App from './Dashboard'; // Import the original dashboard
import './index.css';

function AppWrapper() {
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [skipLogin, setSkipLogin] = useState(false); // Login wieder aktiviert

  useEffect(() => {
    // Im Entwicklungsmodus: Automatisch als "Gast" anmelden
    if (skipLogin) {
      setUserToken('guest-token');
      setUserRole('guest');
      return;
    }

    const token = localStorage.getItem('userToken');
    const role = localStorage.getItem('userRole');
    if (token && role) {
      setUserToken(token);
      setUserRole(role);
    }
  }, [skipLogin]);

  const handleLogin = (token, role) => {
    setUserToken(token);
    setUserRole(role);
  };

  const handleLogout = () => {
    if (skipLogin) {
      // Im Entwicklungsmodus: Zurück zu Gast-Modus
      setUserToken('guest-token');
      setUserRole('guest');
      setIsAdminMode(false);
      return;
    }
    
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    setUserToken(null);
    setUserRole(null);
    setIsAdminMode(false);
  };

  // Show login only if NOT in skip mode and no token
  if (!skipLogin && !userToken) {
    return <UserLogin onLogin={handleLogin} />;
  }

  // Show admin dashboard if in admin mode (disabled in guest mode)
  if (isAdminMode && userRole !== 'guest') {
    return (
      <AdminDashboard 
        token={userToken} 
        onLogout={handleLogout}
        userRole={userRole}
        onBackToDashboard={() => setIsAdminMode(false)}
      />
    );
  }

  // Show main dashboard
  return (
    <App 
      userToken={userToken}
      userRole={userRole}
      onLogout={handleLogout}
      onAdminMode={() => {
        if (userRole === 'guest') {
          alert('🔧 Entwicklungsmodus: Admin-Funktionen sind deaktiviert. Das System läuft im Gastmodus, da das Backend extern nicht erreichbar ist.');
          return;
        }
        setIsAdminMode(true);
      }}
      developmentMode={skipLogin}
    />
  );
}

export default AppWrapper;