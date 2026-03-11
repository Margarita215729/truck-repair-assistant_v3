/**
 * Get Help Now — Decision Engine
 *
 * Core service that connects diagnostic context to actionable roadside decisions.
 * Computes recommended next steps, driver actions, and service ranking based on
 * the current issue context (fault codes, urgency, driveability, symptoms, etc.).
 */

// ─── Service Type Taxonomy ──────────────────────────────────────────

/** @type {Record<string, { label: string, emergency: boolean, keywords: string[] }>} */
export const SERVICE_TYPES = {
  heavy_duty_repair:      { label: 'Heavy-Duty Repair',       emergency: true,  keywords: ['truck repair', 'diesel mechanic', 'heavy duty repair'] },
  mobile_mechanic:        { label: 'Mobile Mechanic',         emergency: true,  keywords: ['mobile truck repair', 'roadside diesel mechanic'] },
  towing_heavy_duty:      { label: 'Heavy-Duty Towing',       emergency: true,  keywords: ['heavy duty towing', 'semi truck towing'] },
  tire_roadside:          { label: 'Tire & Roadside',         emergency: true,  keywords: ['truck tire service', 'roadside tire repair'] },
  trailer_repair:         { label: 'Trailer Repair',          emergency: true,  keywords: ['trailer repair service'] },
  reefer_repair:          { label: 'Reefer Repair',           emergency: true,  keywords: ['reefer repair', 'refrigerated trailer service'] },
  aftertreatment_dpf_def: { label: 'Aftertreatment / DPF / DEF', emergency: true, keywords: ['dpf cleaning', 'def system repair', 'aftertreatment'] },
  dealer_service:         { label: 'Dealer Service Center',   emergency: true,  keywords: ['truck dealer service'] },
  roadside_diagnostics:   { label: 'Roadside Diagnostics',    emergency: true,  keywords: ['truck diagnostics', 'mobile diagnostics'] },
  brake_suspension:       { label: 'Brake & Suspension',      emergency: true,  keywords: ['truck brake repair', 'air brake service'] },
  electrical_diagnostics: { label: 'Electrical Diagnostics',  emergency: true,  keywords: ['truck electrical repair', 'wiring diagnostics'] },
  truck_parking:          { label: 'Truck Parking',           emergency: false, keywords: ['truck parking', 'rest area'] },
  truck_stop:             { label: 'Truck Stop',              emergency: false, keywords: ['truck stop', 'fuel station'] },
  wash:                   { label: 'Truck Wash',              emergency: false, keywords: ['truck wash'] },
  oil_change_pm:          { label: 'Oil Change / PM Service', emergency: false, keywords: ['truck oil change', 'preventive maintenance'] },
  weigh_station:          { label: 'Weigh Station',           emergency: false, keywords: [] },
  restrictions:           { label: 'Route Restrictions',      emergency: false, keywords: [] },
};

// ─── Issue → Service Type Mapping ───────────────────────────────────

const ISSUE_SERVICE_MAP = {
  engine:        ['heavy_duty_repair', 'mobile_mechanic', 'dealer_service', 'roadside_diagnostics'],
  electrical:    ['electrical_diagnostics', 'mobile_mechanic', 'heavy_duty_repair', 'dealer_service'],
  transmission:  ['heavy_duty_repair', 'dealer_service', 'towing_heavy_duty'],
  brakes:        ['brake_suspension', 'mobile_mechanic', 'towing_heavy_duty', 'heavy_duty_repair'],
  exhaust:       ['aftertreatment_dpf_def', 'heavy_duty_repair', 'dealer_service'],
  aftertreatment:['aftertreatment_dpf_def', 'heavy_duty_repair', 'dealer_service'],
  tire:          ['tire_roadside', 'mobile_mechanic', 'towing_heavy_duty'],
  coolant:       ['mobile_mechanic', 'towing_heavy_duty', 'heavy_duty_repair'],
  overheating:   ['towing_heavy_duty', 'mobile_mechanic', 'heavy_duty_repair'],
  fuel:          ['heavy_duty_repair', 'mobile_mechanic', 'dealer_service'],
  air_system:    ['brake_suspension', 'mobile_mechanic', 'heavy_duty_repair'],
  trailer:       ['trailer_repair', 'mobile_mechanic', 'towing_heavy_duty'],
  reefer:        ['reefer_repair', 'mobile_mechanic', 'heavy_duty_repair'],
  steering:      ['heavy_duty_repair', 'towing_heavy_duty', 'dealer_service'],
  suspension:    ['brake_suspension', 'heavy_duty_repair', 'towing_heavy_duty'],
  driveline:     ['heavy_duty_repair', 'towing_heavy_duty', 'dealer_service'],
  starting:      ['mobile_mechanic', 'electrical_diagnostics', 'towing_heavy_duty'],
  general:       ['heavy_duty_repair', 'mobile_mechanic', 'dealer_service'],
};

// ─── Difficulty Levels ──────────────────────────────────────────────

export const DIFFICULTY_LEVELS = {
  driver_basic:        { label: 'Easy Driver Check',          color: 'bg-green-500/20 text-green-400 border-green-500/30', order: 1 },
  driver_intermediate: { label: 'Driver with Basic Tools',    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', order: 2 },
  advanced_mechanic:   { label: 'Advanced Mechanical Step',   color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', order: 3 },
  shop_only:           { label: 'Shop Only',                  color: 'bg-red-500/20 text-red-400 border-red-500/30', order: 4 },
};

// ─── Driveability Assessment ────────────────────────────────────────

/**
 * Determine driveability from diagnostic context.
 * @param {object} diagContext
 * @returns {'ok'|'limited'|'stop_now'|'unknown'}
 */
export function assessDriveability(diagContext) {
  if (!diagContext) return 'unknown';

  // Telematics says unsafe
  if (diagContext.telematicsInterpretation?.overall_assessment?.safe_to_drive === false) {
    return 'stop_now';
  }

  // Check DTC severity
  const dtcs = diagContext.dtcAnalysis || [];
  if (dtcs.some(d => d.severity === 'critical' && d.immediate_action_required)) return 'stop_now';
  if (dtcs.some(d => d.severity === 'critical' || (d.severity === 'high' && d.can_drive === false))) return 'stop_now';
  if (dtcs.some(d => d.severity === 'high')) return 'limited';
  if (dtcs.some(d => d.severity === 'medium')) return 'limited';

  // Issue keywords
  const issueStr = (diagContext.issueDescription || '').toLowerCase();
  const stopKeywords = ['overheating', 'no oil pressure', 'smoke from engine', 'brake failure', 'steering locked', 'fire', 'won\'t stop', 'runaway'];
  const limitedKeywords = ['derate', 'limp mode', 'check engine', 'low power', 'intermittent'];

  if (stopKeywords.some(k => issueStr.includes(k))) return 'stop_now';
  if (limitedKeywords.some(k => issueStr.includes(k))) return 'limited';

  if (diagContext.diagnosticProgress?.stage === 'solution' && dtcs.length === 0) return 'ok';

  return 'unknown';
}

// ─── Urgency Assessment ─────────────────────────────────────────────

/**
 * @param {object} diagContext
 * @returns {'critical'|'high'|'medium'|'low'|'unknown'}
 */
export function assessUrgency(diagContext) {
  if (!diagContext) return 'unknown';

  const drive = assessDriveability(diagContext);
  if (drive === 'stop_now') return 'critical';

  const dtcs = diagContext.dtcAnalysis || [];
  if (dtcs.some(d => d.severity === 'critical')) return 'critical';
  if (dtcs.some(d => d.severity === 'high')) return 'high';
  if (dtcs.some(d => d.severity === 'medium')) return 'medium';

  if (drive === 'limited') return 'high';
  if (dtcs.length > 0) return 'medium';

  return 'low';
}

// ─── Issue Category Detection ───────────────────────────────────────

/**
 * Detect issue category from codes, symptoms, description.
 * @returns {string} category key
 */
export function detectIssueCategory(diagContext) {
  if (!diagContext) return 'general';

  const combined = [
    diagContext.issueDescription || '',
    ...(diagContext.symptoms || []),
    ...(diagContext.errorCodes || []),
    ...(diagContext.dtcAnalysis || []).map(d => `${d.code} ${d.description}`),
  ].join(' ').toLowerCase();

  const patterns = [
    { cat: 'aftertreatment', words: ['dpf', 'def', 'scr', 'aftertreatment', 'regen', 'nox', 'soot', 'diesel exhaust fluid'] },
    { cat: 'overheating', words: ['overheat', 'coolant temp', 'radiator', 'water pump', 'thermostat', 'coolant leak'] },
    { cat: 'coolant', words: ['coolant', 'antifreeze', 'water leak', 'hose leak'] },
    { cat: 'tire', words: ['tire', 'flat', 'blowout', 'tpms', 'wheel end', 'hub'] },
    { cat: 'brakes', words: ['brake', 'air brake', 'abs', 'parking brake', 'compressor', 'air leak'] },
    { cat: 'electrical', words: ['battery', 'alternator', 'wiring', 'fuse', 'relay', 'no start electrical', 'voltage'] },
    { cat: 'starting', words: ['won\'t start', 'no crank', 'no start', 'hard start', 'starter'] },
    { cat: 'transmission', words: ['transmission', 'shifting', 'clutch', 'gear', 'driveline'] },
    { cat: 'engine', words: ['engine', 'misfire', 'knock', 'diesel', 'injector', 'turbo', 'low power', 'black smoke'] },
    { cat: 'exhaust', words: ['exhaust', 'emission', 'smoke'] },
    { cat: 'fuel', words: ['fuel', 'fuel filter', 'fuel pump', 'water in fuel'] },
    { cat: 'air_system', words: ['air system', 'air dryer', 'air compressor', 'air tank'] },
    { cat: 'trailer', words: ['trailer', 'landing gear', 'fifth wheel', 'kingpin'] },
    { cat: 'reefer', words: ['reefer', 'refrigerat', 'thermo king', 'carrier reefer'] },
    { cat: 'steering', words: ['steering', 'power steering', 'tie rod'] },
    { cat: 'suspension', words: ['suspension', 'leaf spring', 'air ride', 'shock'] },
    { cat: 'driveline', words: ['driveshaft', 'u-joint', 'yoke', 'differential'] },
  ];

  for (const { cat, words } of patterns) {
    if (words.some(w => combined.includes(w))) return cat;
  }

  return 'general';
}

// ─── Recommended Next Step ──────────────────────────────────────────

/**
 * Compute the recommended next step summary.
 * @param {object} diagContext
 * @returns {{ action: string, description: string, type: 'stop_now'|'tow'|'mobile_repair'|'drive_short'|'inspect_first'|'safe_parking'|'continue_cautious', serviceTypes: string[] }}
 */
export function computeNextStep(diagContext) {
  const driveability = assessDriveability(diagContext);
  const urgency = assessUrgency(diagContext);
  const category = detectIssueCategory(diagContext);
  const serviceTypes = ISSUE_SERVICE_MAP[category] || ISSUE_SERVICE_MAP.general;

  if (driveability === 'stop_now') {
    return {
      action: 'Stop driving and get emergency help',
      description: 'Your issue indicates it is unsafe to continue driving. Pull over safely, turn off the engine if needed, and call for towing or mobile repair immediately.',
      type: 'stop_now',
      serviceTypes: ['towing_heavy_duty', 'mobile_mechanic', 'truck_parking', ...serviceTypes],
    };
  }

  if (urgency === 'critical') {
    return {
      action: 'Stop driving and call heavy-duty towing',
      description: 'A critical fault has been detected. Do not continue driving. Arrange towing to the nearest qualified heavy-duty repair facility.',
      type: 'tow',
      serviceTypes: ['towing_heavy_duty', 'truck_parking', ...serviceTypes],
    };
  }

  if (driveability === 'limited') {
    // Check if basic inspection might help
    const inspectableCategories = ['electrical', 'starting', 'coolant', 'air_system', 'aftertreatment'];
    if (inspectableCategories.includes(category)) {
      return {
        action: 'Perform a basic inspection first, then decide',
        description: `Your truck has limited driveability. Before calling for service, perform the safe driver checks below — a simple inspection may reveal an easy fix or confirm you need professional help.`,
        type: 'inspect_first',
        serviceTypes,
      };
    }

    return {
      action: 'Drive only a short distance to the nearest matching shop',
      description: 'Your truck can move but with limited capability. Find the nearest qualified heavy-duty repair within a short distance. Avoid highway speeds and heavy loads.',
      type: 'drive_short',
      serviceTypes,
    };
  }

  if (urgency === 'high') {
    return {
      action: 'Seek repair soon — avoid delaying',
      description: 'The issue is significant. Drive carefully to the nearest matching repair shop. Do not ignore the symptoms.',
      type: 'drive_short',
      serviceTypes,
    };
  }

  if (urgency === 'medium') {
    return {
      action: 'Perform a basic inspection first, then decide',
      description: 'Before spending on repair, complete the safe driver checks below. A simple inspection may prevent unnecessary towing or parts replacement.',
      type: 'inspect_first',
      serviceTypes,
    };
  }

  // Low urgency or unknown
  return {
    action: 'Continue with caution after completing basic checks',
    description: 'The issue appears manageable. Complete the recommended checks and monitor. Schedule service at your next convenient stop.',
    type: 'continue_cautious',
    serviceTypes,
  };
}

// ─── Driver Action Templates ────────────────────────────────────────

/**
 * Get recommended driver actions for a given issue category.
 * @param {string} category
 * @param {string} driveability
 * @returns {import('./getHelpNowModels').DriverAction[]}
 */
export function getDriverActions(category, driveability) {
  const actions = [];

  // Universal safety stop if needed
  if (driveability === 'stop_now') {
    actions.push({
      id: 'stop_engine',
      title: 'Pull over and stop the engine',
      description: 'Find a safe spot off the road. Engage parking brake. Turn off the engine. Activate hazard lights.',
      actionType: 'stop_and_call',
      difficulty: 'driver_basic',
      safeIfStationary: true,
      roadsidePossible: true,
      requiresTools: false,
      requiresParts: false,
      notSafeWithoutTraining: false,
      estimatedMinutes: 2,
      costSavingPotential: 'high',
      downtimeReductionPotential: 'high',
      steps: ['Pull off the road to a safe location', 'Engage the parking brake', 'Turn off the engine', 'Turn on hazard flashers', 'Place reflective triangles if available'],
      warnings: ['Do not continue driving if engine is overheating or losing oil pressure', 'Stay away from traffic'],
      linkedIssueTypes: ['*'],
    });
  }

  const categoryActions = DRIVER_ACTION_TEMPLATES[category] || DRIVER_ACTION_TEMPLATES.general;
  actions.push(...categoryActions);

  return actions;
}

/** @type {Record<string, import('./getHelpNowModels').DriverAction[]>} */
const DRIVER_ACTION_TEMPLATES = {
  engine: [
    {
      id: 'check_oil_level',
      title: 'Check engine oil level',
      description: 'With the engine off and on level ground, pull the dipstick and verify the oil level is between the marks.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 3, costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Turn off engine, wait 2 minutes', 'Open hood', 'Pull dipstick, wipe, re-insert, pull again', 'Check level — add oil if critically low'],
      warnings: ['Hot surfaces under hood', 'Do not overfill'],
      linkedIssueTypes: ['engine'],
    },
    {
      id: 'check_coolant_level',
      title: 'Check coolant level (engine off & cool)',
      description: 'ONLY when engine is cool. Check the coolant reservoir or radiator cap indicator.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 3, costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Wait for engine to cool', 'Check coolant reservoir level', 'Look for visible leaks around hoses and connections'],
      warnings: ['NEVER open radiator cap on a hot engine — risk of severe burns', 'Coolant is toxic — avoid skin and eye contact'],
      linkedIssueTypes: ['engine', 'overheating', 'coolant'],
    },
    {
      id: 'listen_for_noises',
      title: 'Listen for unusual engine noises',
      description: 'With engine idling, listen for knocking, squealing, hissing, or grinding. Note when noises occur (idle, acceleration, specific RPM).',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 3, costSavingPotential: 'low', downtimeReductionPotential: 'low',
      steps: ['Start engine at idle', 'Walk around truck listening', 'Note specific sounds and location', 'Rev engine briefly — note changes'],
      warnings: ['Keep hands and clothing away from moving parts'],
      linkedIssueTypes: ['engine'],
    },
  ],
  electrical: [
    {
      id: 'check_battery_terminals',
      title: 'Check battery terminal connections',
      description: 'Inspect battery terminals for corrosion, loose connections, or damage. Loose terminals are a common cause of no-start and electrical issues.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 5, costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Open battery compartment', 'Visually inspect terminals for corrosion or looseness', 'Try to wiggle connections gently', 'If loose, hand-tighten if possible'],
      warnings: ['Do not short-circuit terminals with metal tools', 'Wear gloves if corroded'],
      linkedIssueTypes: ['electrical', 'starting'],
    },
    {
      id: 'check_fuses',
      title: 'Check fuse panel for blown fuses',
      description: 'Locate the fuse panel and visually check for any clearly blown fuses related to the failing system.',
      actionType: 'inspect',
      difficulty: 'driver_intermediate',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: true, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 10, costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Locate fuse panel (check owner manual)', 'Identify fuses for the affected circuit', 'Pull suspect fuse and inspect for broken element', 'Replace with same-amperage fuse if available'],
      warnings: ['Never install a higher-amperage fuse — fire risk'],
      linkedIssueTypes: ['electrical'],
    },
  ],
  starting: [
    {
      id: 'check_battery_starting',
      title: 'Check battery voltage and connections',
      description: 'A dead or weak battery is the #1 cause of no-start. Check terminals and listen for the starter clicking.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 5, costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Turn key — does the starter click or crank slowly?', 'Check battery terminals for corrosion', 'Check if lights/dash are dim (weak battery sign)', 'If equipped, check battery disconnect switch position'],
      warnings: [],
      linkedIssueTypes: ['starting', 'electrical'],
    },
    {
      id: 'check_fuel_supply',
      title: 'Check fuel level and fuel shutoff',
      description: 'Verify you have adequate fuel and the fuel shutoff valve is open.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 3, costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Check fuel gauge', 'Verify fuel shutoff valve is in ON position', 'Check for fuel leaks under truck visually'],
      warnings: ['No open flames near fuel system'],
      linkedIssueTypes: ['starting', 'fuel'],
    },
  ],
  overheating: [
    {
      id: 'stop_if_overheating',
      title: 'Stop engine immediately if overheating',
      description: 'Continuing to drive while overheating can cause catastrophic engine damage. Pull over and shut down.',
      actionType: 'stop_and_call',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 2, costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Pull over safely', 'Turn off engine', 'Open hood carefully', 'DO NOT open radiator cap', 'Let engine cool 30+ minutes'],
      warnings: ['NEVER open the radiator cap on a hot engine', 'Steam and hot coolant cause severe burns', 'Let engine cool completely before inspection'],
      linkedIssueTypes: ['overheating', 'coolant'],
    },
    {
      id: 'check_coolant_visual',
      title: 'Visually check for coolant leaks (when cool)',
      description: 'After cooling, look under the truck and around hoses for green/orange coolant puddles or wet spots.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 10, costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Wait until engine is cool', 'Look under truck for puddles', 'Inspect hose connections for wet spots', 'Check coolant reservoir level'],
      warnings: ['Coolant is toxic and slippery', 'Do not go under a hot truck'],
      linkedIssueTypes: ['overheating', 'coolant'],
    },
  ],
  coolant: [
    {
      id: 'check_coolant_visual_2',
      title: 'Check coolant level and look for leaks',
      description: 'Check the coolant reservoir and look under the truck for visible leaks.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 5, costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Check coolant reservoir level', 'Look under truck for puddles or wet spots', 'Inspect visible hoses for cracks or loose clamps'],
      warnings: ['Do not open radiator cap when engine is warm'],
      linkedIssueTypes: ['coolant', 'overheating'],
    },
    {
      id: 'tighten_hose_clamp',
      title: 'Tighten loose coolant hose clamp',
      description: 'If you can see a loose hose clamp causing a small leak, tightening it may stop the leak temporarily.',
      actionType: 'temporary_fix',
      difficulty: 'driver_intermediate',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: true, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 10, costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Engine must be OFF and COOL', 'Locate the loose clamp', 'Use pliers or screwdriver to tighten', 'Check for improvement after brief idle'],
      warnings: ['Only attempt on cool engine', 'If hose is cracked/split, clamp won\'t help — call for service'],
      linkedIssueTypes: ['coolant'],
    },
  ],
  brakes: [
    {
      id: 'check_air_pressure',
      title: 'Check air system pressure on dash gauge',
      description: 'Low air pressure means brake issues. Note the PSI reading and whether the compressor is running continuously.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 2, costSavingPotential: 'low', downtimeReductionPotential: 'low',
      steps: ['Check dash air pressure gauge', 'Normal is 100-120 PSI', 'If below 60 PSI, do NOT drive', 'Listen for air leaks (hissing sounds)'],
      warnings: ['Do NOT drive with low air pressure — spring brakes will lock', 'Brake failure is life-threatening'],
      linkedIssueTypes: ['brakes', 'air_system'],
    },
    {
      id: 'listen_air_leaks',
      title: 'Listen for air leaks',
      description: 'With engine off and brakes charged, walk around and listen for hissing. A significant air leak needs immediate repair.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 5, costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Build full air pressure', 'Turn off engine', 'Walk around truck and trailer', 'Listen at each wheel, connections, and air lines', 'Check air dryer and gladhands'],
      warnings: ['Do not attempt to repair air brake components roadside without training'],
      linkedIssueTypes: ['brakes', 'air_system'],
    },
  ],
  tire: [
    {
      id: 'check_tire_visual',
      title: 'Visual tire inspection',
      description: 'Walk around and check all tires for flats, bulges, tread depth, and damage. Use a tire thumper if available.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 10, costSavingPotential: 'low', downtimeReductionPotential: 'medium',
      steps: ['Walk around entire vehicle', 'Check each tire for low/flat condition', 'Tap tires with thumper to check pressure', 'Look for bulges, cuts, or exposed cord', 'Check lug nuts for looseness'],
      warnings: ['Stay on the shoulder side away from traffic', 'Do not drive on a flat — rim damage and blowout risk'],
      linkedIssueTypes: ['tire'],
    },
  ],
  aftertreatment: [
    {
      id: 'check_def_level',
      title: 'Check DEF fluid level',
      description: 'Low DEF causes derating. Check DEF tank level and top off if you have DEF available.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 5, costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Check DEF level gauge on dash', 'Open DEF filler cap and visually verify', 'Add DEF if available and below 1/4 tank', 'Quality DEF should be clear — if discolored, don\'t add'],
      warnings: ['DEF is not fuel — do not mix', 'Contaminated DEF must be drained by shop'],
      linkedIssueTypes: ['aftertreatment', 'exhaust'],
    },
    {
      id: 'attempt_parked_regen',
      title: 'Attempt a parked DPF regeneration',
      description: 'If the DPF is clogged and your truck allows parked regen, this may clear the issue and avoid a tow.',
      actionType: 'temporary_fix',
      difficulty: 'driver_intermediate',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 45, costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Park in open area away from buildings and fuel', 'Apply parking brake', 'Ensure DEF is adequate', 'Follow your truck\'s regen procedure (usually hold button or use dash menu)', 'Let it run 20-45 minutes — do not interrupt'],
      warnings: ['Exhaust temperatures are extremely high during regen', 'Park away from anything flammable', 'Do not park on grass or near fuel pumps'],
      linkedIssueTypes: ['aftertreatment'],
    },
  ],
  fuel: [
    {
      id: 'check_fuel_filter',
      title: 'Check fuel/water separator',
      description: 'Water in fuel causes rough running and stalling. Drain the water separator bowl if equipped.',
      actionType: 'inspect',
      difficulty: 'driver_intermediate',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: true, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 10, costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Locate fuel filter / water separator', 'Place container under drain', 'Open petcock and drain water', 'Close once clear fuel flows', 'Crank engine and check for improvement'],
      warnings: ['Fuel is flammable — no smoking or open flames', 'Dispose of fuel properly'],
      linkedIssueTypes: ['fuel', 'engine'],
    },
  ],
  air_system: [
    {
      id: 'check_air_dryer',
      title: 'Listen to air dryer and compressor cycle',
      description: 'An air dryer that purges constantly or a compressor that never stops can indicate leaks or dryer failure.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 5, costSavingPotential: 'low', downtimeReductionPotential: 'low',
      steps: ['Start engine', 'Listen to compressor — does it run nonstop?', 'Listen for regular purge cycles from air dryer', 'Check if air pressure builds to normal (100+ PSI)'],
      warnings: ['Low air pressure = brake safety risk'],
      linkedIssueTypes: ['air_system', 'brakes'],
    },
  ],
  trailer: [
    {
      id: 'trailer_visual',
      title: 'Walk-around trailer inspection',
      description: 'Check trailer lights, tires, air lines, and landing gear. Look for obvious damage or disconnections.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 10, costSavingPotential: 'low', downtimeReductionPotential: 'medium',
      steps: ['Check all trailer lights', 'Inspect tires and wheels', 'Check air and electrical connections', 'Inspect landing gear', 'Look for leaks or damage'],
      warnings: ['Watch for traffic around trailer'],
      linkedIssueTypes: ['trailer'],
    },
  ],
  general: [
    {
      id: 'general_walk_around',
      title: 'Perform a basic walk-around inspection',
      description: 'Walk around the truck checking for visible leaks, damage, loose components, or warning signs.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 10, costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Walk around entire vehicle', 'Check for fluid leaks under truck', 'Look at all tires', 'Check lights and connections', 'Listen for unusual sounds', 'Note any warning lights on dash'],
      warnings: ['Stay clear of traffic'],
      linkedIssueTypes: ['general'],
    },
    {
      id: 'check_dash_warnings',
      title: 'Document all dashboard warning lights',
      description: 'Note which warning lights and messages are active. Take a photo if possible — this helps mechanics diagnose faster.',
      actionType: 'inspect',
      difficulty: 'driver_basic',
      safeIfStationary: true, roadsidePossible: true,
      requiresTools: false, requiresParts: false, notSafeWithoutTraining: false,
      estimatedMinutes: 3, costSavingPotential: 'low', downtimeReductionPotential: 'low',
      steps: ['Turn key to ON without starting', 'Note all lit warning lights', 'Check for text messages on display', 'Take a photo of dash for reference'],
      warnings: [],
      linkedIssueTypes: ['general'],
    },
  ],
};

// ─── Service Ranking ────────────────────────────────────────────────

/**
 * Score and sort service results based on issue context.
 * @param {object[]} services - raw service results
 * @param {object} diagContext - issue context
 * @returns {object[]} scored + sorted services with issueMatchScore and issueMatchReasons
 */
export function rankServices(services, diagContext) {
  const category = detectIssueCategory(diagContext);
  const driveability = assessDriveability(diagContext);
  const urgency = assessUrgency(diagContext);
  const preferredTypes = ISSUE_SERVICE_MAP[category] || ISSUE_SERVICE_MAP.general;

  return services.map(svc => {
    let score = 0;
    const reasons = [];

    // 1. Issue type match (0-30)
    const svcType = svc.type || '';
    if (preferredTypes.includes(svcType)) {
      const idx = preferredTypes.indexOf(svcType);
      score += 30 - idx * 5;
      reasons.push(`Matches ${category} issue`);
    }

    // 2. Safety match for driveability (0-20)
    if (driveability === 'stop_now') {
      if (['towing_heavy_duty', 'mobile_mechanic'].includes(svcType)) { score += 20; reasons.push('Emergency service'); }
      if (svcType === 'truck_parking') { score += 15; reasons.push('Safe stopping point'); }
    } else if (driveability === 'limited') {
      if (svc.distanceMiles != null && svc.distanceMiles <= 15) { score += 15; reasons.push('Within limited-drive range'); }
      else if (svc.distanceMiles != null && svc.distanceMiles <= 30) { score += 10; reasons.push('Reachable with caution'); }
    }

    // 3. Heavy-duty confidence (0-15)
    const hdConf = svc.heavyDutyConfidence || 'low';
    if (hdConf === 'high') { score += 15; reasons.push('Confirmed heavy-duty'); }
    else if (hdConf === 'medium') { score += 8; reasons.push('Likely heavy-duty'); }

    // 4. Correct service type for situation (0-10)
    if (urgency === 'critical' && ['towing_heavy_duty', 'mobile_mechanic'].includes(svcType)) {
      score += 10;
    }
    if (svc.mobileAvailable && driveability !== 'ok') {
      score += 5; reasons.push('Mobile service available');
    }

    // 5. Open now / 24-7 (0-10)
    if (svc.isOpenNow) { score += 7; reasons.push('Open now'); }
    if (svc.is24Hours) { score += 10; reasons.push('24/7 availability'); }

    // 6. Distance penalty (closer is better, 0-10)
    if (svc.distanceMiles != null) {
      if (svc.distanceMiles <= 5) score += 10;
      else if (svc.distanceMiles <= 15) score += 7;
      else if (svc.distanceMiles <= 30) score += 4;
      else if (svc.distanceMiles <= 50) score += 1;
    }

    // 7. Rating bonus (0-5)
    if (svc.rating >= 4.5) score += 5;
    else if (svc.rating >= 4.0) score += 3;
    else if (svc.rating >= 3.5) score += 1;

    // 8. Dealer OEM relevance
    if (svc.dealerAffiliation === 'oem_dealer' && diagContext.truckMake) {
      const svcNameLower = (svc.name || '').toLowerCase();
      if (svcNameLower.includes(diagContext.truckMake.toLowerCase())) {
        score += 8; reasons.push(`${diagContext.truckMake} dealer`);
      }
    }

    // 9. Phone available (for "call first" readiness)
    if (svc.phone) { score += 2; reasons.push('Phone available'); }

    return {
      ...svc,
      issueMatchScore: score,
      issueMatchReasons: reasons,
    };
  }).sort((a, b) => b.issueMatchScore - a.issueMatchScore);
}

// ─── Service Result Normalization ───────────────────────────────────

/**
 * Normalize a raw Places API result into the enriched service model.
 * @param {object} raw - raw result from places-search API
 * @param {object|null} diagContext - optional diagnostic context
 * @returns {object} normalized service result
 */
export function normalizeServiceResult(raw, diagContext = null) {
  const name = (raw.name || '').toLowerCase();
  const specialties = raw.specialties || [];
  const specStr = specialties.join(' ').toLowerCase();

  // Determine heavy-duty confidence
  const hdKeywords = ['heavy duty', 'truck', 'diesel', 'semi', 'commercial vehicle', 'fleet', 'freightliner', 'peterbilt', 'kenworth', 'volvo trucks', 'mack'];
  const nameAndSpec = `${name} ${specStr}`;
  let heavyDutyConfidence = 'low';
  const hdMatches = hdKeywords.filter(k => nameAndSpec.includes(k));
  if (hdMatches.length >= 2) heavyDutyConfidence = 'high';
  else if (hdMatches.length === 1) heavyDutyConfidence = 'medium';

  // Detect service subtype
  let type = raw.type || 'repair';
  const subtype = raw.subtype || null;
  let mobileAvailable = false;
  let towingAvailable = false;
  let dealerAffiliation = 'unknown';

  if (name.includes('mobile') || specStr.includes('mobile')) mobileAvailable = true;
  if (name.includes('tow') || specStr.includes('towing') || type === 'towing') towingAvailable = true;
  if (name.includes('dealer') || specStr.includes('dealer')) dealerAffiliation = 'oem_dealer';
  else if (heavyDutyConfidence === 'high') dealerAffiliation = 'independent';

  // Map basic types to richer taxonomy
  if (type === 'towing') type = 'towing_heavy_duty';
  if (type === 'parking') type = 'truck_stop';

  // Check for 24/7 / open now
  const isOpenNow = raw.isOpenNow ?? (raw.is24Hours ? true : undefined);

  return {
    id: raw.id,
    name: raw.name || 'Unknown',
    type,
    subtype,
    lat: raw.lat,
    lng: raw.lng,
    address: raw.address || '',
    phone: raw.phone || '',
    website: raw.website || '',
    distanceMiles: raw.distance ?? raw.distanceMiles ?? null,
    rating: raw.rating || 0,
    reviewsCount: raw.reviews || raw.reviewsCount || 0,
    is24Hours: raw.is24Hours || false,
    hoursText: raw.hours || '',
    isOpenNow,
    heavyDutyConfidence,
    issueMatchScore: 0,
    issueMatchReasons: [],
    supportsTractor: true,
    supportsTrailer: type === 'trailer_repair' || heavyDutyConfidence !== 'low',
    mobileAvailable,
    towingAvailable,
    dealerAffiliation,
    sourceType: raw.ai_generated ? 'internal_enriched' : 'places_api',
    specialties: raw.specialties || [],
    notes: [],
  };
}

// ─── Group Services into Sections ───────────────────────────────────

/**
 * Group ranked services into display sections.
 * @param {object[]} rankedServices - services already scored and sorted
 * @param {object} diagContext
 * @returns {{ title: string, key: string, services: object[] }[]}
 */
export function groupServiceSections(rankedServices, diagContext) {
  const driveability = assessDriveability(diagContext);
  const urgency = assessUrgency(diagContext);
  const sections = [];

  const bestMatch = rankedServices.filter(s => s.issueMatchScore >= 20);
  const emergency = rankedServices.filter(s =>
    ['towing_heavy_duty', 'mobile_mechanic'].includes(s.type) || s.is24Hours
  );
  const openNow = rankedServices.filter(s => s.isOpenNow || s.is24Hours);
  const parking = rankedServices.filter(s => ['truck_parking', 'truck_stop'].includes(s.type));
  const backup = rankedServices.filter(s => s.issueMatchScore < 20 && !['truck_parking', 'truck_stop'].includes(s.type));

  if (bestMatch.length > 0) {
    sections.push({ title: 'Best Match for This Issue', key: 'best_match', services: bestMatch.slice(0, 8) });
  }

  if ((urgency === 'critical' || urgency === 'high' || driveability === 'stop_now') && emergency.length > 0) {
    sections.push({ title: 'Help Right Now', key: 'help_now', services: emergency.slice(0, 6) });
  }

  if (openNow.length > 0) {
    sections.push({ title: 'Open Now / 24-7', key: 'open_now', services: openNow.slice(0, 6) });
  }

  if ((driveability === 'stop_now' || driveability === 'limited') && parking.length > 0) {
    sections.push({ title: 'Safe Parking Nearby', key: 'safe_parking', services: parking.slice(0, 4) });
  }

  if (backup.length > 0) {
    sections.push({ title: 'Backup Options', key: 'backup', services: backup.slice(0, 6) });
  }

  // Deduplicate: if a service already appeared up top, don't repeat below
  const seen = new Set();
  return sections.map(section => {
    const unique = section.services.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    return { ...section, services: unique };
  }).filter(s => s.services.length > 0);
}
