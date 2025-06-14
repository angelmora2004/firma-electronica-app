# Gestor de Firmas Electrónicas

Este proyecto es un sistema de gestión de firmas electrónicas desarrollado como parte de un proyecto de ciberseguridad. El sistema por el momento incluye autenticación segura y gestión de usuarios.

## Características

- Autenticación segura con JWT
- Gestión de usuarios (CRUD)
- Interfaz moderna con Material-UI
- Base de datos MySQL con Sequelize

## Requisitos

- Node.js (v14 o superior)
- MySQL (puerto 3307 - cambiar al puerto que el usuario use en el .env)
- npm o yarn

## Configuración

### Backend

1. Navegar al directorio del backend:
```bash
cd backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Crear archivo .env en el directorio actual con las siguientes variables:
```
PORT=puerto
DB_HOST=host_de_tu_db
DB_PORT=puerto_de_tu_db
DB_NAME=nombre_de_tu_db
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
JWT_SECRET=tu_secreto_super_seguro
FRONTEND_URL=http://tu_puerto
```

4. Iniciar la base de datos:
```bash
npm run init-db
```

4. Iniciar el servidor:
```bash
npm start
```

### Frontend

1. Navegar al directorio del frontend:
```bash
cd frontend
```

2. Crear archivo .env en el directorio actual con las siguientes variables:
```
VITE_API_URL=http://tu_puerto/api
VITE_PORT=5173
```

3. Instalar dependencias:
```bash
npm install
```

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

## Estructura del Proyecto

```
├── backend/
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── config/
    │   ├── contexts/
    │   └── App.jsx
    └── package.json
```

## Seguridad

- Contraseñas encriptadas con bcrypt
- Tokens JWT para autenticación
- Protección contra CSRF
- Validación de datos
- Sanitización de entradas

## Licencia

Este proyecto está bajo la Licencia MIT. 
