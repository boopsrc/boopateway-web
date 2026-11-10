import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
const base = ({ size = 24, ...p }: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
})

export const PosIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
    <rect x="8" y="5.5" width="8" height="4" rx="1" />
    <path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01" strokeWidth="2.6" />
  </svg>
)
export const PersonAddIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="10" cy="8" r="4" />
    <path d="M2.5 20.5c.8-3.8 3.8-6 7.5-6 1.6 0 3 .4 4.2 1.1M18 14v6M15 17h6" />
  </svg>
)
export const CameraIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7.5h3l1.8-2.5h6.4L17 7.5h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z" />
    <circle cx="12" cy="13" r="3.6" />
  </svg>
)
export const ChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
)
export const BackspaceIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8.5 5H20a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H8.5L2.5 12Z" />
    <path d="m11.5 9.5 5 5M16.5 9.5l-5 5" />
  </svg>
)
export const AlertIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7.5v5.5M12 16.5h.01" strokeWidth="2.4" />
  </svg>
)
export const ArrowLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
)
export const FaceScanIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
    <path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9 16c1.8 1.4 4.2 1.4 6 0" />
  </svg>
)
export const SparkIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)
export const HandIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 11V5a1.5 1.5 0 0 1 3 0v5M12 10V4a1.5 1.5 0 0 1 3 0v6M15 10V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 8-7 8-2.5 0-4-1.2-5.3-3L3.4 14.3a1.6 1.6 0 0 1 2.5-2L8 14.5V8a1.5 1.5 0 0 1 3 0" />
  </svg>
)
