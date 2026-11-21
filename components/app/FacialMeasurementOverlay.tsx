'use client';

import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import {
  ConfidenceLevel,
  FrontLandmarks,
  Point2D,
  SideLandmarks,
  StoredPhoto,
} from '@/lib/types';

function toPx(pt: Point2D | undefined, w: number, h: number): { x: number; y: number } | null {
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
}: {
  a: { x: number; y: number } | null;
  b: { x: number; y: number } | null;
  unit: number;
  stroke?: string;
  dashed?: boolean;
  visible?: boolean;
  animate?: boolean;
  delay?: number;
}) {
  if (!a || !b || !visible) return null;
  const strokeW = 1.25 * unit;
  const dotR = 2.6 * unit;
  const haloR = 5.2 * unit;

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
          transition={{ duration: 0.55, delay, ease: 'easeOut' }}
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
      {[a, b].map((pt, idx) => (
        <g key={idx}>
          <circle cx={pt.x} cy={pt.y} r={haloR} fill="rgba(255,255,255,0.18)" />
          <circle
            cx={pt.x}
            cy={pt.y}
            r={dotR}
            fill="#ffffff"
            stroke="#0a0a0a"
            strokeWidth={0.85 * unit}
          />
        </g>
      ))}
    </g>
  );
}

function ConfidenceNotice({ confidence }: { confidence?: ConfidenceLevel }) {
  if (!confidence || confidence === 'High') return null;
  return (
    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      <span>
        {confidence} landmark confidence — some peripheral points may reflect lighting/angle.
      </span>
    </div>
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
  const w = photo.width || 720;
  const h = photo.height || 960;
  const unit = Math.max(w, h) / 480;

  const hairline = toPx(landmarks?.hairlineTop, w, h);
  const brow = toPx(landmarks?.browMid, w, h);
  const nose = toPx(landmarks?.noseBase, w, h);
  const chin = toPx(landmarks?.chinBottom, w, h);
  const lOuter = toPx(landmarks?.leftEyeOuter, w, h);
  const rOuter = toPx(landmarks?.rightEyeOuter, w, h);
  const cheekL = toPx(landmarks?.cheekLeft, w, h);
  const cheekR = toPx(landmarks?.cheekRight, w, h);
  const jawL = toPx(landmarks?.jawLeft, w, h);
  const jawR = toPx(landmarks?.jawRight, w, h);
  const chinL = toPx(landmarks?.chinLeft, w, h);
  const chinR = toPx(landmarks?.chinRight, w, h);
  const mouthL = toPx(landmarks?.mouthLeft, w, h);
  const mouthR = toPx(landmarks?.mouthRight, w, h);

  const outlinePts = (landmarks?.faceOutline ?? [])
    .map((p) => toPx(p, w, h))
    .filter((p): p is { x: number; y: number } => Boolean(p));

  const outlineD =
    outlinePts.length >= 4
      ? `${outlinePts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} Z`
      : '';

  const canRenderLandmarks = Boolean(landmarks) && showLines;

  return (
    <div>
      <div
        className={`relative w-full overflow-hidden rounded-[22px] border ${
          darkTheme ? 'border-white/12 bg-[#0b0b0c]' : 'border-[#0a0a0a]/20 bg-[#141414]'
        }`}
      >
        <img
          src={photo.dataUrl}
          alt="Front profile facial landmarks"
          className="block w-full h-auto"
        />

        {canRenderLandmarks && (
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {/* Stage 1: Facial Boundary Contour */}
            {revealStage >= 1 && outlineD && (
              animateLines ? (
                <motion.path
                  d={outlineD}
                  fill="none"
                  stroke="rgba(255,255,255,0.48)"
                  strokeWidth={1.15 * unit}
                  strokeDasharray={`${5 * unit} ${3 * unit}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.9, ease: 'easeInOut' }}
                />
              ) : (
                <path
                  d={outlineD}
                  fill="none"
                  stroke="rgba(255,255,255,0.48)"
                  strokeWidth={1.15 * unit}
                  strokeDasharray={`${5 * unit} ${3 * unit}`}
                />
              )
            )}

            {/* Stage 2: Outer Eye Corner to Outer Eye Corner */}
            <EndpointLine
              a={lOuter}
              b={rOuter}
              unit={unit}
              stroke="rgba(255,255,255,0.95)"
              visible={revealStage >= 2}
              animate={animateLines}
            />

            {/* Stage 3: Facial Height & Thirds (Hairline -> Brow -> Nose -> Chin) */}
            <EndpointLine
              a={hairline}
              b={chin}
              unit={unit}
              stroke="rgba(255,255,255,0.45)"
              dashed
              visible={revealStage >= 3}
              animate={animateLines}
            />
            {revealStage >= 3 && hairline && brow && nose && chin && (
              <>
                {[brow, nose].map((pt, i) => (
                  <g key={`third-${i}`}>
                    <circle cx={pt.x} cy={pt.y} r={4.5 * unit} fill="rgba(255,255,255,0.16)" />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={2.5 * unit}
                      fill="#ffffff"
                      stroke="#0a0a0a"
                      strokeWidth={0.85 * unit}
                    />
                  </g>
                ))}
                {/* Lower facial third highlight */}
                <EndpointLine
                  a={nose}
                  b={chin}
                  unit={unit}
                  stroke="rgba(255,255,255,0.92)"
                  visible={revealStage >= 3}
                  animate={animateLines}
                  delay={0.15}
                />
              </>
            )}

            {/* Stage 4: Cheekbone Width + Jaw Width + Chin Width + Mouth Corners */}
            <EndpointLine
              a={cheekL}
              b={cheekR}
              unit={unit}
              stroke="rgba(255,255,255,0.78)"
              dashed
              visible={revealStage >= 4}
              animate={animateLines}
            />
            <EndpointLine
              a={jawL}
              b={jawR}
              unit={unit}
              stroke="rgba(255,255,255,0.88)"
              visible={revealStage >= 4}
              animate={animateLines}
              delay={0.12}
            />
            <EndpointLine
              a={chinL}
              b={chinR}
              unit={unit}
              stroke="rgba(255,255,255,0.82)"
              visible={revealStage >= 4}
              animate={animateLines}
              delay={0.22}
            />
            <EndpointLine
              a={mouthL}
              b={mouthR}
              unit={unit}
              stroke="rgba(255,255,255,0.72)"
              visible={revealStage >= 4}
              animate={animateLines}
              delay={0.28}
            />
          </svg>
        )}
      </div>
      <ConfidenceNotice confidence={landmarks?.confidence} />
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
  const w = photo.width || 720;
  const h = photo.height || 960;
  const unit = Math.max(w, h) / 480;

  const nasion = toPx(landmarks?.nasion, w, h);
  const noseTip = toPx(landmarks?.noseTip, w, h);
  const subnasale = toPx(landmarks?.subnasale, w, h);
  const chinTip = toPx(landmarks?.chinTip, w, h);
  const ear = toPx(landmarks?.earTragus, w, h);
  const gonial = toPx(landmarks?.gonialCorner, w, h);
  const neck = toPx(landmarks?.neckBase, w, h);

  const outlinePts = (landmarks?.profileOutline ?? [])
    .map((p) => toPx(p, w, h))
    .filter((p): p is { x: number; y: number } => Boolean(p));

  const outlineD =
    outlinePts.length >= 4
      ? outlinePts
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(' ')
      : '';

  const canRenderLandmarks = Boolean(landmarks) && showLines;

  return (
    <div>
      <div
        className={`relative w-full overflow-hidden rounded-[22px] border ${
          darkTheme ? 'border-white/12 bg-[#0b0b0c]' : 'border-[#0a0a0a]/20 bg-[#141414]'
        }`}
      >
        <img
          src={photo.dataUrl}
          alt="Side profile facial and cervical landmarks"
          className="block w-full h-auto"
        />

        {canRenderLandmarks && (
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {/* Stage 1: Profile Contour (Forehead -> Nose -> Lips -> Chin -> Jaw) */}
            {revealStage >= 1 && outlineD && (
              animateLines ? (
                <motion.path
                  d={outlineD}
                  fill="none"
                  stroke="rgba(255,255,255,0.52)"
                  strokeWidth={1.2 * unit}
                  strokeDasharray={`${5 * unit} ${3 * unit}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.9, ease: 'easeInOut' }}
                />
              ) : (
                <path
                  d={outlineD}
                  fill="none"
                  stroke="rgba(255,255,255,0.52)"
                  strokeWidth={1.2 * unit}
                  strokeDasharray={`${5 * unit} ${3 * unit}`}
                />
              )
            )}

            {/* Stage 5: Nose bridge, nose projection, chin projection, ramus, gonial & neck */}
            <EndpointLine
              a={nasion}
              b={noseTip}
              unit={unit}
              stroke="rgba(255,255,255,0.88)"
              visible={revealStage >= 5}
              animate={animateLines}
            />
            <EndpointLine
              a={subnasale}
              b={noseTip}
              unit={unit}
              stroke="rgba(255,255,255,0.72)"
              dashed
              visible={revealStage >= 5}
              animate={animateLines}
              delay={0.1}
            />
            <EndpointLine
              a={subnasale}
              b={chinTip}
              unit={unit}
              stroke="rgba(255,255,255,0.72)"
              dashed
              visible={revealStage >= 5}
              animate={animateLines}
              delay={0.18}
            />
            <EndpointLine
              a={ear}
              b={gonial}
              unit={unit}
              stroke="rgba(255,255,255,0.92)"
              visible={revealStage >= 5}
              animate={animateLines}
              delay={0.24}
            />
            <EndpointLine
              a={gonial}
              b={chinTip}
              unit={unit}
              stroke="rgba(255,255,255,0.95)"
              visible={revealStage >= 5}
              animate={animateLines}
              delay={0.3}
            />
            <EndpointLine
              a={ear}
              b={neck}
              unit={unit}
              stroke="rgba(255,255,255,0.65)"
              dashed
              visible={revealStage >= 5}
              animate={animateLines}
              delay={0.36}
            />
          </svg>
        )}
      </div>
      <ConfidenceNotice confidence={landmarks?.confidence} />
    </div>
  );
}
