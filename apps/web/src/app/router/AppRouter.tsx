import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { routes } from '@oil-qa-c/shared';
import { useAuthStore } from '@oil-qa-c/store';
import { LoginPage } from '../../pages/login/LoginPage';
import { ChatPage } from '../../pages/chat/ChatPage';
import { FavoritesPage } from '../../pages/favorites/FavoritesPage';

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={routes.login} replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={routes.chat} replace />;
  }

  return <Outlet />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path={routes.login} element={<LoginPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path={routes.chat} element={<ChatPage />} />
          <Route path={routes.favorites} element={<FavoritesPage />} />
        </Route>
        <Route path="*" element={<Navigate to={routes.chat} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
