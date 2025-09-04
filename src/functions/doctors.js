import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import crypto from 'crypto';

export async function doctorsHandler(request, context) {
  context.log('Doctors function executed');
  
  try {
    const cosmosClient = new CosmosClient(process.env.CosmosDBConnection);
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);
    
    if (request.method === 'GET') {
      // Obtener todos los doctores activos
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = "doctor" AND c.activo = true ORDER BY c.nombre'
      };
      
      const { resources: doctors } = await container.items
        .query(querySpec)
        .fetchAll();
      
      return { 
        status: 200,
        jsonBody: doctors
      };
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { nombre, especialidad, horario } = body;
      
      if (!nombre || !especialidad || !horario) {
        return { 
          status: 400, 
          jsonBody: { error: 'Se requieren los campos: nombre, especialidad, horario' }
        };
      }

      const doctor = {
        id: crypto.randomUUID(),
        type: 'doctor',
        nombre,
        especialidad,
        horario,
        activo: true,
        createdAt: new Date().toISOString()
      };
      
      const { resource: createdDoctor } = await container.items.create(doctor);
      
      return { 
        status: 201, 
        jsonBody: createdDoctor 
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

app.http('doctors', {
  route: 'doctors',
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: doctorsHandler
});
