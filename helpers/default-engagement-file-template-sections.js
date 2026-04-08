/** Seed for org template tables (Archivo permanente only). Flow: docs/technical/engagement-templates.md */
export const DEFAULT_ENGAGEMENT_FILE_TEMPLATE_SECTIONS = [
  {
    code: 'KN01',
    name: '1. CONOCIMIENTO DEL NEGOCIO – HISTORIA Y EVOLUCIÓN',
    priority: 'P1',
    sortOrder: 0,
    retentionScope: 'structural',
    items: [
      { code: 'KN01.01', description: 'Fecha de inicio de operaciones', isRequired: false, ref: null, sortOrder: 0, retentionScope: 'structural' },
      { code: 'KN01.02', description: 'Hitos relevantes en la historia del negocio', isRequired: false, ref: null, sortOrder: 1, retentionScope: 'structural' },
      { code: 'KN01.03', description: 'Cambios significativos en el giro del negocio', isRequired: false, ref: null, sortOrder: 2, retentionScope: 'structural' },
      { code: 'KN01.04', description: 'Crisis, reestructuraciones o reorganizaciones relevantes', isRequired: false, ref: null, sortOrder: 3, retentionScope: 'structural' },
      { code: 'KN01.05', description: 'Hechos económicos o legales que marcaron la evolución', isRequired: false, ref: null, sortOrder: 4, retentionScope: 'structural' },
      { code: 'KN01.06', description: 'Eventos históricos que pusieron en riesgo la continuidad del negocio', isRequired: false, ref: null, sortOrder: 5, retentionScope: 'structural' },
      { code: 'KN01.07', description: 'Fusiones, adquisiciones, escisiones pasadas', isRequired: false, ref: null, sortOrder: 6, retentionScope: 'structural' },
      { code: 'KN01.08', description: 'Expansión geográfica histórica', isRequired: false, ref: null, sortOrder: 7, retentionScope: 'structural' },
      { code: 'KN01.09', description: 'Línea de tiempo resumida de hitos del negocio', isRequired: false, ref: null, sortOrder: 8, retentionScope: 'structural' },
      { code: 'KN01.10', description: 'Evaluación de impacto en continuidad del negocio del período', isRequired: false, ref: null, sortOrder: 9, retentionScope: 'per_period' }
    ]
  },
  {
    code: 'KN02',
    name: '2. ORGANIZACIÓN SOCIETARIA Y LEGAL',
    priority: 'P1',
    sortOrder: 1,
    retentionScope: 'structural',
    items: [
      { code: 'KN02.01', description: 'Tipo de compañía y normativa aplicable', isRequired: false, ref: null, sortOrder: 0, retentionScope: 'structural' },
      { code: 'KN02.02', description: 'Escritura de constitución y reformas', isRequired: false, ref: null, sortOrder: 1, retentionScope: 'structural' },
      { code: 'KN02.03', description: 'Estatutos sociales vigentes e históricos relevantes', isRequired: false, ref: null, sortOrder: 2, retentionScope: 'structural' },
      { code: 'KN02.04', description: 'Evolución de la estructura accionaria', isRequired: false, ref: null, sortOrder: 3, retentionScope: 'structural' },
      { code: 'KN02.05', description: 'Derechos y restricciones de acciones', isRequired: false, ref: null, sortOrder: 4, retentionScope: 'structural' },
      { code: 'KN02.06', description: 'Pactos parasociales / acuerdos entre socios', isRequired: false, ref: null, sortOrder: 5, retentionScope: 'structural' },
      { code: 'KN02.07', description: 'Contratos de recompra de acciones', isRequired: false, ref: null, sortOrder: 6, retentionScope: 'structural' },
      { code: 'KN02.08', description: 'Participación en otras compañías', isRequired: false, ref: null, sortOrder: 7, retentionScope: 'structural' },
      { code: 'KN02.09', description: 'Representación legal y poderes vigentes', isRequired: false, ref: null, sortOrder: 8, retentionScope: 'structural' },
      { code: 'KN02.10', description: 'Cambios societarios ocurridos en el período', isRequired: false, ref: null, sortOrder: 9, retentionScope: 'per_period' }
    ]
  },
  {
    code: 'KN03',
    name: '3. GOBIERNO CORPORATIVO',
    priority: 'P1',
    sortOrder: 2,
    retentionScope: 'structural',
    items: [
      { code: 'KN03.01', description: 'Órganos de administración y control', isRequired: false, ref: null, sortOrder: 0, retentionScope: 'structural' },
      { code: 'KN03.02', description: 'Composición histórica del directorio o junta directiva', isRequired: false, ref: null, sortOrder: 1, retentionScope: 'structural' },
      { code: 'KN03.03', description: 'Cambios relevantes en alta administración (hechos)', isRequired: false, ref: null, sortOrder: 2, retentionScope: 'structural' },
      { code: 'KN03.04', description: 'Políticas de gobierno corporativo', isRequired: false, ref: null, sortOrder: 3, retentionScope: 'structural' },
      { code: 'KN03.05', description: 'Extractos relevantes de actas históricas', isRequired: false, ref: null, sortOrder: 4, retentionScope: 'structural' },
      { code: 'KN03.06', description: 'Actas completas del período auditado', isRequired: false, ref: null, sortOrder: 5, retentionScope: 'per_period' },
      { code: 'KN03.07', description: 'Evaluación del gobierno corporativo del período', isRequired: false, ref: null, sortOrder: 6, retentionScope: 'per_period' }
    ]
  },
  {
    code: 'KN04',
    name: '4. ORGANIZACIÓN ADMINISTRATIVA',
    priority: 'P1',
    sortOrder: 3,
    retentionScope: 'structural',
    items: [
      { code: 'KN04.01', description: 'Organigrama estructural', isRequired: false, ref: null, sortOrder: 0, retentionScope: 'structural' },
      { code: 'KN04.02', description: 'Funciones y responsabilidades', isRequired: false, ref: null, sortOrder: 1, retentionScope: 'structural' },
      { code: 'KN04.03', description: 'Cambios estructurales importantes', isRequired: false, ref: null, sortOrder: 2, retentionScope: 'structural' },
      { code: 'KN04.04', description: 'Dependencia de personas clave', isRequired: false, ref: null, sortOrder: 3, retentionScope: 'structural' },
      { code: 'KN04.05', description: 'Estructura centralizada / descentralizada', isRequired: false, ref: null, sortOrder: 4, retentionScope: 'structural' },
      { code: 'KN04.06', description: 'Nivel de formalización de la gestión', isRequired: false, ref: null, sortOrder: 5, retentionScope: 'structural' },
      { code: 'KN04.07', description: 'Nómina, roles y movimientos del período', isRequired: false, ref: null, sortOrder: 6, retentionScope: 'per_period' }
    ]
  },
  {
    code: 'KN05',
    name: '5. ESTRATEGIA Y MODELO DE NEGOCIO',
    priority: 'P1',
    sortOrder: 4,
    retentionScope: 'structural',
    items: [
      { code: 'KN05.01', description: 'Actividad principal y líneas de negocio', isRequired: false, ref: null, sortOrder: 0, retentionScope: 'structural' },
      { code: 'KN05.02', description: 'Segmentos de mercado atendidos', isRequired: false, ref: null, sortOrder: 1, retentionScope: 'structural' },
      { code: 'KN05.03', description: 'Clientes y proveedores estratégicos (histórico)', isRequired: false, ref: null, sortOrder: 2, retentionScope: 'structural' },
      { code: 'KN05.04', description: 'Ventajas competitivas históricas', isRequired: false, ref: null, sortOrder: 3, retentionScope: 'structural' },
      { code: 'KN05.05', description: 'Factores críticos del negocio', isRequired: false, ref: null, sortOrder: 4, retentionScope: 'structural' },
      { code: 'KN05.06', description: 'Riesgos del modelo de negocio identificados', isRequired: false, ref: null, sortOrder: 5, retentionScope: 'structural' },
      { code: 'KN05.07', description: 'Análisis de desempeño del modelo en el período', isRequired: false, ref: null, sortOrder: 6, retentionScope: 'per_period' }
    ]
  },
  {
    code: 'KN06',
    name: '6. FINANCIAMIENTO Y RELACIONES EXTERNAS',
    priority: 'P1',
    sortOrder: 5,
    retentionScope: 'structural',
    items: [
      { code: 'KN06.01', description: 'Historial de financiamiento relevante', isRequired: false, ref: null, sortOrder: 0, retentionScope: 'structural' },
      { code: 'KN06.02', description: 'Relación con entidades financieras', isRequired: false, ref: null, sortOrder: 1, retentionScope: 'structural' },
      { code: 'KN06.03', description: 'Garantías otorgadas históricamente', isRequired: false, ref: null, sortOrder: 2, retentionScope: 'structural' },
      { code: 'KN06.04', description: 'Convenios financieros importantes', isRequired: false, ref: null, sortOrder: 3, retentionScope: 'structural' },
      { code: 'KN06.05', description: 'Activos dados en garantía', isRequired: false, ref: null, sortOrder: 4, retentionScope: 'structural' },
      { code: 'KN06.06', description: 'Nuevos préstamos o renegociaciones del período', isRequired: false, ref: null, sortOrder: 5, retentionScope: 'per_period' },
      { code: 'KN06.07', description: 'Cumplimiento de covenants del período', isRequired: false, ref: null, sortOrder: 6, retentionScope: 'per_period' }
    ]
  },
  {
    code: 'KN07',
    name: '7. EXPANSIÓN Y CRECIMIENTO',
    priority: 'P2',
    sortOrder: 6,
    retentionScope: 'structural',
    items: [
      { code: 'KN07.01', description: 'Apertura o cierre histórico de sucursales', isRequired: false, ref: null, sortOrder: 0, retentionScope: 'structural' },
      { code: 'KN07.02', description: 'Cambios relevantes en cobertura geográfica', isRequired: false, ref: null, sortOrder: 1, retentionScope: 'structural' },
      { code: 'KN07.03', description: 'Proyectos de inversión ejecutados (histórico)', isRequired: false, ref: null, sortOrder: 2, retentionScope: 'structural' },
      { code: 'KN07.04', description: 'Proyectos en ejecución del período', isRequired: false, ref: null, sortOrder: 3, retentionScope: 'per_period' }
    ]
  },
  {
    code: 'KN08',
    name: '8. CUMPLIMIENTO LEGAL Y REGULATORIO',
    priority: 'P2',
    sortOrder: 7,
    retentionScope: 'structural',
    items: [
      { code: 'KN08.01', description: 'Litigios relevantes históricos', isRequired: false, ref: null, sortOrder: 0, retentionScope: 'structural' },
      { code: 'KN08.02', description: 'Contingencias legales significativas', isRequired: false, ref: null, sortOrder: 1, retentionScope: 'structural' },
      { code: 'KN08.03', description: 'Sanciones relevantes históricas', isRequired: false, ref: null, sortOrder: 2, retentionScope: 'structural' },
      { code: 'KN08.04', description: 'Cambios regulatorios que impactan al negocio', isRequired: false, ref: null, sortOrder: 3, retentionScope: 'structural' },
      { code: 'KN08.05', description: 'Nuevos litigios o sanciones del período', isRequired: false, ref: null, sortOrder: 4, retentionScope: 'per_period' },
      { code: 'KN08.06', description: 'Evaluación de cumplimiento legal del período', isRequired: false, ref: null, sortOrder: 5, retentionScope: 'per_period' }
    ]
  },
  {
    code: 'KN09',
    name: '9. POLÍTICAS CONTABLES Y CONTROL INTERNO',
    priority: 'P2',
    sortOrder: 8,
    retentionScope: 'structural',
    items: [
      { code: 'KN09.01', description: 'Políticas contables significativas (NIIF)', isRequired: false, ref: null, sortOrder: 0, retentionScope: 'structural' },
      { code: 'KN09.02', description: 'Cambios históricos en políticas contables', isRequired: false, ref: null, sortOrder: 1, retentionScope: 'structural' },
      { code: 'KN09.03', description: 'Manuales y reglamentos internos', isRequired: false, ref: null, sortOrder: 2, retentionScope: 'structural' },
      { code: 'KN09.04', description: 'Descripción del sistema de control interno', isRequired: false, ref: null, sortOrder: 3, retentionScope: 'structural' },
      { code: 'KN09.05', description: 'Flujogramas / narrativas de procesos', isRequired: false, ref: null, sortOrder: 4, retentionScope: 'structural' },
      { code: 'KN09.06', description: 'Juicios contables históricos', isRequired: false, ref: null, sortOrder: 5, retentionScope: 'structural' },
      { code: 'KN09.07', description: 'Pruebas de controles del período', isRequired: false, ref: null, sortOrder: 6, retentionScope: 'per_period' },
      { code: 'KN09.08', description: 'Ajustes contables y reclasificaciones del período', isRequired: false, ref: null, sortOrder: 7, retentionScope: 'per_period' }
    ]
  },
  {
    code: 'KN10',
    name: '10. DOCUMENTOS Y CONTRATOS',
    priority: 'P2',
    sortOrder: 9,
    retentionScope: 'structural',
    items: [
      { code: 'KN10.01', description: 'Contratos societarios relevantes', isRequired: false, ref: null, sortOrder: 0, retentionScope: 'structural' },
      { code: 'KN10.02', description: 'Contratos de largo plazo', isRequired: false, ref: null, sortOrder: 1, retentionScope: 'structural' },
      { code: 'KN10.03', description: 'Pólizas de seguros', isRequired: false, ref: null, sortOrder: 2, retentionScope: 'structural' },
      { code: 'KN10.04', description: 'Patentes y licencias', isRequired: false, ref: null, sortOrder: 3, retentionScope: 'structural' },
      { code: 'KN10.05', description: 'Contratos firmados o modificados en el período', isRequired: false, ref: null, sortOrder: 4, retentionScope: 'per_period' },
      { code: 'KN10.06', description: 'Cumplimiento contractual del período', isRequired: false, ref: null, sortOrder: 5, retentionScope: 'per_period' }
    ]
  }
];
