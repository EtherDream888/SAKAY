import React from 'react';
import Box from '@mui/material/Box';
import logoTextWhite from '@sakay/shared/src/assets/images/logo-text-white.png';
import logoTextOrange from '@sakay/shared/src/assets/images/logo-text-orange.png';
import logoTextBlack from '@sakay/shared/src/assets/images/logo-text-black.png';

interface LogoProps {
  color?: 'white' | 'orange' | 'black';
  width?: number | string;
}

const Logo: React.FC<LogoProps> = ({ color = 'orange', width }) => {
  let logoSrc = logoTextOrange;
  if (color === 'white') logoSrc = logoTextWhite;
  if (color === 'black') logoSrc = logoTextBlack;

  const finalWidth = width || (color === 'white' ? 220 : 110);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Box
        component="img"
        src={logoSrc}
        alt="SAKAY Logo"
        sx={{
          width: typeof finalWidth === 'number' ? `${finalWidth}px` : finalWidth,
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </Box>
  );
};

export default Logo;
