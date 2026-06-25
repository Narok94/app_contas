import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export const useTheme = (username?: string) => {
    // Utility to get default theme for a user
    const getInitialTheme = useCallback((): Theme => {
        if (username) {
            const userStored = localStorage.getItem(`theme_user_${username}`) as Theme | null;
            if (userStored) return userStored;
            if (username.toLowerCase() === 'jessica') {
                return 'light';
            }
        }
        const stored = localStorage.getItem('theme') as Theme | null;
        if (stored) return stored;
        return 'dark'; // Keep default dark for others or global if not configured
    }, [username]);

    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    // Sync theme when username changes
    useEffect(() => {
        setTheme(getInitialTheme());
    }, [username, getInitialTheme]);

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        
        if (username) {
            localStorage.setItem(`theme_user_${username}`, theme);
        } else {
            localStorage.setItem('theme', theme);
        }
    }, [theme, username]);

    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    }, []);

    return { theme, toggleTheme, setTheme };
};