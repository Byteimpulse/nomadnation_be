// Demo script for visaEligibility function
// This shows how the function would work with mock data

console.log('🚀 Visa Eligibility Function Demo');
console.log('=====================================\n');

// Mock visa options data structure
const mockIVisaOptions = [
  {
    id: 'ivisa-tourist',
    name: 'Tourist Visa',
    type: 'iVisa',
    visaRequired: true,
    processingTime: '5-7 business days',
    processingTimeDays: 6,
    cost: 99.99,
    costCurrency: 'USD',
    description: 'Standard tourist visa for short-term visits',
    requirements: ['Valid passport', 'Completed application form', 'Passport-size photos'],
    validity: '90 days',
    source: 'iVisa',
    priority: 100
  },
  {
    id: 'ivisa-business',
    name: 'Business Visa',
    type: 'iVisa',
    visaRequired: true,
    processingTime: '7-10 business days',
    processingTimeDays: 8,
    cost: 149.99,
    costCurrency: 'USD',
    description: 'Business visa for work-related travel',
    requirements: ['Valid passport', 'Business invitation letter', 'Company documents'],
    validity: '180 days',
    source: 'iVisa',
    priority: 101
  }
];

const kitasOverrides = [
  {
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
  },
  {
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
  },
  {
    id: 'kitas-student',
    name: 'KITAS Student',
    type: 'KITAS',
    visaRequired: true,
    processingTime: '12-25 business days',
    processingTimeDays: 18,
    cost: 2000000,
    costCurrency: 'IDR',
    description: 'Student permit for foreign students studying in Indonesia',
    requirements: [
      'Acceptance letter from Indonesian educational institution',
      'Valid passport with minimum 18 months validity',
      'Educational certificates',
      'Health certificate',
      'Financial guarantee letter',
      'Study plan'
    ],
    validity: '1 year (renewable)',
    source: 'Indonesian Immigration',
    priority: 4
  }
];

// Function to merge and sort visa options (same logic as the actual function)
function mergeAndSortVisaOptions(iVisaOptions, countryCode) {
  let allOptions = [...iVisaOptions];
  
  // Add KITAS overrides if destination is Indonesia
  if (countryCode.toUpperCase() === 'ID') {
    allOptions = [...allOptions, ...kitasOverrides];
  }
  
  // Sort by processing time (ascending), then by cost (ascending)
  return allOptions.sort((a, b) => {
    // First sort by processing time
    if (a.processingTimeDays !== b.processingTimeDays) {
      return a.processingTimeDays - b.processingTimeDays;
    }
    
    // Then sort by cost
    if (a.cost !== b.cost) {
      return a.cost - b.cost;
    }
    
    // Finally sort by priority (lower number = higher priority)
    return a.priority - b.priority;
  });
}

// Demo function calls
function demoVisaEligibility() {
  console.log('📋 Demo 1: US Citizen → Indonesia (Includes KITAS)');
  console.log('Country: ID, Nationality: US\n');
  
  const result1 = mergeAndSortVisaOptions(mockIVisaOptions, 'ID');
  
  console.log(`✅ Found ${result1.length} visa options:`);
  result1.forEach((option, index) => {
    const cost = option.costCurrency === 'IDR' 
      ? `Rp ${option.cost.toLocaleString()}` 
      : `$${option.cost}`;
    
    console.log(`${index + 1}. ${option.name} (${option.type})`);
    console.log(`   ⏱️  Processing: ${option.processingTime} (${option.processingTimeDays} days)`);
    console.log(`   💰 Cost: ${cost}`);
    console.log(`   📍 Source: ${option.source}`);
    console.log(`   🎯 Priority: ${option.priority}`);
    console.log('');
  });
  
  console.log('📊 Summary:');
  const kitasCount = result1.filter(opt => opt.type === 'KITAS').length;
  const ivisaCount = result1.filter(opt => opt.type === 'iVisa').length;
  console.log(`   • KITAS options: ${kitasCount}`);
  console.log(`   • iVisa options: ${ivisaCount}`);
  console.log(`   • Total: ${result1.length}`);
  console.log(`   • Fastest: ${result1[0].name} (${result1[0].processingTime})`);
  console.log(`   • Cheapest: ${result1.reduce((min, opt) => opt.cost < min.cost ? opt : min).name}`);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('📋 Demo 2: Canadian Citizen → US (No KITAS)');
  console.log('Country: US, Nationality: CA\n');
  
  const result2 = mergeAndSortVisaOptions(mockIVisaOptions, 'US');
  
  console.log(`✅ Found ${result2.length} visa options:`);
  result2.forEach((option, index) => {
    console.log(`${index + 1}. ${option.name} (${option.type})`);
    console.log(`   ⏱️  Processing: ${option.processingTime} (${option.processingTimeDays} days)`);
    console.log(`   💰 Cost: $${option.cost}`);
    console.log(`   📍 Source: ${option.source}`);
    console.log('');
  });
  
  console.log('📊 Summary:');
  console.log(`   • KITAS options: 0 (not available for US)`);
  console.log(`   • iVisa options: ${result2.length}`);
  console.log(`   • Fastest: ${result2[0].name} (${result2[0].processingTime})`);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('🎯 Key Features Demonstrated:');
  console.log('✅ Merges iVisa with KITAS overrides');
  console.log('✅ Sorts by processing time then cost');
  console.log('✅ Includes KITAS only for Indonesia');
  console.log('✅ Proper priority handling');
  console.log('✅ Rich data structure with requirements');
  console.log('✅ Currency formatting for different types');
  
  console.log('\n🚀 Ready for FlutterFlow integration!');
}

// Run the demo
demoVisaEligibility();
