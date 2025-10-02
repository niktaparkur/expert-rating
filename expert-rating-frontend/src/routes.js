import {
  createHashRouter,
  createPanel,
  createRoot,
  createView,
  RoutesConfig,
} from '@vkontakte/vk-mini-apps-router';

export const DEFAULT_ROOT = 'default_root';
export const DEFAULT_VIEW = 'default_view';

// Перечисляем ID всех наших панелей (экранов)
export const DEFAULT_VIEW_PANELS = {
  HOME: 'home',
  REGISTRATION: 'registration',
  ADMIN: 'admin',
};

// Создаем конфигурацию маршрутов
export const routes = RoutesConfig.create([
  createRoot(DEFAULT_ROOT, [
    createView(DEFAULT_VIEW, [
      // Маршрут для главной панели: URL будет '/'
      createPanel(DEFAULT_VIEW_PANELS.HOME, '/', []),

      // Маршрут для панели регистрации: URL будет '/registration'
      createPanel(DEFAULT_VIEW_PANELS.REGISTRATION, `/${DEFAULT_VIEW_PANELS.REGISTRATION}`, []),

      // Маршрут для админки: URL будет '/admin'
      // Мы также добавим параметр :vk_id, чтобы обрабатывать deep-link
      createPanel(DEFAULT_VIEW_PANELS.ADMIN, `/${DEFAULT_VIEW_PANELS.ADMIN}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN, `/${DEFAULT_VIEW_PANELS.ADMIN}/requests/:vk_id`, []),
    ]),
  ]),
]);

// Создаем сам роутер на основе конфигурации
export const router = createHashRouter(routes.getRoutes());