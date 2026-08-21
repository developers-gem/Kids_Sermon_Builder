import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/narration_settings_provider.dart';
import 'screens/home/home_screen.dart';

void main() {
  runApp(const KidsSermonBuilderApp());
}

class KidsSermonBuilderApp extends StatelessWidget {
  const KidsSermonBuilderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..tryRestoreSession()),
        ChangeNotifierProvider(create: (_) => NarrationSettingsProvider()..load()),
      ],
      child: MaterialApp(
        title: 'Kids Sermon Builder',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        home: const HomeScreen(),
      ),
    );
  }
}
