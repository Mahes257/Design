/**
 * Company brand mark for the Mechanical Design application.
 * A self-contained inline SVG (no external asset) so the sidebar logo is a
 * crisp vector at both the 26px expanded size and the collapsed rail.
 */
export const BRAND_NAME = 'VISHAK TECH';
export const BRAND_SUBLABEL = 'Mechanical Design';
export const APP_USER = {
  name: 'Design Admin',
  role: 'Mechanical Design Lead',
  initials: 'A',
};

export function BrandMark({ className = 'sb-brand-logo' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      role="img"
      aria-label={`${BRAND_NAME} emblem`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#0B4A3D" />
      <path
        d="M16 5.5 25 10.75v10.5L16 26.5 7 21.25v-10.5L16 5.5Z"
        fill="none"
        stroke="#7FD9C4"
        strokeWidth="1.4"
      />
      <circle cx="16" cy="16" r="4.6" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="1.6" fill="#FFFFFF" />
    </svg>
  );
}
