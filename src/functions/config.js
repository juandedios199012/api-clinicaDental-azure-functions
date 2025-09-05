import { app } from '@azure/functions';

export async function configHandler(request, context) {
  context.log('Config function executed');
  
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const configType = pathSegments[pathSegments.length - 1]; // countries, cities, sucursales
    
    if (request.method === 'GET') {
      
      if (configType === 'countries') {
        // Lista de países principales para clínicas dentales
        const paises = [
          { codigo: 'CO', nombre: 'Colombia' },
          { codigo: 'MX', nombre: 'México' },
          { codigo: 'AR', nombre: 'Argentina' },
          { codigo: 'PE', nombre: 'Perú' },
          { codigo: 'CL', nombre: 'Chile' },
          { codigo: 'EC', nombre: 'Ecuador' },
          { codigo: 'BO', nombre: 'Bolivia' },
          { codigo: 'VE', nombre: 'Venezuela' },
          { codigo: 'UY', nombre: 'Uruguay' },
          { codigo: 'PY', nombre: 'Paraguay' },
          { codigo: 'CR', nombre: 'Costa Rica' },
          { codigo: 'PA', nombre: 'Panamá' }
        ].sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        return {
          status: 200,
          jsonBody: paises
        };
      }
      
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

app.http('config-countries', {
  route: 'config/countries',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: configHandler
});

app.http('config-cities', {
  route: 'config/cities',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: configHandler
});

app.http('config-sucursales', {
  route: 'config/sucursales',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: configHandler
});
