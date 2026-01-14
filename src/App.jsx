import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SidebarProvider } from './context/SidebarContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import MagneticCursor from './components/MagneticCursor';
import ThemeToggle from './components/ThemeToggle';
import { warmupAPI } from './services/api';
import Home from './pages/Home';
import Features from './pages/Features';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';

function AppShell() {
  useTheme();

  useEffect(() => {
    // Fire-and-forget warmup to reduce first-request latency.
    warmupAPI.ping().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <DataProvider>
        <SidebarProvider>
          <MagneticCursor />
          <ThemeToggle />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Auth />} />
              <Route path="/features" element={<Features />} />
              <Route path="/pricing" element={<Home />} />
              
              {/* Protected Dashboard Routes */}
              <Route 
                path="/dashboard/*" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </DataProvider>
    </AuthProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

export default App;
