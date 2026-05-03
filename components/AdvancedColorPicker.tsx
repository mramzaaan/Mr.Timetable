
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import a11yPlugin from 'colord/plugins/a11y';
import mixPlugin from 'colord/plugins/mix';
import hwbPlugin from 'colord/plugins/hwb';
import lchPlugin from 'colord/plugins/lch';

extend([namesPlugin, a11yPlugin, mixPlugin, hwbPlugin, lchPlugin]);

export type ColorProperty = 'background' | 'surface' | 'accent' | 'text';

interface AdvancedColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialColor: string;
  onSetColor: (color: string) => void;
  property: ColorProperty;
  surfaceColor?: string; // Needed for text contrast logic
  recentlyUsed: string[];
  onAddRecentlyUsed: (color: string) => void;
}

const AdvancedColorPicker: React.FC<AdvancedColorPickerProps> = ({
  isOpen,
  onClose,
  initialColor,
  onSetColor,
  property,
  surfaceColor = '#ffffff',
  recentlyUsed,
  onAddRecentlyUsed
}) => {
  const [color, setColor] = useState(initialColor);
  const [hue, setHue] = useState(colord(initialColor).hue());
  const [saturation, setSaturation] = useState(colord(initialColor).toHsl().s);
  const [lightness, setLightness] = useState(colord(initialColor).toHsl().l);
  const [alpha, setAlpha] = useState(colord(initialColor).alpha());
  const [emphasis, setEmphasis] = useState(80); // 0-100% emphasis for text

  const wheelRef = useRef<HTMLDivElement>(null);
  const isDraggingHue = useRef(false);
  const isInteracting = useRef(false);
  const isInternalChange = useRef(false);
  const originalColor = useRef(initialColor);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      originalColor.current = initialColor;
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Sync state when initialColor changes only if we are NOT currently interacting
  const lastInitialColor = useRef(initialColor);
  const lastProperty = useRef(property);

  useEffect(() => {
    if (isOpen && !isInteracting.current) {
      if (initialColor === lastInitialColor.current && property === lastProperty.current) {
        return;
      }
      
      const c = colord(initialColor);
      const hex = c.toHex();
      setColor(hex);
      const hsl = c.toHsl();
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
      setAlpha(c.alpha());
      
      lastInitialColor.current = initialColor;
      lastProperty.current = property;
    }
  }, [isOpen, initialColor, property]);

  // Update color when HSL components change
  useEffect(() => {
    if (isOpen && isInteracting.current) {
      const newColor = colord({ h: hue, s: saturation, l: lightness, a: alpha }).toHex();
      if (newColor.toLowerCase() !== color.toLowerCase()) {
        setColor(newColor);
        onSetColor(newColor);
        lastInitialColor.current = newColor;
      }
    }
  }, [hue, saturation, lightness, alpha, isOpen]);

  // Special Text Logic: Emphasis Level
  // This derives the text color from the surface for that "Modern/Swiss" look
  const emphasisColor = useMemo(() => {
    if (property !== 'text') return color;
    const bg = colord(surfaceColor);
    const isDarkBg = bg.isDark();
    // Mix background with black or white based on background luminosity
    const target = isDarkBg ? '#ffffff' : '#000000';
    return bg.mix(target, emphasis / 100).toHex();
  }, [surfaceColor, emphasis, property, color]);

  useEffect(() => {
    if (property === 'text' && isOpen && isInteracting.current) {
       // When in text mode and using the emphasis slider, update the main color
       if (emphasisColor.toLowerCase() !== color.toLowerCase()) {
         setColor(emphasisColor);
         onSetColor(emphasisColor);
       }
    }
  }, [emphasisColor, property, isOpen]);

  // REMOVED: computedTextColor auto-mix logic
  
  const handleHueDrag = (e: MouseEvent | TouchEvent) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    
    // Calculate angle in degrees
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    let deg = angle * (180 / Math.PI);
    
    // Map atan2 coordinate system to hue (red at 12 o'clock)
    // atan2 is 0 at 3 o'clock, 90 at 6, -90 at 12, 180 at 9
    // Hue 0 = 12 o'clock, 90 = 3 o'clock, 180 = 6 o'clock, 270 = 9 o'clock
    let finalHue = deg + 90;
    if (finalHue < 0) finalHue += 360;
    if (finalHue >= 360) finalHue -= 360;
    
    setHue(finalHue);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (isDraggingHue.current) handleHueDrag(e);
    };
    const handleEnd = () => {
      isDraggingHue.current = false;
      isInteracting.current = false;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  const contrast = colord(color).contrast(surfaceColor);
  const isAccessible = contrast >= 4.5;
  const isAAA = contrast >= 7;

  const harmonies = useMemo(() => {
    const c = colord(color);
    return [
      c.rotate(180).toHex(), // Complementary
      c.rotate(30).toHex(),  // Analogous 1
      c.rotate(-30).toHex(), // Analogous 2
      c.rotate(120).toHex(), // Triadic 1
      c.rotate(240).toHex(), // Triadic 2
    ];
  }, [color]);

  const handleEyedropper = async () => {
    if (!('EyeDropper' in window)) {
      alert('Eyedropper is not supported in this browser.');
      return;
    }
    try {
      // @ts-ignore
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const sHsl = colord(result.sRGBHex).toHsl();
      setHue(sHsl.h);
      setSaturation(sHsl.s);
      setLightness(sHsl.l);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white/90 dark:bg-black/80 backdrop-blur-[40px] border border-white/20 dark:border-white/10 rounded-[28px] shadow-2xl p-5 sm:p-8 w-full max-w-lg max-h-[95vh] overflow-y-auto flex flex-col gap-5 sm:gap-6 animate-scale-in scrollbar-hide">
        
        {/* Header */}
        <div className="flex justify-between items-center sticky top-0 bg-transparent z-10 py-1">
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest text-[var(--text-primary)]">
            Color Control <span className="text-[var(--accent-primary)] opacity-50 text-[10px] sm:text-xs ml-2">[{property}]</span>
          </h3>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-black/5 dark:hover:bg-white/10 rounded-full text-[var(--text-secondary)] hover:text-rose-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 sm:gap-8">
          
          {/* Left Column: Visual Selectors */}
          <div className="flex flex-col items-center gap-5 sm:gap-6">
            <div className="text-center">
              <span className="text-[0.625rem] font-black tracking-tighter text-[var(--accent-primary)] uppercase">Radial Hue Selector</span>
            </div>
            {/* Radial Hue Wheel */}
            <div 
              ref={wheelRef}
              className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full cursor-crosshair select-none border-8 border-white/20 dark:border-white/10 shadow-2xl p-2"
              style={{
                background: 'conic-gradient(from 0deg, red, #ff0, lime, cyan, blue, #f0f, red)'
              }}
              onMouseDown={(e) => {
                isDraggingHue.current = true;
                isInteracting.current = true;
                handleHueDrag(e.nativeEvent);
              }}
              onTouchStart={(e) => {
                isDraggingHue.current = true;
                isInteracting.current = true;
                handleHueDrag(e.nativeEvent);
              }}
            >
              <div className="absolute inset-[15%] bg-[var(--bg-secondary)] rounded-full shadow-inner flex flex-col items-center justify-center border border-white/10 group">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent-primary)] text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-glow">NEW</div>
                <div 
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-xl border-4 border-white/50 mb-1 transition-transform duration-200 hover:scale-105"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-[0.65rem] font-black font-mono text-[var(--text-primary)] leading-tight">{color.toUpperCase()}</span>
                <span className="text-[0.5rem] font-bold font-mono opacity-50 uppercase">{property}</span>
              </div>
              {/* Knob */}
              <div 
                className="absolute w-8 h-8 bg-white rounded-full border-4 border-black/20 shadow-2xl pointer-events-none z-20 flex items-center justify-center transition-transform"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) rotate(${hue}deg) translateY(-94px) rotate(${-hue}deg)`
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              </div>
            </div>

            {/* Quick Palette */}
            <div className="w-full">
              <label className="text-[0.625rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest block text-center mb-2">Try These Colors</label>
              <div className="flex flex-wrap justify-center gap-2">
                {['#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#000000', '#ffffff'].map((c) => (
                  <button 
                    key={c}
                    onClick={() => {
                        isInternalChange.current = true;
                        const col = colord(c);
                        const hsl = col.toHsl();
                        setHue(hsl.h);
                        setSaturation(hsl.s);
                        setLightness(hsl.l);
                        setAlpha(col.alpha());
                        setColor(col.toHex());
                        onSetColor(col.toHex());
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${color.toLowerCase() === c.toLowerCase() ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-secondary)]' : 'border-[var(--border-secondary)]'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Numerical Values Display */}
            <div className="flex flex-col items-center gap-1 mt-1 p-2 bg-black/5 rounded-2xl w-full">
                <span className="text-[0.625rem] font-bold text-[var(--text-secondary)] font-mono uppercase tracking-tight">
                    RGBA({Math.round(((colord(color).toRgb().r)))}, {Math.round(((colord(color).toRgb().g)))}, {Math.round(((colord(color).toRgb().b)))}, {colord(color).toRgb().a})
                </span>
            </div>

            {/* Live Preview Weight Selection */}
            <div className="w-full space-y-2">
              <label className="text-[0.625rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest block text-center">Visual Weight Preview</label>
              <div 
                className="p-4 rounded-3xl border border-white/10 flex flex-col gap-3 shadow-inner"
                style={{ backgroundColor: property === 'background' ? color : (property === 'surface' ? initialColor : surfaceColor) }}
              >
                <div 
                  className="rounded-2xl p-3 border border-white/10 flex items-center justify-between shadow-sm"
                  style={{ backgroundColor: property === 'surface' ? color : (property === 'background' ? initialColor : surfaceColor) }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="w-20 h-2 bg-black/10 rounded-full"></div>
                    <div className="w-12 h-1.5 bg-black/5 rounded-full"></div>
                  </div>
                  <button 
                    className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-md"
                    style={{ 
                      backgroundColor: property === 'accent' ? color : initialColor,
                      color: colord(property === 'accent' ? color : initialColor).isDark() ? '#ffffff' : '#000000'
                    }}
                  >
                    Action
                  </button>
                </div>
                <div className="space-y-1">
                    <p 
                      className="text-xs font-bold leading-tight"
                      style={{ color: property === 'text' ? color : initialColor }}
                    >
                      Headline Typography
                    </p>
                    <p 
                      className="text-[10px] opacity-60 leading-tight"
                      style={{ color: property === 'text' ? color : initialColor }}
                    >
                      Supporting descriptive text shown here.
                    </p>
                </div>
              </div>
            </div>

            {/* Contrast Indicator */}
            <div className={`w-full p-3 rounded-2xl flex flex-col items-center justify-center gap-0.5 border transition-colors ${isAccessible ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
              <span className="text-[0.55rem] font-bold uppercase tracking-tighter opacity-70">Contrast Ratio</span>
              <span className="text-lg sm:text-xl font-black">{contrast.toFixed(2)}:1</span>
              <div className="flex gap-1.5 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[0.45rem] sm:text-[0.5rem] font-bold ${isAccessible ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>AA</span>
                <span className={`px-2 py-0.5 rounded-full text-[0.45rem] sm:text-[0.5rem] font-bold ${isAAA ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white opacity-50'}`}>AAA</span>
              </div>
              {!isAccessible && (
                <p className="text-[0.5rem] font-bold uppercase mt-1 animate-pulse text-rose-500 text-center">Inaccessible Typography</p>
              )}
            </div>
          </div>

          {/* Right Column: Controls */}
          <div className="flex flex-col gap-5 sm:gap-6">
            
            {property === 'text' && (
              <div className="space-y-4 p-4 bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 rounded-3xl">
                <div className="flex justify-between items-center">
                  <label className="text-[0.625rem] font-black uppercase tracking-widest text-[var(--accent-primary)]">Modern Emphasis Level</label>
                  <span className="text-xs font-mono font-bold">{emphasis}%</span>
                </div>
                <p className="text-[0.65rem] text-[var(--text-secondary)] leading-snug">
                  Mathematically derives color from the surface for perfect visual harmony.
                </p>
                <input 
                  type="range" min="0" max="100" step="1" 
                  value={emphasis} 
                  onMouseDown={() => isInteracting.current = true}
                  onMouseUp={() => isInteracting.current = false}
                  onChange={(e) => {
                    isInteracting.current = true;
                    setEmphasis(parseInt(e.target.value));
                  }}
                  className="w-full h-2 rounded-full appearance-none bg-black/5 dark:bg-white/10 accent-[var(--accent-primary)]"
                />
                <div className="flex justify-between text-[10px] font-bold opacity-40 uppercase">
                  <span>Ghost</span>
                  <span>High Contrast</span>
                </div>
              </div>
            )}

            {/* Standard HCT-like Sliders */}
            <div className="space-y-3 sm:space-y-4">
                {/* Saturation */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Chroma (Saturation)</label>
                    <span className="text-[0.55rem] sm:text-[0.6rem] font-mono">{Math.round(saturation * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={saturation} 
                    onMouseDown={() => isInteracting.current = true}
                    onMouseUp={() => isInteracting.current = false}
                    onTouchStart={() => isInteracting.current = true}
                    onTouchEnd={() => isInteracting.current = false}
                    onChange={(e) => {
                        isInteracting.current = true;
                        setSaturation(parseFloat(e.target.value));
                    }} 
                    className="w-full h-1.5 sm:h-2 rounded-full appearance-none bg-gray-200 dark:bg-white/10 accent-[var(--accent-primary)]"
                  />
                </div>
                {/* Brightness */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Tone (Brightness)</label>
                    <span className="text-[0.55rem] sm:text-[0.6rem] font-mono">{Math.round(lightness * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={lightness} 
                    onMouseDown={() => isInteracting.current = true}
                    onMouseUp={() => isInteracting.current = false}
                    onTouchStart={() => isInteracting.current = true}
                    onTouchEnd={() => isInteracting.current = false}
                    onChange={(e) => {
                        isInteracting.current = true;
                        setLightness(parseFloat(e.target.value));
                    }} 
                    className="w-full h-1.5 sm:h-2 rounded-full appearance-none bg-gray-200 dark:bg-white/10 accent-[var(--accent-primary)]"
                  />
                </div>
              </div>

            {/* Alpha Control */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between">
                <label className="text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Alpha (Opacity)</label>
                <span className="text-[0.55rem] sm:text-[0.6rem] font-mono">{Math.round(alpha * 100)}%</span>
              </div>
              <div className="relative h-1.5 sm:h-2">
                <div className="absolute inset-0 rounded-full" style={{ backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)`, backgroundSize: '10px 10px', backgroundPosition: '0 0, 5px 5px' }}></div>
                <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(to right, transparent, ${colord(color).alpha(1).toHex()})` }}></div>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={alpha} 
                  onMouseDown={() => isInteracting.current = true}
                  onMouseUp={() => isInteracting.current = false}
                  onTouchStart={() => isInteracting.current = true}
                  onTouchEnd={() => isInteracting.current = false}
                  onChange={(e) => {
                      isInteracting.current = true;
                      setAlpha(parseFloat(e.target.value));
                  }} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Inputs & Eyedropper */}
            <div className="flex gap-2 sm:gap-3">
              <div className="flex-grow relative">
                <input 
                  type="text"
                  value={colord(color).alpha(alpha).toHex().toUpperCase()}
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    if (colord(val).isValid()) {
                      setColor(val);
                      const hsl = colord(val).toHsl();
                      setHue(hsl.h);
                      setSaturation(hsl.s);
                      setLightness(hsl.l);
                      setAlpha(colord(val).alpha());
                    }
                  }}
                  className="w-full h-10 px-3 sm:px-4 bg-white/50 dark:bg-black/20 border border-white/20 rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.5rem] sm:text-[0.6rem] opacity-30 font-black uppercase leading-none">HEX/ARGB</span>
              </div>
              <button 
                onClick={handleEyedropper}
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white/50 dark:bg-black/20 border border-white/20 rounded-xl hover:bg-[var(--accent-primary)] hover:text-white transition-all shadow-sm active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9"/><path d="m13 8 3 3"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Sections */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          {/* Harmonies */}
          <div>
            <label className="text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2 block">Color Harmonies</label>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(harmonies)).map((h, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    const hsl = colord(h).toHsl();
                    setHue(hsl.h);
                    setSaturation(hsl.s);
                    setLightness(hsl.l);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm border border-white/20 hover:scale-110 active:scale-90 transition-all"
                  style={{ backgroundColor: h }}
                ></button>
              ))}
            </div>
          </div>

          {/* Recently Used */}
          {recentlyUsed.length > 0 && (
            <div>
              <label className="text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2 block">Recently Used</label>
              <div className="flex flex-wrap gap-2">
                {recentlyUsed.map((r, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      const hsl = colord(r).toHsl();
                      setHue(hsl.h);
                      setSaturation(hsl.s);
                      setLightness(hsl.l);
                    }}
                    className="w-7 h-7 rounded-full shadow-sm border border-white/10 hover:scale-110 active:scale-90 transition-all"
                    style={{ backgroundColor: r }}
                  ></button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 sm:gap-4 pt-2 sm:pt-4 sticky bottom-0 bg-transparent">
          <button 
            onClick={() => {
              onSetColor(originalColor.current);
              onClose();
            }}
            className="flex-1 py-3 bg-black/5 dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 text-[var(--text-primary)] font-black uppercase tracking-widest text-[0.65rem] sm:text-xs rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onAddRecentlyUsed(color);
              onSetColor(color);
              onClose();
            }}
            className="flex-1 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-black uppercase tracking-widest text-[0.65rem] sm:text-xs rounded-2xl shadow-xl shadow-[var(--accent-primary)]/20 transition-all hover:-translate-y-1 active:translate-y-0"
          >
            Apply Color
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdvancedColorPicker;
