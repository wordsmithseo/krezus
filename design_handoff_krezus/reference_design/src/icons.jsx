// Lucide-style inline SVG icons. Stroke-based, 16px default.
const Ic = ({ d, size = 16, fill = "none", stroke = "currentColor", w = 1.5, ...p }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={fill}
    stroke={stroke}
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="icon"
    {...p}
  >
    {d}
  </svg>
);

const Icons = {
  Dashboard: (p) => <Ic d={<><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>} {...p}/>,
  Envelope: (p) => <Ic d={<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></>} {...p}/>,
  ArrowDown: (p) => <Ic d={<><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></>} {...p}/>,
  ArrowUp: (p) => <Ic d={<><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></>} {...p}/>,
  Tag: (p) => <Ic d={<><path d="M20 12l-8.5 8.5a2 2 0 01-2.83 0L3 14.83V5a2 2 0 012-2h9.83L20 8.17V12z"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/></>} {...p}/>,
  Crystal: (p) => <Ic d={<><path d="M12 3l9 7-9 11-9-11 9-7z"/><path d="M3 10h18"/><path d="M12 3v18"/></>} {...p}/>,
  Chart: (p) => <Ic d={<><path d="M3 21V3"/><path d="M21 21H3"/><path d="M7 16l4-5 3 3 5-7"/></>} {...p}/>,
  Target: (p) => <Ic d={<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></>} {...p}/>,
  Settings: (p) => <Ic d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.86l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.86-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.08a1.7 1.7 0 00-1.11-1.55 1.7 1.7 0 00-1.86.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.86 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.08a1.7 1.7 0 001.55-1.11 1.7 1.7 0 00-.34-1.86l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.86.34h.05a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.08a1.7 1.7 0 001 1.55h.06a1.7 1.7 0 001.86-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.86V9a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.08a1.7 1.7 0 00-1.55 1z"/></>} {...p}/>,
  Plus: (p) => <Ic d={<><path d="M12 5v14"/><path d="M5 12h14"/></>} {...p}/>,
  Search: (p) => <Ic d={<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>} {...p}/>,
  Filter: (p) => <Ic d={<path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/>} {...p}/>,
  Edit: (p) => <Ic d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>} {...p}/>,
  Trash: (p) => <Ic d={<><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>} {...p}/>,
  More: (p) => <Ic d={<><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/></>} {...p}/>,
  Check: (p) => <Ic d={<path d="M20 6L9 17l-5-5"/>} {...p}/>,
  X: (p) => <Ic d={<><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>} {...p}/>,
  Calendar: (p) => <Ic d={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></>} {...p}/>,
  Clock: (p) => <Ic d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} {...p}/>,
  TrendUp: (p) => <Ic d={<><path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></>} {...p}/>,
  TrendDown: (p) => <Ic d={<><path d="M22 17l-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/></>} {...p}/>,
  Wallet: (p) => <Ic d={<><path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-1"/><path d="M16 12h5v4h-5a2 2 0 010-4z"/></>} {...p}/>,
  Sparkles: (p) => <Ic d={<><path d="M12 3l1.8 4.7L18 9l-4.2 1.3L12 15l-1.8-4.7L6 9l4.2-1.3L12 3z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"/></>} {...p}/>,
  Users: (p) => <Ic d={<><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>} {...p}/>,
  Bell: (p) => <Ic d={<><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 003.4 0"/></>} {...p}/>,
  Logo: ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="currentColor"/>
      <text x="16" y="22" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="22" fill="var(--bg)">K</text>
    </svg>
  ),
  Download: (p) => <Ic d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></>} {...p}/>,
  Lock: (p) => <Ic d={<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>} {...p}/>,
  Logout: (p) => <Ic d={<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>} {...p}/>,
  Eye: (p) => <Ic d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} {...p}/>,
  Info: (p) => <Ic d={<><circle cx="12" cy="12" r="9"/><path d="M12 8v.01"/><path d="M11 12h1v4h1"/></>} {...p}/>,
  Shield: (p) => <Ic d={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>} {...p}/>,
  Banknote: (p) => <Ic d={<><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01"/><path d="M18 12h.01"/></>} {...p}/>,
  Menu: (p) => <Ic d={<><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></>} {...p}/>,
};

window.Icons = Icons;
