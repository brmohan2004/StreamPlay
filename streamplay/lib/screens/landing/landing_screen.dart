import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/media_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../services/storage_service.dart';
import 'components/landing_step_mode.dart';
import 'components/landing_step_hub.dart';
import 'components/landing_step_languages.dart';
import 'components/landing_bottom_controls.dart';

class LandingScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const LandingScreen({super.key, required this.onComplete});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  int _currentStep = 1; // 1, 2, or 3
  AppMode _selectedMode = AppMode.movies;
  String _selectedHubId = 'chennai';
  String _primaryLang = 'Tamil';
  String _secondaryLang = 'English';

  void _nextStep() {
    if (_currentStep < 3) {
      setState(() {
        _currentStep++;
      });
    } else {
      _finishOnboarding();
    }
  }

  void _prevStep() {
    if (_currentStep > 1) {
      setState(() {
        _currentStep--;
      });
    }
  }

  void _finishOnboarding() {
    final nav = context.read<NavigationProvider>();
    final media = context.read<MediaProvider>();
    final storage = context.read<StorageService>();

    nav.setAppMode(_selectedMode);
    media.setUserLocation(_selectedHubId);
    media.setPrimaryLanguage(_primaryLang);
    media.setSecondaryLanguage(_secondaryLang);

    storage.setOnboardingCompleted(true);
    widget.onComplete();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.pureBlack,
      body: Stack(
        children: [
          // Background floating poster pattern with dark gradient overlay
          Positioned.fill(
            child: Opacity(
              opacity: 0.16,
              child: Image.asset(
                'assets/onboarding/poster_1.jpg',
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
              ),
            ),
          ),
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Color(0xCC000000),
                    Color(0xF0000000),
                    Color(0xFF000000),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),

          // Main Wizard Content
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                children: [
                  const SizedBox(height: 20),

                  // Wizard Body
                  Expanded(
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 320),
                      child: _buildCurrentStepView(),
                    ),
                  ),

                  // Page Indicator Dots
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(3, (idx) {
                      final isActive = (idx + 1) == _currentStep;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: isActive ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(4),
                          gradient: isActive ? AppTheme.brandGradient : null,
                          color: isActive ? null : Colors.white24,
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 18),

                  // Bottom Controls
                  LandingBottomControls(
                    currentStep: _currentStep,
                    onPrev: _prevStep,
                    onNext: _nextStep,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentStepView() {
    switch (_currentStep) {
      case 1:
        return LandingStepMode(
          selectedMode: _selectedMode,
          onSelectMode: (mode) {
            setState(() {
              _selectedMode = mode;
            });
            Future.delayed(const Duration(milliseconds: 200), _nextStep);
          },
        );
      case 2:
        return LandingStepHub(
          selectedHubId: _selectedHubId,
          onSelectHub: (hub) {
            setState(() {
              _selectedHubId = hub.id;
              _primaryLang = hub.defaultLang;
            });
          },
        );
      case 3:
      default:
        return LandingStepLanguages(
          primaryLang: _primaryLang,
          secondaryLang: _secondaryLang,
          onSelectPrimary: (lang) {
            setState(() {
              _primaryLang = lang;
            });
          },
          onSelectSecondary: (lang) {
            setState(() {
              _secondaryLang = lang;
            });
          },
        );
    }
  }
}
