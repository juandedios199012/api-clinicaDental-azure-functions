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
      const sucursalId = url.searchParams.get('sucursalId');
      const estado = url.searchParams.get('estado'); // Nuevo filtro por estado
      
      let querySpec;
      let parameters = [];
      let whereConditions = ['c.type = "appointment"'];
      
      // Construir condiciones dinámicamente
      if (fecha) {
        whereConditions.push('c.fecha = @fecha');
        parameters.push({ name: '@fecha', value: fecha });
      }
      
      if (doctorId) {
        whereConditions.push('c.doctorId = @doctorId');
        parameters.push({ name: '@doctorId', value: doctorId });
      }
      
      if (sucursalId) {
        whereConditions.push('c.sucursalId = @sucursalId');
        parameters.push({ name: '@sucursalId', value: sucursalId });
      }
      
      if (estado) {
        whereConditions.push('c.estado = @estado');
        parameters.push({ name: '@estado', value: estado });
      }
      
      querySpec = {
        query: `SELECT * FROM c WHERE ${whereConditions.join(' AND ')}`,
        parameters: parameters
      };
      
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
          
          // Obtener nombre de la sucursal (desde los datos estáticos)
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
          const sucursal = sucursales.find(s => s.id === appointment.sucursalId);
          
          return {
            ...appointment,
            doctorNombre: doctors.length > 0 ? doctors[0].nombre : 'Doctor no encontrado',
            servicioNombre: services.length > 0 ? services[0].nombre : 'Servicio no encontrado',
            sucursalNombre: sucursal ? sucursal.nombre : 'Sucursal no encontrada'
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
      const { pacienteNombre, doctorId, servicioId, fecha, hora, sucursalId } = body;
      
      if (!pacienteNombre || !doctorId || !servicioId || !fecha || !hora || !sucursalId) {
        return { 
          status: 400, 
          jsonBody: { error: 'Se requieren los campos: pacienteNombre, doctorId, servicioId, fecha, hora, sucursalId' }
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
        sucursalId, // Nuevo campo para la sucursal
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

    if (request.method === 'PATCH') {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const appointmentId = pathSegments[pathSegments.length - 1]; // ID de la cita
      
      if (!appointmentId || appointmentId === 'appointments') {
        return {
          status: 400,
          jsonBody: { error: 'Se requiere el ID de la cita en la URL. Ejemplo: PATCH /api/appointments/{id}' }
        };
      }

      const body = await request.json();
      const { estado, motivoCancelacion } = body;
      
      // Validar estado
      const estadosValidos = ['confirmada', 'atendida', 'cancelada', 'no_asistio'];
      if (!estado || !estadosValidos.includes(estado)) {
        return {
          status: 400,
          jsonBody: { 
            error: 'Estado inválido. Estados válidos: confirmada, atendida, cancelada, no_asistio' 
          }
        };
      }

      // Verificar si la cita existe
      const existingQuery = {
        query: 'SELECT * FROM c WHERE c.type = "appointment" AND c.id = @appointmentId',
        parameters: [{ name: '@appointmentId', value: appointmentId }]
      };
      
      const { resources: existingAppointments } = await container.items
        .query(existingQuery)
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
        updatedAt: new Date().toISOString()
      };

      // Agregar motivo de cancelación si el estado es 'cancelada'
      if (estado === 'cancelada' && motivoCancelacion) {
        updatedAppointment.motivoCancelacion = motivoCancelacion;
      }

      const { resource: updatedResource } = await container.items
        .upsert(updatedAppointment);
      
      return { 
        status: 200, 
        jsonBody: updatedResource 
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
  methods: ['GET', 'POST', 'PATCH'], // Agregamos PATCH para cambiar estado
  authLevel: 'anonymous',
  handler: appointmentsHandler
});
