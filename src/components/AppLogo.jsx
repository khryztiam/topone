/**
 * AppLogo — badge de trofeo SVG reutilizable
 * Props:
 *   size      → tamaño del badge en px (default 36)
 *   showText  → mostrar "TopOne" al lado (default false)
 *   textDark  → si el texto es sobre fondo claro (default false = blanco)
 */
export default function AppLogo({ size = 36, showText = false, textDark = false }) {
  const radius = Math.round(size * 0.22);
  const iconSize = Math.round(size * 0.62);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {/* Badge */}
      <div style={{
        width: size,
        height: size,
        background: 'var(--color-primary)',
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {/* Trophy SVG */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cup body */}
          <path d="M7 3h10v7a5 5 0 01-10 0V3z" fill="#f59e0b" />
          {/* Left handle */}
          <path d="M7 6H4a2 2 0 000 4h3" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Right handle */}
          <path d="M17 6h3a2 2 0 010 4h-3" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Stem */}
          <rect x="10.5" y="15" width="3" height="2.5" rx="0.5" fill="#f59e0b" />
          {/* Base */}
          <rect x="8" y="17.5" width="8" height="2" rx="1" fill="#f59e0b" />
          {/* Shine on cup */}
          <path d="M10 5.5c0-.28.22-.5.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5z" fill="rgba(255,255,255,0.35)" />
        </svg>
      </div>

      {/* Optional text */}
      {showText && (
        <span style={{
          fontWeight: 700,
          fontSize: size >= 48 ? '1.4rem' : '1.05rem',
          color: textDark ? 'var(--color-text)' : '#f1f5f9',
          letterSpacing: '-0.3px',
        }}>
          Top<span style={{ color: 'var(--color-gold)' }}>One</span>
        </span>
      )}
    </div>
  );
}
