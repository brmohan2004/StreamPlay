import './DailyMixFannedDeck.css';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { SongItem } from '../types/media';

interface DailyMixFannedDeckProps {
  songs: (SongItem & { _recReason?: string })[];
  onPlaySong: (song: SongItem, queue: SongItem[]) => void;
}

export const DailyMixFannedDeck: React.FC<DailyMixFannedDeckProps> = ({ songs, onPlaySong }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!songs || songs.length === 0) return null;

  const count = songs.length;
  const currentSong = songs[activeIndex % count];

  const handleNext = () => {
    setActiveIndex(prev => (prev + 1) % count);
  };

  const handlePrev = () => {
    setActiveIndex(prev => (prev - 1 + count) % count);
  };

  const handleSelectCard = (offset: number) => {
    if (offset === 0) {
      onPlaySong(currentSong, songs);
    } else {
      setActiveIndex(prev => (prev + offset + count) % count);
    }
  };

  // 5 slots in the fanned arc: [-2, -1, 0, 1, 2]
  const cardOffsets = [-2, -1, 0, 1, 2];

  // Configuration for each offset slot in the fanned deck
  const getSlotConfig = (offset: number) => {
    switch (offset) {
      case -2:
        return {
          rotate: -21,
          x: -92,
          y: 25,
          scale: 0.84,
          zIndex: 2,
          opacity: 0.68,
          brightness: 0.65
        };
      case -1:
        return {
          rotate: -10.5,
          x: -46,
          y: 11,
          scale: 0.92,
          zIndex: 5,
          opacity: 0.88,
          brightness: 0.82
        };
      case 0:
        return {
          rotate: 0,
          x: 0,
          y: 0,
          scale: 1.0,
          zIndex: 10,
          opacity: 1,
          brightness: 1
        };
      case 1:
        return {
          rotate: 10.5,
          x: 46,
          y: 11,
          scale: 0.92,
          zIndex: 5,
          opacity: 0.88,
          brightness: 0.82
        };
      case 2:
        return {
          rotate: 21,
          x: 92,
          y: 25,
          scale: 0.84,
          zIndex: 2,
          opacity: 0.68,
          brightness: 0.65
        };
      default:
        return {
          rotate: 0,
          x: 0,
          y: 0,
          scale: 1,
          zIndex: 1,
          opacity: 0,
          brightness: 1
        };
    }
  };

  return (
    <div className="fanned-deck-container">
      {/* 3D Viewport with Navigation */}
      <div className="fanned-deck-viewport">
        {/* Navigation Arrows */}
        <button
          className="fanned-nav-btn prev"
          onClick={handlePrev}
          aria-label="Previous card"
          title="Previous mix song"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="fanned-cards-stage">
          {cardOffsets.map(offset => {
            const songIndex = (activeIndex + offset + count * 100) % count;
            const song = songs[songIndex];
            const isCenter = offset === 0;
            const slot = getSlotConfig(offset);

            // Stable key per song allows Framer Motion to smoothly slide cards between positions
            const cardKey = count >= 5 ? (song.id || `song-${songIndex}`) : `${song.id || songIndex}-${offset}`;

            return (
              <motion.div
                key={cardKey}
                layout
                className={`fanned-card-wrapper ${isCenter ? 'is-center' : 'is-side'}`}
                style={{
                  zIndex: slot.zIndex
                }}
                animate={{
                  rotate: slot.rotate,
                  x: slot.x,
                  y: slot.y,
                  scale: slot.scale,
                  opacity: slot.opacity,
                  filter: `brightness(${slot.brightness})`
                }}
                whileHover={
                  isCenter
                    ? { y: -8, scale: 1.03 }
                    : { y: slot.y - 6, scale: slot.scale + 0.03 }
                }
                transition={{
                  type: 'spring',
                  stiffness: 220,
                  damping: 24,
                  mass: 0.85
                }}
                onClick={() => handleSelectCard(offset)}
                drag={isCenter ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.35}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -35) handleNext();
                  else if (info.offset.x > 35) handlePrev();
                }}
              >
                <div className="fanned-card-inner">
                  <img
                    src={song.image}
                    alt={song.title}
                    className="fanned-card-poster"
                    loading="lazy"
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="fanned-card-vignette" />

                  {/* Play Button on the center card */}
                  {isCenter && (
                    <motion.div
                      className="fanned-play-button-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div
                        className="fanned-play-circle"
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={e => {
                          e.stopPropagation();
                          onPlaySong(currentSong, songs);
                        }}
                        title={`Play ${currentSong.title}`}
                      >
                        <Play size={24} fill="#000000" color="#000000" style={{ marginLeft: 3 }} />
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Dimmer layer on cards behind */}
                  {!isCenter && <div className="fanned-card-dimmer" />}
                </div>
              </motion.div>
            );
          })}
        </div>

        <button
          className="fanned-nav-btn next"
          onClick={handleNext}
          aria-label="Next card"
          title="Next mix song"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* No text below the card as requested by user */}
    </div>
  );
};
