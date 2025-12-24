import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SvgIcon from '@mui/material/SvgIcon';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageIcon = () => (
  <SvgIcon>
    <path
      fill="currentColor"
      d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z"
    />
  </SvgIcon>
);

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
    handleClose();
  };

  return (
    <>
      <IconButton
        color="inherit"
        aria-label={t('common.language')}
        aria-controls={open ? 'language-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
      >
        <LanguageIcon />
      </IconButton>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-button',
        }}
      >
        <MenuItem
          onClick={() => handleLanguageChange('zh-CN')}
          selected={i18n.language === 'zh-CN'}
        >
          {t('common.chinese')}
        </MenuItem>
        <MenuItem
          onClick={() => handleLanguageChange('en-US')}
          selected={i18n.language === 'en-US'}
        >
          {t('common.english')}
        </MenuItem>
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
