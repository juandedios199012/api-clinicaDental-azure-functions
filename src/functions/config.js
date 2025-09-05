import { app } from '@azure/functions';

// Datos estáticos pre-ordenados para mejor performance
const PAISES = [
  { codigo: 'AR', nombre: 'Argentina' },
  { codigo: 'BO', nombre: 'Bolivia' },
  { codigo: 'CL', nombre: 'Chile' },
  { codigo: 'CO', nombre: 'Colombia' },
  { codigo: 'CR', nombre: 'Costa Rica' },
  { codigo: 'EC', nombre: 'Ecuador' },
  { codigo: 'MX', nombre: 'México' },
  { codigo: 'PA', nombre: 'Panamá' },
  { codigo: 'PY', nombre: 'Paraguay' },
  { codigo: 'PE', nombre: 'Perú' },
  { codigo: 'UY', nombre: 'Uruguay' },
  { codigo: 'VE', nombre: 'Venezuela' }
];

// Handler específico para países - optimizado
export async function countriesHandler(request, context) {
  context.log('Countries endpoint called');
  
  try {
    return {
      status: 200,
      jsonBody: PAISES,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
      }
    };
  } catch (error) {
    context.log('Error in countries:', error);
    return {
      status: 500,
      jsonBody: { error: 'Error interno del servidor' }
    };
  }
}

// Datos de ciudades pre-organizados para mejor performance
const CIUDADES_POR_PAIS = {
  'Argentina': ['Buenos Aires', 'Córdoba', 'Corrientes', 'La Plata', 'Mar del Plata', 'Mendoza', 'Rosario', 'Salta', 'Santa Fe', 'Tucumán'],
  'Chile': ['Antofagasta', 'Arica', 'Chillán', 'Concepción', 'La Serena', 'Rancagua', 'Santiago', 'Talca', 'Temuco', 'Valparaíso'],
  'Colombia': ['Armenia', 'Barranquilla', 'Bogotá', 'Bucaramanga', 'Cali', 'Cartagena', 'Ibagué', 'Manizales', 'Medellín', 'Montería', 'Neiva', 'Pasto', 'Pereira', 'Santa Marta', 'Villavicencio'],
  'México': ['Ciudad de México', 'Guadalajara', 'Juárez', 'León', 'Monterrey', 'Puebla', 'Querétaro', 'San Luis Potosí', 'Tijuana', 'Torreón'],
  'Perú': ['Arequipa', 'Chimbote', 'Chiclayo', 'Cusco', 'Huancayo', 'Iquitos', 'Lima', 'Piura', 'Tacna', 'Trujillo']
};

// Datos de sucursales pre-definidos para mejor performance
const SUCURSALES = [
  { id: 'barranquilla', nombre: 'Sede Barranquilla', ciudad: 'Barranquilla', direccion: 'Calle 84 #45-30' },
  { id: 'bucaramanga', nombre: 'Sede Bucaramanga', ciudad: 'Bucaramanga', direccion: 'Carrera 27 #34-20' },
  { id: 'cali', nombre: 'Sede Cali', ciudad: 'Cali', direccion: 'Avenida 6N #28-10' },
  { id: 'cartagena', nombre: 'Sede Cartagena', ciudad: 'Cartagena', direccion: 'Avenida Pedro de Heredia #25-15' },
  { id: 'centro', nombre: 'Sede Centro', ciudad: 'Bogotá', direccion: 'Avenida 19 #85-30' },
  { id: 'medellin', nombre: 'Sede Medellín', ciudad: 'Medellín', direccion: 'Carrera 70 #52-20' },
  { id: 'norte', nombre: 'Sede Norte', ciudad: 'Bogotá', direccion: 'Calle 100 #15-20' },
  { id: 'sur', nombre: 'Sede Sur', ciudad: 'Bogotá', direccion: 'Carrera 30 #40-50' }
];

// Handler específico para sucursales - optimizado
export async function sucursalesHandler(request, context) {
  context.log('Sucursales endpoint called');
  
  try {
    return {
      status: 200,
      jsonBody: SUCURSALES,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
      }
    };
  } catch (error) {
    context.log('Error in sucursales:', error);
    return {
      status: 500,
      jsonBody: { error: 'Error interno del servidor' }
    };
  }
}

// Handler específico para ciudades - optimizado
export async function citiesHandler(request, context) {
  context.log('Cities endpoint called');
  
  try {
    const url = new URL(request.url);
    const pais = url.searchParams.get('pais');
    
    if (!pais) {
      return {
        status: 400,
        jsonBody: { error: 'Se requiere el parámetro: pais' },
        headers: { 'Content-Type': 'application/json' }
      };
    }
    
    const ciudades = CIUDADES_POR_PAIS[pais] || [];
    
    return {
      status: 200,
      jsonBody: ciudades,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800' // Cache por 30 minutos
      }
    };
  } catch (error) {
    context.log('Error in cities:', error);
    return {
      status: 500,
      jsonBody: { error: 'Error interno del servidor' }
    };
  }
}

export async function configHandler(request, context) {
  context.log('Config function executed');
  
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const configType = pathSegments[pathSegments.length - 1]; // countries, cities, sucursales
    
    if (request.method === 'GET') {
      
      if (configType === 'cities') {
        const pais = url.searchParams.get('pais');
        
        if (!pais) {
          return {
            status: 400,
            jsonBody: { error: 'Se requiere el parámetro: pais' }
          };
        }
        
        // Base de datos simplificada de ciudades por país
        const ciudadesPorPais = {
          'Colombia': [
            'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 
            'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué', 'Pasto',
            'Manizales', 'Neiva', 'Villavicencio', 'Armenia', 'Montería'
          ],
          'México': [
            'Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana',
            'León', 'Juárez', 'Torreón', 'Querétaro', 'San Luis Potosí'
          ],
          'Argentina': [
            'Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata',
            'Tucumán', 'Mar del Plata', 'Salta', 'Santa Fe', 'Corrientes'
          ],
          'Perú': [
            'Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Huancayo',
            'Piura', 'Iquitos', 'Cusco', 'Chimbote', 'Tacna'
          ],
          'Chile': [
            'Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta',
            'Temuco', 'Rancagua', 'Talca', 'Arica', 'Chillán'
          ]
        };
        
        const ciudades = ciudadesPorPais[pais] || [];
        
        return {
          status: 200,
          jsonBody: ciudades.sort()
        };
      }
      
      if (configType === 'sucursales') {
        // Lista de sucursales de la clínica dental
        const sucursales = [
          { id: 'norte', nombre: 'Sede Norte', ciudad: 'Bogotá', direccion: 'Calle 100 #15-20' },
          { id: 'sur', nombre: 'Sede Sur', ciudad: 'Bogotá', direccion: 'Carrera 30 #40-50' },
          { id: 'centro', nombre: 'Sede Centro', ciudad: 'Bogotá', direccion: 'Avenida 19 #85-30' },
          { id: 'medellin', nombre: 'Sede Medellín', ciudad: 'Medellín', direccion: 'Carrera 70 #52-20' },
          { id: 'cali', nombre: 'Sede Cali', ciudad: 'Cali', direccion: 'Avenida 6N #28-10' },
          { id: 'barranquilla', nombre: 'Sede Barranquilla', ciudad: 'Barranquilla', direccion: 'Calle 84 #45-30' },
          { id: 'bucaramanga', nombre: 'Sede Bucaramanga', ciudad: 'Bucaramanga', direccion: 'Carrera 27 #34-20' },
          { id: 'cartagena', nombre: 'Sede Cartagena', ciudad: 'Cartagena', direccion: 'Avenida Pedro de Heredia #25-15' }
        ];
        
        return {
          status: 200,
          jsonBody: sucursales
        };
      }
      
      return {
        status: 404,
        jsonBody: { error: 'Endpoint de configuración no encontrado. Opciones: countries, cities, sucursales' }
      };
    }

    return { 
      status: 405, 
      jsonBody: { error: 'Método no permitido' } 
    };
    
  } catch (error) {
    context.log('Error:', error);
    return {
      status: 500,
      jsonBody: { 
        error: 'Error interno del servidor',
        details: error.message 
      }
    };
  }
}

// Registración optimizada de endpoints
app.http('config-countries', {
  route: 'config/countries',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: countriesHandler // Handler específico optimizado
});

app.http('config-cities', {
  route: 'config/cities',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: citiesHandler // Handler específico optimizado
});

app.http('config-sucursales', {
  route: 'config/sucursales',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: sucursalesHandler // Handler específico optimizado
});
