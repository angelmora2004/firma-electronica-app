# Gestor de Firmas Electrónicas

Este proyecto es un sistema completo de gestión y firma electrónica de documentos PDF, desarrollado como parte de un proyecto de ciberseguridad. Permite a los usuarios gestionar certificados, firmar documentos digitalmente, visualizar y descargar documentos firmados, y almacenar todo de forma cifrada y segura.

## Características principales

- **Autenticación segura con JWT**
- **Gestión de usuarios (CRUD)**
- **Gestión de certificados digitales (.p12) y CA propia**
- **Subida y firma digital de documentos PDF**
- **Estampa visual personalizable (QR + datos del certificado) en el PDF**
- **Selección visual de la posición de la estampa en el frontend**
- **Microservicio PyHanko para firma digital válida**
- **Almacenamiento cifrado de documentos firmados en la base de datos (AES-GCM, clave única por documento, clave maestra en .env)**
- **Descarga y eliminación segura de documentos firmados**
- **Frontend moderno con React y Material-UI**

## Requisitos

- Node.js (v14 o superior)
- Python 3.8+ (para el microservicio PyHanko)
- MySQL
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

3. Crear archivo `.env` en el directorio actual con las siguientes variables:
```
PORT=puerto
DB_HOST=host_de_tu_db
DB_PORT=puerto_de_tu_db
DB_NAME=nombre_de_tu_db
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
JWT_SECRET=tu_secreto_super_seguro
FRONTEND_URL=http://localhost:3000
SIGNED_DOC_MASTER_KEY=clave_maestra_segura_para_docs
PYHANKO_URL=http://127.0.0.1:5001
```

4. Iniciar la base de datos:
```bash
npm run init-db
```

5. Iniciar el servidor:
```bash
npm start
```

### Frontend

1. Navegar al directorio del frontend:
```bash
cd frontend
```

2. Crear archivo `.env` en el directorio actual con las siguientes variables:
```
VITE_API_URL=http://localhost:3001/api
```

3. Instalar dependencias:
```bash
npm install
```

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

### Microservicio PyHanko (firma digital)

1. Navegar a `backend/pyhanko-signservice`:
```bash
cd backend/pyhanko-signservice
```

2. Crear y activar un entorno virtual:
```bash
python -m venv venv
venv\Scripts\activate  # En Windows
source venv/bin/activate  # En Linux/Mac
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Iniciar el microservicio:
```bash
python app.py
```

## Estructura del Proyecto

```
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── uploads/
│   ├── pyhanko-signservice/  # Microservicio de firma digital
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   ├── contexts/
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## Flujo de Firma Digital

1. El usuario sube un PDF y selecciona su certificado digital (.p12).
2. El frontend permite previsualizar y posicionar la estampa visual (QR + datos del certificado) sobre el PDF.
3. El PDF con la estampa se envía al backend, que lo reenvía al microservicio PyHanko para la firma digital legalmente válida.
4. El backend cifra el PDF firmado y lo almacena en la base de datos.
5. El usuario puede ver, descargar o eliminar sus documentos firmados desde la sección "Documentos Firmados".

## Seguridad

- Contraseñas encriptadas con bcrypt
- Tokens JWT para autenticación
- Protección contra CSRF
- Validación y sanitización de datos
- Documentos firmados cifrados con AES-GCM y clave única por documento
- Clave maestra para documentos en `.env` (no subir nunca a GitHub)
- Certificados digitales gestionados de forma segura

## Licencia

Este proyecto está bajo la Licencia MIT. 