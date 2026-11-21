'use client';

import { useCallback, useState } from 'react';
import { BottomSection } from '@/components/BottomSection';
import { CurvedCameraBox } from '@/components/CurvedCameraBox';
import { DesignSocietyShowcase } from '@/components/DesignSocietyShowcase';
import { HeroSection } from '@/components/HeroSection';
import { ProtocolPillars } from '@/components/ProtocolPillars';
import { TopNav } from '@/components/TopNav';

export default function HomePage() {
  const [cameraTriggerCount, setCameraTriggerCount] = useState(0);

  const handleGetRatingsClick = useCallback(() => {
    const box = document.getElementById('camera-box');
    if (box) {
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setCameraTriggerCount((c) => c + 1);
  }, []);

  return (
    <div className="relative min-h-screen">
      <TopNav onTriggerScan={handleGetRatingsClick} />

      <main>
        <HeroSection onGetRatingsClick={handleGetRatingsClick} />
        <CurvedCameraBox externalTriggerCount={cameraTriggerCount} />
        <DesignSocietyShowcase />
        <ProtocolPillars />
      </main>

      <BottomSection onGetRatingsClick={handleGetRatingsClick} />
    </div>
  );
}
