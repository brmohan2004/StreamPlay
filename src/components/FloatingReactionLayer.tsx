import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParty } from '../context/PartyContext';
import './FloatingReactionLayer.css';

export const FloatingReactionLayer: React.FC = () => {
  const { floatingReactions } = useParty();

  return (
    <div className="floating-reaction-container" pointer-events="none">
      <AnimatePresence>
        {floatingReactions.map(item => (
          <motion.div
            key={item.id}
            className="floating-reaction-bubble"
            style={{ left: `${item.x}%` }}
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.3, 1.1, 0.9],
              y: -window.innerHeight * 0.75,
              x: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 60]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.6, ease: 'easeOut' }}
          >
            <span className="reaction-emoji-symbol">{item.emoji}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
