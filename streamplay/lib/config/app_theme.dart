import 'package:flutter/material.dart';

class AppTheme {
  // Pure Black OLED Palette
  static const Color pureBlack = Color(0xFF000000);
  static const Color surfaceDark = Color(0xFF080B12);
  static const Color cardDark = Color(0xFF0D121D);
  static const Color cardLighter = Color(0xFF141A28);
  static const Color glassBackground = Color(0xE6080B12); // ~90% opacity

  // Brand Accent Colors
  static const Color movieCyan = Color(0xFF00B4FF);
  static const Color movieCyanGlow = Color(0x6600B4FF);
  static const Color musicLime = Color(0xFFC0F000);
  static const Color musicLimeGlow = Color(0x66C0F000);
  static const Color hotstarBlue = Color(0xFF0F52BA);
  static const Color goldAccent = Color(0xFFFFB703);
  static const Color theaterAmber = Color(0xFFFF9800);
  static const Color errorRed = Color(0xFFFF4757);

  // Text Colors
  static const Color textWhite = Color(0xFFFFFFFF);
  static const Color textMuted = Color(0xFFA1A1AA);
  static const Color textDim = Color(0xFF71717A);

  // Borders & Dividers
  static const Color borderSubtle = Color(0x1FFFFFFF); // 12% white
  static const Color borderMedium = Color(0x33FFFFFF); // 20% white
  static const Color borderCyan = Color(0x6600B4FF);
  static const Color borderLime = Color(0x66C0F000);

  // Brand Gradient: Cyan to Lime
  static const LinearGradient brandGradient = LinearGradient(
    colors: [movieCyan, musicLime],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  // Mode Ambient Radial Gradients (as shown in Screenshots 5 & 6)
  static const RadialGradient movieAmbientGradient = RadialGradient(
    center: Alignment(0.0, -1.0),
    radius: 1.2,
    colors: [
      Color(0xFF082645),
      Color(0xFF041427),
      Color(0xFF020812),
      Color(0xFF000000),
    ],
    stops: [0.0, 0.35, 0.75, 1.0],
  );

  static const RadialGradient musicAmbientGradient = RadialGradient(
    center: Alignment(0.0, -1.0),
    radius: 1.2,
    colors: [
      Color(0xFF0D1F12),
      Color(0xFF061109),
      Color(0xFF020603),
      Color(0xFF000000),
    ],
    stops: [0.0, 0.35, 0.75, 1.0],
  );

  // Common Border Radii
  static const BorderRadius radiusSm = BorderRadius.all(Radius.circular(8));
  static const BorderRadius radiusMd = BorderRadius.all(Radius.circular(14));
  static const BorderRadius radiusLg = BorderRadius.all(Radius.circular(20));
  static const BorderRadius radiusPill = BorderRadius.all(Radius.circular(999));

  // Dark Theme Data
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: pureBlack,
      primaryColor: movieCyan,
      fontFamily: 'Plus Jakarta Sans',
      canvasColor: surfaceDark,
      colorScheme: const ColorScheme.dark(
        primary: movieCyan,
        secondary: musicLime,
        surface: surfaceDark,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      useMaterial3: true,
    );
  }
}

