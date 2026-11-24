import React from 'react';

interface AppMonochromeIconProps {
  size?: number;
  variant?: 'dark' | 'light' | 'monet';
  mask?: 'squircle' | 'circle' | 'rounded';
  className?: string;
}

/**
 * Pure monochrome geometric viewfinder + mountain-and-sun silhouette
 * matching app/src/main/res/drawable/ic_launcher_foreground.xml (108dp safe-zone grid).
 */
export const AppMonochromeIcon: React.FC<AppMonochromeIconProps> = ({
  size = 32,
  variant = 'dark',
  mask = 'squircle',
  className = '',
}) => {
  const bgColor =
    variant === 'light'
      ? '#FFFFFF'
      : variant === 'monet'
        ? '#1F242D'
        : '#000000';
  const fgColor =
    variant === 'light'
      ? '#000000'
      : variant === 'monet'
        ? '#DCE6F7'
        : '#FFFFFF';

  const radiusClass =
    mask === 'circle'
      ? 'rounded-full'
      : mask === 'rounded'
        ? 'rounded-xl'
        : 'rounded-[24%]';

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden select-none ${radiusClass} ${
        variant === 'light' ? 'ring-1 ring-black/15' : 'ring-1 ring-white/15'
      } ${className}`}
      style={{ width: size, height: size, backgroundColor: bgColor }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 108 108"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="26"
          y="26"
          width="56"
          height="56"
          rx="10"
          stroke={fgColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="43.5" cy="44" r="5" fill={fgColor} />
        <path
          d="M28 70.5L47.5 51.5L58.5 62.5L67 54L80 68"
          stroke={fgColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
};
