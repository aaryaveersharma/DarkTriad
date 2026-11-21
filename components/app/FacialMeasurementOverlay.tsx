'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import { FrontLandmarks, Point2D, SideLandmarks, StoredPhoto } from '@/lib/types';
import {
  validateFrontOverlaySegments,
  validateSideOverlaySegments,
} from '@/lib/vision/landmarkGeometry';

function toPx(pt: Point2D | undefined | null, w: number, h: number): { x: number; y: number } | null {
  if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return null;
  if (pt.x < 0 || pt.x > 1000 || pt.y < 0 || pt.y > 1000) return null;
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
  const strokeW = 1.15 * unit;
  const dotR = 2.3 * unit;
  const haloR = 4.6 * unit;

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
          transition={{ duration: 0.45, delay, ease: 'easeOut' }}
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

function PolyCurve({
  points,
  unit,
  stroke = 'rgba(255,255,255,0.7)',
  dashed = false,
  closed = false,
  animate = false,
}: {
  points: Array<{ x: number; y: number }>;
  unit: number;
  stroke?: string;
  dashed?: boolean;
  closed?: boolean;
  animate?: boolean;
}) {
  if (points.length < 2) return null;
  const d =
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ') + (closed ? ' Z' : '');

  if (animate) {
    return (
      <motion.path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.15 * unit}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? `${4 * unit} ${3 * unit}` : undefined}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.65, ease: 'easeInOut' }}
      />
    );
  }

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

  const validated = validateFrontOverlaySegments(landmarks);
  const canRenderLandmarks = Boolean(landmarks) && showLines;

  const outlinePts = validated.faceOutline
    .map((p) => toPx(p, w, h))
    .filter((p): p is { x: number; y: number } => Boolean(p));

  const lOut = toPx(validated.eyes?.leftOuter, w, h);
  const lIn = toPx(validated.eyes?.leftInner, w, h);
  const rIn = toPx(validated.eyes?.rightInner, w, h);
  const rOut = toPx(validated.eyes?.rightOuter, w, h);
  const lPupil = toPx(validated.eyes?.leftPupil, w, h);
  const rPupil = toPx(validated.eyes?.rightPupil, w, h);
  const lUp = toPx(validated.eyes?.leftUpperLid, w, h);
  const lLo = toPx(validated.eyes?.leftLowerLid, w, h);
  const rUp = toPx(validated.eyes?.rightUpperLid, w, h);
  const rLo = toPx(validated.eyes?.rightLowerLid, w, h);

  const lBrowPts = (validated.brows?.left ?? [])
    .map((p) => toPx(p, w, h))
    .filter((p): p is { x: number; y: number } => Boolean(p));
  const rBrowPts = (validated.brows?.right ?? [])
    .map((p) => toPx(p, w, h))
    .filter((p): p is { x: number; y: number } => Boolean(p));

  const noseBridgeTop = toPx(validated.nose?.bridgeTop, w, h);
  const noseTip = toPx(validated.nose?.tip, w, h);
  const noseBase = toPx(validated.nose?.base, w, h);
  const nostrilL = toPx(validated.nose?.nostrilL, w, h);
  const nostrilR = toPx(validated.nose?.nostrilR, w, h);

  const hairline = toPx(validated.facialThirds?.hairline, w, h);
  const brow = toPx(validated.facialThirds?.brow, w, h);
  const thirdNose = toPx(validated.facialThirds?.noseBase, w, h);
  const thirdChin = toPx(validated.facialThirds?.chin, w, h);

  const cheekL = toPx(validated.cheekbones?.left, w, h);
  const cheekR = toPx(validated.cheekbones?.right, w, h);

  const mouthL = toPx(validated.lips?.mouthLeft, w, h);
  const mouthR = toPx(validated.lips?.mouthRight, w, h);
  const upperLip = toPx(validated.lips?.upperLip, w, h);
  const lowerLip = toPx(validated.lips?.lowerLip, w, h);

  const jawL = toPx(validated.jawline?.jawLeft, w, h);
  const jawR = toPx(validated.jawline?.jawRight, w, h);
  const chinL = toPx(validated.jawline?.chinLeft, w, h);
  const chinR = toPx(validated.jawline?.chinRight, w, h);
  const jawContourPts = (validated.jawline?.contour ?? [])
    .map((p) => toPx(p, w, h))
    .filter((p): p is { x: number; y: number } => Boolean(p));

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[20px] border ${
        darkTheme ? 'border-white/12 bg-[#0b0b0c]' : 'border-[#0a0a0a]/20 bg-[#141414]'
      }`}
    >
      <img
        src={photo.dataUrl}
        alt="Front profile facial landmarks"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
          }
        }}
        className="block w-full h-auto"
      />

      {canRenderLandmarks && (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Facial Boundary Perimeter */}
          {revealStage >= 1 && outlinePts.length >= 4 && (
            <PolyCurve
              points={outlinePts}
              unit={unit}
              stroke="rgba(255,255,255,0.42)"
              dashed
              closed
              animate={animateLines}
            />
          )}

          {/* Eyebrows */}
          {revealStage >= 2 && lBrowPts.length >= 2 && (
            <PolyCurve points={lBrowPts} unit={unit} stroke="rgba(255,255,255,0.75)" animate={animateLines} />
          )}
          {revealStage >= 2 && rBrowPts.length >= 2 && (
            <PolyCurve points={rBrowPts} unit={unit} stroke="rgba(255,255,255,0.75)" animate={animateLines} />
          )}

          {/* Eyes: Inner & Outer Canthi, Lid Boundaries, Pupils & Full Eye Span */}
          {revealStage >= 2 && lOut && lIn && rIn && rOut && (
            <>
              <EndpointLine
                a={lOut}
                b={rOut}
                unit={unit}
                stroke="rgba(255,255,255,0.88)"
                visible
                animate={animateLines}
              />
              <EndpointLine a={lOut} b={lIn} unit={unit} stroke="rgba(255,255,255,0.95)" showDots={false} />
              <EndpointLine a={rIn} b={rOut} unit={unit} stroke="rgba(255,255,255,0.95)" showDots={false} />
              {lUp && lLo && (
                <PolyCurve
                  points={[lOut, lUp, lIn, lLo]}
                  unit={unit}
                  stroke="rgba(255,255,255,0.65)"
                  closed
                />
              )}
              {rUp && rLo && (
                <PolyCurve
                  points={[rIn, rUp, rOut, rLo]}
                  unit={unit}
                  stroke="rgba(255,255,255,0.65)"
                  closed
                />
              )}
              {[lPupil, rPupil].map(
                (pt, idx) =>
                  pt && (
                    <circle
                      key={`pupil-${idx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={2.2 * unit}
                      fill="#ffffff"
                      stroke="#0a0a0a"
                      strokeWidth={0.7 * unit}
                    />
                  ),
              )}
            </>
          )}

          {/* Facial Thirds (Hairline -> Brow -> Nose Base -> Chin Tip) */}
          {revealStage >= 3 && hairline && brow && thirdNose && thirdChin && (
            <>
              <EndpointLine
                a={hairline}
                b={thirdChin}
                unit={unit}
                stroke="rgba(255,255,255,0.45)"
                dashed
                animate={animateLines}
              />
              {[brow, thirdNose].map((pt, i) => (
                <g key={`third-${i}`}>
                  <circle cx={pt.x} cy={pt.y} r={4.2 * unit} fill="rgba(255,255,255,0.16)" />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={2.2 * unit}
                    fill="#ffffff"
                    stroke="#0a0a0a"
                    strokeWidth={0.8 * unit}
                  />
                </g>
              ))}
              <EndpointLine
                a={thirdNose}
                b={thirdChin}
                unit={unit}
                stroke="rgba(255,255,255,0.88)"
                animate={animateLines}
              />
            </>
          )}

          {/* Nose Bridge, Tip & Nostril Span */}
          {revealStage >= 3 && noseBase && (
            <>
              {noseBridgeTop && (
                <EndpointLine
                  a={noseBridgeTop}
                  b={noseTip ?? noseBase}
                  unit={unit}
                  stroke="rgba(255,255,255,0.85)"
                  showDots={false}
                />
              )}
              {nostrilL && nostrilR && (
                <EndpointLine
                  a={nostrilL}
                  b={nostrilR}
                  unit={unit}
                  stroke="rgba(255,255,255,0.85)"
                />
              )}
            </>
          )}

          {/* Zygomatic Cheekbones */}
          {revealStage >= 4 && cheekL && cheekR && (
            <EndpointLine
              a={cheekL}
              b={cheekR}
              unit={unit}
              stroke="rgba(255,255,255,0.8)"
              dashed
              animate={animateLines}
            />
          )}

          {/* Lips & Mouth Boundaries */}
          {revealStage >= 4 && mouthL && mouthR && (
            <>
              <EndpointLine
                a={mouthL}
                b={mouthR}
                unit={unit}
                stroke="rgba(255,255,255,0.82)"
                animate={animateLines}
              />
              {upperLip && lowerLip && (
                <PolyCurve
                  points={[mouthL, upperLip, mouthR, lowerLip]}
                  unit={unit}
                  stroke="rgba(255,255,255,0.58)"
                  closed
                />
              )}
            </>
          )}

          {/* Jawline Contour & Chin Span */}
          {revealStage >= 4 && (
            <>
              {jawContourPts.length >= 5 && (
                <PolyCurve
                  points={jawContourPts}
                  unit={unit}
                  stroke="rgba(255,255,255,0.9)"
                  animate={animateLines}
                />
              )}
              {jawL && jawR && (
                <EndpointLine
                  a={jawL}
                  b={jawR}
                  unit={unit}
                  stroke="rgba(255,255,255,0.75)"
                  dashed
                  animate={animateLines}
                />
              )}
              {chinL && chinR && (
                <EndpointLine
                  a={chinL}
                  b={chinR}
                  unit={unit}
                  stroke="rgba(255,255,255,0.82)"
                  animate={animateLines}
                />
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

  const validated = validateSideOverlaySegments(landmarks);
  const canRenderLandmarks = Boolean(landmarks) && showLines;

  const outlinePts = validated.profileOutline
    .map((p) => toPx(p, w, h))
    .filter((p): p is { x: number; y: number } => Boolean(p));

  const fTop = toPx(validated.foreheadProjection?.foreheadTop, w, h);
  const fNasion = toPx(validated.foreheadProjection?.nasion, w, h);
  const nBridge = toPx(validated.nasalBridge?.nasion, w, h);
  const nTipBridge = toPx(validated.nasalBridge?.noseTip, w, h);
  const nSub = toPx(validated.nasalProjection?.subnasale, w, h);
  const nTipProj = toPx(validated.nasalProjection?.noseTip, w, h);

  const lSub = toPx(validated.lipProjection?.subnasale, w, h);
  const lUpper = toPx(validated.lipProjection?.upperLip, w, h);
  const lLower = toPx(validated.lipProjection?.lowerLip, w, h);
  const lChin = toPx(validated.lipProjection?.chinTip, w, h);

  const ear = toPx(validated.jawAndRamus?.earTragus, w, h);
  const gonial = toPx(validated.jawAndRamus?.gonialCorner, w, h);
  const jawChin = toPx(validated.jawAndRamus?.chinTip, w, h);
  const neck = toPx(validated.chinToNeck?.neckBase, w, h);

  const lipCurvePts = [lSub, lUpper, lLower, lChin].filter(
    (p): p is { x: number; y: number } => Boolean(p),
  );

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[20px] border ${
        darkTheme ? 'border-white/12 bg-[#0b0b0c]' : 'border-[#0a0a0a]/20 bg-[#141414]'
      }`}
    >
      <img
        src={photo.dataUrl}
        alt="Side profile facial and cervical landmarks"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
          }
        }}
        className="block w-full h-auto"
      />

      {canRenderLandmarks && (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Profile Silhouette Contour */}
          {revealStage >= 1 && outlinePts.length >= 4 && (
            <PolyCurve
              points={outlinePts}
              unit={unit}
              stroke="rgba(255,255,255,0.48)"
              dashed
              animate={animateLines}
            />
          )}

          {/* Forehead Slope Projection */}
          {revealStage >= 5 && fTop && fNasion && (
            <EndpointLine
              a={fTop}
              b={fNasion}
              unit={unit}
              stroke="rgba(255,255,255,0.75)"
              animate={animateLines}
            />
          )}

          {/* Nasal Bridge & Projection */}
          {revealStage >= 5 && nBridge && nTipBridge && (
            <EndpointLine
              a={nBridge}
              b={nTipBridge}
              unit={unit}
              stroke="rgba(255,255,255,0.9)"
              animate={animateLines}
            />
          )}
          {revealStage >= 5 && nSub && nTipProj && (
            <EndpointLine
              a={nSub}
              b={nTipProj}
              unit={unit}
              stroke="rgba(255,255,255,0.72)"
              dashed
              animate={animateLines}
            />
          )}

          {/* Lip & Chin Projection */}
          {revealStage >= 5 && lipCurvePts.length >= 2 && (
            <PolyCurve
              points={lipCurvePts}
              unit={unit}
              stroke="rgba(255,255,255,0.85)"
              animate={animateLines}
            />
          )}
          {revealStage >= 5 && lSub && lChin && (
            <EndpointLine
              a={lSub}
              b={lChin}
              unit={unit}
              stroke="rgba(255,255,255,0.55)"
              dashed
              showDots={false}
            />
          )}

          {/* Ramus & Jawline Angle (Ear Tragus -> Gonial -> Chin Tip) */}
          {revealStage >= 5 && ear && gonial && jawChin && (
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
                b={jawChin}
                unit={unit}
                stroke="rgba(255,255,255,0.96)"
                animate={animateLines}
              />
            </>
          )}

          {/* Chin-to-Neck Submental / Cervical Line */}
          {revealStage >= 5 && jawChin && gonial && neck && (
            <EndpointLine
              a={gonial}
              b={neck}
              unit={unit}
              stroke="rgba(255,255,255,0.62)"
              dashed
              animate={animateLines}
            />
          )}
        </svg>
      )}
    </div>
  );
}
