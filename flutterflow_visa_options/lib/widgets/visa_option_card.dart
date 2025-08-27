import 'package:flutter/material.dart';
import '../models/visa_option.dart';

class VisaOptionCard extends StatefulWidget {
  final VisaOption visaOption;
  final VoidCallback? onTap;

  const VisaOptionCard({
    super.key,
    required this.visaOption,
    this.onTap,
  });

  @override
  State<VisaOptionCard> createState() => _VisaOptionCardState();
}

class _VisaOptionCardState extends State<VisaOptionCard>
    with SingleTickerProviderStateMixin {
  bool _isExpanded = false;
  late AnimationController _animationController;
  late Animation<double> _heightAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _heightAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _toggleExpanded() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Card(
      child: InkWell(
        onTap: widget.onTap ?? _toggleExpanded,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row with visa name and type badge
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.visaOption.name,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: widget.visaOption.typeColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: widget.visaOption.typeColor,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          widget.visaOption.typeIcon,
                          size: 16,
                          color: widget.visaOption.typeColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          widget.visaOption.type,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: widget.visaOption.typeColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Processing time and cost row
              Row(
                children: [
                  Expanded(
                    child: _buildInfoChip(
                      icon: Icons.schedule,
                      label: 'Processing',
                      value: widget.visaOption.processingTime,
                      color: Colors.orange,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildInfoChip(
                      icon: Icons.attach_money,
                      label: 'Cost',
                      value: widget.visaOption.formattedCost,
                      color: Colors.green,
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Description
              Text(
                widget.visaOption.description,
                style: theme.textTheme.bodyMedium,
                maxLines: _isExpanded ? null : 2,
                overflow: _isExpanded ? null : TextOverflow.ellipsis,
              ),
              
              const SizedBox(height: 12),
              
              // Validity and source row
              Row(
                children: [
                  Expanded(
                    child: _buildInfoChip(
                      icon: Icons.calendar_today,
                      label: 'Validity',
                      value: widget.visaOption.validity,
                      color: Colors.blue,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildInfoChip(
                      icon: Icons.source,
                      label: 'Source',
                      value: widget.visaOption.source,
                      color: Colors.purple,
                    ),
                  ),
                ],
              ),
              
              // Expandable requirements section
              if (widget.visaOption.requirements.isNotEmpty) ...[
                const SizedBox(height: 16),
                _buildRequirementsSection(theme),
              ],
              
              // Expand/collapse button
              if (widget.visaOption.requirements.isNotEmpty) ...[
                const SizedBox(height: 12),
                Center(
                  child: TextButton.icon(
                    onPressed: _toggleExpanded,
                    icon: AnimatedRotation(
                      turns: _isExpanded ? 0.5 : 0.0,
                      duration: const Duration(milliseconds: 300),
                      child: const Icon(Icons.keyboard_arrow_down),
                    ),
                    label: Text(
                      _isExpanded ? 'Show Less' : 'Show Requirements',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.primaryColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoChip({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                icon,
                size: 16,
                color: color,
              ),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              color: color,
              fontWeight: FontWeight.w600,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildRequirementsSection(ThemeData theme) {
    return AnimatedBuilder(
      animation: _heightAnimation,
      builder: (context, child) {
        return SizeTransition(
          sizeFactor: _heightAnimation,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Requirements',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[700],
                ),
              ),
              const SizedBox(height: 8),
              ...widget.visaOption.requirements.map((requirement) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.only(top: 8, right: 12),
                        decoration: BoxDecoration(
                          color: theme.primaryColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          requirement,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ],
          ),
        );
      },
    );
  }
}
