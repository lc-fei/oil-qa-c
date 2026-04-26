import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { routes } from '@oil-qa-c/shared';
import { useAuthStore } from '@oil-qa-c/store';
import { LoginPage } from '../../pages/login/LoginPage';
import { ChatPage } from '../../pages/chat/ChatPage';
import { FavoritesPage } from '../../pages/favorites/FavoritesPage';

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 受保护页面统一依赖 SDK 恢复后的认证快照，避免各页面重复判断 token。
  if (!isAuthenticated) {
    return <Navigate to={routes.login} replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 已登录用户不应再回到登录页，刷新后的状态由 AppProviders 先恢复。
  if (isAuthenticated) {
    return <Navigate to={routes.chat} replace />;
  }

  return <Outlet />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录页与业务页分开声明，保证认证状态变化时路由重定向逻辑清晰。 */}
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
