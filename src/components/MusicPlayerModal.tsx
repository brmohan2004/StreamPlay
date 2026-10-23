import './MusicPlayerModal.css';
import React from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useMedia } from '../context/MediaContext';
import { MusicPlayerScreen } from '../screens/MusicPlayerScreen';

export const MusicPlayerModal: React.FC = () => {
  const { currentSong, isMusicPlayerOpen, closeMusicPlayer } = useMedia();

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If user dragged down past 80px or flicked down with velocity > 300px/s
    if (info.offset.y > 80 || info.velocity.y > 300) {
      closeMusicPlayer();
    }
  };

  return (
    <AnimatePresence>
      {isMusicPlayerOpen && currentSong && (
        <>
          {/* Subtle blurred backdrop behind the bottom sheet */}
          <motion.div
            key="music-player-backdrop"
            className="music-player-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeMusicPlayer}
          />

          {/* Swipeable Bottom Sheet Player */}
          <motion.div
            key="music-player-modal"
            className="music-player-modal-overlay"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 280,
              mass: 0.8
            }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.65 }}
            onDragEnd={handleDragEnd}
          >
            {/* Top Sheet Drag Handle Bar */}
            <div
              className="music-sheet-drag-handle-wrap"
              onClick={closeMusicPlayer}
              aria-label="Swipe down or tap to close sheet"
              role="button"
              tabIndex={0}
            >
              <div className="music-sheet-drag-pill" />
            </div>

            <MusicPlayerScreen onClose={closeMusicPlayer} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

