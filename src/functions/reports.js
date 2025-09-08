import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

export async function reportsHandler(request, context) {
  context.log('Reports function executed');
  
  try {
    const cosmosClient = new CosmosClient(process.env.CosmosDBConnection);
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);
    
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const sucursalId = url.searchParams.get('sucursalId');
      const fechaInicio = url.searchParams.get('fechaInicio'); // YYYY-MM-DD
      const fechaFin = url.searchParams.get('fechaFin'); // YYYY-MM-DD
      
      // Construir condiciones de filtro
      let whereConditions = ['c.type = "appointment"'];
      let parameters = [];
      
      if (sucursalId) {
        whereConditions.push('c.sucursalId = @sucursalId');
        parameters.push({ name: '@sucursalId', value: sucursalId });
      }
      
      if (fechaInicio) {
        whereConditions.push('c.fecha >= @fechaInicio');
        parameters.push({ name: '@fechaInicio', value: fechaInicio });
      }
      
      if (fechaFin) {
        whereConditions.push('c.fecha <= @fechaFin');
        parameters.push({ name: '@fechaFin', value: fechaFin });
      }
      
      // Obtener todas las citas con filtros
      const querySpec = {
        query: `SELECT * FROM c WHERE ${whereConditions.join(' AND ')}`,
        parameters: parameters
      };
      
      const { resources: appointments } = await container.items
        .query(querySpec)
        .fetchAll();
      
      // Calcular métricas por estado
      const metricas = {
        total: appointments.length,
        confirmadas: appointments.filter(apt => apt.estado === 'confirmada').length,
        atendidas: appointments.filter(apt => apt.estado === 'atendida').length,
        canceladas: appointments.filter(apt => apt.estado === 'cancelada').length,
        noAsistio: appointments.filter(apt => apt.estado === 'no_asistio').length
      };
      
      // Obtener detalles de citas atendidas
      const citasAtendidas = appointments
        .filter(apt => apt.estado === 'atendida')
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      // Obtener detalles de citas canceladas
      const citasCanceladas = appointments
        .filter(apt => apt.estado === 'cancelada')
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      // Enriquecer datos con nombres (para las listas detalladas)
      const enrichAppointments = async (appointmentsList) => {
        return await Promise.all(
          appointmentsList.map(async (appointment) => {
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
            
            // Obtener nombre de la sucursal
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
      };
      
      const citasAtendidasEnriquecidas = await enrichAppointments(citasAtendidas);
      const citasCanceladasEnriquecidas = await enrichAppointments(citasCanceladas);
      
      return {
        status: 200,
        jsonBody: {
          metricas,
          citasAtendidas: citasAtendidasEnriquecidas,
          citasCanceladas: citasCanceladasEnriquecidas,
          filtros: {
            sucursalId: sucursalId || 'todas',
            fechaInicio: fechaInicio || 'sin_limite',
            fechaFin: fechaFin || 'sin_limite'
          }
        }
      };
    }

    return { 
      status: 405, 
      jsonBody: { error: 'Método no permitido' } 
    };
    
  } catch (error) {
    context.log('Error in reports:', error);
    return {
      status: 500,
      jsonBody: { 
        error: 'Error interno del servidor',
        details: error.message 
      }
    };
  }
}

app.http('reports', {
  route: 'reports',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: reportsHandler
});
