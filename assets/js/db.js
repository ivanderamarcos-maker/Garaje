const NOMBRE = 'garaje';
const VERSION = 1;
const ALMACENES = [
  'vehiculos',
  'mantenimientos',
  'pendientes',
  'mejoras',
  'tutoriales',
  'referencias',
  'documentos',
  'archivos'
];

let conexion;

function abrir() {
  if (conexion) return Promise.resolve(conexion);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOMBRE, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const nombre of ALMACENES) {
        if (!db.objectStoreNames.contains(nombre)) {
          const store = db.createObjectStore(nombre, { keyPath: 'id' });
          if (nombre !== 'vehiculos' && nombre !== 'archivos') {
            store.createIndex('vehiculoId', 'vehiculoId');
          }
        }
      }
    };
    req.onsuccess = () => {
      conexion = req.result;
      resolve(conexion);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(nombre, modo = 'readonly') {
  return abrir().then((db) => db.transaction(nombre, modo).objectStore(nombre));
}

export const db = {
  abrir,
  almacenes: ALMACENES,
  todos(nombre) {
    return tx(nombre).then((store) => new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }));
  },
  get(nombre, id) {
    return tx(nombre).then((store) => new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    }));
  },
  put(nombre, valor) {
    return tx(nombre, 'readwrite').then((store) => new Promise((resolve, reject) => {
      const req = store.put(valor);
      req.onsuccess = () => resolve(valor);
      req.onerror = () => reject(req.error);
    }));
  },
  del(nombre, id) {
    return tx(nombre, 'readwrite').then((store) => new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }
};
