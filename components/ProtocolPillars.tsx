'use client';

const PILLARS = [
  {
    number: '1',
    title: 'Lower Third & Jawline',
    metric: '120°–130° Gonial Target',
    description:
      'Assesses mandibular angle visibility, chin-to-philtrum balance, and submental tightness with targeted de-bloating and beard-line framing.',
  },
  {
    number: '2',
    title: 'Orbital & Brow Framing',
    metric: 'Canthal & Brow Axis',
    description:
      'Evaluates eye-to-brow spacing, under-eye hollowing, and natural brow thickness so grooming sharpens contrast without over-plucking.',
  },
  {
    number: '3',
    title: 'South Asian Skin & Tone',
    metric: 'Zero-Cast Barrier Care',
    description:
      'Pinpoints hyperpigmentation, uneven T-zone texture, and sun exposure patterns with lightweight niacinamide and invisible SPF routines.',
  },
  {
    number: '4',
    title: 'Hairline & Neck Posture',
    metric: '4-Week Cadence',
    description:
      'Matches taper height and crown volume to your facial thirds while correcting forward-head tilt that softens jawline definition.',
  },
];

export function ProtocolPillars() {
  return (
    <section id="protocol" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="border-t border-[#0a0a0a]/14 pt-12">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.08em] text-[#3f3f3c]">
            METHODOLOGY · FOUR MEASURABLE AXES
          </p>
          <h2 className="mt-2.5 text-[clamp(1.75rem,3.8vw,2.9rem)] font-medium leading-[1.12] tracking-[-0.03em] text-[#0a0a0a]">
            The Protocol Architecture
          </h2>
          <p className="mt-3 text-base leading-relaxed tracking-[-0.01em] text-[#3f3f3c]">
            Every scan scores four structural pillars and outputs concrete daily
            adjustments rather than vague aesthetics advice.
          </p>
        </div>

        {/* Left-aligned numbered 1, 2, 3, 4 timeline connected by a subtle vertical line */}
        <ol id="method" className="mt-10 max-w-2xl">
          {PILLARS.map((pillar, idx) => {
            const isLast = idx === PILLARS.length - 1;
            return (
              <li
                key={pillar.number}
                className={`relative flex gap-3 ${isLast ? 'pb-0' : 'pb-10'}`}
              >
                {/* Connecting subtle vertical line between numbers */}
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[13px] top-8 bottom-0 w-px bg-[#0a0a0a]/16"
                  />
                )}

                {/* Number node */}
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#0a0a0a]/22 bg-[#dadad7] text-xs font-medium tracking-[-0.02em] text-[#0a0a0a] tabular-nums">
                  {pillar.number}
                </div>

                {/* Unboxed explanation aligned left */}
                <div className="pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-xl sm:text-2xl font-medium tracking-[-0.03em] text-[#0a0a0a]">
                      {pillar.title}
                    </h3>
                    <span className="text-xs font-medium tracking-[-0.01em] text-[#585854] tabular-nums">
                      {pillar.metric}
                    </span>
                  </div>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed tracking-[-0.01em] text-[#3f3f3c]">
                    {pillar.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
