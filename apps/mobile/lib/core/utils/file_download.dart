import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// Writes downloaded PDF bytes to the app's documents directory and opens
/// the OS share sheet — the mobile equivalent of the web app's browser
/// download, since there's no "Downloads folder" concept to drop a file
/// into the same way.
///
/// Uses the long-stable `Share.shareXFiles` static API rather than a newer
/// one, since this can't be verified against pub.dev in this environment —
/// preferring the API surface most likely to still be correct regardless of
/// exactly which share_plus version `flutter pub get` resolves.
Future<void> saveAndShareBytes(List<int> bytes, String filename) async {
  final dir = await getApplicationDocumentsDirectory();
  final file = File('${dir.path}/$filename');
  await file.writeAsBytes(bytes, flush: true);
  await Share.shareXFiles([XFile(file.path)], text: filename);
}
