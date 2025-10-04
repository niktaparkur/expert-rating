import {
  createHashRouter,
  createPanel,
  createRoot,
  createView,
  RoutesConfig,
} from '@vkontakte/vk-mini-apps-router';

export const DEFAULT_ROOT = 'default_root';

// --- IDs для Views (историй навигации) ---
export const VIEW_MAIN = 'view_main';
export const VIEW_DASHBOARD = 'view_dashboard';
export const VIEW_ADMIN = 'view_admin';

// --- IDs для Panels (экранов) ---
export const PANEL_HOME = 'panel_home';
export const PANEL_REGISTRATION = 'panel_registration';
export const PANEL_DASHBOARD = 'panel_dashboard';
export const PANEL_CREATE_EVENT = 'panel_create_event';
export const PANEL_ADMIN = 'panel_admin';
export const PANEL_VOTING = 'panel_voting';
export const PANEL_EXPERT_PROFILE = 'panel_expert_profile';

// Собираем в один объект для удобства
export const DEFAULT_VIEW_PANELS = {
  HOME: PANEL_HOME,
  REGISTRATION: PANEL_REGISTRATION,
  ADMIN: PANEL_ADMIN,
  DASHBOARD: PANEL_DASHBOARD,
  CREATE_EVENT: PANEL_CREATE_EVENT,
  VOTING: PANEL_VOTING,
  EXPERT_PROFILE: PANEL_EXPERT_PROFILE,
};

export const routes = RoutesConfig.create([
  createRoot(DEFAULT_ROOT, [
    // --- View для Главной вкладки (id='view_main') ---
    createView(VIEW_MAIN, [
      createPanel(PANEL_HOME, '/', []),
      createPanel(PANEL_REGISTRATION, '/registration', []),
      createPanel(PANEL_VOTING, '/vote/:promo', []), // Голосование доступно из главной "истории"
        createPanel(PANEL_EXPERT_PROFILE, '/expert/:expertId', []),
    ]),
    // --- View для вкладки Личного Кабинета (id='view_dashboard') ---
    createView(VIEW_DASHBOARD, [
      createPanel(PANEL_DASHBOARD, '/dashboard', []),
      createPanel(PANEL_CREATE_EVENT, '/create-event', []),
    ]),
    // --- View для вкладки Админки (id='view_admin') ---
    createView(VIEW_ADMIN, [
        createPanel(PANEL_ADMIN, '/admin', []),
        createPanel(PANEL_ADMIN, `/admin/requests/:vk_id`, []),
    ]),
  ]),
]);

export const router = createHashRouter(routes.getRoutes());