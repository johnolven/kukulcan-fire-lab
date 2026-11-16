// Spanish for the "evidence" group of files. Key: the English text exactly as written in the code.
// Code generated with SI assistance (Claude Code).

export const EVIDENCE: Record<string, string> = {
  // ---------- shared small labels ----------
  solid: "sólido",
  liquid: "líquido",
  gas: "gas",
  smoke: "humo",
  total: "total",
  "not given": "sin dato",
  ground: "tierra",

  // pillars
  prevention: "prevención",
  detection: "detección",
  suppression: "supresión",
  fundamentals: "fundamentos",
  "partial-gravity proxy": "sustituto de gravedad parcial",
  modeling: "modelado",

  // what a row of the test table stands for
  test: "prueba",
  session: "sesión",
  matrix: "matriz",

  // harmonized outcomes
  Disruption: "Disrupción",
  Extinction: "Extinción",
  Completion: "Quema completa",
  "Did not sustain burning": "No sostuvo la combustión",
  "Flow terminated": "Flujo interrumpido",
  "Self-extinguished": "Se autoextinguió",
  "Did not ignite": "No encendió",

  // ---------- lab.ts: ranking reasons ----------
  "Addresses {pillars} directly.": "Aborda directamente {pillars}.",
  "Fundamental combustion science; indirect fire-safety relevance.": "Ciencia fundamental de la combustión; relevancia indirecta para la seguridad contra incendios.",
  "Closest record: {o2} O2 at {psi} psi (inside the design point).": "Registro más cercano: {o2} O2 a {psi} psi (dentro del punto de diseño).",
  "Closest record: {o2} O2 at {psi} psi (near the design point).": "Registro más cercano: {o2} O2 a {psi} psi (cerca del punto de diseño).",
  "Closest record: {o2} O2 at {psi} psi (far from the design point).": "Registro más cercano: {o2} O2 a {psi} psi (lejos del punto de diseño).",
  "Closest record: {o2} O2, pressure not given (inside the design point).": "Registro más cercano: {o2} O2, presión sin dato (dentro del punto de diseño).",
  "Closest record: {o2} O2, pressure not given (near the design point).": "Registro más cercano: {o2} O2, presión sin dato (cerca del punto de diseño).",
  "Closest record: {o2} O2, pressure not given (far from the design point).": "Registro más cercano: {o2} O2, presión sin dato (lejos del punto de diseño).",
  "No oxygen values in its test table, so it cannot be placed against the design atmosphere.": "Su tabla de pruebas no trae valores de oxígeno, así que no se puede ubicar frente a la atmósfera de diseño.",
  "Burns real solid materials.": "Quema materiales sólidos reales.",
  "Measures smoke from overheated spacecraft materials.": "Mide el humo de materiales de nave sobrecalentados.",
  "Liquid droplets: transferable physics, not cabin materials.": "Gotas líquidas: física transferible, no materiales de cabina.",
  "Gas burner designed to emulate burning solids.": "Quemador de gas diseñado para emular sólidos en combustión.",
  "Gas flames: transferable physics, not cabin materials.": "Llamas de gas: física transferible, no materiales de cabina.",

  // ---------- lab.ts: gaps ----------
  "No solid-material test at 30% oxygen or more": "Ninguna prueba de material sólido con 30% de oxígeno o más",
  "{n} tests reach 30% oxygen or more, and all are gas flames or liquid droplets. {solids} are solids. The highest oxygen level recorded for a solid sample is {max}% ({withO2} solid records carry an oxygen value). Material selection for an enriched cabin rests on extrapolation.":
    "{n} pruebas llegan a 30% de oxígeno o más, y todas son llamas de gas o gotas líquidas. {solids} son sólidos. El nivel de oxígeno más alto registrado para una muestra sólida es {max}% ({withO2} registros de sólidos traen un valor de oxígeno). La selección de materiales para una cabina enriquecida se apoya en extrapolación.",
  "No partial-gravity data": "Sin datos en gravedad parcial",
  "Every record is microgravity or a ground reference. Lunar (0.17 g) and Martian (0.38 g) behavior can only be bounded between the two. ACME E-FIELD Flames used an electric field to mimic buoyancy, which is the closest proxy in the repository.":
    "Todos los registros son de microgravedad o de referencia en tierra. El comportamiento lunar (0.17 g) y marciano (0.38 g) solo se puede acotar entre ambos. ACME E-FIELD Flames usó un campo eléctrico para imitar la flotabilidad; es el sustituto más cercano que hay en el repositorio.",
  "Enriched oxygen at reduced pressure is thinly covered": "El oxígeno enriquecido a presión reducida tiene poca cobertura",
  "{n} records combine 30% oxygen or more with 10.2 psi or less, the corner where a Moon base is expected to operate. They come from {names}, all with gaseous fuel.":
    "{n} registros combinan 30% de oxígeno o más con 10.2 psi o menos, la esquina donde se espera que opere una base lunar. Provienen de {names}, todos con combustible gaseoso.",
  "no investigation": "ninguna investigación",
  "Air flow is missing from most records": "A la mayoría de los registros les falta el flujo de aire",
  "Only {n} of {total} records give a flow speed in cm/s. BASS and BASS-II log a fan setting rather than a calibrated speed, so ventilation effects on solids need the raw data to quantify.":
    "Solo {n} de {total} registros dan una velocidad de flujo en cm/s. BASS y BASS-II anotan un ajuste del ventilador y no una velocidad calibrada, así que cuantificar el efecto de la ventilación en sólidos requiere los datos crudos.",
  "Smoke data has no oxygen dimension": "Los datos de humo no tienen dimensión de oxígeno",
  "SAME and SAME-R characterize smoke from five overheated materials by flow and aging time. None of those records vary oxygen, so detector tuning for an enriched cabin is untested.":
    "SAME y SAME-R caracterizan el humo de cinco materiales sobrecalentados según el flujo y el tiempo de envejecimiento. Ninguno de esos registros varía el oxígeno, así que el ajuste de detectores para una cabina enriquecida no se ha probado.",
  "The design point itself is outside the tested envelope": "El punto de diseño mismo está fuera de la envolvente probada",
  "The closest record of any kind is {name} at {o2}% oxygen and {psi} psi.": "El registro más cercano de cualquier tipo es {name}, con {o2}% de oxígeno y {psi} psi.",
  "The closest record of any kind is {name} at {o2}% oxygen.": "El registro más cercano de cualquier tipo es {name}, con {o2}% de oxígeno.",
  "Solids were tested {d} oxygen points below this design": "Los sólidos se probaron {d} puntos de oxígeno por debajo de este diseño",
  "Closest solid record: {name}, {material} at {o2}% oxygen. Flammability depends strongly on oxygen, so this cannot be read across.":
    "Registro de sólido más cercano: {name}, {material} con {o2}% de oxígeno. La inllamabilidad depende mucho del oxígeno, así que este resultado no se puede trasladar a tu diseño.",

  // ---------- lab.ts: one-line description of a test ----------
  "oxygen not given": "oxígeno sin dato",
  "pressure not given": "presión sin dato",
  "burner oxidizer stream": "corriente oxidante del quemador",
  "{v} cm/s flow": "flujo de {v} cm/s",
  "{v} s burn": "quema de {v} s",

  // ---------- Panels: ranking ----------
  "Fire-safety directness": "Relación directa con seguridad contra incendios",
  "Tested near this design": "Probado cerca de este diseño",
  "Fuel or material relevance": "Relevancia del combustible o material",
  "Evidence volume": "Volumen de evidencia",
  "Data availability": "Disponibilidad de datos",
  Direct: "Directo",
  Near: "Cerca",
  Material: "Material",
  Volume: "Volumen",
  Data: "Datos",
  "{name}, out of {max}": "{name}, de un máximo de {max}",

  // ---------- Panels: investigation detail ----------
  "No link returned": "No se devolvió ningún enlace",
  "NASA PSI did not return a link for this file ({reason}). Open the investigation page instead.":
    "NASA PSI no devolvió un enlace para este archivo ({reason}). Mejor abre la página de la investigación.",
  Close: "Cerrar",
  "Records in table": "Registros en la tabla",
  "{n} ({flames} flames)": "{n} ({flames} llamas)",
  "Oxygen tested": "Oxígeno probado",
  "Pressure tested": "Presión probada",
  "Air flow tested": "Flujo de aire probado",
  "Source data": "Datos fuente",
  "{n} files · {size}": "{n} archivos · {size}",
  "Video files": "Archivos de video",
  Publications: "Publicaciones",
  Dates: "Fechas",
  Objective: "Objetivo",
  Hypothesis: "Hipótesis",
  "Impact and Earth benefits": "Impacto y beneficios en la Tierra",
  Materials: "Materiales",
  Fuels: "Combustibles",
  "Open in NASA PSI ↗": "Abrir en NASA PSI ↗",
  "Publications ({n})": "Publicaciones ({n})",
  "Files served live by NASA PSI · {videos} video · {docs} documents": "Archivos servidos en vivo por NASA PSI · {videos} de video · {docs} documentos",
  "Requesting link…": "Solicitando enlace…",

  // ---------- Panels: investigations table ----------
  Investigation: "Investigación",
  Pillars: "Pilares",
  Facility: "Instalación",
  "Fuel or material": "Combustible o material",
  Records: "Registros",
  "Oxygen %": "Oxígeno %",
  "Pressure psi": "Presión psi",
  Video: "Video",
  Papers: "Artículos",
  Score: "Puntaje",

  // ---------- Panels: tests table ----------
  "Search id, fuel, material, outcome": "Busca id, combustible, material, resultado",
  "Search test records": "Buscar registros de prueba",
  "{n} of {total} records": "{n} de {total} registros",
  "showing first 300": "se muestran los primeros 300",
  "Download CSV ({n})": "Descargar CSV ({n})",
  Test: "Prueba",
  "Row is": "La fila es",
  Setup: "Montaje",
  "Flow cm/s": "Flujo cm/s",
  Diluent: "Diluyente",
  Outcome: "Resultado",
  "Burn s": "Quema s",
  "— not given in the source table · * oxygen is the burner stream, not the chamber · † cabin pressure assumed (experiment open to cabin air)":
    "— sin dato en la tabla fuente · * el oxígeno es el de la corriente del quemador, no el de la cámara · † presión de cabina supuesta (experimento abierto al aire de la cabina)",

  // ---------- Panels: materials ----------
  "Evidence type": "Tipo de evidencia",
  Investigations: "Investigaciones",
  "Oxygen tested %": "Oxígeno probado %",
  "At 30% O₂ or more": "Con 30% de O₂ o más",
  "smoke / detection": "humo / detección",
  flammability: "inllamabilidad",
  "{n} records": "{n} registros",
  "never tested": "nunca probado",
  "These are the only materials in the PSI experimental tables. Structural metals, composites and most cabin plastics have no record here. Click a row to filter the test table.":
    "Estos son los únicos materiales en las tablas experimentales de PSI. Los metales estructurales, los compuestos y la mayoría de los plásticos de cabina no tienen ningún registro aquí. Haz clic en una fila para filtrar la tabla de pruebas.",

  // ---------- Panels: gaps and coverage ----------
  critical: "crítico",
  major: "importante",
  note: "nota",
  "Records per oxygen and pressure band": "Registros por banda de oxígeno y presión",
  "Dashed cells are the Moon base and rover corner (30% oxygen or more, about 10.2 psi or less). Only records with both oxygen and pressure are counted.":
    "Las celdas punteadas son la esquina de base lunar y rover (30% de oxígeno o más, unos 10.2 psi o menos). Solo se cuentan los registros que traen oxígeno y presión.",

  // ---------- Panels: brief ----------
  "What should I know before selecting cabin materials for this atmosphere?": "¿Qué debo saber antes de elegir materiales de cabina para esta atmósfera?",
  "Question for the analysts": "Pregunta para los analistas",
  "Analysts working…": "Analistas trabajando…",
  "Ask the swarm": "Pregunta al enjambre",
  "Assembled by code, no language model": "Armado por código, sin modelo de lenguaje",
  "Evidence only": "Solo evidencia",
  "Design: {design} · Agents: prevention · detection · suppression · lead": "Diseño: {design} · Agentes: prevención · detección · supresión · líder",
  "Bottom line": "En resumen",
  "Cites: {list}": "Cita: {list}",
  "SI-generated text": "Texto generado con SI",
  "No SI text": "Sin texto de SI",

  // ---------- Panels: connect ----------
  "The lab is also an MCP server. Any assistant that speaks the Model Context Protocol can query the same harmonized records, the ranking and the analysts.":
    "El laboratorio también es un servidor MCP. Cualquier asistente que hable el Model Context Protocol puede consultar los mismos registros armonizados, el ranking y los analistas.",
  "Research server": "Servidor de investigación",
  "Voice server (short spoken answers)": "Servidor de voz (respuestas habladas cortas)",
  "Resources server (NASA and partner library)": "Servidor de recursos (biblioteca de NASA y socios)",
  "Orchestrator (one question across the servers)": "Orquestador (una pregunta para todos los servidores)",
  "Add to Claude Code": "Agregar a Claude Code",
  "Research tools": "Herramientas de investigación",
  "Headline numbers, environments, agents, gaps": "Cifras principales, entornos, agentes, vacíos",
  "Find investigations by text, pillar, fuel phase": "Busca investigaciones por texto, pilar o fase del combustible",
  "Objective, hardware, publications, tested ranges": "Objetivo, hardware, publicaciones, rangos probados",
  "Filter the harmonized test records": "Filtra los registros de prueba armonizados",
  "Closest tests, ranking and gaps for an atmosphere": "Pruebas más cercanas, ranking y vacíos para una atmósfera",
  "Scored ranking with reasons": "Ranking con puntaje y razones",
  "What was tested for a material, or that it never was": "Qué se probó para un material, o que nunca se probó",
  "Gap list and coverage grid": "Lista de vacíos y cuadrícula de cobertura",
  "Documents and video, linked live from NASA PSI": "Documentos y video, enlazados en vivo desde NASA PSI",
  "Charts and tables computed on request": "Gráficas y tablas calculadas a pedido",
  "Cabin fire simulator and published fire models": "Simulador de incendio en cabina y modelos de fuego publicados",
  "Cited brief from the four agents": "Informe con citas de los cuatro agentes",
  "One cited answer across every server": "Una sola respuesta con citas entre todos los servidores",

  // ---------- EvidenceMap ----------
  "Test records by oxygen concentration and pressure": "Registros de prueba por concentración de oxígeno y presión",
  "OXYGEN, % BY VOLUME": "OXÍGENO, % EN VOLUMEN",
  "PRESSURE, PSI": "PRESIÓN, PSI",
  "MOON BASE / ROVER CORNER: 30%+ O2, 10.2 PSI OR LESS": "ESQUINA BASE LUNAR / ROVER: 30%+ O2, 10.2 PSI O MENOS",
  "AIR 21%": "AIRE 21%",
  "DESIGN {o2}% · {psi} PSI": "DISEÑO {o2}% · {psi} PSI",
  "solid material": "material sólido",
  "liquid droplet": "gota líquida",
  "gas flame": "llama de gas",
  "ring = test day or planned range": "anillo = día de pruebas o rango planeado",
  "{placed} placed · {unplaced} lack oxygen or pressure · click the map to move the design":
    "{placed} ubicados · a {unplaced} les falta oxígeno o presión · haz clic en el mapa para mover el diseño",
  "Assumed: {note}": "Supuesto: {note}",

  // ---------- FlameBench ----------
  "Solid material": "Material sólido",
  "Liquid droplet": "Gota líquida",
  "Gas flame": "Llama de gas",
  "Flame illustration": "Ilustración de la llama",
  "ILLUSTRATION · NOT A PHYSICS SIMULATION": "ILUSTRACIÓN · NO UNA SIMULACIÓN FÍSICA",
  MICROGRAVITY: "MICROGRAVEDAD",
  "No buoyancy": "Sin flotabilidad",
  "Hot gas does not rise in free fall, so a flame becomes a dim sphere fed only by diffusion.":
    "El gas caliente no sube en caída libre, así que la llama se vuelve una esfera tenue alimentada solo por difusión.",
  "Air flow feeds it": "El flujo de aire la alimenta",
  "Ventilation stretches the flame downstream and brings it fresh oxygen.": "La ventilación estira la llama corriente abajo y le trae oxígeno fresco.",
  "Oxygen decides": "El oxígeno decide",
  "Flammability depends strongly on oxygen concentration; an enriched cabin makes materials burn more readily.":
    "La inllamabilidad depende mucho de la concentración de oxígeno; en una cabina enriquecida los materiales arden con más facilidad.",
  Oxygen: "Oxígeno",
  Pressure: "Presión",
  "Air flow": "Flujo de aire",
  "Mitigation levers": "Palancas de mitigación",
  "Cut ventilation": "Cortar ventilación",
  "Lower oxygen 5 pts": "Bajar oxígeno 5 pts",
  "Dilute with CO₂": "Diluir con CO₂",
  "Dilute with helium": "Diluir con helio",
  "Dilute with nitrogen": "Diluir con nitrógeno",
  "Inside the tested envelope": "Dentro de la envolvente probada",
  "Near the tested envelope": "Cerca de la envolvente probada",
  "Outside the tested envelope: extrapolation": "Fuera de la envolvente probada: extrapolación",
  "No comparable record carries oxygen values": "Ningún registro comparable trae valores de oxígeno",
  "with {d}": "con {d}",
  "No solid record{with} carries an oxygen value, so nothing can be placed near this setting.":
    "Ningún registro de sólidos{with} trae un valor de oxígeno, así que no se puede ubicar nada cerca de esta configuración.",
  "No liquid record{with} carries an oxygen value, so nothing can be placed near this setting.":
    "Ningún registro de líquidos{with} trae un valor de oxígeno, así que no se puede ubicar nada cerca de esta configuración.",
  "No gas record{with} carries an oxygen value, so nothing can be placed near this setting.":
    "Ningún registro de gases{with} trae un valor de oxígeno, así que no se puede ubicar nada cerca de esta configuración.",
  "Of the {n} closest solid-material records{with},": "De los {n} registros de material sólido más cercanos{with},",
  "Of the {n} closest droplet records{with},": "De los {n} registros de gotas más cercanos{with},",
  "Of the {n} closest gas-flame records{with},": "De los {n} registros de llama de gas más cercanos{with},",
  "{out} of {total}": "{out} de {total}",
  "with a recorded outcome went out or failed to ignite.": "con resultado registrado se apagaron o no encendieron.",
  "none records an outcome in its table; the result is in the test video.": "ninguno anota un resultado en su tabla; el resultado está en el video de la prueba.",
  "Median burn time {s} s.": "Mediana del tiempo de quema: {s} s.",
  "The closest one is {d} steps away (one step = 10 oxygen points or 3.7 psi), so read this as a bound, not a prediction.":
    "El más cercano está a {d} pasos (un paso = 10 puntos de oxígeno o 3.7 psi), así que léelo como una cota, no como una predicción.",
  "Solid tables log a fan setting, not a calibrated flow, and no sample was burned above 22.2% oxygen.":
    "Las tablas de sólidos anotan un ajuste del ventilador, no un flujo calibrado, y ninguna muestra se quemó por encima de 22.2% de oxígeno.",
  "Closest records": "Registros más cercanos",
  Steps: "Pasos",
};
