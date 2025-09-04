# API Clínica Dental - Azure Functions

API completa para gestión de clínica dental desarrollada con Azure Functions v4 y Cosmos DB. Diseñada específicamente para performance testing con funcionalidades robustas de gestión de citas médicas.

## 📚 Glosario de Términos

**Términos en inglés utilizados en el código:**
- **`appointments`** = **citas** (citas médicas/dentales)
- **`doctors`** = **doctores** (médicos especialistas)
- **`services`** = **servicios** (servicios dentales)
- **`availability`** = **disponibilidad** (horarios disponibles)

## 🏥 Funcionalidades

- **Gestión de Doctores** - CRUD completo de médicos especialistas
- **Catálogo de Servicios** - Manejo de servicios dentales (limpieza, brackets, ortodoncia, etc.)
- **Sistema de Citas** - Reserva y gestión de citas médicas
- **Disponibilidad en tiempo real** - Consulta de horarios disponibles por doctor

## 🚀 Arquitectura

- **Azure Functions v4** con Node.js Programming Model
- **Cosmos DB** como base de datos NoSQL
- **GitHub Actions** para CI/CD automatizado
- **ESM (ES Modules)** para sintaxis moderna

## 📋 Endpoints del API

### Doctores (`/api/doctors`)
- `GET` - Obtener lista de doctores activos
- `POST` - Registrar nuevo doctor

### Servicios (`/api/services`)
- `GET` - Obtener catálogo de servicios
- `POST` - Crear nuevo servicio

### Citas (`/api/appointments`) 
> **Nota:** `appointments` = citas en español
- `GET` - Consultar citas (con filtros por fecha/doctor)
- `POST` - Agendar nueva cita

### Disponibilidad (`/api/availability`)
> **Nota:** `availability` = disponibilidad en español
- `GET` - Consultar horarios disponibles por doctor y fecha

## 🏗️ Estructura del Proyecto

```
api-clinicaDental-azure-functions/
├── src/
│   ├── index.js                 # Registro principal de funciones
│   └── functions/
│       ├── doctors.js           # Gestión de doctores
│       ├── services.js          # Catálogo de servicios
│       ├── appointments.js      # Sistema de citas (appointments = citas)
│       └── availability.js      # Consulta de disponibilidad
├── .github/workflows/
│   └── deploy.yml              # Pipeline de CI/CD
├── host.json                   # Configuración Azure Functions
├── package.json                # Dependencies y scripts
└── local.settings.json         # Variables de entorno locales
```

## 🗄️ Modelos de Datos

### Doctor
```json
{
  "id": "uuid",
  "nombre": "Dr. Juan Pérez",
  "especialidad": "Ortodonxia",
  "horario": ["09:00", "10:00", "11:00", "14:00", "15:00"],
  "activo": true,
  "createdAt": "2025-09-04T..."
}
```

### Servicio
```json
{
  "id": "uuid",
  "nombre": "Limpieza profunda",
  "duracion": 60,
  "precio": 150.00,
  "activo": true,
  "createdAt": "2025-09-04T..."
}
```

### Cita
```json
{
  "id": "uuid",
  "pacienteNombre": "María García",
  "doctorId": "uuid-doctor",
  "servicioId": "uuid-servicio",
  "fecha": "2025-09-15",
  "hora": "10:00",
  "estado": "confirmada",
  "createdAt": "2025-09-04T..."
}
```

## ⚙️ Configuración

### Variables de Entorno
```bash
CosmosDBConnection=AccountEndpoint=https://...
COSMOS_DATABASE=clinica-dental
```

### Containers de Cosmos DB
- `doctores` - Información de médicos
- `servicios` - Catálogo de servicios
- `citas` - Registro de citas médicas

## 🧪 Testing de Performance

Este API está optimizado para testing de performance con:

- **Endpoints variados** para diferentes tipos de carga
- **Operaciones CRUD completas** 
- **Consultas complejas** con filtros y joins
- **Validación de conflictos** (citas duplicadas)
- **Manejo robusto de errores**

### Ejemplos de Carga de Testing

**Crear Doctor:**
```bash
curl -X POST https://your-api.azurewebsites.net/api/doctors \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Dr. Ana López", "especialidad": "Endodoncia", "horario": ["09:00", "10:00", "11:00"]}'
```

**Agendar Cita:**
```bash
curl -X POST https://your-api.azurewebsites.net/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"pacienteNombre": "Juan Pérez", "doctorId": "uuid", "servicioId": "uuid", "fecha": "2025-09-15", "hora": "10:00"}'
```

**Consultar Disponibilidad:**
```bash
curl "https://your-api.azurewebsites.net/api/availability?doctorId=uuid&fecha=2025-09-15"
```

## 🚀 Deployment

1. **Configurar Azure Function App**
2. **Configurar Cosmos DB y containers**
3. **Configurar variables de entorno en Azure Portal**
4. **Push a main branch** (deployment automático vía GitHub Actions)

## 📊 Performance Testing

Ideal para probar:
- **Carga concurrente** en creación de citas
- **Consultas complejas** de disponibilidad
- **Throughput** en operaciones CRUD
- **Latencia** en consultas de doctores/servicios
- **Stress testing** con múltiples usuarios simultáneos

---

**Desarrollado con las mejores prácticas de Azure Functions v4 para máximo rendimiento y escalabilidad.**
