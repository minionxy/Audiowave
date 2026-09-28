import React, { useState } from 'react';
import { Wifi, BatteryMedium, Signal, Smartphone, Monitor } from 'lucide-react';

interface AndroidDeviceFrameProps {
  children: React.ReactNode;
  onExitPreview: () => void;
}

export const AndroidDeviceFrame: React.FC<AndroidDeviceFrameProps> = ({
  children,
  onExitPreview,
}) => {
  const [deviceModel, setDeviceModel] = useState<'pixel' | 'galaxy'>('pixel');
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="flex flex-col items-center justify-center py-6 px-2 min-h-screen bg-slate-950/95">
      {/* Device Toolbar Controls */}
      <div className="mb-4 flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-mono shadow-xl z-20">
        <div className="flex items-center gap-2 text-cyan-400">
          <Smartphone className="w-4 h-4" />
          <span className="font-semibold uppercase tracking-wider">Android Device Preview</span>
        </div>

        <span className="text-slate-600">·</span>

        <select
          value={deviceModel}
          onChange={e => setDeviceModel(e.target.value as 'pixel' | 'galaxy')}
          className="bg-slate-950 border border-slate-700 text-slate-300 text-xs font-mono rounded px-2 py-1 outline-none cursor-pointer"
        >
          <option value="pixel">Google Pixel 8 Pro (412×892)</option>
          <option value="galaxy">Samsung Galaxy S24 (390×844)</option>
        </select>

        <span className="text-slate-600">·</span>

        <button
          onClick={onExitPreview}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Exit to Fullscreen</span>
        </button>
      </div>

      {/* Android Device Hardware Shell */}
      <div
        className={`relative bg-slate-950 border-[10px] border-slate-800 rounded-[50px] shadow-2xl shadow-cyan-950/40 ring-1 ring-slate-700 overflow-hidden transition-all duration-300 ${
          deviceModel === 'pixel' ? 'w-[412px] h-[860px]' : 'w-[390px] h-[830px]'
        }`}
      >
        {/* Device Front Camera Punch Hole */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
          <div className="w-3.5 h-3.5 bg-black rounded-full border border-slate-800/80 flex items-center justify-center">
            <div className="w-1 h-1 bg-cyan-950 rounded-full" />
          </div>
        </div>

        {/* Android Native Status Bar */}
        <div className="h-8 bg-slate-950/90 backdrop-blur px-5 flex items-center justify-between text-[11px] font-mono font-medium text-slate-300 select-none z-40 sticky top-0 border-b border-slate-900/60">
          <span>{currentTime}</span>
          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3 text-slate-300" />
            <span className="text-[10px] font-bold">5G</span>
            <Wifi className="w-3 h-3 text-slate-300" />
            <BatteryMedium className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Scrollable Android App Viewport */}
        <div className="h-[calc(100%-52px)] overflow-y-auto overflow-x-hidden select-none bg-slate-950 scrollbar-none">
          {children}
        </div>

        {/* Android Navigation Gesture Indicator Pill */}
        <div className="h-5 bg-slate-950 flex items-center justify-center z-40 relative border-t border-slate-900/60">
          <div className="w-28 h-1 bg-slate-600/80 rounded-full" />
        </div>
      </div>
    </div>
  );
};
