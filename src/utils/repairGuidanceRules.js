/**
 * Repair Guidance Rules — rule-based foundation
 *
 * Central rule/config layer that maps issue categories to structured
 * guidance actions across all product areas (Diagnosis, Parts, Get Help Now).
 *
 * Each action follows the RepairGuidanceAction shape (see JSDoc below).
 */

// ─── Difficulty Levels ──────────────────────────────────────────────

/** @enum {string} */
export const DIFFICULTY = {
  DRIVER_BASIC:        'driver_basic',
  DRIVER_INTERMEDIATE: 'driver_intermediate',
  ADVANCED_MECHANIC:   'advanced_mechanic',
  SHOP_ONLY:           'shop_only',
};

export const DIFFICULTY_LABELS = {
  driver_basic:        'Driver Basic',
  driver_intermediate: 'Driver with Basic Tools',
  advanced_mechanic:   'Advanced Mechanical Step',
  shop_only:           'Shop Only',
};

export const DIFFICULTY_CONFIG = {
  driver_basic:        { label: 'Driver Basic',              color: 'bg-green-500/20 text-green-400 border-green-500/30', order: 1 },
  driver_intermediate: { label: 'Driver with Basic Tools',   color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', order: 2 },
  advanced_mechanic:   { label: 'Advanced Mechanical Step',  color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', order: 3 },
  shop_only:           { label: 'Shop Only',                 color: 'bg-red-500/20 text-red-400 border-red-500/30', order: 4 },
};

// ─── Safety Levels ──────────────────────────────────────────────────

/** @enum {string} */
export const SAFETY = {
  SAFE_IF_STATIONARY: 'safe_if_stationary',
  CAUTION:            'caution',
  HIGH_RISK:          'high_risk',
  NOT_FOR_DRIVER:     'not_for_driver',
};

export const SAFETY_LABELS = {
  safe_if_stationary: 'Safe if parked',
  caution:            'Use caution',
  high_risk:          'High risk',
  not_for_driver:     'Do not attempt',
};

export const SAFETY_CONFIG = {
  safe_if_stationary: { label: 'Safe if parked',   color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: 'shield-check' },
  caution:            { label: 'Use caution',       color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: 'alert-triangle' },
  high_risk:          { label: 'High risk',         color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: 'alert-circle' },
  not_for_driver:     { label: 'Do not attempt',    color: 'bg-red-600/20 text-red-300 border-red-600/30', icon: 'ban' },
};

// ─── Action Categories (Guidance Buckets) ───────────────────────────

/** @enum {string} */
export const CATEGORY = {
  INSPECT:       'inspect',
  TEMPORARY_FIX: 'temporary_fix',
  MITIGATION:    'mitigation',
  ESCALATE:      'escalate',
  WARNING:       'warning',
};

export const BUCKET_ORDER = ['inspect', 'warning', 'temporary_fix', 'mitigation', 'escalate'];

export const BUCKET_CONFIG = {
  inspect:       { title: 'Check First',            icon: 'search',        color: 'border-blue-500/30 bg-blue-500/5',   headerColor: 'text-blue-400' },
  temporary_fix: { title: 'Temporary Mitigation',   icon: 'wrench',        color: 'border-yellow-500/30 bg-yellow-500/5', headerColor: 'text-yellow-400' },
  mitigation:    { title: 'Temporary Mitigation',   icon: 'wrench',        color: 'border-yellow-500/30 bg-yellow-500/5', headerColor: 'text-yellow-400' },
  warning:       { title: 'Do Not Do This',         icon: 'alert-octagon', color: 'border-red-500/30 bg-red-500/5',     headerColor: 'text-red-400' },
  escalate:      { title: 'Escalate Now',           icon: 'phone-call',    color: 'border-orange-500/30 bg-orange-500/5', headerColor: 'text-orange-400' },
};

// ─── Action Types ───────────────────────────────────────────────────

/** @enum {string} */
export const ACTION_TYPE = {
  CHECK:             'check',
  DO_NOW:            'do_now',
  AVOID:             'avoid',
  CALL:              'call',
  DRIVE_CAUTIOUSLY:  'drive_cautiously',
  STOP_NOW:          'stop_now',
};

// ─── Outcome Labels ─────────────────────────────────────────────────

export const OUTCOME_LABELS = {
  reduce_downtime:       'May reduce downtime',
  avoid_towing:          'May avoid unnecessary towing',
  avoid_parts_waste:     'May avoid unnecessary parts replacement',
  temporary_only:        'Temporary only',
  must_escalate:         'Must escalate if unresolved',
};

// ─── Issue Categories ───────────────────────────────────────────────

export const ISSUE_CATEGORIES = [
  'aftertreatment_emissions',
  'coolant_overheat',
  'tire_wheel_end',
  'battery_charging_electrical',
  'air_brake',
  'fuel_delivery',
  'trailer_electrical',
  'suspension',
  'steering',
  'transmission',
  'driveline',
  'starting',
  'engine',
  'exhaust',
  'reefer',
  'unknown_engine_fault',
  'general',
];

/**
 * Maps issue categories used in getHelpNowService to guidance rule keys.
 * The guidance system uses a wider set of categories; this bridges them.
 */
export const CATEGORY_ALIAS = {
  aftertreatment:             'aftertreatment_emissions',
  overheating:                'coolant_overheat',
  coolant:                    'coolant_overheat',
  tire:                       'tire_wheel_end',
  electrical:                 'battery_charging_electrical',
  brakes:                     'air_brake',
  air_system:                 'air_brake',
  fuel:                       'fuel_delivery',
  trailer:                    'trailer_electrical',
  driveline:                  'driveline',
  steering:                   'steering',
  transmission:               'transmission',
  starting:                   'starting',
  engine:                     'engine',
  exhaust:                    'aftertreatment_emissions',
  reefer:                     'reefer',
  suspension:                 'suspension',
  general:                    'general',
};

/**
 * @typedef {Object} RepairGuidanceAction
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'inspect'|'temporary_fix'|'mitigation'|'escalate'|'warning'} category
 * @property {'check'|'do_now'|'avoid'|'call'|'drive_cautiously'|'stop_now'} actionType
 * @property {'driver_basic'|'driver_intermediate'|'advanced_mechanic'|'shop_only'} difficulty
 * @property {'safe_if_stationary'|'caution'|'high_risk'|'not_for_driver'} safetyLevel
 * @property {boolean} [roadsidePossible]
 * @property {boolean} [safeIfStationary]
 * @property {boolean} [requiresTools]
 * @property {boolean} [requiresParts]
 * @property {boolean} [notSafeWithoutTraining]
 * @property {number} [estimatedMinutes]
 * @property {'low'|'medium'|'high'} [costSavingPotential]
 * @property {'low'|'medium'|'high'} [downtimeReductionPotential]
 * @property {string[]} [linkedIssueTypes]
 * @property {string[]} [linkedFaultCodes]
 * @property {string[]} [linkedPartCategories]
 * @property {string[]} [warnings]
 * @property {string[]} [steps]
 * @property {string} [stopCondition]
 * @property {string} [successSignal]
 * @property {string} [escalationTrigger]
 * @property {'rule_based'|'diagnosis_generated'|'parts_generated'|'service_generated'} [source]
 */

// ─── Issue Category → Guidance Rules ────────────────────────────────

/**
 * Master rule table. Each issue category maps to an array of RepairGuidanceAction objects.
 * Actions in each category are ordered by priority (safety-first, then checks, then mitigations, then escalations).
 * @type {Record<string, RepairGuidanceAction[]>}
 */
export const GUIDANCE_RULES = {

  // ═══ AFTERTREATMENT / EMISSIONS ═══════════════════════════════════
  aftertreatment_emissions: [
    {
      id: 'at_check_def_level',
      title: 'Check DEF fluid level',
      description: 'Low DEF causes derating. Check DEF tank level and top off if available.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false, requiresParts: false,
      estimatedMinutes: 5,
      costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Check DEF level gauge on dash', 'Open DEF filler cap and visually verify', 'Add DEF if available and below 1/4 tank', 'Quality DEF should be clear — if discolored, do not add'],
      warnings: ['DEF is not fuel — do not mix', 'Contaminated DEF must be drained by shop'],
      successSignal: 'DEF level rises to adequate range; derate warning clears after driving',
      escalationTrigger: 'DEF is full but derate persists — likely sensor or dosing issue',
      linkedIssueTypes: ['aftertreatment_emissions'],
      linkedPartCategories: ['sensors', 'exhaust'],
      source: 'rule_based',
    },
    {
      id: 'at_check_connector_harness',
      title: 'Inspect NOx/DEF sensor connector and harness',
      description: 'Common cause of aftertreatment codes is a corroded or loose connector — not a failed sensor. Check connector before replacing.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false, requiresParts: false,
      estimatedMinutes: 10,
      costSavingPotential: 'high', downtimeReductionPotential: 'medium',
      steps: ['Locate NOx or DEF sensor connector (usually near exhaust pipe or DEF tank)', 'Inspect for corrosion, moisture, or loose pins', 'Unplug and replug connector firmly', 'Check harness for visible damage, chafing, or melting'],
      warnings: ['Exhaust components may be hot — let engine cool first'],
      successSignal: 'Code clears after reconnecting — connector was the root cause',
      escalationTrigger: 'Connector looks clean and secure — sensor or dosing unit may need replacement',
      linkedIssueTypes: ['aftertreatment_emissions'],
      linkedPartCategories: ['sensors'],
      source: 'rule_based',
    },
    {
      id: 'at_attempt_regen',
      title: 'Attempt a parked DPF regeneration',
      description: 'If DPF is clogged and truck allows parked regen, this may clear the issue and avoid a tow.',
      category: 'temporary_fix', actionType: 'do_now',
      difficulty: 'driver_intermediate', safetyLevel: 'caution',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false, requiresParts: false,
      estimatedMinutes: 45,
      costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Park in open area away from buildings and fuel', 'Apply parking brake', 'Ensure DEF is adequate', 'Follow truck regen procedure (dash menu or hold button)', 'Let it run 20–45 min — do not interrupt'],
      warnings: ['Exhaust temperatures extremely high during regen', 'Park away from anything flammable', 'Do not park on grass or near fuel pumps'],
      stopCondition: 'Regen completes and soot level drops',
      successSignal: 'DPF soot level returns to normal; derate clears',
      escalationTrigger: 'Regen fails to start or complete — forced regen by shop required',
      linkedIssueTypes: ['aftertreatment_emissions'],
      linkedPartCategories: ['exhaust', 'filters'],
      source: 'rule_based',
    },
    {
      id: 'at_warn_no_blind_replace',
      title: 'Do not replace sensors blindly',
      description: 'Aftertreatment sensor codes are frequently caused by connectors, harness damage, or DEF quality — not the sensor itself. Inspect first.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      notSafeWithoutTraining: true,
      costSavingPotential: 'high',
      warnings: ['NOx sensors cost $300–$800. Replacement without inspection wastes money.', 'Connector/harness issues are the #1 cause of false sensor codes.'],
      linkedIssueTypes: ['aftertreatment_emissions'],
      linkedPartCategories: ['sensors'],
      source: 'rule_based',
    },
    {
      id: 'at_escalate_shop',
      title: 'Go to emissions-capable heavy-duty shop',
      description: 'If derate persists after basic checks and regen attempt, go to a shop with aftertreatment diagnostics capability.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      requiresTools: true, requiresParts: true, notSafeWithoutTraining: true,
      costSavingPotential: 'low',
      escalationTrigger: 'Regen failed, DEF full, connectors clean — professional diagnosis needed',
      linkedIssueTypes: ['aftertreatment_emissions'],
      source: 'rule_based',
    },
  ],

  // ═══ COOLANT / OVERHEAT ═══════════════════════════════════════════
  coolant_overheat: [
    {
      id: 'co_stop_if_overheating',
      title: 'Stop engine immediately if overheating',
      description: 'Continuing to drive while overheating causes catastrophic engine damage. Pull over and shut down.',
      category: 'warning', actionType: 'stop_now',
      difficulty: 'driver_basic', safetyLevel: 'caution',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 2,
      costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Pull over safely', 'Turn off engine', 'Open hood carefully', 'DO NOT open radiator cap', 'Let engine cool 30+ minutes'],
      warnings: ['NEVER open radiator cap on a hot engine — severe burn risk', 'Steam and hot coolant cause serious injuries', 'Let engine cool completely before any inspection'],
      stopCondition: 'Engine off and cooling',
      escalationTrigger: 'Temperature does not drop — internal damage likely',
      linkedIssueTypes: ['coolant_overheat'],
      source: 'rule_based',
    },
    {
      id: 'co_check_coolant_visual',
      title: 'Visually check for coolant leaks (when cool)',
      description: 'After cooling, look under the truck and around hoses for green/orange coolant puddles or wet spots.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false, requiresParts: false,
      estimatedMinutes: 10,
      costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Wait until engine is cool', 'Look under truck for puddles', 'Inspect hose connections for wet spots', 'Check coolant reservoir level'],
      warnings: ['Coolant is toxic and slippery', 'Do not go under a hot truck'],
      successSignal: 'Leak found at specific hose or connection — can be reported to mechanic',
      linkedIssueTypes: ['coolant_overheat'],
      linkedPartCategories: ['cooling'],
      source: 'rule_based',
    },
    {
      id: 'co_tighten_hose_clamp',
      title: 'Tighten loose coolant hose clamp',
      description: 'If you can see a loose hose clamp causing a small leak, tightening it may stop the leak temporarily.',
      category: 'temporary_fix', actionType: 'do_now',
      difficulty: 'driver_intermediate', safetyLevel: 'caution',
      roadsidePossible: true, safeIfStationary: true, requiresTools: true, requiresParts: false,
      estimatedMinutes: 10,
      costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Engine must be OFF and COOL', 'Locate the loose clamp', 'Use pliers or screwdriver to tighten', 'Check for improvement after brief idle'],
      warnings: ['Only attempt on cool engine', 'If hose is cracked/split, clamp will not help — call for service'],
      successSignal: 'Leak stops or slows significantly',
      escalationTrigger: 'Hose itself is damaged or split — needs replacement',
      linkedIssueTypes: ['coolant_overheat'],
      linkedPartCategories: ['cooling'],
      source: 'rule_based',
    },
    {
      id: 'co_warn_no_drive_overheating',
      title: 'Do not continue driving if overheating',
      description: 'Driving while overheating can crack the head, warp the block, or seize the engine. Even a short distance can cause $10,000+ damage.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'driver_basic', safetyLevel: 'high_risk',
      warnings: ['Head gasket failure: $3,000–$8,000', 'Cracked block: engine replacement', 'Seized engine: total loss'],
      linkedIssueTypes: ['coolant_overheat'],
      source: 'rule_based',
    },
    {
      id: 'co_escalate_tow',
      title: 'Call towing if coolant is lost or leak is major',
      description: 'If coolant level is empty or leak is significant, do not attempt to drive. Tow to nearest heavy-duty shop.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      costSavingPotential: 'high', downtimeReductionPotential: 'medium',
      escalationTrigger: 'Coolant empty or actively streaming',
      linkedIssueTypes: ['coolant_overheat'],
      source: 'rule_based',
    },
  ],

  // ═══ TIRE / WHEEL-END ═════════════════════════════════════════════
  tire_wheel_end: [
    {
      id: 'tw_visual_check',
      title: 'Visual tire inspection',
      description: 'Walk around and check all tires for flats, bulges, tread depth, and damage.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 10,
      costSavingPotential: 'low', downtimeReductionPotential: 'medium',
      steps: ['Walk around entire vehicle', 'Check each tire for low/flat condition', 'Tap tires to check pressure', 'Look for bulges, cuts, or exposed cord', 'Check lug nuts for looseness'],
      warnings: ['Stay on the shoulder side away from traffic', 'Do not drive on a flat — rim damage and blowout risk'],
      linkedIssueTypes: ['tire_wheel_end'],
      linkedPartCategories: ['other'],
      source: 'rule_based',
    },
    {
      id: 'tw_warn_wheel_end',
      title: 'Stop immediately if wheel-end damage suspected',
      description: 'Loose wheel, hub overheating, or metal grinding sound means stop NOW. Continued driving risks wheel separation.',
      category: 'warning', actionType: 'stop_now',
      difficulty: 'driver_basic', safetyLevel: 'high_risk',
      roadsidePossible: true,
      warnings: ['Wheel-end failure at speed is life-threatening', 'Hot hub smell or smoke: do not drive', 'Grinding metal sound: wheel bearing failure'],
      linkedIssueTypes: ['tire_wheel_end'],
      source: 'rule_based',
    },
    {
      id: 'tw_warn_no_driver_change',
      title: 'Do not attempt roadside tire change on a semi without training',
      description: 'Commercial truck tires are heavy and under high pressure. Improper handling causes serious injury.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      notSafeWithoutTraining: true,
      warnings: ['Truck tires weigh 100+ lbs', 'Split rims can explode during inflation', 'Use roadside tire service instead'],
      linkedIssueTypes: ['tire_wheel_end'],
      source: 'rule_based',
    },
    {
      id: 'tw_escalate_tire_service',
      title: 'Call roadside tire service',
      description: 'For flat tires or wheel-end issues, call a heavy-duty roadside tire service.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      costSavingPotential: 'low',
      linkedIssueTypes: ['tire_wheel_end'],
      source: 'rule_based',
    },
  ],

  // ═══ BATTERY / CHARGING / ELECTRICAL ══════════════════════════════
  battery_charging_electrical: [
    {
      id: 'bc_check_terminals',
      title: 'Check battery terminal connections',
      description: 'Loose or corroded battery terminals are the #1 cause of no-start and electrical issues. A simple check can save a tow.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Open battery compartment', 'Visually inspect terminals for corrosion or looseness', 'Wiggle connections gently', 'If loose, hand-tighten if possible'],
      warnings: ['Do not short-circuit terminals with metal tools', 'Wear gloves if corroded'],
      successSignal: 'Terminals tight and clean — test crank',
      escalationTrigger: 'Terminals clean but still no start — alternator or starter issue',
      linkedIssueTypes: ['battery_charging_electrical', 'starting'],
      linkedPartCategories: ['electrical'],
      source: 'rule_based',
    },
    {
      id: 'bc_check_fuses',
      title: 'Check fuse panel for blown fuses',
      description: 'A blown fuse can disable an entire circuit. Quick visual check of the fuse panel.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_intermediate', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: true,
      estimatedMinutes: 10,
      costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Locate fuse panel (check owner manual)', 'Identify fuses for the affected circuit', 'Pull suspect fuse and inspect for broken element', 'Replace with same-amperage fuse if available'],
      warnings: ['Never install a higher-amperage fuse — fire risk'],
      linkedIssueTypes: ['battery_charging_electrical'],
      linkedPartCategories: ['electrical'],
      source: 'rule_based',
    },
    {
      id: 'bc_check_disconnect',
      title: 'Check battery disconnect switch',
      description: 'Some trucks have a battery disconnect or kill switch. Verify it is in the ON position.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 2,
      costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Locate battery disconnect switch', 'Verify it is in the ON position', 'Toggle off and on if uncertain'],
      linkedIssueTypes: ['battery_charging_electrical', 'starting'],
      source: 'rule_based',
    },
    {
      id: 'bc_warn_no_jump_start_unsafe',
      title: 'Do not jump-start without proper cables and procedure',
      description: 'Incorrect jump-starting a diesel truck can damage ECU, alternator, or cause battery explosion.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'advanced_mechanic', safetyLevel: 'high_risk',
      notSafeWithoutTraining: true,
      warnings: ['Wrong polarity destroys ECU ($2,000–$5,000)', 'Hydrogen gas near battery — explosion risk', 'Use heavy-duty cables rated for diesel trucks only'],
      linkedIssueTypes: ['battery_charging_electrical', 'starting'],
      source: 'rule_based',
    },
    {
      id: 'bc_escalate_mobile',
      title: 'Call mobile mechanic for battery/charging diagnosis',
      description: 'If battery and connections look OK but electrical issues persist, call a mobile mechanic with a diagnostic scanner.',
      category: 'escalate', actionType: 'call',
      difficulty: 'advanced_mechanic', safetyLevel: 'not_for_driver',
      costSavingPotential: 'medium',
      escalationTrigger: 'Terminals clean, fuses OK, disconnect switch on — but still failing',
      linkedIssueTypes: ['battery_charging_electrical'],
      source: 'rule_based',
    },
  ],

  // ═══ AIR BRAKE ════════════════════════════════════════════════════
  air_brake: [
    {
      id: 'ab_check_air_pressure',
      title: 'Check air system pressure on dash gauge',
      description: 'Low air pressure means brake issues. Note the PSI reading.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 2,
      costSavingPotential: 'low', downtimeReductionPotential: 'low',
      steps: ['Check dash air pressure gauge', 'Normal is 100–120 PSI', 'If below 60 PSI, do NOT drive', 'Listen for air leaks (hissing sounds)'],
      warnings: ['Do NOT drive with low air pressure — spring brakes will lock', 'Brake failure is life-threatening'],
      linkedIssueTypes: ['air_brake'],
      source: 'rule_based',
    },
    {
      id: 'ab_listen_leaks',
      title: 'Listen for air leaks',
      description: 'With engine off and brakes charged, walk around and listen for hissing.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Build full air pressure', 'Turn off engine', 'Walk around truck and trailer', 'Listen at each wheel, connections, and air lines', 'Check air dryer and gladhands'],
      successSignal: 'Leak found at specific fitting — can be reported',
      escalationTrigger: 'Air pressure drops rapidly — significant leak present',
      linkedIssueTypes: ['air_brake'],
      source: 'rule_based',
    },
    {
      id: 'ab_warn_no_brake_repair',
      title: 'Do not repair brake components roadside',
      description: 'Air brake systems require training and proper tools. Incorrect repair can cause total brake failure.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      notSafeWithoutTraining: true,
      warnings: ['Brake failure is the #1 cause of commercial vehicle fatalities', 'FMCSA requires certified brake inspections', 'Spring brakes store deadly energy'],
      linkedIssueTypes: ['air_brake'],
      source: 'rule_based',
    },
    {
      id: 'ab_escalate_tow',
      title: 'Call towing — do not drive with brake issues',
      description: 'If air pressure is low, ABS is faulted, or brakes feel wrong, stop and call for towing.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      costSavingPotential: 'low',
      linkedIssueTypes: ['air_brake'],
      source: 'rule_based',
    },
  ],

  // ═══ FUEL DELIVERY ════════════════════════════════════════════════
  fuel_delivery: [
    {
      id: 'fd_check_fuel_level',
      title: 'Verify fuel level and shutoff valve',
      description: 'Check that you have adequate fuel and the fuel shutoff valve is open.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 3,
      costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Check fuel gauge', 'Verify fuel shutoff valve is in ON position', 'Check for fuel leaks under truck visually'],
      warnings: ['No open flames near fuel system'],
      linkedIssueTypes: ['fuel_delivery', 'starting'],
      source: 'rule_based',
    },
    {
      id: 'fd_drain_water_separator',
      title: 'Drain fuel/water separator',
      description: 'Water in fuel causes rough running and stalling. Drain the water separator bowl if equipped.',
      category: 'temporary_fix', actionType: 'do_now',
      difficulty: 'driver_intermediate', safetyLevel: 'caution',
      roadsidePossible: true, safeIfStationary: true, requiresTools: true,
      estimatedMinutes: 10,
      costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Locate fuel filter / water separator', 'Place container under drain', 'Open petcock and drain water', 'Close once clear fuel flows', 'Crank engine and check for improvement'],
      warnings: ['Fuel is flammable — no smoking or open flames', 'Dispose of fuel properly'],
      linkedIssueTypes: ['fuel_delivery'],
      linkedPartCategories: ['fuel_system', 'filters'],
      source: 'rule_based',
    },
    {
      id: 'fd_warn_no_fuel_line_repair',
      title: 'Do not repair fuel lines or injectors roadside',
      description: 'Fuel system components are high-pressure on diesel trucks. Improper repair causes fire or injury.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      notSafeWithoutTraining: true,
      warnings: ['Diesel injection pressure: 30,000+ PSI — can penetrate skin', 'Fuel leaks near hot engine = fire'],
      linkedIssueTypes: ['fuel_delivery'],
      source: 'rule_based',
    },
    {
      id: 'fd_escalate_mobile',
      title: 'Call mobile mechanic for fuel system diagnosis',
      description: 'If fuel level is ok, shutoff is open, and water separator is clear, you need a mechanic with diagnostic tools.',
      category: 'escalate', actionType: 'call',
      difficulty: 'advanced_mechanic', safetyLevel: 'not_for_driver',
      linkedIssueTypes: ['fuel_delivery'],
      source: 'rule_based',
    },
  ],

  // ═══ TRAILER ELECTRICAL ═══════════════════════════════════════════
  trailer_electrical: [
    {
      id: 'te_check_connections',
      title: 'Check trailer electrical connections',
      description: 'Inspect 7-pin connector, gladhands, and ABS cable for damage, corrosion, or loose fit.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 10,
      costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Check 7-pin connector for bent or corroded pins', 'Disconnect and reconnect firmly', 'Check gladhands for proper seal', 'Inspect ABS cable for damage'],
      linkedIssueTypes: ['trailer_electrical'],
      source: 'rule_based',
    },
    {
      id: 'te_check_lights',
      title: 'Walk-around light check',
      description: 'Have someone activate lights while you walk around checking all trailer lights.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      steps: ['Activate running lights, turn signals, brake lights', 'Walk around trailer checking each', 'Note which lights are out'],
      linkedIssueTypes: ['trailer_electrical'],
      source: 'rule_based',
    },
    {
      id: 'te_escalate_shop',
      title: 'Go to trailer repair shop for wiring issues',
      description: 'Internal trailer wiring problems need a shop with proper test equipment.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      linkedIssueTypes: ['trailer_electrical'],
      source: 'rule_based',
    },
  ],

  // ═══ SUSPENSION ═══════════════════════════════════════════════════
  suspension: [
    {
      id: 'su_visual_check',
      title: 'Visual check for obvious suspension damage',
      description: 'Look for broken springs, air bag leaks, or loose U-bolts from a safe distance.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 10,
      steps: ['Walk around and look at suspension from safe distance', 'Check for listing/leaning to one side', 'Look for broken leaf springs', 'Listen for air leaks from air bags', 'Check for loose or missing hardware'],
      warnings: ['Do not go under the truck', 'Broken springs have sharp edges'],
      linkedIssueTypes: ['suspension'],
      source: 'rule_based',
    },
    {
      id: 'su_warn_no_under_truck',
      title: 'Do not go under the truck roadside',
      description: 'Suspension inspection from underneath requires a shop with lifts. Roadside crawling is unsafe.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      notSafeWithoutTraining: true,
      warnings: ['Vehicle can shift or roll', 'Uneven ground increases danger', 'Broken suspension components can drop unexpectedly'],
      linkedIssueTypes: ['suspension'],
      source: 'rule_based',
    },
    {
      id: 'su_escalate_tow',
      title: 'Call towing if truck is leaning or springs are broken',
      description: 'A broken suspension component makes the truck unsafe to drive. Tow to a shop.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      linkedIssueTypes: ['suspension'],
      source: 'rule_based',
    },
  ],

  // ═══ STEERING ═════════════════════════════════════════════════════
  steering: [
    {
      id: 'st_check_fluid',
      title: 'Check power steering fluid level',
      description: 'Low power steering fluid causes hard steering or pump whining.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      steps: ['Locate power steering reservoir', 'Check fluid level against marks', 'Look for leaks around steering gear and hoses'],
      warnings: ['Hot fluid — use caution'],
      linkedIssueTypes: ['steering'],
      source: 'rule_based',
    },
    {
      id: 'st_warn_stop_if_no_steering',
      title: 'Stop immediately if steering is unresponsive',
      description: 'Loss of steering control is a critical safety emergency. Pull over immediately.',
      category: 'warning', actionType: 'stop_now',
      difficulty: 'driver_basic', safetyLevel: 'high_risk',
      warnings: ['Steering failure = loss of directional control', 'Tow to shop — do not drive'],
      linkedIssueTypes: ['steering'],
      source: 'rule_based',
    },
    {
      id: 'st_escalate_tow',
      title: 'Call towing for steering issues',
      description: 'Steering problems require immediate professional repair. Do not drive.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      linkedIssueTypes: ['steering'],
      source: 'rule_based',
    },
  ],

  // ═══ TRANSMISSION ═════════════════════════════════════════════════
  transmission: [
    {
      id: 'tr_check_fluid',
      title: 'Check transmission fluid level and condition',
      description: 'Low or burnt transmission fluid causes shifting problems.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_intermediate', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      steps: ['With engine running and warmed up, check transmission dipstick', 'Fluid should be red/pink, not brown/black', 'Check level between marks', 'Smell for burnt odor'],
      warnings: ['Hot transmission fluid causes burns', 'Keep fingers away from moving parts'],
      linkedIssueTypes: ['transmission'],
      source: 'rule_based',
    },
    {
      id: 'tr_warn_no_drive_slipping',
      title: 'Do not force drive if transmission is slipping',
      description: 'Continued driving with a slipping transmission causes total failure and often costs $5,000–$15,000 to replace.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'shop_only', safetyLevel: 'high_risk',
      warnings: ['Slipping transmission → burned clutches → full rebuild', 'Heat from slipping can damage other components'],
      linkedIssueTypes: ['transmission'],
      source: 'rule_based',
    },
    {
      id: 'tr_escalate_tow',
      title: 'Call towing if transmission won\'t engage or is slipping',
      description: 'Transmission problems need a specialist shop. Tow the truck.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      linkedIssueTypes: ['transmission'],
      source: 'rule_based',
    },
  ],

  // ═══ DRIVELINE ════════════════════════════════════════════════════
  driveline: [
    {
      id: 'dl_listen_noise',
      title: 'Listen for driveline noises',
      description: 'Clunking on acceleration or vibration at highway speed suggests U-joint or driveshaft issue.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      steps: ['Note when noise occurs (acceleration, deceleration, speed)', 'Check for vibration through the floor', 'Look under truck for hanging components (carefully, from a distance)'],
      linkedIssueTypes: ['driveline'],
      source: 'rule_based',
    },
    {
      id: 'dl_warn_stop_if_severe',
      title: 'Stop if severe vibration or grinding from driveline',
      description: 'A failing U-joint can cause the driveshaft to drop, which is catastrophic.',
      category: 'warning', actionType: 'stop_now',
      difficulty: 'driver_basic', safetyLevel: 'high_risk',
      warnings: ['Dropped driveshaft can vault the truck', 'Severe vibration means imminent failure'],
      linkedIssueTypes: ['driveline'],
      source: 'rule_based',
    },
    {
      id: 'dl_escalate_tow',
      title: 'Call towing for driveline issues',
      description: 'Driveline repair requires a shop with lifts and specialty tools.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      linkedIssueTypes: ['driveline'],
      source: 'rule_based',
    },
  ],

  // ═══ STARTING ═════════════════════════════════════════════════════
  starting: [
    {
      id: 'ss_check_battery',
      title: 'Check battery voltage and connections',
      description: 'A dead or weak battery is the #1 cause of no-start.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Turn key — does the starter click or crank slowly?', 'Check battery terminals for corrosion', 'Check if lights/dash are dim (weak battery)', 'Check battery disconnect switch position'],
      linkedIssueTypes: ['starting', 'battery_charging_electrical'],
      source: 'rule_based',
    },
    {
      id: 'ss_check_fuel',
      title: 'Check fuel level and fuel shutoff',
      description: 'Verify you have adequate fuel and the fuel shutoff valve is open.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 3,
      steps: ['Check fuel gauge reading', 'Verify fuel shutoff valve is ON', 'Check for fuel leaks'],
      linkedIssueTypes: ['starting', 'fuel_delivery'],
      source: 'rule_based',
    },
    {
      id: 'ss_escalate_mobile',
      title: 'Call mobile mechanic — no-start after basic checks',
      description: 'If battery is OK, fuel is OK, and it still won\'t start, you need a mechanic with a scanner.',
      category: 'escalate', actionType: 'call',
      difficulty: 'advanced_mechanic', safetyLevel: 'not_for_driver',
      escalationTrigger: 'Battery good, fuel good, still no crank or no start',
      linkedIssueTypes: ['starting'],
      source: 'rule_based',
    },
  ],

  // ═══ ENGINE (GENERAL) ═════════════════════════════════════════════
  engine: [
    {
      id: 'en_check_oil',
      title: 'Check engine oil level',
      description: 'Low oil pressure or oil-related codes demand immediate oil level check.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 3,
      costSavingPotential: 'high', downtimeReductionPotential: 'high',
      steps: ['Turn off engine, wait 2 min', 'Open hood', 'Pull dipstick, wipe, re-insert, pull again', 'Check level — add oil if critically low'],
      warnings: ['Hot surfaces under hood', 'Do not overfill'],
      linkedIssueTypes: ['engine'],
      source: 'rule_based',
    },
    {
      id: 'en_check_coolant',
      title: 'Check coolant level (engine off and cool)',
      description: 'ONLY when engine is cool. Check the coolant reservoir.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 3,
      steps: ['Wait for engine to cool', 'Check coolant reservoir level', 'Look for visible leaks around hoses'],
      warnings: ['NEVER open radiator cap on a hot engine'],
      linkedIssueTypes: ['engine', 'coolant_overheat'],
      source: 'rule_based',
    },
    {
      id: 'en_listen_noises',
      title: 'Listen for unusual engine noises',
      description: 'Knocking, squealing, hissing, or grinding narrows down the issue.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 3,
      steps: ['Start engine at idle', 'Walk around truck listening', 'Note specific sounds and location', 'Rev engine briefly — note changes'],
      warnings: ['Keep hands and clothing away from moving parts'],
      linkedIssueTypes: ['engine'],
      source: 'rule_based',
    },
    {
      id: 'en_warn_stop_knocking',
      title: 'Stop driving if engine is knocking or oil pressure is low',
      description: 'Engine knock with low oil pressure means imminent engine failure. Stop immediately.',
      category: 'warning', actionType: 'stop_now',
      difficulty: 'driver_basic', safetyLevel: 'high_risk',
      warnings: ['Continued operation = seized engine = $15,000–$30,000 replacement', 'Low oil pressure light means STOP'],
      linkedIssueTypes: ['engine'],
      source: 'rule_based',
    },
    {
      id: 'en_escalate_shop',
      title: 'Go to heavy-duty repair shop',
      description: 'Engine issues beyond basic checks require a mechanic with diagnostic tools.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      linkedIssueTypes: ['engine'],
      source: 'rule_based',
    },
  ],

  // ═══ REEFER ═══════════════════════════════════════════════════════
  reefer: [
    {
      id: 'rf_check_fuel',
      title: 'Check reefer fuel level',
      description: 'Many reefers run on diesel from their own tank or the tractor. Check fuel first.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      steps: ['Check reefer fuel gauge or dipstick', 'Add fuel if low', 'Check for reefer error codes on display panel'],
      linkedIssueTypes: ['reefer'],
      source: 'rule_based',
    },
    {
      id: 'rf_check_alarm',
      title: 'Check reefer alarm codes',
      description: 'Most reefers display alarm codes. Note them for the technician.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      steps: ['Check reefer controller display', 'Note any alarm codes', 'Take a photo for the technician', 'Try restarting the reefer unit'],
      linkedIssueTypes: ['reefer'],
      source: 'rule_based',
    },
    {
      id: 'rf_escalate',
      title: 'Call reefer repair service',
      description: 'Reefer units are specialized — call a reefer-certified repair service.',
      category: 'escalate', actionType: 'call',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      linkedIssueTypes: ['reefer'],
      source: 'rule_based',
    },
  ],

  // ═══ GENERAL / UNKNOWN ════════════════════════════════════════════
  general: [
    {
      id: 'gen_walk_around',
      title: 'Perform a basic walk-around inspection',
      description: 'Walk around the truck checking for visible leaks, damage, loose components, or warning signs.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 10,
      costSavingPotential: 'medium', downtimeReductionPotential: 'medium',
      steps: ['Walk around entire vehicle', 'Check for fluid leaks under truck', 'Look at all tires', 'Check lights and connections', 'Listen for unusual sounds', 'Note any warning lights on dash'],
      warnings: ['Stay clear of traffic'],
      linkedIssueTypes: ['general'],
      source: 'rule_based',
    },
    {
      id: 'gen_check_dash',
      title: 'Document all dashboard warning lights',
      description: 'Note which warning lights and messages are active. Take a photo — this helps mechanics diagnose faster.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 3,
      steps: ['Turn key to ON without starting', 'Note all lit warning lights', 'Check for text messages on display', 'Take a photo of dash for reference'],
      linkedIssueTypes: ['general'],
      source: 'rule_based',
    },
    {
      id: 'gen_check_fluids',
      title: 'Check all accessible fluid levels',
      description: 'Oil, coolant, transmission, power steering — low fluids are a common and fixable cause of problems.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 10,
      steps: ['Engine off and cool', 'Check engine oil', 'Check coolant reservoir', 'Check power steering fluid', 'Check transmission fluid if accessible'],
      warnings: ['NEVER open radiator cap on a hot engine'],
      linkedIssueTypes: ['general'],
      source: 'rule_based',
    },
    {
      id: 'gen_warn_no_guess_repair',
      title: 'Do not guess and replace parts without diagnosis',
      description: 'Trial-and-error part replacement wastes money. Get a proper diagnostic scan first.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      costSavingPotential: 'high',
      warnings: ['Wrong parts cost money and time', 'Root cause may be simple (connector, fuse, fluid) — check first'],
      linkedIssueTypes: ['general'],
      source: 'rule_based',
    },
  ],

  // ═══ UNKNOWN ENGINE FAULT ════════════════════════════════════════
  unknown_engine_fault: [
    {
      id: 'ue_check_dash',
      title: 'Document dashboard warnings and fault codes',
      description: 'Take a photo of the dash and note any error codes shown on the display.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      steps: ['Note all visible warning lights', 'Record any text messages on instrument cluster', 'Take a photo for reference'],
      linkedIssueTypes: ['unknown_engine_fault', 'general'],
      source: 'rule_based',
    },
    {
      id: 'ue_check_oil_coolant',
      title: 'Check oil and coolant levels',
      description: 'Basic fluid checks can reveal the cause of many engine faults.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 5,
      steps: ['Engine off, wait 2 min', 'Check oil dipstick', 'Check coolant reservoir (only when cool)'],
      warnings: ['Never open radiator cap on hot engine'],
      linkedIssueTypes: ['unknown_engine_fault', 'engine'],
      source: 'rule_based',
    },
    {
      id: 'ue_escalate_diagnostics',
      title: 'Get a professional diagnostic scan',
      description: 'Unknown engine faults need a scan tool to read live data and identify the root cause.',
      category: 'escalate', actionType: 'call',
      difficulty: 'advanced_mechanic', safetyLevel: 'not_for_driver',
      linkedIssueTypes: ['unknown_engine_fault'],
      source: 'rule_based',
    },
  ],
};

// ─── Part Category → Guidance Overlay Rules ─────────────────────────

/**
 * Additional guidance rules specific to parts contexts.
 * These are layered on top of the issue-based rules when rendering
 * guidance for a particular part recommendation.
 *
 * @type {Record<string, RepairGuidanceAction[]>}
 */
export const PARTS_GUIDANCE_RULES = {
  sensors: [
    {
      id: 'pg_sensor_inspect_connector',
      title: 'Inspect connector before replacing sensor',
      description: 'Most sensor codes are caused by connectors, not the sensor itself. Always check connector and harness first.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 10,
      costSavingPotential: 'high', downtimeReductionPotential: 'medium',
      steps: ['Locate sensor connector', 'Inspect pins for corrosion or bent contacts', 'Unplug and replug firmly', 'Check harness for chafing or damage'],
      successSignal: 'Code clears after reconnecting connector',
      escalationTrigger: 'Connector clean and secure — sensor likely failed',
      linkedPartCategories: ['sensors'],
      source: 'rule_based',
    },
    {
      id: 'pg_sensor_warn_blind_replace',
      title: 'Do not replace sensor without checking connector first',
      description: 'Sensor codes triggered by connectors or harness damage account for 30–50% of sensor replacements. Inspect before buying.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      costSavingPotential: 'high',
      warnings: ['NOx sensor: $300–$800', 'Temperature sensor: $50–$200', 'Pressure sensor: $100–$400', 'Check connector first — may save all of this'],
      linkedPartCategories: ['sensors'],
      source: 'rule_based',
    },
  ],
  filters: [
    {
      id: 'pg_filter_check_condition',
      title: 'Inspect filter condition before replacing',
      description: 'A clogged filter needs replacement, but verify the symptom matches before buying.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_intermediate', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: true,
      estimatedMinutes: 10,
      costSavingPotential: 'medium',
      steps: ['Locate the filter', 'Check filter housing for bypass indicator if equipped', 'If accessible, remove and inspect for contamination'],
      linkedPartCategories: ['filters'],
      source: 'rule_based',
    },
  ],
  electrical: [
    {
      id: 'pg_elec_check_wire',
      title: 'Check wiring and ground connections before replacing electrical parts',
      description: 'Loose grounds and broken wires cause the same symptoms as failed components. Check wiring first.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_intermediate', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: true,
      estimatedMinutes: 15,
      costSavingPotential: 'high', downtimeReductionPotential: 'medium',
      steps: ['Check ground connections to frame', 'Inspect wiring harness for damage', 'Wiggle connectors while monitoring for intermittent response'],
      linkedPartCategories: ['electrical'],
      source: 'rule_based',
    },
  ],
  cooling: [
    {
      id: 'pg_cool_check_hoses',
      title: 'Inspect hoses and clamps before replacing cooling components',
      description: 'A loose clamp or cracked hose is cheaper and easier to fix than replacing a water pump or thermostat.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'safe_if_stationary',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 10,
      costSavingPotential: 'high', downtimeReductionPotential: 'medium',
      steps: ['Inspect all visible coolant hoses for cracks or bulges', 'Check clamp tightness', 'Look for wet spots indicating leaks at connections'],
      warnings: ['Only inspect when engine is cool'],
      linkedPartCategories: ['cooling'],
      source: 'rule_based',
    },
  ],
  fuel_system: [
    {
      id: 'pg_fuel_check_water',
      title: 'Drain water separator before replacing fuel components',
      description: 'Water in fuel mimics many fuel system failures. Drain the water separator first.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_intermediate', safetyLevel: 'caution',
      roadsidePossible: true, safeIfStationary: true, requiresTools: true,
      estimatedMinutes: 10,
      costSavingPotential: 'medium',
      steps: ['Locate fuel/water separator', 'Drain into container', 'Look for water layer at bottom'],
      warnings: ['Fuel is flammable — no open flames'],
      linkedPartCategories: ['fuel_system'],
      source: 'rule_based',
    },
  ],
  exhaust: [
    {
      id: 'pg_exhaust_check_clamps',
      title: 'Check exhaust clamps and connections before parts replacement',
      description: 'Loose clamps and gasket leaks can mimic component failure.',
      category: 'inspect', actionType: 'check',
      difficulty: 'driver_basic', safetyLevel: 'caution',
      roadsidePossible: true, safeIfStationary: true, requiresTools: false,
      estimatedMinutes: 10,
      steps: ['Visually inspect exhaust system for loose clamps', 'Listen for exhaust leaks (hissing/popping at joints)', 'Check gaskets at connection points'],
      warnings: ['Exhaust components are very hot when engine has been running'],
      linkedPartCategories: ['exhaust'],
      source: 'rule_based',
    },
  ],
  brakes: [
    {
      id: 'pg_brake_warn_shop_only',
      title: 'Brake component replacement is shop only',
      description: 'Air brake components must be replaced by a certified mechanic. This is not a roadside repair.',
      category: 'warning', actionType: 'avoid',
      difficulty: 'shop_only', safetyLevel: 'not_for_driver',
      notSafeWithoutTraining: true,
      warnings: ['FMCSA requires certified brake work', 'Spring brakes contain lethal stored energy', 'Incorrect repair = total brake failure'],
      linkedPartCategories: ['brakes'],
      source: 'rule_based',
    },
  ],
};
