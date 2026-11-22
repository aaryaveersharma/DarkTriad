'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import {
  FrontLandmarks,
  Point2D,
  SideLandmarks,
  StoredPhoto,
} from '@/lib/types';

function toPx(pt: Point2D | undefined, w: number, h: number): { x: number; y: number } | null {
  if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return null;
  if (pt.x < 10 || pt.x > 990 || pt.y < 10 || pt.y > 990) return null;
  return { x: (pt.x / 1000) * w, y: (pt.y / 1000) * h };
}

function EndpointLine({
  a,
  b,
  unit,
  stroke = 'rgba(255,255,255,0.9)',
  dashed = false,
  visible = true,
  animate = false,
  delay = 0,
  showDots = true,
}: {
  a: { x: number; y: number } | null;
  b: { x: number; y: number } | null;
  unit: number;
  stroke?: string;
  dashed?: boolean;
  visible?: boolean;
  animate?: boolean;
  delay?: number;
  showDots?: boolean;
}) {
  if (!a || !b || !visible) return null;
  const strokeW = 1.2 * unit;
  const dotR = 2.3 * unit;
  const haloR = 4.5 * unit;

  return (
    <g>
      {animate ? (
        <motion.line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeDasharray={dashed ? `${4 * unit} ${3 * unit}` : undefined}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        />
      ) : (
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeDasharray={dashed ? `${4 * unit} ${3 * unit}` : undefined}
        />
      )}
      {showDots &&
        [a, b].map((pt, idx) => (
          <g key={idx}>
            <circle cx={pt.x} cy={pt.y} r={haloR} fill="rgba(255,255,255,0.16)" />
            <circle
              cx={pt.x}
              cy={pt.y}
              r={dotR}
              fill="#ffffff"
              stroke="#0a0a0a"
              strokeWidth={0.8 * unit}
            />
          </g>
        ))}
    </g>
  );
}

function PolyContour({
  pts,
  unit,
  stroke = 'rgba(255,255,255,0.65)',
  dashed = false,
  closed = false,
}: {
  pts: Array<{ x: number; y: number } | null>;
  unit: number;
  stroke?: string;
  dashed?: boolean;
  closed?: boolean;
}) {
  const valid = pts.filter((p): p is { x: number; y: number } => Boolean(p));
  if (valid.length < 2) return null;
  const d = `${valid
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')}${closed ? ' Z' : ''}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={1.15 * unit}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? `${4 * unit} ${3 * unit}` : undefined}
    />
  );
}

export function FrontMeasurementOverlay({
  photo,
  landmarks,
  showLines = true,
  revealStage = 99,
  animateLines = false,
  darkTheme = true,
}: {
  photo: StoredPhoto;
  landmarks?: FrontLandmarks | null;
  showLines?: boolean;
  revealStage?: number;
  animateLines?: boolean;
  darkTheme?: boolean;
}) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const w = naturalSize?.w || photo.width || 720;
  const h = naturalSize?.h || photo.height || 960;
  const unit = Math.max(w, h) / 480;

  // Facial height & thirds (Hairline -> Brow -> NoseBase -> ChinBottom, strictly ending at chinBottom)
  const hairline = toPx(landmarks?.hairlineTop, w, h);
  const foreheadL = toPx(landmarks?.foreheadLeft, w, h);
  const foreheadR = toPx(landmarks?.foreheadRight, w, h);
  const brow = toPx(landmarks?.browMid, w, h);
  const nose = toPx(landmarks?.noseBase, w, h);
  const chin = toPx(landmarks?.chinBottom, w, h);

  // Brows
  const lBrowIn = toPx(landmarks?.leftBrowInner, w, h);
  const lBrowPk = toPx(landmarks?.leftBrowPeak, w, h);
  const lBrowOut = toPx(landmarks?.leftBrowOuter, w, h);
  const rBrowIn = toPx(landmarks?.rightBrowInner, w, h);
  const rBrowPk = toPx(landmarks?.rightBrowPeak, w, h);
  const rBrowOut = toPx(landmarks?.rightBrowOuter, w, h);

  // Eyes (outer & inner corners + top/bottom)
  const lOuter = toPx(landmarks?.leftEyeOuter, w, h);
  const lInner = toPx(landmarks?.leftEyeInner, w, h);
  const lTop = toPx(landmarks?.leftEyeTop, w, h);
  const lBot = toPx(landmarks?.leftEyeBottom, w, h);
  const rInner = toPx(landmarks?.rightEyeInner, w, h);
  const rOuter = toPx(landmarks?.rightEyeOuter, w, h);
  const rTop = toPx(landmarks?.rightEyeTop, w, h);
  const rBot = toPx(landmarks?.rightEyeBottom, w, h);

  // Nose bridge, tip, nostrils
  const noseBridgeTop = toPx(landmarks?.noseBridgeTop, w, h);
  const noseTip = toPx(landmarks?.noseTip, w, h);
  const nostrilL = toPx(landmarks?.nostrilLeft, w, h);
  const nostrilR = toPx(landmarks?.nostrilRight, w, h);

  // Cheekbones (high malar prominence)
  const cheekL = toPx(landmarks?.cheekLeft, w, h);
  const cheekR = toPx(landmarks?.cheekRight, w, h);

  // Lips
  const mouthL = toPx(landmarks?.mouthLeft, w, h);
  const mouthR = toPx(landmarks?.mouthRight, w, h);
  const upperLipTop = toPx(landmarks?.upperLipTop, w, h);
  const lowerLipBottom = toPx(landmarks?.lowerLipBottom, w, h);

  // Jaw & chin contour
  const jawL = toPx(landmarks?.jawLeft, w, h);
  const jawR = toPx(landmarks?.jawRight, w, h);
  const chinL = toPx(landmarks?.chinLeft, w, h);
  const chinR = toPx(landmarks?.chinRight, w, h);

  const outlinePts = (landmarks?.faceOutline ?? []).map((p) => toPx(p, w, h));
  const canRenderLandmarks = Boolean(landmarks) && showLines;

  // Validate facial thirds strictly stop at chin and do not extend downward
  const thirdsValid = Boolean(
    hairline &&
      brow &&
      nose &&
      chin &&
      hairline.y < brow.y &&
      brow.y < nose.y &&
      nose.y < chin.y,
  );

  // Cheekbones sanity guard: strictly below eye outer Y and above mouth Y
  const cheeksValid = Boolean(
    cheekL &&
      cheekR &&
      cheekL.x < cheekR.x &&
      (!lOuter || cheekL.y > lOuter.y) &&
      (!mouthL || cheekL.y < mouthL.y),
  );

  // Lips sanity guard: strictly below noseBase and above chinBottom
  const lipsValid = Boolean(
    mouthL &&
      mouthR &&
      mouthL.x < mouthR.x &&
      (!nose || mouthL.y > nose.y) &&
      (!chin || mouthL.y < chin.y),
  );

  return (
    <div
      style={{ aspectRatio: `${w} / ${h}` }}
      className={`relative w-full overflow-hidden rounded-2xl border ${
        darkTheme ? 'border-white/12 bg-[#0b0b0c]' : 'border-[#0a0a0a]/20 bg-[#141414]'
      }`}
    >
      <img
        src={photo.dataUrl}
        alt="Front profile facial landmarks"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setNaturalSize((prev) =>
              prev && prev.w === img.naturalWidth && prev.h === img.naturalHeight
                ? prev
                : { w: img.naturalWidth, h: img.naturalHeight },
            );
          }
        }}
        className="block h-full w-full object-fill"
      />

      {canRenderLandmarks && (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Face perimeter */}
          {revealStage >= 1 && (
            <PolyContour
              pts={outlinePts}
              unit={unit}
              stroke="rgba(255,255,255,0.42)"
              dashed
              closed
            />
          )}

          {/* Forehead boundary */}
          {revealStage >= 2 && (
            <EndpointLine
              a={foreheadL}
              b={foreheadR}
              unit={unit}
              stroke="rgba(255,255,255,0.52)"
              dashed
              showDots={false}
            />
          )}

          {/* Eyebrow contours */}
          {revealStage >= 2 && (
            <>
              <PolyContour
                pts={[lBrowOut, lBrowPk, lBrowIn]}
                unit={unit}
                stroke="rgba(255,255,255,0.75)"
              />
              <PolyContour
                pts={[rBrowIn, rBrowPk, rBrowOut]}
                unit={unit}
                stroke="rgba(255,255,255,0.75)"
              />
            </>
          )}

          {/* Eye boundaries & outer-to-outer / inner-to-inner alignment */}
          {revealStage >= 2 && (
            <>
              <EndpointLine
                a={lOuter}
                b={rOuter}
                unit={unit}
                stroke="rgba(255,255,255,0.92)"
                animate={animateLines}
              />
              <EndpointLine
                a={lOuter}
                b={lInner}
                unit={unit}
                stroke="rgba(255,255,255,0.85)"
                showDots={false}
              />
              <EndpointLine
                a={rInner}
                b={rOuter}
                unit={unit}
                stroke="rgba(255,255,255,0.85)"
                showDots={false}
              />
              <PolyContour
                pts={[lOuter, lTop, lInner, lBot]}
                unit={unit}
                stroke="rgba(255,255,255,0.68)"
                closed
              />
              <PolyContour
                pts={[rInner, rTop, rOuter, rBot]}
                unit={unit}
                stroke="rgba(255,255,255,0.68)"
                closed
              />
            </>
          )}

          {/* Nose bridge & nostril width */}
          {revealStage >= 3 && (
            <>
              <PolyContour
                pts={[noseBridgeTop ?? brow, noseTip, nose]}
                unit={unit}
                stroke="rgba(255,255,255,0.86)"
              />
              <EndpointLine
                a={nostrilL}
                b={nostrilR}
                unit={unit}
                stroke="rgba(255,255,255,0.8)"
              />
            </>
          )}

          {/* Cheekbone high zygomatic span */}
          {revealStage >= 3 && cheeksValid && (
            <EndpointLine
              a={cheekL}
              b={cheekR}
              unit={unit}
              stroke="rgba(255,255,255,0.82)"
              dashed
              animate={animateLines}
            />
          )}

          {/* Upper/Lower lip boundaries */}
          {revealStage >= 3 && lipsValid && (
            <>
              <EndpointLine
                a={mouthL}
                b={mouthR}
                unit={unit}
                stroke="rgba(255,255,255,0.85)"
              />
              <EndpointLine
                a={upperLipTop}
                b={lowerLipBottom}
                unit={unit}
                stroke="rgba(255,255,255,0.75)"
                showDots={false}
              />
            </>
          )}

          {/* Jawline & Chin Contour */}
          {revealStage >= 4 && (
            <>
              <PolyContour
                pts={[jawL, chinL, chin, chinR, jawR]}
                unit={unit}
                stroke="rgba(255,255,255,0.92)"
              />
              <EndpointLine
                a={jawL}
                b={jawR}
                unit={unit}
                stroke="rgba(255,255,255,0.65)"
                dashed
                animate={animateLines}
              />
            </>
          )}

          {/* Facial Thirds vertical axis (Hairline -> Brow -> NoseBase -> ChinBottom, never neck) */}
          {revealStage >= 4 && thirdsValid && (
            <>
              <EndpointLine
                a={hairline}
                b={chin}
                unit={unit}
                stroke="rgba(255,255,255,0.48)"
                dashed
              />
              <EndpointLine
                a={nose}
                b={chin}
                unit={unit}
                stroke="rgba(255,255,255,0.9)"
                showDots={false}
              />
              {[hairline, brow, nose, chin].map((pt, i) =>
                pt ? (
                  <circle
                    key={`third-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={2.2 * unit}
                    fill="#ffffff"
                    stroke="#0a0a0a"
                    strokeWidth={0.8 * unit}
                  />
                ) : null,
              )}
            </>
          )}
        </svg>
      )}
    </div>
  );
}

export function SideMeasurementOverlay({
  photo,
  landmarks,
  showLines = true,
  revealStage = 99,
  animateLines = false,
  darkTheme = true,
}: {
  photo: StoredPhoto;
  landmarks?: SideLandmarks | null;
  showLines?: boolean;
  revealStage?: number;
  animateLines?: boolean;
  darkTheme?: boolean;
}) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const w = naturalSize?.w || photo.width || 720;
  const h = naturalSize?.h || photo.height || 960;
  const unit = Math.max(w, h) / 480;

  const foreheadTop = toPx(landmarks?.foreheadTop, w, h);
  const nasion = toPx(landmarks?.nasion, w, h);
  const noseTip = toPx(landmarks?.noseTip, w, h);
  const subnasale = toPx(landmarks?.subnasale, w, h);
  const upperLip = toPx(landmarks?.upperLip, w, h);
  const lowerLip = toPx(landmarks?.lowerLip, w, h);
  const chinTip = toPx(landmarks?.chinTip, w, h);
  const submentalVertex = toPx(landmarks?.submentalVertex, w, h);
  const ear = toPx(landmarks?.earTragus, w, h);
  const gonial = toPx(landmarks?.gonialCorner, w, h);
  const neck = toPx(landmarks?.neckBase, w, h);

  const outlinePts = (landmarks?.profileOutline ?? []).map((p) => toPx(p, w, h));
  const canRenderLandmarks = Boolean(landmarks) && showLines;

  return (
    <div
      style={{ aspectRatio: `${w} / ${h}` }}
      className={`relative w-full overflow-hidden rounded-2xl border ${
        darkTheme ? 'border-white/12 bg-[#0b0b0c]' : 'border-[#0a0a0a]/20 bg-[#141414]'
      }`}
    >
      <img
        src={photo.dataUrl}
        alt="Side profile facial and cervical landmarks"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setNaturalSize((prev) =>
              prev && prev.w === img.naturalWidth && prev.h === img.naturalHeight
                ? prev
                : { w: img.naturalWidth, h: img.naturalHeight },
            );
          }
        }}
        className="block h-full w-full object-fill"
      />

      {canRenderLandmarks && (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Full profile contour */}
          {revealStage >= 1 && (
            <PolyContour
              pts={outlinePts}
              unit={unit}
              stroke="rgba(255,255,255,0.48)"
              dashed
            />
          )}

          {/* Forehead projection */}
          {revealStage >= 2 && (
            <EndpointLine
              a={foreheadTop}
              b={nasion}
              unit={unit}
              stroke="rgba(255,255,255,0.85)"
              animate={animateLines}
            />
          )}

          {/* Nose projection */}
          {revealStage >= 3 && (
            <>
              <EndpointLine
                a={nasion}
                b={noseTip}
                unit={unit}
                stroke="rgba(255,255,255,0.9)"
                animate={animateLines}
              />
              <EndpointLine
                a={subnasale}
                b={noseTip}
                unit={unit}
                stroke="rgba(255,255,255,0.75)"
                dashed
              />
            </>
          )}

          {/* Lip & Chin projection */}
          {revealStage >= 4 && (
            <>
              <PolyContour
                pts={[subnasale, upperLip, lowerLip, chinTip]}
                unit={unit}
                stroke="rgba(255,255,255,0.86)"
              />
              <EndpointLine
                a={subnasale}
                b={chinTip}
                unit={unit}
                stroke="rgba(255,255,255,0.58)"
                dashed
                showDots={false}
              />
            </>
          )}

          {/* Ramus, Gonial Jaw Angle & Chin-to-Neck relationship */}
          {revealStage >= 5 && (
            <>
              <EndpointLine
                a={ear}
                b={gonial}
                unit={unit}
                stroke="rgba(255,255,255,0.92)"
                animate={animateLines}
              />
              <EndpointLine
                a={gonial}
                b={chinTip}
                unit={unit}
                stroke="rgba(255,255,255,0.95)"
                animate={animateLines}
              />
              {submentalVertex ? (
                <>
                  <EndpointLine
                    a={chinTip}
                    b={submentalVertex}
                    unit={unit}
                    stroke="rgba(255,255,255,0.82)"
                  />
                  <EndpointLine
                    a={submentalVertex}
                    b={neck}
                    unit={unit}
                    stroke="rgba(255,255,255,0.68)"
                    dashed
                  />
                </>
              ) : (
                <EndpointLine
                  a={ear}
                  b={neck}
                  unit={unit}
                  stroke="rgba(255,255,255,0.65)"
                  dashed
                />
              )}
            </>
          )}
        </svg>
      )}
    </div>
  );
}
