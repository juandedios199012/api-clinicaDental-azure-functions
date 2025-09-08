import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import crypto from 'crypto';

export async function appointmentsHandler(request, context) {
  context.log('Appointments function executed');
  
  try {
    const cosmosClient = new CosmosClient(process.env.CosmosDBConnection);
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);
    
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const fecha = url.searchParams.get('fecha');
      const doctorId = url.searchParams.get('doctorId');
      
      let querySpec;
      if (fecha && doctorId) {
        querySpec = {
          query: 'SELECT * FROM c WHERE c.type = "appointment" AND c.fecha = @fecha AND c.doctorId = @doctorId',
          parameters: [
            { name: '@fecha', value: fecha },
            { name: '@doctorId', value: doctorId }
          ]
        };
      } else if (fecha) {
        querySpec = {
          query: 'SELECT * FROM c WHERE c.type = "appointment" AND c.fecha = @fecha',
          parameters: [
            { name: '@fecha', value: fecha }
          ]
        };
      } else {
        querySpec = {
          query: 'SELECT * FROM c WHERE c.type = "appointment"'
        };
      }
      
      const { resources: appointments } = await container.items
        .query(querySpec)
        .fetchAll();

      // Enriquecer citas con nombres de doctor y servicio
      const enrichedAppointments = await Promise.all(
        appointments.map(async (appointment) => {
          // Obtener nombre del doctor
          const doctorQuery = {
            query: 'SELECT c.nombre FROM c WHERE c.type = "doctor" AND c.id = @doctorId',
            parameters: [{ name: '@doctorId', value: appointment.doctorId }]
          };
          const { resources: doctors } = await container.items.query(doctorQuery).fetchAll();
          
          // Obtener nombre del servicio
          const serviceQuery = {
            query: 'SELECT c.nombre FROM c WHERE c.type = "service" AND c.id = @servicioId',
            parameters: [{ name: '@servicioId', value: appointment.servicioId }]
          };
          const { resources: services } = await container.items.query(serviceQuery).fetchAll();
          
          return {
            ...appointment,
            doctorNombre: doctors.length > 0 ? doctors[0].nombre : 'Doctor no encontrado',
            servicioNombre: services.length > 0 ? services[0].nombre : 'Servicio no encontrado'
          };
        })
      );
      
      // Ordenar las citas por fecha (más reciente primero) y luego por hora
      const sortedAppointments = enrichedAppointments.sort((a, b) => {
        // Primero por fecha (descendente - más reciente primero)
        const dateCompare = new Date(b.fecha || '1900-01-01').getTime() - new Date(a.fecha || '1900-01-01').getTime();
        if (dateCompare !== 0) return dateCompare;
        
        // Luego por hora (ascendente)
        return (a.hora || '00:00').localeCompare(b.hora || '00:00');
      });
      
      return { 
        status: 200,
        jsonBody: sortedAppointments
      };
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { pacienteNombre, doctorId, servicioId, fecha, hora } = body;
      
      if (!pacienteNombre || !doctorId || !servicioId || !fecha || !hora) {
        return { 
          status: 400, 
          jsonBody: { error: 'Se requieren los campos: pacienteNombre, doctorId, servicioId, fecha, hora' }
        };
      }

      // Verificar si la cita ya existe
      const existingQuery = {
        query: 'SELECT * FROM c WHERE c.type = "appointment" AND c.doctorId = @doctorId AND c.fecha = @fecha AND c.hora = @hora',
        parameters: [
          { name: '@doctorId', value: doctorId },
          { name: '@fecha', value: fecha },
          { name: '@hora', value: hora }
        ]
      };
      
      const { resources: existing } = await container.items
        .query(existingQuery)
        .fetchAll();
      
      if (existing.length > 0) {
        return {
          status: 409,
          jsonBody: { error: 'Ya existe una cita para este doctor en esta fecha y hora' }
        };
      }

      const cita = {
        id: crypto.randomUUID(),
        type: 'appointment',
        pacienteNombre,
        doctorId,
        servicioId,
        fecha,
        hora,
        estado: 'confirmada',
        createdAt: new Date().toISOString()
      };
      
      const { resource: createdAppointment } = await container.items.create(cita);
      
      return { 
        status: 201, 
        jsonBody: createdAppointment 
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

app.http('appointments', {
  route: 'appointments',
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: appointmentsHandler
});
