import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';

/// Reusable Horizontal List with smooth infinite pagination:
/// When user scrolls horizontally near the end, triggers [onLoadMore] to pitch the next 10 items.
class PaginatedHorizontalList<T> extends StatefulWidget {
  final List<T> items;
  final Widget Function(BuildContext context, T item, int index) itemBuilder;
  final Future<void> Function()? onLoadMore;
  final double height;
  final EdgeInsetsGeometry padding;
  final double itemSpacing;
  final bool hasMore;
  final Color indicatorColor;

  const PaginatedHorizontalList({
    super.key,
    required this.items,
    required this.itemBuilder,
    this.onLoadMore,
    required this.height,
    this.padding = const EdgeInsets.symmetric(horizontal: 16),
    this.itemSpacing = 12.0,
    this.hasMore = true,
    this.indicatorColor = AppTheme.musicLime,
  });

  @override
  State<PaginatedHorizontalList<T>> createState() => _PaginatedHorizontalListState<T>();
}

class _PaginatedHorizontalListState<T> extends State<PaginatedHorizontalList<T>> {
  final ScrollController _scrollController = ScrollController();
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!widget.hasMore || _isLoadingMore || widget.onLoadMore == null) return;
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 180) {
      _loadMore();
    }
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore) return;
    setState(() => _isLoadingMore = true);
    try {
      await widget.onLoadMore!();
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() => _isLoadingMore = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalCount = widget.items.length + (_isLoadingMore ? 1 : 0);

    return SizedBox(
      height: widget.height,
      child: ListView.builder(
        controller: _scrollController,
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: widget.padding,
        itemCount: totalCount,
        itemBuilder: (context, index) {
          if (index < widget.items.length) {
            return Padding(
              padding: EdgeInsets.only(right: widget.itemSpacing),
              child: widget.itemBuilder(context, widget.items[index], index),
            );
          }

          // Subtle loader card at the end of the shelf while pitching next 10 items
          return Container(
            width: 80,
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              color: AppTheme.cardDark.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white10),
            ),
            child: Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: widget.indicatorColor,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
