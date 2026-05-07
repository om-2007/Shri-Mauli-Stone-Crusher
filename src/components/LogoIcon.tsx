import React from 'react';

interface LogoIconProps {
  className?: string;
  strokeWidth?: number;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ className }) => {
  return (
    <img
      src="/shri-mauli-logo.png"
      alt="Shri Mauli Stone Crusher"
      className={className}
    />
  );
};
