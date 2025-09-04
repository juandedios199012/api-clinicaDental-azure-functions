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

## 📝 **Historial de Desarrollo y Conversación**

### **🎯 Solicitud Inicial**
**Usuario:** "ahora vamos a hacer un proyecto real para mis clases de performance testing, teniendo en cuenta todas estas mejoras que hemos encontrado e implementado"

**Proyecto:** API completa para clínica dental con funcionalidades de:
- Registrar Cita con doctores y servicios
- Lista de Doctores y especialidades  
- Lista de Servicios dentales (Limpieza profunda, Brackets, Ortodoncia, Odontología General)
- Calendario y disponibilidad de horarios por doctor

### **🏗️ Decisiones de Arquitectura**

#### **Migración de Modelo v4**
**Usuario:** "recuerda que uso pipeline, si es necesario installa en el pipeline revisalo"
**Solución:** Migración completa a Azure Functions v4 con:
- Node.js Programming Model con ESM (import/export)
- Conexión directa a Cosmos DB sin bindings complejos
- Variables de entorno configurables

#### **Optimización para Performance Testing**
**Usuario:** "pero para una prueba de performance con miles de usuarios soportara?"
**Problema:** Limitación de 1000 RU/s en Cosmos DB no permitía múltiples containers
**Solución:** Arquitectura unificada con un solo container:
```javascript
// Estructura optimizada con campo 'type'
// Doctor: {"type": "doctor", "nombre": "Dr. Juan", ...}  
// Servicio: {"type": "service", "nombre": "Limpieza", ...}
// Cita: {"type": "appointment", "pacienteNombre": "María", ...}
```

#### **Variables de Entorno y Mejores Prácticas**
**Usuario:** "pero tenerlo asi es, tener dato en duro en codigo, ese valor lo tengo en mis variables de entorno, recuerda el proyecto anterior, estamos cayendo en los mismos problemas que ya resolvimos"
**Corrección:** Eliminación de fallbacks hardcodeados:
```javascript
// ❌ Antes: database.container(process.env.COSMOS_CONTAINER || 'citas')
// ✅ Después: database.container(process.env.COSMOS_CONTAINER)
```

### **🌐 Glosario Técnico**
**Usuario:** "ahora yo no hablo ingles, que significa appointments?"
**Explicación establecida:**
- `appointments` = **citas** (citas médicas/dentales)
- `doctors` = **doctores** (médicos especialistas)  
- `services` = **servicios** (servicios dentales)
- `availability` = **disponibilidad** (horarios disponibles)

### **📊 Formato de Fechas**
**Usuario:** "cierto la fecha debe ser en formato DD-MM-AAAA ya que la selecciona el usuario por el calendario"
**Decisión:** Mantener formato americano AAAA-MM-DD por simplicidad inicial:
- **Fecha de cita:** `"fecha": "2025-09-15"` (seleccionada por usuario)
- **Fecha de registro:** `"createdAt": "2025-09-04T14:30:00.000Z"` (automática)

### **💾 Estrategia de Datos**
**Usuario:** "ahora necesitas que exita data en la base de datos osea en los contenedores? la idea que el api lo creo con los endpoint, es asi?"
**Confirmación:** Containers inician vacíos, se poblan via API endpoints:
1. Crear doctores → POST `/api/doctors`
2. Crear servicios → POST `/api/services`  
3. Crear citas → POST `/api/appointments`

### **🔍 Lógica de Disponibilidad**  
**Usuario:** "la disponibilidad no se guarda por lo que veo, porque?"
**Explicación:** Cálculo dinámico en tiempo real:
```
Horarios disponibles = Horario doctor - Citas ocupadas
Ejemplo: ["09:00", "10:00", "11:00"] - ["10:00"] = ["09:00", "11:00"]
```
**Ventaja:** Siempre actualizada, ideal para testing de concurrencia.

## 🧪 **Guía de Testing del API**

### **Paso 1: Crear Doctor**
```bash
curl -X POST https://clinicadentalfunctions.azurewebsites.net/api/doctors \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Dr. Juan Pérez",
    "especialidad": "Ortodonxia",
    "horario": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
  }'
```
**Respuesta esperada:**
```json
{
  "id": "uuid-generado",
  "type": "doctor",
  "nombre": "Dr. Juan Pérez",
  "especialidad": "Ortodonxia",
  "horario": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
  "activo": true,
  "createdAt": "2025-09-04T..."
}
```

### **Paso 2: Crear Servicio**
```bash
curl -X POST https://clinicadentalfunctions.azurewebsites.net/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Limpieza profunda",
    "duracion": 60,
    "precio": 150.00
  }'
```

### **Paso 3: Consultar Datos Creados**
```bash
# Obtener todos los doctores
curl https://clinicadentalfunctions.azurewebsites.net/api/doctors

# Obtener todos los servicios
curl https://clinicadentalfunctions.azurewebsites.net/api/services
```

### **Paso 4: Crear Cita**
```bash
curl -X POST https://clinicadentalfunctions.azurewebsites.net/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteNombre": "María García",
    "doctorId": "uuid-del-doctor-creado",
    "servicioId": "uuid-del-servicio-creado",
    "fecha": "2025-09-15", 
    "hora": "10:00"
  }'
```

### **Paso 5: Verificar Disponibilidad**
```bash
curl "https://clinicadentalfunctions.azurewebsites.net/api/availability?doctorId=uuid-del-doctor&fecha=2025-09-15"
```
**Respuesta esperada:**
```json
{
  "doctorId": "uuid-del-doctor",
  "fecha": "2025-09-15",
  "doctorNombre": "Dr. Juan Pérez",
  "especialidad": "Ortodonxia", 
  "horarioCompleto": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
  "horasOcupadas": ["10:00"],
  "horariosDisponibles": ["09:00", "11:00", "14:00", "15:00", "16:00"]
}
```

## 🚨 **Problemas Resueltos Durante el Desarrollo**

### **Error: Variables de Entorno** 
**Usuario:** "que significa: el SET? en CosmosDBConnection":"SET""
**Explicación:** "SET" significa que la variable existe por seguridad, no se muestra el valor real de la cadena de conexión.

### **Error: Container no Definido**
**Usuario:** "de donde proviene container en el archivo abierto?"  
**Problema:** Faltaba `const container = database.container(process.env.COSMOS_CONTAINER);`
**Solución:** Agregada definición faltante en `availability.js`

### **Error: Limitación de Throughput**
**Usuario:** "veo que no puedo crear contenedores para el doctor, solo cita, dice que 'Your account is currently configured with a total throughput limit of 1000 RU/s'"
**Solución:** Migración a arquitectura de container único optimizada para performance testing.

## ⚡ **Optimizaciones para Performance Testing**

- **Container unificado:** Máximo throughput (1000 RU/s) concentrado
- **Queries con filtros:** Más realistas para testing de carga
- **Cálculo dinámico:** Concurrencia real en disponibilidad
- **Sin fallbacks hardcodeados:** Configuración 100% por variables de entorno
- **Pipeline optimizado:** Sin tests innecesarios, deployment directo
