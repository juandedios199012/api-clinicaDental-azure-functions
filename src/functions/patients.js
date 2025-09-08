import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import crypto from 'crypto';

export async function patientsHandler(request, context) {
  context.log('Patients function executed');
  
  try {
    // Log para verificar variables de entorno
    context.log('Environment check:', {
      hasCosmosConnection: !!process.env.CosmosDBConnection,
      hasDatabase: !!process.env.COSMOS_DATABASE,
      hasContainer: !!process.env.COSMOS_CONTAINER
    });

    const cosmosClient = new CosmosClient(process.env.CosmosDBConnection);
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);
    
    if (request.method === 'GET') {
      context.log('Processing GET request for patients');
      
      const url = new URL(request.url);
      const searchTerm = url.searchParams.get('search');
      
      let querySpec;
      if (searchTerm) {
        context.log('Search term provided:', searchTerm);
        querySpec = {
          query: 'SELECT * FROM c WHERE c.type = "patient" AND c.activo = true AND (CONTAINS(LOWER(c.nombre), LOWER(@search)) OR CONTAINS(LOWER(c.apellido), LOWER(@search)) OR CONTAINS(LOWER(c.correoElectronico), LOWER(@search)))',
          parameters: [
            { name: '@search', value: searchTerm }
          ]
        };
      } else {
        context.log('No search term, getting all active patients');
        querySpec = {
          query: 'SELECT * FROM c WHERE c.type = "patient" AND c.activo = true'
        };
      }
      
      context.log('Executing query:', querySpec.query);
      
      const { resources: patients } = await container.items
        .query(querySpec)
        .fetchAll();
      
      context.log('Found patients:', patients.length);
      
      // Ordenar en JavaScript para evitar problemas de índice en Cosmos DB
      const sortedPatients = patients.sort((a, b) => {
        const lastNameCompare = (a.apellido || '').localeCompare(b.apellido || '');
        if (lastNameCompare !== 0) return lastNameCompare;
        return (a.nombre || '').localeCompare(b.nombre || '');
      });
      
      return { 
        status: 200,
        jsonBody: sortedPatients
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

    if (request.method === 'PUT') {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const patientId = pathSegments[pathSegments.length - 1]; // ID del paciente
      
      if (!patientId || patientId === 'patients') {
        return {
          status: 400,
          jsonBody: { error: 'Se requiere el ID del paciente en la URL. Ejemplo: PUT /api/patients/{id}' }
        };
      }

      const body = await request.json();
      const { 
        nombre, 
        apellido, 
        correoElectronico, 
        numeroTelefono, 
        pais, 
        ciudad, 
        direccion 
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

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correoElectronico)) {
        return {
          status: 400,
          jsonBody: { error: 'El formato del correo electrónico no es válido' }
        };
      }

      // Verificar si el paciente existe
      const existingPatientQuery = {
        query: 'SELECT * FROM c WHERE c.type = "patient" AND c.id = @patientId',
        parameters: [{ name: '@patientId', value: patientId }]
      };
      
      const { resources: existingPatients } = await container.items
        .query(existingPatientQuery)
        .fetchAll();
      
      if (existingPatients.length === 0) {
        return {
          status: 404,
          jsonBody: { error: 'Paciente no encontrado' }
        };
      }

      // Verificar si el email ya existe en otro paciente
      const emailCheckQuery = {
        query: 'SELECT * FROM c WHERE c.type = "patient" AND c.correoElectronico = @email AND c.id != @patientId',
        parameters: [
          { name: '@email', value: correoElectronico },
          { name: '@patientId', value: patientId }
        ]
      };
      
      const { resources: emailConflicts } = await container.items
        .query(emailCheckQuery)
        .fetchAll();
      
      if (emailConflicts.length > 0) {
        return {
          status: 409,
          jsonBody: { error: 'Ya existe otro paciente registrado con este correo electrónico' }
        };
      }

      // Actualizar paciente
      const existingPatient = existingPatients[0];
      const updatedPatient = {
        ...existingPatient,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correoElectronico: correoElectronico.toLowerCase().trim(),
        numeroTelefono: numeroTelefono.trim(),
        pais: pais.trim(),
        ciudad: ciudad.trim(),
        direccion: direccion.trim(),
        updatedAt: new Date().toISOString()
      };
      
      const { resource: updatedResource } = await container.items
        .upsert(updatedPatient);
      
      return { 
        status: 200, 
        jsonBody: updatedResource 
      };
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const patientId = pathSegments[pathSegments.length - 1]; // ID del paciente
      
      if (!patientId || patientId === 'patients') {
        return {
          status: 400,
          jsonBody: { error: 'Se requiere el ID del paciente en la URL. Ejemplo: DELETE /api/patients/{id}' }
        };
      }

      // Verificar si el paciente existe
      const existingPatientQuery = {
        query: 'SELECT * FROM c WHERE c.type = "patient" AND c.id = @patientId',
        parameters: [{ name: '@patientId', value: patientId }]
      };
      
      const { resources: existingPatients } = await container.items
        .query(existingPatientQuery)
        .fetchAll();
      
      if (existingPatients.length === 0) {
        return {
          status: 404,
          jsonBody: { error: 'Paciente no encontrado' }
        };
      }

      // Soft delete: marcar como inactivo en lugar de eliminar físicamente
      const existingPatient = existingPatients[0];
      const deletedPatient = {
        ...existingPatient,
        activo: false,
        fechaEliminacion: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const { resource: deletedResource } = await container.items
        .upsert(deletedPatient);
      
      return { 
        status: 200, 
        jsonBody: { 
          message: 'Paciente eliminado exitosamente',
          paciente: deletedResource
        }
      };
    }

    return { 
      status: 405, 
      jsonBody: { error: 'Método no permitido' } 
    };
    
  } catch (error) {
    context.log('Error in patients handler:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    });
    
    // Errores específicos de Cosmos DB
    if (error.code === 'Unauthorized' || error.statusCode === 401) {
      return {
        status: 500,
        jsonBody: { 
          error: 'Error de autenticación con la base de datos',
          details: 'Verifique la configuración de Cosmos DB'
        }
      };
    }
    
    if (error.code === 'NotFound' || error.statusCode === 404) {
      return {
        status: 500,
        jsonBody: { 
          error: 'Base de datos o contenedor no encontrado',
          details: 'Verifique la configuración de Cosmos DB'
        }
      };
    }
    
    return {
      status: 500,
      jsonBody: { 
        error: 'Error interno del servidor',
        details: error.message,
        code: error.code || 'UNKNOWN'
      }
    };
  }
}

app.http('patients', {
  route: 'patients',
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Agregamos PUT y DELETE
  authLevel: 'anonymous',
  handler: patientsHandler
});
