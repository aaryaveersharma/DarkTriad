'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Maximize2 } from 'lucide-react';

interface FeaturePlate {
  id: string;
  index: string;
  name: string;
  label: string;
  sub: string;
  src: string;
  alt: string;
  kicker: string;
  title: string;
  caption: string;
  body: string;
}

const CHICO_PLATE: FeaturePlate = {
  id: 'chico',
  index: '00',
  name: 'CHICO LACHOWSKI',
  label: 'Full Facial Symmetry & Ratios',
  sub: 'Biocular measurement & golden facial proportions',
  src: '/images/chico_geometry.jpg',
  alt: 'Chico Lachowski facial measurement and biocular proportions line',
  kicker: 'MASTER STUDY · CHICO LACHOWSKI · BIOCULAR PROPORTIONS',
  title: 'Symmetry & Proportional Balance',
  caption:
    'Biocular distance, interpupillary ratio, and facial third symmetry calibrated to anatomical ideals.',
  body: 'High-tier facial harmony relies on strict geometric ratios: biocular width aligned to interpupillary span (7520mm / 15645mm biocular ratio), compact midface height, and ideal facial thirds. Dark Triad automatically detects these exact millimeter landmarks from your camera selfies with zero paywalls.',
};

const VASILY_FEATURES: FeaturePlate[] = [
  {
    id: 'eyes',
    index: '01',
    name: 'VASILY STEPANOV',
    label: 'Eyes & Eyebrows',
    sub: 'Orbital vectors, positive canthal tilt & brow density',
    src: '/images/vasily_eyes_eyebrows.jpg',
    alt: "Vasily Stepanov's eyes and eyebrows highlighting positive canthal tilt and orbital ridge",
    kicker: 'FEATURE 01 · VASILY STEPANOV · ORBITAL & BROW GEOMETRY',
    title: 'Positive Canthal Tilt & Deep-Set Orbitals',
    caption:
      'Compact eyelid exposure, supraorbital ridge projection, and low-set masculine brow symmetry.',
    body: 'Vasily Stepanov illustrates model-tier orbital aesthetics: a positive canthal tilt (lateral corner elevated 3–5° above medial corner), compact upper eyelid show, low-set horizontal brow density, and deep-set supraorbital eye sockets that create high contrast under overhead directional lighting.',
  },
  {
    id: 'lips',
    index: '02',
    name: 'VASILY STEPANOV',
    label: 'Lips & Philtrum',
    sub: 'Philtrum-to-chin balance & oral commissures',
    src: '/images/vasily_lips.jpg',
    alt: "Vasily Stepanov's lips and philtrum proportion",
    kicker: 'FEATURE 02 · VASILY STEPANOV · PHILTRUM & LIP HARMONY',
    title: 'Ideal 1:2 Philtrum Ratio & Lip Volume',
    caption:
      'Defined cupid’s bow, balanced lip volume, and sharp labiomental angle.',
    body: 'Sub-nasal harmony requires a compact philtrum length balanced against chin height in an ideal 1:2 ratio. Vasily displays sharp philtral columns, defined cupid’s bow contour, and balanced lower-to-upper lip volume that matches the intercanthal width.',
  },
  {
    id: 'jaw',
    index: '03',
    name: 'VASILY STEPANOV',
    label: 'Mandibular Jaw & Chin',
    sub: '120° gonial angle, ramus height & chin projection',
    src: '/images/vasily_jaw.jpg',
    alt: "Vasily Stepanov's mandibular jawline and chin projection",
    kicker: 'FEATURE 03 · VASILY STEPANOV · MANDIBULAR JAW & CHIN',
    title: 'Chiseled 120° Gonial Angle & Chin Projection',
    caption:
      'Mandibular ramus length, lateral jaw taper, and sharp cervicofacial definition.',
    body: 'A masculine lower third features an angular gonial angle (120–125°), sharp mandibular body definition, forward pogonion chin projection aligned to the lower lip vertical line, and a tight submental neckline free from excess water retention or bloat.',
  },
];

export function DesignSocietyShowcase() {
  const [activeId, setActiveId] = useState<string>('chico');

  const activePlate =
    activeId === 'chico'
      ? CHICO_PLATE
      : VASILY_FEATURES.find((f) => f.id === activeId) ?? CHICO_PLATE;

  return (
    <section id="showcase" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      {/* Bold clean editorial thesis statement */}
      <h2 className="max-w-3xl text-balance text-[clamp(1.75rem,3.8vw,2.9rem)] font-medium leading-[1.12] tracking-[-0.03em] text-[#0a0a0a]">
        We run objective facial structure scans calibrated for Indian bone
        density, skin tone, and grooming.
      </h2>

      {/* Main Showcase Plate + 3 small feature preview strips underneath */}
      <div className="mt-10 space-y-3">
        {/* Big Showcase Box */}
        <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full overflow-hidden rounded-2xl border border-[#0a0a0a]/15 bg-[#101012] shadow-sm">
          {/* Ambient blurred backdrop for aesthetic framing */}
          <img
            src={activePlate.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-25 scale-110 pointer-events-none"
          />

          {/* Foreground high-res image */}
          <img
            src={activePlate.src}
            alt={activePlate.alt}
            referrerPolicy="no-referrer"
            className="relative z-10 h-full w-full object-contain object-center transition-all duration-300"
          />

          {/* Top Badges: Model identifier and reset to Chico button */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-mono tracking-wider text-white border border-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {activePlate.name} · {activePlate.index}
            </span>

            {activeId !== 'chico' && (
              <button
                type="button"
                onClick={() => setActiveId('chico')}
                className="inline-flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-neutral-200 px-3 py-1 text-[11px] font-medium tracking-tight shadow-md transition-colors"
              >
                <span>Chico Proportions</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Bottom subtle bar */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-[#0a0a0a]/80 z-20" />
        </div>

        {/* Three small feature strips below */}
        <div className="space-y-2" role="tablist" aria-label="Facial architecture feature studies">
          {VASILY_FEATURES.map((feature) => {
            const isSelected = activeId === feature.id;
            return (
              <button
                key={feature.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveId(isSelected ? 'chico' : feature.id)}
                className={`group relative flex h-14 sm:h-16 w-full items-center overflow-hidden rounded-xl border text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-md'
                    : 'border-[#0a0a0a]/15 bg-white/80 hover:bg-white text-[#0a0a0a]'
                }`}
              >
                {/* Small preview image */}
                <div className="relative h-full w-24 sm:w-32 shrink-0 overflow-hidden border-r border-[#0a0a0a]/10 bg-[#1a1a1c]">
                  <img
                    src={feature.src}
                    alt={feature.label}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
                  />
                  <div
                    className={`absolute inset-0 transition-colors ${
                      isSelected ? 'bg-transparent' : 'bg-black/10 group-hover:bg-transparent'
                    }`}
                  />
                </div>

                {/* Info Text */}
                <div className="flex flex-1 items-center justify-between px-3.5 sm:px-4">
                  <div className="min-w-0 pr-2">
                    <span
                      className={`text-[10px] sm:text-[11px] font-mono tracking-wider block uppercase ${
                        isSelected ? 'text-white/60' : 'text-[#0a0a0a]/60'
                      }`}
                    >
                      {feature.index} · {feature.name}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold tracking-tight truncate">
                      {feature.label}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-[#0a0a0a]/5 text-[#0a0a0a]/70 group-hover:bg-[#0a0a0a]/10'
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                    <span>{isSelected ? 'ACTIVE' : 'INSPECT'}</span>
                  </span>
                </div>
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
