# Sistema Web de Vinculación con el Medio (VCM)

Plataforma web para gestionar las iniciativas de Vinculación con el Medio de la Universidad Católica del Maule: desde que un solicitante presenta una necesidad, hasta que un docente ejecuta y cierra el proyecto, con trazabilidad completa, control de acceso por rol e indicadores para la toma de decisiones.

> Proyecto original desarrollado por Vicente Miño como memoria de título. Esta versión incluye las mejoras y la mantención realizadas posteriormente como parte de una segunda memoria de título.

| | |
|---|---|
| **Aplicación web** | https://plataforma-vinculacion-ucm.vercel.app |
| **API REST** | https://plataforma-vinculacion-ucm-production.up.railway.app/api |
| **Documentación de la API (Swagger)** | https://plataforma-vinculacion-ucm-production.up.railway.app/api/docs |

---

## Contenido

1. [Qué hace el sistema](#qué-hace-el-sistema)
2. [Flujo de una iniciativa](#flujo-de-una-iniciativa)
3. [Roles y permisos](#roles-y-permisos)
4. [Tecnologías](#tecnologías)
5. [Estructura del repositorio](#estructura-del-repositorio)
6. [Instalación y ejecución local](#instalación-y-ejecución-local)
7. [Variables de entorno](#variables-de-entorno)
8. [Datos de prueba](#datos-de-prueba)
9. [Despliegue](#despliegue)
10. [Scripts útiles](#scripts-útiles)
11. [Retención de datos](#retención-de-datos)
12. [Seguridad y buenas prácticas](#seguridad-y-buenas-prácticas)

---

## Qué hace el sistema

- **Solicitudes** de la comunidad (juntas de vecinos, ONG, establecimientos educacionales, empresas, organismos públicos, personas naturales) o **iniciativas propias de docentes**, ambas sujetas a evaluación.
- **Planteamientos** de proyecto elaborados por docentes (tipo de intervención, duración, horas-hombre) y aprobados por el Encargado de Carrera.
- **Proyectos** con estados (en proceso, pausado, finalizado, cancelado), participantes, alumnos voluntarios, observaciones y archivos.
- **Seguimiento** de cada iniciativa: una línea de tiempo con cada hito, quién lo realizó y cuándo.
- **Dashboard y reportes** con indicadores, filtros y comparación por facultad, desde la vista más amplia hasta la más específica (facultad → carrera).
- **Notificaciones por correo** automáticas en cada cambio de estado.
- **Control de edición concurrente:** el evaluador ve un aviso cuando el solicitante está editando una solicitud.
- **Depuración automática** de iniciativas con más de 5 años desde su cierre (ciclo de acreditación), con aviso previo.
- **Gestión de datos maestros:** usuarios, facultades, carreras y alumnos voluntarios.

## Flujo de una iniciativa

```
Solicitante / Docente        Gestor VCM              Docente              Encargado de Carrera       Docente
 crea la solicitud   ──►  aprueba o rechaza  ──►  hace el planteamiento ──►  aprueba o rechaza   ──►  crea y ejecuta
                           (con motivo)                                       (con motivo)            el proyecto
```

Cada paso queda registrado en el historial de seguimiento. Los rechazos pueden corregirse y reenviarse.

## Roles y permisos

| Rol | Alcance |
|---|---|
| **Administrador** | Acceso total: usuarios, facultades, carreras y toda la operación. |
| **Gestor de VCM** | Evalúa solicitudes (aprueba o rechaza con motivo) y consulta la operación. |
| **Encargado de Carrera** | Aprueba o rechaza planteamientos de su carrera; administra los alumnos voluntarios de su carrera. |
| **Docente** | Ve las solicitudes de su carrera, elabora sus planteamientos y proyectos, y puede presentar iniciativas propias. |
| **Decano** | Consulta de la información de **su facultad**, incluidas las carreras que la componen. |
| **Director de VCM** | Consulta de solo lectura de **todas las facultades**, con dashboard comparativo y desglose facultad → carrera. |
| **Cliente (Solicitante)** | Crea y sigue sus propias solicitudes. |

El acceso se aplica tanto en la interfaz como en la API (guards de rol y filtrado por alcance en los servicios).

## Tecnologías

| Capa | Stack |
|---|---|
| **Frontend** | Angular 21 (componentes standalone, formularios reactivos), PrimeNG 21, TypeScript |
| **Backend** | NestJS 11, TypeScript, class-validator, Passport + JWT, Swagger (OpenAPI) |
| **Base de datos** | MySQL con Prisma ORM 6 |
| **Archivos** | Cloudinary |
| **Correo** | Resend |
| **Despliegue** | Vercel (frontend) y Railway (backend y base de datos) |

## Estructura del repositorio

```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Modelo de datos
│   │   ├── migrations/            # Historial de migraciones (se versionan)
│   │   ├── seed-masivo.js         # Reset + datos de demostración masivos
│   │   ├── seed-demo.js           # Datos de demostración ligeros
│   │   └── borrar-demo.js         # Elimina los datos de seed-demo.js
│   └── src/
│       ├── auth/                  # Autenticación y JWT
│       ├── users/                 # Usuarios
│       ├── facultades/  carreras/ # Datos maestros
│       ├── alumnos-voluntarios/
│       ├── solicitudes/  planteamientos/  proyectos/
│       ├── reportes/              # Dashboard e informes
│       ├── retencion/             # Depuración automática a los 5 años
│       ├── mail/  storage/        # Resend y Cloudinary
│       └── common/                # Utilidades, constantes y alcance por rol
└── frontend/
    └── src/app/
        ├── core/                  # Modelos, servicios, guards, interceptores
        ├── layout/                # Navegación
        └── features/              # Una carpeta por módulo funcional
```

## Instalación y ejecución local

### Requisitos

- Node.js 20 o superior y npm
- MySQL 8 en ejecución
- Cuentas de [Cloudinary](https://cloudinary.com) y [Resend](https://resend.com) para archivos y correos (el resto del sistema funciona sin ellas)

### 1. Clonar e instalar

```bash
git clone <url-del-repositorio>
cd <carpeta-del-proyecto>

cd backend  && npm install
cd ../frontend && npm install
```

### 2. Configurar el backend

Crea `backend/.env` (ver [Variables de entorno](#variables-de-entorno)) y prepara la base de datos:

```bash
cd backend
npx prisma migrate deploy      # crea las tablas a partir de las migraciones existentes
npx prisma generate            # genera el cliente de Prisma
```

> Si estás desarrollando cambios en el modelo de datos, usa `npx prisma migrate dev --name <descripcion>`, que además crea la migración nueva.

### 3. Levantar los servicios

```bash
# Terminal 1: API  (http://localhost:3000/api · Swagger en /api/docs)
cd backend
npm run start:dev

# Terminal 2: aplicación web  (http://localhost:4200)
cd frontend
npm start
```

Verifica que el frontend apunte a la API local (`http://localhost:3000/api`) en su archivo de entorno.

### 4. Primer acceso

Crea un usuario administrador (con el seed de demostración, o directamente en la base de datos) e ingresa desde `http://localhost:4200`. El registro público siempre crea usuarios con rol **Cliente**; los demás roles los asigna un administrador.

## Variables de entorno

Archivo `backend/.env` (no se versiona):

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexión a MySQL. Si la contraseña tiene caracteres especiales, codifícalos (`@` → `%40`). | `mysql://usuario:clave@localhost:3306/plataforma_vinculacion` |
| `JWT_SECRET` | Secreto para firmar los tokens. Usa un valor largo y aleatorio. | *(cadena aleatoria)* |
| `JWT_EXPIRATION` | Duración de la sesión. | `7d` |
| `CLOUDINARY_CLOUD_NAME` | Cuenta de Cloudinary. | |
| `CLOUDINARY_API_KEY` | | |
| `CLOUDINARY_API_SECRET` | | |
| `RESEND_API_KEY` | Clave de Resend. | `re_...` |
| `RESEND_FROM_EMAIL` | Remitente verificado en Resend. | `noreply@tu-dominio.cl` |
| `PORT` | Puerto de la API. | `3000` |
| `NODE_ENV` | Entorno. | `development` |

> Con el remitente de pruebas de Resend (`onboarding@resend.dev`) los correos solo se entregan a la dirección de la cuenta de Resend. Para enviar a otros usuarios es necesario verificar un dominio propio.

## Datos de prueba

Para demostrar el sistema, `backend/prisma/seed-masivo.js` **borra toda la base** y la reemplaza por datos realistas:

- 7 facultades con 53 carreras, un decano por facultad y un director de VCM
- Gestores, un encargado por carrera, docentes y clientes
- 150 alumnos voluntarios
- 600 solicitudes repartidas en planteamientos y proyectos, en todos los estados, con historial de seguimiento y fechas distribuidas en ~4,5 años

```bash
cd backend
node prisma/seed-masivo.js --confirmar
```

- Sin `--confirmar` no se borra nada.
- Se conservan las cuentas con rol Administrador; si no existe ninguna, se crea `admin@demo.vcm.test`.
- Los usuarios creados usan la contraseña `Demo1234`. Los correos tienen la forma `<rol><n>@demo.vcm.test`; al terminar, el script imprime un ejemplo por rol.

> **Nunca ejecutes este script contra una base de datos de producción.**

## Despliegue

- **Frontend (Vercel):** se construye con `npm run build` dentro de `frontend/`.
- **Backend (Railway):** `npm run build` y `npm run start:prod`. Antes de iniciar una versión que cambie el modelo de datos, ejecutar `npx prisma migrate deploy` contra la base de producción.
- Las variables de entorno se configuran en el panel de cada plataforma, nunca en el repositorio.

## Scripts útiles

**Backend** (`backend/`)

| Comando | Acción |
|---|---|
| `npm run start:dev` | API en modo desarrollo con recarga |
| `npm run build` | Compila a `dist/` |
| `npm run start:prod` | Ejecuta la versión compilada |
| `npm test` / `npm run test:e2e` | Pruebas unitarias / de extremo a extremo |
| `npx prisma migrate deploy` | Aplica las migraciones existentes |
| `npx prisma migrate dev --name <nombre>` | Crea y aplica una migración nueva (desarrollo) |
| `npx prisma studio` | Explorador visual de la base de datos |

**Frontend** (`frontend/`)

| Comando | Acción |
|---|---|
| `npm start` | Servidor de desarrollo en `http://localhost:4200` |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas unitarias |

## Retención de datos

Para acompañar el ciclo de acreditación (cada 5 años), el sistema depura automáticamente las iniciativas antiguas:

- Se cuenta desde el **cierre** de la iniciativa y se elimina **toda la cadena** (solicitud, planteamiento, proyecto, observaciones y archivos).
- **30 días antes** se envía un aviso por correo a los administradores.
- Cada borrado queda documentado en la tabla `RegistroDepuracion` (qué se eliminó y cuándo).

## Seguridad y buenas prácticas

- El archivo `.env` está excluido del control de versiones; nunca subas credenciales al repositorio.
- Autenticación con JWT, contraseñas con hash (bcrypt), validación de datos de entrada en todos los endpoints y control de acceso por rol más filtrado por alcance (facultad o carrera).
- El registro público no permite elegir rol.
- Ante cualquier sospecha de filtración de credenciales, rota las claves de Resend, Cloudinary y el secreto JWT.

---

Universidad Católica del Maule · Facultad de Ciencias de la Ingeniería
