import React from 'react';

interface Position {
    x: number;
    y: number;
}

interface PositionSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    item1Label: string;
    item2Label: string;
    item1Pos: Position;
    setItem1Pos: (pos: Position) => void;
    item2Pos: Position;
    setItem2Pos: (pos: Position) => void;
}

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const PositionSettingsModal: React.FC<PositionSettingsModalProps> = ({
    isOpen, onClose, title, item1Label, item2Label, item1Pos, setItem1Pos, item2Pos, setItem2Pos
}) => {
    // Prevent background scroll when open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const renderGrid = (currentPos: Position, setPos: (pos: Position) => void, activeColor: string) => {
        return (
            <div className="grid grid-cols-5 gap-1.5 w-36 mx-auto p-3 bg-[#1a2333] rounded-[2rem] border border-white/10 shadow-inner">
                {Array.from({ length: 5 }).map((_, y) => (
                    Array.from({ length: 5 }).map((_, x) => {
                        const isSelected = currentPos.x === x && currentPos.y === y;
                        return (
                            <button
                                key={`${x}-${y}`}
                                onClick={(e) => { e.stopPropagation(); setPos({x, y}); }}
                                className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center transition-all ${isSelected ? activeColor + ' scale-125 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-600 hover:bg-gray-500 hover:scale-110'}`}
                            />
                        );
                    })
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[150]" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <div className="bg-[#252f44] w-full max-w-sm rounded-[2rem] shadow-2xl flex flex-col border border-white/10 mx-4 overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1a2333]">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10">
                        <XIcon />
                    </button>
                </div>
                
                <div className="p-6 flex flex-row gap-6 justify-center items-center">
                    <div className="flex flex-col items-center gap-3">
                        <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest text-center whitespace-nowrap">{item1Label}</h4>
                        {renderGrid(item1Pos, setItem1Pos, 'bg-emerald-500')}
                    </div>
                    <div className="h-40 w-px bg-white/10 hidden sm:block"></div>
                    <div className="flex flex-col items-center gap-3">
                        <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest text-center whitespace-nowrap">{item2Label}</h4>
                        {renderGrid(item2Pos, setItem2Pos, 'bg-emerald-500')}
                    </div>
                </div>
                
                <div className="p-4 border-t border-white/10 bg-[#1a2333] flex justify-end">
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.25rem] font-medium transition-colors shadow-lg w-full sm:w-auto">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
