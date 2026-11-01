/**
 * Design token colors — combined matched to appColors and tailwind.config.js
 * Use these constants for any inline StyleSheet colors or NativeWind class names.
 */

export type AppColors = {
  white: string;
  black: string;
  primary: string;
  subPrimary: string;
  primaryFont: string;
  secondaryFont: string;
  graybackground: string;
  bordercolor: string;
  red: string;
  border: string;
  delBackground: string;
  primaryLight: string;
  greenborder: string;
  cardicon: string;
  price: string;
  subFont: string;
  modelBg: string;
  alertBg: string;
  alertIconBg: string;
  alertBorder: string;
  invoiceBtn: string;
  darkThemeSub: string;
  categoryTitle: string;
  alertRed: string;
  activeColor: string;
  completeColor: string;
  scheduleColor: string;
  darkborder: string;
  closeBg: string;
  darkPurpal: string;
  lightPurpal: string;
  lightRed: string;
  primaryBg: string;
  subCategorytag: string;
  darkBorderBlack: string;
  dotPrimary: string;
  bgDark: string;
  darkFillBar: string;
  darkText: string;
  planNote: string;
  dropDownColor: string;
  planDot: string;
  planLine: string;
  round: string;
  grayRound: string;
  tagColor: string;
  loader: string;
  pink: string;
  lightPink: string;
  lightOrange: string;
  lightGreen: string;
  lightYellow: string;
  railFillBackgroundColor: string;
  loaderBackground: string;
  loaderLightHighlight: string;
  iconColor: string;
  line: string;
  darkLine: string;
};

export const appColors: AppColors = {
  loaderBackground: '#E8E8E8',
  loaderLightHighlight: '#F2F8FC',
  white: '#FFFFFF',
  black: '#000000',
  darkText: '#BCBCBC',
  primary: '#fe4c01',
  darkFillBar: '#E65100',            // darker orange
  dotPrimary: '#fe4c01',
  lightYellow: '#FFF7E5',
  pink: '#fe4c01',
  lightPink: '#F2E5FF',
  subPrimary: '#FFF7E5',
  lightGreen: '#ECF4FB',
  primaryFont: '#1F1F1F',
  secondaryFont: '#8F8F8F',
  graybackground: '#F5F5F5',
  border: '#E9E9E9',
  delBackground: '#FFEDED',
  primaryLight: '#fe4c01',
  greenborder: '#FFCC80',
  cardicon: '#E8F4F1',
  price: '#20B149',
  red: '#FF4B4B',
  alertRed: '#F33737',
  subFont: '#171C26',
  modelBg: 'rgba(0, 0, 0, 0.5)',
  railFillBackgroundColor: 'rgba(223, 236, 233, 0.5)',
  bordercolor: '#E9E9E9',
  alertBg: '#F6E4E4',
  alertIconBg: '#F7D5D5',
  alertBorder: '#F8C5C5',
  invoiceBtn: '#E0E0E0',
  darkThemeSub: '#343434',
  categoryTitle: '#e1d6c4ff',
  activeColor: '#3F8FDA',
  completeColor: '#FFB400',
  scheduleColor: '#E65100',
  darkborder: '#474747',
  closeBg: '#CFCDC6',
  darkPurpal: '#E65100',
  lightPurpal: '#F9F3FF',
  lightRed: '#FFEDED',
  primaryBg: '#DFECE9',
  subCategorytag: '#F0EAF6',
  darkBorderBlack: '#797D83',
  bgDark: '#0f172a',
  planNote: '#F5F6F7',
  dropDownColor: '#fafafa',
  planDot: '#FFA726',
  planLine: '#FFCC80',
  round: '#FB8C00',
  grayRound: '#D0D3D8',
  tagColor: '#E8F5F2',
  loader: '#EEEEEE',
  lightOrange: '#FEEBEB',
  iconColor: '#777777',
  line: '#C7CACF',
  darkLine: '#E65100',
};

export const COLORS = {
  ...appColors,
  buttonGradient: ['#FF8200', '#FF5400', '#DE3200'] as [string, string, ...string[]],
  buttonShadow: '#FF5500',
  // Primary & Accents
  primaryDark: '#E65100',
  secondary: '#1F1F1F',           // dark text / primary font
  secondaryLight: '#8F8F8F',      // secondary font gray
  accent: '#fe4c01',              // orange accent
  accentDark: '#FB8C00',          // deep orange accent

  // Status & Warnings
  success: '#20B149',             // green / price
  successDark: '#16A34A',         // darker green
  successLight: '#ECF4FB',        // light green bg
  danger: '#FF4B4B',              // red
  dangerDark: '#F33737',          // alert red
  dangerLight: '#FFEDED',         // light red / delete bg
  warning: '#FFB400',             // warning / complete color
  warningLight: '#FFF7E5',        // light yellow

  // Backgrounds
  lightBg: '#FFFFFF',             // white
  lightCard: '#F5F5F5',           // gray background
  lightBorder: '#E9E9E9',         // border
  darkBg: '#0f172a',
  bgDark: '#0f172a',             // bgDark
  darkCard: '#343434',            // darkThemeSub
  darkBorder: '#474747',          // dark border

  // Text
  textLight: '#1F1F1F',           // primary font
  textLightSecondary: '#8F8F8F',  // secondary font
  textDark: '#BCBCBC',            // dark text
  textDarkSecondary: '#777777',   // icon color

  // Map
  polyline: '#FFA726',            // plan dot orange
  pickupMarker: '#20B149',        // green / price
  dropMarker: '#FF4B4B',          // red
  driverMarker: '#FFA726',
  // orange marker

  // Brand colors
  brandBlue: '#0F2B5C',           // brand blue
  brandBlueLight: '#3F8FDA',      // active color blue
  brandYellow: '#fe4c01',         // primary orange

  // Overlay & Common
  overlay: 'rgba(0, 0, 0, 0.5)',  // model bg
  overlayLight: 'rgba(223, 236, 233, 0.5)', // rail fill
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof COLORS;

export default appColors;
