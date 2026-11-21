'use client';

import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { FrontLandmarks, Point2D, Proportions } from '@/lib/types';
import { computeRealProportions } from './landmarkGeometry';

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

export interface FrontVisionResult {
  landmarks: FrontLandmarks;
  proportions: Partial<Proportions>;
}

const frontCache = new Map<string, FrontVisionResult | null>();

function sig(dataUrl: string): string {
  return `${dataUrl.length}:${dataUrl.slice(0, 64)}:${dataUrl.slice(-48)}`;
}

async function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks('/mediapipe/wasm');
      return await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: '/mediapipe/face_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        numFaces: 2,
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    })();
  }
  return landmarkerPromise;
}

function toPt(lm: NormalizedLandmark | undefined): Point2D {
  if (!lm) return { x: 0, y: 0 };
  return {
    x: Math.round(Math.min(1000, Math.max(0, lm.x * 1000))),
    y: Math.round(Math.min(1000, Math.max(0, lm.y * 1000))),
  };
}

function avgPts(list: Array<NormalizedLandmark | undefined>): Point2D {
  const valid = list.filter((p): p is NormalizedLandmark => Boolean(p));
  if (valid.length === 0) return { x: 0, y: 0 };
  const sum = valid.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return {
    x: Math.round((sum.x / valid.length) * 1000),
    y: Math.round((sum.y / valid.length) * 1000),
  };
}

function loadHtmlImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decode failed.'));
    img.src = dataUrl;
  });
}

// Ordered MediaPipe Face Oval indices (clockwise)
const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
];

const JAW_CONTOUR_INDICES = [
  234, 132, 58, 172, 136, 150, 149, 176, 152, 377, 400, 378, 379, 365, 397, 288,
  361, 454,
];

const LEFT_BROW_INDICES = [70, 63, 105, 66, 107];
const RIGHT_BROW_INDICES = [336, 296, 334, 293, 300];

export async function detectFrontFaceLandmarks(
  dataUrl: string,
): Promise<FrontVisionResult | null> {
  if (typeof window === 'undefined') return null;

  const key = sig(dataUrl);
  if (frontCache.has(key)) {
    return frontCache.get(key) ?? null;
  }

  try {
    const [detector, img] = await Promise.all([
      getLandmarker(),
      loadHtmlImage(dataUrl),
    ]);

    const res = detector.detect(img);
    const mesh = res.faceLandmarks?.[0];
    if (!mesh || mesh.length < 468) {
      frontCache.set(key, null);
      return null;
    }

    // Ensure it's a roughly front-facing orientation (both outer eye corners horizontally separated)
    const lOut = toPt(mesh[33]);
    const rOut = toPt(mesh[263]);
    const lIn = toPt(mesh[133]);
    const rIn = toPt(mesh[362]);

    const browMid = toPt(mesh[9]);
    const noseBase = toPt(mesh[2]);
    const chinBottom = toPt(mesh[152]);
    const topMesh = toPt(mesh[10]);

    // Estimate trichion/hairline top carefully above forehead mesh edge (#10)
    const middleThird = Math.max(20, noseBase.y - browMid.y);
    const estHairlineY = Math.max(
      18,
      Math.min(topMesh.y, Math.round(browMid.y - middleThird * 0.95)),
    );
    const hairlineTop: Point2D = {
      x: topMesh.x,
      y: estHairlineY,
    };

    const leftPupil =
      mesh.length >= 478
        ? toPt(mesh[468])
        : avgPts([mesh[33], mesh[133], mesh[159], mesh[145]]);
    const rightPupil =
      mesh.length >= 478
        ? toPt(mesh[473])
        : avgPts([mesh[362], mesh[263], mesh[386], mesh[374]]);

    // Cheekbones on actual upper zygomatic arch prominence (#116/#227 left, #345/#447 right)
    const cheekLeft = avgPts([mesh[116], mesh[227]]);
    const cheekRight = avgPts([mesh[345], mesh[447]]);

    const frontLandmarks: FrontLandmarks = {
      hairlineTop,
      browMid,
      noseBridgeTop: toPt(mesh[168]),
      noseTip: toPt(mesh[4]),
      noseBase,
      nostrilLeft: toPt(mesh[129]),
      nostrilRight: toPt(mesh[358]),
      chinBottom,
      leftEyeOuter: lOut,
      leftEyeInner: lIn,
      leftPupil,
      leftUpperLid: toPt(mesh[159]),
      leftLowerLid: toPt(mesh[145]),
      rightPupil,
      rightEyeInner: rIn,
      rightEyeOuter: rOut,
      rightUpperLid: toPt(mesh[386]),
      rightLowerLid: toPt(mesh[374]),
      leftBrow: LEFT_BROW_INDICES.map((idx) => toPt(mesh[idx])),
      rightBrow: RIGHT_BROW_INDICES.map((idx) => toPt(mesh[idx])),
      cheekLeft,
      cheekRight,
      mouthLeft: toPt(mesh[61]),
      mouthRight: toPt(mesh[291]),
      upperLip: toPt(mesh[0]),
      lowerLip: toPt(mesh[17]),
      jawLeft: toPt(mesh[172]),
      jawRight: toPt(mesh[397]),
      chinLeft: toPt(mesh[149]),
      chinRight: toPt(mesh[378]),
      jawContour: JAW_CONTOUR_INDICES.map((idx) => toPt(mesh[idx])),
      faceOutline: FACE_OVAL_INDICES.map((idx, i) =>
        i === 0 ? hairlineTop : toPt(mesh[idx]),
      ),
      confidence: 'High',
    };

    const proportions = computeRealProportions(frontLandmarks);
    const out: FrontVisionResult = { landmarks: frontLandmarks, proportions };
    frontCache.set(key, out);
    return out;
  } catch {
    frontCache.set(key, null);
    return null;
  }
}
