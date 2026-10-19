import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieItem } from '../types/media';
import { MediaCard } from './MediaCard';

interface MediaRowProps {
  title: string;
  items: MovieItem[];
  showRank?: boolean;
}

export const MediaRow: React.FC<MediaRowProps> = ({ title, items, showRank = false }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="media-row-container">
      <div className="row-header">
        <h2 className="row-title">{title}</h2>

        <div className="row-controls">
          <button className="row-arrow-btn" onClick={() => scroll('left')} aria-label="Scroll left">
            <ChevronLeft size={20} />
          </button>
          <button className="row-arrow-btn" onClick={() => scroll('right')} aria-label="Scroll right">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="media-row-scroll" ref={rowRef}>
        {items.map((item, index) => (
          <MediaCard key={item.id || index} item={item} rank={showRank ? index + 1 : undefined} />
        ))}
      </div>
    </div>
  );
};
