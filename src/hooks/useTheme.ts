import { useAppSelector } from '../redux/hooks';
import { COLORS } from '../constants/colors';

export const useTheme = () => {
  const isDark = useAppSelector(state => state.theme.isDark);
  const mode = useAppSelector(state => state.theme.mode);

  const colors = {
    background: isDark ? COLORS.darkBg : COLORS.lightBg,
    card: isDark ? COLORS.darkCard : COLORS.lightCard,
    border: isDark ? COLORS.darkBorder : COLORS.lightBorder,
    text: isDark ? COLORS.textDark : COLORS.textLight,
    textSecondary: isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary,
    primary: COLORS.primary,
    accent: COLORS.accent,
    success: COLORS.success,
    danger: COLORS.danger,
    warning: COLORS.warning,
  };

  return { isDark, mode, colors };
};
