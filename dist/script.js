/* ================================================================
   PORTAFOLIO DIGITAL — script.js
   Base de datos: Supabase (PostgreSQL en la nube)
   Todos los datos que guardas aquí los ve cualquier persona
   que abra el portafolio, porque viven en el servidor.
   ================================================================ */


/* ── 1. CONEXIÓN A SUPABASE ──────────────────────────────────────
   Estas dos líneas conectan la página con tu base de datos.
   La URL y la KEY son las de tu proyecto en supabase.com */

const SUPABASE_URL = 'https://rufuligjvtareuqigzti.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZnVsaWdqdnRhcmV1cWlnenRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDY2NjYsImV4cCI6MjA5MjEyMjY2Nn0.b7qkuT-0WeMEnhtaJJ2s8In6O5Rkau0HjR9f-B-pARo';

/* Creamos el cliente de Supabase usando su librería CDN.
   Esto nos da el objeto "db" que usamos para leer y escribir datos. */
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ID fijo del portafolio. Como es un solo portafolio (el tuyo),
   usamos siempre el mismo ID en todas las tablas. */
const PORTFOLIO_ID = 1;


/* ── 2. ESTADO LOCAL (copia en memoria mientras la página está abierta) ──
   Guardamos los datos aquí para no hacer llamadas al servidor
   cada vez que la página necesita mostrar algo.
   Al abrir la página se llena desde Supabase. */
const STATE = {
  config: {
    nombre: '', matricula: '', asignatura: '',
    fecha: '', presentacion: '', objetivo: ''
  },
  fotoPerfil:    null,
  actividades:   [],
  proyectos:     [],
  reflexiones:   [],
  comentarios:   [],
  reflexionesFinales: { aprendizajes:'', fortalezas:'', mejorar:'', objetivos:'' },
  autoevaluacion: { enviada:false, valores:{} },
  rubrica: [
    { key:'contenido',    nombre:'Contenido',             pct:40, descripcion:'Completitud de las tareas, calidad de las respuestas y profundidad de las reflexiones.' },
    { key:'organizacion', nombre:'Organización',          pct:20, descripcion:'Estructura clara del portafolio, uso adecuado de carpetas y facilidad de navegación.' },
    { key:'reflexion',    nombre:'Reflexión',             pct:20, descripcion:'Evidencia de reflexión sobre el aprendizaje, identificación de fortalezas y debilidades.' },
    { key:'herramientas', nombre:'Herramientas Digitales',pct:20, descripcion:'Dominio de la herramienta seleccionada, presentación clara y profesional.' }
  ]
};


/* ── 3. INDICADOR DE CARGA (SPINNER) ─────────────────────────────
   Aparece mientras la página pide datos al servidor.
   Así el usuario sabe que está cargando y no ve la página vacía. */

/* Crea el spinner y lo agrega al body */
function crearSpinner() {
  const s = document.createElement('div');
  s.id = 'dbSpinner';
  s.innerHTML = `
    <div class="spinner-inner">
      <div class="spinner-ring"></div>
      <p>Cargando portafolio...</p>
    </div>`;
  document.body.appendChild(s);
}

/* Muestra el spinner */
function mostrarSpinner() {
  const s = document.getElementById('dbSpinner');
  if (s) s.style.display = 'flex';
}

/* Oculta el spinner */
function ocultarSpinner() {
  const s = document.getElementById('dbSpinner');
  if (s) s.style.display = 'none';
}


/* ── 4. FUNCIONES PARA GUARDAR EN SUPABASE ───────────────────────
   Cada función guarda un tipo de dato diferente en la base de datos.
   Usamos "upsert" que significa: si ya existe, actualiza; si no, crea. */

/* Guarda la configuración general del portafolio (nombre, matrícula, etc.)
   También captura los textos editables de la pantalla antes de guardar. */
async function saveConfig() {
  /* Capturamos los textos que el usuario escribe directamente en la página */
  STATE.config.presentacion = document.getElementById('presentacionTexto').innerText;
  STATE.config.objetivo     = document.getElementById('objetivoTexto').innerText;
  STATE.reflexionesFinales.aprendizajes = document.getElementById('refAprendizajes').innerText;
  STATE.reflexionesFinales.fortalezas   = document.getElementById('refFortalezas').innerText;
  STATE.reflexionesFinales.mejorar      = document.getElementById('refMejorar').innerText;
  STATE.reflexionesFinales.objetivos    = document.getElementById('refObjetivos').innerText;

  /* Enviamos todo a la tabla "config" de Supabase */
  const { error } = await db.from('config').upsert({
    id:            PORTFOLIO_ID,
    nombre:        STATE.config.nombre,
    matricula:     STATE.config.matricula,
    asignatura:    STATE.config.asignatura,
    fecha_inicio:  STATE.config.fecha || null,
    presentacion:  STATE.config.presentacion,
    objetivo:      STATE.config.objetivo,
    foto_perfil:   STATE.fotoPerfil,
    ref_aprendizajes: STATE.reflexionesFinales.aprendizajes,
    ref_fortalezas:   STATE.reflexionesFinales.fortalezas,
    ref_mejorar:      STATE.reflexionesFinales.mejorar,
    ref_objetivos:    STATE.reflexionesFinales.objetivos,
    auto_enviada:     STATE.autoevaluacion.enviada,
    auto_valores:     STATE.autoevaluacion.valores,   /* Se guarda como JSON */
    rubrica:          STATE.rubrica                   /* Se guarda como JSON */
  });

  if (error) {
    console.error('Error guardando config:', error.message);
    showToast('Error al guardar. Verifica tu conexión.', 'error');
  }
}

/* Guarda una actividad nueva en la tabla "actividades" */
async function saveActividad(act) {
  const { error } = await db.from('actividades').insert({
    id:           act.id,
    nombre:       act.nombre,
    tipo:         act.tipo,
    descripcion:  act.descripcion,
    fecha_entrega: act.fecha || null,
    calificacion:  act.calificacion !== '' ? parseFloat(act.calificacion) : null,
    reflexion:     act.reflexion,
    enlace:        act.enlace,
    creado_en:     act.creadoEn
  });
  if (error) { console.error('Error guardando actividad:', error.message); showToast('Error al guardar actividad.', 'error'); }
}

/* Elimina una actividad de la base de datos por su ID */
async function deleteActividad(id) {
  const { error } = await db.from('actividades').delete().eq('id', id);
  if (error) { console.error('Error eliminando actividad:', error.message); showToast('Error al eliminar.', 'error'); }
}

/* Guarda un proyecto nuevo en la tabla "proyectos" */
async function saveProyecto(p) {
  const { error } = await db.from('proyectos').insert({
    id:           p.id,
    nombre:       p.nombre,
    descripcion:  p.descripcion,
    fases:        p.fases,
    resultados:   p.resultados,
    reflexion:    p.reflexion,
    calificacion: p.calificacion !== '' ? parseFloat(p.calificacion) : null,
    creado_en:    p.creadoEn
  });
  if (error) { console.error('Error guardando proyecto:', error.message); showToast('Error al guardar proyecto.', 'error'); }
}

/* Elimina un proyecto de la base de datos */
async function deleteProyecto(id) {
  const { error } = await db.from('proyectos').delete().eq('id', id);
  if (error) { console.error('Error eliminando proyecto:', error.message); showToast('Error al eliminar.', 'error'); }
}

/* Guarda una reflexión nueva en la tabla "reflexiones" */
async function saveReflexion(r) {
  const { error } = await db.from('reflexiones').insert({
    id:        r.id,
    titulo:    r.titulo,
    contenido: r.contenido,
    emoji:     r.emoji,
    creado_en: r.creadoEn
  });
  if (error) { console.error('Error guardando reflexión:', error.message); showToast('Error al guardar reflexión.', 'error'); }
}

/* Elimina una reflexión de la base de datos */
async function deleteReflexion(id) {
  const { error } = await db.from('reflexiones').delete().eq('id', id);
  if (error) { console.error('Error eliminando reflexión:', error.message); showToast('Error al eliminar.', 'error'); }
}

/* Guarda un comentario nuevo en la tabla "comentarios" */
async function saveComentario(c) {
  const { error } = await db.from('comentarios').insert({
    id:        c.id,
    texto:     c.texto,
    creado_en: c.creadoEn
  });
  if (error) { console.error('Error guardando comentario:', error.message); showToast('Error al guardar comentario.', 'error'); }
}


/* ── 5. CARGAR TODOS LOS DATOS DESDE SUPABASE ────────────────────
   Cuando la página se abre, pedimos todos los datos al servidor
   y los guardamos en STATE para usarlos en la interfaz. */
async function loadAllFromSupabase() {
  mostrarSpinner();

  try {
    /* Cargamos las 5 tablas al mismo tiempo para ser más rápidos */
    const [
      { data: configData },
      { data: actividadesData },
      { data: proyectosData },
      { data: reflexionesData },
      { data: comentariosData }
    ] = await Promise.all([
      db.from('config').select('*').eq('id', PORTFOLIO_ID).single(),
      db.from('actividades').select('*').order('creado_en', { ascending: true }),
      db.from('proyectos').select('*').order('creado_en', { ascending: true }),
      db.from('reflexiones').select('*').order('creado_en', { ascending: false }),
      db.from('comentarios').select('*').order('creado_en', { ascending: true })
    ]);

    /* Si hay configuración guardada, la aplicamos al STATE */
    if (configData) {
      STATE.config.nombre        = configData.nombre        || '';
      STATE.config.matricula     = configData.matricula     || '';
      STATE.config.asignatura    = configData.asignatura    || '';
      STATE.config.fecha         = configData.fecha_inicio  || '';
      STATE.config.presentacion  = configData.presentacion  || '';
      STATE.config.objetivo      = configData.objetivo      || '';
      STATE.fotoPerfil           = configData.foto_perfil   || null;
      STATE.reflexionesFinales.aprendizajes = configData.ref_aprendizajes || '';
      STATE.reflexionesFinales.fortalezas   = configData.ref_fortalezas   || '';
      STATE.reflexionesFinales.mejorar      = configData.ref_mejorar      || '';
      STATE.reflexionesFinales.objetivos    = configData.ref_objetivos    || '';
      STATE.autoevaluacion.enviada = configData.auto_enviada || false;
      STATE.autoevaluacion.valores = configData.auto_valores || {};
      /* Si hay rúbrica guardada, la usamos; si no, usamos la por defecto */
      if (configData.rubrica && configData.rubrica.length) {
        STATE.rubrica = configData.rubrica;
      }
    }

    /* Convertimos las filas de la base de datos al formato que usa STATE */
    if (actividadesData) {
      STATE.actividades = actividadesData.map(a => ({
        id:           a.id,
        nombre:       a.nombre,
        tipo:         a.tipo,
        descripcion:  a.descripcion || '',
        fecha:        a.fecha_entrega || '',
        calificacion: a.calificacion !== null ? String(a.calificacion) : '',
        reflexion:    a.reflexion || '',
        enlace:       a.enlace || '',
        creadoEn:     a.creado_en
      }));
    }

    if (proyectosData) {
      STATE.proyectos = proyectosData.map(p => ({
        id:           p.id,
        nombre:       p.nombre,
        descripcion:  p.descripcion || '',
        fases:        p.fases || '',
        resultados:   p.resultados || '',
        reflexion:    p.reflexion || '',
        calificacion: p.calificacion !== null ? String(p.calificacion) : '',
        creadoEn:     p.creado_en
      }));
    }

    if (reflexionesData) {
      STATE.reflexiones = reflexionesData.map(r => ({
        id:        r.id,
        titulo:    r.titulo || 'Reflexión',
        contenido: r.contenido || '',
        emoji:     r.emoji || '💭',
        creadoEn:  r.creado_en
      }));
    }

    if (comentariosData) {
      STATE.comentarios = comentariosData.map(c => ({
        id:        c.id,
        texto:     c.texto,
        creadoEn:  c.creado_en
      }));
    }

  } catch (err) {
    console.error('Error cargando datos desde Supabase:', err);
    showToast('No se pudo conectar con la base de datos.', 'error');
  }

  ocultarSpinner();
}


/* ── 6. PANTALLA DE CARGA (SPLASH) ───────────────────────────────
   Se oculta cuando los datos ya están listos */
function hideSplash() {
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
  }, 1800);
}


/* ── 7. CURSOR PERSONALIZADO (solo en computadora) ───────────────*/
let mouseX = 0, mouseY = 0, curX = 0, curY = 0;
const cursor    = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');

document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top  = mouseY + 'px';
});

function animateCursor() {
  curX += (mouseX - curX) * 0.12;
  curY += (mouseY - curY) * 0.12;
  cursor.style.left = curX + 'px';
  cursor.style.top  = curY + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();


/* ── 8. NAVEGACIÓN LATERAL ───────────────────────────────────────*/
const navLinks    = document.querySelectorAll('.nav-link');
const progressBar = document.getElementById('progressBar');
const sidenav     = document.getElementById('sidenav');
const hamburger   = document.getElementById('hamburger');
const backToTop   = document.getElementById('backToTop');
const navBackdrop = document.getElementById('navBackdrop');

function openNav() {
  sidenav.classList.add('open');
  navBackdrop.classList.add('show');
  hamburger.innerHTML = '<i class="ph-bold ph-x"></i>';
}
function closeNav() {
  sidenav.classList.remove('open');
  navBackdrop.classList.remove('show');
  hamburger.innerHTML = '<i class="ph-bold ph-list"></i>';
}

hamburger.addEventListener('click', () => sidenav.classList.contains('open') ? closeNav() : openNav());
navBackdrop.addEventListener('click', closeNav);
navLinks.forEach(link => link.addEventListener('click', closeNav));
backToTop.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

function onScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  progressBar.style.height = docHeight > 0 ? (scrollTop / docHeight * 100) + '%' : '0%';
  backToTop.classList.toggle('show', scrollTop > 300);
  document.querySelectorAll('main .section').forEach(sec => {
    const rect = sec.getBoundingClientRect();
    if (rect.top <= 120 && rect.bottom >= 120) {
      navLinks.forEach(l => l.classList.remove('active'));
      const link = document.querySelector(`.nav-link[href="#${sec.id}"]`);
      if (link) link.classList.add('active');
    }
  });
}
window.addEventListener('scroll', onScroll, { passive:true });


/* ── 9. ANIMACIONES DE ENTRADA AL HACER SCROLL ───────────────────*/
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold:0.12, rootMargin:'0px 0px -60px 0px' });

function registerReveal() {
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}


/* ── 10. PARTÍCULAS DECORATIVAS DE FONDO ─────────────────────────*/
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 3, left = Math.random() * 100;
    const delay = Math.random() * 12,   dur  = Math.random() * 10 + 8;
    p.style.cssText = `width:${size}px;height:${size}px;left:${left}%;animation-duration:${dur}s;animation-delay:-${delay}s;`;
    container.appendChild(p);
  }
}


/* ── 11. TOAST (MENSAJE EMERGENTE) ───────────────────────────────*/
const toastEl = document.getElementById('toast');
let toastTimer;

function showToast(msg, tipo = 'ok') {
  toastEl.textContent = (tipo === 'ok' ? '✅ ' : '⚠️ ') + msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
}


/* ── 12. MODALES ─────────────────────────────────────────────────*/
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

document.getElementById('closeConfig').addEventListener('click',    () => closeModal('modalConfig'));
document.getElementById('closeActividad').addEventListener('click', () => closeModal('modalActividad'));
document.getElementById('closeProyecto').addEventListener('click',  () => closeModal('modalProyecto'));
document.getElementById('closeReflexion').addEventListener('click', () => closeModal('modalReflexion'));
document.getElementById('closeDetalle').addEventListener('click',   () => closeModal('modalDetalle'));
document.getElementById('closeRubrica').addEventListener('click',   () => closeModal('modalRubrica'));


/* ── 13. FOTO DE PERFIL ──────────────────────────────────────────
   Se guarda como base64 dentro de la tabla "config" en Supabase */
const profileAvatar = document.getElementById('profileAvatar');
const fotoInput     = document.getElementById('fotoInput');

profileAvatar.addEventListener('click', () => fotoInput.click());

fotoInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes.', 'error'); return; }

  /* Advertimos si la imagen es muy grande (puede tardar en guardar) */
  if (file.size > 2 * 1024 * 1024) {
    showToast('La imagen es grande, puede tardar un momento...', 'ok');
  }

  const reader = new FileReader();
  reader.onload = async (ev) => {
    STATE.fotoPerfil = ev.target.result;
    applyFotoPerfil(STATE.fotoPerfil);
    await saveConfig();           /* Guardamos en Supabase */
    showToast('Foto de perfil guardada.');
  };
  reader.readAsDataURL(file);
});

/* Muestra la foto de perfil en el avatar de la pantalla */
function applyFotoPerfil(base64) {
  document.getElementById('avatarInitials').style.display = 'none';
  let img = profileAvatar.querySelector('img');
  if (!img) { img = document.createElement('img'); profileAvatar.appendChild(img); }
  img.src = base64;
  img.alt = 'Foto de perfil';
}


/* ── 14. CONFIGURACIÓN DEL PORTAFOLIO ────────────────────────────
   Nombre, matrícula, asignatura y fecha. Se guarda en Supabase. */
function openConfigModal() {
  document.getElementById('inputNombre').value     = STATE.config.nombre    || '';
  document.getElementById('inputMatricula').value  = STATE.config.matricula || '';
  document.getElementById('inputAsignatura').value = STATE.config.asignatura || '';
  document.getElementById('inputFecha').value      = STATE.config.fecha     || '';
  openModal('modalConfig');
}

async function guardarConfig() {
  const nombre     = document.getElementById('inputNombre').value.trim();
  const matricula  = document.getElementById('inputMatricula').value.trim();
  const asignatura = document.getElementById('inputAsignatura').value.trim();
  const fecha      = document.getElementById('inputFecha').value;

  if (!nombre) { showToast('Por favor ingresa tu nombre.', 'error'); return; }

  STATE.config.nombre     = nombre;
  STATE.config.matricula  = matricula;
  STATE.config.asignatura = asignatura;
  STATE.config.fecha      = fecha;

  /* Actualizar la interfaz inmediatamente */
  aplicarConfigUI();

  /* Guardar en Supabase (puede tardar un segundo) */
  await saveConfig();

  closeModal('modalConfig');
  showToast('Configuración guardada en la nube.');
}

/* Aplica los datos de STATE.config a todos los elementos de la pantalla */
function aplicarConfigUI() {
  const { nombre, matricula, asignatura, fecha } = STATE.config;
  document.getElementById('metaNombre').innerHTML     = `<i class="ph-bold ph-user"></i> ${nombre || 'Nombre del Estudiante'}`;
  document.getElementById('metaAsignatura').innerHTML = `<i class="ph-bold ph-book-open"></i> ${asignatura || 'Asignatura'}`;
  document.getElementById('metaFecha').innerHTML      = `<i class="ph-bold ph-calendar"></i> ${fecha ? formatDate(fecha) : 'Fecha de Inicio'}`;
  document.getElementById('profileNombre').textContent     = nombre || 'Nombre del Estudiante';
  document.getElementById('profileAsignatura').textContent = asignatura || '—';
  document.getElementById('profileMatricula').innerHTML    = `<i class="ph-bold ph-identification-card"></i> Matrícula: ${matricula || '—'}`;

  if (nombre && !STATE.fotoPerfil) {
    const initials = nombre.split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(0,2).join('');
    document.getElementById('avatarInitials').textContent = initials || '?';
  }
}

document.getElementById('btnConfig').addEventListener('click', openConfigModal);
document.getElementById('btnGuardarConfig').addEventListener('click', guardarConfig);


/* ── 15. ACTIVIDADES ─────────────────────────────────────────────*/
function renderActividades(filter = 'all') {
  const grid  = document.getElementById('actividadesGrid');
  const empty = document.getElementById('emptyActividades');
  grid.querySelectorAll('.actividad-card').forEach(c => c.remove());
  const lista = filter === 'all' ? STATE.actividades : STATE.actividades.filter(a => a.tipo === filter);
  empty.style.display = lista.length === 0 ? 'block' : 'none';
  lista.forEach(act => grid.appendChild(crearTarjetaActividad(act)));
  updateStats();
}

function crearTarjetaActividad(act) {
  const card = document.createElement('div');
  card.className = 'actividad-card';
  card.dataset.tipo = act.tipo; card.dataset.id = act.id;
  const info = { tarea:{label:'📝 Tarea',badge:'badge-tarea'}, evaluacion:{label:'📊 Evaluación',badge:'badge-evaluacion'}, proyecto:{label:'🚀 Proyecto',badge:'badge-proyecto'} }[act.tipo] || {label:act.tipo,badge:''};
  const notaHTML = act.calificacion !== '' ? `<span class="card-nota">${parseFloat(act.calificacion).toFixed(1)}</span>` : `<span style="color:#555">Sin nota</span>`;
  card.innerHTML = `
    <span class="card-tipo-badge ${info.badge}">${info.label}</span>
    <h3 class="card-titulo">${escapeHTML(act.nombre)}</h3>
    <p class="card-desc">${escapeHTML(act.descripcion || '—')}</p>
    <div class="card-footer"><span>${act.fecha ? '📅 ' + formatDate(act.fecha) : ''}</span>${notaHTML}</div>
    <div class="card-actions">
      <button class="btn-sm" onclick="verDetalleActividad('${act.id}')"><i class="ph-bold ph-eye"></i> Ver más</button>
      <button class="btn-sm btn-danger" onclick="eliminarActividad('${act.id}')"><i class="ph-bold ph-trash"></i> Eliminar</button>
    </div>`;
  return card;
}

function verDetalleActividad(id) {
  const act = STATE.actividades.find(a => a.id === id);
  if (!act) return;
  document.getElementById('detalleContent').innerHTML = `
    <h2>${escapeHTML(act.nombre)}</h2>
    <p style="color:var(--gold);margin-bottom:1.5rem;text-transform:uppercase;font-size:.85rem">${act.tipo}</p>
    <h4 style="color:#aaa;margin-bottom:.4rem">Descripción</h4>
    <p style="margin-bottom:1.5rem">${escapeHTML(act.descripcion||'—')}</p>
    <h4 style="color:#aaa;margin-bottom:.4rem">Reflexión personal</h4>
    <p style="font-style:italic;color:#ccc;margin-bottom:1.5rem">${escapeHTML(act.reflexion||'—')}</p>
    ${act.calificacion !== '' ? `<h4 style="color:#aaa;margin-bottom:.4rem">Calificación</h4><p style="font-family:var(--font-disp);font-size:2rem;color:var(--gold)">${parseFloat(act.calificacion).toFixed(1)} / 10</p>` : ''}
    ${act.enlace ? `<h4 style="color:#aaa;margin-top:1.5rem;margin-bottom:.4rem">Enlace</h4><a href="${act.enlace}" target="_blank" style="color:var(--teal)">${act.enlace}</a>` : ''}
    <p style="color:#555;font-size:.8rem;margin-top:2rem">📅 ${act.fecha ? formatDate(act.fecha) : 'Sin fecha'}</p>`;
  openModal('modalDetalle');
}

async function eliminarActividad(id) {
  if (!confirm('¿Deseas eliminar esta actividad? Se borrará de la base de datos.')) return;
  await deleteActividad(id);                            /* Borra en Supabase */
  STATE.actividades = STATE.actividades.filter(a => a.id !== id);
  renderActividades(); updateGrafico();
  showToast('Actividad eliminada.');
}

async function guardarActividad() {
  const nombre = document.getElementById('actNombre').value.trim();
  if (!nombre) { showToast('El nombre de la actividad es obligatorio.', 'error'); return; }

  const nuevaActividad = {
    id:           'act_' + Date.now(),
    nombre,
    tipo:         document.getElementById('actTipo').value,
    descripcion:  document.getElementById('actDescripcion').value.trim(),
    fecha:        document.getElementById('actFecha').value,
    calificacion: document.getElementById('actCalificacion').value,
    reflexion:    document.getElementById('actReflexion').value.trim(),
    enlace:       document.getElementById('actEnlace').value.trim(),
    creadoEn:     new Date().toISOString()
  };

  await saveActividad(nuevaActividad);                  /* Guarda en Supabase */
  STATE.actividades.push(nuevaActividad);
  renderActividades(); updateGrafico();

  ['actNombre','actDescripcion','actFecha','actCalificacion','actReflexion','actEnlace'].forEach(id => document.getElementById(id).value = '');
  closeModal('modalActividad');
  showToast('¡Actividad guardada en la nube!');
}

document.querySelectorAll('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderActividades(btn.dataset.filter);
  });
});
document.getElementById('btnAddActividad').addEventListener('click',    () => openModal('modalActividad'));
document.getElementById('btnGuardarActividad').addEventListener('click', guardarActividad);


/* ── 16. PROYECTOS ───────────────────────────────────────────────*/
function renderProyectos() {
  const grid  = document.getElementById('proyectosGrid');
  const empty = document.getElementById('emptyProyectos');
  grid.querySelectorAll('.actividad-card').forEach(c => c.remove());
  empty.style.display = STATE.proyectos.length === 0 ? 'block' : 'none';
  STATE.proyectos.forEach(p => grid.appendChild(crearTarjetaProyecto(p)));
  updateStats();
}

function crearTarjetaProyecto(p) {
  const card = document.createElement('div');
  card.className = 'actividad-card'; card.dataset.tipo = 'proyecto'; card.dataset.id = p.id;
  const notaHTML = p.calificacion !== '' ? `<span class="card-nota">${parseFloat(p.calificacion).toFixed(1)}</span>` : `<span style="color:#555">Sin nota</span>`;
  card.innerHTML = `
    <span class="card-tipo-badge badge-proyecto">🚀 Proyecto</span>
    <h3 class="card-titulo">${escapeHTML(p.nombre)}</h3>
    <p class="card-desc">${escapeHTML(p.descripcion||'—')}</p>
    <div class="card-footer"><span>🏁 Fases: ${(p.fases||'').split('\n').filter(Boolean).length}</span>${notaHTML}</div>
    <div class="card-actions">
      <button class="btn-sm" onclick="verDetalleProyecto('${p.id}')"><i class="ph-bold ph-eye"></i> Ver más</button>
      <button class="btn-sm btn-danger" onclick="eliminarProyecto('${p.id}')"><i class="ph-bold ph-trash"></i> Eliminar</button>
    </div>`;
  return card;
}

function verDetalleProyecto(id) {
  const p = STATE.proyectos.find(x => x.id === id);
  if (!p) return;
  const fases = (p.fases||'').split('\n').filter(Boolean).map(f => `<li>${escapeHTML(f)}</li>`).join('');
  document.getElementById('detalleContent').innerHTML = `
    <h2>${escapeHTML(p.nombre)}</h2>
    <p style="color:var(--rose);margin-bottom:1.5rem;text-transform:uppercase;font-size:.85rem">PROYECTO</p>
    <h4 style="color:#aaa;margin-bottom:.4rem">Descripción</h4><p style="margin-bottom:1.5rem">${escapeHTML(p.descripcion||'—')}</p>
    ${fases ? `<h4 style="color:#aaa;margin-bottom:.4rem">Fases</h4><ol style="margin-left:1.5rem;margin-bottom:1.5rem;color:#ccc;line-height:2">${fases}</ol>` : ''}
    <h4 style="color:#aaa;margin-bottom:.4rem">Resultados</h4><p style="margin-bottom:1.5rem">${escapeHTML(p.resultados||'—')}</p>
    <h4 style="color:#aaa;margin-bottom:.4rem">Reflexión</h4><p style="font-style:italic;color:#ccc">${escapeHTML(p.reflexion||'—')}</p>
    ${p.calificacion !== '' ? `<h4 style="color:#aaa;margin-top:1.5rem;margin-bottom:.4rem">Calificación</h4><p style="font-family:var(--font-disp);font-size:2rem;color:var(--gold)">${parseFloat(p.calificacion).toFixed(1)} / 10</p>` : ''}`;
  openModal('modalDetalle');
}

async function eliminarProyecto(id) {
  if (!confirm('¿Deseas eliminar este proyecto? Se borrará de la base de datos.')) return;
  await deleteProyecto(id);
  STATE.proyectos = STATE.proyectos.filter(p => p.id !== id);
  renderProyectos(); updateGrafico();
  showToast('Proyecto eliminado.');
}

async function guardarProyecto() {
  const nombre = document.getElementById('proyNombre').value.trim();
  if (!nombre) { showToast('El nombre del proyecto es obligatorio.', 'error'); return; }
  const nuevoProyecto = {
    id:           'proy_' + Date.now(),
    nombre,
    descripcion:  document.getElementById('proyDescripcion').value.trim(),
    fases:        document.getElementById('proyFases').value.trim(),
    resultados:   document.getElementById('proyResultados').value.trim(),
    reflexion:    document.getElementById('proyReflexion').value.trim(),
    calificacion: document.getElementById('proyCalificacion').value,
    creadoEn:     new Date().toISOString()
  };
  await saveProyecto(nuevoProyecto);
  STATE.proyectos.push(nuevoProyecto);
  renderProyectos(); updateGrafico();
  ['proyNombre','proyDescripcion','proyFases','proyResultados','proyReflexion','proyCalificacion'].forEach(id => document.getElementById(id).value = '');
  closeModal('modalProyecto');
  showToast('¡Proyecto guardado en la nube!');
}

document.getElementById('btnAddProyecto').addEventListener('click',    () => openModal('modalProyecto'));
document.getElementById('btnGuardarProyecto').addEventListener('click', guardarProyecto);


/* ── 17. REFLEXIONES ─────────────────────────────────────────────*/
let selectedEmoji = '😊';

function renderReflexiones() {
  const grid  = document.getElementById('reflexionesGrid');
  const empty = document.getElementById('emptyReflexiones');
  grid.querySelectorAll('.reflexion-card').forEach(c => c.remove());
  empty.style.display = STATE.reflexiones.length === 0 ? 'block' : 'none';
  STATE.reflexiones.forEach(r => grid.insertBefore(crearTarjetaReflexion(r), empty));
  updateStats();
}

function crearTarjetaReflexion(r) {
  const card = document.createElement('div');
  card.className = 'reflexion-card';
  const fecha = r.creadoEn ? new Date(r.creadoEn).toLocaleDateString('es-ES', {day:'2-digit',month:'long',year:'numeric'}) : '';
  card.innerHTML = `
    <span class="reflexion-emoji">${r.emoji||'💭'}</span>
    <h4 class="reflexion-titulo">${escapeHTML(r.titulo||'Reflexión')}</h4>
    <p class="reflexion-texto">${escapeHTML(r.contenido||'')}</p>
    <p class="reflexion-fecha">📅 ${fecha}</p>
    <div class="card-actions" style="margin-top:.75rem">
      <button class="btn-sm btn-danger" onclick="eliminarReflexion('${r.id}')"><i class="ph-bold ph-trash"></i> Eliminar</button>
    </div>`;
  return card;
}

async function eliminarReflexion(id) {
  if (!confirm('¿Deseas eliminar esta reflexión?')) return;
  await deleteReflexion(id);
  STATE.reflexiones = STATE.reflexiones.filter(r => r.id !== id);
  renderReflexiones();
  showToast('Reflexión eliminada.');
}

async function guardarReflexion() {
  const contenido = document.getElementById('refContenido').value.trim();
  if (!contenido) { showToast('Escribe algo en la reflexión antes de guardar.', 'error'); return; }
  const nueva = {
    id:        'ref_' + Date.now(),
    titulo:    document.getElementById('refTitulo').value.trim() || 'Reflexión',
    contenido, emoji: selectedEmoji,
    creadoEn:  new Date().toISOString()
  };
  await saveReflexion(nueva);
  STATE.reflexiones.unshift(nueva);
  renderReflexiones();
  document.getElementById('refTitulo').value = '';
  document.getElementById('refContenido').value = '';
  selectedEmoji = '😊';
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.emoji-btn').classList.add('active');
  closeModal('modalReflexion');
  showToast('¡Reflexión guardada en la nube!');
}

document.querySelectorAll('.emoji-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedEmoji = btn.dataset.emoji;
  });
});
document.getElementById('btnAddReflexion').addEventListener('click',    () => openModal('modalReflexion'));
document.getElementById('btnGuardarReflexion').addEventListener('click', guardarReflexion);


/* ── 18. COMENTARIOS ─────────────────────────────────────────────*/
function renderComentarios() {
  const lista = document.getElementById('comentariosLista');
  lista.innerHTML = '';
  if (STATE.comentarios.length === 0) {
    lista.innerHTML = `<div class="empty-state"><i class="ph-bold ph-chat-dots"></i><p>Sin comentarios aún.</p></div>`;
    return;
  }
  STATE.comentarios.forEach(c => {
    const b = document.createElement('div');
    b.className = 'comentario-burbuja';
    const fecha = c.creadoEn ? new Date(c.creadoEn).toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
    b.innerHTML = `<p>${escapeHTML(c.texto)}</p><small>📅 ${fecha}</small>`;
    lista.appendChild(b);
  });
}

async function agregarComentario() {
  const input = document.getElementById('inputComentario');
  const texto = input.value.trim();
  if (!texto) { showToast('Escribe un comentario antes de enviar.', 'error'); return; }
  const nuevo = { id:'com_'+Date.now(), texto, creadoEn:new Date().toISOString() };
  await saveComentario(nuevo);
  STATE.comentarios.push(nuevo);
  input.value = '';
  renderComentarios();
  showToast('Comentario enviado.');
}

document.getElementById('btnComentario').addEventListener('click', agregarComentario);
document.getElementById('inputComentario').addEventListener('keydown', e => { if (e.key === 'Enter') agregarComentario(); });


/* ── 19. GRÁFICO DE CALIFICACIONES ──────────────────────────────*/
function updateGrafico() {
  const container = document.getElementById('graficoBars');
  container.innerHTML = '';
  const calificados = [...STATE.actividades.filter(a => a.calificacion !== ''), ...STATE.proyectos.filter(p => p.calificacion !== '')].slice(-8);
  if (calificados.length === 0) {
    container.innerHTML = '<div class="grafico-empty">Agrega actividades con calificación para ver el gráfico</div>';
    updatePromedioUI(0, false); return;
  }
  calificados.forEach(item => {
    const nota = parseFloat(item.calificacion);
    const pct  = (nota/10)*100;
    const color= nota>=7?'var(--gold)':nota>=5?'var(--teal)':'var(--rose)';
    const bi = document.createElement('div');
    bi.className = 'bar-item';
    bi.innerHTML = `<span class="bar-valor">${nota.toFixed(1)}</span><div class="bar-fill" style="height:${pct}%;background:linear-gradient(to top,${color},${color}cc)"></div><span class="bar-label" title="${item.nombre}">${item.nombre.substring(0,10)}${item.nombre.length>10?'…':''}</span>`;
    container.appendChild(bi);
  });
  const suma = calificados.reduce((a,i) => a + parseFloat(i.calificacion), 0);
  updatePromedioUI(suma/calificados.length, true);
}

function updatePromedioUI(valor=0, hayDatos=false) {
  const circle=document.getElementById('ringFill'), pEl=document.getElementById('promedioValor'), lEl=document.getElementById('promedioLabel');
  if (!hayDatos) { pEl.textContent='—'; lEl.textContent='Sin calificaciones'; circle.style.strokeDashoffset=326.7; return; }
  circle.style.strokeDashoffset = 326.7-(valor/10)*326.7;
  pEl.textContent = valor.toFixed(1);
  lEl.textContent = valor>=9?'🌟 Excelente':valor>=7?'✅ Bueno':valor>=5?'⚠️ Regular':'❌ Necesita mejorar';
}


/* ── 20. ESTADÍSTICAS ANIMADAS ───────────────────────────────────*/
let prevStats = { actividades:0, proyectos:0, reflexiones:0 };

function animateCounter(el, target) {
  const start = parseInt(el.textContent)||0, ts0=performance.now();
  function step(ts) {
    const p=Math.min((ts-ts0)/600,1), e=1-Math.pow(1-p,3);
    el.textContent=Math.round(start+(target-start)*e);
    if(p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateStats() {
  const s={actividades:STATE.actividades.length,proyectos:STATE.proyectos.length,reflexiones:STATE.reflexiones.length};
  if(s.actividades!==prevStats.actividades) animateCounter(document.getElementById('statActividades'),s.actividades);
  if(s.proyectos!==prevStats.proyectos)     animateCounter(document.getElementById('statProyectos'),s.proyectos);
  if(s.reflexiones!==prevStats.reflexiones) animateCounter(document.getElementById('statReflexiones'),s.reflexiones);
  prevStats={...s};
}


/* ── 21. RÚBRICA EDITABLE ────────────────────────────────────────
   Los cambios se guardan en la columna "rubrica" de la tabla "config" */
function renderRubrica() {
  const tbody = document.getElementById('rubricaBody');
  tbody.innerHTML = '';
  STATE.rubrica.forEach((crit, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(crit.nombre)}</strong></td>
      <td class="hide-xs">${escapeHTML(crit.descripcion)}</td>
      <td><div class="rubrica-bar-wrap"><div class="rubrica-bar" style="--pct:${crit.pct}%">${crit.pct}%</div></div></td>
      <td><button class="btn-rubrica-edit" onclick="abrirEditarCriterio(${idx})" title="Editar criterio"><i class="ph-bold ph-pencil-simple"></i></button></td>`;
    tbody.appendChild(tr);
  });
  actualizarTotalRubrica();
  buildAutoSliders();
}

function actualizarTotalRubrica() {
  const total=STATE.rubrica.reduce((a,c)=>a+c.pct,0);
  const tEl=document.getElementById('rubricaTotal'), mEl=document.getElementById('rubricaTotalMsg');
  tEl.textContent=total+'%';
  if(total===100){tEl.style.color='var(--teal)';mEl.textContent='✓ La suma es correcta';mEl.className='rubrica-total-msg ok';}
  else{tEl.style.color='var(--rose)';mEl.textContent=`⚠️ La suma debe ser 100% (${total<100?'faltan '+(100-total):'sobran '+(total-100)}%)`;mEl.className='rubrica-total-msg';}
}

function abrirEditarCriterio(idx) {
  const crit=STATE.rubrica[idx];
  document.getElementById('rubricaEditIdx').value    = idx;
  document.getElementById('rubricaEditNombre').value = crit.nombre;
  document.getElementById('rubricaEditDesc').value   = crit.descripcion;
  document.getElementById('rubricaEditPct').value    = crit.pct;
  openModal('modalRubrica');
}

async function guardarCriterioRubrica() {
  const idx    = parseInt(document.getElementById('rubricaEditIdx').value);
  const nombre = document.getElementById('rubricaEditNombre').value.trim();
  const desc   = document.getElementById('rubricaEditDesc').value.trim();
  const pct    = parseInt(document.getElementById('rubricaEditPct').value);
  if (!nombre) { showToast('El nombre es obligatorio.', 'error'); return; }
  if (isNaN(pct)||pct<1||pct>100) { showToast('El porcentaje debe ser entre 1 y 100.', 'error'); return; }
  STATE.rubrica[idx].nombre=nombre; STATE.rubrica[idx].descripcion=desc; STATE.rubrica[idx].pct=pct;
  await saveConfig();               /* Guarda la rúbrica en Supabase */
  renderRubrica();
  closeModal('modalRubrica');
  showToast('Criterio guardado en la nube.');
}

document.getElementById('btnGuardarRubrica').addEventListener('click', guardarCriterioRubrica);


/* ── 22. AUTOEVALUACIÓN ──────────────────────────────────────────*/
function buildAutoSliders() {
  const container=document.getElementById('autoSliders');
  container.innerHTML='';
  STATE.rubrica.forEach(crit => {
    const val=STATE.autoevaluacion.valores[crit.key]||5;
    const item=document.createElement('div'); item.className='slider-item';
    item.innerHTML=`<label>${escapeHTML(crit.nombre)}</label><input type="range" min="1" max="10" step="1" value="${val}" data-key="${crit.key}" data-peso="${crit.pct}"/><span class="slider-value" id="val_${crit.key}">${val}</span>`;
    container.appendChild(item);
  });
  container.querySelectorAll('input[type="range"]').forEach(input => {
    input.addEventListener('input', () => {
      const key=input.dataset.key, val=parseInt(input.value);
      document.getElementById(`val_${key}`).textContent=val;
      STATE.autoevaluacion.valores[key]=val;
      calcularPuntajeAuto();
      if(STATE.autoevaluacion.enviada){STATE.autoevaluacion.enviada=false;document.getElementById('autoResultado').style.display='none';}
    });
  });
  calcularPuntajeAuto();
  if(STATE.autoevaluacion.enviada) mostrarResultadoAuto();
}

function calcularPuntajeAuto() {
  let total=0;
  STATE.rubrica.forEach(crit => { total+=(( STATE.autoevaluacion.valores[crit.key]||5)/10)*crit.pct; });
  document.getElementById('autoTotal').textContent=total.toFixed(1);
  return total;
}

function mostrarResultadoAuto() {
  const total=calcularPuntajeAuto();
  const texto=total>=90?'¡Excelente desempeño! Sigue así.':total>=70?'Buen trabajo. Hay áreas que puedes fortalecer.':total>=50?'Rendimiento regular. Revisa las áreas con menor puntaje.':'Es momento de poner más esfuerzo. ¡Tú puedes mejorar!';
  document.getElementById('autoResultadoTexto').textContent=`Puntaje: ${total.toFixed(1)} / 100 — ${texto}`;
  document.getElementById('autoResultado').style.display='flex';
}

/* Al presionar Enviar: guarda en Supabase y muestra el resultado */
document.getElementById('btnEnviarAuto').addEventListener('click', async () => {
  STATE.autoevaluacion.enviada=true;
  await saveConfig();               /* Guarda los valores de los sliders */
  mostrarResultadoAuto();
  showToast('Autoevaluación enviada y guardada en la nube.');
});


/* ── 23. CAMPOS DE TEXTO EDITABLES ──────────────────────────────
   Guardan en Supabase cuando el usuario deja de escribir */
function setupEditables() {
  /* Usamos un temporizador para no guardar en cada tecla, sino al parar de escribir */
  let editTimer;
  ['presentacionTexto','objetivoTexto','refAprendizajes','refFortalezas','refMejorar','refObjetivos']
    .forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        clearTimeout(editTimer);
        editTimer = setTimeout(() => saveConfig(), 1500); /* Espera 1.5 segundos antes de guardar */
      });
    });
}


/* ── 24. RESTAURAR LA INTERFAZ CON LOS DATOS CARGADOS ───────────
   Aplica todo el STATE a los elementos visuales de la página */
function restoreUI() {
  aplicarConfigUI();

  if (STATE.fotoPerfil) applyFotoPerfil(STATE.fotoPerfil);

  if (STATE.config.presentacion) document.getElementById('presentacionTexto').innerText = STATE.config.presentacion;
  if (STATE.config.objetivo)     document.getElementById('objetivoTexto').innerText     = STATE.config.objetivo;
  if (STATE.reflexionesFinales.aprendizajes) document.getElementById('refAprendizajes').innerText = STATE.reflexionesFinales.aprendizajes;
  if (STATE.reflexionesFinales.fortalezas)   document.getElementById('refFortalezas').innerText   = STATE.reflexionesFinales.fortalezas;
  if (STATE.reflexionesFinales.mejorar)      document.getElementById('refMejorar').innerText      = STATE.reflexionesFinales.mejorar;
  if (STATE.reflexionesFinales.objetivos)    document.getElementById('refObjetivos').innerText    = STATE.reflexionesFinales.objetivos;
}


/* ── 25. UTILIDADES ──────────────────────────────────────────────*/
function formatDate(str) {
  if (!str) return '—';
  return new Date(str+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}


/* ── 26. ESTILOS DEL SPINNER (se inyectan en el <head>) ─────────
   Ponemos los estilos aquí para no tener que agregar nada al CSS */
function injectSpinnerStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Fondo oscuro del spinner de carga */
    #dbSpinner {
      position:fixed; inset:0; background:rgba(10,10,18,.92);
      z-index:9997; display:flex; align-items:center; justify-content:center;
      flex-direction:column; gap:1.5rem;
    }
    .spinner-inner {
      display:flex; flex-direction:column; align-items:center; gap:1rem;
    }
    /* Anillo que gira */
    .spinner-ring {
      width:56px; height:56px; border-radius:50%;
      border:4px solid rgba(212,168,67,.2);
      border-top-color:#d4a843;
      animation:spinRing .8s linear infinite;
    }
    @keyframes spinRing { to { transform:rotate(360deg); } }
    .spinner-inner p {
      color:#888; font-family:'DM Sans',sans-serif; font-size:.95rem;
      letter-spacing:.05em;
    }
  `;
  document.head.appendChild(style);
}


/* ── 27. INICIO — todo empieza aquí ─────────────────────────────
   Orden de ejecución cuando la página termina de cargar */
async function init() {
  injectSpinnerStyles();      /* 1. Estilos del spinner */
  crearSpinner();             /* 2. Crear el spinner en el DOM */
  createParticles();          /* 3. Partículas de fondo (rápido, sin esperar red) */
  animateCursor();            /* Ya corre en loop, solo aseguramos que inicia */

  await loadAllFromSupabase(); /* 4. Pedir datos al servidor (puede tardar) */

  restoreUI();                /* 5. Mostrar datos cargados en la interfaz */
  renderRubrica();            /* 6. Tabla de rúbrica */
  renderActividades();        /* 7. Tarjetas de actividades */
  renderProyectos();          /* 8. Tarjetas de proyectos */
  renderReflexiones();        /* 9. Reflexiones */
  renderComentarios();        /* 10. Comentarios del docente */
  updateGrafico();            /* 11. Gráfico de calificaciones */
  setupEditables();           /* 12. Bloques de texto editables */
  registerReveal();           /* 13. Animaciones de scroll */
  onScroll();                 /* 14. Estado inicial de la barra de progreso */
  hideSplash();               /* 15. Ocultar pantalla de carga */

  console.log('✅ Portafolio conectado a Supabase correctamente');
}

document.addEventListener('DOMContentLoaded', init);