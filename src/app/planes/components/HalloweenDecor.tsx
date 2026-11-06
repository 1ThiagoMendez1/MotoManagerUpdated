import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { kind: 'pumpkin' | 'web' | 'bat' | 'candy' | 'coffin' | 'skull' };

/** Decorative, code-native accents. The main scene is a separate 3D illustration. */
export function HalloweenDecor({ kind, ...props }: Props) {
  if (kind === 'web') return <svg viewBox="0 0 180 180" fill="none" {...props} aria-hidden="true" focusable="false">
    <g stroke="currentColor" strokeWidth=".8">
      <path d="M0 0H180M0 0V180M0 0L172 49M0 0L145 103M0 0L103 145M0 0L49 172" />
      <path d="M32 0Q29 7 30.5 8.7Q24 9 25.8 18.3Q17 15 18.3 25.8Q8 22 8.7 30.5Q2 28 0 32M65 0Q56 15 62.5 17.8Q47 20 52.4 37.2Q34 31 37.2 52.4Q14 44 17.8 62.5Q3 53 0 65M100 0Q86 24 96.1 27.4Q72 32 80.6 57.2Q52 48 57.2 80.6Q22 68 27.4 96.1Q5 82 0 100M138 0Q117 34 132.6 37.8Q98 45 111.3 78.9Q70 64 78.9 111.3Q31 93 37.8 132.6Q7 111 0 138M180 0Q156 44 172 49Q128 59 145 103Q91 84 103 145Q40 121 49 172Q10 145 0 180" />
    </g>
  </svg>;
  if (kind === 'bat') return <svg viewBox="0 0 100 48" {...props} aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M50 20 43 9l-3 12C25 20 12 9 2 2c0 20 9 35 21 39 3-11 12-12 18-3l9 10 9-10c6-9 15-8 18 3C89 37 98 22 98 2 88 9 75 20 60 21L57 9Z" />
  </svg>;
  if (kind === 'pumpkin') return <svg viewBox="0 0 64 64" fill="none" {...props} aria-hidden="true" focusable="false">
    <path d="M31 18c-2-7 1-11 8-12l1 7c-4 0-5 2-5 6" fill="#8d9e5e" />
    <path d="M32 19C7 6-8 52 19 57c6 3 10 1 13-1 3 2 7 4 13 1C72 52 57 6 32 19Z" fill="#ff831b" />
    <path d="M27 20c-10 8-10 28-5 36M37 20c10 8 10 28 5 36M32 22v33" stroke="#d75c12" strokeWidth="2" />
    <path d="m16 36 9-7 3 10Zm32 0-9-7-3 10ZM19 44l8 2 3-3 4 5 4-4 8-1c-4 11-21 14-27 1Z" fill="#291b22" />
    <path d="m20 35 4-3 1 4Zm24 0-4-3-1 4Z" fill="#ffdc8d" />
  </svg>;
  if (kind === 'candy') return <svg viewBox="0 0 64 40" fill="none" {...props} aria-hidden="true" focusable="false">
    <path d="m17 20-13-9 2 11-2 10 13-8m30-4 13-9-2 11 2 10-13-8" fill="#bca6ed" />
    <rect x="15" y="9" width="34" height="24" rx="11" fill="#ff9d46" />
    <path d="m25 10-6 20m16-20-6 23m15-20-6 20" stroke="#ffe4ba" strokeWidth="5" />
  </svg>;
  if (kind === 'coffin') return <svg viewBox="0 0 48 72" fill="none" {...props} aria-hidden="true" focusable="false">
    <path d="M14 4h20l10 18-9 46H13L4 22Z" fill="#48333b" stroke="#ad805d" strokeWidth="2" />
    <path d="M16 9h16l7 14-8 40H17L9 23Z" stroke="#ad805d" strokeWidth="1.5" />
    <path d="M24 24v22m-8-15h16" stroke="#dbc5a5" strokeWidth="3" strokeLinecap="round" />
  </svg>;
  return <svg viewBox="0 0 64 64" fill="none" {...props} aria-hidden="true" focusable="false">
    <path d="M14 46C-1 25 11 5 32 5s33 20 18 41l-5 3v10H19V49Z" fill="#f6e8d3" />
    <ellipse cx="22" cy="31" rx="8" ry="9" fill="#211828" /><ellipse cx="43" cy="31" rx="8" ry="9" fill="#211828" />
    <path d="m32 39-5 8h10Z" fill="#211828" /><path d="M26 51v8m12-8v8m-6-8v8" stroke="#a69a91" strokeWidth="2" />
  </svg>;
}
