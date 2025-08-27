import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/visa_option.dart';

class VisaService {
  static const String _baseUrl = 'https://your-function-url.com'; // Replace with actual URL
  static const String _endpoint = '/visaEligibility';
  static const Duration _timeout = Duration(seconds: 15);
  
  static const bool _debug = true;

  /// Fetch visa eligibility options from the API
  static Future<List<VisaOption>> getVisaEligibility({
    required String countryCode,
    required String nationality,
  }) async {
    try {
      if (_debug) {
        print('🔍 Fetching visa eligibility for $nationality → $countryCode');
      }

      final url = Uri.parse('$_baseUrl$_endpoint');
      
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'countryCode': countryCode.toUpperCase(),
          'nationality': nationality.toUpperCase(),
        }),
      ).timeout(_timeout);

      if (_debug) {
        print('📡 Response status: ${response.statusCode}');
        print('📡 Response body: ${response.body}');
      }

      if (response.statusCode == 200) {
        final Map<String, dynamic> responseData = jsonDecode(response.body);
        
        if (responseData['success'] == true && responseData['data'] != null) {
          final List<dynamic> visaOptionsData = responseData['data'];
          final List<VisaOption> visaOptions = visaOptionsData
              .map((json) => VisaOption.fromJson(json))
              .toList();

          if (_debug) {
            print('✅ Successfully fetched ${visaOptions.length} visa options');
            print('📋 Cache status: ${responseData['cached'] ?? false}');
          }

          return visaOptions;
        } else {
          throw Exception('API returned success: false - ${responseData['message'] ?? 'Unknown error'}');
        }
      } else if (response.statusCode == 400) {
        final Map<String, dynamic> errorData = jsonDecode(response.body);
        throw Exception('Validation error: ${errorData['message'] ?? 'Invalid input'}');
      } else if (response.statusCode == 405) {
        throw Exception('Method not allowed. Please use POST request.');
      } else if (response.statusCode == 429) {
        throw Exception('Rate limited. Please try again later.');
      } else if (response.statusCode >= 500) {
        throw Exception('Server error. Please try again later.');
      } else {
        throw Exception('Unexpected error: ${response.statusCode}');
      }
    } on http.ClientException catch (e) {
      if (_debug) {
        print('❌ Network error: $e');
      }
      throw Exception('Network error. Please check your internet connection.');
    } on http.SocketException catch (e) {
      if (_debug) {
        print('❌ Socket error: $e');
      }
      throw Exception('Connection failed. Please try again.');
    } on FormatException catch (e) {
      if (_debug) {
        print('❌ Format error: $e');
      }
      throw Exception('Invalid response format from server.');
    } catch (e) {
      if (_debug) {
        print('❌ Unexpected error: $e');
      }
      if (e is Exception) {
        rethrow;
      }
      throw Exception('An unexpected error occurred: $e');
    }
  }

  /// Mock data for testing when API is not available
  static Future<List<VisaOption>> getMockVisaEligibility({
    required String countryCode,
    required String nationality,
  }) async {
    // Simulate network delay
    await Future.delayed(const Duration(seconds: 2));

    final List<VisaOption> mockOptions = [];

    // Add KITAS options for Indonesia
    if (countryCode.toUpperCase() == 'ID') {
      mockOptions.addAll([
        VisaOption(
          id: 'kitas-work',
          name: 'KITAS Work Permit',
          type: 'KITAS',
          visaRequired: true,
          processingTime: '15-30 business days',
          processingTimeDays: 22,
          cost: 2500000,
          costCurrency: 'IDR',
          description: 'Work permit for foreign nationals employed in Indonesia',
          requirements: [
            'Valid passport with minimum 18 months validity',
            'Employment contract from Indonesian company',
            'Educational certificates (minimum Bachelor degree)',
            'Health certificate',
            'Police clearance certificate',
            'Company sponsorship letter'
          ],
          validity: '1 year (renewable)',
          source: 'Indonesian Immigration',
          priority: 1
        ),
        VisaOption(
          id: 'kitas-family',
          name: 'KITAS Family Reunion',
          type: 'KITAS',
          visaRequired: true,
          processingTime: '10-20 business days',
          processingTimeDays: 15,
          cost: 1500000,
          costCurrency: 'IDR',
          description: 'Family reunion permit for spouses and children of KITAS holders',
          requirements: [
            'Marriage certificate (for spouses)',
            'Birth certificate (for children)',
            'Sponsor\'s KITAS',
            'Valid passport with minimum 18 months validity',
            'Health certificate',
            'Proof of relationship'
          ],
          validity: '1 year (renewable)',
          source: 'Indonesian Immigration',
          priority: 3
        ),
      ]);
    }

    // Add mock iVisa options
    mockOptions.addAll([
      VisaOption(
        id: 'ivisa-tourist',
        name: 'Tourist Visa',
        type: 'iVisa',
        visaRequired: true,
        processingTime: '5-7 business days',
        processingTimeDays: 6,
        cost: 99.99,
        costCurrency: 'USD',
        description: 'Standard tourist visa for short-term visits',
        requirements: [
          'Valid passport',
          'Completed application form',
          'Passport-size photos',
          'Travel itinerary',
          'Proof of accommodation'
        ],
        validity: '90 days',
        source: 'iVisa',
        priority: 100
      ),
      VisaOption(
        id: 'ivisa-business',
        name: 'Business Visa',
        type: 'iVisa',
        visaRequired: true,
        processingTime: '7-10 business days',
        processingTimeDays: 8,
        cost: 149.99,
        costCurrency: 'USD',
        description: 'Business visa for work-related travel',
        requirements: [
          'Valid passport',
          'Completed application form',
          'Business invitation letter',
          'Company registration documents',
          'Financial statements'
        ],
        validity: '180 days',
        source: 'iVisa',
        priority: 101
      ),
    ]);

    // Sort by processing time then cost
    mockOptions.sort((a, b) {
      if (a.processingTimeDays != b.processingTimeDays) {
        return a.processingTimeDays.compareTo(b.processingTimeDays);
      }
      return a.cost.compareTo(b.cost);
    });

    if (_debug) {
      print('🎭 Using mock data: ${mockOptions.length} options');
    }

    return mockOptions;
  }

  /// Get visa eligibility with fallback to mock data
  static Future<List<VisaOption>> getVisaEligibilityWithFallback({
    required String countryCode,
    required String nationality,
    bool useMockData = false,
  }) async {
    if (useMockData) {
      return getMockVisaEligibility(
        countryCode: countryCode,
        nationality: nationality,
      );
    }

    try {
      return await getVisaEligibility(
        countryCode: countryCode,
        nationality: nationality,
      );
    } catch (e) {
      if (_debug) {
        print('⚠️ API call failed, falling back to mock data: $e');
      }
      return getMockVisaEligibility(
        countryCode: countryCode,
        nationality: nationality,
      );
    }
  }
}
