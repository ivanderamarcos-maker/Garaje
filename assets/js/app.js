import { db } from './db.js';

const app = document.getElementById('app');
const capa = document.getElementById('capa');
const urlsFoto = new Map();

const TIPOS = [
  ['coche', 'Coche'],
  ['moto', 'Moto'],
  ['furgoneta', 'Furgoneta'],
  ['otro', 'Otro']
];
const COMBUSTIBLES = ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'GLP', 'Otro'];
const TIPOS_TALLER = ['Aceite', 'Filtros', 'Frenos', 'Neumáticos', 'ITV', 'Revisión', 'Reparación', 'Otro'];
const PRIORIDADES = [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']];
const ESTADOS_TAREA = [['pendiente', 'Pendiente'], ['en-curso', 'En curso'], ['hecho', 'Hecho']];
const ESTADOS_MEJORA = [['idea', 'Idea'], ['en-curso', 'En curso'], ['hecho', 'Hecho']];
const PLATAFORMAS = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['web', 'Otra web']];
const TIPOS_DOC = ['Manual', 'Factura', 'Ficha técnica', 'Seguro', 'Permiso', 'Otro'];

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function fmtFecha(valor) {
  if (!valor) return '';
  const [y, m, d] = String(valor).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : valor;
}

function fmtKm(valor) {
  if (valor === '' || valor == null) return '';
  return `${Number(valor).toLocaleString('es-ES')} km`;
}

function fmtEuro(valor) {
  if (valor === '' || valor == null) return '';
  return `${Number(valor).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`;
}

function diasHasta(fecha) {
  if (!fecha) return null;
  const fin = new Date(`${fecha}T00:00:00`);
  return Math.ceil((fin - new Date()) / 86400000);
}

function nombreVehiculo(v) {
  return v.apodo || [v.marca, v.modelo].filter(Boolean).join(' ') || 'Vehículo';
}

function opciones(lista, actual) {
  return lista.map((item) => {
    const valor = Array.isArray(item) ? item[0] : item;
    const etiqueta = Array.isArray(item) ? item[1] : item;
    return `<option value="${esc(valor)}" ${actual === valor ? 'selected' : ''}>${esc(etiqueta)}</option>`;
  }).join('');
}

function campo(id, etiqueta, tipo = 'text', valor = '', extra = '') {
  return `<div class="campo"><label for="${id}">${etiqueta}</label><input id="${id}" type="${tipo}" value="${esc(valor)}" ${extra}></div>`;
}

function area(id, etiqueta, valor = '') {
  return `<div class="campo"><label for="${id}">${etiqueta}</label><textarea id="${id}">${esc(valor)}</textarea></div>`;
}

function select(id, etiqueta, lista, valor = '') {
  return `<div class="campo"><label for="${id}">${etiqueta}</label><select id="${id}">${opciones(lista, valor)}</select></div>`;
}

async function fotoUrl(id) {
  if (!id) return '';
  if (urlsFoto.has(id)) return urlsFoto.get(id);
  const archivo = await db.get('archivos', id);
  if (!archivo?.blob) return '';
  const url = URL.createObjectURL(archivo.blob);
  urlsFoto.set(id, url);
  return url;
}

async function guardarArchivo(file) {
  if (!file) return null;
  const id = uid();
  await db.put('archivos', { id, blob: file, mime: file.type, nombre: file.name });
  return id;
}

async function deVehiculo(nombre, vehiculoId) {
  const todos = await db.todos(nombre);
  return todos.filter((item) => item.vehiculoId === vehiculoId)
    .sort((a, b) => String(b.fecha || b.creadoEn).localeCompare(String(a.fecha || a.creadoEn)));
}

function ir(hash) {
  location.hash = hash;
}

function cerrarCapa() {
  capa.hidden = true;
  capa.innerHTML = '';
}

function panel(titulo, html) {
  capa.hidden = false;
  capa.innerHTML = `<div class="panel"><h3>${esc(titulo)}</h3>${html}</div>`;
}

function tope(titulo, sub, extra = '') {
  return `
    <header class="tope">
      <a href="#/" class="btn texto" data-go="#/">←</a>
      <div>
        <h2>${esc(titulo)}</h2>
        ${sub ? `<p>${esc(sub)}</p>` : ''}
      </div>
      <div class="tope-acciones">${extra}</div>
    </header>`;
}

function vacio(texto, accion = '') {
  return `<div class="vacio"><p>${esc(texto)}</p>${accion}</div>`;
}

function tarjetaItem(item, extra = '') {
  return `
    <article class="tarjeta fila">
      <div>
        <h4>${esc(item.titulo || item.numero || 'Sin título')}</h4>
        <p class="meta">${extra}</p>
        ${item.notas ? `<p class="meta">${esc(item.notas)}</p>` : ''}
        ${item.url || item.enlace ? `<p class="meta enlace-fila"><a href="${esc(item.url || item.enlace)}" target="_blank" rel="noopener">Abrir enlace</a></p>` : ''}
      </div>
      <div class="acciones">
        ${item._acciones || ''}
      </div>
    </article>`;
}

async function vistaGaraje() {
  const vehiculos = (await db.todos('vehiculos')).sort((a, b) => nombreVehiculo(a).localeCompare(nombreVehiculo(b), 'es'));
  const activos = vehiculos.filter((v) => v.estado !== 'archivado');
  const archivados = vehiculos.filter((v) => v.estado === 'archivado');

  const tarjeta = async (v) => {
    const foto = await fotoUrl(v.fotoId);
    const pendientes = (await deVehiculo('pendientes', v.id)).filter((p) => p.estado !== 'hecho');
    return `
      <a class="tarjeta enlace" href="#/vehiculo/${v.id}">
        <div class="foto-vehiculo">${foto ? `<img src="${foto}" alt="">` : `<img src="assets/images/marca.svg" alt="" width="64">`}</div>
        <div class="cuerpo-tarjeta">
          <strong>${esc(nombreVehiculo(v))}</strong>
          <p class="meta">${esc([v.marca, v.modelo, v.anio].filter(Boolean).join(' · ') || v.tipo || 'Vehículo')}</p>
          <p class="meta">${esc(v.matricula || '')} ${v.km ? ' · ' + fmtKm(v.km) : ''}</p>
          ${pendientes.length ? `<span class="etiqueta alta">${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}</span>` : '<span class="etiqueta ok">Al día</span>'}
        </div>
      </a>`;
  };

  app.innerHTML = `
    <header class="tope">
      <img class="marca" src="assets/images/marca.svg" alt="">
      <div>
        <h1>Garaje</h1>
        <p>Tus vehículos, el taller y lo que hay que hacer.</p>
      </div>
      <div class="tope-acciones">
        <button class="btn secundario" data-go="#/ajustes">Ajustes</button>
        <button class="btn" data-accion="nuevo-vehiculo">Añadir vehículo</button>
      </div>
    </header>
    ${activos.length ? `<div class="rejilla">${(await Promise.all(activos.map(tarjeta))).join('')}</div>` : vacio('Aún no hay vehículos. Añade el primero cuando quieras.')}
    ${archivados.length ? `
      <div class="seccion-titulo"><h3>Anteriores</h3></div>
      <div class="rejilla">${(await Promise.all(archivados.map(tarjeta))).join('')}</div>` : ''}
    <p class="pie-app">Cada uno guarda sus vehículos en su teléfono u ordenador. Nadie más los ve. En Ajustes puedes guardar una copia, por si acaso.</p>`;
}

function formVehiculo(v = {}) {
  return `
    <form class="formulario" data-form="vehiculo" data-id="${esc(v.id || '')}">
      ${campo('apodo', 'Nombre o apodo', 'text', v.apodo || '', 'placeholder="El Golf, la moto…"')}
      <div class="dos">
        ${campo('marca', 'Marca', 'text', v.marca || '')}
        ${campo('modelo', 'Modelo', 'text', v.modelo || '')}
      </div>
      <div class="dos">
        ${campo('anio', 'Año', 'number', v.anio || '')}
        ${select('tipo', 'Tipo', TIPOS, v.tipo || 'coche')}
      </div>
      <div class="dos">
        ${campo('matricula', 'Matrícula', 'text', v.matricula || '')}
        ${campo('vin', 'VIN / bastidor', 'text', v.vin || '')}
      </div>
      <div class="dos">
        ${campo('color', 'Color', 'text', v.color || '')}
        ${select('combustible', 'Combustible', COMBUSTIBLES, v.combustible || 'Gasolina')}
      </div>
      <div class="dos">
        ${campo('km', 'Kilómetros', 'number', v.km || '')}
        ${campo('potencia', 'Potencia', 'text', v.potencia || '', 'placeholder="cv o kW"')}
      </div>
      <div class="dos">
        ${campo('fechaCompra', 'Fecha de compra', 'date', v.fechaCompra || '')}
        ${campo('itvHasta', 'ITV hasta', 'date', v.itvHasta || '')}
      </div>
      <div class="dos">
        ${campo('seguroHasta', 'Seguro hasta', 'date', v.seguroHasta || '')}
        ${campo('seguroCompania', 'Compañía de seguro', 'text', v.seguroCompania || '')}
      </div>
      ${campo('tallerHabitual', 'Taller habitual', 'text', v.tallerHabitual || '')}
      <div class="campo"><label for="foto">Foto</label><input id="foto" type="file" accept="image/*"></div>
      ${area('notas', 'Notas', v.notas || '')}
      <div class="acciones">
        <button type="button" class="btn secundario" data-cerrar>Cancelar</button>
        <button class="btn" type="submit">Guardar</button>
      </div>
    </form>`;
}

async function guardarVehiculo(form) {
  const id = form.dataset.id || uid();
  const previo = form.dataset.id ? await db.get('vehiculos', id) : {};
  const foto = form.foto.files[0];
  const fotoId = foto ? await guardarArchivo(foto) : previo.fotoId || null;
  const vehiculo = {
    ...previo,
    id,
    apodo: form.apodo.value.trim(),
    marca: form.marca.value.trim(),
    modelo: form.modelo.value.trim(),
    anio: form.anio.value,
    tipo: form.tipo.value,
    matricula: form.matricula.value.trim(),
    vin: form.vin.value.trim(),
    color: form.color.value.trim(),
    combustible: form.combustible.value,
    km: form.km.value,
    potencia: form.potencia.value.trim(),
    fechaCompra: form.fechaCompra.value,
    itvHasta: form.itvHasta.value,
    seguroHasta: form.seguroHasta.value,
    seguroCompania: form.seguroCompania.value.trim(),
    tallerHabitual: form.tallerHabitual.value.trim(),
    notas: form.notas.value.trim(),
    fotoId,
    estado: previo.estado || 'activo',
    creadoEn: previo.creadoEn || new Date().toISOString(),
    actualizadoEn: new Date().toISOString()
  };
  await db.put('vehiculos', vehiculo);
  cerrarCapa();
  ir(`#/vehiculo/${id}`);
}

async function vistaVehiculo(id) {
  const v = await db.get('vehiculos', id);
  if (!v) {
    app.innerHTML = tope('No encontrado') + vacio('Ese vehículo ya no está aquí.');
    return;
  }
  const [pendientes, mantenimientos, mejoras] = await Promise.all([
    deVehiculo('pendientes', id),
    deVehiculo('mantenimientos', id),
    deVehiculo('mejoras', id)
  ]);
  const abiertos = pendientes.filter((p) => p.estado !== 'hecho');
  const foto = await fotoUrl(v.fotoId);
  const avisos = [];
  const itv = diasHasta(v.itvHasta);
  const seguro = diasHasta(v.seguroHasta);
  if (itv != null && itv <= 30) avisos.push(itv < 0 ? `La ITV caducó el ${fmtFecha(v.itvHasta)}.` : `La ITV caduca en ${itv} días.`);
  if (seguro != null && seguro <= 30) avisos.push(seguro < 0 ? `El seguro caducó el ${fmtFecha(v.seguroHasta)}.` : `El seguro caduca en ${seguro} días.`);
  if (abiertos.length) avisos.push(`${abiertos.length} reparación${abiertos.length === 1 ? '' : 'es'} pendiente${abiertos.length === 1 ? '' : 's'}.`);

  const secciones = [
    ['ficha', 'Ficha', 'Datos, ITV, seguro y foto', ''],
    ['mantenimiento', 'Mantenimiento', 'Libro de taller', `${mantenimientos.length}`],
    ['pendientes', 'Pendientes', 'Lo que hay que hacer', `${abiertos.length}`],
    ['mejoras', 'Mejoras', 'Ideas y modificaciones', `${mejoras.length}`],
    ['tutoriales', 'Tutoriales', 'Enlaces de Instagram, Facebook…', ''],
    ['referencias', 'Referencias', 'Números de pieza', ''],
    ['documentos', 'Documentos', 'Manuales, facturas y papeles', '']
  ];

  app.innerHTML = `
    ${tope(nombreVehiculo(v), [v.matricula, fmtKm(v.km)].filter(Boolean).join(' · '), `
      <button class="btn secundario" data-accion="editar-vehiculo" data-id="${v.id}">Editar</button>
      ${v.estado === 'archivado'
        ? `<button class="btn suave" data-accion="activar-vehiculo" data-id="${v.id}">Volver a activos</button>`
        : `<button class="btn secundario" data-accion="archivar-vehiculo" data-id="${v.id}">Archivar</button>`}
    `)}
    ${foto ? `<div class="tarjeta" style="margin-bottom:16px"><div class="foto-vehiculo" style="height:180px"><img src="${foto}" alt=""></div></div>` : ''}
    ${avisos.length ? `<div class="avisos">${avisos.map((a) => `<div class="aviso">${esc(a)}</div>`).join('')}</div>` : '<div class="aviso ok">Nada urgente de momento.</div>'}
    <div class="hub">
      ${secciones.map(([ruta, titulo, desc, n]) => `
        <a class="baldosa" href="#/vehiculo/${v.id}/${ruta}">
          <strong>${titulo}</strong>
          <span>${desc}</span>
          ${n !== '' ? `<em>${n}</em>` : ''}
        </a>`).join('')}
    </div>`;
}

async function vistaFicha(id) {
  const v = await db.get('vehiculos', id);
  if (!v) return vistaGaraje();
  const filas = [
    ['Apodo', v.apodo], ['Marca', v.marca], ['Modelo', v.modelo], ['Año', v.anio],
    ['Tipo', v.tipo], ['Matrícula', v.matricula], ['VIN', v.vin], ['Color', v.color],
    ['Combustible', v.combustible], ['Kilómetros', fmtKm(v.km)], ['Potencia', v.potencia],
    ['Compra', fmtFecha(v.fechaCompra)], ['ITV hasta', fmtFecha(v.itvHasta)],
    ['Seguro hasta', fmtFecha(v.seguroHasta)], ['Compañía', v.seguroCompania],
    ['Taller', v.tallerHabitual], ['Estado', v.estado === 'archivado' ? 'Archivado' : 'Activo']
  ].filter(([, valor]) => valor);
  app.innerHTML = `
    ${tope(nombreVehiculo(v), 'Ficha')}
    <article class="tarjeta cuerpo-tarjeta">
      ${filas.map(([k, val]) => `<p class="meta"><strong>${esc(k)}:</strong> ${esc(val)}</p>`).join('') || '<p class="meta">Todavía no hay datos. Pulsa Editar.</p>'}
      ${v.notas ? `<p>${esc(v.notas)}</p>` : ''}
    </article>
    <p class="pie-app"><button class="btn" data-accion="editar-vehiculo" data-id="${v.id}">Editar ficha</button></p>`;
}

function formLista(kind, vehiculoId, item = {}) {
  const comun = `
    <input type="hidden" name="kind" value="${kind}">
    <input type="hidden" name="vehiculoId" value="${esc(vehiculoId)}">
    <input type="hidden" name="id" value="${esc(item.id || '')}">`;

  if (kind === 'mantenimientos') {
    return `<form class="formulario" data-form="item">${comun}
      ${campo('titulo', 'Qué se hizo', 'text', item.titulo || '')}
      <div class="dos">${campo('fecha', 'Fecha', 'date', item.fecha || hoy())}${campo('km', 'Kilómetros', 'number', item.km || '')}</div>
      <div class="dos">${select('tipo', 'Tipo', TIPOS_TALLER, item.tipo || 'Revisión')}${campo('coste', 'Coste (€)', 'number', item.coste || '', 'step="0.01"')}</div>
      ${campo('taller', 'Dónde', 'text', item.taller || '')}
      ${area('notas', 'Notas', item.notas || '')}
      <div class="acciones"><button type="button" class="btn secundario" data-cerrar>Cancelar</button><button class="btn">Guardar</button></div></form>`;
  }
  if (kind === 'pendientes') {
    return `<form class="formulario" data-form="item">${comun}
      ${campo('titulo', 'Qué hay que hacer', 'text', item.titulo || '')}
      <div class="dos">${select('prioridad', 'Prioridad', PRIORIDADES, item.prioridad || 'media')}${select('estado', 'Estado', ESTADOS_TAREA, item.estado || 'pendiente')}</div>
      ${campo('fechaPrevista', 'Para cuándo', 'date', item.fechaPrevista || '')}
      ${campo('enlace', 'Enlace del tutorial o anuncio', 'url', item.enlace || '', 'placeholder="https://"')}
      ${area('notas', 'Notas', item.notas || '')}
      <div class="acciones"><button type="button" class="btn secundario" data-cerrar>Cancelar</button><button class="btn">Guardar</button></div></form>`;
  }
  if (kind === 'mejoras') {
    return `<form class="formulario" data-form="item">${comun}
      ${campo('titulo', 'Mejora o idea', 'text', item.titulo || '')}
      <div class="dos">${select('estado', 'Estado', ESTADOS_MEJORA, item.estado || 'idea')}${campo('coste', 'Coste (€)', 'number', item.coste || '', 'step="0.01"')}</div>
      ${campo('enlace', 'Enlace', 'url', item.enlace || '', 'placeholder="https://"')}
      ${area('notas', 'Notas', item.notas || '')}
      <div class="acciones"><button type="button" class="btn secundario" data-cerrar>Cancelar</button><button class="btn">Guardar</button></div></form>`;
  }
  if (kind === 'tutoriales') {
    return `<form class="formulario" data-form="item">${comun}
      ${campo('titulo', 'Título', 'text', item.titulo || '')}
      ${campo('url', 'Enlace', 'url', item.url || '', 'placeholder="https://…" required')}
      ${select('plataforma', 'De dónde es', PLATAFORMAS, item.plataforma || 'instagram')}
      ${area('notas', 'Para qué sirve', item.notas || '')}
      <div class="acciones"><button type="button" class="btn secundario" data-cerrar>Cancelar</button><button class="btn">Guardar</button></div></form>`;
  }
  if (kind === 'referencias') {
    return `<form class="formulario" data-form="item">${comun}
      ${campo('numero', 'Número de referencia', 'text', item.numero || '')}
      ${campo('descripcion', 'Qué es', 'text', item.descripcion || '')}
      <div class="dos">${campo('sistema', 'Sistema', 'text', item.sistema || '', 'placeholder="Frenos, filtros…"')}${campo('proveedor', 'Dónde se compra', 'text', item.proveedor || '')}</div>
      ${area('notas', 'Notas', item.notas || '')}
      <div class="acciones"><button type="button" class="btn secundario" data-cerrar>Cancelar</button><button class="btn">Guardar</button></div></form>`;
  }
  return `<form class="formulario" data-form="item">${comun}
    ${campo('titulo', 'Título', 'text', item.titulo || '')}
    ${select('tipo', 'Tipo', TIPOS_DOC, item.tipo || 'Otro')}
    <div class="campo"><label for="archivo">Archivo (opcional)</label><input id="archivo" type="file"></div>
    ${area('notas', 'Notas', item.notas || '')}
    <div class="acciones"><button type="button" class="btn secundario" data-cerrar>Cancelar</button><button class="btn">Guardar</button></div></form>`;
}

async function guardarItem(form) {
  const kind = form.kind.value;
  const id = form.id.value || uid();
  const previo = form.id.value ? await db.get(kind, id) : {};
  const item = {
    ...previo,
    id,
    vehiculoId: form.vehiculoId.value,
    creadoEn: previo.creadoEn || new Date().toISOString()
  };
  for (const el of form.elements) {
    if (!el.name && el.id && el.id !== 'archivo' && el.id !== 'foto') item[el.id] = el.value;
  }
  if (kind === 'referencias') {
    item.titulo = item.numero || item.descripcion;
  }
  if (kind === 'documentos' && form.archivo?.files[0]) {
    item.archivoId = await guardarArchivo(form.archivo.files[0]);
    item.nombreArchivo = form.archivo.files[0].name;
  }
  await db.put(kind, item);
  cerrarCapa();
  await pintar();
}

const LISTAS = {
  mantenimiento: { store: 'mantenimientos', titulo: 'Mantenimiento', vacio: 'Cuando hagas una revisión o un cambio de aceite, anótalo aquí.', alta: 'Añadir entrada' },
  pendientes: { store: 'pendientes', titulo: 'Pendientes', vacio: 'Nada pendiente. Cuando veas algo que hay que hacer, apúntalo.', alta: 'Añadir pendiente' },
  mejoras: { store: 'mejoras', titulo: 'Mejoras', vacio: 'Ideas, piezas o cambios que te gustaría hacer.', alta: 'Añadir mejora' },
  tutoriales: { store: 'tutoriales', titulo: 'Tutoriales', vacio: 'Guarda el enlace de Instagram, Facebook o YouTube para abrirlo el día que lo hagas.', alta: 'Añadir enlace' },
  referencias: { store: 'referencias', titulo: 'Referencias', vacio: 'Números de pieza, filtros, pastillas…', alta: 'Añadir referencia' },
  documentos: { store: 'documentos', titulo: 'Documentos', vacio: 'Manual, facturas, ficha técnica o lo que quieras tener a mano.', alta: 'Añadir documento' }
};

function extraItem(kind, item) {
  if (kind === 'mantenimientos') return [fmtFecha(item.fecha), fmtKm(item.km), item.tipo, fmtEuro(item.coste)].filter(Boolean).join(' · ');
  if (kind === 'pendientes') return [item.prioridad, item.estado, fmtFecha(item.fechaPrevista)].filter(Boolean).join(' · ');
  if (kind === 'mejoras') return [item.estado, fmtEuro(item.coste)].filter(Boolean).join(' · ');
  if (kind === 'tutoriales') return item.plataforma || '';
  if (kind === 'referencias') return [item.descripcion, item.sistema, item.proveedor].filter(Boolean).join(' · ');
  return [item.tipo, item.nombreArchivo].filter(Boolean).join(' · ');
}

async function vistaLista(id, clave) {
  const v = await db.get('vehiculos', id);
  if (!v) return vistaGaraje();
  const def = LISTAS[clave];
  const items = await deVehiculo(def.store, id);
  app.innerHTML = `
    ${tope(nombreVehiculo(v), def.titulo, `<button class="btn" data-accion="nuevo-item" data-store="${def.store}" data-id="${id}">${def.alta}</button>`)}
    ${items.length ? `<div class="lista">${items.map((item) => tarjetaItem({
      ...item,
      titulo: item.titulo || item.numero || item.descripcion,
      _acciones: `
        ${item.archivoId ? `<button class="btn texto" data-accion="abrir-archivo" data-id="${item.archivoId}">Ver</button>` : ''}
        <button class="btn texto" data-accion="editar-item" data-store="${def.store}" data-item="${item.id}" data-id="${id}">Editar</button>
        <button class="btn texto" data-accion="borrar-item" data-store="${def.store}" data-item="${item.id}">Borrar</button>`
    }, extraItem(def.store, item))).join('')}</div>` : vacio(def.vacio, `<button class="btn" data-accion="nuevo-item" data-store="${def.store}" data-id="${id}">${def.alta}</button>`)}`;
}

async function vistaAjustes(aviso = '') {
  const enApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  app.innerHTML = `
    ${tope('Ajustes', 'Tu garaje se queda en este aparato')}
    ${aviso ? `<div class="aviso ok">${esc(aviso)}</div>` : ''}
    <article class="tarjeta cuerpo-tarjeta">
      <p>Lo que anotas es solo tuyo: vive en este teléfono o este ordenador, no en el de otra persona.</p>
      <p>De vez en cuando pulsa <strong>Guardar mis vehículos</strong>. Se crea un archivo en Descargas. Si un día cambias de aparato, pulsa <strong>Traer mis vehículos</strong> y elige ese archivo.</p>
      <p class="meta">En el iPhone, si se abre el archivo en vez de guardarse, pulsa Compartir y elige Guardar en Archivos.</p>
      <div class="acciones" style="justify-content:flex-start">
        <button class="btn" data-accion="exportar">Guardar mis vehículos</button>
        <label class="btn secundario">Traer mis vehículos<input id="importar" type="file" accept="application/json" hidden></label>
      </div>
    </article>
    ${enApp ? '' : `
    <article class="tarjeta cuerpo-tarjeta" style="margin-top:14px">
      <h3 style="margin:0 0 8px">En el teléfono</h3>
      <p>Ábrela en Safari (iPhone) o Chrome (Android) y déjala en la pantalla de inicio, como una app. Así se usa a pantalla completa y se conservan mejor los datos.</p>
      <p class="meta"><strong>iPhone:</strong> botón Compartir → Añadir a pantalla de inicio.</p>
      <p class="meta"><strong>Android:</strong> menú ⋮ → Instalar app o Añadir a pantalla de inicio.</p>
      <p class="meta">En el ordenador se abre igual, en el navegador.</p>
    </article>`}
  `;
}

async function blobABase64(blob) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(',')[1]);
    lector.onerror = reject;
    lector.readAsDataURL(blob);
  });
}

function base64ABlob(b64, mime) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}

async function exportar() {
  const datos = { version: 1, fecha: new Date().toISOString() };
  for (const nombre of db.almacenes) {
    const items = await db.todos(nombre);
    if (nombre === 'archivos') {
      datos.archivos = [];
      for (const archivo of items) {
        datos.archivos.push({
          id: archivo.id,
          mime: archivo.mime,
          nombre: archivo.nombre,
          blob: await blobABase64(archivo.blob)
        });
      }
    } else {
      datos[nombre] = items;
    }
  }
  const blob = new Blob([JSON.stringify(datos)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mis-vehiculos-${hoy()}.json`;
  a.click();
  await vistaAjustes('Listo. El archivo está en Descargas de este aparato. Es solo tuyo.');
}

async function importar(file) {
  const datos = JSON.parse(await file.text());
  for (const nombre of db.almacenes) {
    const actuales = await db.todos(nombre);
    for (const item of actuales) await db.del(nombre, item.id);
  }
  for (const nombre of db.almacenes) {
    if (nombre === 'archivos') {
      for (const archivo of datos.archivos || []) {
        await db.put('archivos', {
          id: archivo.id,
          mime: archivo.mime,
          nombre: archivo.nombre,
          blob: base64ABlob(archivo.blob, archivo.mime)
        });
      }
    } else {
      for (const item of datos[nombre] || []) await db.put(nombre, item);
    }
  }
  ir('#/');
}

async function pintar() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!partes.length) return vistaGaraje();
  if (partes[0] === 'ajustes') return vistaAjustes();
  if (partes[0] === 'vehiculo' && partes[1] && !partes[2]) return vistaVehiculo(partes[1]);
  if (partes[0] === 'vehiculo' && partes[2] === 'ficha') return vistaFicha(partes[1]);
  if (partes[0] === 'vehiculo' && LISTAS[partes[2]]) return vistaLista(partes[1], partes[2]);
  return vistaGaraje();
}

document.addEventListener('click', async (evento) => {
  const go = evento.target.closest('[data-go]');
  if (go) {
    evento.preventDefault();
    ir(go.dataset.go);
    return;
  }
  if (evento.target.closest('[data-cerrar]')) {
    cerrarCapa();
    return;
  }
  const boton = evento.target.closest('[data-accion]');
  if (!boton) return;
  const accion = boton.dataset.accion;
  if (accion === 'nuevo-vehiculo') panel('Nuevo vehículo', formVehiculo());
  if (accion === 'editar-vehiculo') panel('Editar vehículo', formVehiculo(await db.get('vehiculos', boton.dataset.id)));
  if (accion === 'archivar-vehiculo') {
    const v = await db.get('vehiculos', boton.dataset.id);
    if (v && confirm('Se archivará, pero no se borra su historial. ¿Continuar?')) {
      v.estado = 'archivado';
      await db.put('vehiculos', v);
      ir('#/');
    }
  }
  if (accion === 'activar-vehiculo') {
    const v = await db.get('vehiculos', boton.dataset.id);
    if (v) {
      v.estado = 'activo';
      await db.put('vehiculos', v);
      await pintar();
    }
  }
  if (accion === 'nuevo-item') panel('Añadir', formLista(boton.dataset.store, boton.dataset.id));
  if (accion === 'editar-item') panel('Editar', formLista(boton.dataset.store, boton.dataset.id, await db.get(boton.dataset.store, boton.dataset.item)));
  if (accion === 'borrar-item' && confirm('¿Borrar esta anotación?')) {
    await db.del(boton.dataset.store, boton.dataset.item);
    await pintar();
  }
  if (accion === 'abrir-archivo') {
    const archivo = await db.get('archivos', boton.dataset.id);
    if (archivo?.blob) window.open(URL.createObjectURL(archivo.blob), '_blank');
  }
  if (accion === 'exportar') exportar();
});

document.addEventListener('change', async (evento) => {
  if (evento.target.id === 'importar' && evento.target.files[0]) {
    if (confirm('Esto cambia los vehículos de esta pantalla por los del archivo. ¿Seguro?')) {
      await importar(evento.target.files[0]);
    }
  }
});

document.addEventListener('submit', async (evento) => {
  const form = evento.target;
  if (!(form instanceof HTMLFormElement)) return;
  evento.preventDefault();
  if (form.dataset.form === 'vehiculo') await guardarVehiculo(form);
  if (form.dataset.form === 'item') await guardarItem(form);
});

capa.addEventListener('click', (evento) => {
  if (evento.target === capa) cerrarCapa();
});

window.addEventListener('hashchange', pintar);

db.abrir().then(pintar);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
