import React, { useState } from 'react';
import axios from '../config/axios';
import { Box, TextField, InputAdornment, Typography, Button, Tooltip, Fade, IconButton, MenuItem, Select, FormControl, InputLabel, Alert, Snackbar } from '@mui/material';
import { styled } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/Email';
import PublicIcon from '@mui/icons-material/Public';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import BusinessIcon from '@mui/icons-material/Business';
import ApartmentIcon from '@mui/icons-material/Apartment';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CustomModal from './CustomModal';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const StyledBox = styled(Box)(({ theme }) => ({
  background: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
  width: 540,
  maxWidth: '90vw',
  padding: theme.spacing(3, 3),
  color: theme.palette.text.primary,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: theme.shape.borderRadius,
    '& fieldset': {
      borderColor: 'rgba(255,255,255,0.2)',
    },
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,0.7)',
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },
  '& .MuiInputBase-input': {
    color: theme.palette.text.primary,
    padding: '10px 12px',
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  borderRadius: theme.shape.borderRadius,
  padding: '14px 24px',
  fontSize: '1.1rem',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 4px 20px rgba(0, 212, 170, 0.3)',
  marginTop: theme.spacing(3),
  color: '#111', // Color negro para el texto
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
    boxShadow: '0 6px 25px rgba(0, 212, 170, 0.4)',
    transform: 'translateY(-2px)',
  },
  '&.Mui-disabled': {
    color: '#111', // Asegura que el texto siga siendo negro cuando está deshabilitado
    opacity: 0.5,
  },
  transition: 'all 0.3s ease',
}));

const commonCountries = [
  { code: 'US', name: 'Estados Unidos' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'ES', name: 'España' },
  { code: 'MX', name: 'México' },
  { code: 'CO', name: 'Colombia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'CA', name: 'Canadá' },
];

const fields = [
  {
    name: 'username',
    label: 'Nombre de usuario',
    required: true,
    icon: null,
    type: 'text',
    autoComplete: 'off',
    helper: 'No se permiten tildes. Solo letras, números y espacios.'
  },
  {
    name: 'email',
    label: 'Correo electrónico',
    required: true,
    icon: <EmailIcon fontSize="small" sx={{ color: '#00d4aa' }} />,
    type: 'email',
    autoComplete: 'email',
    helper: 'Debe ser un correo válido.'
  },
  // country será reemplazado por el select
  {
    name: 'state',
    label: 'Provincia/Estado',
    required: false,
    icon: <LocationCityIcon fontSize="small" sx={{ color: '#00d4aa' }} />,
    type: 'text',
    autoComplete: 'address-level1',
    helper: ''
  },
  {
    name: 'locality',
    label: 'Ciudad',
    required: false,
    icon: <LocationCityIcon fontSize="small" sx={{ color: '#00d4aa' }} />,
    type: 'text',
    autoComplete: 'address-level2',
    helper: ''
  }
];

const initialErrors = {
  username: '',
  email: '',
};

const validate = (form) => {
  const errors = {};
  const username = form.username.trim();
  const email = form.email.trim();
  if (!username) {
    errors.username = 'El nombre de usuario es obligatorio.';
  } else if (!/^[A-Za-z0-9 ]+$/.test(username)) {
    errors.username = 'No se permiten tildes ni caracteres especiales.';
  }
  if (!email) {
    errors.email = 'El correo electrónico es obligatorio.';
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = 'Correo electrónico no válido.';
  }
  return errors;
};

const UserCertificate = () => {
  const [form, setForm] = useState({ username: '', email: '', country: '', state: '', locality: '', organization: '', organizationalUnit: '', password: '' });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadLinks, setDownloadLinks] = useState({ key: '', cert: '' });
  const [errors, setErrors] = useState(initialErrors);
  const [touched, setTouched] = useState({});
  const [showInfo, setShowInfo] = useState(false);
  const [p12Password, setP12Password] = useState('');
  const [p12Loading, setP12Loading] = useState(false);
  const [showP12Modal, setShowP12Modal] = useState(false);
  const [showP12Password, setShowP12Password] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setTouched({ ...touched, [name]: true });

    let newErrors = { ...errors, ...validate({ ...form, [name]: value }) };
    // Limpiar error si el valor es válido
    if (name === 'username' && !validate({ ...form, [name]: value }).username) {
      newErrors.username = '';
    }
    if (name === 'email' && !validate({ ...form, [name]: value }).email) {
      newErrors.email = '';
    }
    setErrors(newErrors);
  };

  const handleBlur = e => {
    setTouched({ ...touched, [e.target.name]: true });
    if (e.target.name === 'email') {
      setErrors({ ...errors, ...validate(form) });
    }
  };

  const handleGenerateCSR = async e => {
    e.preventDefault();
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    setShowSnackbar(true); // Mostrar aviso
    setTimeout(async () => {
      setLoading(true);
      setMessage('');
      try {
        const res = await axios.post('/ca/user-csr', form); // Asegura la URL correcta
        setMessage('Clave privada y solicitud generadas. Ahora puedes obtener tu certificado.');
        setStep(2);
        setDownloadLinks({ key: res.data.userKey, cert: '' });
      } catch (err) {
        setMessage(err.response?.data?.message || 'Error generando CSR');
      }
      setLoading(false);
    }, 1200); // Espera 1.2s para mostrar el aviso antes de enviar
  };

  const handleSignCert = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post('/ca/sign-user', { username: form.username, email: form.email });
      setMessage('¡Certificado emitido!');
      setStep(3);
      setDownloadLinks(links => ({ ...links, cert: res.data.userCert }));
      setShowP12Modal(true); // Abrir modal automáticamente
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error firmando certificado');
    }
    setLoading(false);
  };

  const handleExportP12 = async () => {
    console.log('Intentando exportar .p12...');
    if (!p12Password || p12Password.length < 4) {
      setMessage('La contraseña del archivo .p12 debe tener al menos 4 caracteres.');
      return;
    }
    setP12Loading(true);
    setMessage('');
    try {
      const res = await axios.post('/ca/export-p12', {
        username: form.username,
        password: p12Password
      }, { responseType: 'blob' });

      // Detectar si el blob es un error JSON
      if (res.data.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const error = JSON.parse(reader.result);
            setMessage(error.message || 'No se pudo descargar el archivo .p12');
          } catch {
            setMessage('No se pudo descargar el archivo .p12');
          }
        };
        reader.readAsText(res.data);
        setP12Loading(false);
        return;
      }

      // Descargar el archivo .p12
      const blob = new Blob([res.data], { type: 'application/x-pkcs12' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${form.username || 'certificado'}.p12`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadLinks(links => ({ ...links, p12: 'descargado' }));
      setMessage('¡Archivo .p12 generado y descargado correctamente!');
    } catch (err) {
      setMessage('No se pudo descargar el archivo .p12');
    }
    setP12Loading(false);
  };

  const downloadFile = async (fileUrl, filename) => {
    if (!fileUrl || typeof fileUrl !== 'string') {
      setMessage('Ruta de archivo no válida.');
      return;
    }
    try {
      const url = fileUrl.startsWith('uploads') ? `/${fileUrl}` : fileUrl;
      const response = await axios.get(url, { responseType: 'blob' });
      // Verifica si el blob es realmente un archivo, no un error JSON
      if (response.data.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const error = JSON.parse(reader.result);
            setMessage(error.message || 'No se pudo descargar el archivo.');
          } catch {
            setMessage('No se pudo descargar el archivo.');
          }
        };
        reader.readAsText(response.data);
        return;
      }
      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setMessage('No se pudo descargar el archivo.');
    }
  };

  return (
    <StyledBox>
      <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, flex: 1, textAlign: 'center', fontSize: '1.25rem' }}>
          Solicitar Certificado Digital
        </Typography>
        <Tooltip
          title={<>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>¿Para qué sirve?</Typography>
            <ul style={{ margin: '6px 0 0 18px', paddingLeft: 0, color: '#b0b0b0', fontSize: '0.97rem' }}>
              <li>Tu <b>clave privada</b> es personal y solo tú debes guardarla.</li>
              <li>El <b>certificado digital</b> estará firmado por nuestra Autoridad Certificadora (CA).</li>
              <li>Guarda ambos archivos en un lugar seguro.</li>
            </ul>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 500 }}>
              Los archivos se descargarán automáticamente.
            </Typography>
          </>}
          placement="left"
          arrow
          TransitionComponent={Fade}
          open={showInfo}
          onOpen={() => setShowInfo(true)}
          onClose={() => setShowInfo(false)}
        >
          <IconButton size="small" sx={{ ml: 1, color: 'primary.main' }} onClick={() => setShowInfo(!showInfo)}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <form onSubmit={handleGenerateCSR} autoComplete="off">
        {/* Campo de username */}
        <StyledTextField
          name="username"
          label="Nombre de usuario *"
          value={form.username}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          fullWidth
          size="small"
          variant="outlined"
          type="text"
          autoComplete="off"
          margin="dense"
          InputProps={{
            startAdornment: null,
          }}
          InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: '1rem' } }}
          error={Boolean(errors.username) && touched.username}
          helperText={touched.username && errors.username ? errors.username : 'No se permiten tildes. Solo letras, números y espacios.'}
          disabled={step > 1}
        />
        {/* Campo de email */}
        <StyledTextField
          name="email"
          label="Correo electrónico *"
          value={form.email}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          fullWidth
          size="small"
          variant="outlined"
          type="email"
          autoComplete="email"
          margin="dense"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon fontSize="small" sx={{ color: '#00d4aa' }} />
              </InputAdornment>
            ),
          }}
          InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: '1rem' } }}
          error={Boolean(errors.email) && touched.email}
          helperText={touched.email && errors.email ? errors.email : 'Debe ser un correo válido.'}
          disabled={step > 1}
        />
        {/* Select de país */}
        <FormControl fullWidth size="small" sx={{ mb: 3 }} disabled={step > 1}>
          <InputLabel id="country-label" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: '1rem' }}>País (opcional)</InputLabel>
          <Select
            labelId="country-label"
            id="country"
            name="country"
            value={form.country}
            label="País (opcional)"
            onChange={handleChange}
            sx={{ background: 'rgba(255,255,255,0.05)', borderRadius: 2, color: 'text.primary' }}
            MenuProps={{ PaperProps: { sx: { bgcolor: 'background.paper' } } }}
          >
            <MenuItem value=""><em>Sin seleccionar</em></MenuItem>
            {commonCountries.map((c) => (
              <MenuItem key={c.code} value={c.code}>{c.name} ({c.code})</MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Campo de contraseña para el .p12 */}
        <StyledTextField
          name="password"
          label="Contraseña para el archivo .p12 *"
          value={form.password || ''}
          onChange={handleChange}
          required
          fullWidth
          size="small"
          variant="outlined"
          type={showP12Password ? 'text' : 'password'}
          autoComplete="new-password"
          margin="dense"
          InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: '1rem' } }}
          helperText="La contraseña protegerá tu archivo .p12."
          disabled={step > 1}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle p12 password visibility"
                  onClick={() => setShowP12Password(!showP12Password)}
                  edge="end"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  {showP12Password ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {/* Resto de campos */}
        {fields.filter(f => f.name !== 'email' && f.name !== 'username').map(field => (
          <StyledTextField
            key={field.name}
            name={field.name}
            label={field.label + (field.required ? ' *' : ' (opcional)')}
            value={form[field.name]}
            onChange={handleChange}
            onBlur={handleBlur}
            required={field.required}
            fullWidth
            size="small"
            variant="outlined"
            type={field.type}
            autoComplete={field.autoComplete}
            margin="dense"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {field.icon}
                </InputAdornment>
              ),
            }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: '1rem' } }}
            error={Boolean(errors[field.name]) && touched[field.name]}
            helperText={touched[field.name] && errors[field.name] ? errors[field.name] : (field.helper || ' ')}
            disabled={step > 1}
            sx={{ mb: 1.2 }}
          />
        ))}
        {step === 1 && (
          <StyledButton
            type="submit"
            fullWidth
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? 'Solicitando...' : 'Solicitar Certificado Digital'}
          </StyledButton>
        )}
        <Snackbar open={showSnackbar} autoHideDuration={5000} onClose={() => setShowSnackbar(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity="info" sx={{ width: '100%' }}>
            Tu solicitud será procesada por un administrador. Recibirás una notificación cuando sea aprobada o rechazada.
          </Alert>
        </Snackbar>
      </form>
      {step === 2 && (
        // Eliminado: botón 'Obtener mi certificado'
        null
      )}
      {message && step === 3 && (
        <div style={{ color: '#fff', margin: '24px 0 0 0', textAlign: 'center', fontWeight: 600, fontSize: '1.15rem' }}>
          {message}
        </div>
      )}
      {showP12Modal && (
        <CustomModal open={showP12Modal} onClose={() => setShowP12Modal(false)}>
          <Box sx={{ 
            background: '#181a1b',
            color: '#fff',
            borderRadius: 1,
            p: 5,
            textAlign: 'center',
            minWidth: 420,
            maxWidth: '98vw',
            boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#00d4aa', fontWeight: 700, fontSize: '2rem' }}>
              Exportar certificado a formato .p12
            </Typography>
            <Typography variant="body2" sx={{ color: '#b0f5e0', mb: 2, fontSize: '1.15rem' }}>
              Ingresa una contraseña para proteger tu archivo .p12:
            </Typography>
            <TextField
              type="password"
              label="Contraseña para el archivo .p12"
              value={p12Password}
              onChange={e => setP12Password(e.target.value)}
              size="small"
              variant="outlined"
              sx={{ width: 300, mb: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2, input: { color: '#fff', textAlign: 'center' } }}
              InputLabelProps={{ style: { color: '#b0f5e0', fontWeight: 500, fontSize: '1rem' } }}
              InputProps={{ style: { color: '#fff' } }}
            />
            <StyledButton
              onClick={async () => {
                await handleExportP12();
                if (message && message.includes('descargado')) {
                  setTimeout(() => setShowP12Modal(false), 1200);
                }
              }}
              disabled={p12Loading || !p12Password}
              sx={{ minWidth: 280, background: `linear-gradient(135deg, #00d4aa 0%, #33ddbb 100%)`, color: '#111', fontSize: '1.25rem', fontWeight: 700, mt: 1, mb: 1, alignSelf: 'center' }}
            >
              {p12Loading ? 'Generando .p12...' : 'Exportar y descargar .p12'}
            </StyledButton>
            {message && (
              <div style={{ color: message.includes('descargado') ? '#00d4aa' : '#fff', marginTop: 16, textAlign: 'center', fontWeight: 500 }}>
                {message}
              </div>
            )}
          </Box>
        </CustomModal>
      )}
    </StyledBox>
  );
};

export default UserCertificate; 