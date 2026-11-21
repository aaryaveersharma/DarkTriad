'use client';

import {
  ArrowUpRight,
  Camera,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { FaceAvatarsCluster } from './TriadEmblems';

interface Point2D {
  x: number;
  y: number;
}

interface FrontLandmarks {
  hairlineTop: Point2D;
  browMid: Point2D;
  noseBase: Point2D;
  chinBottom: Point2D;
  leftEyeOuter: Point2D;
  leftPupil: Point2D;
  rightPupil: Point2D;
  rightEyeOuter: Point2D;
  cheekLeft: Point2D;
  cheekRight: Point2D;
  mouthLeft: Point2D;
  mouthRight: Point2D;
  jawLeft: Point2D;
  jawRight: Point2D;
}

interface SideLandmarks {
  earTragus: Point2D;
  gonialCorner: Point2D;
  chinTip: Point2D;
  neckBase: Point2D;
}

interface Proportions {
  upperThirdPct: number;
  middleThirdPct: number;
  lowerThirdPct: number;
  eyeToFaceRatio: string;
  lipToNoseRatio: string;
  gonialAngleEstimate: string;
}

interface SubScore {
  label: string;
  score: number;
  observation: string;
}

interface ProtocolStep {
  area: string;
  action: string;
  impact: string;
}

interface PostureRating {
  score: number;
  neckAlignment: string;
  observation: string;
}

interface AnalysisResult {
  faceDetected: boolean;
  overallRating: number;
  pslTier: string;
  faceShape: string;
  proportions: Proportions;
  frontLandmarks: FrontLandmarks;
  sideLandmarks: SideLandmarks;
  postureRating: PostureRating;
  summary: string;
  subScores: SubScore[];
  protocolSteps: ProtocolStep[];
}

interface CapturedPhoto {
  dataUrl: string;
  width: number;
  height: number;
}

type BoxMode = 'idle' | 'requesting' | 'camera' | 'analyzing' | 'result' | 'error';
type CaptureStep = 'front' | 'side';

interface CurvedCameraBoxProps {
  externalTriggerCount: number;
}

/**
 * Downscales any uploaded image or video frame to max 1024px JPEG (~100KB)
 * so Next.js / Gemini requests never fail from oversized mobile photos.
 */
function compressFileToJpeg(file: File): Promise<CapturedPhoto> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1024;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const width = Math.max(1, Math.round((img.naturalWidth || 720) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || 960) * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process image.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.86),
        width,
        height,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unsupported or unreadable image format. Please choose a JPEG or PNG photo.'));
    };
    img.src = objectUrl;
  });
}

function FrontLandmarkOverlay({
  photo,
  landmarks,
  showLandmarks,
}: {
  photo: CapturedPhoto;
  landmarks: FrontLandmarks;
  showLandmarks: boolean;
}) {
  const { width: w, height: h } = photo;
  const px = (pt: Point2D) => ({
    x: (pt.x / 1000) * w,
    y: (pt.y / 1000) * h,
  });

  const hairline = px(landmarks.hairlineTop);
  const brow = px(landmarks.browMid);
  const nose = px(landmarks.noseBase);
  const chin = px(landmarks.chinBottom);
  const lPupil = px(landmarks.leftPupil);
  const rPupil = px(landmarks.rightPupil);
  const cheekL = px(landmarks.cheekLeft);
  const cheekR = px(landmarks.cheekRight);
  const mouthL = px(landmarks.mouthLeft);
  const mouthR = px(landmarks.mouthRight);
  const jawL = px(landmarks.jawLeft);
  const jawR = px(landmarks.jawRight);

  const unit = Math.max(w, h) / 480;
  const dotR = 3.2 * unit;
  const strokeW = 1.4 * unit;

  // Vertical thirds guide sits slightly offset or along the midline cleanly
  const thirdsX = Math.min(w - 18 * unit, Math.max(cheekR.x + 14 * unit, w * 0.84));
  const midX = (hairline.x + chin.x) / 2;

  const renderDotPairLine = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    stroke = 'rgba(255,255,255,0.92)',
    dashed = false,
  ) => (
    <g>
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeDasharray={dashed ? `${4 * unit} ${3 * unit}` : undefined}
      />
      <circle cx={a.x} cy={a.y} r={dotR} fill="#ffffff" stroke="#0a0a0a" strokeWidth={0.9 * unit} />
      <circle cx={b.x} cy={b.y} r={dotR} fill="#ffffff" stroke="#0a0a0a" strokeWidth={0.9 * unit} />
    </g>
  );

  return (
    <div className="relative w-full overflow-hidden rounded-[22px] border border-[#0a0a0a]/20 bg-[#141414]">
      <img
        src={photo.dataUrl}
        alt="Analyzed front facial geometry"
        className="block w-full h-auto"
      />

      {showLandmarks && (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Subtle symmetry centerline */}
          <line
            x1={midX}
            y1={Math.max(8, hairline.y - 12 * unit)}
            x2={midX}
            y2={Math.min(h - 8, chin.y + 12 * unit)}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={0.9 * unit}
            strokeDasharray={`${3 * unit} ${4 * unit}`}
          />

          {/* Horizontal Facial Thirds boundary reference ticks */}
          {[hairline, brow, nose, chin].map((pt, i) => (
            <g key={i}>
              <line
                x1={Math.max(10 * unit, cheekL.x - 10 * unit)}
                y1={pt.y}
                x2={thirdsX}
                y2={pt.y}
                stroke="rgba(255,255,255,0.34)"
                strokeWidth={0.85 * unit}
                strokeDasharray={`${3 * unit} ${3 * unit}`}
              />
              <circle
                cx={thirdsX}
                cy={pt.y}
                r={dotR * 0.9}
                fill="#ffffff"
                stroke="#0a0a0a"
                strokeWidth={0.85 * unit}
              />
            </g>
          ))}

          {/* Facial Thirds vertical ruler connecting hairline -> brow -> nose -> chin */}
          <line
            x1={thirdsX}
            y1={hairline.y}
            x2={thirdsX}
            y2={chin.y}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={strokeW}
          />

          {/* 1. Left-to-right eye distance (pupils) with start & end dots */}
          {renderDotPairLine(lPupil, rPupil, 'rgba(255,255,255,0.95)')}

          {/* 2. Cheekbone width (bizygomatic) with start & end dots */}
          {renderDotPairLine(cheekL, cheekR, 'rgba(255,255,255,0.58)', true)}

          {/* 3. Lips starting-to-end width with two dots */}
          {renderDotPairLine(mouthL, mouthR, 'rgba(255,255,255,0.95)')}

          {/* 4. Jawline contour with gonial + chin dots */}
          <polyline
            points={`${jawL.x},${jawL.y} ${chin.x},${chin.y} ${jawR.x},${jawR.y}`}
            fill="none"
            stroke="rgba(255,255,255,0.88)"
            strokeWidth={strokeW}
          />
          {[jawL, chin, jawR, hairline, brow, nose].map((pt, idx) => (
            <circle
              key={`v-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={dotR}
              fill="#ffffff"
              stroke="#0a0a0a"
              strokeWidth={0.9 * unit}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

function SideLandmarkOverlay({
  photo,
  landmarks,
  showLandmarks,
}: {
  photo: CapturedPhoto;
  landmarks: SideLandmarks;
  showLandmarks: boolean;
}) {
  const { width: w, height: h } = photo;
  const px = (pt: Point2D) => ({
    x: (pt.x / 1000) * w,
    y: (pt.y / 1000) * h,
  });

  const ear = px(landmarks.earTragus);
  const gonial = px(landmarks.gonialCorner);
  const chin = px(landmarks.chinTip);
  const neck = px(landmarks.neckBase);

  const unit = Math.max(w, h) / 480;
  const dotR = 3.2 * unit;
  const strokeW = 1.4 * unit;

  return (
    <div className="relative w-full overflow-hidden rounded-[22px] border border-[#0a0a0a]/20 bg-[#141414]">
      <img
        src={photo.dataUrl}
        alt="Analyzed side profile and neck posture"
        className="block w-full h-auto"
      />
      {showLandmarks && (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Cervical neck alignment line (ear tragus -> neck base) */}
          <line
            x1={ear.x}
            y1={ear.y}
            x2={neck.x}
            y2={neck.y}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={strokeW}
            strokeDasharray={`${4 * unit} ${3 * unit}`}
          />
          {/* Mandibular plane (ear -> gonial -> chin) */}
          <polyline
            points={`${ear.x},${ear.y} ${gonial.x},${gonial.y} ${chin.x},${chin.y}`}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={strokeW}
          />
          {[ear, gonial, chin, neck].map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={dotR}
              fill="#ffffff"
              stroke="#0a0a0a"
              strokeWidth={0.9 * unit}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

export function CurvedCameraBox({ externalTriggerCount }: CurvedCameraBoxProps) {
  const [mode, setMode] = useState<BoxMode>('idle');
  const [captureStep, setCaptureStep] = useState<CaptureStep>('front');
  const [liveFeedActive, setLiveFeedActive] = useState(false);
  const [cameraNotice, setCameraNotice] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [frontPhoto, setFrontPhoto] = useState<CapturedPhoto | null>(null);
  const [sidePhoto, setSidePhoto] = useState<CapturedPhoto | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showLandmarks, setShowLandmarks] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastTriggerRef = useRef<number>(externalTriggerCount);

  const galleryInputId = useId();
  const nativeCameraInputId = useId();

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setLiveFeedActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Attach active MediaStream whenever video element is mounted & stream is ready
  useEffect(() => {
    if (mode !== 'camera' || !liveFeedActive) return;
    const videoEl = videoRef.current;
    const stream = streamRef.current;
    if (!videoEl || !stream) return;

    videoEl.srcObject = stream;
    void videoEl.play().catch(() => {
      // Autoplay handled by muted + playsInline
    });
  }, [mode, liveFeedActive, captureStep]);

  const requestCameraWithTimeout = async (): Promise<MediaStream> => {
    const getStream = async () => {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'OverconstrainedError') {
          return await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
        throw err;
      }
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error('Camera prompt timed out in this preview window.'));
      }, 4000);
    });

    return Promise.race([getStream(), timeoutPromise]);
  };

  const openCamera = useCallback(
    async (step: CaptureStep = 'front') => {
      setErrorMessage('');
      setCameraNotice('');
      if (step === 'front') {
        setAnalysis(null);
        setFrontPhoto(null);
        setSidePhoto(null);
      }
      setCaptureStep(step);
      stopCameraStream();

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraNotice(
          'Live webcam stream is unavailable in this preview context. Use "Take Selfie" or "Upload Photo" below.',
        );
        setLiveFeedActive(false);
        setMode('camera');
        return;
      }

      setMode('requesting');
      try {
        const stream = await requestCameraWithTimeout();
        streamRef.current = stream;
        setLiveFeedActive(true);
        setMode('camera');
      } catch (err) {
        const msg =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Live webcam permission was blocked by the preview frame. Use "Take Selfie" or "Upload Photo" below.'
            : 'Live webcam is unavailable inside this preview frame. Use "Take Selfie" or "Upload Photo" below.';
        setCameraNotice(msg);
        setLiveFeedActive(false);
        setMode('camera');
      }
    },
    [stopCameraStream],
  );

  // Open upload-first stage cleanly when user clicks "Or upload front & side selfies"
  const openUploadStage = useCallback(() => {
    stopCameraStream();
    setErrorMessage('');
    setCameraNotice('Upload or take Step 1 (Front Selfie), then Step 2 (Side Profile with Neck).');
    setAnalysis(null);
    setFrontPhoto(null);
    setSidePhoto(null);
    setCaptureStep('front');
    setLiveFeedActive(false);
    setMode('camera');
  }, [stopCameraStream]);

  // Respond to Hero / Nav / Footer "Get your ratings" button clicks
  useEffect(() => {
    if (externalTriggerCount > lastTriggerRef.current) {
      lastTriggerRef.current = externalTriggerCount;
      void openCamera('front');
    }
  }, [externalTriggerCount, openCamera]);

  const runAnalysis = async (front: CapturedPhoto, side: CapturedPhoto) => {
    stopCameraStream();
    setMode('analyzing');
    setErrorMessage('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontImageBase64: front.dataUrl,
          frontMimeType: 'image/jpeg',
          sideImageBase64: side.dataUrl,
          sideMimeType: 'image/jpeg',
        }),
      });

      const payload = (await response.json()) as AnalysisResult & { error?: string };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || 'Unable to analyze portraits.');
      }

      setAnalysis(payload);
      setMode('result');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to analyze portraits.',
      );
      setMode('error');
    }
  };

  const handlePhotoAccepted = useCallback(
    (photo: CapturedPhoto) => {
      setErrorMessage('');
      if (captureStep === 'front') {
        setFrontPhoto(photo);
        setCaptureStep('side');
        setMode('camera');
      } else {
        setSidePhoto(photo);
        if (frontPhoto) {
          void runAnalysis(frontPhoto, photo);
        }
      }
    },
    [captureStep, frontPhoto],
  );

  const captureFrameFromVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    const rawW = video.videoWidth || 960;
    const rawH = video.videoHeight || 720;
    const scale = Math.min(1, 1024 / Math.max(rawW, rawH));
    const width = Math.round(rawW * scale);
    const height = Math.round(rawH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    handlePhotoAccepted({ dataUrl, width, height });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const compressed = await compressFileToJpeg(file);
      handlePhotoAccepted(compressed);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not read that photo.',
      );
      setMode('error');
    }
  };

  const handleReset = () => {
    stopCameraStream();
    setFrontPhoto(null);
    setSidePhoto(null);
    setAnalysis(null);
    setCameraNotice('');
    setErrorMessage('');
    setCaptureStep('front');
    setMode('idle');
  };

  return (
    <section
      id="camera-box"
      className="scroll-mt-24 mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24"
    >
      <div className="relative overflow-hidden rounded-[36px] sm:rounded-[48px] border border-[#0a0a0a]/15 bg-[#e6e6e3] p-6 sm:p-10 md:p-14 shadow-[0_24px_60px_-28px_rgba(10,10,10,0.22)]">
        {/* Visually-hidden file inputs triggered reliably via native <label htmlFor> */}
        <input
          id={galleryInputId}
          type="file"
          accept="image/*"
          onChange={(e) => void handleFileChange(e)}
          className="sr-only"
        />
        <input
          id={nativeCameraInputId}
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => void handleFileChange(e)}
          className="sr-only"
        />

        {/* IDLE STATE: Stacked "Get / your / rating" in Pomelli font exclusively here */}
        {mode === 'idle' && (
          <div className="flex flex-col items-center justify-center py-6 text-center sm:py-10">
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#0a0a0a]/65 mb-6">
              [OPTICAL SCANNER · FRONT &amp; SIDE PROFILE]
            </p>

            {/* Stacked Pomelli-font typography used ONLY on this curved camera opener box */}
            <div className="pomelli-display select-none text-[clamp(4rem,10.5vw,7.75rem)] text-[#0a0a0a]">
              <span className="block">Get</span>
              <span className="block">your</span>
              <span className="block">rating</span>
            </div>

            <div className="mt-9 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => void openCamera('front')}
                className="tactile-cta group inline-flex items-center gap-3.5 rounded-full py-2.5 pl-3 pr-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a0a0a]"
              >
                <FaceAvatarsCluster count={2} size="md" ringColor="ring-[#141414]" />
                <span className="text-sm sm:text-base font-medium tracking-tight text-[#f3f3f1] whitespace-nowrap">
                  Get your ratings
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-[#f3f3f1] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </button>

              <button
                type="button"
                onClick={openUploadStage}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-[#0a0a0a]/75 hover:text-[#0a0a0a] underline underline-offset-4 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Or upload front &amp; side selfies</span>
              </button>
            </div>
          </div>
        )}

        {/* REQUESTING CAMERA PERMISSION STATE */}
        {mode === 'requesting' && (
          <div className="flex min-h-[380px] flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-36 w-28 items-center justify-center rounded-[50%] border-2 border-dashed border-[#0a0a0a]/35 bg-[#dadad7]/70">
              <Camera className="h-6 w-6 text-[#0a0a0a]" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <p className="pomelli-display text-3xl sm:text-4xl text-[#0a0a0a]">
                Opening camera
              </p>
              <p className="text-sm text-[#3f3f3c]">
                Allow camera access when prompted, or use the direct camera/upload options below.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label
                htmlFor={nativeCameraInputId}
                className="tactile-cta cursor-pointer inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium text-[#f3f3f1] whitespace-nowrap"
              >
                <Camera className="h-4 w-4" />
                <span>Take Front Selfie</span>
              </label>
              <label
                htmlFor={galleryInputId}
                className="cursor-pointer inline-flex items-center gap-2 rounded-full border border-[#0a0a0a]/20 bg-[#dadad7] px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#cfcfcc] transition-colors whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Photo</span>
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full px-4 py-2 text-xs font-medium text-[#3f3f3c] hover:text-[#0a0a0a]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* CAMERA & GUIDED FRONT -> SIDE PROFILE CAPTURE STAGE */}
        {mode === 'camera' && (
          <div className="flex flex-col gap-5">
            {/* Step header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-[0.12em] text-[#0a0a0a]/70">
                  {captureStep === 'front'
                    ? '[STEP 1 OF 2 · FRONT FACE SCAN]'
                    : '[STEP 2 OF 2 · SIDE PROFILE WITH NECK]'}
                </p>
                <p className="pomelli-display text-2xl sm:text-3xl text-[#0a0a0a] mt-1">
                  {captureStep === 'front'
                    ? 'Center your front face'
                    : 'Side profile & neck'}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {frontPhoto && captureStep === 'side' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFrontPhoto(null);
                      setCaptureStep('front');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0a0a0a]/20 bg-[#dadad7] px-3 py-1.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#cfcfcc] transition-colors whitespace-nowrap"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Front Saved · Retake</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="Close scanner"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#0a0a0a]/20 bg-[#dadad7] text-[#0a0a0a] hover:bg-[#cfcfcc] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Viewport with Circular Oval Face-Fit Border */}
            <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#0a0a0a]/20 bg-[#141414]">
              {liveFeedActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full -scale-x-100 object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center text-[#f3f3f1]/85">
                  <p className="max-w-sm text-xs sm:text-sm leading-relaxed">
                    {captureStep === 'front'
                      ? cameraNotice ||
                        'Tap "Take Selfie" or "Upload Front Photo" below to submit your front face inside the oval.'
                      : 'Front selfie saved. Now upload or take a side-profile photo showing your jawline and neck for posture ratings.'}
                  </p>
                </div>
              )}

              {/* Circular Oval Border Guide Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`relative flex items-center justify-center rounded-[50%] border-2 transition-all duration-200 ${
                    captureStep === 'front'
                      ? 'h-[76%] w-[46%] max-w-[240px] border-white/85 shadow-[0_0_0_9999px_rgba(10,10,10,0.36)]'
                      : 'h-[80%] w-[54%] max-w-[270px] border-white/85 shadow-[0_0_0_9999px_rgba(10,10,10,0.36)]'
                  }`}
                >
                  {captureStep === 'front' ? (
                    <>
                      <span className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-white/25" />
                      <span className="absolute inset-x-4 top-[44%] h-px bg-white/25" />
                    </>
                  ) : (
                    <span className="rounded-full bg-[#0a0a0a]/60 px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-white/95">
                      90° PROFILE + NECK
                    </span>
                  )}
                </div>
              </div>

              {/* Front thumbnail badge when capturing step 2 */}
              {frontPhoto && captureStep === 'side' && (
                <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl border border-white/25 bg-[#0a0a0a]/70 p-1.5 pr-3 text-[11px] font-medium text-white backdrop-blur-sm">
                  <img
                    src={frontPhoto.dataUrl}
                    alt="Captured front selfie"
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                  <span>Front captured</span>
                </div>
              )}
            </div>

            {/* Tip + Centered Primary Action + Balanced Secondary Row */}
            <div className="flex flex-col items-center gap-5 pt-1">
              <p className="text-center text-xs sm:text-sm font-medium leading-snug text-[#0a0a0a]">
                {captureStep === 'front'
                  ? 'Tip: Keep at eye level in front of good lighting and fit your face inside the oval.'
                  : 'Tip: Keep at eye level in front of good lighting — turn sideways showing your jawline and neck for posture ratings.'}
              </p>

              <div className="flex justify-center">
                {liveFeedActive ? (
                  <button
                    type="button"
                    onClick={captureFrameFromVideo}
                    className="tactile-cta inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-medium text-[#f3f3f1] whitespace-nowrap"
                  >
                    <Camera className="h-4 w-4" />
                    <span>
                      {captureStep === 'front'
                        ? 'Capture Front Face'
                        : 'Capture Side & Analyze'}
                    </span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                ) : (
                  <label
                    htmlFor={nativeCameraInputId}
                    className="tactile-cta cursor-pointer inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-medium text-[#f3f3f1] whitespace-nowrap"
                  >
                    <Camera className="h-4 w-4" />
                    <span>
                      {captureStep === 'front'
                        ? 'Take Front Selfie'
                        : 'Take Side & Neck Selfie'}
                    </span>
                    <ArrowUpRight className="h-4 w-4" />
                  </label>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <label
                  htmlFor={galleryInputId}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-full border border-[#0a0a0a]/20 bg-[#dadad7] px-5 py-3 text-xs font-medium text-[#0a0a0a] hover:bg-[#cfcfcc] transition-colors whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>
                    {captureStep === 'front'
                      ? 'Upload Front Photo'
                      : 'Upload Side Profile'}
                  </span>
                </label>

                {!liveFeedActive && (
                  <button
                    type="button"
                    onClick={() => void openCamera(captureStep)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-medium text-[#3f3f3c] hover:text-[#0a0a0a] underline underline-offset-4"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Live Camera</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ANALYZING STATE */}
        {mode === 'analyzing' && (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-6 py-6 text-center">
            <div className="flex items-center justify-center gap-4">
              {frontPhoto && (
                <div className="relative h-32 w-32 sm:h-40 sm:w-40 overflow-hidden rounded-[24px] border border-[#0a0a0a]/20 bg-[#141414]">
                  <img
                    src={frontPhoto.dataUrl}
                    alt="Front facial scan frame"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              {sidePhoto && (
                <div className="relative h-32 w-32 sm:h-40 sm:w-40 overflow-hidden rounded-[24px] border border-[#0a0a0a]/20 bg-[#141414]">
                  <img
                    src={sidePhoto.dataUrl}
                    alt="Side profile and neck scan frame"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="pomelli-display text-3xl sm:text-4xl text-[#0a0a0a]">
                Mapping facial landmarks
              </p>
              <p className="text-xs font-medium tracking-[0.1em] text-[#3f3f3c]">
                MEASURING EYE SPAN · FACIAL THIRDS · LIP WIDTH · CERVICAL POSTURE
              </p>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {mode === 'error' && (
          <div className="flex min-h-[340px] flex-col items-center justify-center gap-5 py-6 text-center">
            <p className="pomelli-display text-3xl sm:text-4xl text-[#0a0a0a]">
              Scan interrupted
            </p>
            <p className="max-w-md text-sm leading-relaxed text-[#3f3f3c]">
              {errorMessage}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void openCamera('front')}
                className="tactile-cta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-[#f3f3f1] whitespace-nowrap"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-[#0a0a0a]/20 px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#dadad7]"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* RESULT SCORECARD: Analyzed Portraits w/ Landmark Lines & Dots ABOVE the PSL Ratings */}
        {mode === 'result' && analysis && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* 1. UPLOADED / CAPTURED SELFIE LANDMARK ANALYSIS ABOVE THE RATINGS */}
            {frontPhoto && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium tracking-[0.12em] text-[#3f3f3c]">
                      [STRUCTURAL LANDMARK MAP · {analysis.faceShape.toUpperCase()}]
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLandmarks((s) => !s)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0a0a0a]/20 bg-[#dadad7] px-3.5 py-1.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#cfcfcc] transition-colors"
                  >
                    {showLandmarks ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Hide Geometry Lines</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>Show Geometry Lines</span>
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`grid gap-4 items-start ${
                    sidePhoto ? 'md:grid-cols-2' : 'max-w-md mx-auto'
                  }`}
                >
                  {analysis.faceDetected && analysis.frontLandmarks ? (
                    <div className="space-y-2">
                      <FrontLandmarkOverlay
                        photo={frontPhoto}
                        landmarks={analysis.frontLandmarks}
                        showLandmarks={showLandmarks}
                      />
                      <p className="text-[11px] font-medium text-[#3f3f3c]">
                        Front · Eye distance, facial thirds, cheekbone &amp; lip endpoints
                      </p>
                    </div>
                  ) : (
                    <img
                      src={frontPhoto.dataUrl}
                      alt="Submitted front portrait"
                      className="w-full rounded-[22px] border border-[#0a0a0a]/20 object-cover"
                    />
                  )}

                  {sidePhoto && analysis.faceDetected && analysis.sideLandmarks ? (
                    <div className="space-y-2">
                      <SideLandmarkOverlay
                        photo={sidePhoto}
                        landmarks={analysis.sideLandmarks}
                        showLandmarks={showLandmarks}
                      />
                      <p className="text-[11px] font-medium text-[#3f3f3c]">
                        Side Profile · Gonial plane &amp; cervical neck alignment
                      </p>
                    </div>
                  ) : sidePhoto ? (
                    <img
                      src={sidePhoto.dataUrl}
                      alt="Submitted side portrait"
                      className="w-full rounded-[22px] border border-[#0a0a0a]/20 object-cover"
                    />
                  ) : null}
                </div>

                {/* Measured Proportions Bar right below the landmark map */}
                {analysis.faceDetected && analysis.proportions && (
                  <div className="grid gap-3 sm:grid-cols-4 rounded-2xl border border-[#0a0a0a]/12 bg-[#dadad7]/65 p-4 text-xs">
                    <div>
                      <span className="block text-[11px] text-[#585854]">
                        Facial Thirds (U / M / L)
                      </span>
                      <span className="mt-0.5 block font-semibold text-[#0a0a0a] tabular-nums">
                        {Math.round(analysis.proportions.upperThirdPct)}% ·{' '}
                        {Math.round(analysis.proportions.middleThirdPct)}% ·{' '}
                        {Math.round(analysis.proportions.lowerThirdPct)}%
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-[#585854]">
                        Left–Right Eye Span
                      </span>
                      <span className="mt-0.5 block font-semibold text-[#0a0a0a] tabular-nums">
                        {analysis.proportions.eyeToFaceRatio}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-[#585854]">
                        Lip-to-Nose Width
                      </span>
                      <span className="mt-0.5 block font-semibold text-[#0a0a0a] tabular-nums">
                        {analysis.proportions.lipToNoseRatio}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-[#585854]">
                        Gonial Jaw Angle
                      </span>
                      <span className="mt-0.5 block font-semibold text-[#0a0a0a] tabular-nums">
                        {analysis.proportions.gonialAngleEstimate}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. PSL SCORE & SUMMARY */}
            <div className="flex flex-col gap-6 border-y border-[#0a0a0a]/12 py-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-medium tracking-[0.12em] text-[#3f3f3c]">
                  {analysis.faceShape} · {analysis.pslTier}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="pomelli-display text-5xl sm:text-6xl text-[#0a0a0a] tabular-nums">
                    {analysis.faceDetected ? analysis.overallRating.toFixed(1) : '—'}
                  </span>
                  {analysis.faceDetected && (
                    <span className="text-sm font-medium text-[#3f3f3c] tabular-nums">
                      / 10.0
                    </span>
                  )}
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0a0a0a]/85">
                  {analysis.summary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void openCamera('front')}
                  className="tactile-cta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium text-[#f3f3f1] whitespace-nowrap"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Scan Again</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-full border border-[#0a0a0a]/20 px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#dadad7] transition-colors whitespace-nowrap"
                >
                  Close
                </button>
              </div>
            </div>

            {analysis.faceDetected && (
              <>
                {/* 3. POSTURE RATING ROW */}
                {analysis.postureRating && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-2xl border border-[#0a0a0a]/14 bg-[#dadad7]/80 p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-[#0a0a0a]">
                        Posture &amp; Neck Alignment · {analysis.postureRating.neckAlignment}
                      </span>
                      <span className="text-base font-semibold text-[#0a0a0a] tabular-nums">
                        {analysis.postureRating.score.toFixed(1)} / 10
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#3f3f3c]">
                      {analysis.postureRating.observation}
                    </p>
                  </motion.div>
                )}

                {/* 4. PSL FEATURE BREAKDOWN */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {analysis.subScores.map((item, idx) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.45,
                        delay: 0.12 + idx * 0.05,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="rounded-2xl border border-[#0a0a0a]/12 bg-[#dadad7]/70 p-4"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-xs font-semibold text-[#0a0a0a]">
                          {item.label}
                        </h3>
                        <span className="text-base font-semibold text-[#0a0a0a] tabular-nums">
                          {item.score.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[#3f3f3c]">
                        {item.observation}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* 5. TAILORED PROTOCOL */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h3 className="text-xs font-medium tracking-[0.12em] text-[#3f3f3c] mb-3">
                    TAILORED IMPROVEMENT PROTOCOL
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {analysis.protocolSteps.map((step, index) => (
                      <div
                        key={step.area}
                        className="rounded-2xl border border-[#0a0a0a]/12 bg-[#dadad7]/45 p-4"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs text-[#3f3f3c]">
                          <span className="font-semibold text-[#0a0a0a]">
                            0{index + 1}. {step.area}
                          </span>
                          <span className="text-[11px] font-medium">{step.impact}</span>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-[#0a0a0a]/85">
                          {step.action}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
