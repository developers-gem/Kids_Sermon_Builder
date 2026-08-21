import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/app_constants.dart';

class NarrationSettingsProvider extends ChangeNotifier {
  String voice = AppConstants.defaultVoice;
  String style = AppConstants.defaultNarrationStyle;

  static const _voiceKey = 'narration_voice';
  static const _styleKey = 'narration_style';

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    voice = prefs.getString(_voiceKey) ?? AppConstants.defaultVoice;
    style = prefs.getString(_styleKey) ?? AppConstants.defaultNarrationStyle;
    notifyListeners();
  }

  Future<void> setVoice(String value) async {
    voice = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_voiceKey, value);
  }

  Future<void> setStyle(String value) async {
    style = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_styleKey, value);
  }
}
