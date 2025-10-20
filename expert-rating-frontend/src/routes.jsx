import { createHashRouter, createPanel, createRoot, createView, RoutesConfig } from '@vkontakte/vk-mini-apps-router';

export const DEFAULT_ROOT = 'default_root';

export const VIEW_MAIN = 'view_main';
export const VIEW_AFISHA = 'view_afisha';
export const VIEW_TARIFFS = 'view_tariffs';
export const VIEW_PROFILE = 'view_profile';
export const VIEW_ADMIN = 'view_admin';

export const PANEL_HOME = 'panel_home';
export const PANEL_REGISTRATION = 'panel_registration';
export const PANEL_EXPERT_PROFILE = 'panel_expert_profile';
export const PANEL_AFISHA = 'panel_afisha';
export const PANEL_CREATE_EVENT = 'panel_create_event';
export const PANEL_ADMIN = 'panel_admin';
export const PANEL_VOTING = 'panel_voting';
export const PANEL_TARIFFS = 'tariffs-panel';
export const PANEL_PROFILE = 'profile-panel';

export const routes = RoutesConfig.create([
  createRoot(DEFAULT_ROOT, [
    createView(VIEW_MAIN, [
      createPanel(PANEL_HOME, '/', []),
      createPanel(PANEL_REGISTRATION, '/registration', []),
      createPanel(PANEL_EXPERT_PROFILE, '/expert/:expertId', []),
      createPanel(PANEL_VOTING, '/vote/:promo', []),
      createPanel(PANEL_ADMIN, '/admin', []),
    ]),
    createView(VIEW_AFISHA, [
      createPanel(PANEL_AFISHA, '/afisha', []),
      createPanel(PANEL_CREATE_EVENT, '/create-event', []),
    ]),
    createView(VIEW_TARIFFS, [
        createPanel(PANEL_TARIFFS, '/tariffs', []),
    ]),
    createView(VIEW_PROFILE, [
        createPanel(PANEL_PROFILE, '/profile', []),
    ]),
  ]),
]);

export const router = createHashRouter(routes.getRoutes());