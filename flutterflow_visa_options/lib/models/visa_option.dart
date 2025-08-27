import 'package:flutter/material.dart';

class VisaOption {
  final String id;
  final String name;
  final String type;
  final bool visaRequired;
  final String processingTime;
  final int processingTimeDays;
  final double cost;
  final String costCurrency;
  final String description;
  final List<String> requirements;
  final String validity;
  final String source;
  final int priority;

  VisaOption({
    required this.id,
    required this.name,
    required this.type,
    required this.visaRequired,
    required this.processingTime,
    required this.processingTimeDays,
    required this.cost,
    required this.costCurrency,
    required this.description,
    required this.requirements,
    required this.validity,
    required this.source,
    required this.priority,
  });

  factory VisaOption.fromJson(Map<String, dynamic> json) {
    return VisaOption(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      type: json['type'] ?? '',
      visaRequired: json['visaRequired'] ?? false,
      processingTime: json['processingTime'] ?? '',
      processingTimeDays: json['processingTimeDays'] ?? 0,
      cost: (json['cost'] ?? 0).toDouble(),
      costCurrency: json['costCurrency'] ?? '',
      description: json['description'] ?? '',
      requirements: List<String>.from(json['requirements'] ?? []),
      validity: json['validity'] ?? '',
      source: json['source'] ?? '',
      priority: json['priority'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'visaRequired': visaRequired,
      'processingTime': processingTime,
      'processingTimeDays': processingTimeDays,
      'cost': cost,
      'costCurrency': costCurrency,
      'description': description,
      'requirements': requirements,
      'validity': validity,
      'source': source,
      'priority': priority,
    };
  }

  // Helper methods
  bool get isKitas => type == 'KITAS';
  bool get isIVisa => type == 'iVisa';
  
  String get formattedCost {
    if (costCurrency == 'IDR') {
      return 'Rp ${cost.toStringAsFixed(0)}';
    } else if (costCurrency == 'USD') {
      return '\$${cost.toStringAsFixed(2)}';
    } else if (costCurrency == 'EUR') {
      return '€${cost.toStringAsFixed(2)}';
    } else {
      return '${cost.toStringAsFixed(2)} $costCurrency';
    }
  }

  String get processingTimeDisplay {
    if (processingTimeDays <= 1) {
      return '$processingTimeDays day';
    } else if (processingTimeDays < 7) {
      return '$processingTimeDays days';
    } else if (processingTimeDays < 30) {
      final weeks = (processingTimeDays / 7).ceil();
      return '$weeks week${weeks > 1 ? 's' : ''}';
    } else {
      final months = (processingTimeDays / 30).ceil();
      return '$months month${months > 1 ? 's' : ''}';
    }
  }

  Color get typeColor {
    switch (type) {
      case 'KITAS':
        return const Color(0xFF4CAF50); // Green
      case 'iVisa':
        return const Color(0xFF2196F3); // Blue
      default:
        return const Color(0xFF9E9E9E); // Grey
    }
  }

  IconData get typeIcon {
    switch (type) {
      case 'KITAS':
        return Icons.work;
      case 'iVisa':
        return Icons.flight;
      default:
        return Icons.article;
    }
  }

  @override
  String toString() {
    return 'VisaOption(id: $id, name: $name, type: $type, processingTime: $processingTime, cost: $cost $costCurrency)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is VisaOption && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
