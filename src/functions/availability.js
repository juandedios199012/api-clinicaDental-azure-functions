import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

export async function availabilityHandler(request, context) {
  context.log('Availability function executed');
  
  try {
    const cosmosClient = new CosmosClient(process.env.CosmosDBConnection);
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const doctorId = url.searchParams.get('doctorId');
      const fecha = url.searchParams.get('fecha');
      
      if (!doctorId || !fecha) {
        return {
          status: 400,
          jsonBody: { error: 'Se requieren los parámetros: doctorId y fecha' }
        };
      }
      
      // Obtener horario del doctor
      const doctorQuery = {
        query: 'SELECT * FROM c WHERE c.type = "doctor" AND c.id = @doctorId',
        parameters: [{ name: '@doctorId', value: doctorId }]
      };
      
      const { resources: doctors } = await container.items.query(doctorQuery).fetchAll();
      
      if (!doctors || doctors.length === 0) {
        return {
          status: 404,
          jsonBody: { error: 'Doctor no encontrado' }
        };
      }
      
      const doctor = doctors[0];
      const horarioCompleto = doctor.horario || [];
      
      // Obtener citas existentes para ese doctor en esa fecha
      const citasQuery = {
        query: 'SELECT c.hora FROM c WHERE c.type = "appointment" AND c.doctorId = @doctorId AND c.fecha = @fecha',
        parameters: [
          { name: '@doctorId', value: doctorId },
          { name: '@fecha', value: fecha }
        ]
      };
      
      const { resources: citas } = await container.items
        .query(citasQuery)
        .fetchAll();
      
      const horasOcupadas = citas.map(cita => cita.hora);
      
      // Filtrar horarios disponibles
      const horariosDisponibles = horarioCompleto.filter(hora => 
        !horasOcupadas.includes(hora)
      );
      
      return {
        status: 200,
        jsonBody: {
          doctorId,
          fecha,
          doctorNombre: doctor.nombre,
          especialidad: doctor.especialidad,
          horarioCompleto,
          horasOcupadas,
          horariosDisponibles
        }
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

app.http('availability', {
  route: 'availability',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: availabilityHandler
});
