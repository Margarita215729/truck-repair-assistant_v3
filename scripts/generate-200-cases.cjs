#!/usr/bin/env node

// Script to generate 200+ realistic truck diagnostic cases
// Based on real truck data, symptoms, and error codes

const fs = require('fs');
const path = require('path');

class TruckDiagnosticCaseGenerator {
  constructor() {
    this.truckManufacturers = this.loadTruckData();
    this.locations = this.getRealisticLocations();
    this.weatherConditions = ['clear', 'rainy', 'snowy', 'hot', 'cold', 'windy', 'humid'];
    this.loadConditions = ['empty', 'half loaded', 'fully loaded', 'overloaded'];
    this.roadConditions = ['highway', 'city streets', 'mountain pass', 'rural road', 'construction zone'];
    this.driverExperience = ['experienced', 'moderate', 'novice', 'trainee'];
    this.maintenanceHistory = ['regular maintenance', 'overdue maintenance', 'recent repairs', 'no maintenance records'];
  }

  loadTruckData() {
    // This would normally import from the expanded-truck-data.ts
    // For this script, we'll use a simplified version
    return [
      {
        name: 'Freightliner',
        models: ['Cascadia', 'Century', 'Coronado', 'Columbia', 'M2 106'],
        engines: ['Detroit DD13', 'Detroit DD15', 'Detroit DD16', 'Cummins ISX', 'Cummins X15']
      },
      {
        name: 'Peterbilt',
        models: ['389', '579', '367', '365', '386'],
        engines: ['Cummins X15', 'Cummins ISX', 'PACCAR MX-13', 'PACCAR MX-11']
      },
      {
        name: 'Kenworth',
        models: ['T680', 'T880', 'W900', 'T660', 'T800'],
        engines: ['Cummins X15', 'PACCAR MX-13', 'PACCAR MX-11']
      },
      {
        name: 'Volvo',
        models: ['VNL', 'VHD', 'VN', 'VNR'],
        engines: ['Volvo D13', 'Volvo D11', 'Volvo D16']
      },
      {
        name: 'Mack',
        models: ['Anthem', 'Pinnacle', 'Granite', 'CH'],
        engines: ['Mack MP7', 'Mack MP8', 'Mack MP10']
      },
      {
        name: 'International',
        models: ['ProStar', 'LoneStar', '9900i', 'LT Series'],
        engines: ['Cummins ISX', 'Cummins X15', 'International A26']
      },
      {
        name: 'Western Star',
        models: ['4900', '5700', '4700'],
        engines: ['Detroit DD13', 'Detroit DD15', 'Cummins X15']
      }
    ];
  }

  getRealisticLocations() {
    return [
      'Interstate 10, Texas',
      'Interstate 5, California',
      'Interstate 95, Florida',
      'Interstate 20, Georgia',
      'Interstate 40, Arizona',
      'Interstate 70, Colorado',
      'Interstate 80, Nebraska',
      'Interstate 90, South Dakota',
      'Highway 401, Ontario',
      'Trans-Canada Highway, Alberta',
      'Interstate 35, Minnesota',
      'Interstate 75, Michigan',
      'Interstate 25, New Mexico',
      'Interstate 84, Oregon',
      'Interstate 94, North Dakota',
      'Highway 1, California',
      'Interstate 81, Pennsylvania',
      'Interstate 65, Kentucky',
      'Interstate 55, Missouri',
      'Interstate 15, Utah'
    ];
  }

  generateRealisticCase(index) {
    const manufacturer = this.truckManufacturers[Math.floor(Math.random() * this.truckManufacturers.length)];
    const model = manufacturer.models[Math.floor(Math.random() * manufacturer.models.length)];
    const engine = manufacturer.engines[Math.floor(Math.random() * manufacturer.engines.length)];
    const location = this.locations[Math.floor(Math.random() * this.locations.length)];
    const weather = this.weatherConditions[Math.floor(Math.random() * this.weatherConditions.length)];
    const load = this.loadConditions[Math.floor(Math.random() * this.loadConditions.length)];
    const road = this.roadConditions[Math.floor(Math.random() * this.roadConditions.length)];
    const experience = this.driverExperience[Math.floor(Math.random() * this.driverExperience.length)];
    const maintenance = this.maintenanceHistory[Math.floor(Math.random() * this.maintenanceHistory.length)];

    const mileage = 150000 + Math.floor(Math.random() * 500000); // 150k to 650k miles
    const year = 2015 + Math.floor(Math.random() * 10); // 2015 to 2024

    // Generate realistic symptoms based on truck type and common issues
    const symptomSets = this.getSymptomSets(manufacturer.name, model);
    const selectedSymptoms = symptomSets[Math.floor(Math.random() * symptomSets.length)];

    const urgency = this.getUrgencyLevel(selectedSymptoms);
    const costEstimate = this.getCostEstimate(urgency, selectedSymptoms);

    return {
      caseId: `CASE_${String(index + 1).padStart(4, '0')}`,
      truckInfo: {
        manufacturer: manufacturer.name,
        model: model,
        year: year,
        engine: engine,
        mileage: mileage,
        vin: this.generateVin()
      },
      context: {
        location: location,
        weather: weather,
        loadCondition: load,
        roadCondition: road,
        driverExperience: experience,
        maintenanceHistory: maintenance,
        timeOfDay: ['morning', 'afternoon', 'evening', 'night'][Math.floor(Math.random() * 4)],
        ambientTemperature: this.getRandomTemp(weather)
      },
      symptoms: selectedSymptoms.join(', '),
      urgency: urgency,
      canDrive: this.determineCanDrive(urgency),
      maxDistance: this.getMaxDistance(urgency),
      immediateActions: this.getImmediateActions(selectedSymptoms),
      diagnosticAnalysis: {
        primaryIssue: this.getPrimaryIssue(selectedSymptoms, manufacturer.name),
        secondaryIssues: this.getSecondaryIssues(selectedSymptoms),
        errorCodes: this.getRelevantErrorCodes(manufacturer.name, selectedSymptoms),
        rootCause: this.getRootCause(selectedSymptoms, manufacturer.name),
        confidenceLevel: 0.75 + Math.random() * 0.25 // 75-100%
      },
      repairRecommendations: {
        priority: urgency,
        estimatedParts: this.getPartsList(selectedSymptoms),
        estimatedLaborHours: this.getLaborHours(urgency),
        costEstimate: costEstimate,
        recommendedShop: this.getRecommendedShop(location),
        estimatedDowntime: this.getDowntime(urgency)
      },
      preventionTips: this.getPreventionTips(selectedSymptoms, manufacturer.name),
      safetyWarnings: this.getSafetyWarnings(urgency, selectedSymptoms),
      timestamp: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      outcome: this.getOutcome(urgency)
    };
  }

  getSymptomSets(manufacturer, model) {
    const symptomSets = [
      // Engine Issues
      ['Engine won\'t start', 'Check engine light on', 'Battery not charging'],
      ['Engine stalls while driving', 'Loss of power', 'Rough idle'],
      ['Engine misfires', 'Excessive smoke from exhaust', 'Reduced fuel economy'],
      ['Engine overheating', 'Coolant leak', 'Oil pressure warning'],
      ['Turbocharger problems', 'Loss of power', 'Excessive black smoke'],

      // Transmission Issues
      ['Hard shifting', 'Transmission slipping', 'Gear grinding'],
      ['Transmission won\'t shift', 'Check transmission light', 'Fluid leak'],

      // Brake Issues
      ['Brake warning light', 'Air brake system malfunction', 'Reduced brake pressure'],
      ['ABS light on', 'Brake pedal feels spongy', 'Uneven brake wear'],

      // Electrical Issues
      ['Electrical system issues', 'Dashboard warning lights', 'Battery drain'],
      ['Headlights not working', 'Turn signals malfunctioning', 'Horn not working'],

      // Emissions Issues
      ['DEF system warning', 'DPF regeneration issues', 'EGR valve stuck'],
      ['Check engine light on', 'Reduced power mode', 'Increased emissions'],

      // Fuel System
      ['Fuel system leak', 'Hard starting', 'Fuel economy problems'],
      ['Fuel filter clogged', 'Injector problems', 'Fuel pressure issues'],

      // Cooling System
      ['Cooling system leak', 'Engine overheating', 'Radiator issues'],
      ['Water pump failure', 'Thermostat stuck', 'Fan clutch problems'],

      // Suspension & Steering
      ['Suspension problems', 'Steering issues', 'Tire wear uneven'],
      ['Power steering failure', 'Wheel alignment issues', 'Shock absorber failure'],

      // Other Systems
      ['HVAC system failure', 'Air conditioning not working', 'Heater problems'],
      ['Speedometer not working', 'Tachometer malfunction', 'Instrument cluster issues']
    ];

    return symptomSets;
  }

  getUrgencyLevel(symptoms) {
    const criticalSymptoms = ['Engine won\'t start', 'Engine stalls', 'Brake warning', 'Air brake system'];
    const highSymptoms = ['Engine overheating', 'Oil pressure warning', 'Electrical system', 'Fuel system leak'];
    const mediumSymptoms = ['Hard shifting', 'Check engine light', 'Reduced fuel economy'];

    if (criticalSymptoms.some(symptom => symptoms.includes(symptom))) return 'critical';
    if (highSymptoms.some(symptom => symptoms.includes(symptom))) return 'high';
    if (mediumSymptoms.some(symptom => symptoms.includes(symptom))) return 'medium';
    return 'low';
  }

  determineCanDrive(urgency) {
    return urgency !== 'critical';
  }

  getMaxDistance(urgency) {
    switch (urgency) {
      case 'critical': return 'Do not drive - tow to shop';
      case 'high': return '5-10 miles to nearest shop';
      case 'medium': return '50 miles to service center';
      case 'low': return 'Continue to destination';
      default: return 'Continue with caution';
    }
  }

  getImmediateActions(symptoms) {
    const actions = [];

    if (symptoms.includes('Engine overheating')) {
      actions.push('Pull over immediately', 'Turn off engine', 'Check coolant level', 'Do not restart until cool');
    }
    if (symptoms.includes('Brake warning')) {
      actions.push('Check brake fluid level', 'Test brake pedal feel', 'Use engine brake if available', 'Call for roadside assistance');
    }
    if (symptoms.includes('Electrical system')) {
      actions.push('Check battery connections', 'Turn off non-essential electrical loads', 'Monitor voltage gauge');
    }
    if (symptoms.includes('Fuel system leak')) {
      actions.push('Stop engine immediately', 'Evacuate area', 'Call emergency services', 'Do not restart');
    }

    if (actions.length === 0) {
      actions.push('Drive to nearest service center', 'Monitor gauges closely', 'Call ahead to schedule service');
    }

    return actions;
  }

  getPrimaryIssue(symptoms, manufacturer) {
    if (symptoms.includes('Engine overheating')) {
      return {
        problem: 'Engine Cooling System Failure',
        description: 'Critical cooling system malfunction requiring immediate attention',
        affectedSystem: 'Cooling System',
        urgency: 'critical'
      };
    }
    if (symptoms.includes('Brake warning')) {
      return {
        problem: 'Brake System Malfunction',
        description: 'Air brake or hydraulic brake system failure',
        affectedSystem: 'Brake System',
        urgency: 'critical'
      };
    }
    if (symptoms.includes('Engine won\'t start')) {
      return {
        problem: 'Engine Starting System Failure',
        description: 'Multiple possible causes preventing engine start',
        affectedSystem: 'Electrical/Engine',
        urgency: 'high'
      };
    }
    if (symptoms.includes('Hard shifting')) {
      return {
        problem: 'Transmission System Issue',
        description: 'Transmission shifting problems affecting drivability',
        affectedSystem: 'Transmission',
        urgency: 'medium'
      };
    }

    return {
      problem: 'General System Malfunction',
      description: 'Various system issues requiring diagnostic attention',
      affectedSystem: 'Multiple',
      urgency: 'medium'
    };
  }

  getSecondaryIssues(symptoms) {
    const issues = [];

    if (symptoms.includes('Reduced fuel economy')) {
      issues.push({
        problem: 'Fuel System Efficiency',
        description: 'Potential injector or fuel system issues',
        severity: 'medium'
      });
    }
    if (symptoms.includes('Check engine light')) {
      issues.push({
        problem: 'Emissions System Warning',
        description: 'Possible sensor or emissions component issue',
        severity: 'low'
      });
    }
    if (symptoms.includes('Electrical system')) {
      issues.push({
        problem: 'Electrical Load Management',
        description: 'Potential battery or alternator concerns',
        severity: 'medium'
      });
    }

    return issues;
  }

  getRelevantErrorCodes(manufacturer, symptoms) {
    const codes = [];

    if (symptoms.includes('Engine overheating')) {
      codes.push('SPN 110, FMI 3', 'SPN 110, FMI 4', 'SPN 174, FMI 3');
    }
    if (symptoms.includes('Brake warning')) {
      codes.push('SPN 520, FMI 3', 'SPN 520, FMI 4', 'SPN 521, FMI 2');
    }
    if (symptoms.includes('Engine won\'t start')) {
      codes.push('SPN 168, FMI 1', 'SPN 190, FMI 2', 'SPN 190, FMI 7');
    }
    if (symptoms.includes('Hard shifting')) {
      codes.push('SPN 639, FMI 2', 'SPN 639, FMI 7', 'SPN 177, FMI 3');
    }

    return codes.slice(0, 3); // Return up to 3 relevant codes
  }

  getRootCause(symptoms, manufacturer) {
    if (symptoms.includes('Engine overheating')) {
      return 'Failed thermostat or water pump, possibly compounded by low coolant level and poor maintenance history';
    }
    if (symptoms.includes('Brake warning')) {
      return 'Air brake compressor failure or air system leak due to worn seals and fittings';
    }
    if (symptoms.includes('Engine won\'t start')) {
      return 'Starter motor failure combined with weak battery and possible wiring harness corrosion';
    }
    return 'Multiple contributing factors requiring comprehensive diagnostic evaluation';
  }

  getCostEstimate(urgency, symptoms) {
    const baseCosts = {
      'critical': { min: 2500, max: 8000 },
      'high': { min: 800, max: 2500 },
      'medium': { min: 300, max: 1200 },
      'low': { min: 100, max: 500 }
    };

    const cost = baseCosts[urgency];
    const variance = Math.random() * 0.3; // ±15% variance
    const actualMin = cost.min * (1 - variance);
    const actualMax = cost.max * (1 + variance);

    return {
      min: Math.round(actualMin),
      max: Math.round(actualMax),
      currency: 'USD'
    };
  }

  getPartsList(symptoms) {
    const parts = [];

    if (symptoms.includes('Engine overheating')) {
      parts.push('Thermostat', 'Water pump', 'Coolant hoses', 'Radiator cap');
    }
    if (symptoms.includes('Brake warning')) {
      parts.push('Air compressor', 'Air brake valves', 'Air lines and fittings');
    }
    if (symptoms.includes('Engine won\'t start')) {
      parts.push('Starter motor', 'Battery', 'Starter solenoid');
    }
    if (symptoms.includes('Hard shifting')) {
      parts.push('Transmission filter', 'Transmission fluid', 'Shift solenoids');
    }

    return parts.slice(0, 5);
  }

  getLaborHours(urgency) {
    switch (urgency) {
      case 'critical': return 8 + Math.random() * 4; // 8-12 hours
      case 'high': return 4 + Math.random() * 3; // 4-7 hours
      case 'medium': return 2 + Math.random() * 2; // 2-4 hours
      case 'low': return 1 + Math.random() * 1; // 1-2 hours
      default: return 2 + Math.random() * 2;
    }
  }

  getRecommendedShop(location) {
    const shops = [
      'Rush Truck Center',
      'Doggett Freightliner',
      'PACCAR Service Center',
      'Cummins Authorized Dealer',
      'Detroit Diesel Service',
      'Volvo Truck Service',
      'Mack Truck Service',
      'International Truck Service'
    ];

    return shops[Math.floor(Math.random() * shops.length)];
  }

  getDowntime(urgency) {
    switch (urgency) {
      case 'critical': return '2-3 days';
      case 'high': return '1-2 days';
      case 'medium': return '4-8 hours';
      case 'low': return '1-2 hours';
      default: return '4-8 hours';
    }
  }

  getPreventionTips(symptoms, manufacturer) {
    const tips = [];

    if (symptoms.includes('Engine overheating')) {
      tips.push('Regular coolant system maintenance', 'Annual thermostat replacement', 'Weekly coolant level checks');
    }
    if (symptoms.includes('Brake warning')) {
      tips.push('Daily air brake system inspection', 'Monthly air dryer maintenance', 'Regular brake adjustment');
    }
    if (symptoms.includes('Electrical system')) {
      tips.push('Battery terminal cleaning every 6 months', 'Alternator belt inspection', 'Electrical system load testing');
    }

    tips.push('Follow manufacturer recommended maintenance schedule');
    tips.push('Keep detailed maintenance records');
    tips.push('Use quality replacement parts');

    return tips.slice(0, 4);
  }

  getSafetyWarnings(urgency, symptoms) {
    const warnings = [];

    if (urgency === 'critical') {
      warnings.push('DO NOT ATTEMPT TO DRIVE - RISK OF ACCIDENT');
      warnings.push('EVACUATE VEHICLE IMMEDIATELY');
      warnings.push('CALL EMERGENCY SERVICES IF NECESSARY');
    }

    if (symptoms.includes('Brake warning')) {
      warnings.push('BRAKE SYSTEM FAILURE - DO NOT DRIVE');
      warnings.push('USE ENGINE BRAKE AS EMERGENCY STOPPING MEASURE');
    }

    if (symptoms.includes('Fuel system leak')) {
      warnings.push('FUEL LEAK - FIRE HAZARD - EVACUATE AREA');
      warnings.push('NO SMOKING OR OPEN FLAMES');
    }

    if (symptoms.includes('Engine overheating')) {
      warnings.push('SCALDING HAZARD - DO NOT OPEN COOLING SYSTEM');
      warnings.push('WAIT 30+ MINUTES BEFORE OPENING HOOD');
    }

    if (warnings.length === 0) {
      warnings.push('Drive cautiously to nearest service facility');
      warnings.push('Monitor gauges continuously');
    }

    return warnings;
  }

  getRandomTemp(weather) {
    const tempRanges = {
      'hot': [85, 110],
      'cold': [-10, 32],
      'clear': [60, 85],
      'rainy': [45, 75],
      'snowy': [10, 35],
      'windy': [50, 80],
      'humid': [75, 95]
    };

    const range = tempRanges[weather] || [50, 85];
    return Math.floor(range[0] + Math.random() * (range[1] - range[0]));
  }

  generateVin() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let vin = '';
    for (let i = 0; i < 17; i++) {
      vin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return vin;
  }

  getOutcome(urgency) {
    const outcomes = {
      'critical': {
        result: 'Towed to shop',
        resolutionTime: '3 days',
        totalCost: 4500,
        satisfaction: 'neutral',
        notes: 'Major repair required, significant downtime'
      },
      'high': {
        result: 'Repaired same day',
        resolutionTime: '8 hours',
        totalCost: 1200,
        satisfaction: 'satisfied',
        notes: 'Standard repair, minimal downtime'
      },
      'medium': {
        result: 'Scheduled service',
        resolutionTime: '4 hours',
        totalCost: 450,
        satisfaction: 'satisfied',
        notes: 'Routine maintenance repair'
      },
      'low': {
        result: 'Fixed on-site',
        resolutionTime: '1 hour',
        totalCost: 150,
        satisfaction: 'very satisfied',
        notes: 'Simple fix, no downtime'
      }
    };

    return outcomes[urgency];
  }

  generateCases(count = 200) {
    const cases = [];

    for (let i = 0; i < count; i++) {
      const caseData = this.generateRealisticCase(i);
      cases.push(caseData);

      // Add some variation to make cases more diverse
      if (i % 5 === 0) {
        console.log(`Generated case ${i + 1}/${count}: ${caseData.truckInfo.manufacturer} ${caseData.truckInfo.model} - ${caseData.urgency.toUpperCase()}`);
      }
    }

    return cases;
  }

  saveCases(cases, filename = 'expanded_diagnostic_cases.json') {
    const outputPath = path.join(__dirname, '..', 'training_data', filename);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCases: cases.length,
        manufacturers: [...new Set(cases.map(c => c.truckInfo.manufacturer))],
        urgencyDistribution: {
          critical: cases.filter(c => c.urgency === 'critical').length,
          high: cases.filter(c => c.urgency === 'high').length,
          medium: cases.filter(c => c.urgency === 'medium').length,
          low: cases.filter(c => c.urgency === 'low').length
        },
        version: '2.0'
      },
      cases: cases
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`✅ Generated ${cases.length} diagnostic cases`);
    console.log(`📁 Saved to: ${outputPath}`);

    // Also save as training format
    const trainingFormat = {
      conversations: cases.map(caseData => ({
        input: {
          symptoms: caseData.symptoms,
          truck_info: caseData.truckInfo,
          context: caseData.context,
          urgency: caseData.urgency
        },
        output: {
          diagnosis: caseData.diagnosticAnalysis.primaryIssue.description,
          urgency: caseData.urgency,
          immediate_actions: caseData.immediateActions,
          repair_recommendations: caseData.repairRecommendations,
          safety_warnings: caseData.safetyWarnings,
          prevention_tips: caseData.preventionTips
        }
      }))
    };

    const trainingPath = path.join(__dirname, '..', 'training_data', 'expanded_truck_diagnostic_training_data.json');
    fs.writeFileSync(trainingPath, JSON.stringify(trainingFormat, null, 2));
    console.log(`🎯 Training data saved to: ${trainingPath}`);
  }
}

// Generate 200+ cases
if (require.main === module) {
  console.log('🚛 Generating 200+ realistic truck diagnostic cases...');
  console.log('This will take a moment...');

  const generator = new TruckDiagnosticCaseGenerator();
  const cases = generator.generateCases(250); // Generate 250 for extra variety
  generator.saveCases(cases);

  console.log('✅ Case generation completed!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`  • Total cases: ${cases.length}`);
  console.log(`  • Manufacturers: ${generator.truckManufacturers.length}`);
  console.log(`  • Realistic scenarios included`);
  console.log(`  • Ready for model fine-tuning`);
}

module.exports = TruckDiagnosticCaseGenerator;
