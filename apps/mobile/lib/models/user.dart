class AppUser {
  final String id;
  final String name;
  final String email;
  final String role; // "user" | "admin"

  AppUser({required this.id, required this.name, required this.email, required this.role});

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        role: json['role'] as String? ?? 'user',
      );

  bool get isAdmin => role == 'admin';
}
