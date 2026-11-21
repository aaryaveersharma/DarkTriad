'use client';

import {
  AlertCircle,
  ArrowUpRight,
  Camera,
  Check,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { PSLAnalysisResult, StoredPhoto, UserProfile } from '@/lib/types';
import { FaceAvatarsCluster } from './TriadEmblems';
import {
  FrontMeasurementOverlay,
  SideMeasurementOverlay,
} from './app/FacialMeasurementOverlay';

type BoxMode = 'idle' | 'requesting' | 'camera' | 'analyzing' | 'error';
type CaptureSlot = 'front' | 'side';

interface CurvedCameraBoxProps {
  externalTriggerCount: number;
  profile?: UserProfile | null;
  previousAnalysisSummary?: string | null;
  isUpdatingSelfie?: boolean;
  onCancelUpdate?: () => void;
  onAnalysisComplete: (
    frontPhoto: StoredPhoto,
    sidePhoto: StoredPhoto,
    result: PSLAnalysisResult,
  ) => void;
}

const MAPPING_STAGE_LABELS: Record<number, string> = {
  0: 'SCANNING OPTICS & ALIGNING ANATOMICAL REFERENCE FRAME...',
  1: 'TRACING FOREHEAD, CHEEK, JAW & CHIN FACIAL BOUNDARY OUTLINES...',
  2: 'MEASURING OUTER EYE CORNER TO OUTER EYE CORNER SPAN...',
  3: 'CALCULATING HAIRLINE-TO-CHIN HEIGHT & FACIAL THIRDS...',
  4: 'MAPPING BIZYGOMATIC CHEEKBONE, JAW & CHIN WIDTHS...',
  5: 'TRACING NASAL BRIDGE, PROJECTION, GONIAL ANGLE & CERVICAL NECK LINE...',
  6: 'FACIAL MAPPING COMPLETE — OPENING YOUR RATINGS...',
};

function compressFileToJpeg(file: File): Promise<StoredPhoto> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 768;
      const scale = Math.min(
        1,
        maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
      );
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
        dataUrl: canvas.toDataURL('image/jpeg', 0.8),
        width,
        height,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          'Unsupported or unreadable image format. Please choose a JPEG or PNG photo.',
        ),
      );
    };
    img.src = objectUrl;
  });
}

export function CurvedCameraBox({
  externalTriggerCount,
  profile,
  previousAnalysisSummary,
  isUpdatingSelfie = false,
  onCancelUpdate,
  onAnalysisComplete,
}: CurvedCameraBoxProps) {
  const [mode, setMode] = useState<BoxMode>('idle');
  const [activeSlot, setActiveSlot] = useState<CaptureSlot>('front');
  const [liveFeedActive, setLiveFeedActive] = useState(false);
  const [cameraNotice, setCameraNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [frontPhoto, setFrontPhoto] = useState<StoredPhoto | null>(null);
  const [sidePhoto, setSidePhoto] = useState<StoredPhoto | null>(null);
  const [validatingSlot, setValidatingSlot] = useState<CaptureSlot | null>(null);
  const [slotErrors, setSlotErrors] = useState<{ front?: string; side?: string }>({});

  const [pendingResult, setPendingResult] = useState<PSLAnalysisResult | null>(null);
  const [revealStage, setRevealStage] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastTriggerRef = useRef<number>(externalTriggerCount);
  const mappingTimersRef = useRef<number[]>([]);
  const onAnalysisCompleteRef = useRef(onAnalysisComplete);
  onAnalysisCompleteRef.current = onAnalysisComplete;

  const frontUploadId = useId();
  const frontCameraId = useId();
  const sideUploadId = useId();
  const sideCameraId = useId();

  const clearMappingTimers = useCallback(() => {
    mappingTimersRef.current.forEach((id) => window.clearTimeout(id));
    mappingTimersRef.current = [];
  }, []);

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
      clearMappingTimers();
    };
  }, [stopCameraStream, clearMappingTimers]);

  useEffect(() => {
    if (mode !== 'camera' || !liveFeedActive) return;
    const videoEl = videoRef.current;
    const stream = streamRef.current;
    if (!videoEl || !stream) return;
    videoEl.srcObject = stream;
    void videoEl.play().catch(() => {
      // Autoplay controlled via muted + playsInline
    });
  }, [mode, liveFeedActive, activeSlot]);

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
      }, 3500);
    });

    return Promise.race([getStream(), timeoutPromise]);
  };

  const openCamera = useCallback(
    async (slot: CaptureSlot = 'front', preserveExisting = false) => {
      clearMappingTimers();
      setErrorMessage('');
      setCameraNotice('');
      if (!preserveExisting) {
        setFrontPhoto(null);
        setSidePhoto(null);
        setSlotErrors({});
      }
      setPendingResult(null);
      setRevealStage(0);
      setActiveSlot(slot);
      stopCameraStream();

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraNotice(
          'Live webcam unavailable here. Tap inside the oval or use the FRONT / SIDE buttons below.',
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
            ? 'Camera permission blocked in preview frame. Tap inside the oval or upload Front & Side below.'
            : 'Live webcam unavailable inside preview frame. Tap inside the oval or upload Front & Side below.';
        setCameraNotice(msg);
        setLiveFeedActive(false);
        setMode('camera');
      }
    },
    [clearMappingTimers, stopCameraStream],
  );

  const openUploadStage = useCallback(() => {
    clearMappingTimers();
    stopCameraStream();
    setErrorMessage('');
    setCameraNotice(
      'Upload or capture a clear FRONT PROFILE and a genuine 90° SIDE PROFILE.',
    );
    setFrontPhoto(null);
    setSidePhoto(null);
    setSlotErrors({});
    setPendingResult(null);
    setRevealStage(0);
    setActiveSlot('front');
    setLiveFeedActive(false);
    setMode('camera');
  }, [clearMappingTimers, stopCameraStream]);

  useEffect(() => {
    if (externalTriggerCount > lastTriggerRef.current) {
      lastTriggerRef.current = externalTriggerCount;
      void openCamera('front');
    }
  }, [externalTriggerCount, openCamera]);

  const validateAndAssignPhoto = useCallback(
    async (slot: CaptureSlot, photo: StoredPhoto) => {
      setValidatingSlot(slot);
      setSlotErrors((prev) => ({ ...prev, [slot]: undefined }));
      setErrorMessage('');

      try {
        const res = await fetch('/api/validate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: photo.dataUrl,
            mimeType: 'image/jpeg',
            expectedProfile: slot,
          }),
        });

        const raw = await res.text();
        let payload: { valid?: boolean; message?: string; error?: string } = {};
        try {
          payload = JSON.parse(raw) as typeof payload;
        } catch {
          throw new Error('Validation server returned an unexpected response.');
        }

        if (!res.ok || payload.error) {
          throw new Error(
            payload.error || 'Could not validate photo. Please try again.',
          );
        }

        if (!payload.valid) {
          const fallbackMsg =
            slot === 'front'
              ? 'Invalid Image. Please upload a clear front-facing photograph.'
              : 'Incorrect Profile. Please upload a genuine side-profile photograph.';
          setSlotErrors((prev) => ({
            ...prev,
            [slot]: payload.message || fallbackMsg,
          }));
          if (slot === 'front') setFrontPhoto(null);
          if (slot === 'side') setSidePhoto(null);
          return;
        }

        if (slot === 'front') {
          setFrontPhoto(photo);
          setActiveSlot('side');
        } else {
          setSidePhoto(photo);
        }
      } catch (err) {
        setSlotErrors((prev) => ({
          ...prev,
          [slot]:
            err instanceof Error
              ? err.message
              : 'Validation temporarily unavailable. Please retry.',
        }));
      } finally {
        setValidatingSlot(null);
      }
    },
    [],
  );

  const runAnalysis = useCallback(
    async (front: StoredPhoto, side: StoredPhoto) => {
      clearMappingTimers();
      stopCameraStream();
      setMode('analyzing');
      setErrorMessage('');
      setPendingResult(null);
      setRevealStage(0);

      const controller = new AbortController();
      const requestTimeout = window.setTimeout(() => controller.abort(), 36000);

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            frontImageBase64: front.dataUrl,
            frontMimeType: 'image/jpeg',
            sideImageBase64: side.dataUrl,
            sideMimeType: 'image/jpeg',
            profile: profile ?? null,
            previousAnalysisSummary: previousAnalysisSummary ?? null,
          }),
        });

        const raw = await response.text();
        let payload: (PSLAnalysisResult & { error?: string }) | null = null;
        try {
          payload = JSON.parse(raw) as PSLAnalysisResult & { error?: string };
        } catch {
          throw new Error(
            'Analysis timed out or returned invalid data. Please tap Retry Analysis.',
          );
        }

        if (!response.ok || payload.error) {
          throw new Error(payload.error || 'Unable to analyze portraits.');
        }

        if (!payload.faceDetected) {
          throw new Error(
            payload.imageQualityWarning ||
              'No clear human face detected across both portraits. Please retake with better lighting.',
          );
        }

        // Fast, smooth real-time progressive facial mapping reveal (~1.6s)
        setPendingResult(payload);
        setRevealStage(1);

        const delays = [240, 500, 760, 1020, 1300, 1600];
        delays.forEach((ms, index) => {
          const t = window.setTimeout(() => {
            const stage = index + 2;
            if (stage <= 6) {
              setRevealStage(stage);
            } else {
              onAnalysisCompleteRef.current(front, side, payload);
            }
          }, ms);
          mappingTimersRef.current.push(t);
        });
      } catch (err) {
        clearMappingTimers();
        const isAbort = err instanceof Error && err.name === 'AbortError';
        setErrorMessage(
          isAbort
            ? 'Analysis took longer than expected. Please tap Retry Analysis.'
            : err instanceof Error
              ? err.message
              : 'Unable to analyze portraits.',
        );
        setMode('error');
      } finally {
        window.clearTimeout(requestTimeout);
      }
    },
    [
      clearMappingTimers,
      previousAnalysisSummary,
      profile,
      stopCameraStream,
    ],
  );

  const captureFrameFromVideo = () => {
    const video = videoRef.current;
    if (!video || validatingSlot) return;

    const rawW = video.videoWidth || 960;
    const rawH = video.videoHeight || 720;
    const scale = Math.min(1, 768 / Math.max(rawW, rawH));
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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    void validateAndAssignPhoto(activeSlot, { dataUrl, width, height });
  };

  const handleFileChange = async (
    slot: CaptureSlot,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setActiveSlot(slot);
    try {
      const compressed = await compressFileToJpeg(file);
      await validateAndAssignPhoto(slot, compressed);
    } catch (err) {
      setSlotErrors((prev) => ({
        ...prev,
        [slot]: err instanceof Error ? err.message : 'Could not read that photo.',
      }));
    }
  };

  const handleReset = () => {
    clearMappingTimers();
    stopCameraStream();
    setFrontPhoto(null);
    setSidePhoto(null);
    setSlotErrors({});
    setCameraNotice('');
    setErrorMessage('');
    setPendingResult(null);
    setRevealStage(0);
    setActiveSlot('front');
    if (isUpdatingSelfie && onCancelUpdate) {
      onCancelUpdate();
      return;
    }
    setMode('idle');
  };

  const bothValidated = Boolean(frontPhoto && sidePhoto && !validatingSlot);
  const activeNativeInputId = activeSlot === 'front' ? frontCameraId : sideCameraId;

  return (
    <section
      id="camera-box"
      className="scroll-mt-24 mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24"
    >
      <div className="relative overflow-hidden rounded-[36px] sm:rounded-[48px] border border-[#0a0a0a]/15 bg-[#e6e6e3] p-5 sm:p-10 md:p-14 shadow-[0_24px_60px_-28px_rgba(10,10,10,0.22)]">
        {/* Isolated inputs for FRONT & SIDE upload/selfie */}
        <input
          id={frontUploadId}
          type="file"
          accept="image/*"
          onChange={(e) => void handleFileChange('front', e)}
          className="sr-only"
        />
        <input
          id={frontCameraId}
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => void handleFileChange('front', e)}
          className="sr-only"
        />
        <input
          id={sideUploadId}
          type="file"
          accept="image/*"
          onChange={(e) => void handleFileChange('side', e)}
          className="sr-only"
        />
        <input
          id={sideCameraId}
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => void handleFileChange('side', e)}
          className="sr-only"
        />

        {/* IDLE STATE */}
        {mode === 'idle' && (
          <div className="flex flex-col items-center justify-center py-6 text-center sm:py-10">
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#0a0a0a]/65 mb-6">
              [OPTICAL SCANNER · FRONT &amp; SIDE PROFILE]
            </p>

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
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-36 w-28 items-center justify-center rounded-[50%] border-2 border-dashed border-[#0a0a0a]/35 bg-[#dadad7]/70">
              <Camera className="h-6 w-6 text-[#0a0a0a]" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <p className="pomelli-display text-3xl sm:text-4xl text-[#0a0a0a]">
                Opening camera
              </p>
              <p className="text-sm text-[#3f3f3c]">
                Allow camera access when prompted, or switch immediately to the dual
                front &amp; side uploader.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={openUploadStage}
                className="tactile-cta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium text-[#f3f3f1]"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Front &amp; Side Photos</span>
              </button>
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

        {/* CAMERA / OVAL CLICKER + DUAL FRONT & SIDE VALIDATED UPLOADER */}
        {mode === 'camera' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-[0.12em] text-[#0a0a0a]/70">
                  {isUpdatingSelfie
                    ? '[UPDATING SELFIE · COMPARE AGAINST PREVIOUS SCAN]'
                    : '[STRICT TWO-ANGLE VALIDATION · FRONT & SIDE PROFILE]'}
                </p>
                <p className="pomelli-display text-2xl sm:text-3xl text-[#0a0a0a] mt-1">
                  {bothValidated
                    ? 'Both profiles validated — ready!'
                    : activeSlot === 'front'
                      ? 'Slot 1: Front Profile'
                      : 'Slot 2: 90° Side Profile'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                aria-label="Close scanner"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#0a0a0a]/20 bg-[#dadad7] px-3.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#cfcfcc] transition-colors"
              >
                <X className="h-4 w-4" />
                <span>{isUpdatingSelfie ? 'Back to Dashboard' : 'Close'}</span>
              </button>
            </div>

            {/* Interactive Oval Viewport + Immediate Action Button right below it */}
            <div className="flex flex-col items-center gap-3.5">
              <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-[28px] border border-[#0a0a0a]/20 bg-[#141414]">
                {liveFeedActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full -scale-x-100 object-cover"
                    />
                    <button
                      type="button"
                      disabled={Boolean(validatingSlot) || bothValidated}
                      onClick={captureFrameFromVideo}
                      aria-label={
                        bothValidated
                          ? 'Both profiles captured'
                          : activeSlot === 'front'
                            ? 'Tap oval to capture front profile'
                            : 'Tap oval to capture side profile'
                      }
                      className="absolute inset-0 flex items-center justify-center cursor-pointer disabled:cursor-default focus:outline-none"
                    >
                      <div
                        className={`relative flex items-center justify-center rounded-[50%] border-2 transition-all ${
                          bothValidated
                            ? 'border-emerald-400'
                            : 'border-white/90 hover:border-white'
                        } shadow-[0_0_0_9999px_rgba(10,10,10,0.38)] ${
                          activeSlot === 'front'
                            ? 'h-[78%] w-[46%] max-w-[230px]'
                            : 'h-[80%] w-[54%] max-w-[260px]'
                        }`}
                      >
                        <span className="rounded-full bg-[#0a0a0a]/65 px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-white">
                          {validatingSlot
                            ? 'VALIDATING...'
                            : bothValidated
                              ? 'BOTH CAPTURED'
                              : activeSlot === 'front'
                                ? 'TAP TO CAPTURE FRONT'
                                : 'TAP FOR 90° SIDE'}
                        </span>
                      </div>
                    </button>
                  </>
                ) : (
                  <label
                    htmlFor={bothValidated ? undefined : activeNativeInputId}
                    className={`flex h-full w-full flex-col items-center justify-center p-4 text-center text-white ${
                      bothValidated ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <div
                      className={`relative flex flex-col items-center justify-center rounded-[50%] border-2 border-dashed px-4 transition-colors ${
                        bothValidated
                          ? 'border-emerald-400/90 bg-emerald-500/10'
                          : 'border-white/75 bg-white/5 hover:bg-white/10'
                      } h-[82%] w-[52%] max-w-[230px]`}
                    >
                      {validatingSlot ? (
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      ) : bothValidated ? (
                        <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                      ) : (
                        <Camera className="h-6 w-6 text-white/90" />
                      )}
                      <span className="mt-2 text-[11px] font-medium tracking-[0.06em] text-white/90">
                        {validatingSlot
                          ? `Checking ${validatingSlot}...`
                          : bothValidated
                            ? 'Front & Side Ready'
                            : activeSlot === 'front'
                              ? 'Tap Oval: Front Selfie'
                              : 'Tap Oval: 90° Side Selfie'}
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {/* Validation error alert right under the oval so user immediately sees why a capture failed */}
              {(slotErrors.front || slotErrors.side) && !bothValidated && (
                <div className="flex max-w-xl items-start gap-2 rounded-2xl border border-red-700/30 bg-red-600/10 px-4 py-2.5 text-xs font-medium text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{slotErrors[activeSlot] || slotErrors.front || slotErrors.side}</span>
                </div>
              )}

              {/* INSTANT REPLACEMENT BUTTON DIRECTLY BELOW OVAL CLICKER */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {bothValidated && frontPhoto && sidePhoto ? (
                  <button
                    type="button"
                    onClick={() => void runAnalysis(frontPhoto, sidePhoto)}
                    className="tactile-cta group inline-flex items-center gap-3 rounded-full py-2.5 pl-4 pr-3 text-sm sm:text-base font-medium text-[#f3f3f1] whitespace-nowrap"
                  >
                    <FaceAvatarsCluster count={2} size="sm" ringColor="ring-[#141414]" />
                    <span>Get ratings</span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[#f3f3f1]">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </button>
                ) : liveFeedActive ? (
                  <button
                    type="button"
                    disabled={Boolean(validatingSlot)}
                    onClick={captureFrameFromVideo}
                    className="tactile-cta inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-[#f3f3f1] disabled:opacity-50"
                  >
                    {validatingSlot ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Validating {validatingSlot}...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        <span>
                          {activeSlot === 'front'
                            ? 'Capture Front Profile'
                            : 'Capture Side Profile'}
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <label
                    htmlFor={activeNativeInputId}
                    className="tactile-cta cursor-pointer inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-[#f3f3f1]"
                  >
                    {validatingSlot ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Validating {validatingSlot}...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        <span>
                          {activeSlot === 'front'
                            ? 'Take Front Selfie'
                            : 'Take Side Selfie'}
                        </span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {!liveFeedActive && cameraNotice && (
                <p className="text-center text-[11px] text-[#3f3f3c]">
                  {cameraNotice}
                </p>
              )}
            </div>

            {/* TWO SIDE-BY-SIDE SLOTS (FRONT PROFILE & SIDE PROFILE — ALWAYS SIDE BY SIDE) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              {/* FRONT PROFILE SLOT */}
              <div
                className={`flex flex-col justify-between rounded-[20px] sm:rounded-[24px] border p-3 sm:p-5 transition-colors ${
                  activeSlot === 'front'
                    ? 'border-[#0a0a0a] bg-[#f1f1ee]'
                    : 'border-[#0a0a0a]/15 bg-[#dadad7]/55'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.1em] text-[#0a0a0a] uppercase">
                      FRONT PROFILE
                    </span>
                    <p className="text-[10px] sm:text-[11px] text-[#3f3f3c]">
                      Eye-level straight gaze
                    </p>
                  </div>
                  {frontPhoto ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-white">
                      <Check className="h-2.5 w-2.5" />
                      <span>OK</span>
                    </span>
                  ) : validatingSlot === 'front' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0a0a0a]" />
                  ) : null}
                </div>

                <div className="my-2.5 flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl border border-[#0a0a0a]/15 bg-[#141414]">
                  {frontPhoto ? (
                    <img
                      src={frontPhoto.dataUrl}
                      alt="Validated front profile"
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <span className="px-2 text-center text-[10px] sm:text-xs text-white/65">
                      Front portrait
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                  <label
                    htmlFor={frontCameraId}
                    onClick={() => setActiveSlot('front')}
                    className="tactile-cta cursor-pointer inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium text-[#f3f3f1] whitespace-nowrap"
                  >
                    <Camera className="h-3 w-3 shrink-0" />
                    <span>{frontPhoto ? 'Retake' : 'Selfie'}</span>
                  </label>
                  <label
                    htmlFor={frontUploadId}
                    onClick={() => setActiveSlot('front')}
                    className="cursor-pointer inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#0a0a0a]/25 bg-white px-3 py-2 text-[11px] font-medium text-[#0a0a0a] hover:bg-[#f5f5f2] whitespace-nowrap"
                  >
                    <Upload className="h-3 w-3 shrink-0" />
                    <span>Upload</span>
                  </label>
                </div>
              </div>

              {/* SIDE PROFILE SLOT */}
              <div
                className={`flex flex-col justify-between rounded-[20px] sm:rounded-[24px] border p-3 sm:p-5 transition-colors ${
                  activeSlot === 'side'
                    ? 'border-[#0a0a0a] bg-[#f1f1ee]'
                    : 'border-[#0a0a0a]/15 bg-[#dadad7]/55'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.1em] text-[#0a0a0a] uppercase">
                      SIDE PROFILE
                    </span>
                    <p className="text-[10px] sm:text-[11px] text-[#3f3f3c]">
                      90° jaw &amp; neck view
                    </p>
                  </div>
                  {sidePhoto ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-white">
                      <Check className="h-2.5 w-2.5" />
                      <span>OK</span>
                    </span>
                  ) : validatingSlot === 'side' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0a0a0a]" />
                  ) : null}
                </div>

                <div className="my-2.5 flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl border border-[#0a0a0a]/15 bg-[#141414]">
                  {sidePhoto ? (
                    <img
                      src={sidePhoto.dataUrl}
                      alt="Validated side profile"
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <span className="px-2 text-center text-[10px] sm:text-xs text-white/65">
                      90° side profile
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                  <label
                    htmlFor={sideCameraId}
                    onClick={() => setActiveSlot('side')}
                    className="tactile-cta cursor-pointer inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium text-[#f3f3f1] whitespace-nowrap"
                  >
                    <Camera className="h-3 w-3 shrink-0" />
                    <span>{sidePhoto ? 'Retake' : 'Selfie'}</span>
                  </label>
                  <label
                    htmlFor={sideUploadId}
                    onClick={() => setActiveSlot('side')}
                    className="cursor-pointer inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#0a0a0a]/25 bg-white px-3 py-2 text-[11px] font-medium text-[#0a0a0a] hover:bg-[#f5f5f2] whitespace-nowrap"
                  >
                    <Upload className="h-3 w-3 shrink-0" />
                    <span>Upload</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Analyze CTA for users scrolling up/down via manual uploads */}
            <div className="flex flex-col items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={!bothValidated}
                onClick={() => {
                  if (frontPhoto && sidePhoto) {
                    void runAnalysis(frontPhoto, sidePhoto);
                  }
                }}
                className="tactile-cta inline-flex items-center gap-2.5 rounded-full px-7 py-3 text-sm font-semibold text-[#f3f3f1] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>
                  {bothValidated
                    ? 'Get ratings'
                    : 'UPLOAD & VALIDATE BOTH PROFILES'}
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              {!liveFeedActive && (
                <button
                  type="button"
                  onClick={() => void openCamera(activeSlot, true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3f3f3c] hover:text-[#0a0a0a] underline underline-offset-4"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Live Camera</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* REAL-TIME PROGRESSIVE FACIAL MAPPING ANIMATION (ALWAYS SIDE-BY-SIDE) */}
        {mode === 'analyzing' && frontPhoto && sidePhoto && (
          <div className="flex flex-col items-center justify-center gap-5 py-4 text-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0a0a0a]/15 bg-[#dadad7] px-3.5 py-1.5 text-xs font-medium text-[#0a0a0a]">
                {revealStage >= 6 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <span>FACIAL MAPPING COMPLETE</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0a0a0a]" />
                    <span>ANALYZING FACIAL GEOMETRY</span>
                  </>
                )}
              </div>

              <h2 className="pomelli-display text-2xl sm:text-4xl text-[#0a0a0a]">
                MAPPING OUT YOUR FACIAL STRUCTURE
              </h2>
            </div>

            {/* Strictly side-by-side (grid-cols-2) on mobile AND desktop */}
            <div className="grid w-full max-w-3xl grid-cols-2 gap-2.5 sm:gap-5 items-start">
              <div className="relative">
                <FrontMeasurementOverlay
                  photo={frontPhoto}
                  landmarks={pendingResult?.frontLandmarks ?? null}
                  showLines={Boolean(pendingResult)}
                  revealStage={revealStage}
                  animateLines
                  darkTheme={false}
                />
                {!pendingResult && (
                  <motion.div
                    aria-hidden="true"
                    initial={{ top: '4%' }}
                    animate={{ top: ['4%', '92%', '4%'] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="pointer-events-none absolute inset-x-2 h-0.5 bg-white shadow-[0_0_12px_2px_rgba(255,255,255,0.9)]"
                  />
                )}
              </div>

              <div className="relative">
                <SideMeasurementOverlay
                  photo={sidePhoto}
                  landmarks={pendingResult?.sideLandmarks ?? null}
                  showLines={Boolean(pendingResult)}
                  revealStage={revealStage}
                  animateLines
                  darkTheme={false}
                />
                {!pendingResult && (
                  <motion.div
                    aria-hidden="true"
                    initial={{ top: '92%' }}
                    animate={{ top: ['92%', '4%', '92%'] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="pointer-events-none absolute inset-x-2 h-0.5 bg-white shadow-[0_0_12px_2px_rgba(255,255,255,0.9)]"
                  />
                )}
              </div>
            </div>

            <div className="w-full max-w-md space-y-2">
              <div className="relative mx-auto h-1.5 w-full overflow-hidden rounded-full bg-[#0a0a0a]/12">
                <motion.div
                  initial={{ width: '16%' }}
                  animate={{
                    width: `${Math.min(100, Math.max(20, revealStage * 16 + 4))}%`,
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="h-full rounded-full bg-[#0a0a0a]"
                />
              </div>

              <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.08em] text-[#3f3f3c]">
                {MAPPING_STAGE_LABELS[revealStage] ?? MAPPING_STAGE_LABELS[0]}
              </p>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {mode === 'error' && (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 py-6 text-center">
            <p className="pomelli-display text-3xl sm:text-4xl text-[#0a0a0a]">
              Scan interrupted
            </p>
            <p className="max-w-md text-sm leading-relaxed text-[#3f3f3c]">
              {errorMessage}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {frontPhoto && sidePhoto && (
                <button
                  type="button"
                  onClick={() => void runAnalysis(frontPhoto, sidePhoto)}
                  className="tactile-cta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-[#f3f3f1] whitespace-nowrap"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retry Analysis</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void openCamera('front', true)}
                className="rounded-full border border-[#0a0a0a]/20 bg-[#dadad7] px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#cfcfcc] whitespace-nowrap"
              >
                Re-upload Photos
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
      </div>
    </section>
  );
}
