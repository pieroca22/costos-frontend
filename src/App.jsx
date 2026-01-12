import { useState, useEffect } from 'react'

// URL base de tu backend
const API_URL = 'https://costos-backend.onrender.com/api/insumos';

function App() {
  // --- ESTADOS ---
  const [dbInsumos, setDbInsumos] = useState([]) 
  const [itemsReceta, setItemsReceta] = useState([]) 

  const [mostrarModal, setMostrarModal] = useState(false)
  const [terminoBusqueda, setTerminoBusqueda] = useState('')
  const [modoCrearGlobal, setModoCrearGlobal] = useState(false) 
  const [modoEditarGlobal, setModoEditarGlobal] = useState(null) 
  const [idAEliminar, setIdAEliminar] = useState(null)

  const [formGlobal, setFormGlobal] = useState({ 
    nombre: '', 
    precioPorKg: '', 
    tipoUnidad: 'PESO' 
  })

  // --- CARGA INICIAL ---
  const cargarInventario = () => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setDbInsumos(data))
      .catch(console.error)
  }

  useEffect(() => { cargarInventario() }, [])

  // --- LÓGICA DE RECETA ---
  const agregarAReceta = (insumo) => {
    if (itemsReceta.find(item => item.id === insumo.id)) return; 
    
    let unidadInicial = 'gr';
    if (insumo.tipoUnidad === 'VOLUMEN') unidadInicial = 'ml';
    if (insumo.tipoUnidad === 'UNIDAD') unidadInicial = 'un';

    const tipoReal = insumo.tipoUnidad || 'PESO';

    const nuevoItem = { 
      ...insumo, 
      cantidad: 0, 
      precioReceta: insumo.precioPorKg,
      tipoUnidad: tipoReal,
      unidadUso: unidadInicial
    }
    setItemsReceta([...itemsReceta, nuevoItem])
    setMostrarModal(false)
  }

  const quitarDeReceta = (id) => {
    setItemsReceta(itemsReceta.filter(item => item.id !== id))
  }

  const actualizarItemReceta = (id, campo, valor) => {
    const nuevosItems = itemsReceta.map(item => {
      if (item.id === id) return { ...item, [campo]: valor }
      return item
    })
    setItemsReceta(nuevosItems)
  }

  const alternarUnidad = (id) => {
    const nuevosItems = itemsReceta.map(item => {
      if (item.id === id) {
        let nuevaUnidad = item.unidadUso;
        if (item.tipoUnidad === 'PESO') {
            nuevaUnidad = item.unidadUso === 'gr' ? 'kg' : 'gr';
        } else if (item.tipoUnidad === 'VOLUMEN') {
            nuevaUnidad = item.unidadUso === 'ml' ? 'L' : 'ml';
        }
        return { ...item, unidadUso: nuevaUnidad }
      }
      return item
    })
    setItemsReceta(nuevosItems)
  }

  const calcularTotalFila = (item) => {
    const cantidad = parseFloat(item.cantidad) || 0;
    const precio = parseFloat(item.precioReceta) || 0;
    if (item.unidadUso === 'gr' || item.unidadUso === 'ml') {
        return (cantidad * precio) / 1000;
    }
    return cantidad * precio;
  }

  const granTotal = itemsReceta.reduce((acc, item) => acc + calcularTotalFila(item), 0)

  // --- LÓGICA DE ALMACÉN Y CRUD ---
  const insumosFiltrados = dbInsumos.filter(item => {
      const coincideTexto = item.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase());
      const yaEstaEnReceta = itemsReceta.some(recetaItem => recetaItem.id === item.id);
      return coincideTexto && !yaEstaEnReceta;
  })

  // --- LIMPIEZA DE TEXTO ---
  const limpiarTexto = (texto) => {
    if (!texto) return '';
    const textoLimpio = texto.replace(/\s+/g, ' ').trim();
    if (textoLimpio.length === 0) return '';
    return textoLimpio.charAt(0).toUpperCase() + textoLimpio.slice(1);
  }

  const handleBlurNombre = () => {
      const nombreCorregido = limpiarTexto(formGlobal.nombre);
      setFormGlobal(prev => ({ ...prev, nombre: nombreCorregido }));
  }

  const guardarEnBD = () => {
    if (!formGlobal.nombre || !formGlobal.precioPorKg) return;
    const nombreFinal = limpiarTexto(formGlobal.nombre);
    const method = modoEditarGlobal ? 'PUT' : 'POST';
    const url = modoEditarGlobal ? `${API_URL}/${modoEditarGlobal}` : API_URL;

    const payload = { 
        nombre: nombreFinal, 
        precioPorKg: parseFloat(formGlobal.precioPorKg),
        tipoUnidad: formGlobal.tipoUnidad
    };

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => {
      cargarInventario();
      setModoCrearGlobal(false); 
      setModoEditarGlobal(null); 
      setFormGlobal({ nombre: '', precioPorKg: '', tipoUnidad: 'PESO' });
    })
  }

  const pedirConfirmacionEliminar = (e, id) => {
    e.stopPropagation();
    setIdAEliminar(id);
  }

  const confirmarEliminacion = () => {
    if (!idAEliminar) return;
    fetch(`${API_URL}/${idAEliminar}`, { method: 'DELETE' })
      .then(() => {
          cargarInventario();
          setIdAEliminar(null);
      })
  }

  const activarEdicionGlobal = (e, item) => {
    e.stopPropagation();
    setModoEditarGlobal(item.id);
    setFormGlobal({ 
        nombre: item.nombre, 
        precioPorKg: item.precioPorKg,
        tipoUnidad: item.tipoUnidad || 'PESO'
    });
    setModoCrearGlobal(true);
  }

  // --- ESTILOS VISUALES ---
  const containerStyle = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: '#f0f2f5',
    display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  }

  const appFrameStyle = {
    width: '100%', maxWidth: '480px', height: '100%',
    backgroundColor: '#fff', 
    borderRadius: window.innerWidth > 480 ? '25px' : '0px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.15)', 
    overflow: 'hidden', 
    position: 'relative',
    display: 'flex', flexDirection: 'column',
  }

  const getLabelPrecio = (tipo) => {
      if (tipo === 'VOLUMEN') return 'Precio x Litro';
      if (tipo === 'UNIDAD') return 'Precio x Unidad';
      return 'Precio x Kg'; 
  }

  return (
    <div style={containerStyle}>
      <div style={appFrameStyle} className="app-frame">
        
        {/* HEADER */}
        <div className="bg-primary text-white p-4 text-center shadow-sm" style={{flexShrink: 0}}>
          <h4 className="fw-bold mb-0">🍰 Costos Repostería</h4>
          <p className="small opacity-75 mb-0">Calculadora de Recetas</p>
        </div>

        {/* LISTA RECETA */}
        {/* Quitamos el paddingBottom de aquí y usamos el DIV espaciador abajo */}
        <div className="flex-grow-1 p-3 overflow-auto">
          {itemsReceta.length === 0 ? (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted opacity-50">
              <span style={{fontSize: '3rem'}}>🥣</span>
              <p className="mt-2">Lista vacía</p>
              <small>Presiona + para agregar ingredientes</small>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {itemsReceta.map(item => (
                <div key={item.id} className="card border-0 shadow-sm rounded-4 overflow-hidden">
                  <div className="card-body p-3 d-flex align-items-center justify-content-between">
                    <div style={{flex: 1}}>
                      <h6 className="fw-bold mb-1 text-dark">{item.nombre}</h6>
                      <div className="d-flex align-items-center gap-1">
                        <small className="text-muted" style={{fontSize: '0.70rem'}}>
                             {item.tipoUnidad === 'VOLUMEN' ? 'Precio x L' : 
                              item.tipoUnidad === 'UNIDAD' ? 'Precio x Un' : 
                              'Precio x Kg'}:
                        </small>
                        <input 
                          type="number"
                          className="form-control form-control-sm border-0 p-0 bg-transparent text-primary fw-bold"
                          style={{width: '60px', fontSize: '0.85rem'}}
                          value={item.precioReceta}
                          onChange={(e) => actualizarItemReceta(item.id, 'precioReceta', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mx-2 text-center" style={{width: '80px'}}>
                      <input 
                        type="number" 
                        className="form-control text-center bg-light border-0 fw-bold"
                        placeholder="0"
                        value={item.cantidad || ''}
                        onChange={(e) => actualizarItemReceta(item.id, 'cantidad', e.target.value)}
                        style={{fontSize: '1.1rem'}}
                      />
                      <small 
                        className="text-muted fw-bold" 
                        style={{fontSize: '0.75rem', cursor: item.tipoUnidad !== 'UNIDAD' ? 'pointer' : 'default', userSelect: 'none'}}
                        onClick={() => alternarUnidad(item.id)}
                      >
                        {item.unidadUso}
                        {item.tipoUnidad !== 'UNIDAD' && <span style={{fontSize:'0.6rem'}}> ↻</span>}
                      </small>
                    </div>
                    <div className="text-end" style={{minWidth: '70px'}}>
                      <div className="fw-bold text-dark fs-6">
                        {calcularTotalFila(item).toFixed(2)}
                      </div>
                      <button className="btn btn-link text-danger p-0 text-decoration-none small" 
                        style={{fontSize: '0.7rem'}} 
                        onClick={() => quitarDeReceta(item.id)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* --- ESPACIADOR INVISIBLE --- */}
              {/* Este div empuja la lista hacia arriba para que el último ítem quede libre */}
              <div style={{height: '150px', width: '100%', flexShrink: 0}}></div>

            </div>
          )}
        </div>

        {/* FOOTER TOTAL */}
        <div className="bg-white border-top p-3 shadow-lg d-flex justify-content-between align-items-center" 
             style={{flexShrink: 0, zIndex: 100}}>
          <span className="text-muted fw-bold">TOTAL FINAL:</span>
          <span className="text-success fw-bolder fs-2">S/ {granTotal.toFixed(2)}</span>
        </div>

        {/* BOTÓN FLOTANTE (+) */}
        <button 
          className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
          style={{ 
              position: 'absolute', 
              bottom: '100px', // Un poco más arriba para centrarse en el espacio vacío
              right: '20px', 
              width: '60px', height: '60px', 
              zIndex: 105, fontSize: '2rem' 
          }}
          onClick={() => {
            setMostrarModal(true);
            setModoCrearGlobal(false);
            setTerminoBusqueda('');
          }}
        >
          +
        </button>

      </div>

      {/* --- MODAL PRINCIPAL --- */}
      {mostrarModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)'}}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable mx-auto" style={{maxWidth: '450px', width: '95%'}}>
            <div className="modal-content rounded-4 shadow-lg border-0" style={{height: 'auto', maxHeight: '80vh'}}>
              
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-primary">
                  {modoCrearGlobal 
                    ? (modoEditarGlobal ? 'Modificar Insumo' : 'Nuevo Insumo') 
                    : 'Buscar Insumo'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setMostrarModal(false)}></button>
              </div>

              <div className="modal-body">
                {modoCrearGlobal ? (
                  <div className="p-2">
                      <div className="form-floating mb-3">
                        <input type="text" className="form-control rounded-3" id="floatingName" placeholder="Nombre" autoFocus
                          value={formGlobal.nombre} 
                          onChange={e => setFormGlobal({...formGlobal, nombre: e.target.value})}
                          onBlur={handleBlurNombre} 
                        />
                        <label htmlFor="floatingName">Nombre del Insumo</label>
                      </div>

                      <div className="mb-4">
                          <label className="form-label small text-muted ms-1">Tipo de Medida</label>
                          <div className="input-group">
                            <select 
                                className="form-select bg-light fw-bold" 
                                value={formGlobal.tipoUnidad}
                                onChange={e => setFormGlobal({...formGlobal, tipoUnidad: e.target.value})}
                            >
                                <option value="PESO">Peso (Kg/gr)</option>
                                <option value="VOLUMEN">Volumen (Lt/ml)</option>
                                <option value="UNIDAD">Unidad (pza)</option>
                            </select>
                          </div>
                      </div>

                      <div className="form-floating mb-4">
                        <input type="number" className="form-control rounded-3" id="floatingPrice" placeholder="Precio"
                          value={formGlobal.precioPorKg} onChange={e => setFormGlobal({...formGlobal, precioPorKg: e.target.value})} />
                        <label htmlFor="floatingPrice">{getLabelPrecio(formGlobal.tipoUnidad)}</label>
                      </div>

                      <div className="d-grid gap-2">
                        <button className="btn btn-primary btn-lg rounded-pill shadow-sm" onClick={guardarEnBD}>
                            {modoEditarGlobal ? 'Guardar Cambios' : 'Guardar Insumo'}
                        </button>
                        <button className="btn btn-light btn-lg rounded-pill" onClick={() => { setModoCrearGlobal(false); setModoEditarGlobal(null); }}>Cancelar</button>
                      </div>
                  </div>
                ) : (
                  <>
                    <div className="input-group input-group-lg mb-4 shadow-sm rounded-pill overflow-hidden border">
                      <span className="input-group-text bg-white border-0 ps-3">🔍</span>
                      <input 
                        type="text" 
                        className="form-control border-0" 
                        placeholder="Buscar..." 
                        value={terminoBusqueda}
                        onChange={(e) => setTerminoBusqueda(e.target.value)}
                      />
                    </div>

                    <div className="d-grid gap-2 mb-3">
                        <button className="btn btn-outline-primary rounded-pill border-dashed"
                        onClick={() => { setModoCrearGlobal(true); setFormGlobal({nombre:'', precioPorKg:'', tipoUnidad: 'PESO'}); }}>
                        + Crear Nuevo Insumo
                      </button>
                    </div>

                    <div className="list-group list-group-flush">
                      {insumosFiltrados.length === 0 && (
                          <div className="text-center text-muted p-3">
                              {terminoBusqueda ? 'No se encontraron insumos' : 'Escribe para buscar...'}
                          </div>
                      )}

                      {insumosFiltrados.map(insumo => (
                        <div key={insumo.id} 
                             className="list-group-item d-flex justify-content-between align-items-center py-3 border-bottom-0 rounded-3 mb-2 bg-light-hover"
                             onClick={() => agregarAReceta(insumo)}
                             style={{cursor: 'pointer', transition: 'background 0.2s'}}
                             onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                             onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <div>
                            <div className="fw-bold text-dark">{insumo.nombre}</div>
                            <div className="small text-muted">
                                S/ {insumo.precioPorKg} x {insumo.tipoUnidad === 'VOLUMEN' ? 'Litro' : insumo.tipoUnidad === 'UNIDAD' ? 'Unidad' : 'Kg'}
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-light rounded-circle shadow-sm text-primary" 
                              onClick={(e) => activarEdicionGlobal(e, insumo)}>✏️</button>
                            <button className="btn btn-sm btn-light rounded-circle shadow-sm text-danger" 
                              onClick={(e) => pedirConfirmacionEliminar(e, insumo.id)}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMACIÓN DE ELIMINAR --- */}
      {idAEliminar && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060}}>
          <div className="modal-dialog modal-dialog-centered mx-auto" style={{maxWidth: '350px', width: '90%'}}>
            <div className="modal-content rounded-4 shadow-lg border-0 p-3 text-center">
              <div className="modal-body">
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🗑️</div>
                <h5 className="fw-bold mb-2">¿Eliminar Insumo?</h5>
                <p className="text-muted small mb-4">
                  Esta acción no se puede deshacer y borrará el insumo de tu base de datos permanentemente.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <button className="btn btn-light rounded-pill px-4 fw-bold" onClick={() => setIdAEliminar(null)}>
                    Cancelar
                  </button>
                  <button className="btn btn-danger rounded-pill px-4 fw-bold" onClick={confirmarEliminacion}>
                    Sí, Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App