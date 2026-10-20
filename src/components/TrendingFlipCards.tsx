import React from 'react';
import { MovieItem } from '../types/media';
import { MovieTrendingFannedDeck } from './MovieCardsDesign';

interface TrendingFlipCardsProps {
  movies: MovieItem[];
}

export const TrendingFlipCards: React.FC<TrendingFlipCardsProps> = ({ movies }) => {
  return <MovieTrendingFannedDeck movies={movies} />;
};
