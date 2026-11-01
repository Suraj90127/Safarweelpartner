import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useColorScheme as useTailwindColorScheme } from 'nativewind';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setIsDark } from '../redux/slices/themeSlice';

interface Props { children: React.ReactNode; }

const ThemeProvider: React.FC<Props> = ({ children }) => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(s => s.theme.mode);
  const systemScheme = useColorScheme();
  const { setColorScheme } = useTailwindColorScheme();

  useEffect(() => {
    const isDarkTheme = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
    dispatch(setIsDark(isDarkTheme));
    setColorScheme(isDarkTheme ? 'dark' : 'light');
  }, [mode, systemScheme, dispatch, setColorScheme]);

  return <>{children}</>;
};

export default ThemeProvider;

