'use client';

import {
  Bot,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  ScanFace,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { useRef } from 'react';

interface FeatureStep {
  step: string;
  tag: string;
  title: string;
  description: string;
  icon: typeof ScanFace;
}

const DARK_TRIAD_STEPS: FeatureStep[] = [
  {
    step: '01',
    tag: 'STEP 01',
    title: 'Provides Insightful Ratings',
    description:
      'Scan your front and 90° side profile to get calibrated PSL ratings, facial thirds balance, canthal tilt, gonial angle, and symmetry ratios built for Indian bone structure.',
    icon: ScanFace,
  },
  {
    step: '02',
    tag: 'STEP 02',
    title: 'Gives Feedback & Suggestions',
    description:
      'Receive honest, feature-by-feature structural feedback highlighting your strongest traits alongside weakest proportions and exact actionable facial improvements.',
    icon: MessageSquareText,
  },
  {
    step: '03',
    tag: 'STEP 03',
    title: 'Helps Track Daily Progress',
    description:
      'Log daily water intake, exercise, calories, and sleep while comparing historical selfie scans on a visual timeline to verify real structural change.',
    icon: CalendarCheck,
  },
  {
    step: '04',
    tag: 'STEP 04',
    title: 'Suggests Skincare, Haircare & Hairstyles',
    description:
      'Get melanin-safe skincare routines, haircare guidance, clean beard framing, and tailored hairstyle recommendations matched to your exact face shape.',
    icon: Sparkles,
  },
  {
    step: '05',
    tag: 'STEP 05',
    title: 'Indian Diet & Facial Exercises',
    description:
      'Follow practical de-bloating nutrition, sodium-potassium hydration targets, neck posture alignment, and lower-third exercises built around your goals.',
    icon: Utensils,
  },
  {
    step: '06',
    tag: 'STEP 06',
    title: '24/7 Dark Triad AI Support',
    description:
      'Ask 6 specialized AI chatbot modes synced directly with your latest scan and daily progress logs anytime for barber scripts and product checks.',
    icon: Bot,
  },
];

export function DesignSocietyShowcase() {
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 276, behavior: 'smooth' });
  };

  return (
    <section
      id="showcase"
      className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="space-y-5">
        {/* Section Heading + Left/Right Carousel Arrows (matching Dashboard Explore Features) */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[clamp(1.65rem,3.6vw,2.55rem)] font-medium leading-[1.15] tracking-[-0.03em] text-[#0a0a0a] text-balance">
            What Does{' '}
            <span className="font-design-society font-medium tracking-normal text-[1.06em]">
              Dark Triad
            </span>{' '}
            do?
          </h2>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              aria-label="Previous steps"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#0a0a0a]/15 bg-white/55 backdrop-blur-sm text-[#0a0a0a] hover:border-[#0a0a0a]/40 hover:bg-white/80 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              aria-label="Next steps"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#0a0a0a]/15 bg-white/55 backdrop-blur-sm text-[#0a0a0a] hover:border-[#0a0a0a]/40 hover:bg-white/80 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Step-by-Step Carousel in White Transparent Boxes (exact Dashboard Explore Features sizing) */}
        <div
          ref={carouselRef}
          className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar"
        >
          {DARK_TRIAD_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.step}
                className="group snap-start shrink-0 w-[240px] sm:w-[260px] rounded-2xl border border-[#0a0a0a]/12 bg-white/50 backdrop-blur-md p-4 text-left transition-all hover:border-[#0a0a0a]/28 hover:bg-white/70 flex flex-col justify-between shadow-[0_8px_24px_-14px_rgba(10,10,10,0.12)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium tracking-[0.1em] text-[#585854]">
                      {item.tag}
                    </span>
                    <Icon className="h-4 w-4 text-[#585854] group-hover:text-[#0a0a0a] transition-colors" />
                  </div>

                  <h3 className="mt-2.5 text-base font-medium text-[#0a0a0a] leading-snug tracking-[-0.02em]">
                    {item.title}
                  </h3>

                  <p className="mt-1.5 text-xs leading-relaxed text-[#3f3f3c]">
                    {item.description}
                  </p>
                </div>

                <span className="mt-4 inline-flex items-center text-[11px] font-medium text-[#585854] tabular-nums">
                  {item.step} · 06
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
