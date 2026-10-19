import './MusicPlayerModal.css';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMedia } from '../context/MediaContext';
import { MusicPlayerScreen } from '../screens/MusicPlayerScreen';

export const MusicPlayerModal: React.FC = () => {
  const { currentSong, isMusicPlayerOpen, closeMusicPlayer } = useMedia();

  return (
    <AnimatePresence>
      {isMusicPlayerOpen && currentSong && (
        <motion.div
          key="music-player-modal"
          className="music-player-modal-overlay"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        >
          <MusicPlayerScreen onClose={closeMusicPlayer} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

