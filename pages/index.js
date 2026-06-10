import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthGuard'

const G = { 50:'#EAF3DE',100:'#C0DD97',200:'#97C459',400:'#639922',600:'#3B6D11',800:'#27500A',900:'#173404' }
const COMIDAS = ['Desayuno','Almuerzo','Merienda','Cena']
const COMIDAS_COL = { Desayuno:'desayuno',Almuerzo:'almuerzo',Merienda:'merienda',Cena:'cena' }
const DIAS_L = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
const DIAS_C = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CATEGORIAS = {
  general:    { label:'General',    emoji:'📌', color:'#639922', bg:'#EAF3DE' },
  bloodbowl:  { label:'Blood Bowl', emoji:'🏈', color:'#b91c1c', bg:'#fee2e2' },
  futbol:     { label:'Fútbol',     emoji:'⚽', color:'#1d4ed8', bg:'#dbeafe' },
  quedada:    { label:'Quedada',    emoji:'👥', color:'#7c3aed', bg:'#ede9fe' },
}

const toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayISO = () => toISO(new Date())

const EVENTOS_RECURRENTES = [
  { prefix:'rec-futbol-jue', title:'Futbol Rulo', dow:4, time:'20:00', categoria:'futbol' },
  { prefix:'rec-futbol-lun', title:'Oficinastas', dow:1, time:'20:30', categoria:'futbol' },
]
function generarRecurrentes() {
  const desde = new Date(); desde.setMonth(desde.getMonth() - 3)
  const hasta = new Date(); hasta.setMonth(hasta.getMonth() + 9)
  const hastaISO = toISO(hasta)
  const events = []
  for (const r of EVENTOS_RECURRENTES) {
    const cur = new Date(desde)
    while (toISO(cur) <= hastaISO) {
      if (cur.getDay() === r.dow) {
        const d = toISO(cur)
        events.push({ id:`${r.prefix}-${d}`, title:r.title, date:d, time:r.time, categoria:r.categoria, type:r.categoria, recurrente:true })
      }
      cur.setDate(cur.getDate() + 1)
    }
  }
  return events
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}
const fmtShort = d => { if(!d)return''; const dt=new Date(d+'T12:00:00'); return `${dt.getDate()} ${MESES[dt.getMonth()]}` }
const fmtFull  = d => { if(!d)return''; const dt=new Date(d+'T12:00:00'); return `${dt.getDate()} de ${MESES[dt.getMonth()]} de ${dt.getFullYear()}` }

const card = { background:'white', border:`1px solid ${G[100]}`, borderRadius:12, padding:'1rem 1.25rem' }
const btnPrimary = { background:G[600], color:'white', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:14, fontWeight:500, display:'inline-flex', alignItems:'center', gap:6 }
const btnSecondary = { background:'white', color:G[600], border:`1px solid ${G[200]}`, borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:14 }

export default function Home() {
  const { user } = useAuth()
  const [view, setView] = useState('hoy')
  const [data, setData] = useState({ tareas:[], eventos:[], quedadas:[], menu:{} })
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isMobile = useIsMobile()

  useEffect(() => { cargarTodo() }, [])

  const cargarTodo = async () => {
    try {
      setLoading(true)
      const [t,e,q,m] = await Promise.all([
        supabase.from('dv_tasks').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('dv_events').select('*').eq('user_id', user.id).order('date'),
        supabase.from('dv_habits').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('dv_meals').select('*').eq('user_id', user.id),
      ])
      const menuObj = {}
      m.data?.forEach(row => { menuObj[row.date] = { Desayuno:row.desayuno||'', Almuerzo:row.almuerzo||'', Merienda:row.merienda||'', Cena:row.cena||'' } })
      setData({ tareas:t.data||[], eventos:[...(e.data||[]).map(ev => ({...ev, categoria:ev.type||'general'})), ...generarRecurrentes()], quedadas:q.data||[], menu:menuObj })
    } catch(err) { setError('Error al conectar con la base de datos') }
    finally { setLoading(false) }
  }

  const addTask = async (text) => {
    const uid = user?.id
    if(!uid) return
    const { data:nueva } = await supabase.from('dv_tasks').insert({ text, done:false, date:todayISO(), user_id:uid }).select().single()
    if(nueva) setData(d => ({ ...d, tareas:[...d.tareas, nueva] }))
  }
  const toggleTask = async (id, done) => {
    await supabase.from('dv_tasks').update({ done:!done }).eq('id',id).eq('user_id',user.id)
    setData(d => ({ ...d, tareas:d.tareas.map(t => t.id===id ? {...t,done:!done} : t) }))
  }
  const deleteTask = async (id) => {
    await supabase.from('dv_tasks').delete().eq('id',id).eq('user_id',user.id)
    setData(d => ({ ...d, tareas:d.tareas.filter(t => t.id!==id) }))
  }

  const saveEvento = async (form) => {
    const uid = user?.id
    if(!uid) throw new Error('No hay sesión activa')
    const dbFields = {
      title: form.title,
      date: form.date,
      time: form.time || null,
      place: form.place || null,
      type: form.categoria || 'general',
      notes: form.notes || null,
    }
    if(form.id) {
      const { data:updated, error } = await supabase.from('dv_events').update({ ...dbFields, user_id:uid }).eq('id',form.id).eq('user_id',uid).select().single()
      if(error) throw new Error(error.message)
      if(updated) setData(d => ({ ...d, eventos:d.eventos.map(e => e.id===form.id ? {...updated, categoria:updated.type||'general'} : e) }))
    } else {
      const { data:nuevo, error } = await supabase.from('dv_events').insert({ ...dbFields, user_id:uid }).select().single()
      if(error) throw new Error(error.message)
      if(nuevo) setData(d => ({ ...d, eventos:[...d.eventos, {...nuevo, categoria:nuevo.type||'general'}] }))
    }
  }
  const deleteEvento = async (id) => {
    await supabase.from('dv_events').delete().eq('id',id).eq('user_id',user.id)
    setData(d => ({ ...d, eventos:d.eventos.filter(e => e.id!==id) }))
  }
  const toggleEvento = async (id, completed) => {
    if (typeof id === 'string' && id.startsWith('rec-')) return
    await supabase.from('dv_events').update({ completed:!completed }).eq('id',id).eq('user_id',user.id)
    setData(d => ({ ...d, eventos:d.eventos.map(e => e.id===id ? {...e, completed:!completed} : e) }))
  }

  const saveQuedada = async (form) => {
    const uid = user?.id
    if(!uid) throw new Error('No hay sesión activa')
    const dbFields = {
      title: form.title,
      date: form.date || null,
      time: form.time || null,
      place: form.place || null,
      people: form.people || null,
      status: form.status || 'pendiente',
      notes: form.notes || null,
    }
    if(form.id) {
      const { data:updated, error } = await supabase.from('dv_habits').update({ ...dbFields, user_id:uid }).eq('id',form.id).eq('user_id',uid).select().single()
      if(error) throw new Error(error.message)
      if(updated) setData(d => ({ ...d, quedadas:d.quedadas.map(q => q.id===form.id ? {...q, ...updated} : q) }))
    } else {
      const { data:nueva, error } = await supabase.from('dv_habits').insert({ ...dbFields, user_id:uid }).select().single()
      if(error) throw new Error(error.message)
      if(nueva) setData(d => ({ ...d, quedadas:[...d.quedadas, nueva] }))
    }
  }
  const deleteQuedada = async (id) => {
    await supabase.from('dv_habits').delete().eq('id',id).eq('user_id',user.id)
    setData(d => ({ ...d, quedadas:d.quedadas.filter(q => q.id!==id) }))
  }
  const cycleStatus = async (id, status) => {
    const ss=['pendiente','confirmada','cancelada']
    const next=ss[(ss.indexOf(status||'pendiente')+1)%ss.length]
    setData(d => ({ ...d, quedadas:d.quedadas.map(q => q.id===id ? {...q,status:next} : q) }))
    await supabase.from('dv_habits').update({ status:next }).eq('id',id).eq('user_id',user.id)
  }

  const setMeal = async (date, comida, valor) => {
    setData(d => ({ ...d, menu:{ ...d.menu, [date]:{ ...(d.menu[date]||{}), [comida]:valor } } }))
    await supabase.from('dv_meals').upsert({ date, user_id:user.id, [COMIDAS_COL[comida]]:valor||null }, { onConflict:'date,user_id' })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if(loading) return <LoadingScreen/>
  if(error)   return <ErrorScreen mensaje={error} onRetry={cargarTodo}/>

  const T = todayISO()
  const NAV = [
    { id:'hoy',        emoji:'🏠', label:'Hoy'        },
    { id:'calendario', emoji:'📅', label:'Calendario' },
    { id:'bloodbowl',  emoji:'🏈', label:'Blood Bowl' },
    { id:'futbol',     emoji:'⚽', label:'Fútbol'     },
    { id:'quedadas',   emoji:'👥', label:'Quedadas'   },
    { id:'menu',       emoji:'🥗', label:'Menú'       },
  ]

  return (
    <>
      <Head><title>Mi Planner 🌿</title><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
      <div style={{ display:'flex', minHeight:'100vh' }}>

        {/* SIDEBAR — solo desktop */}
        {!isMobile && (
          <aside style={{ width:200, background:G[600], display:'flex', flexDirection:'column', flexShrink:0 }}>
            <div style={{ padding:'1.5rem 1.25rem 1rem', borderBottom:`1px solid ${G[800]}60` }}>
              <div style={{ color:G[50], fontSize:18, fontWeight:600 }}>🌿 Mi Planner</div>
              <div style={{ color:G[200], fontSize:12, marginTop:4 }}>{fmtFull(T)}</div>
            </div>
            <nav style={{ flex:1, paddingTop:8 }}>
              {NAV.map(n => (
                <button key={n.id} onClick={() => { setView(n.id); setModal(null) }} style={{
                  display:'flex', alignItems:'center', gap:10, width:'100%',
                  padding:'0.65rem 1.25rem', border:'none', cursor:'pointer', textAlign:'left',
                  background: view===n.id ? G[800] : 'transparent',
                  color: view===n.id ? G[50] : G[100], fontSize:14, fontFamily:'inherit',
                  borderLeft: view===n.id ? `4px solid ${G[100]}` : '4px solid transparent',
                }}>
                  <span style={{ fontSize:16 }}>{n.emoji}</span>{n.label}
                </button>
              ))}
            </nav>
            <div style={{ padding:'1rem', borderTop:`1px solid ${G[800]}50` }}>
              <div style={{ fontSize:11, color:G[400], textAlign:'center', marginBottom:8, wordBreak:'break-all' }}>
                {user.email}
              </div>
              <button onClick={handleLogout} style={{
                width:'100%', padding:'7px', border:`1px solid ${G[800]}60`,
                borderRadius:8, cursor:'pointer', background:'transparent',
                color:G[200], fontSize:13, fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              }}>
                ↩ Cerrar sesión
              </button>
            </div>
          </aside>
        )}

        {/* CONTENIDO PRINCIPAL */}
        <main style={{
          flex:1,
          padding: isMobile ? '1rem' : '2rem',
          background:'#f0f7ea',
          overflowY:'auto',
          paddingBottom: isMobile ? '80px' : '2rem'
        }}>
          {/* Header mobile */}
          {isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem', paddingBottom:'0.75rem', borderBottom:`1px solid ${G[100]}` }}>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:G[800] }}>🌿 Mi Planner</div>
                <div style={{ fontSize:11, color:G[400] }}>{fmtFull(T)}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:14, fontWeight:500, color:G[600] }}>
                  {NAV.find(n => n.id===view)?.emoji} {NAV.find(n => n.id===view)?.label}
                </span>
                <button onClick={handleLogout} style={{ border:'none', background:'none', cursor:'pointer', fontSize:13, color:G[400] }}>↩</button>
              </div>
            </div>
          )}

          {view==='hoy'        && <HoyView        data={data} T={T} addTask={addTask} toggleTask={toggleTask} deleteTask={deleteTask} setModal={setModal} isMobile={isMobile}/>}
          {view==='calendario' && <CalendarioView  data={data} T={T} setModal={setModal} isMobile={isMobile} toggleEvento={toggleEvento}/>}
          {view==='bloodbowl'  && <AgendaView      data={data} T={T} setModal={setModal} deleteEvento={deleteEvento} filtro="bloodbowl"/>}
          {view==='futbol'     && <AgendaView      data={data} T={T} setModal={setModal} deleteEvento={deleteEvento} filtro="futbol"/>}
          {view==='quedadas'   && <QuedadasView    data={data} T={T} setModal={setModal} deleteQuedada={deleteQuedada} cycleStatus={cycleStatus}/>}
          {view==='menu'       && <MenuView        data={data} T={T} setMeal={setMeal}/>}
        </main>
      </div>

      {/* BOTTOM NAV — solo mobile */}
      {isMobile && (
        <nav style={{
          position:'fixed', bottom:0, left:0, right:0,
          background:G[600], display:'flex',
          borderTop:`2px solid ${G[800]}`, zIndex:200
        }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setView(n.id); setModal(null) }} style={{
              flex:1, padding:'8px 2px 10px', border:'none', cursor:'pointer',
              background: view===n.id ? G[800] : 'transparent',
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              borderTop: view===n.id ? `2px solid ${G[100]}` : '2px solid transparent',
              fontFamily:'inherit'
            }}>
              <span style={{ fontSize:18 }}>{n.emoji}</span>
              <span style={{ fontSize:9, color: view===n.id ? G[50] : G[200], fontWeight: view===n.id ? 600 : 400 }}>{n.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* MODAL */}
      {modal && (
        <div onClick={e => e.target===e.currentTarget && setModal(null)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent:'center', zIndex:1000
        }}>
          <FormModal modal={modal} close={() => setModal(null)} saveEvento={saveEvento} saveQuedada={saveQuedada} isMobile={isMobile}/>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CALENDARIO MENSUAL
// ═══════════════════════════════════════════════════════════════════
function CalendarioView({ data, T, setModal, isMobile, toggleEvento }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [diaSelec, setDiaSelec] = useState(T)

  const primerDia = new Date(anio, mes, 1)
  const inicioGrid = new Date(primerDia)
  const dow = primerDia.getDay()
  inicioGrid.setDate(primerDia.getDate() - (dow===0 ? 6 : dow-1))

  const celdas = []
  const cur = new Date(inicioGrid)
  while(celdas.length < 42) { celdas.push(new Date(cur)); cur.setDate(cur.getDate()+1) }

  const prevMes = () => { if(mes===0){ setMes(11); setAnio(a=>a-1) } else setMes(m=>m-1) }
  const nextMes = () => { if(mes===11){ setMes(0); setAnio(a=>a+1) } else setMes(m=>m+1) }

  const eventosDelDia = d => {
    const iso = toISO(d)
    const evts = data.eventos.filter(e => e.date===iso)
    const qs   = data.quedadas.filter(q => q.date===iso)
    return [...evts.map(e=>({...e,_tipo:'evento'})), ...qs.map(q=>({...q,_tipo:'quedada',categoria:'quedada'}))]
  }

  const eventosSelec = eventosDelDia(new Date(diaSelec+'T12:00:00'))

  return (
    <div style={{ maxWidth:1100 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:26, fontWeight:600, color:G[800] }}>📅 Calendario</h1>
        <button onClick={() => setModal({ type:'evento' })} style={btnPrimary}>+ Nuevo evento</button>
      </div>

      <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* Columna izquierda: grid del calendario */}
        <div style={{ flex:'1 1 0', minWidth:0, width: isMobile ? '100%' : undefined }}>
          <div style={card}>
            {/* Leyenda */}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${G[100]}` }}>
              {Object.entries(CATEGORIAS).map(([k,v]) => (
                <span key={k} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12 }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:v.color, display:'inline-block' }}/>
                  <span style={{ color:G[600] }}>{v.emoji} {v.label}</span>
                </span>
              ))}
            </div>
            {/* Navegación de mes */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <button onClick={prevMes} style={{ ...btnSecondary, padding:'6px 14px' }}>◀</button>
              <span style={{ fontSize:20, fontWeight:600, color:G[800] }}>{MESES[mes]} {anio}</span>
              <button onClick={nextMes} style={{ ...btnSecondary, padding:'6px 14px' }}>▶</button>
            </div>
            {/* Cabecera días */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
              {DIAS_C.map(d => (
                <div key={d} style={{ textAlign:'center', fontSize:12, fontWeight:600, color:G[400], padding:'4px 0' }}>{d}</div>
              ))}
            </div>
            {/* Grid de días */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
              {celdas.map((d,i) => {
                const iso = toISO(d)
                const esMes = d.getMonth()===mes
                const esHoy = iso===T
                const esSel = iso===diaSelec
                const evts  = eventosDelDia(d)
                return (
                  <div key={i} onClick={() => setDiaSelec(iso)} style={{
                    minHeight: isMobile ? 44 : 68, padding: isMobile ? '4px 2px' : '6px 4px', borderRadius:8, cursor:'pointer',
                    background: esSel ? G[600] : esHoy ? G[50] : 'transparent',
                    border: esHoy && !esSel ? `2px solid ${G[400]}` : '2px solid transparent',
                    opacity: esMes ? 1 : 0.3,
                  }}>
                    <div style={{ fontSize: isMobile ? 12 : 14, fontWeight:esHoy?700:400, color:esSel?'white':esHoy?G[600]:G[800], marginBottom:3, textAlign:'center' }}>
                      {d.getDate()}
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:2, justifyContent:'center' }}>
                      {evts.slice(0,3).map((e,j) => {
                        const cat = CATEGORIAS[e.categoria||'general'] || CATEGORIAS.general
                        return <div key={j} style={{ width:7, height:7, borderRadius:'50%', background:esSel?'white':cat.color }}/>
                      })}
                      {evts.length>3 && <div style={{ fontSize:9, color:esSel?'white':G[400] }}>+{evts.length-3}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Columna derecha: eventos del día + resumen */}
        <div style={{ flex:'0 0 272px', width: isMobile ? '100%' : 272 }}>

          {/* Panel eventos del día seleccionado */}
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:600, color:G[800] }}>{fmtFull(diaSelec)}</div>
              <button onClick={() => setModal({ type:'evento', defaultDate:diaSelec })} style={{ ...btnPrimary, padding:'5px 10px', fontSize:12 }}>+ Añadir</button>
            </div>
            {eventosSelec.length===0 && <Muted>Sin eventos este día</Muted>}
            {eventosSelec.map(e => {
              const cat = CATEGORIAS[e.categoria||'general'] || CATEGORIAS.general
              const done = !!e.completed
              return (
                <div key={e.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:8, marginBottom:5, background:cat.bg, border:`1px solid ${cat.color}25`, opacity: done ? 0.5 : 1, transition:'opacity 0.2s' }}>
                  {e._tipo==='evento' && !e.recurrente ? (
                    <button
                      onClick={ev => { ev.stopPropagation(); toggleEvento(e.id, done) }}
                      style={{ width:18, height:18, borderRadius:4, flexShrink:0, border:`2px solid ${done ? G[400] : G[200]}`, background:done ? G[400] : 'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, outline:'none' }}
                    >
                      {done && <span style={{ color:'white', fontSize:10, fontWeight:800, lineHeight:1 }}>✓</span>}
                    </button>
                  ) : (
                    <span style={{ width:18, flexShrink:0 }}/>
                  )}
                  <span style={{ fontSize:16, flexShrink:0 }}>{cat.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:G[800], overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration: done ? 'line-through' : 'none' }}>{e.title}</div>
                    <div style={{ fontSize:11, color:G[400] }}>{e.time && `🕐 ${e.time}`}{e.place && ` · 📍 ${e.place}`}</div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// AGENDA (filtrable por categoría: bloodbowl / futbol)
// ═══════════════════════════════════════════════════════════════════
function AgendaView({ data, T, setModal, deleteEvento, filtro }) {
  const cat = filtro ? CATEGORIAS[filtro] : null
  const titulo = filtro ? `${cat.emoji} ${cat.label}` : '📌 Agenda'
  const sub    = filtro ? `Torneos y partidas de ${cat.label}` : 'Todos tus eventos'

  const todos = [...data.eventos].filter(e => filtro ? (e.categoria||'general')===filtro : true).sort((a,b) => a.date.localeCompare(b.date))
  const up   = todos.filter(e => e.date>=T)
  const past = todos.filter(e => e.date<T)

  return (
    <div style={{ maxWidth:700 }}>
      <ViewHeader title={titulo} sub={sub} onAdd={() => setModal({ type:'evento', defaultCategoria:filtro||'general' })}/>
      {!filtro && (
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          {Object.entries(CATEGORIAS).map(([k,v]) => (
            <span key={k} style={{ fontSize:12, padding:'4px 10px', borderRadius:20, background:v.bg, color:v.color, fontWeight:500 }}>
              {v.emoji} {v.label}
            </span>
          ))}
        </div>
      )}
      {todos.length===0 && <EmptyState icon={cat?.emoji||'📌'} text={filtro ? `No hay ${cat.label} apuntados todavía` : 'Sin eventos. ¡Añade el primero!'}/>}
      {up.length>0   && <><GLabel>Próximos ({up.length})</GLabel>{up.map(e => <EventoCard key={e.id} e={e} onEdit={() => setModal({ type:'evento', edit:e })} onDel={() => deleteEvento(e.id)}/>)}</>}
      {past.length>0 && <><GLabel>Pasados</GLabel>{past.map(e => <EventoCard key={e.id} e={e} past onEdit={() => setModal({ type:'evento', edit:e })} onDel={() => deleteEvento(e.id)}/>)}</>}
    </div>
  )
}

function EventoCard({ e, past, onEdit, onDel }) {
  const cat = CATEGORIAS[e.categoria||'general'] || CATEGORIAS.general
  return (
    <div style={{ ...card, marginBottom:10, opacity:past?0.6:1, borderLeft:`4px solid ${cat.color}`, borderRadius:'0 12px 12px 0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:16 }}>{cat.emoji}</span>
            <span style={{ fontSize:15, fontWeight:600, color:G[800] }}>{e.title}</span>
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:cat.bg, color:cat.color, fontWeight:500 }}>{cat.label}</span>
            {e.recurrente && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0f9ff', color:'#0369a1', fontWeight:500 }}>🔁 Semanal</span>}
          </div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', paddingLeft:24 }}>
            <Chip icon="📅">{fmtShort(e.date)}</Chip>
            {e.time  && <Chip icon="🕐">{e.time}</Chip>}
            {e.place && <Chip icon="📍">{e.place}</Chip>}
          </div>
          {e.notes && <div style={{ fontSize:12, color:G[400], marginTop:6, paddingLeft:24, fontStyle:'italic' }}>{e.notes}</div>}
        </div>
        {!e.recurrente && <div style={{ display:'flex', gap:4 }}>
          <IBtn onClick={onEdit}>✏️</IBtn>
          <IBtn onClick={onDel} red>🗑️</IBtn>
        </div>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// VISTA: HOY
// ═══════════════════════════════════════════════════════════════════
function HoyView({ data, T, addTask, toggleTask, deleteTask, setModal, isMobile }) {
  const [newTask, setNewTask] = useState('')
  const dow = new Date().getDay()
  const dayName = DIAS_L[dow===0?6:dow-1]
  const todayTasks  = data.tareas.filter(t => t.date===T)
  const todayEvents = data.eventos.filter(e => e.date===T).sort((a,b) => (a.time||'').localeCompare(b.time||''))
  const todayQ      = data.quedadas.filter(q => q.date===T).sort((a,b) => (a.time||'').localeCompare(b.time||''))
  const todayMenu   = data.menu[T] || {}
  const handleAdd = () => { if(!newTask.trim())return; addTask(newTask.trim()); setNewTask('') }

  return (
    <div style={{ maxWidth:700 }}>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:26, fontWeight:600, color:G[800] }}>{dayName}, {fmtFull(T)}</h1>
        <p style={{ color:G[400], fontSize:14, marginTop:4 }}>{todayTasks.filter(t=>!t.done).length} tareas · {todayEvents.length+todayQ.length} eventos</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap:12, marginBottom:'1.5rem' }}>
        {[
          { l:'Tareas pendientes', v:todayTasks.filter(t=>!t.done).length },
          { l:'Eventos hoy',       v:todayEvents.length+todayQ.length },
          { l:'Comidas planif.',   v:Object.values(todayMenu).filter(Boolean).length },
        ].map(s => (
          <div key={s.l} style={{ ...card, textAlign:'center' }}>
            <div style={{ fontSize:30, fontWeight:700, color:G[600] }}>{s.v}</div>
            <div style={{ fontSize:12, color:G[400], marginTop:4 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <SectionCard title="✅ Tareas de hoy">
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAdd()} placeholder="Nueva tarea... (Enter para añadir)" style={{ flex:1 }}/>
          <button onClick={handleAdd} style={btnPrimary}>+ Añadir</button>
        </div>
        {todayTasks.length===0 && <Muted>No hay tareas para hoy</Muted>}
        {todayTasks.map(t => (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:`1px solid ${G[50]}` }}>
            <button onClick={() => toggleTask(t.id,t.done)} style={{ width:22,height:22,borderRadius:'50%',flexShrink:0,border:`2px solid ${t.done?G[400]:G[200]}`,background:t.done?G[400]:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
              {t.done && <span style={{ color:'white',fontSize:12,fontWeight:700 }}>✓</span>}
            </button>
            <span style={{ flex:1,fontSize:14,color:t.done?G[200]:G[800],textDecoration:t.done?'line-through':'none' }}>{t.text}</span>
            <button onClick={() => deleteTask(t.id)} style={{ border:'none',background:'none',cursor:'pointer',color:G[100],fontSize:18,lineHeight:1 }}>×</button>
          </div>
        ))}
      </SectionCard>
      <SectionCard title="🥗 Menú de hoy">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {COMIDAS.map(c => (
            <div key={c} style={{ background:G[50],borderRadius:8,padding:'10px 12px',border:`1px solid ${G[100]}` }}>
              <div style={{ fontSize:11,color:G[400],fontWeight:600,letterSpacing:'0.05em',marginBottom:4 }}>{c.toUpperCase()}</div>
              <div style={{ fontSize:14,color:todayMenu[c]?G[800]:G[200],fontStyle:todayMenu[c]?'normal':'italic' }}>{todayMenu[c]||'Sin planificar'}</div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="📅 Eventos del día" action={
        <button onClick={() => setModal({ type:'evento', defaultDate:T })} style={{ ...btnPrimary, padding:'5px 10px', fontSize:12 }}>+ Añadir</button>
      }>
        {todayEvents.length===0&&todayQ.length===0&&<Muted>Día libre 🎉</Muted>}
        {[...todayEvents.map(e=>({...e,_tipo:'evento'})),...todayQ.map(q=>({...q,_tipo:'quedada'}))].map(i => {
          const cat = CATEGORIAS[i.categoria||'general'] || CATEGORIAS.general
          return (
            <div key={i.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:`1px solid ${G[50]}` }}>
              <span style={{ fontSize:16 }}>{i._tipo==='quedada'?'👥':cat.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14,fontWeight:500,color:G[800] }}>{i.title}</div>
                {i.place && <div style={{ fontSize:12,color:G[400] }}>📍 {i.place}</div>}
              </div>
              {i.time && <div style={{ fontSize:13,color:G[600] }}>{i.time}</div>}
            </div>
          )
        })}
      </SectionCard>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// VISTA: QUEDADAS
// ═══════════════════════════════════════════════════════════════════
function QuedadasView({ data, T, setModal, deleteQuedada, cycleStatus }) {
  const all  = [...data.quedadas].sort((a,b) => a.date.localeCompare(b.date))
  const up   = all.filter(q => q.date>=T)
  const past = all.filter(q => q.date<T)
  return (
    <div style={{ maxWidth:700 }}>
      <ViewHeader title="👥 Quedadas" sub="Planes con tu gente" onAdd={() => setModal({ type:'quedada' })}/>
      {all.length===0 && <EmptyState icon="👥" text="¡Organiza tu primera quedada!"/>}
      {up.length>0   && <><GLabel>Próximas ({up.length})</GLabel>{up.map(q => <QuedadaCard key={q.id} q={q} onEdit={() => setModal({ type:'quedada',edit:q })} onDel={() => deleteQuedada(q.id)} onCycle={() => cycleStatus(q.id,q.status)}/>)}</>}
      {past.length>0 && <><GLabel>Pasadas</GLabel>{past.map(q => <QuedadaCard key={q.id} q={q} past onEdit={() => setModal({ type:'quedada',edit:q })} onDel={() => deleteQuedada(q.id)} onCycle={() => cycleStatus(q.id,q.status)}/>)}</>}
    </div>
  )
}
function QuedadaCard({ q, past, onEdit, onDel, onCycle }) {
  const ST = { pendiente:{bg:'#fef3c7',color:'#92400e',label:'⏳ Pendiente'}, confirmada:{bg:G[50],color:G[600],label:'✅ Confirmada'}, cancelada:{bg:'#fee2e2',color:'#991b1b',label:'❌ Cancelada'} }
  const s = ST[q.status||'pendiente']
  return (
    <div style={{ ...card,marginBottom:10,opacity:past?0.6:1,borderLeft:`4px solid ${G[200]}`,borderRadius:'0 12px 12px 0' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap' }}>
            <span style={{ fontSize:15,fontWeight:600,color:G[800] }}>{q.title}</span>
            <button onClick={onCycle} style={{ fontSize:12,padding:'3px 10px',borderRadius:20,border:'none',cursor:'pointer',background:s.bg,color:s.color,fontWeight:500 }}>{s.label}</button>
          </div>
          <div style={{ display:'flex',gap:14,flexWrap:'wrap' }}>
            <Chip icon="📅">{fmtShort(q.date)}</Chip>
            {q.time  && <Chip icon="🕐">{q.time}</Chip>}
            {q.place && <Chip icon="📍">{q.place}</Chip>}
          </div>
          {q.people && <div style={{ fontSize:13,color:G[400],marginTop:6 }}>👤 {q.people}</div>}
          {q.notes  && <div style={{ fontSize:12,color:G[400],marginTop:4,fontStyle:'italic' }}>{q.notes}</div>}
        </div>
        <div style={{ display:'flex',gap:4 }}><IBtn onClick={onEdit}>✏️</IBtn><IBtn onClick={onDel} red>🗑️</IBtn></div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// VISTA: MENÚ SEMANAL
// ═══════════════════════════════════════════════════════════════════
function MenuView({ data, T, setMeal }) {
  const [wOff, setWOff] = useState(0)
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState('')
  const getWeek = off => {
    const now=new Date(); const dow=now.getDay(); const diff=dow===0?-6:1-dow
    const mon=new Date(now); mon.setDate(now.getDate()+diff+off*7)
    return Array.from({length:7},(_,i) => { const d=new Date(mon); d.setDate(mon.getDate()+i); return toISO(d) })
  }
  const dates = getWeek(wOff)
  const startEdit = (date,meal) => { setEditing({date,meal}); setEditVal(data.menu[date]?.[meal]||'') }
  const commit = (date,meal) => { setMeal(date,meal,editVal.trim()); setEditing(null) }
  const wLabel = wOff===0?'Esta semana':wOff>0?`+${wOff} sem.`:`${Math.abs(wOff)} sem. atrás`
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:12 }}>
        <div>
          <h1 style={{ fontSize:26,fontWeight:600,color:G[800] }}>🥗 Menú semanal</h1>
          <p style={{ color:G[400],fontSize:14,marginTop:4 }}>Planifica tus comidas</p>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <IBtn onClick={() => setWOff(w=>w-1)}>◀</IBtn>
          <span style={{ fontSize:14,color:G[600],minWidth:100,textAlign:'center' }}>{wLabel}</span>
          <IBtn onClick={() => setWOff(w=>w+1)}>▶</IBtn>
          {wOff!==0 && <button onClick={() => setWOff(0)} style={btnSecondary}>Hoy</button>}
        </div>
      </div>
      <div style={{ overflowX:'auto',borderRadius:12,border:`1px solid ${G[100]}` }}>
        <table style={{ width:'100%',borderCollapse:'collapse',tableLayout:'fixed',minWidth:500 }}>
          <colgroup><col style={{ width:90 }}/>{dates.map((_,i)=><col key={i}/>)}</colgroup>
          <thead>
            <tr>
              <th style={{ background:G[600],padding:'8px',textAlign:'left' }}></th>
              {dates.map((d,i) => {
                const isT=d===T; const dt=new Date(d+'T12:00:00')
                return <th key={d} style={{ padding:'8px 4px',background:isT?G[400]:G[600],color:isT?G[900]:G[100],textAlign:'center',border:`1px solid ${G[800]}30` }}>
                  <div style={{ fontSize:11 }}>{DIAS_C[i]}</div>
                  <div style={{ fontSize:16,fontWeight:700 }}>{dt.getDate()}</div>
                </th>
              })}
            </tr>
          </thead>
          <tbody>
            {COMIDAS.map(meal => (
              <tr key={meal}>
                <td style={{ background:G[50],padding:'6px 10px',fontWeight:600,color:G[400],fontSize:12,textTransform:'uppercase',letterSpacing:'0.04em',border:`1px solid ${G[100]}` }}>{meal}</td>
                {dates.map(d => {
                  const isT=d===T,isEd=editing?.date===d&&editing?.meal===meal,val=data.menu[d]?.[meal]
                  return <td key={d} style={{ background:isT?`${G[50]}99`:'white',border:`1px solid ${G[100]}`,padding:4,verticalAlign:'top' }}>
                    {isEd ? (
                      <div>
                        <input value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')commit(d,meal);if(e.key==='Escape')setEditing(null)}} style={{ width:'100%',fontSize:12,padding:'3px 6px',border:`1px solid ${G[400]}`,borderRadius:4 }} autoFocus/>
                        <div style={{ display:'flex',gap:2,marginTop:3 }}>
                          <button onClick={() => commit(d,meal)} style={{ flex:1,background:G[400],color:'white',border:'none',borderRadius:3,cursor:'pointer',fontSize:11,padding:'2px 0' }}>✓</button>
                          <button onClick={() => setEditing(null)} style={{ flex:1,background:'white',border:`1px solid ${G[200]}`,borderRadius:3,cursor:'pointer',color:G[600],fontSize:11,padding:'2px 0' }}>✗</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => startEdit(d,meal)} style={{ cursor:'pointer',padding:'5px 6px',minHeight:36,borderRadius:4,fontSize:12,color:val?G[800]:G[200],lineHeight:1.4 }}>
                        {val||'＋'}
                      </div>
                    )}
                  </td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:12,color:G[400],marginTop:10,textAlign:'center' }}>Haz clic en cualquier celda para editar</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MODAL FORMULARIO
// ═══════════════════════════════════════════════════════════════════
function FormModal({ modal, close, saveEvento, saveQuedada, isMobile }) {
  const isEdit=!!modal.edit, isEvento=modal.type==='evento', T=todayISO()
  const [form, setForm] = useState(
    modal.edit ? {...modal.edit} : {
      title:'', date:modal.defaultDate||T, time:'', place:'', notes:'',
      people:'', status:'pendiente',
      categoria: modal.defaultCategoria || 'general'
    }
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const submit = async () => {
    if(!form.title.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload = { title:form.title, date:form.date, time:form.time||null, place:form.place||null, notes:form.notes||null }
      if(isEvento) {
        const ep = { ...payload, categoria:form.categoria||'general' }
        if(form.id) ep.id=form.id
        await saveEvento(ep)
      } else {
        const qp = { ...payload, people:form.people||null, status:form.status||'pendiente' }
        if(form.id) qp.id=form.id
        await saveQuedada(qp)
      }
      close()
    } catch(err) {
      setSaveError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div style={{ background:'white', borderRadius: isMobile ? '16px 16px 0 0' : 16, padding:'1.5rem', width: isMobile ? '100%' : 420, maxWidth: isMobile ? '100%' : '95vw', border:`1px solid ${G[200]}`, maxHeight:'90vh', overflowY:'auto' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:18,fontWeight:600,color:G[800] }}>{isEdit?'Editar':'Nuevo'} {isEvento?'evento':'quedada'}</h2>
        <button onClick={close} style={{ border:'none',background:'none',cursor:'pointer',fontSize:22,color:G[400],lineHeight:1 }}>×</button>
      </div>
      <FF label="Título *">
        <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder={isEvento?'Ej: Torneo Blood Bowl':'Ej: Cena con Ana'} style={{ width:'100%' }} onKeyDown={e=>e.key==='Enter'&&submit()}/>
      </FF>
      {isEvento && (
        <FF label="Categoría">
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            {Object.entries(CATEGORIAS).map(([k,v]) => (
              <button key={k} onClick={() => set('categoria',k)} style={{
                padding:'6px 14px',borderRadius:20,border:`2px solid ${form.categoria===k?v.color:'transparent'}`,
                background:v.bg,color:v.color,cursor:'pointer',fontSize:13,fontWeight:500
              }}>{v.emoji} {v.label}</button>
            ))}
          </div>
        </FF>
      )}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        <FF label="Fecha"><input type="date" value={form.date} onChange={e=>set('date',e.target.value)} style={{ width:'100%' }}/></FF>
        <FF label="Hora"><input type="time" value={form.time} onChange={e=>set('time',e.target.value)} style={{ width:'100%' }}/></FF>
      </div>
      <FF label="Lugar"><input value={form.place} onChange={e=>set('place',e.target.value)} placeholder="¿Dónde?" style={{ width:'100%' }}/></FF>
      {!isEvento && <>
        <FF label="Con quién"><input value={form.people||''} onChange={e=>set('people',e.target.value)} placeholder="Ej: Ana, Carlos" style={{ width:'100%' }}/></FF>
        <FF label="Estado">
          <select value={form.status||'pendiente'} onChange={e=>set('status',e.target.value)} style={{ width:'100%' }}>
            <option value="pendiente">⏳ Pendiente</option>
            <option value="confirmada">✅ Confirmada</option>
            <option value="cancelada">❌ Cancelada</option>
          </select>
        </FF>
      </>}
      <FF label="Notas"><textarea value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Notas opcionales..." style={{ width:'100%',minHeight:70 }}/></FF>
      {saveError && (
        <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:13, color:'#991b1b' }}>
          ⚠️ {saveError}
        </div>
      )}
      <div style={{ display:'flex',justifyContent:'flex-end',gap:10,marginTop:'1rem' }}>
        <button onClick={close} style={btnSecondary} disabled={saving}>Cancelar</button>
        <button onClick={submit} style={{ ...btnPrimary, opacity:saving?0.7:1 }} disabled={saving}>
          {saving ? '...' : isEdit ? '💾 Guardar' : '+ Añadir'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTES COMPARTIDOS
// ═══════════════════════════════════════════════════════════════════
function SectionCard({ title, children, action }) {
  return <div style={{ marginBottom:'1.25rem' }}>
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
      <div style={{ fontSize:13,fontWeight:600,color:G[400],textTransform:'uppercase',letterSpacing:'0.06em' }}>{title}</div>
      {action}
    </div>
    <div style={card}>{children}</div>
  </div>
}
function ViewHeader({ title, sub, onAdd }) {
  return <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem' }}>
    <div>
      <h1 style={{ fontSize:26,fontWeight:600,color:G[800] }}>{title}</h1>
      <p style={{ color:G[400],fontSize:14,marginTop:4 }}>{sub}</p>
    </div>
    {onAdd && <button onClick={onAdd} style={btnPrimary}>+ Añadir</button>}
  </div>
}
function GLabel({ children }) {
  return <div style={{ fontSize:12,fontWeight:600,color:G[400],textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10,marginTop:6,paddingBottom:6,borderBottom:`1px solid ${G[100]}` }}>{children}</div>
}
function Chip({ icon, children }) {
  return <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:12,color:G[600] }}>{icon} {children}</span>
}
function Muted({ children }) {
  return <p style={{ margin:0,fontSize:14,color:G[200],fontStyle:'italic' }}>{children}</p>
}
function EmptyState({ icon, text }) {
  return <div style={{ textAlign:'center',padding:'3rem',color:G[200] }}>
    <div style={{ fontSize:48,marginBottom:12 }}>{icon}</div>
    <p style={{ margin:0,fontSize:15 }}>{text}</p>
  </div>
}
function FF({ label, children }) {
  return <div style={{ marginBottom:12 }}>
    <label style={{ display:'block',fontSize:13,color:G[600],marginBottom:5,fontWeight:500 }}>{label}</label>
    {children}
  </div>
}
function IBtn({ children, onClick, red }) {
  return <button onClick={onClick} style={{ border:'none',background:'none',cursor:'pointer',fontSize:16,padding:4,opacity:red?0.7:1 }}>{children}</button>
}
function LoadingScreen() {
  return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:16,background:'#f0f7ea' }}>
    <div style={{ fontSize:48 }}>🌿</div>
    <div style={{ fontSize:18,color:G[600],fontFamily:'sans-serif' }}>Cargando tu planner...</div>
  </div>
}
function ErrorScreen({ mensaje, onRetry }) {
  return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:16,background:'#f0f7ea' }}>
    <div style={{ fontSize:48 }}>⚠️</div>
    <div style={{ fontSize:16,color:'#991b1b',fontFamily:'sans-serif' }}>{mensaje}</div>
    <button onClick={onRetry} style={{ ...btnPrimary,fontFamily:'sans-serif' }}>Reintentar</button>
  </div>
}
