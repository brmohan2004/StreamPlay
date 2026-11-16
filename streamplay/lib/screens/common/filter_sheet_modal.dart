import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../config/constants.dart';
import '../../providers/navigation_provider.dart';

class FilterSheetModal extends StatelessWidget {
  const FilterSheetModal({super.key});

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.24),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Catalog Filters',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (nav.isFiltered)
                TextButton(
                  onPressed: () {
                    nav.resetFiltersAndGoHome();
                    Navigator.pop(context);
                  },
                  child: const Text('Reset', style: TextStyle(color: AppTheme.movieCyan)),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // OTT Brands Section
          const Text(
            'OTT STREAMING PLATFORMS',
            style: TextStyle(
              color: AppTheme.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: AppConstants.ottPlatforms.map((ott) {
              final isSelected = nav.selectedOTT == ott.name;
              return ChoiceChip(
                label: Text(ott.name),
                selected: isSelected,
                selectedColor: Color(ott.color).withValues(alpha: 0.25),
                backgroundColor: AppTheme.cardDark,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : AppTheme.textMuted,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
                side: BorderSide(
                  color: isSelected ? Color(ott.color) : Colors.transparent,
                  width: 1.5,
                ),
                onSelected: (selected) {
                  nav.setSelectedOTT(selected ? ott.name : 'All');
                  Navigator.pop(context);
                },
              );
            }).toList(),
          ),

          const SizedBox(height: 20),

          // Category Section
          const Text(
            'GENRES & FORMATS',
            style: TextStyle(
              color: AppTheme.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: AppConstants.movieCategories.map((cat) {
              final isSelected = nav.activeCategory == cat;
              return ChoiceChip(
                label: Text(cat),
                selected: isSelected,
                selectedColor: AppTheme.movieCyan.withValues(alpha: 0.25),
                backgroundColor: AppTheme.cardDark,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : AppTheme.textMuted,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
                side: BorderSide(
                  color: isSelected ? AppTheme.movieCyan : Colors.transparent,
                  width: 1.5,
                ),
                onSelected: (selected) {
                  nav.setActiveCategory(selected ? cat : 'All');
                  Navigator.pop(context);
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

