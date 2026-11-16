import 'package:flutter/material.dart';
import '../../../models/media_item.dart';
import '../../home/components/movie_card.dart';

class MovieSimilarShelf extends StatelessWidget {
  final List<MovieItem> similarMovies;
  final ValueChanged<MovieItem> onSelectMovie;

  const MovieSimilarShelf({
    super.key,
    required this.similarMovies,
    required this.onSelectMovie,
  });

  @override
  Widget build(BuildContext context) {
    if (similarMovies.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'More Like This',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 195,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: similarMovies.length,
            itemBuilder: (context, idx) {
              final item = similarMovies[idx];
              return Container(
                margin: const EdgeInsets.only(right: 12),
                child: MovieCard(
                  movie: item,
                  onTap: () => onSelectMovie(item),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
