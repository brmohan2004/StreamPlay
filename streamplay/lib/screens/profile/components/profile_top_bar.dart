import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../config/app_svg_icons.dart';

class ProfileTopBar extends StatelessWidget {
  final VoidCallback onBack;
  final VoidCallback onOpenWatchLater;

  const ProfileTopBar({
    super.key,
    required this.onBack,
    required this.onOpenWatchLater,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: onBack,
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: AppSvgIcons.chevronLeft(color: Colors.white, size: 20),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.white12),
                ),
                child: const Text(
                  'Settings & Engine',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          Row(
            children: [
              _buildCircleBtn(Icons.people_alt_outlined, () => _showUserAccountSheet(context)),
              const SizedBox(width: 8),
              _buildCircleBtn(Icons.bookmark_outline_rounded, onOpenWatchLater),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => _showUserAccountSheet(context),
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppTheme.movieCyan, width: 1.5),
                    boxShadow: const [
                      BoxShadow(color: AppTheme.movieCyanGlow, blurRadius: 8),
                    ],
                  ),
                  child: const Icon(Icons.person, color: AppTheme.movieCyan, size: 20),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showUserAccountSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF101622),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.movieCyan, width: 2),
                  boxShadow: const [
                    BoxShadow(color: AppTheme.movieCyanGlow, blurRadius: 16),
                  ],
                ),
                child: const Icon(Icons.person, color: AppTheme.movieCyan, size: 36),
              ),
              const SizedBox(height: 12),
              const Text(
                'StreamPlay VIP Member',
                style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                'Active Subscription: Lifetime Zero-Ad Free Access',
                style: TextStyle(color: AppTheme.musicLime, fontSize: 12.5, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white10),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Column(
                      children: [
                        Icon(Icons.hd, color: AppTheme.movieCyan, size: 22),
                        SizedBox(height: 4),
                        Text('4K HDR Ready', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Column(
                      children: [
                        Icon(Icons.album, color: AppTheme.musicLime, size: 22),
                        SizedBox(height: 4),
                        Text('320k Lossless', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Column(
                      children: [
                        Icon(Icons.shield_outlined, color: AppTheme.goldAccent, size: 22),
                        SizedBox(height: 4),
                        Text('Sync Engine OK', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.movieCyan,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Close', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCircleBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 18, color: Colors.white),
      ),
    );
  }
}
