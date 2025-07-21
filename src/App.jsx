import React, { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { supabase } from './lib/supabase';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = supabase.auth.session();
    if (session) {
      // If you were using Supabase Auth, you'd fetch the user profile here.
      // Since we're doing our own auth, we'll handle it differently.
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  if (user.is_admin) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return <UserDashboard user={user} onLogout={handleLogout} />;
}

export default App;
