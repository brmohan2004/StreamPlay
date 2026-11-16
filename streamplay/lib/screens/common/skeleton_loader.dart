import 'package:flutter/material.dart';

/// Shimmering Animation Container for Dynamic Skeleton Loading
class ShimmerContainer extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;
  final ShapeBorder? customShape;

  const ShimmerContainer({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 12,
    this.customShape,
  });

  @override
  State<ShimmerContainer> createState() => _ShimmerContainerState();
}

class _ShimmerContainerState extends State<ShimmerContainer> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: widget.customShape == null ? BorderRadius.circular(widget.borderRadius) : null,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: const [
                Color(0xFF121720),
                Color(0xFF1E2636),
                Color(0xFF121720),
              ],
              stops: [
                (_controller.value - 0.3).clamp(0.0, 1.0),
                _controller.value.clamp(0.0, 1.0),
                (_controller.value + 0.3).clamp(0.0, 1.0),
              ],
            ),
            border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
          ),
        );
      },
    );
  }
}

/// Dynamic Skeleton: Movie Home Page
class MovieHomeSkeleton extends StatelessWidget {
  const MovieHomeSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Top Hero 3D Deck Placeholder
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: ShimmerContainer(
              width: double.infinity,
              height: 320,
              borderRadius: 22,
            ),
          ),
          const SizedBox(height: 18),

          // 2. Shelf 1 Title & Posters
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ShimmerContainer(width: 180, height: 18, borderRadius: 6),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 210,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: 4,
              itemBuilder: (context, index) => Padding(
                padding: const EdgeInsets.only(right: 12),
                child: ShimmerContainer(width: 140, height: 210, borderRadius: 14),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // 3. Shelf 2 Title & Posters
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ShimmerContainer(width: 220, height: 18, borderRadius: 6),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 210,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: 4,
              itemBuilder: (context, index) => Padding(
                padding: const EdgeInsets.only(right: 12),
                child: ShimmerContainer(width: 140, height: 210, borderRadius: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Dynamic Skeleton: Music Home Page
class MusicHomeSkeleton extends StatelessWidget {
  const MusicHomeSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Fanned Deck Placeholder
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            child: ShimmerContainer(
              width: double.infinity,
              height: 260,
              borderRadius: 24,
            ),
          ),
          const SizedBox(height: 20),

          // 2. Top Picks For You Shelf
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ShimmerContainer(width: 160, height: 18, borderRadius: 6),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 165,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: 4,
              itemBuilder: (context, index) => Padding(
                padding: const EdgeInsets.only(right: 12),
                child: ShimmerContainer(width: 145, height: 165, borderRadius: 16),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // 3. Language Top 20 2-Row Grid Shelf
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ShimmerContainer(width: 200, height: 18, borderRadius: 6),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 180,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: 4,
              itemBuilder: (context, index) => Padding(
                padding: const EdgeInsets.only(right: 12),
                child: ShimmerContainer(width: 240, height: 180, borderRadius: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Dynamic Skeleton: Search Page
class SearchSkeleton extends StatelessWidget {
  const SearchSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
      children: [
        // Capsules Bar
        Row(
          children: List.generate(
            4,
            (_) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ShimmerContainer(width: 75, height: 30, borderRadius: 15),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // List Item Tiles
        ...List.generate(
          7,
          (_) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                ShimmerContainer(width: 50, height: 50, borderRadius: 10),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ShimmerContainer(width: 180, height: 14, borderRadius: 4),
                      const SizedBox(height: 6),
                      ShimmerContainer(width: 120, height: 11, borderRadius: 4),
                    ],
                  ),
                ),
                ShimmerContainer(width: 34, height: 34, borderRadius: 17),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Dynamic Skeleton: Movie Details Page
class MovieDetailsSkeleton extends StatelessWidget {
  const MovieDetailsSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 16:9 Backdrop
          ShimmerContainer(width: double.infinity, height: 280, borderRadius: 0),
          const SizedBox(height: 16),

          // Title & badges
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerContainer(width: 240, height: 26, borderRadius: 6),
                const SizedBox(height: 10),
                Row(
                  children: [
                    ShimmerContainer(width: 50, height: 16, borderRadius: 4),
                    const SizedBox(width: 8),
                    ShimmerContainer(width: 70, height: 16, borderRadius: 4),
                    const SizedBox(width: 8),
                    ShimmerContainer(width: 55, height: 16, borderRadius: 4),
                  ],
                ),
                const SizedBox(height: 18),
                // Play Button
                ShimmerContainer(width: double.infinity, height: 52, borderRadius: 26),
                const SizedBox(height: 14),
                // Actions
                Row(
                  children: [
                    Expanded(child: ShimmerContainer(width: double.infinity, height: 44, borderRadius: 14)),
                    const SizedBox(width: 12),
                    Expanded(child: ShimmerContainer(width: double.infinity, height: 44, borderRadius: 14)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Backward compatibility basic wrappers
class SkeletonCard extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const SkeletonCard({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    return ShimmerContainer(width: width, height: height, borderRadius: borderRadius);
  }
}

class SkeletonRow extends StatelessWidget {
  final double itemWidth;
  final double itemHeight;
  final int count;

  const SkeletonRow({
    super.key,
    this.itemWidth = 130,
    this.itemHeight = 190,
    this.count = 5,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: itemHeight,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: count,
        itemBuilder: (context, index) => Padding(
          padding: const EdgeInsets.only(right: 12),
          child: ShimmerContainer(width: itemWidth, height: itemHeight, borderRadius: 12),
        ),
      ),
    );
  }
}

class SkeletonList extends StatelessWidget {
  final int count;

  const SkeletonList({super.key, this.count = 6});

  @override
  Widget build(BuildContext context) {
    return const SearchSkeleton();
  }
}

class SkeletonGrid extends StatelessWidget {
  final int count;

  const SkeletonGrid({super.key, this.count = 6});

  @override
  Widget build(BuildContext context) {
    return const SearchSkeleton();
  }
}
