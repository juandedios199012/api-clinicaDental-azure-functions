import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

export async function appointmentStatusHandler(request, context) {
  context.log('Appointment Status function executed');
  
  try {
    const cosmosClient = new CosmosClient(process.env.CosmosDBConnection);
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);
    
    if (request.method === 'PUT') {
      // Obtener el ID de la cita desde la URL
      const appointmentId = request.params.id;
      
      if (!appointmentId) {
        return {
          status: 400,
          jsonBody: { error: 'ID de cita requerido' }
        };
      }

      // Obtener el nuevo estado desde el body
      const requestBody = await request.json();
      const { estado, motivoCancelacion } = requestBody;

      // Validar estado
      const estadosValidos = ['confirmada', 'atendida', 'cancelada', 'no_asistio'];
      if (!estado || !estadosValidos.includes(estado)) {
        return {
          status: 400,
          jsonBody: { 
            error: 'Estado inválido. Estados permitidos: confirmada, atendida, cancelada, no_asistio' 
          }
        };
      }

      // Si el estado es cancelada, validar que se proporcione motivo
      if (estado === 'cancelada' && !motivoCancelacion) {
        return {
          status: 400,
          jsonBody: { 
            error: 'Motivo de cancelación requerido cuando el estado es "cancelada"' 
          }
        };
      }

      // Buscar la cita existente
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = "appointment" AND c.id = @appointmentId',
        parameters: [{ name: '@appointmentId', value: appointmentId }]
      };

      const { resources: existingAppointments } = await container.items
        .query(querySpec)
        .fetchAll();

      if (existingAppointments.length === 0) {
        return {
          status: 404,
          jsonBody: { error: 'Cita no encontrada' }
        };
      }

      // Actualizar estado de la cita
      const existingAppointment = existingAppointments[0];
      const updatedAppointment = {
        ...existingAppointment,
        estado: estado,
        fechaCambioEstado: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estadoAnterior: existingAppointment.estado // Guardar el estado anterior para auditoria
      };

      // Agregar motivo de cancelación si aplica
      if (estado === 'cancelada' && motivoCancelacion) {
        updatedAppointment.motivoCancelacion = motivoCancelacion;
      }

      // Si la cita se marca como atendida, registrar fecha de atención
      if (estado === 'atendida') {
        updatedAppointment.fechaAtencion = new Date().toISOString();
      }

      // Actualizar en la base de datos
      const { resource: updatedResource } = await container.items
        .upsert(updatedAppointment);
      
      // Enriquecer respuesta con datos adicionales
      const doctorQuery = {
        query: 'SELECT c.nombre, c.especialidad FROM c WHERE c.type = "doctor" AND c.id = @doctorId',
        parameters: [{ name: '@doctorId', value: updatedResource.doctorId }]
      };
      const { resources: doctors } = await container.items.query(doctorQuery).fetchAll();
      
      const serviceQuery = {
        query: 'SELECT c.nombre, c.precio FROM c WHERE c.type = "service" AND c.id = @servicioId',
        parameters: [{ name: '@servicioId', value: updatedResource.servicioId }]
      };
      const { resources: services } = await container.items.query(serviceQuery).fetchAll();
      
      const sucursales = [
        { id: 'barranquilla', nombre: 'Sede Barranquilla' },
        { id: 'bucaramanga', nombre: 'Sede Bucaramanga' },
        { id: 'cali', nombre: 'Sede Cali' },
        { id: 'cartagena', nombre: 'Sede Cartagena' },
        { id: 'centro', nombre: 'Sede Centro' },
        { id: 'medellin', nombre: 'Sede Medellín' },
        { id: 'norte', nombre: 'Sede Norte' },
        { id: 'sur', nombre: 'Sede Sur' }
      ];
      const sucursal = sucursales.find(s => s.id === updatedResource.sucursalId);

      const enrichedResponse = {
        ...updatedResource,
        doctorNombre: doctors.length > 0 ? doctors[0].nombre : 'Doctor no encontrado',
        doctorEspecialidad: doctors.length > 0 ? doctors[0].especialidad : 'Sin especialidad',
        servicioNombre: services.length > 0 ? services[0].nombre : 'Servicio no encontrado',
        servicioPrecio: services.length > 0 ? services[0].precio : 0,
        sucursalNombre: sucursal ? sucursal.nombre : 'Sucursal no encontrada'
      };
      
      return { 
        status: 200, 
        jsonBody: {
          message: `Estado de cita actualizado exitosamente a "${estado}"`,
          appointment: enrichedResponse,
          cambio: {
            estadoAnterior: existingAppointment.estado,
            estadoNuevo: estado,
            fechaCambio: updatedAppointment.fechaCambioEstado
          }
        }
      };
    }

    return { 
      status: 405, 
      jsonBody: { error: 'Método no permitido. Use PUT para actualizar el estado de una cita.' } 
    };
    
  } catch (error) {
    context.log('Error in appointment status:', error);
    return {
      status: 500,
      jsonBody: { 
        error: 'Error interno del servidor',
        details: error.message 
      }
    };
  }
}

// Endpoint específico para cambiar estado de citas
app.http('appointmentStatus', {
  route: 'appointments/{id}/estado',
  methods: ['PUT'],
  authLevel: 'anonymous',
  handler: appointmentStatusHandler
});
