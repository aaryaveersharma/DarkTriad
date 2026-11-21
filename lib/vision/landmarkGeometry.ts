import { FrontLandmarks, Point2D, Proportions, SideLandmarks } from '@/lib/types';

export function isValidPoint(pt?: Point2D | null): pt is Point2D {
  return Boolean(
    pt &&
      Number.isFinite(pt.x) &&
      Number.isFinite(pt.y) &&
      pt.x >= 5 &&
      pt.x <= 995 &&
      pt.y >= 5 &&
      pt.y <= 995,
  );
}

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface ValidatedFrontSegments {
  faceOutline: Point2D[];
  eyes: {
    leftOuter: Point2D;
    leftInner: Point2D;
    leftPupil?: Point2D;
    rightInner: Point2D;
    rightOuter: Point2D;
    rightPupil?: Point2D;
    leftUpperLid?: Point2D;
    leftLowerLid?: Point2D;
    rightUpperLid?: Point2D;
    rightLowerLid?: Point2D;
  } | null;
  brows: {
    left: Point2D[];
    right: Point2D[];
    mid?: Point2D;
  } | null;
  nose: {
    bridgeTop?: Point2D;
    tip?: Point2D;
    base: Point2D;
    nostrilL?: Point2D;
    nostrilR?: Point2D;
  } | null;
  facialThirds: {
    hairline: Point2D;
    brow: Point2D;
    noseBase: Point2D;
    chin: Point2D;
  } | null;
  cheekbones: {
    left: Point2D;
    right: Point2D;
  } | null;
  lips: {
    mouthLeft: Point2D;
    mouthRight: Point2D;
    upperLip?: Point2D;
    lowerLip?: Point2D;
  } | null;
  jawline: {
    jawLeft: Point2D;
    jawRight: Point2D;
    chinLeft?: Point2D;
    chinRight?: Point2D;
    chinBottom: Point2D;
    contour: Point2D[];
  } | null;
}

/**
 * Validates anatomical ordering on a front-facing photograph so inaccurate
 * or neck-extending points are never rendered as confident measurements.
 */
export function validateFrontOverlaySegments(
  lm?: FrontLandmarks | null,
): ValidatedFrontSegments {
  if (!lm) {
    return {
      faceOutline: [],
      eyes: null,
      brows: null,
      nose: null,
      facialThirds: null,
      cheekbones: null,
      lips: null,
      jawline: null,
    };
  }

  const lOut = isValidPoint(lm.leftEyeOuter) ? lm.leftEyeOuter : null;
  const rOut = isValidPoint(lm.rightEyeOuter) ? lm.rightEyeOuter : null;
  const lIn = isValidPoint(lm.leftEyeInner) ? lm.leftEyeInner : null;
  const rIn = isValidPoint(lm.rightEyeInner) ? lm.rightEyeInner : null;

  // Eye span must be horizontal-ish and left-to-right ordered
  let eyes: ValidatedFrontSegments['eyes'] = null;
  if (lOut && rOut && rOut.x > lOut.x + 25) {
    const span = rOut.x - lOut.x;
    const verticalTilt = Math.abs(rOut.y - lOut.y);
    if (verticalTilt < span * 0.45) {
      const validInner =
        lIn &&
        rIn &&
        lIn.x > lOut.x &&
        rIn.x > lIn.x &&
        rOut.x > rIn.x;
      eyes = {
        leftOuter: lOut,
        leftInner: validInner ? lIn : { x: lOut.x + span * 0.34, y: lOut.y },
        leftPupil: isValidPoint(lm.leftPupil) ? lm.leftPupil : undefined,
        rightInner: validInner ? rIn : { x: rOut.x - span * 0.34, y: rOut.y },
        rightOuter: rOut,
        rightPupil: isValidPoint(lm.rightPupil) ? lm.rightPupil : undefined,
        leftUpperLid: isValidPoint(lm.leftUpperLid) ? lm.leftUpperLid : undefined,
        leftLowerLid: isValidPoint(lm.leftLowerLid) ? lm.leftLowerLid : undefined,
        rightUpperLid: isValidPoint(lm.rightUpperLid) ? lm.rightUpperLid : undefined,
        rightLowerLid: isValidPoint(lm.rightLowerLid) ? lm.rightLowerLid : undefined,
      };
    }
  }

  const eyeCenterY = eyes
    ? (eyes.leftOuter.y + eyes.rightOuter.y) / 2
    : null;
  const eyeCenterX = eyes
    ? (eyes.leftOuter.x + eyes.rightOuter.x) / 2
    : null;
  const eyeOuterSpan = eyes ? dist(eyes.leftOuter, eyes.rightOuter) : null;

  // Eyebrows: strictly above eye centers
  let brows: ValidatedFrontSegments['brows'] = null;
  const leftBrowPts = (lm.leftBrow ?? []).filter(isValidPoint);
  const rightBrowPts = (lm.rightBrow ?? []).filter(isValidPoint);
  const browMid = isValidPoint(lm.browMid) ? lm.browMid : null;
  if (
    (leftBrowPts.length >= 2 && rightBrowPts.length >= 2) ||
    browMid
  ) {
    const browOk =
      !eyeCenterY ||
      ((!browMid || browMid.y < eyeCenterY) &&
        leftBrowPts.every((p) => p.y <= eyeCenterY + 12) &&
        rightBrowPts.every((p) => p.y <= eyeCenterY + 12));
    if (browOk) {
      brows = {
        left: leftBrowPts,
        right: rightBrowPts,
        mid: browMid ?? undefined,
      };
    }
  }

  // Nose: must sit below eyes and near eye midline
  let nose: ValidatedFrontSegments['nose'] = null;
  if (isValidPoint(lm.noseBase)) {
    const noseOk =
      (!eyeCenterY || lm.noseBase.y > eyeCenterY + 10) &&
      (!eyeCenterX ||
        !eyeOuterSpan ||
        Math.abs(lm.noseBase.x - eyeCenterX) < eyeOuterSpan * 0.45);
    if (noseOk) {
      const bridgeTop =
        isValidPoint(lm.noseBridgeTop) && lm.noseBridgeTop.y < lm.noseBase.y
          ? lm.noseBridgeTop
          : undefined;
      const tip =
        isValidPoint(lm.noseTip) &&
        lm.noseTip.y <= lm.noseBase.y + 8 &&
        (!eyeCenterY || lm.noseTip.y > eyeCenterY)
          ? lm.noseTip
          : undefined;
      const nostrilL =
        isValidPoint(lm.nostrilLeft) &&
        lm.nostrilLeft.x < lm.noseBase.x &&
        Math.abs(lm.nostrilLeft.y - lm.noseBase.y) < 45
          ? lm.nostrilLeft
          : undefined;
      const nostrilR =
        isValidPoint(lm.nostrilRight) &&
        lm.nostrilRight.x > lm.noseBase.x &&
        Math.abs(lm.nostrilRight.y - lm.noseBase.y) < 45
          ? lm.nostrilRight
          : undefined;
      nose = {
        bridgeTop,
        tip,
        base: lm.noseBase,
        nostrilL,
        nostrilR,
      };
    }
  }

  // Chin & Jawline: chin must be strictly below noseBase and bounded by anatomical face height
  let jawline: ValidatedFrontSegments['jawline'] = null;
  const chinBottom = isValidPoint(lm.chinBottom) ? lm.chinBottom : null;
  const jawL = isValidPoint(lm.jawLeft) ? lm.jawLeft : null;
  const jawR = isValidPoint(lm.jawRight) ? lm.jawRight : null;
  if (chinBottom && nose && browMid) {
    const midThirdH = Math.max(20, nose.base.y - browMid.y);
    const lowerThirdH = chinBottom.y - nose.base.y;
    // Prevent facial thirds from extending down into the neck (lower third ~0.65x..1.75x middle third)
    const chinInFaceBounds =
      lowerThirdH > midThirdH * 0.55 && lowerThirdH < midThirdH * 1.85;

    if (
      chinInFaceBounds &&
      jawL &&
      jawR &&
      jawR.x > jawL.x + 25 &&
      jawL.y <= chinBottom.y + 8 &&
      jawR.y <= chinBottom.y + 8 &&
      jawL.y >= (eyeCenterY ?? browMid.y)
    ) {
      const contour = (lm.jawContour ?? []).filter(
        (p) => isValidPoint(p) && p.y <= chinBottom.y + 12,
      );
      jawline = {
        jawLeft: jawL,
        jawRight: jawR,
        chinLeft:
          isValidPoint(lm.chinLeft) && lm.chinLeft.y <= chinBottom.y + 6
            ? lm.chinLeft
            : undefined,
        chinRight:
          isValidPoint(lm.chinRight) && lm.chinRight.y <= chinBottom.y + 6
            ? lm.chinRight
            : undefined,
        chinBottom,
        contour,
      };
    }
  }

  // Facial Thirds (Hairline -> Brow -> Nose -> Chin)
  let facialThirds: ValidatedFrontSegments['facialThirds'] = null;
  if (
    isValidPoint(lm.hairlineTop) &&
    browMid &&
    nose &&
    jawline &&
    lm.hairlineTop.y < browMid.y &&
    browMid.y < nose.base.y &&
    nose.base.y < jawline.chinBottom.y
  ) {
    const upperH = browMid.y - lm.hairlineTop.y;
    const midH = nose.base.y - browMid.y;
    if (upperH > midH * 0.45 && upperH < midH * 1.95) {
      facialThirds = {
        hairline: lm.hairlineTop,
        brow: browMid,
        noseBase: nose.base,
        chin: jawline.chinBottom,
      };
    }
  }

  // Cheekbones: must sit on upper zygomatic region (above noseBase, below eye level)
  let cheekbones: ValidatedFrontSegments['cheekbones'] = null;
  if (
    isValidPoint(lm.cheekLeft) &&
    isValidPoint(lm.cheekRight) &&
    lm.cheekRight.x > lm.cheekLeft.x + 30 &&
    eyeCenterY &&
    nose
  ) {
    const avgCheekY = (lm.cheekLeft.y + lm.cheekRight.y) / 2;
    if (avgCheekY >= eyeCenterY - 8 && avgCheekY <= nose.base.y + 12) {
      cheekbones = {
        left: lm.cheekLeft,
        right: lm.cheekRight,
      };
    }
  }

  // Lips: must sit strictly between noseBase and chinBottom
  let lips: ValidatedFrontSegments['lips'] = null;
  if (
    isValidPoint(lm.mouthLeft) &&
    isValidPoint(lm.mouthRight) &&
    lm.mouthRight.x > lm.mouthLeft.x + 12 &&
    nose &&
    jawline
  ) {
    const avgMouthY = (lm.mouthLeft.y + lm.mouthRight.y) / 2;
    if (avgMouthY > nose.base.y + 3 && avgMouthY < jawline.chinBottom.y - 6) {
      lips = {
        mouthLeft: lm.mouthLeft,
        mouthRight: lm.mouthRight,
        upperLip:
          isValidPoint(lm.upperLip) && lm.upperLip.y > nose.base.y
            ? lm.upperLip
            : undefined,
        lowerLip:
          isValidPoint(lm.lowerLip) &&
          lm.lowerLip.y < jawline.chinBottom.y
            ? lm.lowerLip
            : undefined,
      };
    }
  }

  // Face Outline: keep points inside head bounds (never dropping into neck)
  const maxOutlineY = jawline ? jawline.chinBottom.y + 14 : 960;
  const faceOutline = (lm.faceOutline ?? []).filter(
    (p) => isValidPoint(p) && p.y <= maxOutlineY,
  );

  return {
    faceOutline,
    eyes,
    brows,
    nose,
    facialThirds,
    cheekbones,
    lips,
    jawline,
  };
}

export interface ValidatedSideSegments {
  profileOutline: Point2D[];
  foreheadProjection: { foreheadTop: Point2D; nasion: Point2D } | null;
  nasalBridge: { nasion: Point2D; noseTip: Point2D } | null;
  nasalProjection: { subnasale: Point2D; noseTip: Point2D } | null;
  lipProjection: {
    subnasale: Point2D;
    upperLip?: Point2D;
    lowerLip?: Point2D;
    chinTip: Point2D;
  } | null;
  jawAndRamus: {
    earTragus: Point2D;
    gonialCorner: Point2D;
    chinTip: Point2D;
  } | null;
  chinToNeck: {
    chinTip: Point2D;
    gonialCorner: Point2D;
    neckBase: Point2D;
  } | null;
}

export function validateSideOverlaySegments(
  lm?: SideLandmarks | null,
): ValidatedSideSegments {
  if (!lm) {
    return {
      profileOutline: [],
      foreheadProjection: null,
      nasalBridge: null,
      nasalProjection: null,
      lipProjection: null,
      jawAndRamus: null,
      chinToNeck: null,
    };
  }

  const foreheadTop = isValidPoint(lm.foreheadTop) ? lm.foreheadTop : null;
  const nasion = isValidPoint(lm.nasion) ? lm.nasion : null;
  const noseTip = isValidPoint(lm.noseTip) ? lm.noseTip : null;
  const subnasale = isValidPoint(lm.subnasale) ? lm.subnasale : null;
  const upperLip = isValidPoint(lm.upperLip) ? lm.upperLip : null;
  const lowerLip = isValidPoint(lm.lowerLip) ? lm.lowerLip : null;
  const chinTip = isValidPoint(lm.chinTip) ? lm.chinTip : null;
  const ear = isValidPoint(lm.earTragus) ? lm.earTragus : null;
  const gonial = isValidPoint(lm.gonialCorner) ? lm.gonialCorner : null;
  const neck = isValidPoint(lm.neckBase) ? lm.neckBase : null;

  // Determine facing direction if possible (facingRight: noseTip.x > ear.x)
  const facingRight =
    noseTip && ear ? noseTip.x > ear.x : noseTip && nasion ? noseTip.x >= nasion.x : null;

  const sameFacing = (anterior: Point2D, posterior: Point2D): boolean => {
    if (facingRight === null) return true;
    return facingRight ? anterior.x > posterior.x - 10 : anterior.x < posterior.x + 10;
  };

  const foreheadProjection =
    foreheadTop && nasion && foreheadTop.y < nasion.y
      ? { foreheadTop, nasion }
      : null;

  const nasalBridge =
    nasion &&
    noseTip &&
    noseTip.y > nasion.y &&
    sameFacing(noseTip, nasion)
      ? { nasion, noseTip }
      : null;

  const nasalProjection =
    subnasale &&
    noseTip &&
    subnasale.y >= noseTip.y - 12 &&
    sameFacing(noseTip, subnasale)
      ? { subnasale, noseTip }
      : null;

  const lipProjection =
    subnasale &&
    chinTip &&
    chinTip.y > subnasale.y + 15 &&
    (!nasion || chinTip.y - subnasale.y < (subnasale.y - nasion.y) * 2.3)
      ? {
          subnasale,
          upperLip:
            upperLip && upperLip.y > subnasale.y && upperLip.y < chinTip.y
              ? upperLip
              : undefined,
          lowerLip:
            lowerLip && lowerLip.y > subnasale.y && lowerLip.y < chinTip.y
              ? lowerLip
              : undefined,
          chinTip,
        }
      : null;

  const jawAndRamus =
    ear &&
    gonial &&
    chinTip &&
    gonial.y > ear.y &&
    sameFacing(chinTip, ear) &&
    sameFacing(chinTip, gonial)
      ? { earTragus: ear, gonialCorner: gonial, chinTip }
      : null;

  const chinToNeck =
    jawAndRamus && neck && neck.y > chinTip!.y - 5
      ? { chinTip: chinTip!, gonialCorner: gonial!, neckBase: neck }
      : null;

  const profileOutline = (lm.profileOutline ?? []).filter(isValidPoint);

  return {
    profileOutline,
    foreheadProjection,
    nasalBridge,
    nasalProjection,
    lipProjection,
    jawAndRamus,
    chinToNeck,
  };
}

export function computeRealProportions(lm: FrontLandmarks): Partial<Proportions> {
  const upperH = Math.max(1, lm.browMid.y - lm.hairlineTop.y);
  const middleH = Math.max(1, lm.noseBase.y - lm.browMid.y);
  const lowerH = Math.max(1, lm.chinBottom.y - lm.noseBase.y);
  const totalH = upperH + middleH + lowerH;

  const upperThirdPct = Math.round((upperH / totalH) * 100);
  const middleThirdPct = Math.round((middleH / totalH) * 100);
  const lowerThirdPct = Math.max(1, 100 - upperThirdPct - middleThirdPct);

  const eyeWidth =
    (dist(lm.leftEyeOuter, lm.leftEyeInner) +
      dist(lm.rightEyeInner, lm.rightEyeOuter)) /
    2;
  const intercanthal = dist(lm.leftEyeInner, lm.rightEyeInner);
  const bizygomatic = dist(lm.cheekLeft, lm.cheekRight);
  const mouthW = dist(lm.mouthLeft, lm.mouthRight);
  const alarW =
    lm.nostrilLeft && lm.nostrilRight
      ? dist(lm.nostrilLeft, lm.nostrilRight)
      : eyeWidth * 1.1;

  const eyeSpanRatio =
    bizygomatic > 10
      ? (dist(lm.leftEyeOuter, lm.rightEyeOuter) / bizygomatic).toFixed(2)
      : null;
  const intercanthalRatio =
    eyeWidth > 5 ? (intercanthal / eyeWidth).toFixed(2) : null;

  const lipToNose = alarW > 5 ? (mouthW / alarW).toFixed(2) : null;
  const upperLipY = lm.upperLip?.y ?? (lm.noseBase.y + lm.mouthLeft.y) / 2;
  const upperFaceH = Math.max(10, upperLipY - lm.browMid.y);
  const fwhr = bizygomatic > 10 ? (bizygomatic / upperFaceH).toFixed(2) : null;

  return {
    upperThirdPct,
    middleThirdPct,
    lowerThirdPct,
    ...(eyeSpanRatio && intercanthalRatio
      ? {
          eyeToFaceRatio: `${eyeSpanRatio} outer-eye/bizygomatic · ${intercanthalRatio}x intercanthal`,
        }
      : {}),
    ...(lipToNose ? { lipToNoseRatio: `${lipToNose}:1 mouth-to-nose width` } : {}),
    ...(fwhr ? { facialWidthToHeightEstimate: `~${fwhr} fWHR` } : {}),
  };
}
