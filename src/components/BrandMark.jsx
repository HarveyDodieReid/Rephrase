import logoPng from '../assets/Logo.png'

export default function BrandMark({
  size = 18,
  className = '',
  alt = 'logo',
  theme, // 'light' | 'dark' — black in light mode, white in dark mode
}) {
  return (
    <img
      src={logoPng}
      alt={alt}
      className={className}
      style={{
        width: size,
        height: size,
        display: 'block',
        filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)',
      }}
      draggable={false}
    />
  )
}
