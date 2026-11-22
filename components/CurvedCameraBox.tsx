'use client';

import {
  AlertCircle,
  ArrowUpRight,
  Camera,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { PSLAnalysisResult, StoredPhoto, UserProfile } from '@/lib/types';
import { FaceAvatarsCluster } from './TriadEmblems';

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
  className?: string;
}

function compressFileToJpeg(file: File): Promise<StoredPhoto> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 640;
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
        dataUrl: canvas.toDataURL('image/jpeg', 0.78),
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
  className,
}: CurvedCameraBoxProps) {
  const [mode, setMode] = useState<BoxMode>('idle');
  const [activeSlot, setActiveSlot] = useState<CaptureSlot>('front');
  const [liveFeedActive, setLiveFeedActive] = useState(false);
  const [cameraNotice, setCameraNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [manualUploadOpen, setManualUploadOpen] = useState(false);

  const [frontPhoto, setFrontPhoto] = useState<StoredPhoto | null>(null);
  const [sidePhoto, setSidePhoto] = useState<StoredPhoto | null>(null);
  const [validatingSlot, setValidatingSlot] = useState<CaptureSlot | null>(null);
  const [slotErrors, setSlotErrors] = useState<{ front?: string; side?: string }>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastTriggerRef = useRef<number>(externalTriggerCount);
  const resultCacheRef = useRef<Map<string, PSLAnalysisResult>>(new Map());
  const isAnalyzingRef = useRef(false);

  const frontPhotoRef = useRef<StoredPhoto | null>(null);
  const sidePhotoRef = useRef<StoredPhoto | null>(null);
  frontPhotoRef.current = frontPhoto;
  sidePhotoRef.current = sidePhoto;

  const onAnalysisCompleteRef = useRef(onAnalysisComplete);
  onAnalysisCompleteRef.current = onAnalysisComplete;

  const frontManualUploadId = useId();
  const sideManualUploadId = useId();
  const ovalCameraInputId = useId();

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

  useEffect(() => {
    if (mode !== 'camera' || !liveFeedActive) return;
    const videoEl = videoRef.current;
    const stream = streamRef.current;
    if (!videoEl || !stream) return;
    videoEl.srcObject = stream;
    void videoEl.play().catch(() => {
      // Handled
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
      setErrorMessage('');
      setCameraNotice('');
      if (!preserveExisting) {
        setFrontPhoto(null);
        setSidePhoto(null);
        setSlotErrors({});
      }
      setActiveSlot(slot);
      stopCameraStream();

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraNotice(
          'Live webcam unavailable here. Tap inside the oval to use your device camera.',
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
            ? 'Camera permission blocked. Tap inside the oval to take a selfie.'
            : 'Live webcam unavailable in this frame. Tap inside the oval to take a selfie.';
        setCameraNotice(msg);
        setLiveFeedActive(false);
        setMode('camera');
      }
    },
    [stopCameraStream],
  );

  useEffect(() => {
    if (externalTriggerCount > lastTriggerRef.current) {
      lastTriggerRef.current = externalTriggerCount;
      void openCamera('front');
    }
  }, [externalTriggerCount, openCamera]);

  const runAnalysis = useCallback(
    async (front: StoredPhoto, side: StoredPhoto) => {
      if (isAnalyzingRef.current) return;
      isAnalyzingRef.current = true;

      stopCameraStream();
      setMode('analyzing');
      setErrorMessage('');

      const clientCacheKey = `${front.dataUrl.length}:${front.dataUrl.slice(-48)}|${side.dataUrl.length}:${side.dataUrl.slice(-48)}|${profile?.updatedAt ?? ''}`;
      const cachedResult = resultCacheRef.current.get(clientCacheKey);
      if (cachedResult) {
        isAnalyzingRef.current = false;
        onAnalysisCompleteRef.current(front, side, cachedResult);
        return;
      }

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

        resultCacheRef.current.set(clientCacheKey, payload);
        onAnalysisCompleteRef.current(front, side, payload);
      } catch (err) {
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
        isAnalyzingRef.current = false;
        window.clearTimeout(requestTimeout);
      }
    },
    [previousAnalysisSummary, profile, stopCameraStream],
  );

  const validateAndAssignPhoto = useCallback(
    async (slot: CaptureSlot, photo: StoredPhoto, autoStartIfBothValid = false) => {
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
              : 'Incorrect Profile. Please upload a genuine 90° side-profile photograph.';
          setSlotErrors((prev) => ({
            ...prev,
            [slot]: payload.message || fallbackMsg,
          }));
          if (slot === 'front') setFrontPhoto(null);
          if (slot === 'side') setSidePhoto(null);
          return;
        }

        // Photograph is VALID
        if (slot === 'front') {
          frontPhotoRef.current = photo;
          setFrontPhoto(photo);
          // In camera mode: once front validates, enable side-profile capture
          setActiveSlot('side');

          if (autoStartIfBothValid && sidePhotoRef.current) {
            setValidatingSlot(null);
            void runAnalysis(photo, sidePhotoRef.current);
            return;
          }
        } else {
          sidePhotoRef.current = photo;
          setSidePhoto(photo);

          // As soon as side validates (with front already valid), auto start analysis
          if (autoStartIfBothValid && frontPhotoRef.current) {
            setValidatingSlot(null);
            void runAnalysis(frontPhotoRef.current, photo);
            return;
          }
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
    [runAnalysis],
  );

  const captureFrameFromVideo = () => {
    const video = videoRef.current;
    if (!video || validatingSlot) return;

    const rawW = video.videoWidth || 960;
    const rawH = video.videoHeight || 720;
    const scale = Math.min(1, 640 / Math.max(rawW, rawH));
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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    // In oval camera: user captures front, then captures side
    void validateAndAssignPhoto(activeSlot, { dataUrl, width, height }, false);
  };

  const handleManualUploadFile = async (
    slot: CaptureSlot,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const compressed = await compressFileToJpeg(file);
      // Auto-start analysis when both are valid in manual upload flow
      await validateAndAssignPhoto(slot, compressed, true);
    } catch (err) {
      setSlotErrors((prev) => ({
        ...prev,
        [slot]: err instanceof Error ? err.message : 'Could not read that photo.',
      }));
    }
  };

  const handleOvalCameraFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const compressed = await compressFileToJpeg(file);
      await validateAndAssignPhoto(activeSlot, compressed, false);
    } catch (err) {
      setSlotErrors((prev) => ({
        ...prev,
        [activeSlot]: err instanceof Error ? err.message : 'Could not read that photo.',
      }));
    }
  };

  const handleReset = () => {
    stopCameraStream();
    setFrontPhoto(null);
    setSidePhoto(null);
    setSlotErrors({});
    setCameraNotice('');
    setErrorMessage('');
    setActiveSlot('front');
    if (isUpdatingSelfie && onCancelUpdate) {
      onCancelUpdate();
      return;
    }
    setMode('idle');
  };

  const bothValidated = Boolean(frontPhoto && sidePhoto && !validatingSlot);

  return (
    <section
      id="camera-box"
      className={className || "scroll-mt-24 mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24"}
    >
      <div className="relative overflow-hidden rounded-[36px] sm:rounded-[48px] border border-[#0a0a0a]/15 bg-[#e6e6e3] p-6 sm:p-12 md:p-16 shadow-[0_24px_60px_-28px_rgba(10,10,10,0.22)]">
        {/* Hidden File Inputs */}
        <input
          id={frontManualUploadId}
          type="file"
          accept="image/*"
          onChange={(e) => void handleManualUploadFile('front', e)}
          className="sr-only"
        />
        <input
          id={sideManualUploadId}
          type="file"
          accept="image/*"
          onChange={(e) => void handleManualUploadFile('side', e)}
          className="sr-only"
        />
        <input
          id={ovalCameraInputId}
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => void handleOvalCameraFile(e)}
          className="sr-only"
        />

        {/* 1. IDLE STATE & MANUAL UPLOAD FLOW */}
        {mode === 'idle' && (
          <div className="flex flex-col items-center justify-center py-8 text-center sm:py-12">
            <p className="text-[11px] font-medium tracking-[0.14em] text-[#0a0a0a]/70 mb-6 uppercase">
              [OPTICAL SCANNER · FRONT &amp; SIDE PROFILE]
            </p>

            <div className="pomelli-display select-none text-[clamp(4.25rem,11.5vw,8.5rem)] text-[#0a0a0a]">
              <span className="block">Get</span>
              <span className="block">your</span>
              <span className="block">rating</span>
            </div>

            <div className="mt-10 flex flex-col items-center gap-4 w-full max-w-md">
              <button
                type="button"
                onClick={() => void openCamera('front')}
                className="tactile-cta group inline-flex items-center gap-4 rounded-full py-3 pl-4 pr-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a0a0a]"
              >
                <FaceAvatarsCluster count={2} size="md" ringColor="ring-[#141414]" />
                <span className="text-base sm:text-lg font-medium tracking-tight text-[#f3f3f1] whitespace-nowrap">
                  Get your ratings
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-[#f3f3f1] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-4.5 w-4.5" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => setManualUploadOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-[#0a0a0a]/80 hover:text-[#0a0a0a] underline underline-offset-4 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Or upload front &amp; side selfies</span>
              </button>

              {/* MANUAL UPLOAD FLOW: Two Vertical Stacked [+] Buttons */}
              {manualUploadOpen && (
                <div className="mt-2 flex w-full flex-col gap-3.5 text-left">
                  {/* FRONT PROFILE [+] */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-[#0a0a0a]">
                        Front Profile
                      </span>
                      {validatingSlot === 'front' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0a0a0a]/70">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Validating...</span>
                        </span>
                      ) : frontPhoto ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <Check className="h-4 w-4 stroke-[2.5]" />
                          <span>Validated</span>
                        </span>
                      ) : null}
                    </div>

                    <label
                      htmlFor={frontManualUploadId}
                      className={`cursor-pointer flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
                        frontPhoto
                          ? 'border-emerald-600/50 bg-emerald-500/10 hover:border-emerald-600'
                          : 'border-[#0a0a0a]/20 bg-[#f1f1ee] hover:border-[#0a0a0a]/45'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {frontPhoto ? (
                          <img
                            src={frontPhoto.dataUrl}
                            alt="Front profile"
                            className="h-10 w-10 rounded-xl object-cover shrink-0 border border-emerald-600/30"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#0a0a0a]/35 bg-white text-[#0a0a0a]">
                            {validatingSlot === 'front' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-5 w-5" />
                            )}
                          </span>
                        )}
                        <div className="min-w-0">
                          <span className="block text-xs font-medium text-[#0a0a0a]">
                            {frontPhoto ? 'Front Profile Uploaded' : 'Upload Front Profile'}
                          </span>
                          <span className="block text-[11px] text-[#3f3f3c] truncate">
                            {frontPhoto ? 'Tap [+] to replace' : 'Straight gaze at eye level'}
                          </span>
                        </div>
                      </div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#0a0a0a]/15 bg-white text-[#0a0a0a] shadow-xs">
                        <Plus className="h-4 w-4" />
                      </span>
                    </label>

                    {slotErrors.front && (
                      <p className="text-[11px] font-medium text-red-800 px-1">
                        {slotErrors.front}
                      </p>
                    )}
                  </div>

                  {/* SIDE PROFILE [+] */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-[#0a0a0a]">
                        Side Profile
                      </span>
                      {validatingSlot === 'side' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0a0a0a]/70">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Validating...</span>
                        </span>
                      ) : sidePhoto ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <Check className="h-4 w-4 stroke-[2.5]" />
                          <span>Validated</span>
                        </span>
                      ) : null}
                    </div>

                    <label
                      htmlFor={sideManualUploadId}
                      className={`cursor-pointer flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
                        sidePhoto
                          ? 'border-emerald-600/50 bg-emerald-500/10 hover:border-emerald-600'
                          : 'border-[#0a0a0a]/20 bg-[#f1f1ee] hover:border-[#0a0a0a]/45'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {sidePhoto ? (
                          <img
                            src={sidePhoto.dataUrl}
                            alt="Side profile"
                            className="h-10 w-10 rounded-xl object-cover shrink-0 border border-emerald-600/30"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#0a0a0a]/35 bg-white text-[#0a0a0a]">
                            {validatingSlot === 'side' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-5 w-5" />
                            )}
                          </span>
                        )}
                        <div className="min-w-0">
                          <span className="block text-xs font-medium text-[#0a0a0a]">
                            {sidePhoto ? 'Side Profile Uploaded' : 'Upload Side Profile'}
                          </span>
                          <span className="block text-[11px] text-[#3f3f3c] truncate">
                            {sidePhoto ? 'Tap [+] to replace' : '90° lateral jawline profile'}
                          </span>
                        </div>
                      </div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#0a0a0a]/15 bg-white text-[#0a0a0a] shadow-xs">
                        <Plus className="h-4 w-4" />
                      </span>
                    </label>

                    {slotErrors.side && (
                      <p className="text-[11px] font-medium text-red-800 px-1">
                        {slotErrors.side}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. REQUESTING PERMISSION STATE */}
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
                Allow camera access when prompted, or upload Front &amp; Side below.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setManualUploadOpen(true);
                  setMode('idle');
                }}
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

        {/* 3. OVAL CAMERA CAPTURE FLOW (Redundant bottom boxes removed!) */}
        {mode === 'camera' && (
          <div className="flex flex-col gap-5">
            {/* Camera Header with visible Green Success Ticks for Front and Side */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-[0.12em] text-[#0a0a0a]/70">
                  {isUpdatingSelfie
                    ? '[UPDATING SELFIE · COMPARE AGAINST PREVIOUS SCAN]'
                    : '[STRICT TWO-ANGLE VALIDATION · FRONT & SIDE PROFILE]'}
                </p>

                <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                  {/* Front Profile Label with Green Success Tick */}
                  <div
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                      frontPhoto
                        ? 'border-emerald-700/40 bg-emerald-600/10 text-emerald-900 font-semibold'
                        : activeSlot === 'front'
                          ? 'border-[#0a0a0a] bg-white text-[#0a0a0a] font-medium'
                          : 'border-[#0a0a0a]/15 bg-[#dadad7]/40 text-[#0a0a0a]/60'
                    }`}
                  >
                    <span>Front Profile</span>
                    {validatingSlot === 'front' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0a0a0a]" />
                    ) : frontPhoto ? (
                      <Check className="h-4 w-4 text-emerald-700 stroke-[3]" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#0a0a0a]/30" />
                    )}
                  </div>

                  {/* Side Profile Label with Green Success Tick */}
                  <div
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                      sidePhoto
                        ? 'border-emerald-700/40 bg-emerald-600/10 text-emerald-900 font-semibold'
                        : activeSlot === 'side'
                          ? 'border-[#0a0a0a] bg-white text-[#0a0a0a] font-medium'
                          : 'border-[#0a0a0a]/15 bg-[#dadad7]/40 text-[#0a0a0a]/60'
                    }`}
                  >
                    <span>Side Profile</span>
                    {validatingSlot === 'side' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0a0a0a]" />
                    ) : sidePhoto ? (
                      <Check className="h-4 w-4 text-emerald-700 stroke-[3]" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#0a0a0a]/30" />
                    )}
                  </div>
                </div>
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

            {/* Oval Camera Viewport (Enlarged and Proportionate) */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl sm:max-w-[640px] overflow-hidden rounded-[32px] border border-[#0a0a0a]/20 bg-[#141414] shadow-md">
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
                            ? 'h-[84%] w-[50%] max-w-[270px]'
                            : 'h-[86%] w-[58%] max-w-[300px]'
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
                    htmlFor={bothValidated ? undefined : ovalCameraInputId}
                    className={`flex h-full w-full flex-col items-center justify-center p-4 text-center text-white ${
                      bothValidated ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <div
                      className={`relative flex flex-col items-center justify-center rounded-[50%] border-2 border-dashed px-4 transition-colors ${
                        bothValidated
                          ? 'border-emerald-400/90 bg-emerald-500/10'
                          : 'border-white/75 bg-white/5 hover:bg-white/10'
                      } h-[86%] w-[54%] max-w-[270px]`}
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
                          ? `Validating ${validatingSlot}...`
                          : bothValidated
                            ? 'Front & Side Ready'
                            : activeSlot === 'front'
                              ? 'Tap Oval: Take Front Selfie'
                              : 'Tap Oval: Take 90° Side Selfie'}
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {/* Validation errors */}
              {(slotErrors.front || slotErrors.side) && !bothValidated && (
                <div className="flex max-w-xl items-start gap-2 rounded-2xl border border-red-700/30 bg-red-600/10 px-4 py-2.5 text-xs font-medium text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{slotErrors[activeSlot] || slotErrors.front || slotErrors.side}</span>
                </div>
              )}

              {/* Action button directly below oval clicker */}
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
                    disabled={Boolean(validatingSlot) || (activeSlot === 'side' && !frontPhoto)}
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
                    htmlFor={ovalCameraInputId}
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
          </div>
        )}

        {/* 4. ANALYZING STATE */}
        {mode === 'analyzing' && (
          <div className="flex min-h-[380px] flex-col items-center justify-center gap-6 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#0a0a0a]/20 bg-white/70">
              <Loader2 className="h-8 w-8 animate-spin text-[#0a0a0a]" />
            </div>
            <div className="space-y-2 max-w-md">
              <p className="pomelli-display text-3xl sm:text-4xl text-[#0a0a0a]">
                Analyzing facial geometry
              </p>
              <p className="text-xs sm:text-sm text-[#3f3f3c]">
                Measuring facial thirds, jawline contour, landmark coordinates, and generating your personalized protocol.
              </p>
            </div>
          </div>
        )}

        {/* 5. ERROR STATE */}
        {mode === 'error' && (
          <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 text-red-700">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="max-w-md space-y-1">
              <p className="pomelli-display text-2xl text-[#0a0a0a]">
                Scan interrupted
              </p>
              <p className="text-xs text-[#3f3f3c]">
                {errorMessage || 'Unable to complete scan. Please try again with clear lighting.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#141414] px-5 py-2.5 text-xs font-semibold text-[#f3f3f1]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry from start</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
