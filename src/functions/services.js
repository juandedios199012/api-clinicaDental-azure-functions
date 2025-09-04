import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import crypto from 'crypto';

export async function servicesHandler(request, context) {
  context.log('Services function executed');
  
  try {
    const cosmosClient = new CosmosClient(process.env.CosmosDBConnection);
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER_SERVICES);
    
    if (request.method === 'GET') {
      // Obtener todos los servicios activos
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.activo = true ORDER BY c.nombre'
      };
      
      const { resources: services } = await container.items
        .query(querySpec)
        .fetchAll();
      
      return { 
        status: 200,
        jsonBody: services
      };
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { nombre, duracion, precio } = body;
      
      if (!nombre || !duracion || !precio) {
        return { 
          status: 400, 
          jsonBody: { error: 'Se requieren los campos: nombre, duracion (minutos), precio' }
        };
      }

      const servicio = {
        id: crypto.randomUUID(),
        nombre,
        duracion: parseInt(duracion),
        precio: parseFloat(precio),
        activo: true,
        createdAt: new Date().toISOString()
      };
      
      const { resource: createdService } = await container.items.create(servicio);
      
      return { 
        status: 201, 
        jsonBody: createdService 
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

app.http('services', {
  route: 'services',
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: servicesHandler
});
