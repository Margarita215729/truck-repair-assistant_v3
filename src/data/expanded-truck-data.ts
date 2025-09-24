// Expanded truck manufacturers, models, and error codes data
export interface TruckModel {
  id: string;
  name: string;
  manufacturer: string;
  yearFrom: number;
  yearTo: number;
  engineTypes: string[];
  transmissionTypes: string[];
}

export interface ErrorCode {
  code: string;
  description: string;
  category: 'engine' | 'transmission' | 'brakes' | 'electrical' | 'emissions' | 'safety' | 'body' | 'general';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  commonCauses: string[];
  possibleSymptoms: string[];
}

export interface Manufacturer {
  id: string;
  name: string;
  models: TruckModel[];
  errorCodes: ErrorCode[];
}

// Comprehensive truck manufacturers data - EXPANDED
export const truckManufacturers: Manufacturer[] = [
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
      {
        code: 'SPN 102, FMI 3',
        description: 'Boost Pressure Sensor Circuit - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty boost pressure sensor', 'Short to power in sensor circuit', 'Sensor power supply issue'],
        possibleSymptoms: ['Reduced engine power', 'Check engine light', 'Poor fuel economy']
      },
      {
        code: 'SPN 102, FMI 4',
        description: 'Boost Pressure Sensor Circuit - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty boost pressure sensor', 'Ground connection issue'],
        possibleSymptoms: ['Engine derate', 'Reduced acceleration', 'Check engine light']
      },
      {
        code: 'SPN 190, FMI 2',
        description: 'Engine Speed Sensor - Data Erratic',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty crankshaft position sensor', 'Wiring harness damage', 'ECM timing issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle']
      },
      {
        code: 'SPN 636, FMI 2',
        description: 'Crankshaft Position Sensor - Data Erratic',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Sensor air gap incorrect', 'Faulty sensor', 'Damaged reluctor wheel'],
        possibleSymptoms: ['Engine misfire', 'No start', 'Rough running']
      },
      {
        code: 'SPN 651, FMI 5',
        description: 'Injector #1 Circuit - Current Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty injector solenoid', 'Open circuit in injector wiring', 'ECM driver issue'],
        possibleSymptoms: ['Engine misfire', 'Rough idle', 'Reduced power']
      },
      {
        code: 'SPN 158, FMI 2',
        description: 'Key Switch Battery Potential - Data Erratic',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Loose battery connections', 'Faulty key switch', 'Wiring harness issue'],
        possibleSymptoms: ['Intermittent starting issues', 'Electrical system malfunction']
      },
      {
        code: 'SPN 168, FMI 1',
        description: 'Battery Voltage - Low',
        category: 'electrical',
        severity: 'medium',
        commonCauses: ['Weak or failing batteries', 'Alternator not charging', 'Excessive electrical load'],
        possibleSymptoms: ['Dim lights', 'Slow cranking', 'Electrical component failures']
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
        possibleSymptoms: ['Engine stalling', 'No start', 'Rough running']
      },
      {
        code: 'SID 21, FMI 7',
        description: 'Engine Position Sensor - Mechanical System Not Responding',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Sensor alignment issue', 'Damaged sensor wheel', 'Loose sensor mounting'],
        possibleSymptoms: ['Engine misfire', 'Reduced power', 'Check engine light']
      },
      {
        code: 'SID 146, FMI 5',
        description: 'EGR Valve Position Sensor - Current Below Normal',
        category: 'emissions',
        severity: 'medium',
        commonCauses: ['Faulty EGR position sensor', 'Open circuit in sensor wiring', 'ECM issue'],
        possibleSymptoms: ['Increased emissions', 'Check engine light', 'Reduced fuel economy']
      },
      {
        code: 'SID 84, FMI 2',
        description: 'Vehicle Speed Sensor - Data Erratic',
        category: 'transmission',
        severity: 'medium',
        commonCauses: ['Faulty VSS sensor', 'Wiring damage', 'Sensor mounting issue'],
        possibleSymptoms: ['Speedometer not working', 'Transmission shifting issues']
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
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light']
      },
      {
        code: 'PACCAR MID 128, PID 190, FMI 2',
        description: 'Engine Speed Sensor - Data Erratic',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty engine speed sensor', 'Wiring damage', 'ECM timing issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle']
      },
      {
        code: 'PACCAR MID 128, PID 110, FMI 3',
        description: 'Coolant Temperature - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty temperature sensor', 'Short circuit', 'ECM issue'],
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating']
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
        possibleSymptoms: ['False coolant level warnings', 'Engine overheating risk', 'Check engine light']
      },
      {
        code: 'SID 146, FMI 4',
        description: 'Coolant Level Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection issue'],
        possibleSymptoms: ['No coolant level reading', 'Warning lights', 'Reduced engine protection']
      },
      {
        code: 'SID 232, FMI 2',
        description: 'Fuel Pressure Sensor - Data Erratic',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Fuel system contamination', 'Wiring harness issue'],
        possibleSymptoms: ['Engine performance issues', 'Fuel economy problems', 'Check engine light']
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
        possibleSymptoms: ['Incorrect temperature readings', 'Engine overheating', 'Check engine light']
      },
      {
        code: 'MID 128, PID 110, FMI 4',
        description: 'Coolant Temperature Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection problem'],
        possibleSymptoms: ['No temperature reading', 'Engine protection disabled', 'Warning lights']
      },
      {
        code: 'MID 128, PID 94, FMI 1',
        description: 'Fuel Pressure - Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Fuel filter clogged', 'Fuel pump failure', 'Fuel line restriction'],
        possibleSymptoms: ['Engine power loss', 'Hard starting', 'Engine stalling']
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
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light']
      },
      {
        code: 'SPN 102, FMI 4',
        description: 'Intake Manifold Pressure Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection issue'],
        possibleSymptoms: ['Engine performance issues', 'Check engine light', 'Reduced fuel economy']
      },
      {
        code: 'SPN 157, FMI 3',
        description: 'Fuel Rail Pressure - Voltage Above Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Faulty fuel pressure sensor', 'Short circuit', 'ECM issue'],
        possibleSymptoms: ['Engine power loss', 'Rough running', 'Check engine light']
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
        possibleSymptoms: ['Engine derate', 'Reduced power', 'Check engine light']
      },
      {
        code: 'SPN 190, FMI 2',
        description: 'Engine Speed Sensor - Data Erratic',
        category: 'engine',
        severity: 'critical',
        commonCauses: ['Faulty engine speed sensor', 'Wiring damage', 'ECM timing issue'],
        possibleSymptoms: ['Engine stalling', 'No start condition', 'Rough idle']
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
        yearFrom: 2000,
        yearTo: 2009,
        engineTypes: ['Caterpillar C15', 'Detroit Series 60', 'Cummins ISX'],
        transmissionTypes: ['Eaton Fuller', 'Allison']
      },
      {
        id: 'actterra',
        name: 'Acterra',
        manufacturer: 'Sterling',
        yearFrom: 2000,
        yearTo: 2009,
        engineTypes: ['Caterpillar C7', 'Cummins ISC', 'Detroit Series 60'],
        transmissionTypes: ['Allison', 'Eaton Fuller']
      }
    ],
    errorCodes: [
      {
        code: 'SPN 102, FMI 4',
        description: 'Boost Pressure Sensor - Voltage Below Normal',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Open circuit in sensor wiring', 'Faulty sensor', 'Ground connection issue'],
        possibleSymptoms: ['Engine performance issues', 'Check engine light']
      }
    ]
  },
  {
    id: 'hino',
    name: 'Hino',
    models: [
      {
        id: '238',
        name: '238',
        manufacturer: 'Hino',
        yearFrom: 2012,
        yearTo: 2025,
        engineTypes: ['Hino J05E', 'Hino J08E'],
        transmissionTypes: ['Aisin', 'Allison']
      },
      {
        id: '268',
        name: '268',
        manufacturer: 'Hino',
        yearFrom: 2012,
        yearTo: 2025,
        engineTypes: ['Hino J08E'],
        transmissionTypes: ['Aisin', 'Allison']
      },
      {
        id: '338',
        name: '338',
        manufacturer: 'Hino',
        yearFrom: 2012,
        yearTo: 2025,
        engineTypes: ['Hino J08E'],
        transmissionTypes: ['Aisin', 'Allison']
      }
    ],
    errorCodes: [
      {
        code: 'DTC P0087',
        description: 'Fuel Rail Pressure Too Low',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Fuel filter clogged', 'Fuel pump failure', 'Pressure regulator issue'],
        possibleSymptoms: ['Engine power loss', 'Hard starting', 'Engine stalling']
      },
      {
        code: 'DTC P0299',
        description: 'Turbocharger Underboost',
        category: 'engine',
        severity: 'high',
        commonCauses: ['Turbocharger wastegate issue', 'Boost pressure sensor fault', 'Air intake restriction'],
        possibleSymptoms: ['Reduced engine power', 'Poor acceleration', 'Check engine light']
      }
    ]
  },
  {
    id: 'isuzu',
    name: 'Isuzu',
    models: [
      {
        id: 'n-series',
        name: 'N Series',
        manufacturer: 'Isuzu',
        yearFrom: 2005,
        yearTo: 2025,
        engineTypes: ['Isuzu 4JJ1', 'Isuzu 4HK1'],
        transmissionTypes: ['Aisin', 'Isuzu']
      },
      {
        id: 'f-series',
        name: 'F Series',
        manufacturer: 'Isuzu',
        yearFrom: 2005,
        yearTo: 2025,
        engineTypes: ['Isuzu 4HK1', 'Isuzu 6HK1'],
        transmissionTypes: ['Aisin', 'Isuzu']
      }
    ],
    errorCodes: [
      {
        code: 'DTC P0088',
        description: 'Fuel Rail Pressure Too High',
        category: 'engine',
        severity: 'medium',
        commonCauses: ['Faulty fuel pressure regulator', 'Stuck fuel pressure relief valve'],
        possibleSymptoms: ['Engine rough running', 'Fuel leaks', 'Check engine light']
      }
    ]
  }
];

// Helper functions to get data for dropdowns
export const getAllManufacturers = (): string[] => {
  return truckManufacturers.map(manufacturer => manufacturer.name);
};

export const getModelsForManufacturer = (manufacturerName: string): TruckModel[] => {
  const manufacturer = truckManufacturers.find(m => m.name === manufacturerName);
  return manufacturer ? manufacturer.models : [];
};

export const getErrorCodesForManufacturer = (manufacturerName: string): ErrorCode[] => {
  const manufacturer = truckManufacturers.find(m => m.name === manufacturerName);
  return manufacturer ? manufacturer.errorCodes : [];
};

export const getErrorCodesForModel = (manufacturerName: string, modelId: string): ErrorCode[] => {
  const manufacturer = truckManufacturers.find(m => m.name === manufacturerName);
  if (!manufacturer) return [];

  const model = manufacturer.models.find(m => m.id === modelId);
  if (!model) return manufacturer.errorCodes;

  return [...manufacturer.errorCodes];
};

export const getAllEngineTypes = (): string[] => {
  const engines = new Set<string>();
  truckManufacturers.forEach(manufacturer => {
    manufacturer.models.forEach(model => {
      model.engineTypes.forEach(engine => engines.add(engine));
    });
  });
  return Array.from(engines).sort();
};

export const getAllTransmissionTypes = (): string[] => {
  const transmissions = new Set<string>();
  truckManufacturers.forEach(manufacturer => {
    manufacturer.models.forEach(model => {
      model.transmissionTypes.forEach(transmission => transmissions.add(transmission));
    });
  });
  return Array.from(transmissions).sort();
};

// Common truck symptoms for diagnostic
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
  'Dashboard warning lights',
  'DEF level low',
  'DPF clogged',
  'EGR valve stuck',
  'Turbo lag',
  'Fuel filter clogged',
  'Oil leak',
  'Coolant leak',
  'Air brake pressure low',
  'Power steering failure',
  'Alternator failure',
  'Starter motor issues',
  'Glow plug failure',
  'Injector problems',
  'Sensor failures',
  'Wiring harness damage',
  'ECM communication error'
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
  'Safety Systems',
  'Exhaust System',
  'Air System'
];
