import { app } from '@azure/functions';

export async function cancelationReasonsHandler(request, context) {
  context.log('Cancelation Reasons function executed');
  
  try {
    if (request.method === 'GET') {
      // Lista de motivos de cancelación predefinidos
      const motivosCancelacion = [
        'Emergencia médica',
        'Problemas familiares', 
        'Conflicto de horarios',
        'Problemas económicos',
        'Reprogramación solicitada',
        'No se siente bien',
        'Problemas de transporte',
        'Cita duplicada',
        'Cambio de doctor solicitado',
        'Otro motivo'
      ];

      return {
        status: 200,
        jsonBody: {
          motivosCancelacion: motivosCancelacion,
          total: motivosCancelacion.length,
          message: 'Lista de motivos válidos para cancelación de citas'
        }
      };
    }

    return { 
      status: 405, 
      jsonBody: { error: 'Método no permitido. Solo GET está permitido.' } 
    };
    
  } catch (error) {
    context.log('Error in cancelation reasons:', error);
    return {
      status: 500,
      jsonBody: { 
        error: 'Error interno del servidor',
        details: error.message 
      }
    };
  }
}

// Endpoint para obtener motivos de cancelación
app.http('cancelationReasons', {
  route: 'appointments/motivos-cancelacion',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: cancelationReasonsHandler
});
