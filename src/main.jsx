import React,{useEffect,useMemo,useState} from 'react'
import{createRoot}from'react-dom/client'
import{Calendar,Users,WalletCards,Bell,Settings as SettingsIcon,LogOut,Plus,Search,Stethoscope,LayoutDashboard,FileText,Menu,X,CheckCircle2,AlertTriangle,Activity}from'lucide-react'
import{supabase}from'./supabase'
import'./styles.css'

const roles={owner:'المالك',manager:'المدير',doctor:'الطبيب',receptionist:'الاستقبال',accountant:'المحاسب'}
const money=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(Number(n||0))
const fmt=d=>d?new Date(d).toLocaleString('ar-TR',{dateStyle:'medium',timeStyle:'short'}):'—'
function toast(msg,type='ok'){window.dispatchEvent(new CustomEvent('toast',{detail:{msg,type}}))}
function App(){
 const[session,setSession]=useState(null),[profile,setProfile]=useState(null),[clinic,setClinic]=useState(null),[member,setMember]=useState(null),[loading,setLoading]=useState(true),[tab,setTab]=useState('dashboard'),[data,setData]=useState({patients:[],appointments:[],treatments:[],invoices:[],payments:[],notifications:[],dental:[]}),[mobile,setMobile]=useState(false)
 useEffect(()=>{if(!supabase)return;
  const finish=(s)=>{setSession(s);setLoading(false)}
  supabase.auth.getSession().then(({data})=>finish(data.session)).catch(()=>setLoading(false))
  const{data:s}=supabase.auth.onAuthStateChange((event,next)=>{
    if(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='USER_UPDATED') setSession(next)
    if(next) setLoading(false)
  })
  return()=>s.subscription.unsubscribe()
},[])
 useEffect(()=>{if(session)load()},[session])
 async function load(){setLoading(true);const uid=session.user.id;const[{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('*').eq('id',uid).maybeSingle(),supabase.from('clinic_members').select('*, clinics(*)').eq('user_id',uid).eq('active',true).limit(1).maybeSingle()]);setProfile(p);setMember(m);setClinic(m?.clinics||null);if(m?.clinic_id){const id=m.clinic_id;const [pa,ap,tr,iv,py,no,dc]=await Promise.all([supabase.from('patients').select('*').eq('clinic_id',id).order('created_at',{ascending:false}),supabase.from('appointments').select('*,patients(full_name,phone)').eq('clinic_id',id).order('starts_at'),supabase.from('treatment_plans').select('*,patients(full_name)').eq('clinic_id',id).order('created_at',{ascending:false}),supabase.from('invoices').select('*,patients(full_name)').eq('clinic_id',id).order('issued_at',{ascending:false}),supabase.from('payments').select('*,patients(full_name),invoices(invoice_number)').eq('clinic_id',id).order('paid_at',{ascending:false}),supabase.from('notifications').select('*').eq('clinic_id',id).order('created_at',{ascending:false}).limit(30),supabase.from('dental_chart').select('*').eq('clinic_id',id)]);setData({patients:pa.data||[],appointments:ap.data||[],treatments:tr.data||[],invoices:iv.data||[],payments:py.data||[],notifications:no.data||[],dental:dc.data||[]})}setLoading(false)}
 if(loading)return <div className="splash"><div className="logo">🦷</div><h2>ClinicPro Dental</h2><span>جاري تجهيز النظام...</span></div>
  if(!session)return <Auth/>
 if(!clinic)return <Onboarding session={session} onDone={load}/>
 const nav=[['dashboard','لوحة التحكم',LayoutDashboard],['patients','المرضى',Users],['appointments','المواعيد',Calendar],['treatments','خطط العلاج',Stethoscope],['finance','الفواتير',WalletCards],['dental','مخطط الأسنان',Activity],['notifications','التنبيهات',Bell],['settings','الإعدادات',SettingsIcon]]
 return <div className="app"><aside className={mobile?'sidebar open':'sidebar'}><div className="brand"><div>🦷</div><strong>ClinicPro</strong><button onClick={()=>setMobile(false)}><X/></button></div><div className="clinic"><b>{clinic.name}</b><small>{roles[member.role]}</small></div>{nav.map(([id,label,I])=><button className={tab===id?'nav active':'nav'} onClick={()=>{setTab(id);setMobile(false)}} key={id}><I size={19}/>{label}</button>)}<button className="nav logout" onClick={()=>supabase.auth.signOut()}><LogOut size={19}/>تسجيل الخروج</button></aside><main><header><button className="menu" onClick={()=>setMobile(true)}><Menu/></button><div><b>{clinic.name}</b><span>{roles[member.role]} · {profile?.full_name||session.user.email}</span></div><div className="head-actions"><Bell/><span className="dot"/></div></header><section className="content">{tab==='dashboard'&&<Dashboard data={data}/>} {tab==='patients'&&<Patients data={data} refresh={load} clinic={clinic}/>} {tab==='appointments'&&<Appointments data={data} refresh={load} clinic={clinic}/>} {tab==='treatments'&&<Treatments data={data} refresh={load} clinic={clinic}/>} {tab==='finance'&&<Finance data={data} refresh={load} clinic={clinic}/>} {tab==='dental'&&<Dental data={data} refresh={load} clinic={clinic}/>} {tab==='notifications'&&<Notifications data={data} refresh={load}/>} {tab==='settings'&&<Settings clinic={clinic} member={member} refresh={load}/>}</section></main><Toast/></div>
}
function Auth(){const[mode,setMode]=useState('login'),[email,setEmail]=useState(''),[pass,setPass]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false);async function go(){setBusy(true);try{let r=mode==='login'?await supabase.auth.signInWithPassword({email,password:pass}):await supabase.auth.signUp({email,password:pass,options:{data:{full_name:name}}});if(r.error)throw r.error;if(mode==='signup'&&!r.data.session)toast('تم إنشاء الحساب. تحقق من بريدك الإلكتروني.')}catch(e){toast(e.message,'error')}finally{setBusy(false)}}return <div className="auth"><div className="auth-card"><div className="auth-logo">🦷</div><h1>ClinicPro Dental</h1><p>إدارة عيادتك الذكية من أي مكان</p>{mode==='signup'&&<input placeholder="الاسم الكامل" value={name} onChange={e=>setName(e.target.value)}/>}<input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" placeholder="كلمة المرور" value={pass} onChange={e=>setPass(e.target.value)}/><button className="primary full" onClick={go} disabled={busy}>{busy?'جاري المعالجة...':mode==='login'?'تسجيل الدخول':'إنشاء الحساب'}</button><button className="link" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'إنشاء حساب جديد':'لدي حساب بالفعل'}</button></div></div>}
function Onboarding({session,onDone}){const[name,setName]=useState('');async function create(){if(!name)return;const{data:c,error}=await supabase.from('clinics').insert({name,owner_user_id:session.user.id}).select().single();if(error)return toast(error.message,'error');const{error:e}=await supabase.from('clinic_members').insert({clinic_id:c.id,user_id:session.user.id,role:'owner'});if(e)return toast(e.message,'error');toast('تم إنشاء العيادة');onDone()}return <div className="auth"><div className="auth-card"><div className="auth-logo">🦷</div><h1>أنشئ عيادتك الأولى</h1><p>سيصبح حسابك مالك العيادة ويمكنك دعوة الفريق لاحقًا.</p><input placeholder="اسم العيادة" value={name} onChange={e=>setName(e.target.value)}/><button className="primary full" onClick={create}>إنشاء العيادة</button></div></div>}
function Head({title,sub,action}){return <div className="page-head"><div><h1>{title}</h1><p>{sub}</p></div>{action}</div>}
function Dashboard({data}){
  const revenue=data.payments.reduce((s,x)=>s+Number(x.amount||0),0)
  const due=data.invoices.reduce((s,x)=>s+Number(x.balance_due||0),0)
  return (
    <>
      <Head title="لوحة التحكم" sub="نظرة سريعة على أداء العيادة اليوم."/>
      <div className="stats">
        <Stat icon={Users} label="المرضى" value={data.patients.length}/>
        <Stat icon={Calendar} label="المواعيد" value={data.appointments.length}/>
        <Stat icon={WalletCards} label="المحصل" value={money(revenue)}/>
        <Stat icon={AlertTriangle} label="المتبقي" value={money(due)}/>
      </div>
      <div className="grid2">
        <section className="panel">
          <h3>المواعيد القادمة</h3>
          {data.appointments.slice(0,6).map(a=>(
            <div className="list-row" key={a.id}>
              <div className="avatar">🦷</div>
              <div>
                <b>{a.patients?.full_name||"مريض"}</b>
                <span>{a.title} · {fmt(a.starts_at)}</span>
              </div>
              <em>{a.status}</em>
            </div>
          ))}
          {!data.appointments.length&&<Empty/>}
        </section>
        <section className="panel">
          <h3>آخر التنبيهات</h3>
          {data.notifications.slice(0,6).map(n=>(
            <div className="list-row" key={n.id}>
              <div className="iconbox"><Bell size={17}/></div>
              <div>
                <b>{n.title}</b>
                <span>{n.body}</span>
              </div>
            </div>
          ))}
          {!data.notifications.length&&<Empty text="لا توجد تنبيهات"/>}
        </section>
      </div>
    </>
  )
}

function Stat({icon:I,label,value}){return <div className="stat"><div className="iconbox"><I size={20}/></div><span>{label}</span><strong>{value}</strong></div>}
function Empty({text='لا توجد بيانات'}){return <div className="empty">{text}</div>}
function Modal({title,children,onClose}){return <div className="modal-bg"><div className="modal"><div className="modal-head"><h3>{title}</h3><button onClick={onClose}><X/></button></div>{children}</div></div>}
function Patients({data,refresh,clinic}){const[open,setOpen]=useState(false),[q,setQ]=useState(''),[form,setForm]=useState({full_name:'',phone:'',email:'',date_of_birth:'',gender:'',allergies:'',medical_history:'',notes:''});const rows=data.patients.filter(p=>(p.full_name+p.phone).toLowerCase().includes(q.toLowerCase()));async function save(){const{data:u}=await supabase.auth.getUser();const{error}=await supabase.from('patients').insert({...form,clinic_id:clinic.id,created_by:u.user.id});if(error)toast(error.message,'error');else{toast('تمت إضافة المريض');setOpen(false);refresh()}}return <><Head title="المرضى" sub="ملفات المرضى والسجل الطبي." action={<button className="primary" onClick={()=>setOpen(true)}><Plus/>مريض جديد</button>}/><div className="toolbar"><Search/><input placeholder="بحث بالاسم أو الهاتف..." value={q} onChange={e=>setQ(e.target.value)}/></div><section className="panel table"><table><thead><tr><th>المريض</th><th>الهاتف</th><th>الميلاد</th><th>الجنس</th><th>الحساسية</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><b>{p.full_name}</b></td><td>{p.phone||'—'}</td><td>{p.date_of_birth||'—'}</td><td>{p.gender||'—'}</td><td>{p.allergies||'لا يوجد'}</td></tr>)}</tbody></table>{!rows.length&&<Empty/>}</section>{open&&<Modal title="إضافة مريض" onClose={()=>setOpen(false)}><Form fields={form} set={setForm}/><div className="actions"><button className="ghost" onClick={()=>setOpen(false)}>إلغاء</button><button className="primary" onClick={save}>حفظ المريض</button></div></Modal>}</>}
function Form({fields,set}){return <div className="form">{[['full_name','الاسم الكامل'],['phone','الهاتف'],['email','البريد الإلكتروني'],['date_of_birth','تاريخ الميلاد'],['gender','الجنس'],['allergies','الحساسية'],['medical_history','التاريخ الطبي'],['notes','ملاحظات']].map(([k,l])=><label key={k}>{l}<input value={fields[k]} onChange={e=>set({...fields,[k]:e.target.value})}/></label>)}</div>}
function Appointments({data,refresh,clinic}){const[open,setOpen]=useState(false),[f,setF]=useState({patient_id:'',title:'موعد',starts_at:'',duration_min:30,notes:''});async function save(){const{data:u}=await supabase.auth.getUser();const{error}=await supabase.from('appointments').insert({...f,clinic_id:clinic.id,created_by:u.user.id});if(error)toast(error.message,'error');else{toast('تم حجز الموعد');setOpen(false);refresh()}}return <><Head title="المواعيد" sub="إدارة جدول العيادة وحالات المراجعين." action={<button className="primary" onClick={()=>setOpen(true)}><Plus/>موعد جديد</button>}/><section className="panel table"><table><thead><tr><th>المريض</th><th>الموعد</th><th>الخدمة</th><th>الحالة</th></tr></thead><tbody>{data.appointments.map(a=><tr key={a.id}><td>{a.patients?.full_name}</td><td>{fmt(a.starts_at)}</td><td>{a.title}</td><td><span className="badge">{a.status}</span></td></tr>)}</tbody></table></section>{open&&<Modal title="موعد جديد" onClose={()=>setOpen(false)}><div className="form"><label>المريض<select value={f.patient_id} onChange={e=>setF({...f,patient_id:e.target.value})}><option value="">اختر المريض</option>{data.patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><label>الخدمة<input value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></label><label>التاريخ والوقت<input type="datetime-local" value={f.starts_at} onChange={e=>setF({...f,starts_at:e.target.value})}/></label><label>المدة بالدقائق<input type="number" value={f.duration_min} onChange={e=>setF({...f,duration_min:Number(e.target.value)})}/></label></div><div className="actions"><button className="ghost" onClick={()=>setOpen(false)}>إلغاء</button><button className="primary" onClick={save}>حفظ</button></div></Modal>}</>}
function Treatments({data}){return <><Head title="خطط العلاج" sub="متابعة مراحل العلاج وتكلفته ونسبة الإنجاز."/><div className="cards">{data.treatments.map(t=><div className="treatment" key={t.id}><b>{t.name}</b><span>{t.patients?.full_name}</span><div className="progress"><i style={{width:t.progress+'%'}}/></div><small>{t.progress}% · {money(t.total_cost)}</small></div>)}{!data.treatments.length&&<Empty/>}</div></>}
function Finance({data,clinic,refresh}){const[open,setOpen]=useState(false),[f,setF]=useState({patient_id:'',invoice_id:'',amount:0,payment_method:'cash',notes:''});async function save(){const{data:u}=await supabase.auth.getUser();const{error}=await supabase.from('payments').insert({...f,clinic_id:clinic.id,paid_by:u.user.id});if(error)toast(error.message,'error');else{toast('تم تسجيل الدفعة');setOpen(false);refresh()}}const total=data.invoices.reduce((s,x)=>s+Number(x.total||0),0),paid=data.payments.reduce((s,x)=>s+Number(x.amount||0),0);return <><Head title="الفواتير والمدفوعات" sub="متابعة الإيرادات والمتبقي." action={<button className="primary" onClick={()=>setOpen(true)}><Plus/>دفعة</button>}/><div className="finance"><Stat icon={FileText} label="الفواتير" value={money(total)}/><Stat icon={CheckCircle2} label="المحصل" value={money(paid)}/><Stat icon={AlertTriangle} label="المتبقي" value={money(total-paid)}/></div><section className="panel table"><table><thead><tr><th>المريض</th><th>الفاتورة</th><th>الإجمالي</th><th>المتبقي</th></tr></thead><tbody>{data.invoices.map(i=><tr key={i.id}><td>{i.patients?.full_name}</td><td>{i.invoice_number}</td><td>{money(i.total)}</td><td>{money(i.balance_due)}</td></tr>)}</tbody></table></section>{open&&<Modal title="تسجيل دفعة" onClose={()=>setOpen(false)}><div className="form"><label>المريض<select value={f.patient_id} onChange={e=>setF({...f,patient_id:e.target.value})}><option value="">اختر</option>{data.patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><label>الفاتورة<select value={f.invoice_id} onChange={e=>setF({...f,invoice_id:e.target.value})}><option value="">اختر</option>{data.invoices.filter(i=>!f.patient_id||i.patient_id===f.patient_id).map(i=><option key={i.id} value={i.id}>{i.invoice_number} — {money(i.balance_due)}</option>)}</select></label><label>المبلغ<input type="number" value={f.amount} onChange={e=>setF({...f,amount:Number(e.target.value)})}/></label><label>طريقة الدفع<select value={f.payment_method} onChange={e=>setF({...f,payment_method:e.target.value})}><option value="cash">نقدي</option><option value="card">بطاقة</option><option value="transfer">تحويل</option></select></label></div><div className="actions"><button className="primary" onClick={save}>حفظ الدفعة</button></div></Modal>}</>}
const toothCatalog=[
 {no:18,name:'الضرس الثالث العلوي الأيمن (ضرس العقل)',jaw:'الفك العلوي',side:'الأيمن'},
 {no:17,name:'الضرس الثاني العلوي الأيمن',jaw:'الفك العلوي',side:'الأيمن'},
 {no:16,name:'الضرس الأول العلوي الأيمن',jaw:'الفك العلوي',side:'الأيمن'},
 {no:15,name:'الضاحك الثاني العلوي الأيمن',jaw:'الفك العلوي',side:'الأيمن'},
 {no:14,name:'الضاحك الأول العلوي الأيمن',jaw:'الفك العلوي',side:'الأيمن'},
 {no:13,name:'الناب العلوي الأيمن',jaw:'الفك العلوي',side:'الأيمن'},
 {no:12,name:'القاطع الجانبي العلوي الأيمن',jaw:'الفك العلوي',side:'الأيمن'},
 {no:11,name:'القاطع المركزي العلوي الأيمن',jaw:'الفك العلوي',side:'الأيمن'},
 {no:21,name:'القاطع المركزي العلوي الأيسر',jaw:'الفك العلوي',side:'الأيسر'},
 {no:22,name:'القاطع الجانبي العلوي الأيسر',jaw:'الفك العلوي',side:'الأيسر'},
 {no:23,name:'الناب العلوي الأيسر',jaw:'الفك العلوي',side:'الأيسر'},
 {no:24,name:'الضاحك الأول العلوي الأيسر',jaw:'الفك العلوي',side:'الأيسر'},
 {no:25,name:'الضاحك الثاني العلوي الأيسر',jaw:'الفك العلوي',side:'الأيسر'},
 {no:26,name:'الضرس الأول العلوي الأيسر',jaw:'الفك العلوي',side:'الأيسر'},
 {no:27,name:'الضرس الثاني العلوي الأيسر',jaw:'الفك العلوي',side:'الأيسر'},
 {no:28,name:'الضرس الثالث العلوي الأيسر (ضرس العقل)',jaw:'الفك العلوي',side:'الأيسر'},
 {no:48,name:'الضرس الثالث السفلي الأيمن (ضرس العقل)',jaw:'الفك السفلي',side:'الأيمن'},
 {no:47,name:'الضرس الثاني السفلي الأيمن',jaw:'الفك السفلي',side:'الأيمن'},
 {no:46,name:'الضرس الأول السفلي الأيمن',jaw:'الفك السفلي',side:'الأيمن'},
 {no:45,name:'الضاحك الثاني السفلي الأيمن',jaw:'الفك السفلي',side:'الأيمن'},
 {no:44,name:'الضاحك الأول السفلي الأيمن',jaw:'الفك السفلي',side:'الأيمن'},
 {no:43,name:'الناب السفلي الأيمن',jaw:'الفك السفلي',side:'الأيمن'},
 {no:42,name:'القاطع الجانبي السفلي الأيمن',jaw:'الفك السفلي',side:'الأيمن'},
 {no:41,name:'القاطع المركزي السفلي الأيمن',jaw:'الفك السفلي',side:'الأيمن'},
 {no:31,name:'القاطع المركزي السفلي الأيسر',jaw:'الفك السفلي',side:'الأيسر'},
 {no:32,name:'القاطع الجانبي السفلي الأيسر',jaw:'الفك السفلي',side:'الأيسر'},
 {no:33,name:'الناب السفلي الأيسر',jaw:'الفك السفلي',side:'الأيسر'},
 {no:34,name:'الضاحك الأول السفلي الأيسر',jaw:'الفك السفلي',side:'الأيسر'},
 {no:35,name:'الضاحك الثاني السفلي الأيسر',jaw:'الفك السفلي',side:'الأيسر'},
 {no:36,name:'الضرس الأول السفلي الأيسر',jaw:'الفك السفلي',side:'الأيسر'},
 {no:37,name:'الضرس الثاني السفلي الأيسر',jaw:'الفك السفلي',side:'الأيسر'},
 {no:38,name:'الضرس الثالث السفلي الأيسر (ضرس العقل)',jaw:'الفك السفلي',side:'الأيسر'}
]
const toothStatusLabels={healthy:'سليم',caries:'تسوس',filled:'حشوة',crown:'تاج',root_canal:'علاج عصب',missing:'مفقود',implant:'زرعة'}

function Dental({data,refresh,clinic}){
 const[pid,setPid]=useState(data.patients[0]?.id||''),[selected,setSelected]=useState(11),[status,setStatus]=useState('healthy'),[notes,setNotes]=useState(''),[treatment,setTreatment]=useState(''),[date,setDate]=useState('')
 const currentPatient=data.patients.find(p=>p.id===pid)
 const tooth=toothCatalog.find(t=>t.no===selected)||toothCatalog[7]
 const row=data.dental.find(x=>x.patient_id===pid&&Number(x.tooth_no)===selected)
 useEffect(()=>{setStatus(row?.status||'healthy');setNotes(row?.notes||'');setTreatment(row?.treatment_done||'');setDate(row?.treatment_date||'')},[pid,selected,row?.id])
 async function saveTooth(){
  if(!pid)return toast('اختر المريض أولاً','error')
  const{data:u}=await supabase.auth.getUser()
  const payload={clinic_id:clinic.id,patient_id:pid,tooth_no:selected,tooth_name:tooth.name,status,notes,treatment_done:treatment,treatment_date:date||null,updated_by:u.user.id}
  const{error}=await supabase.from('dental_chart').upsert(payload,{onConflict:'clinic_id,patient_id,tooth_no'})
  if(error)toast(error.message,'error');else{toast('تم حفظ تفاصيل السن بنجاح');refresh()}
 }
 const groups=[
  {title:'الفك العلوي — الجهة اليمنى',items:toothCatalog.filter(t=>t.jaw==='الفك العلوي'&&t.side==='الأيمن')},
  {title:'الفك العلوي — المنطقة الأمامية',items:toothCatalog.filter(t=>t.jaw==='الفك العلوي'&&t.no>=11&&t.no<=12||t.jaw==='الفك العلوي'&&t.no>=21&&t.no<=22)},
  {title:'الفك العلوي — الجهة اليسرى',items:toothCatalog.filter(t=>t.jaw==='الفك العلوي'&&t.side==='الأيسر')},
  {title:'الفك السفلي — الجهة اليمنى',items:toothCatalog.filter(t=>t.jaw==='الفك السفلي'&&t.side==='الأيمن')},
  {title:'الفك السفلي — المنطقة الأمامية',items:toothCatalog.filter(t=>t.jaw==='الفك السفلي'&&t.no>=31&&t.no<=32||t.jaw==='الفك السفلي'&&t.no>=41&&t.no<=42)},
  {title:'الفك السفلي — الجهة اليسرى',items:toothCatalog.filter(t=>t.jaw==='الفك السفلي'&&t.side==='الأيسر')}
 ]
 return <><Head title="مخطط الأسنان" sub="اختر المريض ثم اختر أي سن أو ضرس لعرض حالته وتفاصيل ما تم علاجه." action={<select className="patient-select" value={pid} onChange={e=>setPid(e.target.value)}><option value="">اختر المريض</option>{data.patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select>}/>
 <div className="dental-layout">
  <section className="panel dental-map-panel">
   <div className="dental-map-head"><div><h3>{currentPatient?currentPatient.full_name:'مخطط الأسنان'}</h3><p>اضغط على اسم السن لعرض حالته وتعديل سجله.</p></div><span className="dental-help">FDI</span></div>
   <div className="jaw-sections">
    {groups.map(g=><div className="jaw-section" key={g.title}><div className="jaw-title">{g.title}</div><div className="tooth-list">{g.items.map(t=>{const r=data.dental.find(x=>x.patient_id===pid&&Number(x.tooth_no)===t.no);return <button key={t.no} className={'tooth-row '+(selected===t.no?'selected ':'')+(r&&r.status!=='healthy'?'has-status':'')} onClick={()=>setSelected(t.no)}><span className="tooth-num">{t.no}</span><span className="tooth-name">{t.name}</span><span className={'tooth-status '+(r?.status||'healthy')}>{toothStatusLabels[r?.status||'healthy']}</span></button>})}</div></div>)}
   </div>
  </section>
  <section className="panel dental-detail">
   <div className="dental-detail-head"><div><span>السن المحدد</span><h2>{tooth.name}</h2><small>رقم FDI: {tooth.no} · {tooth.jaw}</small></div><div className={'detail-status '+status}>{toothStatusLabels[status]}</div></div>
   <div className="detail-fields">
    <label>حالة السن<select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(toothStatusLabels).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label>
    <label>تاريخ آخر إجراء<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <label className="full-field">ما الذي تم إصلاحه أو إجراؤه<textarea value={treatment} onChange={e=>setTreatment(e.target.value)} placeholder="مثال: تنظيف، حشوة ضوئية، علاج عصب، تاج، خلع..."/></label>
    <label className="full-field">ملاحظات الطبيب<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="مثال: ألم عند المضغ، حساسية للبارد، يحتاج متابعة..."/></label>
   </div>
   <div className="dental-detail-actions"><button className="primary" onClick={saveTooth}>حفظ تفاصيل السن</button></div>
   {row&&<div className="saved-tooth"><CheckCircle2 size={17}/><div><b>آخر سجل محفوظ</b><span>{row.treatment_done||'لا يوجد إجراء مسجل'} {row.updated_at?' · '+fmt(row.updated_at):''}</span></div></div>}
  </section>
 </div></>
}
function Notifications({data,refresh}){async function read(id){await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id);refresh()}return <><Head title="التنبيهات" sub="المواعيد والمدفوعات ورسائل النظام."/><section className="panel">{data.notifications.map(n=><div className={n.read_at?'notice read':'notice'} onClick={()=>read(n.id)} key={n.id}><Bell/><div><b>{n.title}</b><span>{n.body}</span><small>{fmt(n.created_at)}</small></div></div>)}{!data.notifications.length&&<Empty text="لا توجد تنبيهات"/>}</section></>}
function Settings({clinic,member,refresh}){
 const[email,setEmail]=useState(''),[fullName,setFullName]=useState(''),[password,setPassword]=useState(''),[role,setRole]=useState('receptionist'),[editing,setEditing]=useState(null),[employees,setEmployees]=useState([]),[busy,setBusy]=useState(false),[name,setName]=useState(clinic.name)
 const canManage=['owner','manager'].includes(member.role)
 async function loadTeam(){const{data,error}=await supabase.functions.invoke('team-admin-v1',{body:{action:'list',clinic_id:clinic.id}});if(error)toast(error.message,'error');else if(data?.ok===false)toast(data.error,'error');else setEmployees(data.users||[])}
 useEffect(()=>{if(canManage)loadTeam()},[clinic.id,member.role])
 async function saveClinic(){const{error}=await supabase.from('clinics').update({name}).eq('id',clinic.id);if(error)toast(error.message,'error');else{toast('تم حفظ إعدادات العيادة');refresh()}}
 function startCreate(){setEditing(null);setEmail('');setFullName('');setPassword('');setRole('receptionist')}
 function startReset(u){setEditing(u);setEmail(u.email);setFullName(u.full_name||'');setRole(u.role);setPassword('')}
 async function saveEmployee(){
  if(!email||!password)return toast('أدخل الإيميل وكلمة المرور','error')
  setBusy(true)
  try{
   const{data,error}=await supabase.functions.invoke('team-admin-v1',{body:{action:editing?'reset':'create',clinic_id:clinic.id,user_id:editing?.user_id,email,full_name:fullName,password,role}})
   if(error)throw error
   if(data?.ok===false)throw new Error(data.error||'تعذر حفظ الحساب')
   toast(data.message||'تم حفظ حساب الموظف')
   startCreate()
   await loadTeam()
  }catch(e){toast(e.message||'تعذر حفظ حساب الموظف','error')}finally{setBusy(false)}
 }
 async function toggle(u){const{data,error}=await supabase.functions.invoke('team-admin-v1',{body:{action:'toggle',clinic_id:clinic.id,user_id:u.user_id,active:!u.active}});if(error)toast(error.message,'error');else if(data?.ok===false)toast(data.error,'error');else{toast(data.message);loadTeam()}}
 return <><Head title="الإعدادات" sub="هوية العيادة وحسابات فريق العمل."/><section className="panel"><h3>هوية العيادة</h3><div className="form"><label>اسم العيادة<input value={name} onChange={e=>setName(e.target.value)}/></label></div><button className="primary" onClick={saveClinic}>حفظ</button></section>{canManage&&<><section className="panel"><div className="team-head"><div><h3>{editing?'إعادة تعيين حساب موظف':'إنشاء حساب موظف'}</h3><p>المدير ينشئ بيانات الدخول مباشرة، ولا يتم إرسال دعوة بالبريد.</p></div>{editing&&<button className="ghost" onClick={startCreate}>＋ موظف جديد</button>}</div><div className="team-form"><label>اسم الموظف<input placeholder="مثال: أحمد محمد" value={fullName} onChange={e=>setFullName(e.target.value)}/></label><label>البريد الإلكتروني<input type="email" placeholder="employee@clinic.com" value={email} onChange={e=>setEmail(e.target.value)} disabled={!!editing}/></label><label>كلمة المرور<input type="password" placeholder="8 أحرف على الأقل" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>الدور<select value={role} onChange={e=>setRole(e.target.value)} disabled={editing&&editing.role==='manager'&&member.role!=='owner'}><option value="doctor">طبيب</option><option value="receptionist">استقبال</option><option value="accountant">محاسب</option>{member.role==='owner'&&<option value="manager">مدير</option>}</select></label></div><div className="team-actions"><button className="primary" onClick={saveEmployee} disabled={busy}>{busy?'جاري الحفظ...':editing?'حفظ كلمة المرور الجديدة':'إنشاء الحساب'}</button>{editing&&<button className="ghost" onClick={startCreate}>إلغاء</button>}</div><p className="security-note">كلمة المرور لا تُعرض لاحقًا ولا تُحفظ كنص داخل قاعدة بيانات العيادة. عند نسيانها يستخدم المدير زر «إعادة تعيين».</p></section><section className="panel"><div className="team-head"><div><h3>حسابات الفريق</h3><p>الحسابات التي أنشأها المدير داخل هذه العيادة.</p></div><Users size={18}/></div><div className="team-list">{employees.map(u=><div className="team-row" key={u.user_id}><div className="member-avatar">👤</div><div className="team-info"><strong>{u.full_name||'بدون اسم'}</strong><span>{u.email} · {roles[u.role]||u.role}</span></div><span className={u.active?'team-active':'team-off'}>{u.active?'نشط':'موقوف'}</span>{u.role!=='owner'&&<><button className="ghost small-btn" onClick={()=>startReset(u)}>إعادة تعيين</button><button className="ghost small-btn" onClick={()=>toggle(u)}>{u.active?'تعطيل':'تفعيل'}</button></>}</div>)}{!employees.length&&<Empty text="لا توجد حسابات فريق بعد"/>}</div></section></>}</>}

function Toast(){const[v,setV]=useState(null);useEffect(()=>{const h=e=>{setV(e.detail);setTimeout(()=>setV(null),3500)};addEventListener('toast',h);return()=>removeEventListener('toast',h)},[]);return v?<div className={'toast '+v.type}>{v.type==='ok'?<CheckCircle2/>:<AlertTriangle/>}{v.msg}</div>:null}
createRoot(document.getElementById('root')).render(<App/>)
