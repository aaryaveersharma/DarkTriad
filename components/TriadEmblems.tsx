'use client';

import { useState } from 'react';

export function TriadPixelMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* Pixelated radial triad emblem inspired by The Design Society */}
      <rect x="11" y="2" width="2" height="2" />
      <rect x="11" y="5" width="2" height="2" />
      <rect x="8" y="7" width="2" height="2" />
      <rect x="14" y="7" width="2" height="2" />
      <rect x="4" y="8" width="2" height="2" />
      <rect x="18" y="8" width="2" height="2" />
      <rect x="11" y="9" width="2" height="2" />
      <rect x="2" y="11" width="2" height="2" />
      <rect x="6" y="11" width="2" height="2" />
      <rect x="10" y="11" width="4" height="2" />
      <rect x="16" y="11" width="2" height="2" />
      <rect x="20" y="11" width="2" height="2" />
      <rect x="11" y="13" width="2" height="2" />
      <rect x="4" y="14" width="2" height="2" />
      <rect x="18" y="14" width="2" height="2" />
      <rect x="8" y="15" width="2" height="2" />
      <rect x="14" y="15" width="2" height="2" />
      <rect x="11" y="17" width="2" height="2" />
      <rect x="11" y="20" width="2" height="2" />
    </svg>
  );
}

export function TriadCrownCrest({ className = 'w-32 h-16' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 32"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* Center spire */}
      <rect x="30" y="2" width="4" height="14" />
      <rect x="26" y="10" width="12" height="6" />
      {/* Left & right geometric pixel rays */}
      <rect x="16" y="8" width="4" height="4" />
      <rect x="44" y="8" width="4" height="4" />
      <rect x="18" y="12" width="6" height="4" />
      <rect x="40" y="12" width="6" height="4" />
      <rect x="8" y="16" width="8" height="4" />
      <rect x="48" y="16" width="8" height="4" />
      <rect x="12" y="20" width="10" height="4" />
      <rect x="42" y="20" width="10" height="4" />
      {/* Inner arch / eye arc */}
      <rect x="22" y="20" width="20" height="4" />
      <rect x="16" y="24" width="10" height="4" />
      <rect x="38" y="24" width="10" height="4" />
      <rect x="28" y="26" width="8" height="4" />
      <rect x="12" y="28" width="6" height="4" />
      <rect x="46" y="28" width="6" height="4" />
    </svg>
  );
}

export const AVATAR_FACES = [
  {
    src: '/images/indian_face_male_one_1795203435045.jpg',
    alt: 'Indian male editorial facial portrait',
    initials: 'AR',
  },
  {
    src: '/images/indian_face_female_two_1795203434734.jpg',
    alt: 'Indian female editorial facial portrait',
    initials: 'KV',
  },
  {
    src: '/images/indian_face_male_three_1795203436717.jpg',
    alt: 'Indian male side-profile facial portrait',
    initials: 'DS',
  },
];

function CircleAvatar({
  src,
  alt,
  initials,
  sizeClass,
  ringClass,
}: {
  src: string;
  alt: string;
  initials: string;
  sizeClass: string;
  ringClass: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`${sizeClass} ${ringClass} inline-flex items-center justify-center rounded-full bg-[#2a2a28] text-[10px] font-medium text-[#e6e6e3]`}
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} ${ringClass} rounded-full object-cover object-top`}
    />
  );
}

export function FaceAvatarsCluster({
  count = 2,
  size = 'md',
  ringColor = 'ring-[#141414]',
}: {
  count?: 2 | 3;
  size?: 'sm' | 'md';
  ringColor?: string;
}) {
  const sizeClass = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9';
  const faces = AVATAR_FACES.slice(0, count);

  return (
    <span className="inline-flex items-center -space-x-2.5 shrink-0">
      {faces.map((face) => (
        <CircleAvatar
          key={face.src}
          src={face.src}
          alt={face.alt}
          initials={face.initials}
          sizeClass={sizeClass}
          ringClass={`ring-2 ${ringColor}`}
        />
      ))}
    </span>
  );
}
