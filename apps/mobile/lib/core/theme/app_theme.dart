import 'package:flutter/material.dart';

/// Colors converted directly from the web app's oklch() design tokens in
/// apps/web/src/styles/globals.css using the standard OKLab->linear-sRGB
/// matrix transform — not eyeballed approximations. If the web palette
/// changes, re-run that conversion rather than guessing new hex values.
class AppColors {
  AppColors._();

  static const background = Color(0xFFFCF6E9);
  static const foreground = Color(0xFF3B2116);
  static const card = Color(0xFFFFFDF7);

  static const primary = Color(0xFFEF852E);
  static const primaryForeground = Color(0xFFFEFCF4);

  static const secondary = Color(0xFFF6E6C7);
  static const secondaryForeground = Color(0xFF4D3020);

  static const muted = Color(0xFFF4ECDA);
  static const mutedForeground = Color(0xFF796456);

  static const accent = Color(0xFF57B6B6);
  static const accentForeground = Color(0xFFFEFCF4);

  static const berry = Color(0xFFC95463);
  static const berryForeground = Color(0xFFFEFCF4);

  static const leaf = Color(0xFF59985B);
  static const leafForeground = Color(0xFFFEFCF4);

  static const destructive = Color(0xFFE7000B);
  static const destructiveForeground = Color(0xFFFEFCF4);

  static const border = Color(0xFFE4D5BE);
}

/// Matches the web app's rounded-corner, soft-shadow "paper card" feel —
/// same visual language (warm/friendly/child-ministry), rebuilt with
/// Material widgets rather than a literal port of Tailwind classes.
class AppTheme {
  AppTheme._();

  static ThemeData get light {
    final colorScheme = ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: AppColors.primaryForeground,
      secondary: AppColors.accent,
      onSecondary: AppColors.accentForeground,
      surface: AppColors.card,
      onSurface: AppColors.foreground,
      error: AppColors.destructive,
      onError: AppColors.destructiveForeground,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: 'Nunito',
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.foreground,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: AppColors.card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.border, width: 2),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.primaryForeground,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.foreground,
          side: const BorderSide(color: AppColors.border, width: 2),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.card,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      textTheme: const TextTheme(
        headlineMedium: TextStyle(fontWeight: FontWeight.w800, color: AppColors.foreground),
        titleLarge: TextStyle(fontWeight: FontWeight.w800, color: AppColors.foreground),
        titleMedium: TextStyle(fontWeight: FontWeight.w700, color: AppColors.foreground),
        bodyMedium: TextStyle(color: AppColors.foreground),
      ),
    );
  }
}
