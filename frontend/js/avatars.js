/**
 * SkillSwap Platform - High-Fidelity Vector User Logo & Avatar Engine
 * Generates rich, crisp SVG logos for all users and academic personas:
 * - Sri Dhanush (Lead Tutor • Python & AI Master)
 * - Rishitha (UI/UX Design & Figma Specialist)
 * - Bharath (Senior Fullstack & Cloud Architect)
 * - Pujitha (Data Science & Database Specialist)
 * - Taman (Cybersecurity & Ethical Hacking Specialist)
 * - Dr. S. K. Rao (Faculty Administrator & Dept Coordinator)
 * - Dynamic SVG Logo Synthesis for any new registered user
 * - Official Institutional Emblems (Vignan University, NPTEL, Coursera, AWS, Google, Microsoft, HackerRank, CompTIA)
 */

const USER_LOGO_CONFIGS = {
  sri: {
    name: 'Sri Dhanush',
    title: 'Lead Mentor • Python & AI Specialist',
    initials: 'SD',
    bgGradient: ['#312E81', '#4F46E5', '#3B82F6'],
    accentColor: '#60A5FA',
    ringColor: '#F59E0B',
    badgeIcon: '⚡',
    badgeText: 'Elite Master',
    badgeColor: '#F59E0B',
    specialty: 'Python & AI',
    symbolSvg: `
      <!-- Code brackets & Lightning vector -->
      <path d="M 28 42 L 20 50 L 28 58" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 72 42 L 80 50 L 72 58" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="52,24 43,48 51,48 47,76 60,46 51,46" fill="#FBBF24" filter="url(#glow_sri)"/>
    `
  },
  rishitha: {
    name: 'Rishitha',
    title: 'UI/UX Design & Figma Specialist',
    initials: 'RS',
    bgGradient: ['#831843', '#BE185D', '#8B5CF6'],
    accentColor: '#F472B6',
    ringColor: '#EC4899',
    badgeIcon: '🎨',
    badgeText: 'Figma Pro',
    badgeColor: '#EC4899',
    specialty: 'UI/UX & Design',
    symbolSvg: `
      <!-- Design Pen & Palette nodes -->
      <circle cx="28" cy="30" r="4" fill="#F472B6" opacity="0.8"/>
      <circle cx="72" cy="30" r="4" fill="#C084FC" opacity="0.8"/>
      <circle cx="76" cy="65" r="4" fill="#38BDF8" opacity="0.8"/>
      <path d="M 44 26 C 36 34 34 56 46 68 C 50 72 56 74 62 70 C 68 64 68 50 62 42 Z" fill="none" stroke="#FDE047" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="50" cy="46" r="3" fill="#FFFFFF"/>
    `
  },
  bharath: {
    name: 'Bharath',
    title: 'Senior Fullstack & Cloud Developer',
    initials: 'BH',
    bgGradient: ['#064E3B', '#047857', '#0D9488'],
    accentColor: '#34D399',
    ringColor: '#10B981',
    badgeIcon: '💻',
    badgeText: 'Fullstack Dev',
    badgeColor: '#10B981',
    specialty: 'React & Node',
    symbolSvg: `
      <!-- Cloud Server & Terminal nodes -->
      <rect x="26" y="32" width="48" height="36" rx="6" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <path d="M 34 44 L 40 50 L 34 56" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="44" y1="56" x2="52" y2="56" stroke="#34D399" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="64" cy="42" r="2.5" fill="#34D399"/>
      <circle cx="64" cy="50" r="2.5" fill="#6EE7B7"/>
      <circle cx="64" cy="58" r="2.5" fill="#A7F3D0"/>
    `
  },
  pujitha: {
    name: 'Pujitha',
    title: 'Data Science & SQL Specialist',
    initials: 'PJ',
    bgGradient: ['#78350F', '#B45309', '#F59E0B'],
    accentColor: '#FBBF24',
    ringColor: '#F59E0B',
    badgeIcon: '📊',
    badgeText: 'Data Wizard',
    badgeColor: '#F59E0B',
    specialty: 'AI & Data Science',
    symbolSvg: `
      <!-- Neural Graph & Database cylinder -->
      <ellipse cx="50" cy="30" rx="18" ry="6" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
      <path d="M 32 30 V 42 C 32 46 68 46 68 42 V 30" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
      <path d="M 32 42 V 54 C 32 58 68 58 68 54 V 42" fill="none" stroke="#FDE047" stroke-width="2"/>
      <line x1="28" y1="68" x2="72" y2="68" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
      <line x1="36" y1="68" x2="36" y2="58" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
      <line x1="46" y1="68" x2="46" y2="50" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
      <line x1="56" y1="68" x2="56" y2="62" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
      <line x1="64" y1="68" x2="64" y2="44" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
    `
  },
  taman: {
    name: 'Taman',
    title: 'Cybersecurity & Ethical Hacking',
    initials: 'TM',
    bgGradient: ['#3B0764', '#581C87', '#4F46E5'],
    accentColor: '#A78BFA',
    ringColor: '#8B5CF6',
    badgeIcon: '🛡️',
    badgeText: 'Security Pro',
    badgeColor: '#8B5CF6',
    specialty: 'Cyber & Linux',
    symbolSvg: `
      <!-- Security Shield & Lock emblem -->
      <path d="M 50 24 L 68 32 C 68 54 50 68 50 74 C 50 68 32 54 32 32 Z" fill="none" stroke="#C084FC" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="50" cy="44" r="5" fill="none" stroke="#F3E8FF" stroke-width="2"/>
      <rect x="44" y="47" width="12" height="10" rx="2" fill="#A855F7"/>
      <circle cx="50" cy="51" r="1.5" fill="#FFFFFF"/>
    `
  },
  admin: {
    name: 'Dr. S. K. Rao',
    title: 'Faculty Administrator & Department Coordinator',
    initials: 'SK',
    bgGradient: ['#7F1D1D', '#991B1B', '#EA580C'],
    accentColor: '#F87171',
    ringColor: '#DC2626',
    badgeIcon: '🏛️',
    badgeText: 'Faculty Admin',
    badgeColor: '#EF4444',
    specialty: 'Academic Coordinator',
    symbolSvg: `
      <!-- University Pillar & Laurel Wreath -->
      <path d="M 30 70 L 70 70 M 34 66 L 66 66 M 34 38 L 66 38 M 30 34 L 70 34 M 50 22 L 28 34 M 50 22 L 72 34" fill="none" stroke="#FDE047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="40" y1="38" x2="40" y2="66" stroke="#FFFFFF" stroke-width="2.5"/>
      <line x1="50" y1="38" x2="50" y2="66" stroke="#FFFFFF" stroke-width="2.5"/>
      <line x1="60" y1="38" x2="60" y2="66" stroke="#FFFFFF" stroke-width="2.5"/>
      <circle cx="50" cy="27" r="2" fill="#FDE047"/>
    `
  }
};

/**
 * Deterministic color palette generator for new/custom users
 */
function getCustomUserPalette(str = 'user') {
  const palettes = [
    { bg: ['#1E1B4B', '#4338CA', '#6366F1'], accent: '#818CF8', ring: '#6366F1' },
    { bg: ['#064E3B', '#059669', '#10B981'], accent: '#34D399', ring: '#10B981' },
    { bg: ['#701A75', '#A21CAF', '#C026D3'], accent: '#E879F9', ring: '#C026D3' },
    { bg: ['#78350F', '#D97706', '#F59E0B'], accent: '#FBBF24', ring: '#F59E0B' },
    { bg: ['#0C4A6E', '#0284C7', '#0EA5E9'], accent: '#38BDF8', ring: '#0EA5E9' },
    { bg: ['#881337', '#BE123C', '#E11D48'], accent: '#FB7185', ring: '#E11D48' }
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % palettes.length;
  return palettes[idx];
}

/**
 * High-Resolution SVG Logo Generator for Users
 * @param {string} personaId - User ID or preset name
 * @param {Object} options - Optional customization flags
 * @returns {string} Base64/UTF-8 data URI of crisp SVG logo
 */
function generateUserLogoSvg(personaId = 'sri', options = {}) {
  const cleanId = String(personaId || 'sri').toLowerCase();
  const cfg = USER_LOGO_CONFIGS[cleanId];

  let bg1, bg2, bg3, accentColor, ringColor, initials, symbolSvg;

  if (cfg) {
    [bg1, bg2, bg3] = cfg.bgGradient;
    accentColor = cfg.accentColor;
    ringColor = cfg.ringColor;
    initials = cfg.initials;
    symbolSvg = cfg.symbolSvg;
  } else {
    const pal = getCustomUserPalette(cleanId);
    [bg1, bg2, bg3] = pal.bg;
    accentColor = pal.accent;
    ringColor = pal.ring;
    initials = cleanId.slice(0, 2).toUpperCase();
    symbolSvg = `
      <circle cx="50" cy="40" r="14" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2.5"/>
      <path d="M 28 72 C 28 58 40 54 50 54 C 60 54 72 58 72 72" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2.5" stroke-linecap="round"/>
    `;
  }

  const gradId = `ugrad_${cleanId}_${Math.abs(cleanId.split('').reduce((a,c)=>a+c.charCodeAt(0),0))}`;
  const glowId = `glow_${cleanId}`;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="50%" stop-color="${bg2}"/>
      <stop offset="100%" stop-color="${bg3}"/>
    </linearGradient>

    <!-- Ring Gradient -->
    <linearGradient id="ring_${gradId}" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${ringColor}"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.8"/>
    </linearGradient>

    <!-- Drop Shadow Filter -->
    <filter id="${glowId}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.35"/>
    </filter>

    <!-- Radial Glow Center -->
    <radialGradient id="centerGlow_${gradId}" cx="50%" cy="35%" r="45%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Base Circle with Gradient -->
  <circle cx="50" cy="50" r="47" fill="url(#${gradId})" filter="url(#${glowId})"/>

  <!-- Inner Soft Radial Glow -->
  <circle cx="50" cy="50" r="47" fill="url(#centerGlow_${gradId})"/>

  <!-- Outer Stylized Circuit / Precision Ring -->
  <circle cx="50" cy="50" r="45" fill="none" stroke="url(#ring_${gradId})" stroke-width="1.8" stroke-dasharray="80 8 4 8 2 8" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>

  <!-- Specialty Symbol Art -->
  <g opacity="0.85">
    ${symbolSvg}
  </g>

  <!-- High-Contrast Monogram Initials Badge -->
  <rect x="22" y="30" width="56" height="40" rx="10" fill="rgba(15, 23, 42, 0.65)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2" backdrop-filter="blur(4px)"/>
  <text x="50" y="56" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1.5" filter="url(#${glowId})">${initials}</text>

  <!-- Corner Verification Beacon -->
  <circle cx="80" cy="22" r="7" fill="#10B981" stroke="#0F172A" stroke-width="2"/>
  <path d="M 77 22 L 79 24 L 83 20" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Pre-cached vector user logos for immediate zero-latency rendering
 */
const USER_LOGOS = {
  sri: generateUserLogoSvg('sri'),
  rishitha: generateUserLogoSvg('rishitha'),
  bharath: generateUserLogoSvg('bharath'),
  pujitha: generateUserLogoSvg('pujitha'),
  taman: generateUserLogoSvg('taman'),
  admin: generateUserLogoSvg('admin')
};

/**
 * Universal Avatar / User Logo Getter
 * Returns official vector logo URL for any user ID
 */
function getStudentAvatar(id = 'sri') {
  const clean = String(id || 'sri').toLowerCase();
  return USER_LOGOS[clean] || generateUserLogoSvg(clean);
}

/**
 * Universal Global Image Error Fallback Handler
 */
window.handleAvatarError = function(img, personaId) {
  if (img && !img.dataset.fallbackApplied) {
    img.dataset.fallbackApplied = 'true';
    img.src = getStudentAvatar(personaId || 'sri');
  }
};

/**
 * Institutional & Accredited Authority Logos (SVGs)
 */
const ISSUER_LOGOS = {
  vignan: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  nptel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="10" fill="#1E3A8A"/><path d="M7 16V8l5 8V8M14 8h3a2 2 0 0 1 0 4h-3M17 12l2 4" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  coursera: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" rx="5" fill="#0056D2"/><path d="M15 8.5C13.8 7.5 10.5 7.5 9 9.5C7.5 11.5 7.5 14 9 16C10.5 18 13.8 18 15 17" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  aws: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" rx="5" fill="#232F3E"/><path d="M6 15c4 3 8 3 12 0" fill="none" stroke="#FF9900" stroke-width="2" stroke-linecap="round"/><path d="M17 14l1.5 1.5L16 17" fill="none" stroke="#FF9900" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  google: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="11" fill="#FFFFFF" stroke="#E2E8F0"/><path d="M18.5 12.2c0-.5 0-1-.1-1.5H12v3h3.7c-.2 1-.8 1.9-1.6 2.5v2h2.6c1.5-1.4 2.4-3.5 2.4-6z" fill="#4285F4"/><path d="M12 19c1.9 0 3.5-.6 4.7-1.7l-2.6-2c-.6.4-1.4.7-2.1.7-1.6 0-3-1.1-3.5-2.6H5.8v2.1C7 17.8 9.3 19 12 19z" fill="#34A853"/><path d="M8.5 13.4c-.1-.4-.2-.8-.2-1.4s.1-1 .2-1.4V8.5H5.8C5.3 9.6 5 10.8 5 12s.3 2.4.8 3.5l2.7-2.1z" fill="#FBBC05"/><path d="M12 7.7c1 0 2 .4 2.7 1.1l2-2C15.4 5.7 13.8 5 12 5 9.3 5 7 6.2 5.8 8.5l2.7 2.1c.5-1.5 1.9-2.9 3.5-2.9z" fill="#EA4335"/></svg>`,
  microsoft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><rect x="3" y="3" width="8" height="8" fill="#F25022"/><rect x="13" y="3" width="8" height="8" fill="#7FBA00"/><rect x="3" y="13" width="8" height="8" fill="#00A4EF"/><rect x="13" y="13" width="8" height="8" fill="#FFB900"/></svg>`
};

/**
 * Renders user logo container with role insignia & university crest
 */
function getUserLogoCardHtml(userOrId, size = 44) {
  const userId = typeof userOrId === 'string' ? userOrId : (userOrId?.id || 'sri');
  const user = (typeof userOrId === 'object' && userOrId !== null) ? userOrId : (window.store?.personas?.[userId] || { name: userId, id: userId });
  const userName = user?.name || userId || 'Student';
  const userMajor = user?.major || 'Vignan University';
  const logoUrl = getStudentAvatar(userId);
  const cfg = USER_LOGO_CONFIGS[String(userId || 'sri').toLowerCase()] || {};
  const badgeText = cfg.badgeText || (user?.isAdmin || user?.role === 'FACULTY_ADMIN' ? 'FACULTY ADMIN' : 'STUDENT');
  const badgeIcon = cfg.badgeIcon || '🎓';

  return `
    <div class="user-logo-wrapper" style="position: relative; width: ${size}px; height: ${size}px; flex-shrink: 0;" title="${userName} • ${userMajor}">
      <img src="${logoUrl}" alt="${userName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; box-shadow: 0 3px 10px rgba(0,0,0,0.15);" onerror="window.handleAvatarError(this, '${userId}')">
      <div style="position: absolute; bottom: -2px; right: -2px; width: ${Math.round(size * 0.38)}px; height: ${Math.round(size * 0.38)}px; background: #0F172A; border: 1.5px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: ${Math.round(size * 0.22)}px;" title="${badgeText}">
        ${badgeIcon}
      </div>
    </div>
  `;
}

// Global exports
window.getStudentAvatar = getStudentAvatar;
window.generateUserLogoSvg = generateUserLogoSvg;
window.getUserLogoCardHtml = getUserLogoCardHtml;
window.USER_LOGO_CONFIGS = USER_LOGO_CONFIGS;
window.ISSUER_LOGOS = ISSUER_LOGOS;
window.AVATAR_URLS = USER_LOGOS;
