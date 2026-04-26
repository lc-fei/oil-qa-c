import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';

// Web 入口只负责挂载 React，SDK 初始化和登录恢复交给 AppProviders 管理。
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
