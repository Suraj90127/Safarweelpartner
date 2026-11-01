import { StatusBarStyle, useColorScheme } from 'react-native';
import { useAppSelector } from '../redux/hooks';
import type { ThemeMode } from '../redux/slices/themeSlice';
import { COLORS } from '../constants/colors';

export type ThemePreference = ThemeMode;
export type ResolvedThemeMode = 'light' | 'dark';

export interface ThemePalette {
  background: string;
  bgwhite: string;
  heroBg: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  mutedText: string;
  purpleText: string;
  icon: string;
  border: string;
  borderSubtle: string;
  primary: string;
  accent: string;
  accentButton: string;
  buttonDisabled: string;
  destructive: string;
  success: string;
  warning: string;
  info: string;
  placeholder: string;
  primaryGray: string;
  // textDark:string;
  statusBarStyle: StatusBarStyle;
}

// isDark ? COLORS.textDark : COLORS.textLight

export const themePalettes: Record<ResolvedThemeMode, ThemePalette> = {
  light: {
    background: COLORS.lightBg,
    bgwhite: COLORS.white,
    heroBg: COLORS.primary,
    surface: COLORS.white,
    accent: COLORS.primary,
    accentButton: COLORS.primary,
    buttonDisabled: COLORS.secondaryLight,
    surfaceMuted: COLORS.lightCard,
    text: COLORS.textLight,
    purpleText: COLORS.textLight,
    mutedText: COLORS.textLightSecondary,
    icon: COLORS.iconColor,
    border: COLORS.lightBorder,
    borderSubtle: COLORS.bordercolor,
    primary: COLORS.primary,
    destructive: COLORS.danger,
    success: COLORS.success,
    warning: COLORS.warning,
    info: COLORS.activeColor,
    placeholder: COLORS.textLightSecondary,
    primaryGray: COLORS.secondaryLight,
    statusBarStyle: 'dark-content',
  },
  dark: {
    background: COLORS.darkBg,
    bgwhite: COLORS.darkBg,
    heroBg: COLORS.darkCard,
    surface: COLORS.darkBg,
    accent: COLORS.primary,
    accentButton: COLORS.primary,
    buttonDisabled: COLORS.darkBorder,
    surfaceMuted: COLORS.darkCard,
    text: COLORS.textDark,
    purpleText: COLORS.textDark,
    mutedText: COLORS.textDarkSecondary,
    icon: COLORS.textDarkSecondary,
    border: COLORS.darkBorder,
    borderSubtle: COLORS.darkborder,
    primary: COLORS.primary,
    destructive: COLORS.danger,
    success: COLORS.success,
    warning: COLORS.warning,
    info: COLORS.activeColor,
    placeholder: COLORS.textDarkSecondary,
    primaryGray: COLORS.textDarkSecondary,
    statusBarStyle: 'light-content',
  },
};

export const getThemePalette = (mode: ResolvedThemeMode): ThemePalette =>
  themePalettes[mode];

/**
 * Raw user preference: 'light' | 'dark' | 'system'.
 * Use this to know which option the user actually selected.
 */
export const useThemePreference = (): ThemePreference =>
  useAppSelector(state => state.theme.mode);

/**
 * The resolved visual theme ('light' | 'dark').
 * When the preference is 'system', this follows the device setting live.
 */
export const useThemeMode = (): ResolvedThemeMode => {
  const preference = useThemePreference();
  const systemScheme = useColorScheme();

  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }

  return preference === 'dark' ? 'dark' : 'light';
};

export const useThemePalette = () => {
  const mode = useThemeMode();
  const preference = useThemePreference();

  return {
    mode,
    preference,
    palette: getThemePalette(mode),
  };
};

export default useThemePalette;
