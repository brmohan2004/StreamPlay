import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';

class MovieTheaterBanner extends StatelessWidget {
  const MovieTheaterBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1F1A10),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF5A4418), width: 1),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.bolt, color: AppTheme.theaterAmber, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'IN THEATERS EARLY ACCESS (CAM-HD)',
                  style: TextStyle(
                    color: AppTheme.theaterAmber,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'Cinema audio recorded live. Official 4K Digital Master will automatically update when released by studio.',
                  style: TextStyle(color: AppTheme.textMuted, fontSize: 11, height: 1.3),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
