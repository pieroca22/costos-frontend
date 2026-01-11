import { useState, useEffect } from 'react'

// URL base de tu backend (Asegúrate que sea la correcta)
const API_URL = 'https://costos-backend.onrender.com/api/insumos';

function App() {
  // --- ESTADOS ---
  const [dbInsumos, setDbInsumos] = useState([]) 
  const [itemsReceta, setItemsReceta] = useState([]) 

  const [mostrarModal, setMostrarModal] = useState(false)
  const [terminoBusqueda, setTerminoBusqueda] = useState('')
  const [modoCrearGlobal, setModoCrearGlobal] = useState(false) 
  const [modoEditarGlobal, setModoEditarGlobal] = useState(null) 
  
  // Estado del formulario (Ahora incluye tipoUnidad)
  // Tipos: 'PESO', 'VOLUMEN', 'UNIDAD'
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
    
    // Determinamos la unidad inicial según el tipo
    let unidadInicial = 'gr';
    if (insumo.tipoUnidad === 'VOLUMEN') unidadInicial = 'ml';
    if (insumo.tipoUnidad === 'UNIDAD') unidadInicial = 'un';

    // Si es antiguo y no tiene tipo, asumimos PESO
    const tipoReal = insumo.tipoUnidad || 'PESO';

    const nuevoItem = { 
      ...insumo, 
      cantidad: 0, 
      precioReceta: insumo.precioPorKg,
      tipoUnidad: tipoReal,
      unidadUso: unidadInicial // Aquí guardamos si está usando gr, kg, ml, L, etc.
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

  // Función mágica para cambiar de gr a Kg o ml a L al hacer clic
  const alternarUnidad = (id) => {
    const nuevosItems = itemsReceta.map(item => {
      if (item.id === id) {
        let nuevaUnidad = item.unidadUso;
        // Lógica de rotación
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

    // Factores de división según la unidad que esté usando el usuario
    if (item.unidadUso === 'gr' || item.unidadUso === 'ml') {
        return (cantidad * precio) / 1000;
    }
    // Si es kg, L o un, es directo (multiplicar por 1)
    return cantidad * precio;
  }

  const granTotal = itemsReceta.reduce((acc, item) => acc + calcularTotalFila(item), 0)

  // --- LÓGICA DE ALMACÉN ---
  const insumosFiltrados = dbInsumos.filter(item => 
    item.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase())
  )

  const guardarEnBD = () => {
    if (!formGlobal.nombre || !formGlobal.precioPorKg) return;
    const method = modoEditarGlobal ? 'PUT' : 'POST';
    const url = modoEditarGlobal ? `${API_URL}/${modoEditarGlobal}` : API_URL;

    const payload = { 
        nombre: formGlobal.nombre, 
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

  const eliminarDeBD = (e, id) => {
    e.stopPropagation();
    if (window.confirm("¿Eliminar permanentemente de la Base de Datos?")) {
      fetch(`${API_URL}/${id}`, { method: 'DELETE' }).then(() => cargarInventario())
    }
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
    width: '100vw', height: '100vh', backgroundColor: '#f0f2f5',
    display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  }

  const appFrameStyle = {
    width: '100%', maxWidth: '480px', height: '100%', maxHeight: '900px',
    backgroundColor: '#fff', borderRadius: window.innerWidth > 480 ? '25px' : '0px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.15)', overflow: 'hidden', position: 'relative',
    display: 'flex', flexDirection: 'column',
  }

  // Helper para mostrar etiqueta bonita
  const getLabelPrecio = (tipo) => {
      if (tipo === 'VOLUMEN') return 'Precio x Litro';
      if (tipo === 'UNIDAD') return 'Precio x Unidad';
      return 'Precio x Kg'; // Default PESO
  }

  return (
    <div style={containerStyle}>
      <div style={appFrameStyle} className="app-frame">
        
        {/* HEADER */}
        <div className="bg-primary text-white p-4 text-center shadow-sm" style={{flexShrink: 0}}>
          <h4 className="fw-bold mb-0">🍰 Costos Repostería</h4>
          <p className="small opacity-75 mb-0">Calculadora de Recetas</p>
        </div>

        {/* CONTENIDO PRINCIPAL SCROLLABLE */}
        <div className="flex-grow-1 p-3 overflow-auto" style={{paddingBottom: '100px'}}>
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
                    
                    {/* Nombre y Precio Unitario */}
                    <div style={{flex: 1}}>
                      <h6 className="fw-bold mb-1 text-dark">{item.nombre}</h6>
                      <div className="d-flex align-items-center gap-1">
                        {/* Etiqueta dinámica: Precio x kg, x L, etc */}
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

                    {/* Input de Cantidad con Unidad Clickable */}
                    <div className="mx-2 text-center" style={{width: '80px'}}>
                      <input 
                        type="number" 
                        className="form-control text-center bg-light border-0 fw-bold"
                        placeholder="0"
                        value={item.cantidad || ''}
                        onChange={(e) => actualizarItemReceta(item.id, 'cantidad', e.target.value)}
                        style={{fontSize: '1.1rem'}}
                      />
                      {/* UNIDAD CLICKABLE (Lo que pediste) */}
                      <small 
                        className="text-muted fw-bold" 
                        style={{fontSize: '0.75rem', cursor: item.tipoUnidad !== 'UNIDAD' ? 'pointer' : 'default', userSelect: 'none'}}
                        onClick={() => alternarUnidad(item.id)}
                      >
                        {item.unidadUso}
                        {item.tipoUnidad !== 'UNIDAD' && <span style={{fontSize:'0.6rem'}}> ↻</span>}
                      </small>
                    </div>

                    {/* Subtotal y Eliminar */}
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
            </div>
          )}
        </div>

        {/* FOOTER TOTAL */}
        <div className="bg-white border-top p-3 shadow-lg d-flex justify-content-between align-items-center" 
             style={{position: 'absolute', bottom: 0, width: '100%', zIndex: 100}}>
          <span className="text-muted fw-bold">TOTAL FINAL:</span>
          <span className="text-success fw-bolder fs-2">S/ {granTotal.toFixed(2)}</span>
        </div>

        {/* BOTÓN FLOTANTE (+) */}
        <button 
          className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
          style={{ position: 'absolute', bottom: '90px', right: '20px', width: '60px', height: '60px', zIndex: 105, fontSize: '2rem' }}
          onClick={() => {
            setMostrarModal(true);
            setModoCrearGlobal(false);
            setTerminoBusqueda('');
          }}
        >
          +
        </button>

      </div>

      {/* --- MODAL --- */}
      {mostrarModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)'}}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable mx-auto" style={{maxWidth: '450px', width: '95%'}}>
            <div className="modal-content rounded-4 shadow-lg border-0" style={{height: 'auto', maxHeight: '80vh'}}>
              
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-primary">
                  {modoCrearGlobal ? 'Nuevo Insumo' : 'Buscar Insumo'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setMostrarModal(false)}></button>
              </div>

              <div className="modal-body">
                {modoCrearGlobal ? (
                  <div className="p-2">
                      {/* Nombre */}
                      <div className="form-floating mb-3">
                        <input type="text" className="form-control rounded-3" id="floatingName" placeholder="Nombre" autoFocus
                          value={formGlobal.nombre} onChange={e => setFormGlobal({...formGlobal, nombre: e.target.value})} />
                        <label htmlFor="floatingName">Nombre del Insumo</label>
                      </div>

                      {/* Combo de Tipo y Precio */}
                      <div className="mb-4">
                          <label className="form-label small text-muted ms-1">Tipo de Medida</label>
                          <div className="input-group">
                            {/* EL COMBO DE TRES PARTES */}
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
                        <button className="btn btn-primary btn-lg rounded-pill shadow-sm" onClick={guardarEnBD}>Guardar Insumo</button>
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
                              onClick={(e) => eliminarDeBD(e, insumo.id)}>🗑️</button>
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
    </div>
  )
}

export default App