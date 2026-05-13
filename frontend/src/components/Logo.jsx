/**
 * Logo SertifikasiPro
 * variant="full"  → emblem + teks (untuk navbar, auth page)
 * variant="icon"  → emblem saja (untuk sidebar kecil)
 */
export default function Logo({ variant = 'full', className = '' }) {
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 220 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="110" cy="110" r="100" fill="#F8FAFC" />
        <circle cx="110" cy="110" r="88" fill="#FFFFFF" stroke="#0EA5E9" strokeWidth="4" />
        <circle cx="110" cy="110" r="36" fill="#0EA5E9" opacity="0.08" />
        <rect x="70" y="55" width="80" height="110" rx="10" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
        <path d="M140 55 L150 65 L140 65 Z" fill="#60A5FA" />
        <rect x="78" y="80" width="64" height="6" rx="3" fill="#CBD5E1" />
        <rect x="78" y="95" width="72" height="6" rx="3" fill="#CBD5E1" />
        <rect x="78" y="110" width="58" height="6" rx="3" fill="#CBD5E1" />
        <path d="M85 128 L103 145 L138 100" stroke="#16A34A" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="147" cy="85" r="9" fill="#F59E0B" />
        <path d="M147 79 L149 84 L154 84 L150 87 L152 92 L147 89 L142 92 L144 87 L140 84 L145 84 Z" fill="#FFFFFF" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 420 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Emblem */}
      <circle cx="110" cy="110" r="100" fill="#F8FAFC" />
      <circle cx="110" cy="110" r="88" fill="#FFFFFF" stroke="#0EA5E9" strokeWidth="4" />
      <circle cx="110" cy="110" r="36" fill="#0EA5E9" opacity="0.08" />
      <rect x="70" y="55" width="80" height="110" rx="10" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
      <path d="M140 55 L150 65 L140 65 Z" fill="#60A5FA" />
      <rect x="78" y="80" width="64" height="6" rx="3" fill="#CBD5E1" />
      <rect x="78" y="95" width="72" height="6" rx="3" fill="#CBD5E1" />
      <rect x="78" y="110" width="58" height="6" rx="3" fill="#CBD5E1" />
      <path d="M85 128 L103 145 L138 100" stroke="#16A34A" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="147" cy="85" r="9" fill="#F59E0B" />
      <path d="M147 79 L149 84 L154 84 L150 87 L152 92 L147 89 L142 92 L144 87 L140 84 L145 84 Z" fill="#FFFFFF" />

      {/* Brand Text */}
      <text x="220" y="95" fontFamily="Segoe UI, Arial, sans-serif" fontSize="34" fontWeight="700" fill="#0F172A">
        Sertifikasi
      </text>
      <text x="220" y="130" fontFamily="Segoe UI, Arial, sans-serif" fontSize="34" fontWeight="700" fill="#0EA5E9">
        Pro
      </text>

      {/* Tagline */}
      <text x="220" y="160" fontFamily="Segoe UI, Arial, sans-serif" fontSize="14" fill="#64748B">
        Verifikasi kompetensi, bukti prestasi
      </text>
    </svg>
  )
}
