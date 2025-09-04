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
          query: 'SELECT * FROM c WHERE c.fecha = @fecha AND c.doctorId = @doctorId ORDER BY c.hora',
          parameters: [
            { name: '@fecha', value: fecha },
            { name: '@doctorId', value: doctorId }
          ]
        };
      } else if (fecha) {
        querySpec = {
          query: 'SELECT * FROM c WHERE c.fecha = @fecha ORDER BY c.hora',
          parameters: [
            { name: '@fecha', value: fecha }
          ]
        };
      } else {
        querySpec = {
          query: 'SELECT * FROM c ORDER BY c.fecha DESC, c.hora'
        };
      }
      
      const { resources: appointments } = await container.items
        .query(querySpec)
        .fetchAll();
      
      return { 
        status: 200,
        jsonBody: appointments
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
        query: 'SELECT * FROM c WHERE c.doctorId = @doctorId AND c.fecha = @fecha AND c.hora = @hora',
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
