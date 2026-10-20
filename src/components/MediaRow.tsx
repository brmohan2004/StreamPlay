import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieItem } from '../types/media';
import { MediaCard } from './MediaCard';

interface MediaRowProps {
  title: string;
  items: MovieItem[];
  showRank?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export const MediaRow: React.FC<MediaRowProps> = ({ title, items, showRank = false, onLoadMore, isLoadingMore }) => {
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || isLoadingMore) return;
    const el = e.currentTarget;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 280) {
      onLoadMore();
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

      <div className="media-row-scroll" ref={rowRef} onScroll={handleScroll}>
        {items.map((item, index) => (
          <MediaCard key={item.id || index} item={item} rank={showRank ? index + 1 : undefined} />
        ))}
        {isLoadingMore && (
          <div className="row-auto-pitch-loader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 80, height: '100%' }}>
            <div className="stream-glow-spinner" style={{ width: 24, height: 24 }} />
          </div>
        )}
      </div>
    </div>
  );
};
