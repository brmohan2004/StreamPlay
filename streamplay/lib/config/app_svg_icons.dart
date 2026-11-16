import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Centralized repository of all custom SVG icons used across StreamPlay.
/// Contains clean, optimized SVG vector markup matching the StreamPlay design language.
class AppSvgIcons {
  // 1. Navigation & Mode Icons
  static const String homeSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</svg>
''';

  static const String searchSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"/>
  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
</svg>
''';

  static const String moviesFilmSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
  <line x1="7" y1="2" x2="7" y2="22"/>
  <line x1="17" y1="2" x2="17" y2="22"/>
  <line x1="2" y1="12" x2="22" y2="12"/>
  <line x1="2" y1="7" x2="7" y2="7"/>
  <line x1="2" y1="17" x2="7" y2="17"/>
  <line x1="17" y1="17" x2="22" y2="17"/>
  <line x1="17" y1="7" x2="22" y2="7"/>
</svg>
''';

  static const String musicNoteSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 18V5l12-2v13"/>
  <circle cx="6" cy="18" r="3"/>
  <circle cx="18" cy="16" r="3"/>
</svg>
''';

  // 2. Header & Action Icons
  static const String profileSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</svg>
''';

  static const String communitySvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
  <circle cx="9" cy="7" r="4"/>
  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
</svg>
''';

  static const String bookmarkSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
</svg>
''';

  static const String bookmarkFilledSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
</svg>
''';

  static const String playlistSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="8" y1="6" x2="21" y2="6"/>
  <line x1="8" y1="12" x2="21" y2="12"/>
  <line x1="8" y1="18" x2="16" y2="18"/>
  <line x1="3" y1="6" x2="3.01" y2="6"/>
  <line x1="3" y1="12" x2="3.01" y2="12"/>
  <line x1="3" y1="18" x2="3.01" y2="18"/>
</svg>
''';

  static const String playlistAddSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="11" y1="12" x2="19" y2="12"/>
  <line x1="15" y1="8" x2="15" y2="16"/>
  <path d="M4 6h16M4 12h4M4 18h11"/>
</svg>
''';

  // 3. Player Control Icons
  static const String playSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
  <polygon points="5 3 19 12 5 21 5 3"/>
</svg>
''';

  static const String pauseSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
  <rect x="6" y="4" width="4" height="16" rx="1"/>
  <rect x="14" y="4" width="4" height="16" rx="1"/>
</svg>
''';

  static const String skipNextSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
  <polygon points="5 4 15 12 5 20 5 4"/>
  <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
</svg>
''';

  static const String skipPrevSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
  <polygon points="19 20 9 12 19 4 19 20"/>
  <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
</svg>
''';

  static const String shuffleSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 3 21 3 21 8"/>
  <line x1="4" y1="20" x2="21" y2="3"/>
  <polyline points="21 16 21 21 16 21"/>
  <line x1="15" y1="15" x2="21" y2="21"/>
  <line x1="4" y1="4" x2="9" y2="9"/>
</svg>
''';

  static const String repeatSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="17 1 21 5 17 9"/>
  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
  <polyline points="7 23 3 19 7 15"/>
  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
</svg>
''';

  static const String heartOutlineSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
</svg>
''';

  static const String heartFilledSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
</svg>
''';

  // 4. Utility, Filter & Search Icons
  static const String filterSlidersSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="4" y1="21" x2="4" y2="14"/>
  <line x1="4" y1="10" x2="4" y2="3"/>
  <line x1="12" y1="21" x2="12" y2="12"/>
  <line x1="12" y1="8" x2="12" y2="3"/>
  <line x1="20" y1="21" x2="20" y2="16"/>
  <line x1="20" y1="12" x2="20" y2="3"/>
  <line x1="1" y1="14" x2="7" y2="14"/>
  <line x1="9" y1="8" x2="15" y2="8"/>
  <line x1="17" y1="16" x2="23" y2="16"/>
</svg>
''';

  static const String micSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
  <line x1="12" y1="19" x2="12" y2="23"/>
  <line x1="8" y1="23" x2="16" y2="23"/>
</svg>
''';

  static const String micOffSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="1" y1="1" x2="23" y2="23"/>
  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
  <line x1="12" y1="19" x2="12" y2="23"/>
  <line x1="8" y1="23" x2="16" y2="23"/>
</svg>
''';

  static const String closeSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"/>
  <line x1="6" y1="6" x2="18" y2="18"/>
</svg>
''';

  static const String flameSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
</svg>
''';

  static const String sparklesSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
</svg>
''';

  static const String historySvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <polyline points="12 6 12 12 16 14"/>
</svg>
''';

  static const String chevronDownSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="6 9 12 15 18 9"/>
</svg>
''';

  static const String chevronUpSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="18 15 12 9 6 15"/>
</svg>
''';

  static const String chevronLeftSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="15 18 9 12 15 6"/>
</svg>
''';

  static const String rotateCcwSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
  <path d="M3 3v5h5"/>
</svg>
''';

  static const String starFilledSvg = '''
<svg width="24" height="24" viewBox="0 0 24 24" fill="#FFB800" stroke="none">
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
</svg>
''';

  // Convenience Icon Widget Builders
  static Widget icon(String svgMarkup, {Color? color, double size = 22}) {
    return SvgPicture.string(
      svgMarkup,
      width: size,
      height: size,
      colorFilter: color != null ? ColorFilter.mode(color, BlendMode.srcIn) : null,
    );
  }

  static Widget home({Color? color, double size = 22}) => icon(homeSvg, color: color, size: size);
  static Widget search({Color? color, double size = 22}) => icon(searchSvg, color: color, size: size);
  static Widget movies({Color? color, double size = 22}) => icon(moviesFilmSvg, color: color, size: size);
  static Widget music({Color? color, double size = 22}) => icon(musicNoteSvg, color: color, size: size);
  static Widget profile({Color? color, double size = 22}) => icon(profileSvg, color: color, size: size);
  static Widget community({Color? color, double size = 22}) => icon(communitySvg, color: color, size: size);
  static Widget bookmark({Color? color, double size = 22, bool filled = false}) =>
      icon(filled ? bookmarkFilledSvg : bookmarkSvg, color: color, size: size);
  static Widget playlist({Color? color, double size = 22}) => icon(playlistSvg, color: color, size: size);
  static Widget playlistAdd({Color? color, double size = 22}) => icon(playlistAddSvg, color: color, size: size);
  static Widget play({Color? color, double size = 22}) => icon(playSvg, color: color, size: size);
  static Widget pause({Color? color, double size = 22}) => icon(pauseSvg, color: color, size: size);
  static Widget skipNext({Color? color, double size = 22}) => icon(skipNextSvg, color: color, size: size);
  static Widget skipPrev({Color? color, double size = 22}) => icon(skipPrevSvg, color: color, size: size);
  static Widget shuffle({Color? color, double size = 22}) => icon(shuffleSvg, color: color, size: size);
  static Widget repeat({Color? color, double size = 22}) => icon(repeatSvg, color: color, size: size);
  static Widget heart({Color? color, double size = 22, bool filled = false}) =>
      icon(filled ? heartFilledSvg : heartOutlineSvg, color: color, size: size);
  static Widget filter({Color? color, double size = 22}) => icon(filterSlidersSvg, color: color, size: size);
  static Widget mic({Color? color, double size = 22, bool isMuted = false}) =>
      icon(isMuted ? micOffSvg : micSvg, color: color, size: size);
  static Widget close({Color? color, double size = 22}) => icon(closeSvg, color: color, size: size);
  static Widget flame({Color? color, double size = 22}) => icon(flameSvg, color: color, size: size);
  static Widget sparkles({Color? color, double size = 22}) => icon(sparklesSvg, color: color, size: size);
  static Widget history({Color? color, double size = 22}) => icon(historySvg, color: color, size: size);
  static Widget chevronDown({Color? color, double size = 22}) => icon(chevronDownSvg, color: color, size: size);
  static Widget chevronUp({Color? color, double size = 22}) => icon(chevronUpSvg, color: color, size: size);
  static Widget chevronLeft({Color? color, double size = 22}) => icon(chevronLeftSvg, color: color, size: size);
  static Widget rotateCcw({Color? color, double size = 22}) => icon(rotateCcwSvg, color: color, size: size);
  static Widget star({double size = 16}) => icon(starFilledSvg, size: size);
}
