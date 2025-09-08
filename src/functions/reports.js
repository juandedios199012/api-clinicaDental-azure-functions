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
      const servicioId = url.searchParams.get('servicioId');
      const publicoObjetivo = url.searchParams.get('publicoObjetivo'); // adultos, niños, tercera_edad
      const fechaInicio = url.searchParams.get('fechaInicio'); // YYYY-MM-DD
      const fechaFin = url.searchParams.get('fechaFin'); // YYYY-MM-DD
      
      // Construir condiciones de filtro para citas
      let whereConditions = ['c.type = "appointment"'];
      let parameters = [];
      
      if (sucursalId) {
        whereConditions.push('c.sucursalId = @sucursalId');
        parameters.push({ name: '@sucursalId', value: sucursalId });
      }
      
      if (servicioId) {
        whereConditions.push('c.servicioId = @servicioId');
        parameters.push({ name: '@servicioId', value: servicioId });
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
      
      // Obtener datos complementarios
      const { resources: allDoctors } = await container.items
        .query('SELECT * FROM c WHERE c.type = "doctor"')
        .fetchAll();
      
      const { resources: allServices } = await container.items
        .query('SELECT * FROM c WHERE c.type = "service"')
        .fetchAll();
      
      const { resources: allPatients } = await container.items
        .query('SELECT * FROM c WHERE c.type = "patient"')
        .fetchAll();
      
      // Filtrar por público objetivo si se especifica
      let filteredAppointments = appointments;
      if (publicoObjetivo) {
        const today = new Date();
        filteredAppointments = appointments.filter(apt => {
          const patient = allPatients.find(p => p.id === apt.pacienteId);
          if (!patient || !patient.fechaNacimiento) return false;
          
          const birthDate = new Date(patient.fechaNacimiento);
          const age = today.getFullYear() - birthDate.getFullYear();
          
          switch (publicoObjetivo) {
            case 'niños':
              return age < 18;
            case 'adultos':
              return age >= 18 && age < 65;
            case 'tercera_edad':
              return age >= 65;
            default:
              return true;
          }
        });
      }
      
      // Calcular métricas básicas
      const totalCitas = filteredAppointments.length;
      const citasAtendidas = filteredAppointments.filter(apt => apt.estado === 'atendida');
      const citasCanceladas = filteredAppointments.filter(apt => apt.estado === 'cancelada');
      const citasConfirmadas = filteredAppointments.filter(apt => apt.estado === 'confirmada');
      const citasNoAsistio = filteredAppointments.filter(apt => apt.estado === 'no_asistio');
      
      // Calcular ingresos totales (solo citas atendidas)
      const ingresosTotales = citasAtendidas.reduce((total, apt) => {
        const service = allServices.find(s => s.id === apt.servicioId);
        return total + (service ? service.precio : 0);
      }, 0);
      
      // Calcular ingreso promedio por cita atendida
      const ingresoPromedioPorCita = citasAtendidas.length > 0 
        ? ingresosTotales / citasAtendidas.length 
        : 0;
      
      // Calcular tasa de citas completadas
      const tasaCitasCompletadas = totalCitas > 0 
        ? (citasAtendidas.length / totalCitas) * 100 
        : 0;
      
      // Procedimientos por especialización
      const procedimientosPorEspecializacion = {};
      citasAtendidas.forEach(apt => {
        const doctor = allDoctors.find(d => d.id === apt.doctorId);
        const especialidad = doctor ? doctor.especialidad : 'Sin especialidad';
        
        if (!procedimientosPorEspecializacion[especialidad]) {
          procedimientosPorEspecializacion[especialidad] = 0;
        }
        procedimientosPorEspecializacion[especialidad]++;
      });
      
      // Tendencias mensuales
      const tendenciasMensuales = {};
      filteredAppointments.forEach(apt => {
        const fecha = new Date(apt.fecha);
        const mesAno = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        
        if (!tendenciasMensuales[mesAno]) {
          tendenciasMensuales[mesAno] = {
            mes: mesAno,
            atendidas: 0,
            canceladas: 0,
            noAsistio: 0,
            ingresos: 0,
            total: 0
          };
        }
        
        tendenciasMensuales[mesAno].total++;
        
        if (apt.estado === 'atendida') {
          tendenciasMensuales[mesAno].atendidas++;
          const service = allServices.find(s => s.id === apt.servicioId);
          tendenciasMensuales[mesAno].ingresos += service ? service.precio : 0;
        } else if (apt.estado === 'cancelada') {
          tendenciasMensuales[mesAno].canceladas++;
        } else if (apt.estado === 'no_asistio') {
          tendenciasMensuales[mesAno].noAsistio++;
        }
      });
      
      // Calcular tasa de éxito para cada mes
      const tendenciasArray = Object.values(tendenciasMensuales).map(mes => ({
        ...mes,
        tasaExito: mes.total > 0 ? (mes.atendidas / mes.total) * 100 : 0
      })).sort((a, b) => a.mes.localeCompare(b.mes));
      
      // Enriquecer datos con nombres (para las listas detalladas)
      const enrichAppointments = async (appointmentsList) => {
        return appointmentsList.map(appointment => {
          const doctor = allDoctors.find(d => d.id === appointment.doctorId);
          const service = allServices.find(s => s.id === appointment.servicioId);
          const patient = allPatients.find(p => p.id === appointment.pacienteId);
          
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
            doctorNombre: doctor ? doctor.nombre : 'Doctor no encontrado',
            doctorEspecialidad: doctor ? doctor.especialidad : 'Sin especialidad',
            servicioNombre: service ? service.nombre : 'Servicio no encontrado',
            servicioPrecio: service ? service.precio : 0,
            pacienteNombre: patient ? patient.nombre : 'Paciente no encontrado',
            sucursalNombre: sucursal ? sucursal.nombre : 'Sucursal no encontrada'
          };
        });
      };
      
      const citasAtendidasEnriquecidas = await enrichAppointments(
        citasAtendidas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      );
      
      const citasCanceladasEnriquecidas = await enrichAppointments(
        citasCanceladas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      );
      
      // Respuesta completa para el dashboard
      return {
        status: 200,
        jsonBody: {
          // Métricas principales para los cuadros
          metricas: {
            totalCitas: totalCitas,
            citasAtendidas: citasAtendidas.length,
            citasCanceladas: citasCanceladas.length,
            citasConfirmadas: citasConfirmadas.length,
            citasNoAsistio: citasNoAsistio.length,
            ingresosTotales: ingresosTotales,
            ingresoPromedioPorCita: Math.round(ingresoPromedioPorCita * 100) / 100,
            tasaCitasCompletadas: Math.round(tasaCitasCompletadas * 100) / 100,
            porcentajeAtendidas: totalCitas > 0 ? Math.round((citasAtendidas.length / totalCitas) * 100) : 0,
            porcentajeCanceladas: totalCitas > 0 ? Math.round((citasCanceladas.length / totalCitas) * 100) : 0
          },
          
          // Datos para gráficos y tablas
          procedimientosPorEspecializacion: Object.entries(procedimientosPorEspecializacion)
            .map(([especialidad, cantidad]) => ({ especialidad, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad),
          
          tendenciasMensuales: tendenciasArray,
          
          // Listas detalladas
          citasAtendidas: citasAtendidasEnriquecidas,
          citasCanceladas: citasCanceladasEnriquecidas,
          
          // Información de filtros aplicados
          filtrosAplicados: {
            sucursalId: sucursalId || 'todas',
            servicioId: servicioId || 'todos',
            publicoObjetivo: publicoObjetivo || 'todos',
            fechaInicio: fechaInicio || 'sin_limite',
            fechaFin: fechaFin || 'sin_limite',
            totalFiltrado: filteredAppointments.length,
            totalSinFiltros: appointments.length
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
