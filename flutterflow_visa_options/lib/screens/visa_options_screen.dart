import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/visa_option.dart';
import '../services/visa_service.dart';
import '../widgets/visa_option_card.dart';

class VisaOptionsScreen extends StatefulWidget {
  const VisaOptionsScreen({super.key});

  @override
  State<VisaOptionsScreen> createState() => _VisaOptionsScreenState();
}

class _VisaOptionsScreenState extends State<VisaOptionsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _countryController = TextEditingController();
  final _nationalityController = TextEditingController();
  
  String _selectedCountry = 'ID'; // Default to Indonesia
  bool _useMockData = false;
  bool _isLoading = false;
  List<VisaOption> _visaOptions = [];
  String? _errorMessage;

  // Common country codes for dropdown
  final List<Map<String, String>> _countries = [
    {'code': 'ID', 'name': 'Indonesia'},
    {'code': 'US', 'name': 'United States'},
    {'code': 'CA', 'name': 'Canada'},
    {'code': 'GB', 'name': 'United Kingdom'},
    {'code': 'AU', 'name': 'Australia'},
    {'code': 'DE', 'name': 'Germany'},
    {'code': 'FR', 'name': 'France'},
    {'code': 'JP', 'name': 'Japan'},
    {'code': 'SG', 'name': 'Singapore'},
    {'code': 'MY', 'name': 'Malaysia'},
    {'code': 'TH', 'name': 'Thailand'},
    {'code': 'VN', 'name': 'Vietnam'},
    {'code': 'PH', 'name': 'Philippines'},
    {'code': 'IN', 'name': 'India'},
    {'code': 'CN', 'name': 'China'},
  ];

  @override
  void initState() {
    super.initState();
    _nationalityController.text = 'US'; // Default nationality
  }

  @override
  void dispose() {
    _countryController.dispose();
    _nationalityController.dispose();
    super.dispose();
  }

  Future<void> _fetchVisaOptions() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _visaOptions = [];
    });

    try {
      final options = await VisaService.getVisaEligibilityWithFallback(
        countryCode: _selectedCountry,
        nationality: _nationalityController.text.trim(),
        useMockData: _useMockData,
      );

      setState(() {
        _visaOptions = options;
        _isLoading = false;
      });

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Found ${options.length} visa options'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _clearResults() {
    setState(() {
      _visaOptions = [];
      _errorMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Visa Options'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showInfoDialog(context),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search form
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.cardColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Find Visa Options',
                    style: theme.textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 16),
                  
                  // Country selection
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _selectedCountry,
                          decoration: const InputDecoration(
                            labelText: 'Destination Country',
                            prefixIcon: Icon(Icons.flag),
                          ),
                          items: _countries.map((country) {
                            return DropdownMenuItem(
                              value: country['code'],
                              child: Text('${country['code']} - ${country['name']}'),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() {
                              _selectedCountry = value!;
                            });
                          },
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Please select a country';
                            }
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(width: 16),
                      
                      // Nationality input
                      Expanded(
                        child: TextFormField(
                          controller: _nationalityController,
                          decoration: const InputDecoration(
                            labelText: 'Your Nationality',
                            prefixIcon: Icon(Icons.person),
                            hintText: 'e.g., US, CA, GB',
                          ),
                          textCapitalize: TextCapitalize.characters,
                          inputFormatters: [
                            LengthLimitingTextInputFormatter(2),
                            FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z]')),
                          ],
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Please enter your nationality';
                            }
                            if (value.length != 2) {
                              return 'Nationality must be 2 characters';
                            }
                            return null;
                          },
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Options and search button
                  Row(
                    children: [
                      // Mock data toggle
                      Row(
                        children: [
                          Checkbox(
                            value: _useMockData,
                            onChanged: (value) {
                              setState(() {
                                _useMockData = value ?? false;
                              });
                            },
                          ),
                          Text(
                            'Use Mock Data',
                            style: theme.textTheme.bodyMedium,
                          ),
                        ],
                      ),
                      
                      const Spacer(),
                      
                      // Clear button
                      if (_visaOptions.isNotEmpty)
                        TextButton.icon(
                          onPressed: _clearResults,
                          icon: const Icon(Icons.clear),
                          label: const Text('Clear'),
                        ),
                      
                      const SizedBox(width: 12),
                      
                      // Search button
                      ElevatedButton.icon(
                        onPressed: _isLoading ? null : _fetchVisaOptions,
                        icon: _isLoading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Icon(Icons.search),
                        label: Text(_isLoading ? 'Searching...' : 'Search'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          // Results section
          Expanded(
            child: _buildResultsSection(),
          ),
        ],
      ),
    );
  }

  Widget _buildResultsSection() {
    if (_errorMessage != null) {
      return _buildErrorState();
    }
    
    if (_visaOptions.isEmpty && !_isLoading) {
      return _buildEmptyState();
    }
    
    if (_isLoading) {
      return _buildLoadingState();
    }
    
    return _buildResultsList();
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Searching for visa options...'),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'No visa options found',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Enter your destination and nationality to search',
            style: TextStyle(
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red[400],
          ),
          const SizedBox(height: 16),
          Text(
            'Error occurred',
            style: TextStyle(
              fontSize: 18,
              color: Colors.red[600],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.red[500],
              ),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _fetchVisaOptions,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildResultsList() {
    return Column(
      children: [
        // Results header
        Container(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(
                Icons.check_circle,
                color: Colors.green[600],
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                'Found ${_visaOptions.length} visa option${_visaOptions.length != 1 ? 's' : ''}',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.green[600],
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              if (_visaOptions.any((opt) => opt.isKitas))
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.work,
                        size: 16,
                        color: Colors.green[700],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'KITAS Available',
                        style: TextStyle(
                          color: Colors.green[700],
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        
        // Results list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _visaOptions.length,
            itemBuilder: (context, index) {
              final visaOption = _visaOptions[index];
              return VisaOptionCard(
                visaOption: visaOption,
                onTap: () {
                  // Handle card tap if needed
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Selected: ${visaOption.name}'),
                      duration: const Duration(seconds: 1),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  void _showInfoDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('About Visa Options'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'This app helps you find visa options for your travel destination.',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 16),
            Text(
              'Features:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            Text('• iVisa integration for standard visas'),
            Text('• KITAS overrides for Indonesia'),
            Text('• Sorting by processing time and cost'),
            Text('• 24-hour caching for faster results'),
            SizedBox(height: 16),
            Text(
              'Note: Use "Use Mock Data" option for testing when the API is not available.',
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}
