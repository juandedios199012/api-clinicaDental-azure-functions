import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import crypto from 'crypto';

export async function setupHandler(request, context) {
  context.log('Setup function executed');
  
  try {
    const cosmosClient = new CosmosClient(process.env.CosmosDBConnection);
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);
    
    if (request.method === 'POST') {
      // Servicios de ejemplo simplificados
      const serviciosEjemplo = [
        { nombre: 'Limpieza dental', duracion: 60, precio: 80000, descripcion: 'Limpieza profunda y profilaxis dental' },
        { nombre: 'Blanqueamiento dental', duracion: 90, precio: 250000, descripcion: 'Blanqueamiento profesional con láser' },
        { nombre: 'Resina estética', duracion: 45, precio: 120000, descripcion: 'Restauración con resina del color del diente' },
        { nombre: 'Tratamiento de conducto', duracion: 120, precio: 350000, descripcion: 'Endodoncia completa con corona' },
        { nombre: 'Extracción dental', duracion: 30, precio: 80000, descripcion: 'Extracción simple de pieza dental' },
        { nombre: 'Brackets metálicos', duracion: 60, precio: 1200000, descripcion: 'Tratamiento completo de ortodoncia' },
        { nombre: 'Implante dental', duracion: 90, precio: 1800000, descripcion: 'Implante titanio con corona' },
        { nombre: 'Limpieza infantil', duracion: 45, precio: 60000, descripcion: 'Limpieza dental especializada para niños' }
      ];

      // Doctores de ejemplo
      const doctoresEjemplo = [
        { nombre: 'Dr. Carlos Rodriguez', especialidad: 'Endodoncia', telefono: '3101234567', email: 'carlos@clinica.com' },
        { nombre: 'Dra. Ana Martinez', especialidad: 'Ortodoncia', telefono: '3207654321', email: 'ana@clinica.com' },
        { nombre: 'Dr. Luis Gonzalez', especialidad: 'Cirugía Oral', telefono: '3156789012', email: 'luis@clinica.com' },
        { nombre: 'Dra. Maria Lopez', especialidad: 'Odontología General', telefono: '3009876543', email: 'maria@clinica.com' }
      ];

      // Pacientes de ejemplo
      const pacientesEjemplo = [
        { nombre: 'Juan', apellido: 'Pérez', correoElectronico: 'juan.perez@email.com', numeroTelefono: '3001234567', fechaNacimiento: '1985-03-15', pais: 'Colombia', ciudad: 'Bogotá', direccion: 'Calle 123 #45-67' },
        { nombre: 'María', apellido: 'García', correoElectronico: 'maria.garcia@email.com', numeroTelefono: '3007654321', fechaNacimiento: '1990-07-22', pais: 'Colombia', ciudad: 'Medellín', direccion: 'Carrera 45 #67-89' },
        { nombre: 'Carlos', apellido: 'López', correoElectronico: 'carlos.lopez@email.com', numeroTelefono: '3009876543', fechaNacimiento: '1978-11-08', pais: 'Colombia', ciudad: 'Cali', direccion: 'Avenida 6 #28-45' },
        { nombre: 'Ana', apellido: 'Rodríguez', correoElectronico: 'ana.rodriguez@email.com', numeroTelefono: '3005432109', fechaNacimiento: '1995-01-30', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Calle 84 #30-15' }
      ];

      const results = { servicios: [], doctores: [], pacientes: [] };

      // Insertar servicios
      for (const servicio of serviciosEjemplo) {
        const nuevoServicio = {
          id: crypto.randomUUID(),
          type: 'service',
          ...servicio,
          activo: true,
          createdAt: new Date().toISOString()
        };
        
        const { resource } = await container.items.create(nuevoServicio);
        results.servicios.push(resource);
      }

      // Insertar doctores
      for (const doctor of doctoresEjemplo) {
        const nuevoDoctor = {
          id: crypto.randomUUID(),
          type: 'doctor',
          ...doctor,
          activo: true,
          createdAt: new Date().toISOString()
        };
        
        const { resource } = await container.items.create(nuevoDoctor);
        results.doctores.push(resource);
      }

      // Insertar pacientes
      for (const paciente of pacientesEjemplo) {
        const nuevoPaciente = {
          id: crypto.randomUUID(),
          type: 'patient',
          ...paciente,
          aceptaPoliticas: true,
          fechaRegistro: new Date().toISOString(),
          activo: true,
          createdAt: new Date().toISOString()
        };
        
        const { resource } = await container.items.create(nuevoPaciente);
        results.pacientes.push(resource);
      }

      return {
        status: 200,
        jsonBody: {
          message: 'Datos de ejemplo creados exitosamente',
          serviciosCreados: results.servicios.length,
          doctoresCreados: results.doctores.length,
          pacientesCreados: results.pacientes.length,
          data: results
        }
      };
    }

    return { 
      status: 405, 
      jsonBody: { error: 'Método no permitido. Use POST para crear datos de ejemplo.' } 
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

app.http('setup', {
  route: 'setup',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: setupHandler
});
