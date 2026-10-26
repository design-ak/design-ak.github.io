# Design system theme — Flutter

Generated from the Figma file **Mobile Design System** (variables + text/effect styles).
Do not edit values by hand — change them in Figma and regenerate.

Requires **Flutter 3.22+** (Dart 3). Run `dart format lib/theme` after copying the files in.

## 1. Add the files

Copy `lib/theme/` into your app's `lib/`, then import the barrel:

```dart
import 'package:your_app/theme/theme.dart';
```

| File | What it gives you |
|---|---|
| `app_colors.dart` | `AppColors` — 33 semantic colour tokens, `AppColors.light` / `AppColors.dark`, read with `context.colors` |
| `app_spacing.dart` | `AppSpacing.s0 … s64` |
| `app_radius.dart` | `AppRadius.r0 … r16`, `rFull`, plus `all()` / `top()` helpers |
| `app_typography.dart` | `AppTypography.h1 … buttonXs` — 24 text styles (no colour) |
| `app_shadows.dart` | `AppShadows.sm` / `lg` / `sheet` |
| `app_theme.dart` | `AppTheme.light()` / `AppTheme.dark()` — Material `ThemeData` wired to the tokens |

## 2. Fonts (bundle them — don't download at runtime)

Download from Google Fonts (use the files in each download's `static/` folder) and place them under `assets/fonts/`.
Merge this into the **existing** `flutter:` section of `pubspec.yaml` (next to `uses-material-design: true`) — do not add a second `flutter:` key:

```yaml
flutter:
  fonts:
    - family: Roboto
      fonts:
        - asset: assets/fonts/Roboto-Regular.ttf
          weight: 400
        - asset: assets/fonts/Roboto-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Roboto-Bold.ttf
          weight: 700
    - family: Noto Sans Gujarati
      fonts:
        - asset: assets/fonts/NotoSansGujarati-Regular.ttf
          weight: 400
        - asset: assets/fonts/NotoSansGujarati-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/NotoSansGujarati-Bold.ttf
          weight: 700
    - family: Noto Sans Devanagari
      fonts:
        - asset: assets/fonts/NotoSansDevanagari-Regular.ttf
          weight: 400
        - asset: assets/fonts/NotoSansDevanagari-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/NotoSansDevanagari-Bold.ttf
          weight: 700
```

The `family:` names must match `AppTypography.fontFamily` and `fontFamilyFallback`.
Mixed English + Gujarati text then renders correctly without per-word font changes.

## 3. Icons

```yaml
dependencies:
  material_symbols_icons: ^4.0.0
```

Use the **Rounded** set at weight 400: `Icon(Symbols.search_rounded, weight: 400)`.
Do not use Flutter's built-in `Icons.*_rounded` — that is the older icon set and looks different.

## 4. Wire up the theme

```dart
MaterialApp(
  theme: AppTheme.light(),
  darkTheme: AppTheme.dark(),
  themeMode: ThemeMode.system,
);
```

`AppTheme` also sets: 48px touch targets (`MaterialTapTargetSize.padded`), the scrim and rounded top corners for every modal bottom sheet, and a drag handle on every modal sheet (`showDragHandle: true` — turn it off per sheet if a sheet draws its own). Dialogs are not themed globally: pass `barrierColor: context.colors.bgScrim` to `showDialog`.

## 5. Use tokens, never raw values

```dart
Container(
  padding: const EdgeInsets.all(AppSpacing.s16),
  decoration: BoxDecoration(
    color: context.colors.bgSurfaceRaised,
    borderRadius: AppRadius.all(AppRadius.r12),
    border: Border.all(color: context.colors.borderSubtle),
  ),
  child: Text(
    'Satsang — Adalaj',
    style: AppTypography.bodyMdStrong.copyWith(color: context.colors.textPrimary),
  ),
);

showDialog(
  context: context,
  barrierColor: context.colors.bgScrim,
  builder: (_) => const AppDialog(/* … */), // AppDialog = your app's widget built from the Figma Dialog
);
```

Token names map 1:1 to Figma: `text/secondary` → `context.colors.textSecondary`,
`space/16` → `AppSpacing.s16`, `Body/Md Strong` → `AppTypography.bodyMdStrong`.
