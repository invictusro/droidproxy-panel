import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Phones from './pages/Phones';
import AddPhone from './pages/AddPhone';
import Servers from './pages/admin/Servers';
import Users from './pages/admin/Users';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// APK Download redirect - redirects to GitHub releases
function APKRedirect() {
  window.location.href = 'https://github.com/invictusro/droidproxy-apk/releases/latest/download/droidproxy.apk';
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to download...</p>
      </div>
    </div>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/phones" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, login, logout, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/phones" replace /> : <Login />
      } />
      <Route path="/auth/callback" element={<AuthCallback onLogin={login} />} />
      <Route path="/apk" element={<APKRedirect />} />

      <Route element={
        <ProtectedRoute>
          <Layout user={user} onLogout={logout} />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/phones" replace />} />
        <Route path="phones" element={<Phones />} />
        <Route path="phones/add" element={<AddPhone />} />

        {/* Admin routes */}
        <Route path="admin/servers" element={
          <AdminRoute><Servers /></AdminRoute>
        } />
        <Route path="admin/users" element={
          <AdminRoute><Users /></AdminRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/phones" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
