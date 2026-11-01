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
  document.documentElement.classList.toggle(
    'ytaf-glass-clear',
    configRead('panelTransparency') === 'clear'
  );
  document.documentElement.classList.toggle(
    'ytaf-glass-solid',
    configRead('panelTransparency') === 'solid'
  );
}

updateTheme();
configAddChangeListener('enableModernTheme', updateTheme);
configAddChangeListener('enableGlassBlur', updateTheme);
configAddChangeListener('panelTransparency', updateTheme);
