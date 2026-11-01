import { configAddChangeListener, configRead } from './config';
import './beautiful-theme.css';

function updateTheme() {
  document.documentElement.classList.toggle(
    'ytaf-glass',
    configRead('enableModernTheme')
  );
  document.documentElement.classList.toggle(
    'ytaf-glass-blur',
    configRead('enableGlassBlur')
  );
}

updateTheme();
configAddChangeListener('enableModernTheme', updateTheme);
configAddChangeListener('enableGlassBlur', updateTheme);
