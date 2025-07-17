# Rendimiento-K6

Sistema de pruebas de rendimiento usando K6, Grafana e InfluxDB para monitorear y visualizar métricas de carga de aplicaciones web.

## 🚀 Características

- **K6**: Herramienta de pruebas de carga moderna
- **InfluxDB**: Base de datos de series temporales para almacenar métricas
- **Grafana**: Dashboard de visualización de métricas en tiempo real
- **Docker Compose**: Orquestación de servicios

## 📋 Prerrequisitos

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [K6](https://k6.io/docs/get-started/installation/) instalado localmente

## 🛠️ Instalación y Configuración

### 1. Levantar los servicios con Docker Compose

```bash
docker-compose up -d
```

Este comando iniciará:
- **InfluxDB** en el puerto `8086`
- **Grafana** en el puerto `3000`

### 2. Configurar Grafana

1. **Acceder a Grafana:**
   - URL: `http://localhost:3000`
   - Usuario: `admin`
   - Contraseña: `admin123`

2. **Crear conexión a InfluxDB:**
   - Ve a **Configuration** → **Data Sources**
   - Haz clic en **Add data source**
   - Selecciona **InfluxDB**
   - Configura los siguientes valores:
     - **URL**: `http://influxdb:8086`
     - **Database**: `k6`
     - **User**: `admin`
     - **Password**: `admin123`
   - Haz clic en **Save & Test**

### 3. Importar el Dashboard

1. **Importar dashboard:**
   - Ve a **Dashboards** → **Import**
   - Haz clic en **Upload JSON file**
   - Selecciona el archivo `grafana_dashboard.json` de este repositorio
   - Haz clic en **Import**

### 4. Ejecutar pruebas de K6

#### Prueba básica (ejemplo):
```bash
k6 run --vus 100 --duration 1m --out influxdb=http://localhost:8086/k6 index.js
```

#### Otras pruebas disponibles:

**Pruebas de Carga:**
```bash
k6 run --vus 50 --duration 2m --out influxdb=http://localhost:8086/k6 carga/home-test.js
k6 run --vus 75 --duration 3m --out influxdb=http://localhost:8086/k6 carga/instructor_cursos.js
k6 run --vus 100 --duration 2m --out influxdb=http://localhost:8086/k6 carga/RF1.js
```

**Pruebas de Escalabilidad:**
```bash
k6 run --vus 200 --duration 5m --out influxdb=http://localhost:8086/k6 escalabilidad/test1.js
```

**Pruebas de Estabilidad:**
```bash
k6 run --vus 50 --duration 10m --out influxdb=http://localhost:8086/k6 estabilidad/test_stabiliti.js
```

**Pruebas de Estrés:**
```bash
k6 run --vus 500 --duration 5m --out influxdb=http://localhost:8086/k6 estres/test1.js
```

**Pruebas de Volumen:**
```bash
k6 run --vus 100 --duration 3m --out influxdb=http://localhost:8086/k6 volumen/volume-test.js
```

## 📊 Métricas del Dashboard

El dashboard incluye los siguientes paneles:

- **Virtual Users**: Número de usuarios virtuales activos
- **Requests per Second**: Solicitudes por segundo
- **Errors Per Second**: Errores por segundo
- **Checks Per Second**: Verificaciones por segundo
- **Métricas de tiempo de respuesta**:
  - `http_req_duration`: Duración total de la solicitud
  - `http_req_blocked`: Tiempo bloqueado antes de iniciar la solicitud
  - `http_req_connecting`: Tiempo estableciendo conexión TCP
  - `http_req_looking_up`: Tiempo de resolución DNS
  - `http_req_receiving`: Tiempo recibiendo datos
  - `http_req_sending`: Tiempo enviando datos
  - `http_req_waiting`: Tiempo esperando respuesta del servidor

## 📁 Estructura del Proyecto

```
Rendimiento-K6/
├── docker-compose.yml          # Configuración de servicios
├── grafana_dashboard.json      # Dashboard de Grafana
├── index.js                    # Prueba de ejemplo
├── carga/                      # Pruebas de carga
├── escalabilidad/              # Pruebas de escalabilidad
├── estabilidad/                # Pruebas de estabilidad
├── estres/                     # Pruebas de estrés
├── volumen/                    # Pruebas de volumen
├── grafana_data/               # Datos persistentes de Grafana
└── influxdb_data/              # Datos persistentes de InfluxDB
```

## 🔧 Comandos Útiles

### Docker
```bash
# Levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Limpiar volúmenes (elimina datos persistentes)
docker-compose down -v
```

### K6
```bash
# Ejecutar con parámetros personalizados
k6 run --vus <usuarios> --duration <tiempo> --out influxdb=http://localhost:8086/k6 <script.js>

# Ejemplo con más opciones
k6 run --vus 200 --duration 5m --rps 500 --out influxdb=http://localhost:8086/k6 index.js
```

## 🐛 Solución de Problemas

### InfluxDB no conecta
- Verificar que el servicio esté corriendo: `docker-compose ps`
- Revisar logs: `docker-compose logs influxdb`

### Grafana no muestra datos
- Verificar configuración de datasource en Grafana
- Confirmar que K6 esté enviando datos a InfluxDB
- Revisar que la base de datos `k6` exista en InfluxDB

### Puertos ocupados
- Cambiar puertos en `docker-compose.yml` si están en uso
- Verificar puertos disponibles: `netstat -tlnp`

## 📝 Notas

- Los datos se persisten en volúmenes Docker
- El dashboard se actualiza automáticamente durante las pruebas
- Se recomienda esperar unos segundos después de iniciar las pruebas para ver datos en Grafana

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request