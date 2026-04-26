// 路由常量集中维护，避免页面跳转和路由声明出现字符串漂移。
export const routes = {
  login: '/login',
  chat: '/chat',
  favorites: '/favorites',
} as const;
