import React from 'react';
import './CurvedTrackDial.css';
import { SongItem } from '../../types/media';

interface CurvedTrackDialProps {
  currentSong: SongItem;
  prevTrack: SongItem | null;
  nextTrack: SongItem | null;
  currentIndex: number;
  totalQueue: number;
  onSelectTrack: (track: SongItem) => void;
}

export const CurvedTrackDial: React.FC<CurvedTrackDialProps> = ({
  currentSong,
  prevTrack,
  nextTrack,
  currentIndex,
  totalQueue,
  onSelectTrack
}) => {
  return (
    <div className="curved-track-dial">
      {prevTrack && (
        <div
          className="dial-item dial-prev"
          onClick={() => onSelectTrack(prevTrack)}
          title={prevTrack.title}
        >
          <span className="dial-num">{String((currentIndex || totalQueue)).padStart(2, '0')}</span>
          <span className="dial-title">{prevTrack.title}</span>
          <span className="dial-artist">{prevTrack.artist}</span>
        </div>
      )}

      <div className="dial-item dial-active">
        <span className="dial-num-active">{String(currentIndex + 1).padStart(2, '0')}</span>
        <h2 className="dial-title-active">{currentSong.title}</h2>
        <p className="dial-artist-active">{currentSong.artist}</p>
      </div>

      {nextTrack && (
        <div
          className="dial-item dial-next"
          onClick={() => onSelectTrack(nextTrack)}
          title={nextTrack.title}
        >
          <span className="dial-num">{String(((currentIndex + 2) % totalQueue) || 1).padStart(2, '0')}</span>
          <span className="dial-title">{nextTrack.title}</span>
          <span className="dial-artist">{nextTrack.artist}</span>
        </div>
      )}
    </div>
  );
};
