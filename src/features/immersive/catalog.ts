export type ImmersiveMediaKind = 'image' | 'video'
export type ImmersiveMotion = 'static' | 'vehicle_slow'
export type ImmersiveIntensity = 1 | 2 | 3
export type ImmersiveDevice = 'quest' | 'vr_box'

export interface ImmersiveDerivative {
  storagePath: string
  mimeType: 'image/jpeg' | 'video/mp4'
  width: number
  height: number
  fps?: number
  durationSeconds?: number
  codec?: string
  bytes: number
  sha256: string
}

export interface ImmersiveScenario {
  id: string
  title: string
  shortTitle: string
  environment: 'street' | 'crosswalk' | 'retail' | 'mall' | 'station' | 'transit' | 'urban_ride'
  mediaKind: ImmersiveMediaKind
  motion: ImmersiveMotion
  intensity: ImmersiveIntensity
  recommendedSeconds: number
  maximumSeconds: number
  clinicalUse: string
  patientInstruction: string
  cautions: string[]
  source: {
    author: string
    provider: 'Poly Haven' | 'Wikimedia Commons'
    pageUrl: string
    originalUrl: string
    license: 'CC0 1.0' | 'CC BY 3.0' | 'CC BY 4.0'
    licenseUrl: string
    originalBytes: number
    originalSha256: string
  }
  derivatives: Record<ImmersiveDevice | 'thumbnail', ImmersiveDerivative>
}

const polyHavenLicense = 'https://polyhaven.com/license'

export const immersiveScenarios: ImmersiveScenario[] = [
  {
    id: 'street_quiet',
    title: 'Calle tranquila desde un punto fijo',
    shortTitle: 'Calle tranquila',
    environment: 'street',
    mediaKind: 'image',
    motion: 'static',
    intensity: 1,
    recommendedSeconds: 30,
    maximumSeconds: 60,
    clinicalUse: 'Exposición contextual inicial con horizonte estable, profundidad urbana y baja densidad de estímulos móviles.',
    patientInstruction: 'Sentado, explorá lentamente la calle con movimientos pequeños de cabeza. Volvé al frente si aumenta el malestar.',
    cautions: ['No simula marcha ni entrenamiento de equilibrio.', 'El profesional define amplitud, velocidad y techo de síntomas.'],
    source: {
      author: 'Andreas Mischok', provider: 'Poly Haven', pageUrl: 'https://polyhaven.com/a/urban_street_01',
      originalUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/urban_street_01.jpg',
      license: 'CC0 1.0', licenseUrl: polyHavenLicense, originalBytes: 10_618_444,
      originalSha256: '0f4845792c6c3836240ca310c3b1a10fd53827fce85f71333369617d0f7631a5',
    },
    derivatives: {
      quest: { storagePath: 'street_quiet/quest.jpg', mimeType: 'image/jpeg', width: 4096, height: 2048, bytes: 2_884_390, sha256: '47e93af2b6bfb3ccebac3a55e9b4f6e2aa7d6647b4a96fe2ce928009950de5c6' },
      vr_box: { storagePath: 'street_quiet/vrbox.jpg', mimeType: 'image/jpeg', width: 2048, height: 1024, bytes: 608_271, sha256: 'e6e66fa13e45fb60edd75b7a3442945435f0e10126d97be5401529dd33865dae' },
      thumbnail: { storagePath: 'street_quiet/thumb.jpg', mimeType: 'image/jpeg', width: 640, height: 320, bytes: 57_213, sha256: '4c666c86c43882e588425e36f22ba2ba7c7a1263b9b162c3840940caedce4246' },
    },
  },
  {
    id: 'crosswalk_static',
    title: 'Cruce peatonal tranquilo desde un punto fijo',
    shortTitle: 'Cruce peatonal',
    environment: 'crosswalk',
    mediaKind: 'image',
    motion: 'static',
    intensity: 1,
    recommendedSeconds: 30,
    maximumSeconds: 60,
    clinicalUse: 'Exploración visual de una intersección simple sin exigir cruce real ni doble tarea motora.',
    patientInstruction: 'Sentado, localizá lentamente ambos lados de la calle y regresá al frente. No imites un cruce ni te pongas de pie.',
    cautions: ['Es una escena fija: no entrena juicio temporal frente a tráfico real.', 'No reemplaza práctica funcional supervisada.'],
    source: {
      author: 'Sergej Majboroda', provider: 'Poly Haven', pageUrl: 'https://polyhaven.com/a/crosswalk',
      originalUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/crosswalk.jpg',
      license: 'CC0 1.0', licenseUrl: polyHavenLicense, originalBytes: 7_664_266,
      originalSha256: 'cc84ef72a288ba10c9312c75771bb81f8f078a5ece8908be77f73ad0b1e9d8d0',
    },
    derivatives: {
      quest: { storagePath: 'crosswalk_static/quest.jpg', mimeType: 'image/jpeg', width: 4096, height: 2048, bytes: 1_998_076, sha256: '52d3e27c24bb1fd73e8b18ecc50b517e709be32491e5285bbfc5120f44a87625' },
      vr_box: { storagePath: 'crosswalk_static/vrbox.jpg', mimeType: 'image/jpeg', width: 2048, height: 1024, bytes: 365_190, sha256: '388e22084ddecd5605179aa36ce83cf48970a12f4392adeb145487bc9a54cd95' },
      thumbnail: { storagePath: 'crosswalk_static/thumb.jpg', mimeType: 'image/jpeg', width: 640, height: 320, bytes: 33_285, sha256: 'def60a2d6412b121288e69b83de9ca19bda13fc8c94bd1cbfd8bd72951ef89c1' },
    },
  },
  {
    id: 'retail_phone_shop',
    title: 'Comercio interior desde un punto fijo',
    shortTitle: 'Comercio interior',
    environment: 'retail',
    mediaKind: 'image',
    motion: 'static',
    intensity: 1,
    recommendedSeconds: 30,
    maximumSeconds: 60,
    clinicalUse: 'Introducción a estanterías, mostradores y profundidad interior sin afirmar que representa una farmacia o supermercado.',
    patientInstruction: 'Sentado, recorré con la mirada y la cabeza los mostradores y estantes a un ritmo cómodo, sin buscar un producto específico.',
    cautions: ['No debe rotularse como farmacia ni supermercado.', 'Escena sin personas: la complejidad social es baja.'],
    source: {
      author: 'Philip Modin', provider: 'Poly Haven', pageUrl: 'https://polyhaven.com/a/phone_shop',
      originalUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/phone_shop.jpg',
      license: 'CC0 1.0', licenseUrl: polyHavenLicense, originalBytes: 5_707_290,
      originalSha256: 'c98c468a09bc8567e90a5153f1649ebbfc28e8932c51cbde9d7b28a8e66b39f3',
    },
    derivatives: {
      quest: { storagePath: 'retail_phone_shop/quest.jpg', mimeType: 'image/jpeg', width: 4096, height: 2048, bytes: 1_210_513, sha256: '9229aa930922281a7fb981f243dc3036dd90aed66cce1d6558df1b9c736789bb' },
      vr_box: { storagePath: 'retail_phone_shop/vrbox.jpg', mimeType: 'image/jpeg', width: 2048, height: 1024, bytes: 235_344, sha256: 'b5a758e4d5f7679000029e9ee5015eba4b49b7830a91f1e6bc0d44a373802af2' },
      thumbnail: { storagePath: 'retail_phone_shop/thumb.jpg', mimeType: 'image/jpeg', width: 640, height: 320, bytes: 25_848, sha256: '31f9acbbac673edb4a45a92baff021688180872a0e6600f14ed3b3a29bee538f' },
    },
  },
  {
    id: 'mall_triangeln',
    title: 'Centro comercial desde un punto fijo',
    shortTitle: 'Centro comercial',
    environment: 'mall',
    mediaKind: 'image',
    motion: 'static',
    intensity: 2,
    recommendedSeconds: 30,
    maximumSeconds: 60,
    clinicalUse: 'Exposición a geometría interior amplia, cartelería, iluminación y mayor densidad visual.',
    patientInstruction: 'Sentado, explorá el centro comercial con giros lentos y de poca amplitud. Conservá el tronco apoyado y los pies firmes.',
    cautions: ['El equipo de captura es visible cerca del nadir; mantener una inclinación cómoda evita fijarlo.', 'No simula caminar entre personas.'],
    source: {
      author: 'Rose Abrams', provider: 'Wikimedia Commons', pageUrl: 'https://commons.wikimedia.org/wiki/File:360_photos_of_upper_Malm%C3%B6_-_Triangeln_mall.jpg',
      originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/47/360_photos_of_upper_Malm%C3%B6_-_Triangeln_mall.jpg',
      license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', originalBytes: 5_713_878,
      originalSha256: 'f4ce2f62ccf7e866914f547838ff803ee70d06fdc3b691a900a0a127545abc22',
    },
    derivatives: {
      quest: { storagePath: 'mall_triangeln/quest.jpg', mimeType: 'image/jpeg', width: 4096, height: 2048, bytes: 1_370_992, sha256: 'b63912c6265e7e8d97584a076b0a020210dc0b78c9f3281f8d664b5a1c10a022' },
      vr_box: { storagePath: 'mall_triangeln/vrbox.jpg', mimeType: 'image/jpeg', width: 2048, height: 1024, bytes: 381_482, sha256: 'e2095130ecfb13659f013a459665f1fff8646a24ce75003fa3d8736316f8a273' },
      thumbnail: { storagePath: 'mall_triangeln/thumb.jpg', mimeType: 'image/jpeg', width: 640, height: 320, bytes: 60_318, sha256: 'e18350fa2a8ea9038c51b8c59fdf720c46102f0d076f8f49390726f3b70d7b07' },
    },
  },
  {
    id: 'station_hamburg',
    title: 'Estación ferroviaria desde un punto fijo',
    shortTitle: 'Estación',
    environment: 'station',
    mediaKind: 'image',
    motion: 'static',
    intensity: 2,
    recommendedSeconds: 30,
    maximumSeconds: 60,
    clinicalUse: 'Exposición estable a un espacio de transporte amplio con líneas de perspectiva, andenes, trenes y personas lejanas.',
    patientInstruction: 'Sentado, explorá andenes, carteles y trenes con movimientos lentos. Mantené los pies apoyados y no intentes levantarte.',
    cautions: ['No entrena desplazamiento por andén ni abordaje.', 'La escena fija no representa flujo dinámico de pasajeros.'],
    source: {
      author: 'Greg Zaal', provider: 'Poly Haven', pageUrl: 'https://polyhaven.com/a/hamburg_hbf',
      originalUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/hamburg_hbf.jpg',
      license: 'CC0 1.0', licenseUrl: polyHavenLicense, originalBytes: 5_997_200,
      originalSha256: '6afd0169d453832575800667c2d1d4834f56393b40ed54ebf926ef96ad00edc4',
    },
    derivatives: {
      quest: { storagePath: 'station_hamburg/quest.jpg', mimeType: 'image/jpeg', width: 4096, height: 2048, bytes: 1_354_616, sha256: '95a0e45bb503476b52fcfe1422058bfba388b0ff949f10076097b117012285c7' },
      vr_box: { storagePath: 'station_hamburg/vrbox.jpg', mimeType: 'image/jpeg', width: 2048, height: 1024, bytes: 333_179, sha256: 'febada7f39348f5a89bd48d231567359d77cd405f2ed37e9c6ed5f5b3844ea8a' },
      thumbnail: { storagePath: 'station_hamburg/thumb.jpg', mimeType: 'image/jpeg', width: 640, height: 320, bytes: 42_353, sha256: '67336656ddac8dceca1a875b6a82dff10bebb4919838ed5e2f8c21ba3f5081c3' },
    },
  },
  {
    id: 'metro_moscow',
    title: 'Interior de transporte público con movimiento ambiental',
    shortTitle: 'Interior de metro',
    environment: 'transit',
    mediaKind: 'video',
    motion: 'static',
    intensity: 2,
    recommendedSeconds: 22,
    maximumSeconds: 22,
    clinicalUse: 'Exposición breve a un interior de transporte con movimiento del vehículo y pasajeros, sin desplazamiento del punto de cámara durante el tramo seleccionado.',
    patientInstruction: 'Sentado y con el tronco apoyado, observá el interior del transporte. Girá la cabeza solo dentro de la amplitud acordada.',
    cautions: ['La persona y el soporte de cámara son visibles cerca del nadir.', 'El original se recortó antes de que la cámara fuera levantada.', 'El video no se repite: la dosis máxima es 22 segundos.'],
    source: {
      author: 'Svetlov Artem', provider: 'Wikimedia Commons', pageUrl: 'https://commons.wikimedia.org/wiki/File:Moscow_metro_train_Sokolniki_interior_shot_on_spherical_camera_2023-03.MP4.webm',
      originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Moscow_metro_train_Sokolniki_interior_shot_on_spherical_camera_2023-03.MP4.webm',
      license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', originalBytes: 42_117_833,
      originalSha256: 'e90506bb9e3f7a12d4fe7e6a53271a73225a51db14fbe2e9c2df32ae5fa941c4',
    },
    derivatives: {
      quest: { storagePath: 'metro_moscow/quest.mp4', mimeType: 'video/mp4', width: 3840, height: 1920, fps: 30, durationSeconds: 22.034, codec: 'H.264 High', bytes: 20_235_385, sha256: 'a71d1bc2ed584a3e57a5ddc894a572ff6b489f13e5a43f1593ca0c92fa5687f6' },
      vr_box: { storagePath: 'metro_moscow/vrbox.mp4', mimeType: 'video/mp4', width: 2048, height: 1024, fps: 30, durationSeconds: 22.034, codec: 'H.264 High', bytes: 11_021_257, sha256: '4280c4ae87afc4aeb78352bfda76efe61325739f29402b7a69f97a5a3592fbae' },
      thumbnail: { storagePath: 'metro_moscow/thumb.jpg', mimeType: 'image/jpeg', width: 640, height: 320, bytes: 31_405, sha256: 'b5c3d42c1e4c4f8371f142992b377959a2c9b6e4353469116e43f44126041fc4' },
    },
  },
  {
    id: 'urban_ride_nyc',
    title: 'Recorrido urbano desde un vehículo lento',
    shortTitle: 'Recorrido urbano',
    environment: 'urban_ride',
    mediaKind: 'video',
    motion: 'vehicle_slow',
    intensity: 3,
    recommendedSeconds: 30,
    maximumSeconds: 30,
    clinicalUse: 'Exposición contextual avanzada a flujo óptico urbano continuo desde un vehículo lento, con horizonte estable durante el segmento seleccionado.',
    patientInstruction: 'Sentado y apoyado, mirá al frente al comenzar. Explorá solo si el profesional lo indicó; no intentes acompañar cada objeto que pasa.',
    cautions: ['No debe describirse como manejo ni como viaje en automóvil.', 'El vehículo y el equipo de captura pueden verse cerca del nadir.', 'Mayor flujo óptico: usar solo después de tolerar escenarios estáticos.', 'El video no se repite: la dosis máxima es 30 segundos.'],
    source: {
      author: 'Joseph A. Eulo', provider: 'Wikimedia Commons', pageUrl: 'https://commons.wikimedia.org/wiki/File:NYC_in_360_-_Surviving_COVID.webm',
      originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/NYC_in_360_-_Surviving_COVID.webm',
      license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/', originalBytes: 2_224_780_682,
      originalSha256: 'd5b193c870a9244fadc55b5aa990a0acfea1a651c53b79dc005bfb4fcbca92df',
    },
    derivatives: {
      quest: { storagePath: 'urban_ride_nyc/quest.mp4', mimeType: 'video/mp4', width: 4096, height: 2048, fps: 23.976, durationSeconds: 30.03, codec: 'H.264 High', bytes: 21_662_248, sha256: 'dd193fc3f6a5748417d4d7532e69d51f8db19a1df6e64cffdb3b72ccb61acd98' },
      vr_box: { storagePath: 'urban_ride_nyc/vrbox.mp4', mimeType: 'video/mp4', width: 2048, height: 1024, fps: 23.976, durationSeconds: 30.03, codec: 'H.264 High', bytes: 18_182_766, sha256: '2c47ba6977441f27a7e54c6f74f799b70b47eb70e2a67d07850db57081f420b0' },
      thumbnail: { storagePath: 'urban_ride_nyc/thumb.jpg', mimeType: 'image/jpeg', width: 640, height: 320, bytes: 40_571, sha256: '4f3d3e7370a1f093908ef0b15dc4cf8be7a93ad40f7caada2a866c136a68fb45' },
    },
  },
]

export const captureRequiredScenarios = [
  { id: 'supermarket_static', title: 'Supermercado con cámara fija', reason: 'No se encontró un 360° abierto que represente el entorno con cámara estable y licencia de redistribución verificable.' },
  { id: 'supermarket_slow_walk', title: 'Supermercado caminando lentamente', reason: 'Requiere grabación propia continua, altura de cámara estable y recorrido sin cortes ni giros bruscos.' },
  { id: 'pharmacy', title: 'Farmacia', reason: 'El comercio disponible no debe sustituirse ni rotularse como farmacia.' },
  { id: 'bus_stop', title: 'Parada de ómnibus', reason: 'Falta una escena específica con horizonte estable, tránsito gradual y licencia abierta.' },
  { id: 'crosswalk_gradual_traffic', title: 'Cruce peatonal con tráfico gradual', reason: 'La escena fija no permite entrenar complejidad temporal del tránsito.' },
  { id: 'car_passenger', title: 'Viaje en automóvil como acompañante', reason: 'Falta una toma explícita desde el asiento de acompañante, continua y redistribuible.' },
  { id: 'urban_driving', title: 'Manejo urbano con horizonte estable', reason: 'El recorrido disponible es desde un vehículo lento no identificado como automóvil y no debe presentarse como manejo.' },
] as const

export function getImmersiveScenario(id: string | undefined) {
  return immersiveScenarios.find((scenario) => scenario.id === id)
}

export function immersiveMediaUrl(scenario: ImmersiveScenario, derivative: ImmersiveDevice | 'thumbnail') {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
  if (!supabaseUrl) return ''
  return `${supabaseUrl}/storage/v1/object/public/immersive-media/${scenario.derivatives[derivative].storagePath}`
}
