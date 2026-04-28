 
import React from 'react';
import { clsx } from 'clsx';

interface DeviceFrameProps {
  children: React.ReactNode;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  scale?: number;
}

export default function DeviceFrame({ children, deviceType, orientation, scale = 1 }: DeviceFrameProps) {
  const isDesktop = deviceType === 'desktop';
  const isLandscape = orientation === 'landscape';

  // Device dimensions
  let baseW = 375;
  let baseH = 812;

  if (deviceType === 'tablet') {
    baseW = 768;
    baseH = 1024;
  }

  if (isLandscape) {
    [baseW, baseH] = [baseH, baseW];
  }

  // Frame Classes
  const frameClass = clsx(
    "relative transition-all duration-500 ease-in-out shadow-2xl will-change-transform flex-shrink-0",
    isDesktop ? "w-full h-full bg-white rounded-lg border border-gray-800 overflow-hidden" : "bg-black border-[8px] border-[#1a1a1a] ring-1 ring-white/20",
    !isDesktop && {
      "rounded-[3rem]": deviceType === 'mobile',
      "rounded-[2rem]": deviceType === 'tablet',
    }
  );

  const frameStyle: React.CSSProperties = isDesktop ? {} : {
    width: baseW,
    height: baseH,
    transform: `scale(${scale})`,
    transformOrigin: 'center center'
  };

  const containerStyle: React.CSSProperties = isDesktop ? { width: '100%', height: '100%' } : {
    width: baseW * scale,
    height: baseH * scale,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  };

  return (
    <div style={containerStyle} className="device-frame-container">
      <div className={frameClass} style={frameStyle}>
        {/* Desktop Chrome */}
        {isDesktop && (
          <div className="h-8 bg-[#f3f3f3] border-b border-[#d1d1d1] flex items-center px-3 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
            </div>
            <div className="flex-1 mx-4 bg-white h-5 rounded border border-[#d1d1d1] flex items-center justify-center text-[10px] text-gray-500 font-sans">
              Web Preview
            </div>
          </div>
        )}

        {/* Mobile Notch / Dynamic Island */}
        {!isDesktop && deviceType === 'mobile' && (
          <div className={clsx(
              "absolute bg-black z-20 rounded-full flex items-center justify-center pointer-events-none transition-all duration-500",
              !isLandscape ? "top-2 left-1/2 -translate-x-1/2 w-[120px] h-[35px]" : "left-2 top-1/2 -translate-y-1/2 h-[120px] w-[35px]"
          )}>
              <div className="w-16 h-16 bg-black rounded-full absolute -top-8 -left-8 blur-xl opacity-50"></div>
              {/* Camera lens simulation */}
              <div className={clsx("w-2 h-2 rounded-full bg-[#1a1a1a] border border-[#333]", !isLandscape ? "mr-2" : "mb-2")}></div>
          </div>
        )}

        {/* Screen Content Wrapper */}
        <div className={clsx(
            "relative overflow-hidden bg-white z-10",
            isDesktop ? "w-full h-[calc(100%-32px)]" : "w-full h-full rounded-[2.5rem]"
        )}>
          {children}
        </div>

        {/* Mobile/Tablet Hardware Buttons & Indicators */}
        {!isDesktop && (
          <>
              {/* Side Buttons */}
              <div className={clsx("absolute bg-[#2a2a2a] rounded-l-md transition-all", 
                  !isLandscape ? "left-[-10px] top-24 w-[3px] h-8" : "top-[-10px] left-24 h-[3px] w-8"
              )}></div>
              <div className={clsx("absolute bg-[#2a2a2a] rounded-l-md transition-all", 
                  !isLandscape ? "left-[-10px] top-36 w-[3px] h-14" : "top-[-10px] left-36 h-[3px] w-14"
              )}></div>
              <div className={clsx("absolute bg-[#2a2a2a] rounded-r-md transition-all", 
                  !isLandscape ? "right-[-10px] top-28 w-[3px] h-20" : "bottom-[-10px] left-28 h-[3px] w-20"
              )}></div>

              {/* Home Indicator */}
              <div className={clsx(
                  "absolute bg-white/20 rounded-full z-30 pointer-events-none transition-all",
                  !isLandscape ? "bottom-2 left-1/2 -translate-x-1/2 w-32 h-1" : "bottom-2 left-1/2 -translate-x-1/2 w-32 h-1"
              )}></div>
          </>
        )}
      </div>
    </div>
  );
}
