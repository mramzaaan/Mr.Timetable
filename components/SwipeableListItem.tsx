import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SwipeableListItemProps<T> {
  t: any; // Translation object
  item: T;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  renderContent: (item: T) => React.ReactNode;
  isAdmin?: boolean;
}

const KebabIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
);


const SwipeableListItem = <T extends { id: string }>({
  t,
  item,
  onEdit,
  onDelete,
  renderContent,
  isAdmin = true
}: SwipeableListItemProps<T>) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [opensUpward, setOpensUpward] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside the menu dropdown (by checking if the target is in the portal)
      const target = event.target as Element;
      if (target.closest('.action-menu-dropdown')) return;
      
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleScroll = (event: Event) => {
      // Allow scrolling inside the menu itself
      const target = event.target as Element;
      if (target?.closest?.('.action-menu-dropdown')) return;
      setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onEdit(item);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete(item);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Calculate position before opening the menu
    if (!isMenuOpen && menuContainerRef.current) {
        const rect = menuContainerRef.current.getBoundingClientRect();
        // The mobile nav bar is 4rem (64px) high. Menu is ~100px high.
        // If the bottom of the button is within ~170px of the viewport bottom, open upwards.
        const spaceBelow = window.innerHeight - rect.bottom;
        const requiredSpace = 170; // menu height + nav bar height + buffer
        setOpensUpward(spaceBelow < requiredSpace);
    }
    
    setIsMenuOpen(prev => !prev);
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex-1 min-w-0 pr-4">
        {renderContent(item)}
      </div>

      {isAdmin && (
        <div className="relative flex-shrink-0" ref={menuContainerRef}>
          <button
            onClick={handleMenuToggle}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--accent-secondary-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)]"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            aria-label="Actions"
          >
            <KebabIcon />
          </button>

          {isMenuOpen && menuContainerRef.current && createPortal(
            <div 
              className={`action-menu-dropdown fixed w-48 rounded-[1rem] bg-white/80 dark:bg-black/80 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-white/50 dark:border-white/10 ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999] animate-scale-in origin-top-right`}
              style={{
                top: opensUpward ? undefined : menuContainerRef.current.getBoundingClientRect().bottom + 8,
                bottom: opensUpward ? window.innerHeight - menuContainerRef.current.getBoundingClientRect().top + 8 : undefined,
                right: window.innerWidth - menuContainerRef.current.getBoundingClientRect().right,
              }}
            >
              <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                <button
                  onClick={handleEditClick}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] flex items-center gap-3"
                  role="menuitem"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>{t.edit}</span>
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                  role="menuitem"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>{t.delete}</span>
                </button>
              </div>
            </div>, document.body
          )}
        </div>
      )}
    </div>
  );
};

export default SwipeableListItem;