import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../config/constants.dart';

/// Step 3: Languages (Primary & Secondary)
class LandingStepLanguages extends StatelessWidget {
  final String primaryLang;
  final String secondaryLang;
  final ValueChanged<String> onSelectPrimary;
  final ValueChanged<String> onSelectSecondary;

  const LandingStepLanguages({
    super.key,
    required this.primaryLang,
    required this.secondaryLang,
    required this.onSelectPrimary,
    required this.onSelectSecondary,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      key: const ValueKey('step_3'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ShaderMask(
            shaderCallback: (bounds) => AppTheme.brandGradient.createShader(bounds),
            child: const Text(
              'Preferred Content\nLanguages',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                height: 1.25,
              ),
            ),
          ),
          const SizedBox(height: 8),

          const Text(
            'We tune movie recommendations and high-fidelity soundtracks based on your preferences.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 24),

          // Primary Language Section
          const Text(
            'PRIMARY LANGUAGE (Spotlight & Feeds)',
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
            children: AppConstants.availableLanguages.map((lang) {
              final isSel = primaryLang == lang;
              return GestureDetector(
                onTap: () => onSelectPrimary(lang),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSel ? AppTheme.movieCyan : AppTheme.cardDark,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSel ? AppTheme.movieCyan : AppTheme.borderSubtle,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isSel) ...[
                        const Icon(Icons.check, size: 14, color: Colors.black),
                        const SizedBox(width: 4),
                      ],
                      Text(
                        lang,
                        style: TextStyle(
                          color: isSel ? Colors.black : Colors.white,
                          fontSize: 13,
                          fontWeight: isSel ? FontWeight.w800 : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),

          // Secondary Language Section
          const Text(
            'SECONDARY LANGUAGE (Discovery Rows)',
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
            children: AppConstants.availableLanguages.map((lang) {
              final isSel = secondaryLang == lang;
              return GestureDetector(
                onTap: () => onSelectSecondary(lang),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSel ? AppTheme.movieCyan : AppTheme.cardDark,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSel ? AppTheme.movieCyan : AppTheme.borderSubtle,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isSel) ...[
                        const Icon(Icons.check, size: 14, color: Colors.black),
                        const SizedBox(width: 4),
                      ],
                      Text(
                        lang,
                        style: TextStyle(
                          color: isSel ? Colors.black : Colors.white,
                          fontSize: 13,
                          fontWeight: isSel ? FontWeight.w800 : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
