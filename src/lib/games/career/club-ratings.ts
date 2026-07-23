// ╔══════════════════════════════════════════════════════════════════╗
// ║  Valoración de cada club para el Simulador de Carrera               ║
// ║                                                                     ║
// ║  [nacional, continental, nivel] en escala 0-5:                      ║
// ║   · nacional     → probabilidad de ganar liga y copa                ║
// ║   · continental  → probabilidad de ganar la Champions/Libertadores  ║
// ║   · nivel        → el listón del club; si tu media no llega,        ║
// ║                    eres suplente (ver LEVEL_BAR en constants.ts)    ║
// ║                                                                     ║
// ║  Clave = id de equipo en API-Football. Editable a mano: el script   ║
// ║  scripts/build-career-dataset.mjs solo refresca nombres y escudos.  ║
// ╚══════════════════════════════════════════════════════════════════╝

export const CLUB_RATINGS: Record<number, [number, number, number]> = {
  // ── premier-league ──
  33: [3, 3, 5],             // Manchester United
  34: [1, 1, 4],             // Newcastle
  35: [0, 0, 4],             // Bournemouth
  36: [0, 0, 3],             // Fulham
  39: [0, 0, 3],             // Wolves
  40: [3, 4, 5],             // Liverpool
  42: [3, 4, 5],             // Arsenal
  44: [0, 0, 3],             // Burnley
  45: [1, 0, 4],             // Everton
  47: [1, 1, 5],             // Tottenham
  48: [0, 0, 3],             // West Ham
  49: [3, 4, 5],             // Chelsea
  50: [3, 4, 5],             // Manchester City
  51: [0, 0, 4],             // Brighton
  52: [0, 0, 4],             // Crystal Palace
  55: [0, 0, 3],             // Brentford
  62: [0, 0, 3],             // Sheffield Utd
  65: [0, 0, 4],             // Nottingham Forest
  66: [1, 1, 4],             // Aston Villa
  1359: [0, 0, 1],           // Luton (manual)
  // ── championship ──
  37: [0, 0, 1],             // Huddersfield
  38: [0, 0, 2],             // Watford
  41: [0, 0, 3],             // Southampton
  43: [0, 0, 1],             // Cardiff
  46: [0, 0, 2],             // Leicester (manual)
  54: [0, 0, 2],             // Birmingham
  56: [0, 0, 1],             // Bristol City
  57: [0, 0, 3],             // Ipswich
  58: [0, 0, 2],             // Millwall
  59: [0, 0, 1],             // Preston
  60: [0, 0, 1],             // West Brom
  63: [0, 0, 3],             // Leeds
  64: [0, 0, 2],             // Hull City
  67: [0, 0, 1],             // Blackburn
  70: [0, 0, 3],             // Middlesbrough
  71: [0, 0, 3],             // Norwich
  72: [0, 0, 1],             // QPR
  73: [0, 0, 0],             // Rotherham (manual)
  74: [0, 0, 3],             // Sheffield Wednesday
  75: [0, 0, 2],             // Stoke City
  76: [0, 0, 2],             // Swansea
  746: [0, 0, 3],            // Sunderland
  1346: [0, 0, 3],           // Coventry
  1357: [0, 0, 1],           // Plymouth (manual)
  // ── laliga ──
  529: [4, 4, 5],            // Barcelona
  530: [2, 2, 4],            // Atletico Madrid
  531: [1, 1, 3],            // Athletic Club
  532: [1, 1, 3],            // Valencia
  533: [1, 1, 3],            // Villarreal
  534: [0, 0, 1],            // Las Palmas
  536: [1, 1, 3],            // Sevilla
  538: [1, 0, 3],            // Celta Vigo
  541: [4, 5, 5],            // Real Madrid
  542: [0, 0, 2],            // Alaves
  543: [1, 1, 3],            // Real Betis
  546: [0, 0, 2],            // Getafe
  547: [0, 0, 3],            // Girona
  548: [1, 1, 3],            // Real Sociedad
  715: [0, 0, 0],            // Granada CF
  723: [0, 0, 2],            // Almeria
  724: [0, 0, 0],            // Cadiz
  727: [0, 0, 2],            // Osasuna
  728: [0, 0, 2],            // Rayo Vallecano
  798: [0, 0, 2],            // Mallorca
  // ── laliga2 ──
  537: [0, 0, 0],            // Leganes
  539: [0, 0, 2],            // Levante
  540: [1, 0, 3],            // Espanyol
  545: [0, 0, 0],            // Eibar
  711: [0, 0, 0],            // Alcorcon
  718: [0, 0, 1],            // Oviedo
  719: [0, 0, 0],            // Tenerife
  720: [0, 0, 1],            // Valladolid
  722: [0, 0, 0],            // Albacete
  726: [0, 0, 0],            // Huesca (manual)
  731: [0, 0, 1],            // Sporting Gijon
  732: [0, 0, 0],            // Zaragoza (manual)
  797: [0, 0, 2],            // Elche
  799: [0, 0, 0],            // Mirandes
  4665: [0, 0, 2],           // Racing Santander
  5262: [0, 0, 0],           // FC Cartagena (default)
  8157: [0, 0, 0],           // FC Andorra
  9380: [0, 0, 0],           // Amorebieta (default)
  9409: [0, 0, 2],           // Racing Ferrol
  9580: [0, 0, 0],           // Burgos
  9595: [1, 1, 3],           // Villarreal II
  9692: [0, 0, 0],           // Eldense
  // ── serie-a ──
  487: [1, 0, 3],            // Lazio
  488: [0, 0, 3],            // Sassuolo
  489: [3, 2, 4],            // AC Milan
  490: [0, 0, 3],            // Cagliari
  492: [2, 1, 4],            // Napoli
  494: [0, 0, 3],            // Udinese
  495: [1, 0, 3],            // Genoa
  496: [3, 3, 5],            // Juventus
  497: [1, 1, 4],            // AS Roma
  499: [1, 1, 4],            // Atalanta
  500: [1, 0, 3],            // Bologna
  502: [1, 0, 3],            // Fiorentina
  503: [0, 0, 3],            // Torino
  504: [0, 0, 2],            // Hellas Verona
  505: [3, 3, 5],            // Inter
  511: [0, 0, 1],            // Empoli
  512: [0, 0, 2],            // Frosinone
  514: [0, 0, 1],            // Salernitana (manual)
  867: [0, 0, 2],            // Lecce
  1579: [0, 0, 2],           // Monza
  // ── serie-b ──
  498: [0, 0, 0],            // Sampdoria
  507: [0, 0, 0],            // Ascoli (default)
  508: [0, 0, 0],            // Bari
  510: [0, 0, 0],            // Cittadella (default)
  515: [0, 0, 0],            // Spezia
  516: [0, 0, 0],            // Ternana (default)
  517: [0, 0, 2],            // Venezia
  518: [0, 0, 0],            // Brescia (default)
  520: [0, 0, 2],            // Cremonese
  522: [0, 0, 2],            // Palermo
  523: [0, 0, 1],            // Parma (manual)
  801: [0, 0, 2],            // Pisa
  880: [0, 0, 0],            // Reggiana
  884: [0, 0, 2],            // Feralpisalo
  895: [1, 1, 4],            // Como
  899: [0, 0, 1],            // Modena
  1578: [0, 0, 0],           // Sudtirol
  1687: [0, 0, 1],           // Catanzaro
  6379: [0, 0, 2],           // Lecco
  10137: [0, 0, 0],          // Cosenza (default)
  // ── bundesliga ──
  157: [5, 4, 5],            // Bayern München
  158: [2, 2, 4],            // Fortuna Düsseldorf
  160: [0, 0, 3],            // SC Freiburg
  161: [0, 0, 3],            // VfL Wolfsburg
  162: [0, 0, 3],            // Werder Bremen
  163: [0, 0, 3],            // Borussia Mönchengladbach
  164: [0, 0, 3],            // FSV Mainz 05
  165: [2, 2, 4],            // Borussia Dortmund
  167: [0, 0, 3],            // 1899 Hoffenheim
  168: [1, 1, 4],            // Bayer Leverkusen
  169: [1, 1, 3],            // Eintracht Frankfurt
  170: [0, 0, 3],            // FC Augsburg
  172: [1, 1, 4],            // VfB Stuttgart
  173: [1, 1, 4],            // RB Leipzig
  176: [0, 0, 0],            // VfL Bochum
  180: [0, 0, 1],            // 1. FC Heidenheim
  181: [0, 0, 0],            // SV Darmstadt 98
  182: [0, 0, 3],            // Union Berlin
  192: [0, 0, 3],            // 1. FC Köln
  // ── bundesliga2 ──
  159: [0, 0, 1],            // Hertha BSC
  166: [0, 0, 1],            // Hannover 96
  171: [0, 0, 1],            // 1. FC Nürnberg
  174: [0, 0, 2],            // FC Schalke 04
  175: [0, 0, 2],            // Hamburger SV
  177: [0, 0, 0],            // SSV Jahn Regensburg (default)
  178: [0, 0, 0],            // SpVgg Greuther Fürth
  179: [0, 0, 0],            // 1. FC Magdeburg
  185: [0, 0, 1],            // SC Paderborn 07
  186: [0, 0, 2],            // FC St. Pauli
  191: [0, 0, 1],            // Holstein Kiel
  744: [0, 0, 0],            // Eintracht Braunschweig
  745: [0, 0, 1],            // 1. FC Kaiserslautern
  785: [0, 0, 1],            // Karlsruher SC
  1319: [0, 0, 0],           // SV Wehen (default)
  1321: [0, 0, 1],           // Hansa Rostock
  1324: [0, 0, 0],           // VfL Osnabrück
  1660: [0, 0, 1],           // SV Elversberg
  // ── ligue-1 ──
  79: [1, 0, 3],             // Lille
  80: [2, 1, 4],             // Lyon
  81: [2, 1, 4],             // Marseille
  82: [0, 0, 0],             // Montpellier
  83: [0, 0, 3],             // Nantes
  84: [1, 0, 3],             // Nice
  85: [5, 4, 5],             // Paris Saint Germain
  91: [2, 1, 4],             // Monaco
  93: [0, 0, 2],             // Reims
  94: [1, 0, 2],             // Rennes
  95: [1, 1, 4],             // Strasbourg
  96: [1, 0, 3],             // Toulouse
  97: [0, 0, 2],             // Lorient
  99: [0, 0, 0],             // Clermont Foot
  106: [1, 0, 3],            // Stade Brestois 29
  111: [0, 0, 1],            // Le Havre
  112: [0, 0, 1],            // Metz
  116: [1, 0, 3],            // Lens
  1063: [0, 0, 2],           // Saint Etienne
  // ── ligue-2 ──
  77: [0, 0, 2],             // Angers
  78: [0, 0, 2],             // Bordeaux
  87: [0, 0, 0],             // Amiens (manual)
  88: [0, 0, 0],             // Caen (manual)
  90: [0, 0, 0],             // Guingamp
  98: [0, 0, 0],             // Ajaccio (manual)
  101: [0, 0, 0],            // Grenoble
  105: [1, 0, 3],            // Valenciennes
  108: [0, 0, 2],            // Auxerre
  110: [0, 0, 1],            // Estac Troyes
  114: [0, 0, 3],            // Paris FC
  431: [0, 0, 0],            // Quevilly (default)
  433: [0, 0, 0],            // Laval
  1297: [0, 0, 0],           // PAU
  1300: [0, 0, 0],           // Concarneau (default)
  1301: [0, 0, 0],           // Rodez
  1304: [0, 0, 0],           // Dunkerque
  1305: [0, 0, 0],           // Bastia (manual)
  3012: [0, 0, 0],           // Annecy
  // ── eredivisie ──
  193: [0, 0, 0],            // PEC Zwolle (manual)
  194: [3, 2, 3],            // Ajax (manual)
  196: [0, 0, 0],            // Excelsior (manual)
  197: [3, 2, 3],            // PSV Eindhoven (manual)
  198: [0, 0, 0],            // ADO Den Haag (manual)
  199: [0, 0, 0],            // De Graafschap (manual)
  200: [0, 0, 2],            // Vitesse (manual)
  201: [1, 1, 2],            // AZ Alkmaar (manual)
  203: [0, 0, 0],            // NAC Breda (manual)
  205: [0, 0, 0],            // Fortuna Sittard (manual)
  206: [0, 0, 1],            // Heracles (manual)
  207: [0, 0, 2],            // Utrecht (manual)
  208: [0, 0, 0],            // Emmen (manual)
  209: [3, 2, 3],            // Feyenoord (manual)
  210: [0, 0, 1],            // Heerenveen (manual)
  409: [0, 0, 0],            // Dordrecht (manual)
  410: [0, 0, 1],            // GO Ahead Eagles (manual)
  413: [0, 0, 1],            // NEC Nijmegen (manual)
  414: [0, 0, 0],            // Roda (manual)
  415: [0, 0, 2],            // Twente (manual)
  416: [0, 0, 0],            // FC Volendam (manual)
  417: [0, 0, 0],            // Waalwijk (manual)
  419: [0, 0, 0],            // Almere City FC (manual)
  426: [0, 0, 1],            // Sparta Rotterdam (manual)
  // ── primeira-liga ──
  211: [3, 2, 3],            // Benfica (manual)
  212: [3, 2, 3],            // FC Porto (manual)
  215: [0, 0, 0],            // Moreirense (manual)
  216: [0, 0, 0],            // Portimonense (manual)
  217: [1, 1, 2],            // SC Braga (manual)
  222: [0, 0, 1],            // Boavista (manual)
  223: [0, 0, 0],            // Chaves (manual)
  224: [0, 0, 1],            // Guimaraes (manual)
  226: [0, 0, 1],            // Rio Ave (manual)
  228: [3, 2, 3],            // Sporting CP (manual)
  230: [0, 0, 0],            // Estoril (manual)
  231: [0, 0, 0],            // Farense (manual)
  240: [0, 0, 0],            // Arouca (manual)
  242: [0, 0, 0],            // Famalicao (manual)
  762: [0, 0, 0],            // GIL Vicente (manual)
  810: [0, 0, 0],            // Vizela (manual)
  4716: [0, 0, 0],           // Casa Pia (manual)
  15130: [0, 0, 0],          // Estrela (manual)
  21595: [0, 0, 0],          // AVS (manual)
  // ── liga-mx ──
  2278: [3, 3, 3],           // Guadalajara Chivas
  2279: [3, 3, 3],           // Tigres UANL
  2280: [1, 1, 2],           // Club Tijuana
  2281: [3, 3, 3],           // Toluca
  2282: [2, 2, 2],           // Monterrey
  2283: [1, 1, 1],           // Atlas
  2285: [2, 2, 1],           // Santos Laguna
  2286: [2, 2, 2],           // U.N.A.M. - Pumas
  2287: [3, 3, 3],           // Club America
  2288: [1, 1, 1],           // Necaxa
  2289: [2, 2, 2],           // Leon
  2290: [0, 0, 0],           // Club Queretaro
  2291: [0, 0, 0],           // Puebla
  2292: [2, 2, 2],           // CF Pachuca
  2295: [3, 3, 3],           // Cruz Azul
  2298: [1, 1, 1],           // FC Juarez
  2314: [1, 1, 1],           // Atletico San Luis
  14002: [1, 1, 1],          // Mazatlán
  // ── brasileirao ──
  118: [1, 1, 2],            // Bahia
  119: [2, 2, 2],            // Internacional
  120: [2, 2, 3],            // Botafogo
  121: [3, 4, 3],            // Palmeiras
  124: [2, 2, 3],            // Fluminense
  125: [1, 1, 2],            // America Mineiro
  126: [2, 2, 2],            // Sao Paulo
  127: [3, 4, 3],            // Flamengo
  128: [2, 1, 3],            // Santos
  130: [2, 2, 3],            // Gremio
  131: [2, 3, 3],            // Corinthians
  133: [2, 1, 3],            // Vasco DA Gama
  134: [2, 2, 2],            // Atletico Paranaense (manual)
  135: [2, 3, 3],            // Cruzeiro
  147: [0, 0, 1],            // Coritiba
  151: [0, 0, 0],            // Goias (manual)
  154: [1, 0, 1],            // Fortaleza EC (manual)
  794: [1, 1, 2],            // RB Bragantino
  1062: [1, 1, 2],           // Atletico-MG
  1193: [0, 0, 0],           // Cuiaba (manual)
  // ── liga-argentina ──
  434: [0, 0, 0],            // Gimnasia L.P.
  435: [3, 3, 3],            // River Plate
  436: [2, 2, 2],            // Racing Club
  437: [2, 1, 2],            // Rosario Central
  438: [1, 1, 1],            // Velez Sarsfield
  439: [0, 0, 0],            // Godoy Cruz
  440: [1, 0, 1],            // Belgrano Cordoba
  441: [0, 0, 1],            // Union Santa Fe
  442: [0, 1, 1],            // Defensa Y Justicia
  445: [0, 0, 1],            // Huracan
  446: [1, 1, 1],            // Lanus
  448: [0, 0, 0],            // Colon Santa Fe
  449: [0, 0, 0],            // Banfield
  450: [2, 2, 2],            // Estudiantes L.P.
  451: [3, 3, 3],            // Boca Juniors
  452: [0, 0, 1],            // Tigre
  453: [1, 1, 1],            // Independiente
  455: [0, 0, 1],            // Atletico Tucuman
  456: [1, 1, 1],            // Talleres Cordoba
  457: [1, 1, 1],            // Newells Old Boys
  458: [1, 1, 1],            // Argentinos JRS
  459: [0, 0, 0],            // Arsenal Sarandi
  460: [1, 1, 1],            // San Lorenzo
  474: [0, 0, 0],            // Sarmiento Junin
  478: [0, 0, 0],            // Instituto Cordoba
  1064: [0, 0, 1],           // Platense
  1065: [2, 1, 2],           // Central Cordoba de Santiago
  2432: [0, 0, 0],           // Barracas Central
  // ── primera-nacional ──
  444: [0, 0, 0],            // Patronato
  447: [0, 0, 0],            // Chacarita Juniors
  454: [0, 0, 0],            // Temperley
  461: [0, 0, 0],            // San Martin S.J.
  462: [0, 0, 0],            // Agropecuario
  463: [0, 0, 0],            // Aldosivi
  464: [0, 0, 0],            // All Boys
  465: [0, 0, 0],            // Atletico DE Rafaela
  466: [0, 0, 0],            // Atletico Mitre
  468: [0, 0, 0],            // Brown DE Adrogue
  469: [0, 0, 0],            // Deportivo Moron
  470: [0, 0, 0],            // Ferro Carril Oeste
  471: [1, 1, 1],            // Flandria
  472: [0, 0, 0],            // Guillermo Brown (default)
  473: [3, 3, 3],            // Independ. Rivadavia
  476: [0, 0, 0],            // Deportivo Riestra
  479: [0, 0, 0],            // Gimnasia Jujuy
  480: [0, 0, 0],            // Quilmes
  481: [0, 0, 0],            // Villa Dalmine
  482: [0, 0, 0],            // Almagro
  484: [0, 0, 0],            // Nueva Chicago
  485: [0, 0, 0],            // San Martin Tucuman
  1066: [0, 0, 1],           // Gimnasia M.
  1067: [0, 0, 0],           // Defensores De Belgrano
  1929: [0, 0, 0],           // Deportivo Madryn
  1932: [0, 0, 0],           // San Telmo
  1936: [1, 1, 0],           // CA Estudiantes
  1945: [0, 0, 1],           // Defensores Unidos
  1946: [0, 0, 0],           // Chaco For Ever
  1948: [0, 0, 0],           // Atlanta
  1954: [0, 0, 0],           // Deportivo Maipu
  1957: [2, 2, 2],           // Racing Cordoba
  1962: [0, 0, 0],           // Alvarado (default)
  1965: [0, 0, 0],           // Tristan Suarez
  2424: [1, 1, 0],           // Estudiantes de Rio Cuarto
  3969: [0, 0, 0],           // Club Atlético Güemes
  8375: [0, 0, 0],           // Almirante Brown
  // ── primera-chile ──
  2315: [2, 1, 0],           // Colo Colo
  2316: [1, 0, 0],           // Curico Unido (default)
  2318: [1, 0, 0],           // Palestino
  2320: [1, 0, 0],           // O'Higgins
  2321: [1, 0, 0],           // Union Espanola (manual)
  2323: [2, 1, 0],           // Universidad de Chile
  2325: [1, 0, 0],           // Everton de Vina (manual)
  2326: [1, 0, 0],           // Union La Calera (default)
  2328: [2, 0, 0],           // Huachipato
  2329: [1, 0, 0],           // A. Italiano
  2330: [2, 0, 0],           // Coquimbo Unido
  2331: [1, 0, 0],           // Cobresal
  2336: [1, 0, 0],           // Magallanes (default)
  2337: [1, 0, 0],           // Nublense (manual)
  2343: [1, 0, 0],           // Deportes Copiapo (default)
  2994: [2, 0, 0],           // U. Catolica
  // ── liga-colombia ──
  1125: [2, 0, 0],           // Millonarios
  1126: [1, 0, 0],           // Deportivo Pasto
  1127: [2, 0, 0],           // Deportivo Cali
  1128: [2, 0, 0],           // Independiente Medellin
  1129: [1, 0, 0],           // Envigado (default)
  1130: [1, 0, 0],           // Huila (default)
  1131: [1, 0, 0],           // Bucaramanga
  1132: [1, 0, 0],           // Chico (default)
  1133: [1, 0, 0],           // Jaguares (default)
  1134: [2, 1, 1],           // Internacional de Bogota
  1135: [2, 0, 0],           // Junior
  1136: [1, 0, 0],           // Once Caldas
  1137: [2, 1, 1],           // Atletico Nacional
  1138: [2, 0, 0],           // America de Cali
  1139: [2, 0, 0],           // Santa Fe
  1141: [1, 0, 0],           // Alianza Valledupar (default)
  1142: [1, 0, 0],           // Deportes Tolima
  1144: [1, 0, 0],           // Águilas Doradas (default)
  1462: [1, 0, 0],           // Deportivo Pereira
  1465: [1, 0, 0],           // Union Magdalena (default)
  // ── primera-uruguay ──
  2348: [4, 1, 1],           // Penarol
  2350: [1, 0, 0],           // Defensor Sporting
  2351: [1, 0, 0],           // CA River Plate (default)
  2352: [1, 0, 0],           // Danubio (manual)
  2355: [1, 0, 0],           // Plaza Colonia (default)
  2356: [4, 1, 1],           // Club Nacional
  2357: [1, 0, 0],           // Fenix (default)
  2358: [1, 0, 0],           // Liverpool Montevideo
  2359: [1, 0, 0],           // Racing Montevideo
  2360: [1, 0, 0],           // Wanderers (manual)
  2361: [1, 0, 0],           // Boston River
  2362: [1, 0, 0],           // Cerro (manual)
  2365: [1, 0, 0],           // Atletico Torque
  2369: [1, 0, 0],           // Cerro Largo (default)
  2370: [1, 0, 0],           // Deportivo Maldonado (default)
  18295: [1, 0, 0],          // La Luz (default)
  // ── primera-paraguay ──
  1174: [2, 0, 0],           // Club Guarani
  1175: [1, 0, 0],           // Nacional Asuncion
  1176: [3, 1, 1],           // Cerro Porteno
  1179: [3, 1, 1],           // Libertad Asuncion
  1181: [1, 0, 0],           // General Caballero (default)
  1182: [3, 1, 1],           // Olimpia
  1183: [1, 0, 0],           // Sportivo Luqueno (manual)
  1187: [0, 0, 0],           // Sportivo Trinidense
  2135: [1, 0, 0],           // Resistencia (default)
  2138: [2, 0, 0],           // Guairena FC
  10487: [1, 0, 0],          // Sportivo Ameliano (default)
  10491: [1, 0, 0],          // Tacuary (default)
  // ── liga1-peru ──
  2539: [1, 0, 0],           // UTC Cajamarca (default)
  2540: [3, 0, 1],           // Universitario
  2541: [1, 0, 0],           // Cesar Vallejo (manual)
  2543: [1, 0, 0],           // Academia Cantolao (default)
  2544: [3, 0, 1],           // Sport Boys
  2545: [3, 0, 1],           // Deportivo Municipal
  2546: [3, 0, 1],           // Sporting Cristal
  2550: [1, 0, 0],           // Deportivo Binacional (default)
  2551: [1, 0, 0],           // Carlos A. Mannucci (default)
  2552: [3, 0, 1],           // Union Comercio
  2553: [3, 0, 1],           // Alianza Lima
  2554: [1, 0, 0],           // FBC Melgar
  2555: [3, 0, 1],           // Sport Huancayo
  2560: [1, 0, 0],           // Alianza Atletico
  2562: [1, 0, 0],           // Cienciano
  2564: [1, 0, 0],           // Atletico Grau (default)
  10013: [1, 0, 0],          // Cusco
  10492: [1, 0, 0],          // ADT (default)
  20960: [1, 0, 0],          // Deportivo Garcilaso
  // ── ligapro-ecuador ──
  1148: [3, 1, 1],           // Emelec
  1149: [1, 0, 0],           // Delfin SC (default)
  1150: [1, 0, 0],           // El Nacional (manual)
  1151: [1, 0, 0],           // Tecnico Universitario (default)
  1152: [3, 1, 1],           // Barcelona SC
  1153: [3, 1, 1],           // Independiente del Valle
  1154: [1, 0, 0],           // Deportivo Cuenca
  1156: [1, 0, 0],           // Aucas (manual)
  1157: [1, 0, 0],           // Universidad Catolica
  1158: [3, 1, 1],           // LDU de Quito
  1159: [3, 1, 1],           // Guayaquil City FC
  1162: [1, 0, 0],           // Mushuc Runa SC (default)
  1986: [1, 0, 0],           // Gualaceo SC (default)
  1992: [1, 0, 0],           // Orense SC
  16476: [1, 0, 0],          // Cumbayá (default)
  18762: [1, 0, 0],          // Libertad
  // ── primera-bolivia ──
  3637: [1, 0, 0],           // Aurora (manual)
  3700: [2, 0, 0],           // Always Ready
  3701: [2, 0, 0],           // Blooming
  3702: [2, 0, 0],           // Bolívar
  3704: [1, 0, 0],           // Guabirá
  3705: [2, 0, 0],           // Jorge Wilstermann (manual)
  3706: [1, 0, 0],           // Nacional Potosí
  3707: [2, 0, 0],           // Oriente Petrolero (manual)
  3709: [1, 0, 0],           // Royal Pari (default)
  3711: [2, 0, 0],           // The Strongest
  10011: [1, 0, 0],          // Atlético Palmaflor (default)
  12259: [1, 0, 0],          // Santa Cruz
  15702: [1, 0, 0],          // Independiente Petrolero
  15708: [1, 0, 0],          // Real Tomayapo (default)
  15714: [1, 0, 0],          // Vaca Díez (default)
  15715: [1, 0, 0],          // Libertad (default)
  17760: [1, 0, 0],          // San Antonio Bulo Bulo
  17762: [1, 0, 0],          // Universitario de Vinto (default)
  // ── primera-venezuela ──
  2806: [1, 0, 0],           // Zamora FC (manual)
  2807: [2, 0, 0],           // Deportivo Tachira FC
  2808: [2, 0, 0],           // Caracas FC
  2810: [2, 0, 0],           // Carabobo FC
  2811: [2, 0, 0],           // Monagas SC
  2813: [2, 0, 0],           // Deportivo La Guaira
  2814: [1, 0, 0],           // Portuguesa FC (manual)
  2818: [1, 0, 0],           // Estudiantes de Merida FC (default)
  2824: [1, 0, 0],           // Mineros de Guyana (default)
  2825: [2, 0, 0],           // Metropolitanos FC
  2827: [2, 0, 0],           // Puerto Cabello
  2838: [1, 0, 0],           // Angostura FC (default)
  2840: [2, 0, 0],           // UCV
  2854: [1, 0, 0],           // CD Hermanos Colmenarez (default)
  16847: [1, 0, 0],          // Rayo Zuliano (default)
};
