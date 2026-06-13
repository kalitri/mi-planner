import { useState, useEffect, useContext, createContext } from 'react'
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
  general:   { label:'General',    emoji:'📌', color:'#639922', bg:'#EAF3DE' },
  bloodbowl: { label:'Blood Bowl', emoji:'🏈', color:'#b91c1c', bg:'#fee2e2' },
  futbol:    { label:'Fútbol',     emoji:'⚽', color:'#1d4ed8', bg:'#dbeafe' },
  quedada:   { label:'Quedada',    emoji:'👥', color:'#7c3aed', bg:'#ede9fe' },
  workout:   { label:'Workout',    emoji:'💪', color:'#7c2d12', bg:'#ffedd5' },
}

const GASTO_CATS = {
  alimentacion: { label:'Alimentación', emoji:'🛒', color:'#059669', bg:'#d1fae5' },
  ocio:         { label:'Ocio',         emoji:'🎮', color:'#7c3aed', bg:'#ede9fe' },
  transporte:   { label:'Transporte',   emoji:'🚗', color:'#1d4ed8', bg:'#dbeafe' },
  ropa:         { label:'Ropa',         emoji:'👕', color:'#be185d', bg:'#fce7f3' },
  salud:        { label:'Salud',        emoji:'💊', color:'#dc2626', bg:'#fee2e2' },
  hogar:        { label:'Hogar',        emoji:'🏠', color:'#92400e', bg:'#fef3c7' },
  otros:        { label:'Otros',        emoji:'📦', color:'#6b7280', bg:'#f3f4f6' },
}

const toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayISO = () => toISO(new Date())
const fmtShort = d => { if(!d)return''; const dt=new Date(d+'T12:00:00'); return `${dt.getDate()} ${MESES[dt.getMonth()]}` }
const fmtFull  = d => { if(!d)return''; const dt=new Date(d+'T12:00:00'); return `${dt.getDate()} de ${MESES[dt.getMonth()]} de ${dt.getFullYear()}` }

const EVENTOS_RECURRENTES = [
  { prefix:'rec-futbol-jue', title:'Futbol Rulo',  dow:4, time:'20:00', categoria:'futbol' },
  { prefix:'rec-futbol-lun', title:'Oficinastas',  dow:1, time:'20:30', categoria:'futbol' },
]
function generarRecurrentes() {
  const desde = new Date(); desde.setMonth(desde.getMonth()-3)
  const hasta = new Date(); hasta.setMonth(hasta.getMonth()+9)
  const hastaISO = toISO(hasta)
  const events = []
  for (const r of EVENTOS_RECURRENTES) {
    const cur = new Date(desde)
    while (toISO(cur) <= hastaISO) {
      if (cur.getDay() === r.dow) {
        const d = toISO(cur)
        events.push({ id:`${r.prefix}-${d}`, title:r.title, date:d, time:r.time, categoria:r.categoria, type:r.categoria, recurrente:true })
      }
      cur.setDate(cur.getDate()+1)
    }
  }
  return events
}

function getWeekDates(off=0) {
  const now=new Date(); const dow=now.getDay(); const diff=dow===0?-6:1-dow
  const mon=new Date(now); mon.setDate(now.getDate()+diff+off*7)
  return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return toISO(d) })
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<768)
    check(); window.addEventListener('resize',check)
    return ()=>window.removeEventListener('resize',check)
  },[])
  return isMobile
}

// ── Theme ─────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext(false)
const useDark = () => useContext(ThemeCtx)
const th = dark => dark
  ? { bg:'#0f1a0f', card:'#1c2a1c', border:'#2d4030', txt:'#d4ecc4', sub:'#7db85a', mut:'#5a8050', sidebar:'#162010', inp:'#1a2a1a', inpB:'#3a5040' }
  : { bg:'#f0f7ea', card:'white',   border:'#C0DD97', txt:'#27500A', sub:'#639922', mut:'#97C459', sidebar:'#3B6D11', inp:'white',   inpB:'#97C459'  }

const cardStyle = dark => ({ background:th(dark).card, border:`1px solid ${th(dark).border}`, borderRadius:12, padding:'1rem 1.25rem' })
const btnSec = dark => ({ background:'transparent', color:th(dark).sub, border:`1px solid ${th(dark).border}`, borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:14, fontFamily:'inherit' })
const btnPrimary = { background:G[600], color:'white', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:14, fontWeight:500, display:'inline-flex', alignItems:'center', gap:6 }

const NAV = [
  { id:'hoy',        emoji:'🏠', label:'Hoy',       short:'Hoy'    },
  { id:'calendario', emoji:'📅', label:'Calendario', short:'Cal.'   },
  { id:'bloodbowl',  emoji:'🏈', label:'Blood Bowl', short:'BB'     },
  { id:'futbol',     emoji:'⚽', label:'Fútbol',     short:'Fútbol' },
  { id:'workout',    emoji:'💪', label:'Workout',    short:'Work'   },
  { id:'quedadas',   emoji:'👥', label:'Quedadas',   short:'Queds'  },
  { id:'menu',       emoji:'🥗', label:'Menú',       short:'Menú'   },
  { id:'finanzas',   emoji:'💰', label:'Finanzas',   short:'€€'     },
  { id:'stats',      emoji:'📊', label:'Stats',      short:'Stats'  },
  { id:'buscar',     emoji:'🔍', label:'Buscar',     short:'Buscar' },
]

// ── Home ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth()
  const [view, setView]       = useState('hoy')
  const [data, setData]       = useState({ tareas:[], eventos:[], quedadas:[], menu:{}, gastos:[] })
  const [modal, setModal]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [toasts, setToasts]   = useState([])
  const [confirmDel, setCD]   = useState(null)
  const [dark, setDark]       = useState(false)
  const isMobile = useIsMobile()

  useEffect(()=>{
    if (typeof window!=='undefined' && localStorage.getItem('mp-theme')==='dark') setDark(true)
    cargarTodo()
  },[])

  useEffect(()=>{
    if (!user?.id) return
    const ch = supabase.channel('mp-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'dv_tasks',  filter:`user_id=eq.${user.id}`},()=>cargarTodo(true))
      .on('postgres_changes',{event:'*',schema:'public',table:'dv_events', filter:`user_id=eq.${user.id}`},()=>cargarTodo(true))
      .on('postgres_changes',{event:'*',schema:'public',table:'dv_habits', filter:`user_id=eq.${user.id}`},()=>cargarTodo(true))
      .on('postgres_changes',{event:'*',schema:'public',table:'dv_meals',  filter:`user_id=eq.${user.id}`},()=>cargarTodo(true))
      .on('postgres_changes',{event:'*',schema:'public',table:'dv_gastos', filter:`user_id=eq.${user.id}`},()=>cargarTodo(true))
      .subscribe()
    return ()=>supabase.removeChannel(ch)
  },[user?.id])

  const toast = msg => { const id=Date.now(); setToasts(t=>[...t,{id,msg}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2500) }
  const toggleDark = () => setDark(d=>{ const n=!d; localStorage.setItem('mp-theme',n?'dark':'light'); return n })

  const cargarTodo = async (silent=false) => {
    try {
      if (!silent) setLoading(true)
      const [t,e,q,m,g] = await Promise.all([
        supabase.from('dv_tasks').select('*').eq('user_id',user.id).order('created_at'),
        supabase.from('dv_events').select('*').eq('user_id',user.id).order('date'),
        supabase.from('dv_habits').select('*').eq('user_id',user.id).order('created_at'),
        supabase.from('dv_meals').select('*').eq('user_id',user.id),
        supabase.from('dv_gastos').select('*').eq('user_id',user.id).order('date'),
      ])
      const menuObj={}
      m.data?.forEach(r=>{ menuObj[r.date]={ Desayuno:r.desayuno||'', Almuerzo:r.almuerzo||'', Merienda:r.merienda||'', Cena:r.cena||'' } })
      setData({ tareas:t.data||[], eventos:[...(e.data||[]).map(ev=>({...ev,categoria:ev.type||'general'})),...generarRecurrentes()], quedadas:q.data||[], menu:menuObj, gastos:g.data||[] })
    } catch { if(!silent) setError('Error al conectar con la base de datos') }
    finally { if(!silent) setLoading(false) }
  }

  const addTask = async text => {
    const {data:n}=await supabase.from('dv_tasks').insert({text,done:false,date:todayISO(),user_id:user.id}).select().single()
    if(n){ setData(d=>({...d,tareas:[...d.tareas,n]})); toast('Tarea añadida ✓') }
  }
  const toggleTask = async (id,done) => {
    await supabase.from('dv_tasks').update({done:!done}).eq('id',id).eq('user_id',user.id)
    setData(d=>({...d,tareas:d.tareas.map(t=>t.id===id?{...t,done:!done}:t)}))
  }
  const deleteTask = id => setCD({ message:'¿Eliminar esta tarea?', onConfirm: async()=>{
    await supabase.from('dv_tasks').delete().eq('id',id).eq('user_id',user.id)
    setData(d=>({...d,tareas:d.tareas.filter(t=>t.id!==id)})); toast('Tarea eliminada'); setCD(null)
  }})
  const moveTask = async (id,newDate) => {
    await supabase.from('dv_tasks').update({date:newDate}).eq('id',id).eq('user_id',user.id)
    setData(d=>({...d,tareas:d.tareas.map(t=>t.id===id?{...t,date:newDate}:t)})); toast('Tarea movida ✓')
  }

  const saveEvento = async form => {
    const uid=user?.id
    const db={title:form.title,date:form.date,time:form.time||null,place:form.place||null,type:form.categoria||'general',notes:form.notes||null}
    if (form.id) {
      const {data:u,error}=await supabase.from('dv_events').update({...db,user_id:uid}).eq('id',form.id).eq('user_id',uid).select().single()
      if(error) throw new Error(error.message)
      if(u) setData(d=>({...d,eventos:d.eventos.map(e=>e.id===form.id?{...u,categoria:u.type||'general'}:e)}))
    } else {
      const {data:n,error}=await supabase.from('dv_events').insert({...db,user_id:uid}).select().single()
      if(error) throw new Error(error.message)
      if(n) setData(d=>({...d,eventos:[...d.eventos,{...n,categoria:n.type||'general'}]}))
    }
    toast('Evento guardado ✓')
  }
  const deleteEvento = id => setCD({ message:'¿Eliminar este evento?', onConfirm: async()=>{
    await supabase.from('dv_events').delete().eq('id',id).eq('user_id',user.id)
    setData(d=>({...d,eventos:d.eventos.filter(e=>e.id!==id)})); toast('Evento eliminado'); setCD(null)
  }})
  const toggleEvento = async (id,completed) => {
    if (typeof id==='string'&&id.startsWith('rec-')) return
    await supabase.from('dv_events').update({completed:!completed}).eq('id',id).eq('user_id',user.id)
    setData(d=>({...d,eventos:d.eventos.map(e=>e.id===id?{...e,completed:!completed}:e)}))
  }

  const saveQuedada = async form => {
    const uid=user?.id
    const db={title:form.title,date:form.date||null,time:form.time||null,place:form.place||null,people:form.people||null,status:form.status||'pendiente',notes:form.notes||null}
    if (form.id) {
      const {data:u,error}=await supabase.from('dv_habits').update({...db,user_id:uid}).eq('id',form.id).eq('user_id',uid).select().single()
      if(error) throw new Error(error.message)
      if(u) setData(d=>({...d,quedadas:d.quedadas.map(q=>q.id===form.id?{...q,...u}:q)}))
    } else {
      const {data:n,error}=await supabase.from('dv_habits').insert({...db,user_id:uid}).select().single()
      if(error) throw new Error(error.message)
      if(n) setData(d=>({...d,quedadas:[...d.quedadas,n]}))
    }
    toast('Quedada guardada ✓')
  }
  const deleteQuedada = id => setCD({ message:'¿Eliminar esta quedada?', onConfirm: async()=>{
    await supabase.from('dv_habits').delete().eq('id',id).eq('user_id',user.id)
    setData(d=>({...d,quedadas:d.quedadas.filter(q=>q.id!==id)})); toast('Quedada eliminada'); setCD(null)
  }})
  const cycleStatus = async (id,status) => {
    const ss=['pendiente','confirmada','cancelada']
    const next=ss[(ss.indexOf(status||'pendiente')+1)%ss.length]
    setData(d=>({...d,quedadas:d.quedadas.map(q=>q.id===id?{...q,status:next}:q)}))
    await supabase.from('dv_habits').update({status:next}).eq('id',id).eq('user_id',user.id)
  }

  const saveGasto = async form => {
    const uid=user?.id
    const db={description:form.description,amount:parseFloat(form.amount)||0,category:form.category||'otros',date:form.date,notes:form.notes||null}
    if (form.id) {
      const {data:u,error}=await supabase.from('dv_gastos').update({...db,user_id:uid}).eq('id',form.id).eq('user_id',uid).select().single()
      if(error) throw new Error(error.message)
      if(u) setData(d=>({...d,gastos:d.gastos.map(g=>g.id===form.id?{...g,...u}:g)}))
    } else {
      const {data:n,error}=await supabase.from('dv_gastos').insert({...db,user_id:uid}).select().single()
      if(error) throw new Error(error.message)
      if(n) setData(d=>({...d,gastos:[...d.gastos,n]}))
    }
    toast('Gasto guardado ✓')
  }
  const deleteGasto = id => setCD({ message:'¿Eliminar este gasto?', onConfirm: async()=>{
    await supabase.from('dv_gastos').delete().eq('id',id).eq('user_id',user.id)
    setData(d=>({...d,gastos:d.gastos.filter(g=>g.id!==id)})); toast('Gasto eliminado'); setCD(null)
  }})

  const setMeal = async (date,comida,valor,silent=false) => {
    setData(d=>({...d,menu:{...d.menu,[date]:{...(d.menu[date]||{}),[comida]:valor}}}))
    await supabase.from('dv_meals').upsert({date,user_id:user.id,[COMIDAS_COL[comida]]:valor||null},{onConflict:'date,user_id'})
    if (!silent&&valor) toast('Menú actualizado ✓')
  }

  const handleLogout = async ()=>{ await supabase.auth.signOut() }

  if(loading) return <LoadingScreen/>
  if(error)   return <ErrorScreen mensaje={error} onRetry={()=>cargarTodo()}/>

  const T=todayISO()
  const colors=th(dark)

  return (
    <ThemeCtx.Provider value={dark}>
      <Head><title>Mi Planner 🌿</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className={dark?'dark':''} style={{display:'flex',minHeight:'100vh',background:colors.bg}}>

        {/* SIDEBAR desktop */}
        {!isMobile && (
          <aside style={{width:200,background:colors.sidebar,display:'flex',flexDirection:'column',flexShrink:0}}>
            <div style={{padding:'1.5rem 1.25rem 1rem',borderBottom:'1px solid rgba(0,0,0,0.25)'}}>
              <div style={{color:'#EAF3DE',fontSize:18,fontWeight:600}}>🌿 Mi Planner</div>
              <div style={{color:'#97C459',fontSize:12,marginTop:4}}>{fmtFull(T)}</div>
            </div>
            <nav style={{flex:1,paddingTop:8}}>
              {NAV.map(n=>(
                <button key={n.id} onClick={()=>{setView(n.id);setModal(null)}} style={{
                  display:'flex',alignItems:'center',gap:10,width:'100%',
                  padding:'0.65rem 1.25rem',border:'none',cursor:'pointer',textAlign:'left',
                  background:view===n.id?G[800]:'transparent',
                  color:view===n.id?G[50]:G[100],fontSize:14,fontFamily:'inherit',
                  borderLeft:view===n.id?`4px solid ${G[100]}`:'4px solid transparent',
                }}>
                  <span style={{fontSize:16}}>{n.emoji}</span>{n.label}
                </button>
              ))}
            </nav>
            <div style={{padding:'1rem',borderTop:'1px solid rgba(0,0,0,0.25)'}}>
              <div style={{fontSize:11,color:G[400],textAlign:'center',marginBottom:8,wordBreak:'break-all'}}>{user.email}</div>
              <button onClick={toggleDark} style={{width:'100%',padding:'7px',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,cursor:'pointer',background:'transparent',color:G[200],fontSize:12,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:6}}>
                {dark?'☀️ Modo claro':'🌙 Modo oscuro'}
              </button>
              <button onClick={handleLogout} style={{width:'100%',padding:'7px',border:'1px solid rgba(0,0,0,0.25)',borderRadius:8,cursor:'pointer',background:'transparent',color:G[200],fontSize:13,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                ↩ Cerrar sesión
              </button>
            </div>
          </aside>
        )}

        {/* MAIN */}
        <main style={{flex:1,padding:isMobile?'1rem':'2rem',background:colors.bg,overflowY:'auto',paddingBottom:isMobile?'80px':'2rem'}}>
          {isMobile && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem',paddingBottom:'0.75rem',borderBottom:`1px solid ${colors.border}`}}>
              <div>
                <div style={{fontSize:16,fontWeight:600,color:colors.txt}}>🌿 Mi Planner</div>
                <div style={{fontSize:11,color:colors.mut}}>{fmtFull(T)}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <button onClick={toggleDark} style={{border:'none',background:'none',cursor:'pointer',fontSize:18,lineHeight:1}}>{dark?'☀️':'🌙'}</button>
                <span style={{fontSize:14,fontWeight:500,color:colors.sub}}>{NAV.find(n=>n.id===view)?.emoji}</span>
                <button onClick={handleLogout} style={{border:'none',background:'none',cursor:'pointer',fontSize:13,color:colors.mut}}>↩</button>
              </div>
            </div>
          )}

          {view==='hoy'        && <HoyView        data={data} T={T} addTask={addTask} toggleTask={toggleTask} deleteTask={deleteTask} moveTask={moveTask} setModal={setModal} isMobile={isMobile} deleteEvento={deleteEvento} deleteQuedada={deleteQuedada}/>}
          {view==='calendario' && <CalendarioView  data={data} T={T} setModal={setModal} isMobile={isMobile} toggleEvento={toggleEvento} deleteEvento={deleteEvento} deleteQuedada={deleteQuedada}/>}
          {view==='bloodbowl'  && <AgendaView      data={data} T={T} setModal={setModal} deleteEvento={deleteEvento} filtro="bloodbowl"/>}
          {view==='futbol'     && <AgendaView      data={data} T={T} setModal={setModal} deleteEvento={deleteEvento} filtro="futbol"/>}
          {view==='workout'    && <AgendaView      data={data} T={T} setModal={setModal} deleteEvento={deleteEvento} filtro="workout"/>}
          {view==='quedadas'   && <QuedadasView    data={data} T={T} setModal={setModal} deleteQuedada={deleteQuedada} cycleStatus={cycleStatus}/>}
          {view==='menu'       && <MenuView        data={data} T={T} setMeal={setMeal} toast={toast}/>}
          {view==='finanzas'   && <FinanzasView    data={data} T={T} setModal={setModal} deleteGasto={deleteGasto}/>}
          {view==='stats'      && <StatsView       data={data} T={T}/>}
          {view==='buscar'     && <BuscarView      data={data} setModal={setModal}/>}
        </main>
      </div>

      {/* BOTTOM NAV mobile */}
      {isMobile && (
        <nav style={{position:'fixed',bottom:0,left:0,right:0,background:G[600],display:'flex',borderTop:`2px solid ${G[800]}`,zIndex:200,overflowX:'auto'}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{setView(n.id);setModal(null)}} style={{
              flex:'0 0 auto',minWidth:46,padding:'8px 4px 10px',border:'none',cursor:'pointer',
              background:view===n.id?G[800]:'transparent',
              display:'flex',flexDirection:'column',alignItems:'center',gap:2,
              borderTop:view===n.id?`2px solid ${G[100]}`:'2px solid transparent',fontFamily:'inherit'
            }}>
              <span style={{fontSize:18}}>{n.emoji}</span>
              <span style={{fontSize:8,color:view===n.id?G[50]:G[200],fontWeight:view===n.id?600:400}}>{n.short}</span>
            </button>
          ))}
        </nav>
      )}

      {/* MODAL */}
      {modal && (
        <div onClick={e=>e.target===e.currentTarget&&setModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:isMobile?'flex-end':'center',justifyContent:'center',zIndex:1000}}>
          <FormModal modal={modal} close={()=>setModal(null)} saveEvento={saveEvento} saveQuedada={saveQuedada} saveGasto={saveGasto} isMobile={isMobile}/>
        </div>
      )}

      {/* CONFIRM */}
      {confirmDel && <ConfirmModal message={confirmDel.message} onConfirm={confirmDel.onConfirm} onCancel={()=>setCD(null)}/>}

      {/* TOASTS */}
      <ToastContainer toasts={toasts}/>
    </ThemeCtx.Provider>
  )
}

// ── Calendario ────────────────────────────────────────────────────────────────
function CalendarioView({ data, T, setModal, isMobile, toggleEvento, deleteEvento, deleteQuedada }) {
  const dark = useDark()
  const colors = th(dark)
  const hoy = new Date()
  const [mes, setMes]       = useState(hoy.getMonth())
  const [anio, setAnio]     = useState(hoy.getFullYear())
  const [diaSelec, setDia]  = useState(T)

  const primerDia = new Date(anio,mes,1)
  const inicioGrid = new Date(primerDia)
  const dow = primerDia.getDay()
  inicioGrid.setDate(primerDia.getDate()-(dow===0?6:dow-1))
  const celdas=[]
  const cur=new Date(inicioGrid)
  while(celdas.length<42){ celdas.push(new Date(cur)); cur.setDate(cur.getDate()+1) }

  const prevMes=()=>{ if(mes===0){setMes(11);setAnio(a=>a-1)}else setMes(m=>m-1) }
  const nextMes=()=>{ if(mes===11){setMes(0);setAnio(a=>a+1)}else setMes(m=>m+1) }

  const eventosDelDia = d => {
    const iso=toISO(d)
    const evts=data.eventos.filter(e=>e.date===iso)
    const qs=data.quedadas.filter(q=>q.date===iso)
    return [...evts.map(e=>({...e,_tipo:'evento'})),...qs.map(q=>({...q,_tipo:'quedada',categoria:'quedada'}))]
  }

  const eventosSelec = eventosDelDia(new Date(diaSelec+'T12:00:00'))

  return (
    <div style={{maxWidth:1100}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
        <h1 style={{fontSize:26,fontWeight:600,color:colors.txt}}>📅 Calendario</h1>
        <button onClick={()=>setModal({type:'evento'})} style={btnPrimary}>+ Nuevo evento</button>
      </div>
      <div style={{display:'flex',gap:16,alignItems:'flex-start',flexDirection:isMobile?'column':'row'}}>

        {/* Grid */}
        <div style={{flex:'1 1 0',minWidth:0,width:isMobile?'100%':undefined}}>
          <div style={cardStyle(dark)}>
            {/* Leyenda */}
            <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${colors.border}`}}>
              {Object.entries(CATEGORIAS).map(([k,v])=>(
                <span key={k} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12}}>
                  <span style={{width:10,height:10,borderRadius:'50%',background:v.color,display:'inline-block'}}/>
                  <span style={{color:colors.sub}}>{v.emoji} {v.label}</span>
                </span>
              ))}
            </div>
            {/* Nav mes */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <button onClick={prevMes} style={{...btnSec(dark),padding:'6px 14px'}}>◀</button>
              <span style={{fontSize:20,fontWeight:600,color:colors.txt}}>{MESES[mes]} {anio}</span>
              <button onClick={nextMes} style={{...btnSec(dark),padding:'6px 14px'}}>▶</button>
            </div>
            {/* Cabecera */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
              {DIAS_C.map(d=>(
                <div key={d} style={{textAlign:'center',fontSize:12,fontWeight:600,color:colors.sub,padding:'4px 0'}}>{d}</div>
              ))}
            </div>
            {/* Días */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
              {celdas.map((d,i)=>{
                const iso=toISO(d); const esMes=d.getMonth()===mes
                const esHoy=iso===T; const esSel=iso===diaSelec
                const evts=eventosDelDia(d)
                return (
                  <div key={i} onClick={()=>setDia(iso)} style={{
                    minHeight:isMobile?44:68,padding:isMobile?'4px 2px':'6px 4px',borderRadius:8,cursor:'pointer',
                    background:esSel?G[600]:esHoy?G[50]:(dark?'transparent':'transparent'),
                    border:esHoy&&!esSel?`2px solid ${G[400]}`:'2px solid transparent',
                    opacity:esMes?1:0.3,
                  }}>
                    <div style={{fontSize:isMobile?12:14,fontWeight:esHoy?700:400,color:esSel?'white':esHoy?G[600]:colors.txt,marginBottom:3,textAlign:'center'}}>
                      {d.getDate()}
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:2,justifyContent:'center'}}>
                      {evts.slice(0,3).map((e,j)=>{
                        const cat=CATEGORIAS[e.categoria||'general']||CATEGORIAS.general
                        return <div key={j} style={{width:7,height:7,borderRadius:'50%',background:esSel?'white':cat.color}}/>
                      })}
                      {evts.length>3 && <div style={{fontSize:9,color:esSel?'white':colors.mut}}>+{evts.length-3}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div style={{flex:'0 0 272px',width:isMobile?'100%':272}}>
          <div style={cardStyle(dark)}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:600,color:colors.txt}}>{fmtFull(diaSelec)}</div>
              <button onClick={()=>setModal({type:'evento',defaultDate:diaSelec})} style={{...btnPrimary,padding:'5px 10px',fontSize:12}}>+ Añadir</button>
            </div>
            {eventosSelec.length===0 && <Muted>Sin eventos este día</Muted>}
            {eventosSelec.map(e=>{
              const cat=CATEGORIAS[e.categoria||'general']||CATEGORIAS.general
              const done=!!e.completed
              return (
                <div key={e.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 8px',borderRadius:8,marginBottom:5,background:cat.bg,border:`1px solid ${cat.color}25`,opacity:done?0.5:1}}>
                  {e._tipo==='evento'&&!e.recurrente ? (
                    <button onClick={ev=>{ev.stopPropagation();toggleEvento(e.id,done)}} style={{width:18,height:18,borderRadius:4,flexShrink:0,border:`2px solid ${done?G[400]:G[200]}`,background:done?G[400]:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
                      {done&&<span style={{color:'white',fontSize:10,fontWeight:800}}>✓</span>}
                    </button>
                  ) : <span style={{width:18,flexShrink:0}}/>}
                  <span style={{fontSize:16,flexShrink:0}}>{cat.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:G[800],overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textDecoration:done?'line-through':'none'}}>{e.title}</div>
                    <div style={{fontSize:11,color:G[400]}}>{e.time&&`🕐 ${e.time}`}{e.place&&` · 📍 ${e.place}`}</div>
                  </div>
                  {!e.recurrente && (
                    <div style={{display:'flex',gap:2,flexShrink:0}}>
                      <IBtn onClick={()=>setModal({type:e._tipo==='quedada'?'quedada':'evento',edit:e})}>✏️</IBtn>
                      <IBtn onClick={()=>e._tipo==='quedada'?deleteQuedada(e.id):deleteEvento(e.id)} red>🗑️</IBtn>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Agenda ────────────────────────────────────────────────────────────────────
function AgendaView({ data, T, setModal, deleteEvento, filtro }) {
  const cat=filtro?CATEGORIAS[filtro]:null
  const titulo=filtro?`${cat.emoji} ${cat.label}`:'📌 Agenda'
  const sub=filtro?`Torneos y partidas de ${cat.label}`:'Todos tus eventos'
  const todos=[...data.eventos].filter(e=>filtro?(e.categoria||'general')===filtro:true).sort((a,b)=>a.date.localeCompare(b.date))
  const up=todos.filter(e=>e.date>=T)
  const past=todos.filter(e=>e.date<T)
  return (
    <div style={{maxWidth:700}}>
      <ViewHeader title={titulo} sub={sub} onAdd={()=>setModal({type:'evento',defaultCategoria:filtro||'general'})}/>
      {todos.length===0 && <EmptyState icon={cat?.emoji||'📌'} text={filtro?`No hay ${cat.label} apuntados todavía`:'Sin eventos. ¡Añade el primero!'}/>}
      {up.length>0   && <><GLabel>Próximos ({up.length})</GLabel>{up.map(e=><EventoCard key={e.id} e={e} onEdit={()=>setModal({type:'evento',edit:e})} onDel={()=>deleteEvento(e.id)}/>)}</>}
      {past.length>0 && <><GLabel>Pasados</GLabel>{past.map(e=><EventoCard key={e.id} e={e} past onEdit={()=>setModal({type:'evento',edit:e})} onDel={()=>deleteEvento(e.id)}/>)}</>}
    </div>
  )
}

function EventoCard({ e, past, onEdit, onDel }) {
  const dark=useDark(); const colors=th(dark)
  const cat=CATEGORIAS[e.categoria||'general']||CATEGORIAS.general
  return (
    <div style={{...cardStyle(dark),marginBottom:10,opacity:past?0.6:1,borderLeft:`4px solid ${cat.color}`,borderRadius:'0 12px 12px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{fontSize:16}}>{cat.emoji}</span>
            <span style={{fontSize:15,fontWeight:600,color:colors.txt}}>{e.title}</span>
            <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:cat.bg,color:cat.color,fontWeight:500}}>{cat.label}</span>
            {e.recurrente&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'#f0f9ff',color:'#0369a1',fontWeight:500}}>🔁 Semanal</span>}
          </div>
          <div style={{display:'flex',gap:14,flexWrap:'wrap',paddingLeft:24}}>
            <Chip icon="📅">{fmtShort(e.date)}</Chip>
            {e.time&&<Chip icon="🕐">{e.time}</Chip>}
            {e.place&&<Chip icon="📍">{e.place}</Chip>}
          </div>
          {e.notes&&<div style={{fontSize:12,color:colors.mut,marginTop:6,paddingLeft:24,fontStyle:'italic'}}>{e.notes}</div>}
        </div>
        {!e.recurrente&&<div style={{display:'flex',gap:4}}><IBtn onClick={onEdit}>✏️</IBtn><IBtn onClick={onDel} red>🗑️</IBtn></div>}
      </div>
    </div>
  )
}

// ── Hoy ───────────────────────────────────────────────────────────────────────
function HoyView({ data, T, addTask, toggleTask, deleteTask, moveTask, setModal, isMobile, deleteEvento, deleteQuedada }) {
  const dark=useDark(); const colors=th(dark)
  const [newTask, setNewTask]     = useState('')
  const [verHistorial, setVerH]   = useState(false)
  const [movingTask, setMoving]   = useState(null)

  const dow=new Date().getDay()
  const dayName=DIAS_L[dow===0?6:dow-1]
  const todayTasks  = data.tareas.filter(t=>t.date===T)
  const doneTasks   = data.tareas.filter(t=>t.done)
  const todayEvents = data.eventos.filter(e=>e.date===T).sort((a,b)=>(a.time||'').localeCompare(b.time||''))
  const todayQ      = data.quedadas.filter(q=>q.date===T).sort((a,b)=>(a.time||'').localeCompare(b.time||''))
  const todayMenu   = data.menu[T]||{}

  const weekDates  = getWeekDates(0)
  const weekEvents = data.eventos.filter(e=>weekDates.includes(e.date)).length
  const weekQs     = data.quedadas.filter(q=>weekDates.includes(q.date)).length
  const weekMenuDays = weekDates.filter(d=>Object.values(data.menu[d]||{}).some(Boolean)).length

  const handleAdd=()=>{ if(!newTask.trim())return; addTask(newTask.trim()); setNewTask('') }

  return (
    <div style={{maxWidth:700}}>
      <div style={{marginBottom:'1.5rem'}}>
        <h1 style={{fontSize:26,fontWeight:600,color:colors.txt}}>{dayName}, {fmtFull(T)}</h1>
        <p style={{color:colors.mut,fontSize:14,marginTop:4}}>{todayTasks.filter(t=>!t.done).length} tareas · {todayEvents.length+todayQ.length} eventos</p>
      </div>

      {/* 4 stat cards */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:'1.5rem'}}>
        {[
          { l:'Pendientes hoy',       v:todayTasks.filter(t=>!t.done).length },
          { l:'Eventos esta semana',  v:weekEvents+weekQs },
          { l:'Quedadas próximas',    v:data.quedadas.filter(q=>q.date&&q.date>=T).length },
          { l:'Días menú planif.',    v:weekMenuDays },
        ].map(s=>(
          <div key={s.l} style={{...cardStyle(dark),textAlign:'center'}}>
            <div style={{fontSize:30,fontWeight:700,color:G[600]}}>{s.v}</div>
            <div style={{fontSize:12,color:colors.mut,marginTop:4}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tareas */}
      <SectionCard title="✅ Tareas de hoy">
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAdd()} placeholder="Nueva tarea... (Enter para añadir)" style={{flex:1}}/>
          <button onClick={handleAdd} style={btnPrimary}>+ Añadir</button>
        </div>
        {todayTasks.length===0&&<Muted>No hay tareas para hoy</Muted>}
        {todayTasks.map(t=>(
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:`1px solid ${colors.border}`}}>
            <button onClick={()=>toggleTask(t.id,t.done)} style={{width:22,height:22,borderRadius:'50%',flexShrink:0,border:`2px solid ${t.done?G[400]:colors.mut}`,background:t.done?G[400]:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {t.done&&<span style={{color:'white',fontSize:12,fontWeight:700}}>✓</span>}
            </button>
            <span style={{flex:1,fontSize:14,color:t.done?colors.mut:colors.txt,textDecoration:t.done?'line-through':'none'}}>{t.text}</span>
            {movingTask===t.id ? (
              <input type="date" defaultValue={t.date||T} onChange={e=>{moveTask(t.id,e.target.value);setMoving(null)}} onBlur={()=>setMoving(null)} autoFocus style={{fontSize:12,padding:'2px 6px',borderRadius:4,border:`1px solid ${G[400]}`,background:colors.inp,color:colors.txt}}/>
            ) : (
              <button onClick={()=>setMoving(t.id)} title="Mover a otro día" style={{border:'none',background:'none',cursor:'pointer',fontSize:14,padding:4,opacity:0.5,lineHeight:1}}>📅</button>
            )}
            <button onClick={()=>deleteTask(t.id)} style={{border:'none',background:'none',cursor:'pointer',color:colors.mut,fontSize:18,lineHeight:1}}>×</button>
          </div>
        ))}

        {/* Historial */}
        {doneTasks.length>0 && (
          <div style={{marginTop:12}}>
            <button onClick={()=>setVerH(v=>!v)} style={{...btnSec(dark),padding:'5px 12px',fontSize:12}}>
              {verHistorial?'▲ Ocultar historial':`▼ Ver completadas (${doneTasks.length})`}
            </button>
            {verHistorial && (
              <div style={{marginTop:8}}>
                {[...doneTasks].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(t=>(
                  <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,padding:'5px 0',borderBottom:`1px solid ${colors.border}`,opacity:0.6}}>
                    <span style={{fontSize:12,color:colors.mut,minWidth:60}}>{fmtShort(t.date)}</span>
                    <span style={{flex:1,fontSize:13,color:colors.mut,textDecoration:'line-through'}}>{t.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Menú */}
      <SectionCard title="🥗 Menú de hoy">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {COMIDAS.map(c=>(
            <div key={c} style={{background:dark?colors.inp:G[50],borderRadius:8,padding:'10px 12px',border:`1px solid ${colors.border}`}}>
              <div style={{fontSize:11,color:colors.mut,fontWeight:600,letterSpacing:'0.05em',marginBottom:4}}>{c.toUpperCase()}</div>
              <div style={{fontSize:14,color:todayMenu[c]?colors.txt:colors.mut,fontStyle:todayMenu[c]?'normal':'italic'}}>{todayMenu[c]||'Sin planificar'}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Eventos */}
      <SectionCard title="📅 Eventos del día" action={
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>setModal({type:'evento',defaultDate:T})} style={{...btnPrimary,padding:'5px 10px',fontSize:12}}>+ Evento</button>
          <button onClick={()=>setModal({type:'quedada',defaultDate:T})} style={{...btnSec(dark),padding:'5px 10px',fontSize:12}}>+ Quedada</button>
        </div>
      }>
        {todayEvents.length===0&&todayQ.length===0&&<Muted>Día libre 🎉</Muted>}
        {[...todayEvents.map(e=>({...e,_tipo:'evento'})),...todayQ.map(q=>({...q,_tipo:'quedada'}))].map(i=>{
          const cat=CATEGORIAS[i.categoria||'general']||CATEGORIAS.general
          return (
            <div key={i.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:`1px solid ${colors.border}`}}>
              <span style={{fontSize:16}}>{i._tipo==='quedada'?'👥':cat.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:500,color:colors.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.title}</div>
                {i.place&&<div style={{fontSize:12,color:colors.mut}}>📍 {i.place}</div>}
              </div>
              {i.time&&<div style={{fontSize:13,color:colors.sub,flexShrink:0}}>{i.time}</div>}
              {!i.recurrente&&(
                <>
                  <IBtn onClick={()=>setModal({type:i._tipo==='quedada'?'quedada':'evento',edit:i})}>✏️</IBtn>
                  <IBtn onClick={()=>i._tipo==='quedada'?deleteQuedada(i.id):deleteEvento(i.id)} red>🗑️</IBtn>
                </>
              )}
            </div>
          )
        })}
      </SectionCard>
    </div>
  )
}

// ── Quedadas ──────────────────────────────────────────────────────────────────
function QuedadasView({ data, T, setModal, deleteQuedada, cycleStatus }) {
  const all=[...data.quedadas].sort((a,b)=>(a.date||'').localeCompare(b.date||''))
  const up=all.filter(q=>!q.date||q.date>=T)
  const past=all.filter(q=>q.date&&q.date<T)
  return (
    <div style={{maxWidth:700}}>
      <ViewHeader title="👥 Quedadas" sub="Planes con tu gente" onAdd={()=>setModal({type:'quedada'})}/>
      {all.length===0&&<EmptyState icon="👥" text="¡Organiza tu primera quedada!"/>}
      {up.length>0   && <><GLabel>Próximas ({up.length})</GLabel>{up.map(q=><QuedadaCard key={q.id} q={q} onEdit={()=>setModal({type:'quedada',edit:q})} onDel={()=>deleteQuedada(q.id)} onCycle={()=>cycleStatus(q.id,q.status)}/>)}</>}
      {past.length>0 && <><GLabel>Pasadas</GLabel>{past.map(q=><QuedadaCard key={q.id} q={q} past onEdit={()=>setModal({type:'quedada',edit:q})} onDel={()=>deleteQuedada(q.id)} onCycle={()=>cycleStatus(q.id,q.status)}/>)}</>}
    </div>
  )
}

function QuedadaCard({ q, past, onEdit, onDel, onCycle }) {
  const dark=useDark(); const colors=th(dark)
  const ST={
    pendiente:  { bg:'#fef3c7', color:'#92400e', label:'⏳ Pendiente' },
    confirmada: { bg:dark?colors.inp:G[50], color:dark?colors.sub:G[600], label:'✅ Confirmada' },
    cancelada:  { bg:'#fee2e2', color:'#991b1b', label:'❌ Cancelada' },
  }
  const s=ST[q.status||'pendiente']
  return (
    <div style={{...cardStyle(dark),marginBottom:10,opacity:past?0.6:1,borderLeft:`4px solid ${colors.mut}`,borderRadius:'0 12px 12px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
            <span style={{fontSize:15,fontWeight:600,color:colors.txt}}>{q.title}</span>
            <button onClick={onCycle} style={{fontSize:12,padding:'3px 10px',borderRadius:20,border:'none',cursor:'pointer',background:s.bg,color:s.color,fontWeight:500}}>{s.label}</button>
          </div>
          <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
            <Chip icon="📅">{fmtShort(q.date)}</Chip>
            {q.time&&<Chip icon="🕐">{q.time}</Chip>}
            {q.place&&<Chip icon="📍">{q.place}</Chip>}
          </div>
          {q.people&&<div style={{fontSize:13,color:colors.mut,marginTop:6}}>👤 {q.people}</div>}
          {q.notes&&<div style={{fontSize:12,color:colors.mut,marginTop:4,fontStyle:'italic'}}>{q.notes}</div>}
        </div>
        <div style={{display:'flex',gap:4}}><IBtn onClick={onEdit}>✏️</IBtn><IBtn onClick={onDel} red>🗑️</IBtn></div>
      </div>
    </div>
  )
}

// ── Menú ──────────────────────────────────────────────────────────────────────
function MenuView({ data, T, setMeal, toast }) {
  const dark=useDark(); const colors=th(dark)
  const [wOff, setWOff]       = useState(0)
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState('')

  const dates=getWeekDates(wOff)

  const copiarSemana = async () => {
    const prev=getWeekDates(wOff-1)
    let count=0
    for (let i=0;i<7;i++) {
      for (const comida of COMIDAS) {
        const srcVal=data.menu[prev[i]]?.[comida]
        if (srcVal&&!data.menu[dates[i]]?.[comida]) {
          await setMeal(dates[i],comida,srcVal,true)
          count++
        }
      }
    }
    if (count>0) toast(`${count} comidas copiadas ✓`)
    else toast('Sin novedades para copiar')
  }

  const startEdit=(date,meal)=>{ setEditing({date,meal}); setEditVal(data.menu[date]?.[meal]||'') }
  const commit=(date,meal)=>{ setMeal(date,meal,editVal.trim()); setEditing(null) }
  const wLabel=wOff===0?'Esta semana':wOff>0?`+${wOff} sem.`:`${Math.abs(wOff)} sem. atrás`

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:600,color:colors.txt}}>🥗 Menú semanal</h1>
          <p style={{color:colors.mut,fontSize:14,marginTop:4}}>Planifica tus comidas</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <button onClick={copiarSemana} style={{...btnSec(dark),padding:'6px 12px',fontSize:12}}>📋 Copiar sem. anterior</button>
          <IBtn onClick={()=>setWOff(w=>w-1)}>◀</IBtn>
          <span style={{fontSize:14,color:colors.sub,minWidth:100,textAlign:'center'}}>{wLabel}</span>
          <IBtn onClick={()=>setWOff(w=>w+1)}>▶</IBtn>
          {wOff!==0&&<button onClick={()=>setWOff(0)} style={btnSec(dark)}>Hoy</button>}
        </div>
      </div>
      <div style={{overflowX:'auto',borderRadius:12,border:`1px solid ${colors.border}`}}>
        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed',minWidth:500}}>
          <colgroup><col style={{width:90}}/>{dates.map((_,i)=><col key={i}/>)}</colgroup>
          <thead>
            <tr>
              <th style={{background:G[600],padding:'8px',textAlign:'left'}}></th>
              {dates.map((d,i)=>{
                const isT=d===T; const dt=new Date(d+'T12:00:00')
                return <th key={d} style={{padding:'8px 4px',background:isT?G[400]:G[600],color:isT?G[900]:G[100],textAlign:'center',border:`1px solid ${G[800]}30`}}>
                  <div style={{fontSize:11}}>{DIAS_C[i]}</div>
                  <div style={{fontSize:16,fontWeight:700}}>{dt.getDate()}</div>
                </th>
              })}
            </tr>
          </thead>
          <tbody>
            {COMIDAS.map(meal=>(
              <tr key={meal}>
                <td style={{background:dark?colors.inp:G[50],padding:'6px 10px',fontWeight:600,color:colors.mut,fontSize:12,textTransform:'uppercase',letterSpacing:'0.04em',border:`1px solid ${colors.border}`}}>{meal}</td>
                {dates.map(d=>{
                  const isT=d===T,isEd=editing?.date===d&&editing?.meal===meal,val=data.menu[d]?.[meal]
                  return <td key={d} style={{background:isT?(dark?`${colors.inp}88`:`${G[50]}99`):(dark?colors.card:'white'),border:`1px solid ${colors.border}`,padding:4,verticalAlign:'top'}}>
                    {isEd ? (
                      <div>
                        <input value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')commit(d,meal);if(e.key==='Escape')setEditing(null)}} style={{width:'100%',fontSize:12,padding:'3px 6px',borderRadius:4}} autoFocus/>
                        <div style={{display:'flex',gap:2,marginTop:3}}>
                          <button onClick={()=>commit(d,meal)} style={{flex:1,background:G[400],color:'white',border:'none',borderRadius:3,cursor:'pointer',fontSize:11,padding:'2px 0'}}>✓</button>
                          <button onClick={()=>setEditing(null)} style={{flex:1,background:'transparent',border:`1px solid ${colors.border}`,borderRadius:3,cursor:'pointer',color:colors.sub,fontSize:11,padding:'2px 0'}}>✗</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={()=>startEdit(d,meal)} style={{cursor:'pointer',padding:'5px 6px',minHeight:36,borderRadius:4,fontSize:12,color:val?colors.txt:colors.mut,lineHeight:1.4}}>
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
      <p style={{fontSize:12,color:colors.mut,marginTop:10,textAlign:'center'}}>Haz clic en cualquier celda para editar</p>
    </div>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsView({ data, T }) {
  const dark=useDark(); const colors=th(dark)
  const weekDates=getWeekDates(0)
  const mesActual=T.slice(0,7)

  const weekTasks=data.tareas.filter(t=>weekDates.includes(t.date))
  const donePct=weekTasks.length?Math.round(weekTasks.filter(t=>t.done).length/weekTasks.length*100):0

  const catCounts={}
  data.eventos.filter(e=>!e.recurrente).forEach(e=>{ const c=e.categoria||'general'; catCounts[c]=(catCounts[c]||0)+1 })
  const maxCat=Math.max(1,...Object.values(catCounts))

  const stCounts={ pendiente:0,confirmada:0,cancelada:0 }
  data.quedadas.forEach(q=>{ stCounts[q.status||'pendiente']++ })

  const menuFilled=weekDates.reduce((acc,d)=>acc+Object.values(data.menu[d]||{}).filter(Boolean).length,0)
  const menuTotal=weekDates.length*COMIDAS.length
  const menuPct=Math.round(menuFilled/menuTotal*100)

  const workoutSemana=data.eventos.filter(e=>(e.categoria||e.type)==='workout'&&weekDates.includes(e.date)).length
  const workoutMes=data.eventos.filter(e=>(e.categoria||e.type)==='workout'&&e.date?.startsWith(mesActual)).length

  const gastosEsteMes=(data.gastos||[]).filter(g=>g.date?.startsWith(mesActual))
  const totalEsteMes=gastosEsteMes.reduce((acc,g)=>acc+(parseFloat(g.amount)||0),0)
  const gastoPorCat={}
  gastosEsteMes.forEach(g=>{ const c=g.category||'otros'; gastoPorCat[c]=(gastoPorCat[c]||0)+(parseFloat(g.amount)||0) })
  const maxGastoCat=Math.max(1,...Object.values(gastoPorCat))

  return (
    <div style={{maxWidth:700}}>
      <h1 style={{fontSize:26,fontWeight:600,color:colors.txt,marginBottom:'1.5rem'}}>📊 Estadísticas</h1>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

        {/* Tareas semana */}
        <div style={cardStyle(dark)}>
          <div style={{fontSize:13,fontWeight:600,color:colors.sub,marginBottom:12}}>✅ Tareas esta semana</div>
          <div style={{fontSize:32,fontWeight:700,color:colors.txt}}>{weekTasks.filter(t=>t.done).length}<span style={{fontSize:14,color:colors.mut}}>/{weekTasks.length}</span></div>
          <div style={{marginTop:8,height:8,borderRadius:4,background:colors.border,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${donePct}%`,background:G[400],borderRadius:4}}/>
          </div>
          <div style={{fontSize:12,color:colors.mut,marginTop:4}}>{donePct}% completadas</div>
        </div>

        {/* Menú */}
        <div style={cardStyle(dark)}>
          <div style={{fontSize:13,fontWeight:600,color:colors.sub,marginBottom:12}}>🥗 Menú semanal</div>
          <div style={{fontSize:32,fontWeight:700,color:colors.txt}}>{menuFilled}<span style={{fontSize:14,color:colors.mut}}>/{menuTotal}</span></div>
          <div style={{marginTop:8,height:8,borderRadius:4,background:colors.border,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${menuPct}%`,background:G[400],borderRadius:4}}/>
          </div>
          <div style={{fontSize:12,color:colors.mut,marginTop:4}}>{menuPct}% planificado</div>
        </div>

        {/* Workout */}
        <div style={cardStyle(dark)}>
          <div style={{fontSize:13,fontWeight:600,color:colors.sub,marginBottom:12}}>💪 Workout</div>
          <div style={{display:'flex',gap:24,marginBottom:8}}>
            <div>
              <div style={{fontSize:32,fontWeight:700,color:'#7c2d12'}}>{workoutSemana}</div>
              <div style={{fontSize:11,color:colors.mut}}>esta semana</div>
            </div>
            <div>
              <div style={{fontSize:32,fontWeight:700,color:colors.txt}}>{workoutMes}</div>
              <div style={{fontSize:11,color:colors.mut}}>este mes</div>
            </div>
          </div>
          <div style={{fontSize:12,color:colors.mut,borderTop:`1px solid ${colors.border}`,paddingTop:8}}>
            Total registradas: {data.eventos.filter(e=>(e.categoria||e.type)==='workout'&&!e.recurrente).length}
          </div>
        </div>

        {/* Finanzas este mes */}
        <div style={cardStyle(dark)}>
          <div style={{fontSize:13,fontWeight:600,color:colors.sub,marginBottom:12}}>💰 Gastos este mes</div>
          <div style={{fontSize:32,fontWeight:700,color:'#dc2626',marginBottom:4}}>{totalEsteMes.toFixed(2)}€</div>
          <div style={{fontSize:12,color:colors.mut,marginBottom:12}}>{gastosEsteMes.length} gastos registrados</div>
          {Object.entries(GASTO_CATS).filter(([k])=>gastoPorCat[k]>0).slice(0,4).map(([k,v])=>(
            <div key={k} style={{marginBottom:6}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:colors.txt,marginBottom:2}}>
                <span>{v.emoji} {v.label}</span>
                <span style={{color:v.color,fontWeight:600}}>{(gastoPorCat[k]||0).toFixed(2)}€</span>
              </div>
              <div style={{height:5,borderRadius:3,background:colors.border,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${((gastoPorCat[k]||0)/maxGastoCat)*100}%`,background:v.color,borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Por categoría eventos */}
        <div style={cardStyle(dark)}>
          <div style={{fontSize:13,fontWeight:600,color:colors.sub,marginBottom:12}}>📅 Eventos por categoría</div>
          {Object.entries(CATEGORIAS).map(([k,v])=>(
            <div key={k} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:colors.txt,marginBottom:3}}>
                <span>{v.emoji} {v.label}</span>
                <span style={{color:colors.mut}}>{catCounts[k]||0}</span>
              </div>
              <div style={{height:6,borderRadius:3,background:colors.border,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${((catCounts[k]||0)/maxCat)*100}%`,background:v.color,borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Quedadas por estado */}
        <div style={cardStyle(dark)}>
          <div style={{fontSize:13,fontWeight:600,color:colors.sub,marginBottom:12}}>👥 Quedadas por estado</div>
          {[
            {k:'confirmada',label:'✅ Confirmadas',color:'#059669'},
            {k:'pendiente', label:'⏳ Pendientes', color:'#d97706'},
            {k:'cancelada', label:'❌ Canceladas',  color:'#dc2626'},
          ].map(s=>(
            <div key={s.k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <span style={{fontSize:13,color:colors.txt}}>{s.label}</span>
              <span style={{fontSize:24,fontWeight:700,color:s.color}}>{stCounts[s.k]}</span>
            </div>
          ))}
          <div style={{borderTop:`1px solid ${colors.border}`,paddingTop:8,fontSize:12,color:colors.mut}}>
            Total: {data.quedadas.length} quedadas
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Finanzas ──────────────────────────────────────────────────────────────────
function FinanzasView({ data, T, setModal, deleteGasto }) {
  const dark=useDark(); const colors=th(dark)
  const now=new Date()
  const [mesIdx, setMesIdx]=useState(now.getMonth())
  const [anioIdx, setAnioIdx]=useState(now.getFullYear())

  const mesStr=`${anioIdx}-${String(mesIdx+1).padStart(2,'0')}`
  const gastosDelMes=(data.gastos||[]).filter(g=>g.date?.startsWith(mesStr))
  const total=gastosDelMes.reduce((acc,g)=>acc+(parseFloat(g.amount)||0),0)

  const porCat={}
  gastosDelMes.forEach(g=>{ const c=g.category||'otros'; porCat[c]=(porCat[c]||0)+(parseFloat(g.amount)||0) })
  const maxCat=Math.max(1,...Object.values(porCat))

  const prevMes=()=>{ if(mesIdx===0){setMesIdx(11);setAnioIdx(a=>a-1)}else setMesIdx(m=>m-1) }
  const nextMes=()=>{ if(mesIdx===11){setMesIdx(0);setAnioIdx(a=>a+1)}else setMesIdx(m=>m+1) }

  const mayorGasto=gastosDelMes.length>0?Math.max(...gastosDelMes.map(g=>parseFloat(g.amount)||0)):0

  return (
    <div style={{maxWidth:700}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:600,color:colors.txt}}>💰 Finanzas</h1>
          <p style={{color:colors.mut,fontSize:14,marginTop:4}}>Seguimiento de gastos</p>
        </div>
        <button onClick={()=>setModal({type:'gasto'})} style={btnPrimary}>+ Añadir gasto</button>
      </div>

      {/* Nav mes */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'1.5rem'}}>
        <button onClick={prevMes} style={{...btnSec(dark),padding:'6px 14px'}}>◀</button>
        <span style={{fontSize:18,fontWeight:600,color:colors.txt,minWidth:160,textAlign:'center'}}>{MESES[mesIdx]} {anioIdx}</span>
        <button onClick={nextMes} style={{...btnSec(dark),padding:'6px 14px'}}>▶</button>
      </div>

      {/* Cards resumen */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:'1.5rem'}}>
        <div style={{...cardStyle(dark),textAlign:'center'}}>
          <div style={{fontSize:11,color:colors.mut,fontWeight:600,marginBottom:6}}>TOTAL</div>
          <div style={{fontSize:26,fontWeight:700,color:'#dc2626'}}>{total.toFixed(2)}€</div>
        </div>
        <div style={{...cardStyle(dark),textAlign:'center'}}>
          <div style={{fontSize:11,color:colors.mut,fontWeight:600,marginBottom:6}}>Nº GASTOS</div>
          <div style={{fontSize:26,fontWeight:700,color:colors.txt}}>{gastosDelMes.length}</div>
        </div>
        <div style={{...cardStyle(dark),textAlign:'center'}}>
          <div style={{fontSize:11,color:colors.mut,fontWeight:600,marginBottom:6}}>MAYOR GASTO</div>
          <div style={{fontSize:26,fontWeight:700,color:colors.txt}}>{mayorGasto>0?`${mayorGasto.toFixed(2)}€`:'-'}</div>
        </div>
      </div>

      {/* Por categoría */}
      {gastosDelMes.length>0&&(
        <div style={{...cardStyle(dark),marginBottom:'1.5rem'}}>
          <div style={{fontSize:13,fontWeight:600,color:colors.sub,marginBottom:12}}>Desglose por categoría</div>
          {Object.entries(GASTO_CATS).filter(([k])=>porCat[k]>0).sort((a,b)=>(porCat[b[0]]||0)-(porCat[a[0]]||0)).map(([k,v])=>(
            <div key={k} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:colors.txt,marginBottom:4}}>
                <span>{v.emoji} {v.label}</span>
                <span style={{fontWeight:600,color:v.color}}>{(porCat[k]||0).toFixed(2)}€</span>
              </div>
              <div style={{height:6,borderRadius:3,background:colors.border,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${((porCat[k]||0)/maxCat)*100}%`,background:v.color,borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {gastosDelMes.length===0&&<EmptyState icon="💰" text="Sin gastos este mes"/>}
      {[...gastosDelMes].sort((a,b)=>b.date.localeCompare(a.date)).map(g=>{
        const cat=GASTO_CATS[g.category||'otros']||GASTO_CATS.otros
        return (
          <div key={g.id} style={{...cardStyle(dark),marginBottom:8,display:'flex',alignItems:'center',gap:12,borderLeft:`4px solid ${cat.color}`,borderRadius:'0 12px 12px 0'}}>
            <span style={{fontSize:20,flexShrink:0}}>{cat.emoji}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:500,color:colors.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.description}</div>
              <div style={{fontSize:12,color:colors.mut}}>{fmtShort(g.date)}{g.notes&&` · ${g.notes}`}</div>
            </div>
            <span style={{fontSize:16,fontWeight:700,color:'#dc2626',flexShrink:0}}>{parseFloat(g.amount).toFixed(2)}€</span>
            <div style={{display:'flex',gap:4,flexShrink:0}}>
              <IBtn onClick={()=>setModal({type:'gasto',edit:g})}>✏️</IBtn>
              <IBtn onClick={()=>deleteGasto(g.id)} red>🗑️</IBtn>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Buscar ────────────────────────────────────────────────────────────────────
function BuscarView({ data, setModal }) {
  const dark=useDark(); const colors=th(dark)
  const [query, setQuery]=useState('')
  const q=query.trim().toLowerCase()

  const results=q ? [
    ...data.eventos.filter(e=>!e.recurrente&&(e.title?.toLowerCase().includes(q)||e.place?.toLowerCase().includes(q)||e.notes?.toLowerCase().includes(q))).map(e=>({...e,_tipo:'evento'})),
    ...data.quedadas.filter(x=>x.title?.toLowerCase().includes(q)||x.place?.toLowerCase().includes(q)||x.people?.toLowerCase().includes(q)).map(x=>({...x,_tipo:'quedada'})),
    ...data.tareas.filter(t=>t.text?.toLowerCase().includes(q)).map(t=>({...t,_tipo:'tarea'})),
  ] : []

  return (
    <div style={{maxWidth:700}}>
      <h1 style={{fontSize:26,fontWeight:600,color:colors.txt,marginBottom:'1rem'}}>🔍 Buscar</h1>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Busca eventos, quedadas, tareas..." style={{width:'100%',marginBottom:'1.5rem',fontSize:16,padding:'10px 16px'}}/>
      {!q && <Muted>Escribe para buscar en todos tus datos</Muted>}
      {q&&results.length===0&&<EmptyState icon="🔍" text="Sin resultados para esta búsqueda"/>}
      {results.length>0&&(
        <div>
          <div style={{fontSize:12,color:colors.mut,marginBottom:12}}>{results.length} resultado{results.length>1?'s':''}</div>
          {results.map(r=>{
            const cat=r._tipo==='evento'?(CATEGORIAS[r.categoria||'general']||CATEGORIAS.general):null
            return (
              <div key={`${r._tipo}-${r.id}`} style={{...cardStyle(dark),marginBottom:10,display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:20,flexShrink:0}}>{r._tipo==='evento'?cat.emoji:r._tipo==='quedada'?'👥':'✅'}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:500,color:colors.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.title||r.text}</div>
                  <div style={{fontSize:12,color:colors.mut}}>
                    {r._tipo==='tarea'?'Tarea':`${r._tipo==='evento'?'Evento':'Quedada'}${r.date?` · ${fmtShort(r.date)}`:''}`}
                    {r.place&&` · 📍 ${r.place}`}
                  </div>
                </div>
                {r._tipo!=='tarea'&&<IBtn onClick={()=>setModal({type:r._tipo,edit:r})}>✏️</IBtn>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── FormModal ─────────────────────────────────────────────────────────────────
function FormModal({ modal, close, saveEvento, saveQuedada, saveGasto, isMobile }) {
  const dark=useDark(); const colors=th(dark)
  const isEdit=!!modal.edit, isEvento=modal.type==='evento', isGasto=modal.type==='gasto', T=todayISO()
  const [form, setForm]=useState(
    modal.edit ? {...modal.edit} : {
      title:'',date:modal.defaultDate||T,time:'',place:'',notes:'',
      people:'',status:'pendiente',
      categoria:modal.defaultCategoria||'general',
      description:'',amount:'',category:'otros'
    }
  )
  const [saving, setSaving]=useState(false)
  const [saveError, setSaveError]=useState(null)
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))

  const submit=async()=>{
    setSaving(true); setSaveError(null)
    try {
      if(isGasto){
        if(!form.description?.trim())return setSaving(false)
        const gp={description:form.description,amount:form.amount,category:form.category||'otros',date:form.date,notes:form.notes||null}
        if(form.id)gp.id=form.id
        await saveGasto(gp)
      } else {
        if(!form.title.trim())return setSaving(false)
        const payload={title:form.title,date:form.date,time:form.time||null,place:form.place||null,notes:form.notes||null}
        if(isEvento){ const ep={...payload,categoria:form.categoria||'general'}; if(form.id)ep.id=form.id; await saveEvento(ep) }
        else { const qp={...payload,people:form.people||null,status:form.status||'pendiente'}; if(form.id)qp.id=form.id; await saveQuedada(qp) }
      }
      close()
    } catch(err){ setSaveError(err.message||'Error al guardar') }
    finally{ setSaving(false) }
  }

  const tipoLabel=isGasto?'gasto':isEvento?'evento':'quedada'

  return (
    <div style={{background:colors.card,borderRadius:isMobile?'16px 16px 0 0':16,padding:'1.5rem',width:isMobile?'100%':420,maxWidth:isMobile?'100%':'95vw',border:`1px solid ${colors.border}`,maxHeight:'90vh',overflowY:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
        <h2 style={{fontSize:18,fontWeight:600,color:colors.txt}}>{isEdit?'Editar':'Nuevo'} {tipoLabel}</h2>
        <button onClick={close} style={{border:'none',background:'none',cursor:'pointer',fontSize:22,color:colors.mut,lineHeight:1}}>×</button>
      </div>

      {isGasto ? (<>
        <FF label="Descripción *">
          <input value={form.description||''} onChange={e=>set('description',e.target.value)} placeholder="Ej: Supermercado Mercadona" style={{width:'100%'}} onKeyDown={e=>e.key==='Enter'&&submit()}/>
        </FF>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FF label="Importe (€) *">
            <input type="number" min="0" step="0.01" value={form.amount||''} onChange={e=>set('amount',e.target.value)} placeholder="0.00" style={{width:'100%'}}/>
          </FF>
          <FF label="Fecha">
            <input type="date" value={form.date||T} onChange={e=>set('date',e.target.value)} style={{width:'100%'}}/>
          </FF>
        </div>
        <FF label="Categoría">
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {Object.entries(GASTO_CATS).map(([k,v])=>(
              <button key={k} onClick={()=>set('category',k)} style={{padding:'5px 11px',borderRadius:20,border:`2px solid ${(form.category||'otros')===k?v.color:'transparent'}`,background:v.bg,color:v.color,cursor:'pointer',fontSize:12,fontWeight:500}}>
                {v.emoji} {v.label}
              </button>
            ))}
          </div>
        </FF>
        <FF label="Notas"><textarea value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Notas opcionales..." style={{width:'100%',minHeight:60}}/></FF>
      </>) : (<>
        <FF label="Título *">
          <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder={isEvento?'Ej: Torneo Blood Bowl':'Ej: Cena con Ana'} style={{width:'100%'}} onKeyDown={e=>e.key==='Enter'&&submit()}/>
        </FF>
        {isEvento&&(
          <FF label="Categoría">
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {Object.entries(CATEGORIAS).map(([k,v])=>(
                <button key={k} onClick={()=>set('categoria',k)} style={{padding:'6px 14px',borderRadius:20,border:`2px solid ${form.categoria===k?v.color:'transparent'}`,background:v.bg,color:v.color,cursor:'pointer',fontSize:13,fontWeight:500}}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
          </FF>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FF label="Fecha"><input type="date" value={form.date} onChange={e=>set('date',e.target.value)} style={{width:'100%'}}/></FF>
          <FF label="Hora"><input type="time" value={form.time} onChange={e=>set('time',e.target.value)} style={{width:'100%'}}/></FF>
        </div>
        <FF label="Lugar"><input value={form.place} onChange={e=>set('place',e.target.value)} placeholder="¿Dónde?" style={{width:'100%'}}/></FF>
        {!isEvento&&<>
          <FF label="Con quién"><input value={form.people||''} onChange={e=>set('people',e.target.value)} placeholder="Ej: Ana, Carlos" style={{width:'100%'}}/></FF>
          <FF label="Estado">
            <select value={form.status||'pendiente'} onChange={e=>set('status',e.target.value)} style={{width:'100%'}}>
              <option value="pendiente">⏳ Pendiente</option>
              <option value="confirmada">✅ Confirmada</option>
              <option value="cancelada">❌ Cancelada</option>
            </select>
          </FF>
        </>}
        <FF label="Notas"><textarea value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Notas opcionales..." style={{width:'100%',minHeight:70}}/></FF>
      </>)}

      {saveError&&<div style={{background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:13,color:'#991b1b'}}>⚠️ {saveError}</div>}
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:'1rem'}}>
        <button onClick={close} style={btnSec(dark)} disabled={saving}>Cancelar</button>
        <button onClick={submit} style={{...btnPrimary,opacity:saving?0.7:1}} disabled={saving}>
          {saving?'...':isEdit?'💾 Guardar':'+ Añadir'}
        </button>
      </div>
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────
function SectionCard({ title, children, action }) {
  const dark=useDark(); const colors=th(dark)
  return (
    <div style={{marginBottom:'1.25rem'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:600,color:colors.sub,textTransform:'uppercase',letterSpacing:'0.06em'}}>{title}</div>
        {action}
      </div>
      <div style={cardStyle(dark)}>{children}</div>
    </div>
  )
}
function ViewHeader({ title, sub, onAdd }) {
  const dark=useDark(); const colors=th(dark)
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem'}}>
      <div>
        <h1 style={{fontSize:26,fontWeight:600,color:colors.txt}}>{title}</h1>
        <p style={{color:colors.mut,fontSize:14,marginTop:4}}>{sub}</p>
      </div>
      {onAdd&&<button onClick={onAdd} style={btnPrimary}>+ Añadir</button>}
    </div>
  )
}
function GLabel({ children }) {
  const dark=useDark(); const colors=th(dark)
  return <div style={{fontSize:12,fontWeight:600,color:colors.mut,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10,marginTop:6,paddingBottom:6,borderBottom:`1px solid ${colors.border}`}}>{children}</div>
}
function Chip({ icon, children }) {
  const dark=useDark(); const colors=th(dark)
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,color:colors.sub}}>{icon} {children}</span>
}
function Muted({ children }) {
  const dark=useDark(); const colors=th(dark)
  return <p style={{margin:0,fontSize:14,color:colors.mut,fontStyle:'italic'}}>{children}</p>
}
function EmptyState({ icon, text }) {
  const dark=useDark(); const colors=th(dark)
  return (
    <div style={{textAlign:'center',padding:'3rem',color:colors.mut}}>
      <div style={{fontSize:48,marginBottom:12}}>{icon}</div>
      <p style={{margin:0,fontSize:15}}>{text}</p>
    </div>
  )
}
function FF({ label, children }) {
  const dark=useDark(); const colors=th(dark)
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:13,color:colors.sub,marginBottom:5,fontWeight:500}}>{label}</label>
      {children}
    </div>
  )
}
function IBtn({ children, onClick, red }) {
  return <button onClick={onClick} style={{border:'none',background:'none',cursor:'pointer',fontSize:16,padding:4,opacity:red?0.7:1,lineHeight:1}}>{children}</button>
}
function LoadingScreen() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:16,background:'#f0f7ea'}}>
      <div style={{fontSize:48}}>🌿</div>
      <div style={{fontSize:18,color:G[600],fontFamily:'sans-serif'}}>Cargando tu planner...</div>
    </div>
  )
}
function ErrorScreen({ mensaje, onRetry }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:16,background:'#f0f7ea'}}>
      <div style={{fontSize:48}}>⚠️</div>
      <div style={{fontSize:16,color:'#991b1b',fontFamily:'sans-serif'}}>{mensaje}</div>
      <button onClick={onRetry} style={{...btnPrimary,fontFamily:'sans-serif'}}>Reintentar</button>
    </div>
  )
}
function ToastContainer({ toasts }) {
  return (
    <div style={{position:'fixed',bottom:16,right:16,display:'flex',flexDirection:'column',gap:8,zIndex:3000,pointerEvents:'none'}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:G[800],color:'white',padding:'10px 16px',borderRadius:8,fontSize:13,fontWeight:500,boxShadow:'0 4px 12px rgba(0,0,0,0.3)',maxWidth:280,animation:'fadeIn 0.2s ease'}}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}
function ConfirmModal({ message, onConfirm, onCancel }) {
  const dark=useDark(); const colors=th(dark)
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}}>
      <div style={{...cardStyle(dark),maxWidth:340,width:'90%',padding:'1.5rem'}}>
        <div style={{fontSize:16,fontWeight:600,color:colors.txt,marginBottom:'1rem'}}>{message}</div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onCancel} style={btnSec(dark)}>Cancelar</button>
          <button onClick={onConfirm} style={{background:'#dc2626',color:'white',border:'none',borderRadius:8,padding:'8px 20px',cursor:'pointer',fontSize:14,fontWeight:500}}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}
