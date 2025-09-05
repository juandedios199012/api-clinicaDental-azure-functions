import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import crypto from 'crypto';

export async function patientsHandler(request, context) {
  context.log('Patients function executed');
  
  try {
    const cosmosClient = new CosmosClient(process.env.CosmosDBConnection);
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);
    
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const searchTerm = url.searchParams.get('search');
      
      let querySpec;
      if (searchTerm) {
        querySpec = {
          query: 'SELECT * FROM c WHERE c.type = "patient" AND (CONTAINS(LOWER(c.nombre), LOWER(@search)) OR CONTAINS(LOWER(c.apellido), LOWER(@search)) OR CONTAINS(LOWER(c.correoElectronico), LOWER(@search))) ORDER BY c.apellido, c.nombre',
          parameters: [
            { name: '@search', value: searchTerm }
          ]
        };
      } else {
        querySpec = {
          query: 'SELECT * FROM c WHERE c.type = "patient" ORDER BY c.apellido, c.nombre'
        };
      }
      
      const { resources: patients } = await container.items
        .query(querySpec)
        .fetchAll();
      
      return { 
        status: 200,
        jsonBody: patients
      };
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { 
        nombre, 
        apellido, 
        correoElectronico, 
        numeroTelefono, 
        pais, 
        ciudad, 
        direccion, 
        aceptaPoliticas 
      } = body;
      
      // Validaciones requeridas
      if (!nombre || !apellido || !correoElectronico || !numeroTelefono || !pais || !ciudad || !direccion) {
        return { 
          status: 400, 
          jsonBody: { 
            error: 'Se requieren todos los campos: nombre, apellido, correoElectronico, numeroTelefono, pais, ciudad, direccion' 
          }
        };
      }

      // Validar aceptación de políticas
      if (!aceptaPoliticas) {
        return {
          status: 400,
          jsonBody: { error: 'Debe aceptar las políticas de privacidad de datos' }
        };
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correoElectronico)) {
        return {
          status: 400,
          jsonBody: { error: 'El formato del correo electrónico no es válido' }
        };
      }

      // Verificar si el email ya existe
      const existingEmailQuery = {
        query: 'SELECT * FROM c WHERE c.type = "patient" AND c.correoElectronico = @email',
        parameters: [
          { name: '@email', value: correoElectronico }
        ]
      };
      
      const { resources: existingPatients } = await container.items
        .query(existingEmailQuery)
        .fetchAll();
      
      if (existingPatients.length > 0) {
        return {
          status: 409,
          jsonBody: { error: 'Ya existe un paciente registrado con este correo electrónico' }
        };
      }

      const paciente = {
        id: crypto.randomUUID(),
        type: 'patient',
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correoElectronico: correoElectronico.toLowerCase().trim(),
        numeroTelefono: numeroTelefono.trim(),
        pais: pais.trim(),
        ciudad: ciudad.trim(),
        direccion: direccion.trim(),
        aceptaPoliticas: true,
        fechaRegistro: new Date().toISOString(),
        activo: true,
        createdAt: new Date().toISOString()
      };
      
      const { resource: createdPatient } = await container.items.create(paciente);
      
      return { 
        status: 201, 
        jsonBody: createdPatient 
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

app.http('patients', {
  route: 'patients',
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: patientsHandler
});
