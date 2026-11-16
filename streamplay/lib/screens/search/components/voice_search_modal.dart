import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../config/app_svg_icons.dart';

class VoiceSearchModal extends StatefulWidget {
  final Color accentColor;
  final String title;
  final String hint;
  final List<String> suggestions;
  final ValueChanged<String> onSelect;

  const VoiceSearchModal({
    super.key,
    required this.accentColor,
    required this.title,
    required this.hint,
    required this.suggestions,
    required this.onSelect,
  });

  @override
  State<VoiceSearchModal> createState() => _VoiceSearchModalState();
}

class _VoiceSearchModalState extends State<VoiceSearchModal>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  final TextEditingController _dictateController = TextEditingController();
  bool _isListening = true;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animController.dispose();
    _dictateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animController,
      builder: (context, child) {
        final animVal = _animController.value;

        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: MediaQuery.of(context).viewInsets.bottom + 28,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Sheet Grabber Handle
              Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 22),

              // Animated Pulsing Mic Avatar
              GestureDetector(
                onTap: () {
                  setState(() {
                    _isListening = !_isListening;
                    if (_isListening) {
                      _animController.repeat(reverse: true);
                    } else {
                      _animController.stop();
                    }
                  });
                },
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Outer Pulsing Glow Ring
                    Container(
                      width: 90 + (animVal * 20),
                      height: 90 + (animVal * 20),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: widget.accentColor.withValues(
                          alpha: _isListening ? 0.12 * (1 - animVal) : 0.05,
                        ),
                        border: Border.all(
                          color: widget.accentColor.withValues(
                            alpha: _isListening ? 0.4 * (1 - animVal) : 0.1,
                          ),
                          width: 1.5,
                        ),
                      ),
                    ),
                    // Inner Core Mic Orb
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: widget.accentColor.withValues(alpha: 0.18),
                        border: Border.all(
                          color: widget.accentColor,
                          width: 2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: widget.accentColor.withValues(alpha: 0.35),
                            blurRadius: 20,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Center(
                        child: AppSvgIcons.mic(
                          color: widget.accentColor,
                          size: 34,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Animated Sound Wave Frequency Bars
              SizedBox(
                height: 28,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: List.generate(9, (idx) {
                    final phase = (idx * 0.22);
                    final barHeight = _isListening
                        ? 6.0 + (math.sin((animVal * 2 * math.pi) + phase).abs() * 20.0)
                        : 6.0;

                    return Container(
                      width: 4,
                      height: barHeight,
                      margin: const EdgeInsets.symmetric(horizontal: 2.5),
                      decoration: BoxDecoration(
                        color: widget.accentColor.withValues(
                          alpha: _isListening ? 0.5 + (barHeight / 56.0) : 0.25,
                        ),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 14),

              // Title & Instruction
              Text(
                _isListening ? widget.title : 'Microphone Paused',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.hint,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF8E9BAE), fontSize: 12.5),
              ),
              const SizedBox(height: 16),

              // Dictation / Speech Input Field
              Container(
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFF141B26),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: widget.accentColor.withValues(alpha: 0.4),
                    width: 1.2,
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _dictateController,
                        style: const TextStyle(color: Colors.white, fontSize: 13.5),
                        cursorColor: widget.accentColor,
                        decoration: InputDecoration(
                          hintText: 'Or type speech phrase here...',
                          hintStyle: TextStyle(
                            color: Colors.white.withValues(alpha: 0.35),
                            fontSize: 13,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                        ),
                        onSubmitted: (val) {
                          if (val.trim().isNotEmpty) {
                            widget.onSelect(val.trim());
                          }
                        },
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        final val = _dictateController.text.trim();
                        if (val.isNotEmpty) {
                          widget.onSelect(val);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: widget.accentColor,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Text(
                          'Search',
                          style: TextStyle(
                            color: Colors.black,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Quick Voice Prompts
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: widget.suggestions.map((sample) {
                  return GestureDetector(
                    onTap: () => widget.onSelect(sample),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 13,
                        vertical: 6.5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF131A26),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppSvgIcons.sparkles(
                            color: widget.accentColor,
                            size: 11,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            sample,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
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
      },
    );
  }
}
