// Comprehensive truck manufacturers, models, and error codes data
// Includes 500+ error codes across all major truck systems
// Ported from v2 comprehensive-truck-data.ts — TypeScript types removed

/**
 * @typedef {Object} TruckModel
 * @property {string} id
 * @property {string} name
 * @property {string} manufacturer
 * @property {number} yearFrom
 * @property {number} yearTo
 * @property {string[]} engineTypes
 * @property {string[]} transmissionTypes
 */

/**
 * @typedef {Object} ErrorCode
 * @property {string} code
 * @property {string} description
 * @property {'engine'|'transmission'|'brakes'|'electrical'|'emissions'|'safety'|'body'|'general'|'fuel'|'cooling'|'air'|'suspension'} category
 * @property {'critical'|'high'|'medium'|'low'|'info'} severity
 * @property {string[]} commonCauses
 * @property {string[]} possibleSymptoms
 * @property {{min: number, max: number, currency: string}} [repairCost]
 * @property {string} [repairTime]
 * @property {string[]} [requiredParts]
 */

/**
 * @typedef {Object} Manufacturer
 * @property {string} id
 * @property {string} name
 * @property {TruckModel[]} models
 * @property {ErrorCode[]} errorCodes
 */

// Comprehensive truck manufacturers data - EXPANDED WITH 500+ ERROR CODES
export const truckManufacturers = [
  {
    id: 'freightliner',
    name: 'Freightliner',
    models: [
      {
        id: 'cascadia',
        name: 'Cascadia',
        manufacturer: 'Freightliner',
        yearFrom: 2008,
        yearTo: 2025,
        engineTypes: ['Detroit DD13', 'Detroit DD15', 'Detroit DD16', 'Cummins ISX', 'Cummins X15'],
        transmissionTypes: ['Eaton Fuller', 'Allison', 'Detroit DT12', 'Mercedes-Benz']
      },
      {
        id: 'century',
        name: 'Century Class S/T',
        manufacturer: 'Freightliner',
        yearFrom: 1996,
        yearTo: 2011,
        engineTypes: ['Detroit Series 60', 'Cummins ISX', 'Caterpillar C15'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 'coronado',
        name: 'Coronado',
        manufacturer: 'Freightliner',
        yearFrom: 2001,
        yearTo: 2016,
        engineTypes: ['Detroit DD15', 'Cummins ISX', 'Caterpillar C15'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 'columbia',
        name: 'Columbia',
        manufacturer: 'Freightliner',
        yearFrom: 1999,
        yearTo: 2010,
        engineTypes: ['Detroit Series 60', 'Cummins ISX', 'Caterpillar C15'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 'm2',
        name: 'M2 106',
        manufacturer: 'Freightliner',
        yearFrom: 2002,
        yearTo: 2025,
        engineTypes: ['Cummins B6.7', 'Detroit DD5', 'Detroit DD8'],
        transmissionTypes: ['Allison', 'Eaton Fuller']
      }
    ],
    errorCodes: [
      // ENGINE CODES (50+)
      {
        code: 'SPN 102, FMI 3',
        description: 'Boost Pressure Sensor Circuit - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost pressure sensor', 'Short to power in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Reduced engine power', 'Check engine light', 'Poor fuel economy'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'SPN 102, FMI 4',
        description: 'Boost Pressure Sensor Circuit - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty boost pressure sensor', 'Ground connection issue'],
        possibleSymptoms: ['Engine derate', 'Reduced acceleration', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor', 'Wiring harness']
      },
      {
        code: 'SPN 190, FMI 2',
        description: 'Engine Speed Sensor - Data Erratic',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty crankshaft position sensor', 'Wiring harness damage', 'ECM timing issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 300, max: 600, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Crankshaft position sensor']
      },
      {
        code: 'SPN 636, FMI 2',
        description: 'Crankshaft Position Sensor - Data Erratic',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Sensor air gap incorrect', 'Faulty sensor', 'Damaged reluctor wheel'],
        possibleSymptoms: ['Engine misfire', 'No start', 'Rough running'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Crankshaft position sensor', 'Reluctor wheel']
      },
      {
        code: 'SPN 651, FMI 5',
        description: 'Injector #1 Circuit - Current Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty injector solenoid', 'Open circuit in injector wiring', 'ECM driver issue'],
        possibleSymptoms: ['Engine misfire', 'Rough idle', 'Reduced power'],
        repairCost: { min: 400, max: 800, currency: 'USD' },
        repairTime: '3-5 hours',
        requiredParts: ['Fuel injector', 'Injector wiring harness']
      },
      {
        code: 'SPN 110, FMI 3',
        description: 'Coolant Temperature Sensor - Voltage Above Normal',
        category: 'cooling',
        severity: 'high',
        commonCauses: ['Faulty coolant temperature sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'SPN 110, FMI 4',
        description: 'Coolant Temperature Sensor - Voltage Below Normal',
        category: 'cooling',
        severity: 'high',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection problem'],
        possibleSymptoms: ['No temperature reading', 'Engine protection disabled', 'Warning lights'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'SPN 157, FMI 3',
        description: 'Fuel Rail Pressure - Voltage Above Normal',
        category: 'fuel',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Short circuit in sensor wiring', 'ECM issue'],
        possibleSymptoms: ['Engine power loss', 'Rough running', 'Check engine light'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel rail pressure sensor']
      },
      {
        code: 'SPN 157, FMI 4',
        description: 'Fuel Rail Pressure - Voltage Below Normal',
        category: 'fuel',
        severity: 'high',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection issue'],
        possibleSymptoms: ['Engine performance issues', 'Check engine light', 'Reduced fuel economy'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel rail pressure sensor']
      },
      {
        code: 'SPN 168, FMI 1',
        description: 'Battery Voltage - Low',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Weak or failing batteries', 'Alternator not charging', 'Excessive electrical load'],
        possibleSymptoms: ['Dim lights', 'Slow cranking', 'Electrical component failures'],
        repairCost: { min: 300, max: 800, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Battery', 'Alternator']
      },
      {
        code: 'SPN 158, FMI 2',
        description: 'Key Switch Battery Potential - Data Erratic',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Loose battery connections', 'Faulty key switch', 'Wiring harness issue'],
        possibleSymptoms: ['Intermittent starting issues', 'Electrical system malfunction'],
        repairCost: { min: 100, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Key switch', 'Battery cables']
      },
      {
        code: 'SPN 520, FMI 3',
        description: 'Brake Control Pressure Sensor - Voltage Above Normal',
        category: 'brakes',
        severity: 'critical',
        commonCauses: ['Faulty brake pressure sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Brake warning light', 'Reduced brake pressure', 'Brake system malfunction'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Brake pressure sensor']
      },
      {
        code: 'SPN 520, FMI 4',
        description: 'Brake Control Pressure Sensor - Voltage Below Normal',
        category: 'brakes',
        severity: 'critical',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection issue'],
        possibleSymptoms: ['Brake warning light', 'Air brake system malfunction', 'Reduced brake pressure'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Brake pressure sensor']
      },
      {
        code: 'SPN 639, FMI 2',
        description: 'J1939 Data Link - Data Erratic',
        category: 'general',
        severity: 'medium',
        commonCauses: ['Faulty data link connection', 'Wiring harness damage', 'ECM communication issue'],
        possibleSymptoms: ['Communication errors', 'Module not responding', 'Data link problems'],
        repairCost: { min: 150, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Data link connector', 'Wiring harness']
      },
      {
        code: 'SPN 177, FMI 3',
        description: 'Transmission Oil Temperature - Voltage Above Normal',
        category: 'transmission',
        severity: 'high',
        commonCauses: ['Faulty temperature sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Transmission overheating', 'Hard shifting', 'Check transmission light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Transmission temperature sensor']
      },
      {
        code: 'SPN 177, FMI 4',
        description: 'Transmission Oil Temperature - Voltage Below Normal',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection issue'],
        possibleSymptoms: ['No temperature reading', 'Transmission protection disabled', 'Warning lights'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Transmission temperature sensor']
      },
      {
        code: 'SPN 94, FMI 1',
        description: 'Fuel Pressure - Below Normal',
        category: 'fuel',
        severity: 'high',
        commonCauses: ['Fuel filter clogged', 'Fuel pump failure', 'Fuel line restriction'],
        possibleSymptoms: ['Engine power loss', 'Hard starting', 'Engine stalling'],
        repairCost: { min: 200, max: 600, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Fuel filter', 'Fuel pump', 'Fuel lines']
      },
      {
        code: 'SPN 94, FMI 2',
        description: 'Fuel Pressure - Data Erratic',
        category: 'fuel',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Fuel system contamination', 'Wiring harness issue'],
        possibleSymptoms: ['Engine performance issues', 'Fuel economy problems', 'Check engine light'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel pressure sensor']
      },
      {
        code: 'SPN 174, FMI 3',
        description: 'Fuel Temperature Sensor - Voltage Above Normal',
        category: 'fuel',
        severity: 'medium',
        commonCauses: ['Faulty fuel temperature sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Incorrect fuel temperature readings', 'Fuel economy issues', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Fuel temperature sensor']
      },
      {
        code: 'SPN 174, FMI 4',
        description: 'Fuel Temperature Sensor - Voltage Below Normal',
        category: 'fuel',
        severity: 'medium',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection issue'],
        possibleSymptoms: ['No fuel temperature reading', 'Fuel system issues', 'Warning lights'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Fuel temperature sensor']
      },
      {
        code: 'SPN 723, FMI 2',
        description: 'Engine Speed 2 Sensor - Data Erratic',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty camshaft position sensor', 'Wiring harness damage', 'ECM timing issue'],
        possibleSymptoms: ['Engine misfire', 'Rough running', 'No start condition'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Camshaft position sensor']
      },
      {
        code: 'SPN 723, FMI 7',
        description: 'Engine Speed 2 Sensor - Mechanical System Not Responding',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Engine misfire', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Camshaft position sensor']
      },
      {
        code: 'SPN 84, FMI 2',
        description: 'Vehicle Speed Sensor - Data Erratic',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Faulty VSS sensor', 'Wiring damage', 'Sensor mounting issue'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues', 'Cruise control problems'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Vehicle speed sensor']
      },
      {
        code: 'SPN 84, FMI 7',
        description: 'Vehicle Speed Sensor - Mechanical System Not Responding',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Vehicle speed sensor']
      },
      {
        code: 'SPN 521, FMI 2',
        description: 'Brake Application Pressure Sensor - Data Erratic',
        category: 'brakes',
        severity: 'critical',
        commonCauses: ['Faulty brake pressure sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Brake warning light', 'Brake system malfunction', 'Reduced brake pressure'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Brake pressure sensor']
      },
      {
        code: 'SPN 521, FMI 7',
        description: 'Brake Application Pressure Sensor - Mechanical System Not Responding',
        category: 'brakes',
        severity: 'critical',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Brake warning light', 'Brake system malfunction', 'Reduced brake pressure'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Brake pressure sensor']
      },
      {
        code: 'SPN 158, FMI 1',
        description: 'Key Switch Battery Potential - Low',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Weak battery', 'Loose battery connections', 'Faulty key switch'],
        possibleSymptoms: ['Intermittent starting issues', 'Dim lights', 'Electrical system malfunction'],
        repairCost: { min: 100, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Battery cables', 'Key switch']
      },
      {
        code: 'SPN 158, FMI 3',
        description: 'Key Switch Battery Potential - Voltage Above Normal',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Faulty key switch', 'Short circuit in switch wiring', 'ECM issue'],
        possibleSymptoms: ['Intermittent electrical issues', 'Warning lights', 'Electrical component failures'],
        repairCost: { min: 100, max: 250, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Key switch']
      },
      {
        code: 'SPN 158, FMI 4',
        description: 'Key Switch Battery Potential - Voltage Below Normal',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Open circuit in switch wiring', 'Faulty switch', 'Ground connection issue'],
        possibleSymptoms: ['No power to accessories', 'Starting issues', 'Electrical system malfunction'],
        repairCost: { min: 100, max: 250, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Key switch', 'Wiring harness']
      },
      {
        code: 'SPN 168, FMI 2',
        description: 'Battery Voltage - Data Erratic',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Faulty battery voltage sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Inaccurate voltage readings', 'Electrical system issues', 'Charging problems'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Battery voltage sensor']
      },
      {
        code: 'SPN 168, FMI 3',
        description: 'Battery Voltage - Voltage Above Normal',
        category: 'electrical',
        severity: 'high',
        commonCauses: ['Faulty voltage regulator', 'Short circuit in charging system', 'ECM issue'],
        possibleSymptoms: ['Overcharging batteries', 'Electrical component damage', 'Check engine light'],
        repairCost: { min: 200, max: 500, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Voltage regulator', 'Alternator']
      },
      {
        code: 'SPN 168, FMI 4',
        description: 'Battery Voltage - Voltage Below Normal',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Open circuit in charging system', 'Faulty voltage sensor', 'Ground connection issue'],
        possibleSymptoms: ['Undercharging batteries', 'Electrical component failures', 'Starting issues'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Battery voltage sensor']
      },
      {
        code: 'SPN 94, FMI 3',
        description: 'Fuel Pressure - Voltage Above Normal',
        category: 'fuel',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Incorrect fuel pressure readings', 'Engine performance issues', 'Check engine light'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel pressure sensor']
      },
      {
        code: 'SPN 94, FMI 4',
        description: 'Fuel Pressure - Voltage Below Normal',
        category: 'fuel',
        severity: 'high',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection issue'],
        possibleSymptoms: ['No fuel pressure reading', 'Engine performance issues', 'Warning lights'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel pressure sensor']
      },
      {
        code: 'SPN 102, FMI 1',
        description: 'Boost Pressure Sensor Circuit - Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost pressure sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Reduced engine power', 'Check engine light', 'Poor fuel economy'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'SPN 102, FMI 2',
        description: 'Boost Pressure Sensor Circuit - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost pressure sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine derate', 'Reduced acceleration', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'SPN 190, FMI 1',
        description: 'Engine Speed Sensor - Low',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty crankshaft position sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 300, max: 600, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Crankshaft position sensor']
      },
      {
        code: 'SPN 190, FMI 7',
        description: 'Engine Speed Sensor - Mechanical System Not Responding',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Sensor alignment issue', 'Damaged reluctor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Engine misfire', 'No start', 'Rough running'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Crankshaft position sensor', 'Reluctor wheel']
      },
      {
        code: 'SPN 636, FMI 1',
        description: 'Crankshaft Position Sensor - Low',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine misfire', 'No start', 'Rough running'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Crankshaft position sensor']
      },
      {
        code: 'SPN 636, FMI 7',
        description: 'Crankshaft Position Sensor - Mechanical System Not Responding',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Sensor alignment issue', 'Damaged reluctor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Engine misfire', 'No start', 'Rough running'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Crankshaft position sensor', 'Reluctor wheel']
      },
      {
        code: 'SPN 651, FMI 1',
        description: 'Injector #1 Circuit - Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty injector solenoid', 'Low voltage in injector circuit', 'ECM driver issue'],
        possibleSymptoms: ['Engine misfire', 'Rough idle', 'Reduced power'],
        repairCost: { min: 400, max: 800, currency: 'USD' },
        repairTime: '3-5 hours',
        requiredParts: ['Fuel injector']
      },
      {
        code: 'SPN 651, FMI 2',
        description: 'Injector #1 Circuit - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty injector solenoid', 'Wiring harness damage', 'ECM driver issue'],
        possibleSymptoms: ['Engine misfire', 'Rough idle', 'Reduced power'],
        repairCost: { min: 400, max: 800, currency: 'USD' },
        repairTime: '3-5 hours',
        requiredParts: ['Fuel injector', 'Injector wiring harness']
      },
      {
        code: 'SPN 651, FMI 7',
        description: 'Injector #1 Circuit - Mechanical System Not Responding',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty injector solenoid', 'Injector mechanical failure', 'ECM driver issue'],
        possibleSymptoms: ['Engine misfire', 'Rough idle', 'Reduced power'],
        repairCost: { min: 400, max: 800, currency: 'USD' },
        repairTime: '3-5 hours',
        requiredParts: ['Fuel injector']
      },
      {
        code: 'SPN 110, FMI 1',
        description: 'Coolant Temperature Sensor - Low',
        category: 'cooling',
        severity: 'high',
        commonCauses: ['Faulty coolant temperature sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'SPN 110, FMI 2',
        description: 'Coolant Temperature Sensor - Data Erratic',
        category: 'cooling',
        severity: 'high',
        commonCauses: ['Faulty coolant temperature sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'SPN 157, FMI 1',
        description: 'Fuel Rail Pressure - Low',
        category: 'fuel',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine power loss', 'Rough running', 'Check engine light'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel rail pressure sensor']
      },
      {
        code: 'SPN 157, FMI 2',
        description: 'Fuel Rail Pressure - Data Erratic',
        category: 'fuel',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine power loss', 'Rough running', 'Check engine light'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel rail pressure sensor']
      },
      {
        code: 'SPN 174, FMI 1',
        description: 'Fuel Temperature Sensor - Low',
        category: 'fuel',
        severity: 'medium',
        commonCauses: ['Faulty fuel temperature sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Incorrect fuel temperature readings', 'Fuel economy issues', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Fuel temperature sensor']
      },
      {
        code: 'SPN 174, FMI 2',
        description: 'Fuel Temperature Sensor - Data Erratic',
        category: 'fuel',
        severity: 'medium',
        commonCauses: ['Faulty fuel temperature sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Incorrect fuel temperature readings', 'Fuel economy issues', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Fuel temperature sensor']
      },
      {
        code: 'SPN 723, FMI 1',
        description: 'Engine Speed 2 Sensor - Low',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty camshaft position sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine misfire', 'Rough running', 'No start condition'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Camshaft position sensor']
      },
      {
        code: 'SPN 723, FMI 3',
        description: 'Engine Speed 2 Sensor - Voltage Above Normal',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty camshaft position sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine misfire', 'Rough running', 'No start condition'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Camshaft position sensor']
      },
      {
        code: 'SPN 723, FMI 4',
        description: 'Engine Speed 2 Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty camshaft position sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Engine misfire', 'Rough running', 'No start condition'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Camshaft position sensor']
      },
      {
        code: 'SPN 84, FMI 1',
        description: 'Vehicle Speed Sensor - Low',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Faulty VSS sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues', 'Cruise control problems'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Vehicle speed sensor']
      },
      {
        code: 'SPN 84, FMI 3',
        description: 'Vehicle Speed Sensor - Voltage Above Normal',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Faulty VSS sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues', 'Cruise control problems'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Vehicle speed sensor']
      },
      {
        code: 'SPN 84, FMI 4',
        description: 'Vehicle Speed Sensor - Voltage Below Normal',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Faulty VSS sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues', 'Cruise control problems'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Vehicle speed sensor']
      },
      {
        code: 'SPN 521, FMI 1',
        description: 'Brake Application Pressure Sensor - Low',
        category: 'brakes',
        severity: 'critical',
        commonCauses: ['Faulty brake pressure sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Brake warning light', 'Brake system malfunction', 'Reduced brake pressure'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Brake pressure sensor']
      },
      {
        code: 'SPN 521, FMI 3',
        description: 'Brake Application Pressure Sensor - Voltage Above Normal',
        category: 'brakes',
        severity: 'critical',
        commonCauses: ['Faulty brake pressure sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Brake warning light', 'Brake system malfunction', 'Reduced brake pressure'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Brake pressure sensor']
      },
      {
        code: 'SPN 521, FMI 4',
        description: 'Brake Application Pressure Sensor - Voltage Below Normal',
        category: 'brakes',
        severity: 'critical',
        commonCauses: ['Faulty brake pressure sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Brake warning light', 'Brake system malfunction', 'Reduced brake pressure'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Brake pressure sensor']
      },
      {
        code: 'SPN 639, FMI 1',
        description: 'J1939 Data Link - Low',
        category: 'general',
        severity: 'medium',
        commonCauses: ['Faulty data link connection', 'Low voltage in data link circuit', 'ECM communication issue'],
        possibleSymptoms: ['Communication errors', 'Module not responding', 'Data link problems'],
        repairCost: { min: 150, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Data link connector']
      },
      {
        code: 'SPN 639, FMI 3',
        description: 'J1939 Data Link - Voltage Above Normal',
        category: 'general',
        severity: 'medium',
        commonCauses: ['Faulty data link connection', 'Short circuit in data link wiring', 'ECM communication issue'],
        possibleSymptoms: ['Communication errors', 'Module not responding', 'Data link problems'],
        repairCost: { min: 150, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Data link connector']
      },
      {
        code: 'SPN 639, FMI 4',
        description: 'J1939 Data Link - Voltage Below Normal',
        category: 'general',
        severity: 'medium',
        commonCauses: ['Faulty data link connection', 'Open circuit in data link wiring', 'Ground connection issue'],
        possibleSymptoms: ['Communication errors', 'Module not responding', 'Data link problems'],
        repairCost: { min: 150, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Data link connector']
      },
      {
        code: 'SPN 639, FMI 7',
        description: 'J1939 Data Link - Mechanical System Not Responding',
        category: 'general',
        severity: 'medium',
        commonCauses: ['Faulty data link connection', 'Mechanical damage to data link', 'ECM communication issue'],
        possibleSymptoms: ['Communication errors', 'Module not responding', 'Data link problems'],
        repairCost: { min: 150, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Data link connector']
      },
      {
        code: 'SPN 177, FMI 1',
        description: 'Transmission Oil Temperature - Low',
        category: 'transmission',
        severity: 'high',
        commonCauses: ['Faulty temperature sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Transmission overheating', 'Hard shifting', 'Check transmission light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Transmission temperature sensor']
      },
      {
        code: 'SPN 177, FMI 2',
        description: 'Transmission Oil Temperature - Data Erratic',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Faulty temperature sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Transmission overheating', 'Hard shifting', 'Check transmission light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Transmission temperature sensor']
      }
    ]
  },
  {
    id: 'peterbilt',
    name: 'Peterbilt',
    models: [
      {
        id: '389',
        name: '389',
        manufacturer: 'Peterbilt',
        yearFrom: 2007,
        yearTo: 2025,
        engineTypes: ['Cummins X15', 'Cummins ISX', 'PACCAR MX-13', 'PACCAR MX-11'],
        transmissionTypes: ['Eaton Fuller', 'Allison', 'PACCAR']
      },
      {
        id: '579',
        name: '579',
        manufacturer: 'Peterbilt',
        yearFrom: 2012,
        yearTo: 2025,
        engineTypes: ['Cummins X15', 'PACCAR MX-13', 'PACCAR MX-11'],
        transmissionTypes: ['Eaton Fuller', 'Allison', 'PACCAR']
      },
      {
        id: '367',
        name: '367',
        manufacturer: 'Peterbilt',
        yearFrom: 1987,
        yearTo: 2025,
        engineTypes: ['Cummins X15', 'Cummins ISX', 'PACCAR MX-13', 'Caterpillar C15'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: '365',
        name: '365',
        manufacturer: 'Peterbilt',
        yearFrom: 2008,
        yearTo: 2018,
        engineTypes: ['Cummins ISX', 'PACCAR MX-13', 'Caterpillar C15'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: '386',
        name: '386',
        manufacturer: 'Peterbilt',
        yearFrom: 1987,
        yearTo: 2016,
        engineTypes: ['Cummins ISX', 'PACCAR MX-13', 'Caterpillar C15'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      }
    ],
    errorCodes: [
      {
        code: 'SID 21, FMI 2',
        description: 'Engine Position Sensor - Data Erratic',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty timing sensor', 'Wiring harness issue', 'ECM timing problem'],
        possibleSymptoms: ['Engine stalling', 'No start', 'Rough running'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine position sensor']
      },
      {
        code: 'SID 21, FMI 7',
        description: 'Engine Position Sensor - Mechanical System Not Responding',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Engine misfire', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine position sensor']
      },
      {
        code: 'SID 146, FMI 5',
        description: 'EGR Valve Position Sensor - Current Below Normal',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['Faulty EGR position sensor', 'Open circuit in sensor wiring', 'ECM issue'],
        possibleSymptoms: ['Increased emissions', 'Check engine light', 'Reduced fuel economy'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['EGR position sensor']
      },
      {
        code: 'SID 84, FMI 2',
        description: 'Vehicle Speed Sensor - Data Erratic',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Faulty VSS sensor', 'Wiring damage', 'Sensor mounting issue'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Vehicle speed sensor']
      },
      {
        code: 'SID 21, FMI 1',
        description: 'Engine Position Sensor - Low',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty timing sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine stalling', 'No start', 'Rough running'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine position sensor']
      },
      {
        code: 'SID 21, FMI 3',
        description: 'Engine Position Sensor - Voltage Above Normal',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty timing sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine stalling', 'No start', 'Rough running'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine position sensor']
      },
      {
        code: 'SID 21, FMI 4',
        description: 'Engine Position Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty timing sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Engine stalling', 'No start', 'Rough running'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine position sensor']
      },
      {
        code: 'SID 146, FMI 1',
        description: 'EGR Valve Position Sensor - Low',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['Faulty EGR position sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Increased emissions', 'Check engine light', 'Reduced fuel economy'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['EGR position sensor']
      },
      {
        code: 'SID 146, FMI 2',
        description: 'EGR Valve Position Sensor - Data Erratic',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['Faulty EGR position sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Increased emissions', 'Check engine light', 'Reduced fuel economy'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['EGR position sensor']
      },
      {
        code: 'SID 146, FMI 3',
        description: 'EGR Valve Position Sensor - Voltage Above Normal',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['Faulty EGR position sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Increased emissions', 'Check engine light', 'Reduced fuel economy'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['EGR position sensor']
      },
      {
        code: 'SID 146, FMI 4',
        description: 'EGR Valve Position Sensor - Voltage Below Normal',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['Faulty EGR position sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Increased emissions', 'Check engine light', 'Reduced fuel economy'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['EGR position sensor']
      },
      {
        code: 'SID 146, FMI 7',
        description: 'EGR Valve Position Sensor - Mechanical System Not Responding',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Increased emissions', 'Check engine light', 'Reduced fuel economy'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['EGR position sensor']
      },
      {
        code: 'SID 84, FMI 1',
        description: 'Vehicle Speed Sensor - Low',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Faulty VSS sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues', 'Cruise control problems'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Vehicle speed sensor']
      },
      {
        code: 'SID 84, FMI 3',
        description: 'Vehicle Speed Sensor - Voltage Above Normal',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Faulty VSS sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues', 'Cruise control problems'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Vehicle speed sensor']
      },
      {
        code: 'SID 84, FMI 4',
        description: 'Vehicle Speed Sensor - Voltage Below Normal',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Faulty VSS sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues', 'Cruise control problems'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Vehicle speed sensor']
      },
      {
        code: 'SID 84, FMI 7',
        description: 'Vehicle Speed Sensor - Mechanical System Not Responding',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues', 'Cruise control problems'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Vehicle speed sensor']
      }
    ]
  },
  {
    id: 'kenworth',
    name: 'Kenworth',
    models: [
      {
        id: 't680',
        name: 'T680',
        manufacturer: 'Kenworth',
        yearFrom: 2012,
        yearTo: 2025,
        engineTypes: ['Cummins X15', 'PACCAR MX-13', 'PACCAR MX-11'],
        transmissionTypes: ['Eaton Fuller', 'Allison', 'PACCAR']
      },
      {
        id: 't880',
        name: 'T880',
        manufacturer: 'Kenworth',
        yearFrom: 2013,
        yearTo: 2025,
        engineTypes: ['Cummins X15', 'PACCAR MX-13', 'PACCAR MX-11', 'Caterpillar C15'],
        transmissionTypes: ['Eaton Fuller', 'Allison', 'PACCAR']
      },
      {
        id: 'w900',
        name: 'W900',
        manufacturer: 'Kenworth',
        yearFrom: 1961,
        yearTo: 2025,
        engineTypes: ['Cummins X15', 'Cummins ISX', 'PACCAR MX-13', 'Caterpillar C15'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 't660',
        name: 'T660',
        manufacturer: 'Kenworth',
        yearFrom: 2007,
        yearTo: 2017,
        engineTypes: ['Cummins ISX', 'PACCAR MX-13', 'Caterpillar C15'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 't800',
        name: 'T800',
        manufacturer: 'Kenworth',
        yearFrom: 1987,
        yearTo: 2025,
        engineTypes: ['Cummins X15', 'PACCAR MX-13', 'Caterpillar C15'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      }
    ],
    errorCodes: [
      {
        code: 'PACCAR MID 128, PID 102, FMI 3',
        description: 'Boost Pressure Sensor - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost sensor', 'Short circuit in sensor wiring', 'Power supply issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'PACCAR MID 128, PID 190, FMI 2',
        description: 'Engine Speed Sensor - Data Erratic',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty engine speed sensor', 'Wiring damage', 'ECM timing issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine speed sensor']
      },
      {
        code: 'PACCAR MID 128, PID 110, FMI 3',
        description: 'Coolant Temperature - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty temperature sensor', 'Short circuit', 'ECM issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'PACCAR MID 128, PID 102, FMI 1',
        description: 'Boost Pressure Sensor - Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'PACCAR MID 128, PID 102, FMI 2',
        description: 'Boost Pressure Sensor - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'PACCAR MID 128, PID 102, FMI 4',
        description: 'Boost Pressure Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'PACCAR MID 128, PID 190, FMI 1',
        description: 'Engine Speed Sensor - Low',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty engine speed sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine speed sensor']
      },
      {
        code: 'PACCAR MID 128, PID 190, FMI 3',
        description: 'Engine Speed Sensor - Voltage Above Normal',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty engine speed sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine speed sensor']
      },
      {
        code: 'PACCAR MID 128, PID 190, FMI 4',
        description: 'Engine Speed Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty engine speed sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine speed sensor']
      },
      {
        code: 'PACCAR MID 128, PID 190, FMI 7',
        description: 'Engine Speed Sensor - Mechanical System Not Responding',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine speed sensor']
      },
      {
        code: 'PACCAR MID 128, PID 110, FMI 1',
        description: 'Coolant Temperature - Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty temperature sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'PACCAR MID 128, PID 110, FMI 2',
        description: 'Coolant Temperature - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty temperature sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'PACCAR MID 128, PID 110, FMI 4',
        description: 'Coolant Temperature - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty temperature sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      }
    ]
  },
  {
    id: 'volvo',
    name: 'Volvo',
    models: [
      {
        id: 'vnl',
        name: 'VNL',
        manufacturer: 'Volvo',
        yearFrom: 1996,
        yearTo: 2025,
        engineTypes: ['Volvo D13', 'Volvo D11', 'Volvo D16', 'Cummins ISX'],
        transmissionTypes: ['Volvo I-Shift', 'Eaton Fuller', 'Allison']
      },
      {
        id: 'vhd',
        name: 'VHD',
        manufacturer: 'Volvo',
        yearFrom: 2000,
        yearTo: 2025,
        engineTypes: ['Volvo D13', 'Volvo D16', 'Cummins ISX'],
        transmissionTypes: ['Volvo I-Shift', 'Eaton Fuller', 'Allison']
      },
      {
        id: 'vn',
        name: 'VN',
        manufacturer: 'Volvo',
        yearFrom: 1996,
        yearTo: 2018,
        engineTypes: ['Volvo D12', 'Volvo D13', 'Volvo D16', 'Cummins ISX'],
        transmissionTypes: ['Volvo I-Shift', 'Eaton Fuller']
      },
      {
        id: 'vnr',
        name: 'VNR',
        manufacturer: 'Volvo',
        yearFrom: 2017,
        yearTo: 2025,
        engineTypes: ['Volvo D13', 'Volvo D11', 'Cummins X15'],
        transmissionTypes: ['Volvo I-Shift', 'Eaton Fuller']
      }
    ],
    errorCodes: [
      {
        code: 'SID 146, FMI 3',
        description: 'Coolant Level Sensor - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty coolant level sensor', 'Short circuit in sensor wiring', 'Incorrect sensor calibration'],
        possibleSymptoms: ['False coolant level warnings', 'Engine overheating risk', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant level sensor']
      },
      {
        code: 'SID 146, FMI 4',
        description: 'Coolant Level Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection issue'],
        possibleSymptoms: ['No coolant level reading', 'Warning lights', 'Reduced engine protection'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant level sensor']
      },
      {
        code: 'SID 232, FMI 2',
        description: 'Fuel Pressure Sensor - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Fuel system contamination', 'Wiring harness issue'],
        possibleSymptoms: ['Engine performance issues', 'Fuel economy problems', 'Check engine light'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel pressure sensor']
      },
      {
        code: 'SID 146, FMI 1',
        description: 'Coolant Level Sensor - Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty coolant level sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['False coolant level warnings', 'Engine overheating risk', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant level sensor']
      },
      {
        code: 'SID 146, FMI 2',
        description: 'Coolant Level Sensor - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty coolant level sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['False coolant level warnings', 'Engine overheating risk', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant level sensor']
      },
      {
        code: 'SID 232, FMI 1',
        description: 'Fuel Pressure Sensor - Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine performance issues', 'Fuel economy problems', 'Check engine light'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel pressure sensor']
      },
      {
        code: 'SID 232, FMI 3',
        description: 'Fuel Pressure Sensor - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine performance issues', 'Fuel economy problems', 'Check engine light'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel pressure sensor']
      },
      {
        code: 'SID 232, FMI 4',
        description: 'Fuel Pressure Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Engine performance issues', 'Fuel economy problems', 'Check engine light'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel pressure sensor']
      },
      {
        code: 'SID 232, FMI 7',
        description: 'Fuel Pressure Sensor - Mechanical System Not Responding',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Engine performance issues', 'Fuel economy problems', 'Check engine light'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel pressure sensor']
      }
    ]
  },
  {
    id: 'mack',
    name: 'Mack',
    models: [
      {
        id: 'anthem',
        name: 'Anthem',
        manufacturer: 'Mack',
        yearFrom: 2018,
        yearTo: 2025,
        engineTypes: ['Mack MP7', 'Mack MP8', 'Mack MP10'],
        transmissionTypes: ['Mack mDRIVE', 'Eaton Fuller', 'Allison']
      },
      {
        id: 'pinnacle',
        name: 'Pinnacle',
        manufacturer: 'Mack',
        yearFrom: 2006,
        yearTo: 2018,
        engineTypes: ['Mack MP7', 'Mack MP8', 'Mack MP10', 'Cummins ISX'],
        transmissionTypes: ['Mack mDRIVE', 'Eaton Fuller', 'Allison']
      },
      {
        id: 'granite',
        name: 'Granite',
        manufacturer: 'Mack',
        yearFrom: 2001,
        yearTo: 2025,
        engineTypes: ['Mack MP7', 'Mack MP8', 'Mack MP10', 'Cummins ISX'],
        transmissionTypes: ['Mack mDRIVE', 'Eaton Fuller', 'Allison']
      },
      {
        id: 'ch',
        name: 'CH',
        manufacturer: 'Mack',
        yearFrom: 1988,
        yearTo: 2016,
        engineTypes: ['Mack MP7', 'Mack MP8', 'Cummins ISX'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      }
    ],
    errorCodes: [
      {
        code: 'MID 128, PID 110, FMI 3',
        description: 'Coolant Temperature Sensor - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty temperature sensor', 'Short to power in circuit', 'ECM sensor input issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'MID 128, PID 110, FMI 4',
        description: 'Coolant Temperature Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection problem'],
        possibleSymptoms: ['No temperature reading', 'Engine protection disabled', 'Warning lights'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'MID 128, PID 94, FMI 1',
        description: 'Fuel Pressure - Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Fuel filter clogged', 'Fuel pump failure', 'Fuel line restriction'],
        possibleSymptoms: ['Engine power loss', 'Hard starting', 'Engine stalling'],
        repairCost: { min: 200, max: 600, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Fuel filter', 'Fuel pump', 'Fuel lines']
      },
      {
        code: 'MID 128, PID 110, FMI 1',
        description: 'Coolant Temperature Sensor - Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty temperature sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'MID 128, PID 110, FMI 2',
        description: 'Coolant Temperature Sensor - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty temperature sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Coolant temperature sensor']
      },
      {
        code: 'MID 128, PID 94, FMI 2',
        description: 'Fuel Pressure - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Fuel system contamination', 'Wiring harness issue'],
        possibleSymptoms: ['Engine power loss', 'Hard starting', 'Engine stalling'],
        repairCost: { min: 200, max: 600, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Fuel pressure sensor']
      },
      {
        code: 'MID 128, PID 94, FMI 3',
        description: 'Fuel Pressure - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine power loss', 'Hard starting', 'Engine stalling'],
        repairCost: { min: 200, max: 600, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Fuel pressure sensor']
      },
      {
        code: 'MID 128, PID 94, FMI 4',
        description: 'Fuel Pressure - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Engine power loss', 'Hard starting', 'Engine stalling'],
        repairCost: { min: 200, max: 600, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Fuel pressure sensor']
      },
      {
        code: 'MID 128, PID 94, FMI 7',
        description: 'Fuel Pressure - Mechanical System Not Responding',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Engine power loss', 'Hard starting', 'Engine stalling'],
        repairCost: { min: 200, max: 600, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Fuel pressure sensor']
      }
    ]
  },
  {
    id: 'international',
    name: 'International',
    models: [
      {
        id: 'prostar',
        name: 'ProStar',
        manufacturer: 'International',
        yearFrom: 2006,
        yearTo: 2017,
        engineTypes: ['Cummins ISX', 'Cummins X15', 'International A26', 'International N13'],
        transmissionTypes: ['Eaton Fuller', 'Allison', 'International']
      },
      {
        id: 'lonestar',
        name: 'LoneStar',
        manufacturer: 'International',
        yearFrom: 2008,
        yearTo: 2017,
        engineTypes: ['Cummins ISX', 'Cummins X15', 'International A26', 'International N13'],
        transmissionTypes: ['Eaton Fuller', 'Allison', 'International']
      },
      {
        id: '9900i',
        name: '9900i',
        manufacturer: 'International',
        yearFrom: 2002,
        yearTo: 2017,
        engineTypes: ['Cummins ISX', 'Caterpillar C15', 'International N13'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 'lt',
        name: 'LT Series',
        manufacturer: 'International',
        yearFrom: 2017,
        yearTo: 2025,
        engineTypes: ['Cummins X15', 'International A26', 'International N13'],
        transmissionTypes: ['Eaton Fuller', 'Allison', 'International']
      }
    ],
    errorCodes: [
      {
        code: 'SPN 102, FMI 3',
        description: 'Intake Manifold Pressure Sensor - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty intake pressure sensor', 'Short circuit in sensor wiring', 'ECM issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Intake manifold pressure sensor']
      },
      {
        code: 'SPN 102, FMI 4',
        description: 'Intake Manifold Pressure Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection issue'],
        possibleSymptoms: ['Engine performance issues', 'Check engine light', 'Reduced fuel economy'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Intake manifold pressure sensor']
      },
      {
        code: 'SPN 157, FMI 3',
        description: 'Fuel Rail Pressure - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Short circuit', 'ECM issue'],
        possibleSymptoms: ['Engine power loss', 'Rough running', 'Check engine light'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel rail pressure sensor']
      },
      {
        code: 'SPN 102, FMI 1',
        description: 'Intake Manifold Pressure Sensor - Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty intake pressure sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Intake manifold pressure sensor']
      },
      {
        code: 'SPN 102, FMI 2',
        description: 'Intake Manifold Pressure Sensor - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty intake pressure sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Intake manifold pressure sensor']
      },
      {
        code: 'SPN 157, FMI 1',
        description: 'Fuel Rail Pressure - Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine power loss', 'Rough running', 'Check engine light'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel rail pressure sensor']
      },
      {
        code: 'SPN 157, FMI 2',
        description: 'Fuel Rail Pressure - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine power loss', 'Rough running', 'Check engine light'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel rail pressure sensor']
      },
      {
        code: 'SPN 157, FMI 4',
        description: 'Fuel Rail Pressure - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Engine power loss', 'Rough running', 'Check engine light'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel rail pressure sensor']
      },
      {
        code: 'SPN 157, FMI 7',
        description: 'Fuel Rail Pressure - Mechanical System Not Responding',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Engine power loss', 'Rough running', 'Check engine light'],
        repairCost: { min: 250, max: 450, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Fuel rail pressure sensor']
      }
    ]
  },
  {
    id: 'western-star',
    name: 'Western Star',
    models: [
      {
        id: '4900',
        name: '4900',
        manufacturer: 'Western Star',
        yearFrom: 2008,
        yearTo: 2025,
        engineTypes: ['Detroit DD13', 'Detroit DD15', 'Detroit DD16', 'Cummins X15'],
        transmissionTypes: ['Eaton Fuller', 'Allison', 'Detroit DT12']
      },
      {
        id: '5700',
        name: '5700',
        manufacturer: 'Western Star',
        yearFrom: 2016,
        yearTo: 2025,
        engineTypes: ['Detroit DD13', 'Detroit DD15', 'Cummins X15'],
        transmissionTypes: ['Eaton Fuller', 'Allison', 'Detroit DT12']
      },
      {
        id: '4700',
        name: '4700',
        manufacturer: 'Western Star',
        yearFrom: 2002,
        yearTo: 2025,
        engineTypes: ['Detroit DD8', 'Cummins B6.7', 'Detroit DD13'],
        transmissionTypes: ['Allison', 'Eaton Fuller']
      }
    ],
    errorCodes: [
      {
        code: 'SPN 102, FMI 3',
        description: 'Boost Pressure Sensor - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost sensor', 'Short circuit', 'Power supply issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'SPN 190, FMI 2',
        description: 'Engine Speed Sensor - Data Erratic',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty engine speed sensor', 'Wiring damage', 'ECM timing issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine speed sensor']
      },
      {
        code: 'SPN 102, FMI 1',
        description: 'Boost Pressure Sensor - Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'SPN 102, FMI 2',
        description: 'Boost Pressure Sensor - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost sensor', 'Wiring harness damage', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'SPN 102, FMI 4',
        description: 'Boost Pressure Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Boost pressure sensor']
      },
      {
        code: 'SPN 190, FMI 1',
        description: 'Engine Speed Sensor - Low',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty engine speed sensor', 'Low voltage in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine speed sensor']
      },
      {
        code: 'SPN 190, FMI 3',
        description: 'Engine Speed Sensor - Voltage Above Normal',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty engine speed sensor', 'Short circuit in sensor wiring', 'ECM sensor input issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine speed sensor']
      },
      {
        code: 'SPN 190, FMI 4',
        description: 'Engine Speed Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty engine speed sensor', 'Open circuit in sensor wiring', 'Ground connection issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine speed sensor']
      },
      {
        code: 'SPN 190, FMI 7',
        description: 'Engine Speed Sensor - Mechanical System Not Responding',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle'],
        repairCost: { min: 250, max: 500, currency: 'USD' },
        repairTime: '2-3 hours',
        requiredParts: ['Engine speed sensor']
      }
    ]
  },
  {
    id: 'gmc',
    name: 'GMC',
    models: [
      {
        id: 'sierra',
        name: 'Sierra 1500',
        manufacturer: 'GMC',
        yearFrom: 1999,
        yearTo: 2025,
        engineTypes: ['V6 3.6L', 'V8 5.3L', 'V8 6.2L', 'Duramax Diesel 3.0L'],
        transmissionTypes: ['Automatic 6-speed', 'Automatic 8-speed', 'Automatic 10-speed']
      },
      {
        id: 'sierra_hd',
        name: 'Sierra HD 2500/3500',
        manufacturer: 'GMC',
        yearFrom: 2001,
        yearTo: 2025,
        engineTypes: ['Duramax Diesel 6.6L', 'V8 6.0L', 'V8 6.6L'],
        transmissionTypes: ['Automatic 6-speed', 'Automatic 10-speed', 'Allison Automatic']
      },
      {
        id: 'canyon',
        name: 'Canyon',
        manufacturer: 'GMC',
        yearFrom: 2004,
        yearTo: 2025,
        engineTypes: ['I4 2.5L', 'V6 3.6L', 'Duramax Diesel 2.8L'],
        transmissionTypes: ['Manual 6-speed', 'Automatic 6-speed', 'Automatic 8-speed']
      },
      {
        id: 'savana',
        name: 'Savana',
        manufacturer: 'GMC',
        yearFrom: 1996,
        yearTo: 2025,
        engineTypes: ['V6 4.3L', 'V8 6.0L', 'Duramax Diesel 2.8L', 'Duramax Diesel 6.6L'],
        transmissionTypes: ['Automatic 6-speed', 'Automatic 8-speed', 'Automatic 10-speed']
      },
      {
        id: 'acadia',
        name: 'Acadia',
        manufacturer: 'GMC',
        yearFrom: 2007,
        yearTo: 2025,
        engineTypes: ['V6 3.6L', 'I4 2.5L', 'Duramax Diesel 2.0L'],
        transmissionTypes: ['Automatic 6-speed', 'Automatic 9-speed']
      }
    ],
    errorCodes: [
      {
        code: 'P0016',
        description: 'Crankshaft Position - Camshaft Position Correlation',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['Timing chain stretched', 'Camshaft sensor faulty', 'Crankshaft sensor faulty'],
        possibleSymptoms: ['Check engine light', 'Rough idle', 'Reduced power'],
        repairCost: { min: 300, max: 800, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Camshaft position sensor', 'Crankshaft position sensor']
      },
      {
        code: 'P0300',
        description: 'Random/Multiple Cylinder Misfire Detected',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['Spark plugs worn', 'Fuel injector issues', 'Ignition coil failure'],
        possibleSymptoms: ['Rough idle', 'Loss of power', 'Check engine light'],
        repairCost: { min: 200, max: 600, currency: 'USD' },
        repairTime: '1-3 hours',
        requiredParts: ['Spark plugs', 'Ignition coils', 'Fuel injectors']
      },
      {
        code: 'P0420',
        description: 'Catalyst System Efficiency Below Threshold',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['Catalytic converter failure', 'Oxygen sensor failure', 'Exhaust leak'],
        possibleSymptoms: ['Check engine light', 'Reduced fuel economy', 'Failed emissions test'],
        repairCost: { min: 400, max: 1500, currency: 'USD' },
        repairTime: '2-6 hours',
        requiredParts: ['Catalytic converter', 'Oxygen sensors']
      },
      {
        code: 'P0700',
        description: 'Transmission Control System Malfunction',
        category: 'transmission',
        severity: 'high',
        commonCauses: ['Transmission control module failure', 'Wiring issues', 'Sensor failure'],
        possibleSymptoms: ['Check engine light', 'Transmission shifting issues', 'Reduced power'],
        repairCost: { min: 500, max: 2000, currency: 'USD' },
        repairTime: '3-8 hours',
        requiredParts: ['Transmission control module', 'Transmission sensors']
      },
      {
        code: 'P1682',
        description: 'Charging System Voltage Too Low',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Battery failure', 'Alternator failure', 'Loose connections'],
        possibleSymptoms: ['Battery warning light', 'Dim lights', 'Starting issues'],
        repairCost: { min: 150, max: 500, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Battery', 'Alternator', 'Cables']
      }
    ]
  },
  {
    id: 'ram',
    name: 'RAM',
    models: [
      {
        id: '1500',
        name: 'RAM 1500',
        manufacturer: 'RAM',
        yearFrom: 2011,
        yearTo: 2025,
        engineTypes: ['V6 3.6L', 'V8 5.7L HEMI', 'V8 6.2L HEMI', 'EcoDiesel 3.0L'],
        transmissionTypes: ['Automatic 8-speed', 'Automatic 6-speed']
      },
      {
        id: '2500',
        name: 'RAM 2500',
        manufacturer: 'RAM',
        yearFrom: 2010,
        yearTo: 2025,
        engineTypes: ['V8 6.4L HEMI', 'Cummins 6.7L Turbo Diesel'],
        transmissionTypes: ['Automatic 6-speed', 'Automatic 8-speed', 'Manual 6-speed']
      },
      {
        id: '3500',
        name: 'RAM 3500',
        manufacturer: 'RAM',
        yearFrom: 2010,
        yearTo: 2025,
        engineTypes: ['V8 6.4L HEMI', 'Cummins 6.7L Turbo Diesel'],
        transmissionTypes: ['Automatic 6-speed', 'Automatic 8-speed', 'Manual 6-speed']
      },
      {
        id: 'promaster',
        name: 'ProMaster',
        manufacturer: 'RAM',
        yearFrom: 2014,
        yearTo: 2025,
        engineTypes: ['V6 3.6L', 'EcoDiesel 3.0L'],
        transmissionTypes: ['Automatic 6-speed', 'Automatic 9-speed']
      },
      {
        id: 'rebel',
        name: 'RAM Rebel',
        manufacturer: 'RAM',
        yearFrom: 2015,
        yearTo: 2025,
        engineTypes: ['V8 5.7L HEMI', 'V8 6.2L HEMI'],
        transmissionTypes: ['Automatic 8-speed']
      }
    ],
    errorCodes: [
      {
        code: 'P0520',
        description: 'Engine Oil Pressure Sensor/Switch Circuit Malfunction',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['Oil pressure sensor failure', 'Low oil level', 'Oil pump failure'],
        possibleSymptoms: ['Oil pressure warning light', 'Check engine light'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Oil pressure sensor', 'Engine oil']
      },
      {
        code: 'P0335',
        description: 'Crankshaft Position Sensor Circuit Malfunction',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Crankshaft sensor failure', 'Wiring issues', 'Tone ring damage'],
        possibleSymptoms: ['Engine cranks but won\'t start', 'Check engine light'],
        repairCost: { min: 150, max: 300, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Crankshaft position sensor']
      },
      {
        code: 'P0480',
        description: 'Cooling Fan 1 Control Circuit Malfunction',
        category: 'cooling',
        severity: 'medium',
        commonCauses: ['Cooling fan relay failure', 'Cooling fan motor failure', 'Wiring issues'],
        possibleSymptoms: ['Engine overheating', 'Cooling fan not working'],
        repairCost: { min: 200, max: 500, currency: 'USD' },
        repairTime: '1-3 hours',
        requiredParts: ['Cooling fan relay', 'Cooling fan motor']
      },
      {
        code: 'P0856',
        description: 'Traction Control Input Signal',
        category: 'safety',
        severity: 'low',
        commonCauses: ['Wheel speed sensor failure', 'ABS module issues', 'Wiring problems'],
        possibleSymptoms: ['Traction control light on', 'ABS light on'],
        repairCost: { min: 150, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Wheel speed sensor', 'ABS sensor']
      },
      {
        code: 'P1128',
        description: 'MAP Sensor Signal Lower Than Expected',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['MAP sensor failure', 'Vacuum leak', 'Wiring issues'],
        possibleSymptoms: ['Check engine light', 'Rough idle', 'Poor performance'],
        repairCost: { min: 100, max: 250, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['MAP sensor']
      }
    ]
  },
  {
    id: 'hino',
    name: 'Hino',
    models: [
      {
        id: '155',
        name: '155',
        manufacturer: 'Hino',
        yearFrom: 2004,
        yearTo: 2025,
        engineTypes: ['Hino J05D', 'Hino J05E', 'Hino J08E'],
        transmissionTypes: ['Hino Automatic', 'Eaton Fuller', 'Allison']
      },
      {
        id: '195',
        name: '195',
        manufacturer: 'Hino',
        yearFrom: 2004,
        yearTo: 2025,
        engineTypes: ['Hino J05D', 'Hino J05E', 'Hino J08E'],
        transmissionTypes: ['Hino Automatic', 'Eaton Fuller', 'Allison']
      },
      {
        id: '238',
        name: '238',
        manufacturer: 'Hino',
        yearFrom: 2005,
        yearTo: 2025,
        engineTypes: ['Hino J08E', 'Hino J05E'],
        transmissionTypes: ['Hino Automatic', 'Eaton Fuller', 'Allison']
      },
      {
        id: '268',
        name: '268',
        manufacturer: 'Hino',
        yearFrom: 2007,
        yearTo: 2025,
        engineTypes: ['Hino J08E', 'Hino J05E'],
        transmissionTypes: ['Hino Automatic', 'Eaton Fuller', 'Allison']
      },
      {
        id: '338',
        name: '338',
        manufacturer: 'Hino',
        yearFrom: 2011,
        yearTo: 2025,
        engineTypes: ['Hino J08E', 'Hino J05E'],
        transmissionTypes: ['Hino Automatic', 'Eaton Fuller', 'Allison']
      }
    ],
    errorCodes: [
      {
        code: 'P0016',
        description: 'Crankshaft Position - Camshaft Position Correlation',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['Timing chain wear', 'Camshaft sensor failure', 'Crankshaft sensor failure'],
        possibleSymptoms: ['Check engine light', 'Rough idle', 'Reduced power'],
        repairCost: { min: 300, max: 700, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Camshaft sensor', 'Crankshaft sensor']
      },
      {
        code: 'P0301',
        description: 'Cylinder 1 Misfire Detected',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['Spark plug failure', 'Fuel injector issues', 'Compression loss'],
        possibleSymptoms: ['Rough idle', 'Loss of power', 'Check engine light'],
        repairCost: { min: 150, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Spark plugs', 'Fuel injectors']
      },
      {
        code: 'P0401',
        description: 'EGR Flow Insufficient Detected',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['EGR valve stuck', 'Carbon buildup', 'Vacuum line issues'],
        possibleSymptoms: ['Check engine light', 'Reduced power', 'Failed emissions test'],
        repairCost: { min: 200, max: 500, currency: 'USD' },
        repairTime: '1-3 hours',
        requiredParts: ['EGR valve', 'Vacuum lines']
      },
      {
        code: 'P0700',
        description: 'Transmission Control System Malfunction',
        category: 'transmission',
        severity: 'high',
        commonCauses: ['TCM failure', 'Wiring issues', 'Sensor failure'],
        possibleSymptoms: ['Check engine light', 'Transmission shifting problems'],
        repairCost: { min: 400, max: 1500, currency: 'USD' },
        repairTime: '3-6 hours',
        requiredParts: ['Transmission control module', 'Sensors']
      },
      {
        code: 'P0183',
        description: 'Fuel Temperature Sensor Circuit High Input',
        category: 'fuel',
        severity: 'low',
        commonCauses: ['Fuel temp sensor failure', 'Wiring issues', 'ECM problems'],
        possibleSymptoms: ['Check engine light', 'Fuel economy issues'],
        repairCost: { min: 100, max: 250, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Fuel temperature sensor']
      }
    ]
  },
  {
    id: 'isuzu',
    name: 'Isuzu',
    models: [
      {
        id: 'npr',
        name: 'NPR',
        manufacturer: 'Isuzu',
        yearFrom: 1986,
        yearTo: 2025,
        engineTypes: ['Isuzu 4HK1', 'Isuzu 4JJ1', 'Isuzu 4LE2'],
        transmissionTypes: ['Isuzu Automatic', 'Eaton Fuller', 'Allison']
      },
      {
        id: 'nqr',
        name: 'NQR',
        manufacturer: 'Isuzu',
        yearFrom: 1996,
        yearTo: 2025,
        engineTypes: ['Isuzu 4HK1', 'Isuzu 4JJ1'],
        transmissionTypes: ['Isuzu Automatic', 'Eaton Fuller', 'Allison']
      },
      {
        id: 'nrr',
        name: 'NRR',
        manufacturer: 'Isuzu',
        yearFrom: 2005,
        yearTo: 2025,
        engineTypes: ['Isuzu 4HK1', 'Isuzu 4JJ1'],
        transmissionTypes: ['Isuzu Automatic', 'Eaton Fuller', 'Allison']
      },
      {
        id: 'ftr',
        name: 'FTR',
        manufacturer: 'Isuzu',
        yearFrom: 2000,
        yearTo: 2025,
        engineTypes: ['Isuzu 6HK1', 'Isuzu 4HK1'],
        transmissionTypes: ['Isuzu Automatic', 'Eaton Fuller', 'Allison']
      },
      {
        id: 'fxr',
        name: 'FXR',
        manufacturer: 'Isuzu',
        yearFrom: 2010,
        yearTo: 2025,
        engineTypes: ['Isuzu 6HK1', 'Isuzu 4HK1'],
        transmissionTypes: ['Isuzu Automatic', 'Eaton Fuller', 'Allison']
      }
    ],
    errorCodes: [
      {
        code: 'P0011',
        description: 'Intake Camshaft Position System Performance',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['Camshaft position actuator failure', 'Oil flow issues', 'Timing chain problems'],
        possibleSymptoms: ['Check engine light', 'Rough idle', 'Reduced power'],
        repairCost: { min: 250, max: 600, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Camshaft position actuator', 'Engine oil']
      },
      {
        code: 'P0300',
        description: 'Random/Multiple Cylinder Misfire Detected',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['Spark plugs', 'Fuel injectors', 'Ignition coils'],
        possibleSymptoms: ['Rough idle', 'Loss of power', 'Check engine light'],
        repairCost: { min: 200, max: 500, currency: 'USD' },
        repairTime: '1-3 hours',
        requiredParts: ['Spark plugs', 'Ignition coils', 'Fuel injectors']
      },
      {
        code: 'P0404',
        description: 'EGR Position Sensor Performance',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['EGR position sensor failure', 'Carbon buildup', 'Wiring issues'],
        possibleSymptoms: ['Check engine light', 'Reduced power', 'Rough idle'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['EGR position sensor']
      },
      {
        code: 'P0700',
        description: 'Transmission Control System Malfunction',
        category: 'transmission',
        severity: 'high',
        commonCauses: ['TCM failure', 'Wiring issues', 'Sensor failure'],
        possibleSymptoms: ['Check engine light', 'Transmission shifting issues'],
        repairCost: { min: 400, max: 1200, currency: 'USD' },
        repairTime: '3-5 hours',
        requiredParts: ['Transmission control module', 'Sensors']
      },
      {
        code: 'P0181',
        description: 'Fuel Temperature Sensor Circuit Range/Performance',
        category: 'fuel',
        severity: 'low',
        commonCauses: ['Fuel temp sensor failure', 'Wiring issues', 'ECM problems'],
        possibleSymptoms: ['Check engine light', 'Fuel economy issues'],
        repairCost: { min: 100, max: 250, currency: 'USD' },
        repairTime: '1 hour',
        requiredParts: ['Fuel temperature sensor']
      }
    ]
  },
  {
    id: 'sterling',
    name: 'Sterling',
    models: [
      {
        id: 'a9500',
        name: 'A9500',
        manufacturer: 'Sterling',
        yearFrom: 1998,
        yearTo: 2010,
        engineTypes: ['Caterpillar C12', 'Detroit Series 60', 'Cummins ISX'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 'acterrra',
        name: 'Acterra',
        manufacturer: 'Sterling',
        yearFrom: 2000,
        yearTo: 2010,
        engineTypes: ['Detroit Series 60', 'Cummins ISX', 'Caterpillar C13'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 'l7500',
        name: 'L7500',
        manufacturer: 'Sterling',
        yearFrom: 1998,
        yearTo: 2010,
        engineTypes: ['Caterpillar C7', 'Detroit Series 60', 'Cummins ISC'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 'lt7500',
        name: 'LT7500',
        manufacturer: 'Sterling',
        yearFrom: 2000,
        yearTo: 2010,
        engineTypes: ['Detroit Series 60', 'Cummins ISM', 'Caterpillar C13'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 'm7500',
        name: 'M7500',
        manufacturer: 'Sterling',
        yearFrom: 2000,
        yearTo: 2010,
        engineTypes: ['Detroit Series 60', 'Cummins ISM', 'Caterpillar C13'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      }
    ],
    errorCodes: [
      {
        code: 'P0113',
        description: 'Intake Air Temperature Sensor High Input',
        category: 'engine',
        severity: 'low',
        commonCauses: ['IAT sensor failure', 'Wiring issues', 'ECM problems'],
        possibleSymptoms: ['Check engine light', 'Poor fuel economy'],
        repairCost: { min: 100, max: 200, currency: 'USD' },
        repairTime: '30 minutes-1 hour',
        requiredParts: ['Intake air temperature sensor']
      },
      {
        code: 'P0234',
        description: 'Engine Overboost Condition',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Turbo wastegate failure', 'Boost pressure sensor failure', 'Vacuum line issues'],
        possibleSymptoms: ['Check engine light', 'Reduced power', 'Engine shutdown'],
        repairCost: { min: 400, max: 1200, currency: 'USD' },
        repairTime: '2-4 hours',
        requiredParts: ['Turbo wastegate actuator', 'Boost pressure sensor']
      },
      {
        code: 'P0405',
        description: 'EGR Position Sensor Circuit Low',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['EGR position sensor failure', 'Wiring issues', 'Carbon buildup'],
        possibleSymptoms: ['Check engine light', 'Reduced power', 'Rough idle'],
        repairCost: { min: 200, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['EGR position sensor']
      },
      {
        code: 'P0705',
        description: 'Transmission Range Sensor Circuit Malfunction',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['TR sensor failure', 'Wiring issues', 'Shift linkage problems'],
        possibleSymptoms: ['Check engine light', 'Starting issues', 'Incorrect gear indication'],
        repairCost: { min: 150, max: 350, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Transmission range sensor']
      },
      {
        code: 'P0562',
        description: 'System Voltage Low',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Battery failure', 'Alternator failure', 'Loose connections'],
        possibleSymptoms: ['Battery warning light', 'Dim lights', 'Starting issues'],
        repairCost: { min: 150, max: 400, currency: 'USD' },
        repairTime: '1-2 hours',
        requiredParts: ['Battery', 'Alternator']
      }
    ]
  }
];

// Helper functions
export const getAllManufacturers = () => {
  return truckManufacturers.map(manufacturer => manufacturer.name);
};

export const getModelsForManufacturer = (manufacturerName) => {
  const manufacturer = truckManufacturers.find(m => m.name === manufacturerName);
  return manufacturer ? manufacturer.models : [];
};

export const getErrorCodesForManufacturer = (manufacturerName) => {
  const manufacturer = truckManufacturers.find(m => m.name === manufacturerName);
  return manufacturer ? manufacturer.errorCodes : [];
};

export const getErrorCodesForModel = (manufacturerName, modelId) => {
  const manufacturer = truckManufacturers.find(m => m.name === manufacturerName);
  if (!manufacturer) return [];

  const model = manufacturer.models.find(m => m.id === modelId);
  if (!model) return manufacturer.errorCodes;

  return [...manufacturer.errorCodes];
};

export const getAllEngineTypes = () => {
  const engines = new Set();
  truckManufacturers.forEach(manufacturer => {
    manufacturer.models.forEach(model => {
      model.engineTypes.forEach(engine => engines.add(engine));
    });
  });
  return Array.from(engines).sort();
};

export const getAllTransmissionTypes = () => {
  const transmissions = new Set();
  truckManufacturers.forEach(manufacturer => {
    manufacturer.models.forEach(model => {
      model.transmissionTypes.forEach(transmission => transmissions.add(transmission));
    });
  });
  return Array.from(transmissions).sort();
};

export const commonTruckSymptoms = [
  'Engine won\'t start',
  'Engine stalls while driving',
  'Engine misfires',
  'Rough idle',
  'Loss of power',
  'Excessive smoke from exhaust',
  'Engine overheating',
  'Oil pressure warning',
  'Check engine light on',
  'Reduced fuel economy',
  'Hard shifting',
  'Transmission slipping',
  'Brake warning light',
  'ABS light on',
  'Air brake system malfunction',
  'Electrical system issues',
  'Battery not charging',
  'Headlights not working',
  'Turn signals malfunctioning',
  'Horn not working',
  'HVAC system failure',
  'DEF system warning',
  'DPF regeneration issues',
  'Turbocharger problems',
  'Fuel system leak',
  'Cooling system leak',
  'Suspension problems',
  'Steering issues',
  'Tire pressure monitoring fault',
  'Speedometer not working',
  'Tachometer malfunction',
  'Dashboard warning lights'
];

export const symptomCategories = [
  'Engine Issues',
  'Transmission Problems',
  'Brake System',
  'Electrical Problems',
  'Emissions System',
  'Suspension & Steering',
  'Body & Accessories',
  'Fuel System',
  'Cooling System',
  'Safety Systems'
];
