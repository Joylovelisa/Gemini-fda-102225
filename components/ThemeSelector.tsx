import React from 'react';
import { PaletteIcon } from './icons/Icons';

interface Theme {
  id: string;
  name: string;
}

interface ThemeSelectorProps {
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
  themes: Theme[];
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ selectedTheme, onThemeChange, themes }) => {
  return (
    <div className="relative flex items-center group">
      <PaletteIcon className="w-5 h-5 text-white/80" />
      <select
        value={selectedTheme}
        onChange={(e) => onThemeChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent text-white font-semibold text-sm pl-2 pr-6 py-1 focus:outline-none"
        aria-label="Select Theme"
      >
        {themes.map(theme => (
          <option key={theme.id} value={theme.id} className="text-black">
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ThemeSelector;
