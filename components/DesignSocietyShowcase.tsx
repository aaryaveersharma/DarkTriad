'use client';

import { useState } from 'react';

const PLATES = [
  {
    id: 'profile',
    index: '01',
    kicker: 'STUDY 01 · MANDIBULAR & CHEEKBONE GEOMETRY',
    title: 'The Anatomy of Presence',
    caption:
      'Gonial angle, chin projection, and facial thirds calibrated under hard directional light.',
    src: '/images/editorial_facial_geometry_1795203435134.jpg',
    alt: 'Side-profile architectural portrait highlighting jawline and facial geometry',
    body: 'Most Western rating tools misread South Asian bone structure, brow density, and warm-neutral skin contrast—and almost no real facial rating or PSL tool is free. Nearly every app locks scores, ratios, and improvement plans behind paywalls. Under one website, Dark Triad gives you all of it completely free: live camera PSL & facial harmony ratings, feature-by-feature ratio breakdowns, custom hairstyle & beard framing, melanin-safe skincare & haircare, Indian diet & de-bloating plans, and facial and posture exercises.',
  },
  {
    id: 'tools',
    index: '02',
    kicker: 'STUDY 02 · GROOMING & SKIN CLARITY',
    title: 'Precision Over Noise',
    caption: 'Calipers, grooming geometry, and melanin-safe skincare habits.',
    src: '/images/editorial_grooming_tools_1795203436695.jpg',
    alt: 'Precision stainless calipers, matte comb, and skincare serum on concrete',
    body: 'Real looksmaxxing is measurable: lowering facial bloat through sodium-potassium balance, zero-white-cast broad-spectrum SPF, clean stubble necklines two fingers above the Adam’s apple, and hairstyle volume matched to your forehead height—built into one free daily system.',
  },
  {
    id: 'quarter',
    index: '03',
    kicker: 'STUDY 03 · THREE-QUARTER SYMMETRY',
    title: 'Built for Real Light',
    caption: 'Three-quarter jaw taper, brow ridge framing, and posture alignment.',
    src: '/images/indian_face_male_three_1795203436717.jpg',
    alt: 'Three-quarter portrait of sharp jawline and brow structure',
    body: 'Camera angles expose asymmetry faster than mirrors. Our optical scan isolates neck posture, temple framing, and submental definition so every four-week cycle targets the highest-leverage visual improvements first, with zero subscriptions.',
  },
];

export function DesignSocietyShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePlate = PLATES[activeIndex];

  return (
    <section id="showcase" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      {/* Bold clean editorial thesis statement */}
      <h2 className="max-w-3xl text-balance text-[clamp(1.75rem,3.8vw,2.9rem)] font-medium leading-[1.12] tracking-[-0.03em] text-[#0a0a0a]">
        We run objective facial structure scans calibrated for Indian bone
        density, skin tone, and grooming.
      </h2>

      {/* Main Showcase Plate + staggered horizontal slice strip underneath */}
      <div className="mt-10 space-y-2.5">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[#0a0a0a]/15 bg-[#c9c9c6]">
          <img
            src={activePlate.src}
            alt={activePlate.alt}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center transition-opacity duration-300"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-[#0a0a0a]/80" />
        </div>

        {/* Staggered horizontal slice preview strips */}
        <div className="space-y-2" role="tablist" aria-label="Facial architecture plates">
          {PLATES.map((plate, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={plate.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveIndex(idx)}
                className={`group relative block h-11 sm:h-12 w-full overflow-hidden rounded-xl border text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-[#0a0a0a] ring-1 ring-[#0a0a0a]'
                    : 'border-[#0a0a0a]/15 opacity-75 hover:opacity-100'
                }`}
              >
                <img
                  src={plate.src}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-center"
                />
                <span className="absolute inset-0 bg-[#dadad7]/55 group-hover:bg-[#dadad7]/40 transition-colors" />
                <span className="relative z-10 flex h-full items-center justify-between px-4 text-xs font-medium tracking-[-0.01em] text-[#0a0a0a]">
                  <span>
                    {plate.index} · {plate.title}
                  </span>
                  <span className="hidden sm:inline text-[#0a0a0a]/70">
                    {isSelected ? 'ACTIVE PLATE' : 'VIEW PLATE'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editorial Study Copy in unified DM Sans */}
      <div className="mt-10 max-w-3xl">
        <p className="text-xs font-medium tracking-[0.08em] text-[#3f3f3c]">
          {activePlate.kicker}
        </p>

        <h3 className="mt-3 text-[clamp(2rem,4.5vw,3.35rem)] font-medium leading-[1.08] tracking-[-0.03em] text-[#0a0a0a]">
          {activePlate.title}
        </h3>

        <p className="mt-5 text-base sm:text-lg font-normal leading-relaxed tracking-[-0.01em] text-[#0a0a0a]/85">
          {activePlate.body}
        </p>
      </div>
    </section>
  );
}
