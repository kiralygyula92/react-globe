/** Package entry — the only public surface. */

export { Globe } from './Globe';
export { GlobeLazy } from './Globe.lazy';
export { DefaultConnection } from './components/DefaultConnection';
export { GLOBE_LOCALES, DEFAULT_GLOBE_MESSAGES, localizedName } from './i18n';
export { GLOBE_THEME_TOKENS } from './tokens';
export type { GlobeThemeToken, GlobeThemeTokenUsage } from './tokens';
export type { GlobeLocale, GlobeMessages } from './i18n';

export type {
  CameraPose,
  CapitalRecord,
  ClusterRenderProps,
  ConnectionLineStyle,
  ConnectionPathPoint,
  ConnectionRenderProps,
  ConnectionType,
  CountryCollection,
  CountryFeature,
  CountryProperties,
  GlobeAssets,
  GlobeControlsRenderProps,
  GlobeHandle,
  GlobeProps,
  LatLng,
  Pin,
  PinConnection,
  PinPopupPlacement,
  PinPopupRenderProps,
  PinRenderProps,
  RenderStyle,
  ScreenPoint,
} from './types';
