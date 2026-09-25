import React,{useEffect,useMemo,useState} from 'react'
import{createRoot}from'react-dom/client'
import{Calendar,Users,WalletCards,Bell,Settings as SettingsIcon,LogOut,Plus,Search,Stethoscope,LayoutDashboard,FileText,Menu,X,CheckCircle2,AlertTriangle,Activity,Paperclip,Download,Trash2}from'lucide-react'
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
function Appointments({data,refresh,clinic}){
 const[open,setOpen]=useState(false),[attachmentsOpen,setAttachmentsOpen]=useState(false),[selectedAppointment,setSelectedAppointment]=useState(null)
 const[f,setF]=useState({patient_id:'',title:'جلسة علاج',starts_at:'',duration_min:30,notes:''})
 async function save(){
  const{data:u}=await supabase.auth.getUser()
  const{error}=await supabase.from('appointments').insert({...f,clinic_id:clinic.id,created_by:u.user.id})
  if(error)toast(error.message,'error');else{toast('تم حجز الجلسة');setOpen(false);refresh()}
 }
 function openAttachments(a){setSelectedAppointment(a);setAttachmentsOpen(true)}
 return <><Head title="المواعيد والجلسات" sub="إدارة جدول العيادة وإرفاق صور وأشعة وملفات كل جلسة." action={<button className="primary" onClick={()=>setOpen(true)}><Plus/>جلسة جديدة</button>}/>
 <section className="panel table"><table><thead><tr><th>المريض</th><th>الجلسة</th><th>التاريخ والوقت</th><th>الحالة</th><th>ملفات الجلسة</th></tr></thead>
 <tbody>{data.appointments.map(a=><tr key={a.id}><td><b>{a.patients?.full_name}</b></td><td>{a.title}</td><td>{fmt(a.starts_at)}</td><td><span className="badge">{a.status}</span></td><td><button className="session-files-btn" onClick={()=>openAttachments(a)}><Paperclip size={14}/> ملفات الجلسة</button></td></tr>)}</tbody></table>{!data.appointments.length&&<Empty text="لا توجد جلسات بعد"/>}</section>
 {open&&<Modal title="جلسة جديدة" onClose={()=>setOpen(false)}><div className="form"><label>المريض<select value={f.patient_id} onChange={e=>setF({...f,patient_id:e.target.value})}><option value="">اختر المريض</option>{data.patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><label>نوع الجلسة<input value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></label><label>التاريخ والوقت<input type="datetime-local" value={f.starts_at} onChange={e=>setF({...f,starts_at:e.target.value})}/></label><label>المدة بالدقائق<input type="number" min="5" value={f.duration_min} onChange={e=>setF({...f,duration_min:Number(e.target.value)})}/></label></div><div className="actions"><button className="ghost" onClick={()=>setOpen(false)}>إلغاء</button><button className="primary" onClick={save}>حفظ الجلسة</button></div></Modal>}
 {attachmentsOpen&&selectedAppointment&&<SessionAttachments appointment={selectedAppointment} clinic={clinic} onClose={()=>{setAttachmentsOpen(false);setSelectedAppointment(null)}}/>}
 </>}

function SessionAttachments({appointment,clinic,onClose}){
 const[files,setFiles]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[category,setCategory]=useState('dental_image'),[note,setNote]=useState('')
 const categories={dental_image:'صورة أسنان',xray:'أشعة X-Ray',cbct:'صورة مقطعية / CBCT',document:'ملف / تقرير',other:'أخرى'}
 async function load(){
  setLoading(true)
  const{data,error}=await supabase.from('appointment_attachments').select('*').eq('appointment_id',appointment.id).order('created_at',{ascending:false})
  if(error)toast(error.message,'error');else setFiles(data||[])
  setLoading(false)
 }
 useEffect(()=>{load()},[appointment.id])
 function ext(name){const x=name.split('.').pop();return x&&x!==name?x.toLowerCase():'bin'}
 function formatSize(bytes){if(!bytes)return '—';if(bytes<1024*1024)return Math.round(bytes/1024)+' KB';return (bytes/1024/1024).toFixed(1)+' MB'}
 async function upload(ev){
  const file=ev.target.files?.[0];ev.target.value=''
  if(!file)return
  if(file.size>250*1024*1024){toast('حجم الملف يتجاوز 250 MB','error');return}
  setBusy(true)
  try{
   const extension=ext(file.name)
   const path=`${clinic.id}/${appointment.patients?.id||appointment.patient_id}/${appointment.id}/${crypto.randomUUID()}.${extension}`
   const{data:u}=await supabase.auth.getUser()
   const{error:storageError}=await supabase.storage.from('clinic-sessions').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false})
   if(storageError)throw storageError
   const{error:dbError}=await supabase.from('appointment_attachments').insert({clinic_id:clinic.id,appointment_id:appointment.id,patient_id:appointment.patient_id,file_name:file.name,storage_path:path,mime_type:file.type||'application/octet-stream',size_bytes:file.size,category,notes:note,uploaded_by:u.user.id})
   if(dbError){await supabase.storage.from('clinic-sessions').remove([path]);throw dbError}
   toast('تم رفع الملف وحفظه ضمن هذه الجلسة');setNote('');await load()
  }catch(e){toast(e.message||'تعذر رفع الملف','error')}
  finally{setBusy(false)}
 }
 async function openFile(file){
  const{data,error}=await supabase.storage.from('clinic-sessions').createSignedUrl(file.storage_path,300)
  if(error)toast(error.message,'error');else window.open(data.signedUrl,'_blank','noopener,noreferrer')
 }
 async function removeFile(file){
  if(!confirm(`حذف الملف «${file.file_name}»؟`))return
  const{error:storageError}=await supabase.storage.from('clinic-sessions').remove([file.storage_path])
  if(storageError){toast(storageError.message,'error');return}
  const{error}=await supabase.from('appointment_attachments').delete().eq('id',file.id)
  if(error)toast(error.message,'error');else{toast('تم حذف الملف');load()}
 }
 return <Modal title={`ملفات جلسة ${appointment.patients?.full_name||'المريض'}`} onClose={onClose}>
   <div className="session-file-head"><div><strong>{appointment.title}</strong><span>{fmt(appointment.starts_at)}</span></div><span className="session-file-private">ملفات خاصة وآمنة</span></div>
   <div className="upload-box">
    <div className="upload-main"><Paperclip size={22}/><div><b>إضافة ملف أو صورة للجلسة</b><small>JPG · PNG · WEBP · PDF · DICOM · ZIP حتى 250 MB</small></div></div>
    <div className="upload-controls"><select value={category} onChange={e=>setCategory(e.target.value)}>{Object.entries(categories).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input placeholder="ملاحظة اختيارية" value={note} onChange={e=>setNote(e.target.value)}/><label className="upload-button">{busy?'جاري الرفع...':'اختيار ملف'}<input type="file" onChange={upload} disabled={busy} accept="image/jpeg,image/png,image/webp,image/tiff,application/pdf,application/dicom,application/zip,.dcm,.zip"/></label></div>
   </div>
   <div className="session-files-list">{loading?<Empty text="جاري تحميل الملفات..."/>:files.length?files.map(file=><div className="session-file-row" key={file.id}><div className="file-type"><FileText size={17}/></div><div className="file-meta"><b>{file.file_name}</b><span>{categories[file.category]} · {formatSize(file.size_bytes)} · {fmt(file.created_at)}</span>{file.notes&&<small>{file.notes}</small>}</div><button className="file-action" onClick={()=>openFile(file)} title="فتح الملف"><Download size={16}/></button><button className="file-action danger" onClick={()=>removeFile(file)} title="حذف الملف"><Trash2 size={15}/></button></div>):<Empty text="لا توجد ملفات مرفقة بهذه الجلسة"/>}</div>
 </Modal>
}
function Treatments({data,refresh,clinic}){
 const[open,setOpen]=useState(false),[detail,setDetail]=useState(null)
 const[form,setForm]=useState({patient_id:'',name:'',total_cost:0,progress:0,status:'planned',notes:''})
 const[newPatient,setNewPatient]=useState(false)
 const[patientForm,setPatientForm]=useState({full_name:'',phone:'',date_of_birth:'',gender:'',allergies:'',medical_history:'',notes:''})

 function reset(){setForm({patient_id:'',name:'',total_cost:0,progress:0,status:'planned',notes:''});setNewPatient(false);setPatientForm({full_name:'',phone:'',date_of_birth:'',gender:'',allergies:'',medical_history:'',notes:''})}

 async function createPatient(){
  const{data:u}=await supabase.auth.getUser()
  const{data:p,error}=await supabase.from('patients').insert({...patientForm,clinic_id:clinic.id,created_by:u.user.id}).select().single()
  if(error){toast(error.message,'error');return null}
  return p
 }

 async function savePlan(){
  const{data:u}=await supabase.auth.getUser()
  let patientId=form.patient_id
  if(newPatient){
   const p=await createPatient()
   if(!p)return
   patientId=p.id
  }
  if(!patientId)return toast('اختر المريض أو أضف مريضًا جديدًا','error')
  if(!form.name.trim())return toast('أدخل اسم خطة العلاج','error')
  const{error}=await supabase.from('treatment_plans').insert({...form,patient_id:patientId,clinic_id:clinic.id,created_by:u.user.id,total_cost:Number(form.total_cost||0),progress:Number(form.progress||0)})
  if(error)toast(error.message,'error');else{toast('تم إنشاء خطة العلاج');setOpen(false);reset();refresh()}
 }

 return <><Head title="خطط العلاج" sub="ملف العلاج الكامل للمريض: الخطة، الجلسات، الملفات، ملاحظات الطبيب وملخص الأسنان." action={<button className="primary" onClick={()=>{reset();setOpen(true)}}><Plus/>إضافة خطة علاج</button>}/>
 <div className="treatment-summary-grid"><Stat icon={Stethoscope} label="خطط العلاج" value={data.treatments.length}/><Stat icon={Users} label="المرضى ضمن الخطط" value={new Set(data.treatments.map(x=>x.patient_id)).size}/><Stat icon={Activity} label="أسنان لها سجلات" value={data.dental.filter(x=>x.status&&x.status!=='healthy').length}/></div>
 <div className="treatment-plan-cards">{data.treatments.map(t=><button className="treatment-plan-card" key={t.id} onClick={()=>setDetail(t)}>
   <div className="plan-card-top"><div><b>{t.name}</b><span>{t.patients?.full_name}</span></div><span className={'plan-status '+t.status}>{t.status==='planned'?'مخططة':t.status==='in_progress'?'قيد العلاج':t.status==='completed'?'مكتملة':'ملغاة'}</span></div>
   <div className="progress"><i style={{width:t.progress+'%'}}/></div>
   <div className="plan-card-bottom"><small>{t.progress}% إنجاز</small><small>{money(t.total_cost)}</small></div>
   <div className="plan-card-note">{t.notes||'لا توجد ملاحظات عامة للخطة'}</div>
   <div className="plan-card-summary">{t.clinical_summary?'ملخص الأسنان: '+t.clinical_summary.split('\n').slice(0,2).join(' · '):'لا يوجد ملخص أسنان مسجل بعد'}</div>
 </button>)}{!data.treatments.length&&<div className="panel"><Empty text="لا توجد خطط علاج بعد — ابدأ بإضافة أول خطة للمريض"/></div>}</div>
 {open&&<Modal title="إضافة خطة علاج للمريض" onClose={()=>setOpen(false)}>
   <div className="plan-create-switch"><button className={!newPatient?'active':''} onClick={()=>setNewPatient(false)}>اختيار مريض موجود</button><button className={newPatient?'active':''} onClick={()=>setNewPatient(true)}>إضافة مريض جديد</button></div>
   {!newPatient?<div className="form"><label>المريض<select value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})}><option value="">اختر المريض</option>{data.patients.map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.phone||'بدون هاتف'}</option>)}</select></label></div>:
   <div className="form"><label>الاسم الكامل<input value={patientForm.full_name} onChange={e=>setPatientForm({...patientForm,full_name:e.target.value})}/></label><label>الهاتف<input value={patientForm.phone} onChange={e=>setPatientForm({...patientForm,phone:e.target.value})}/></label><label>تاريخ الميلاد<input type="date" value={patientForm.date_of_birth} onChange={e=>setPatientForm({...patientForm,date_of_birth:e.target.value})}/></label><label>الجنس<input value={patientForm.gender} onChange={e=>setPatientForm({...patientForm,gender:e.target.value})}/></label><label>الحساسية<input value={patientForm.allergies} onChange={e=>setPatientForm({...patientForm,allergies:e.target.value})}/></label><label>التاريخ الطبي<input value={patientForm.medical_history} onChange={e=>setPatientForm({...patientForm,medical_history:e.target.value})}/></label><label className="full-field">ملاحظات المريض<input value={patientForm.notes} onChange={e=>setPatientForm({...patientForm,notes:e.target.value})} placeholder="ملاحظات عامة عن المريض"/></label></div>}
   <div className="form"><label>اسم خطة العلاج<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="مثال: علاج شامل للفك العلوي"/></label><label>التكلفة الإجمالية<input type="number" value={form.total_cost} onChange={e=>setForm({...form,total_cost:e.target.value})}/></label><label>نسبة الإنجاز<input type="number" min="0" max="100" value={form.progress} onChange={e=>setForm({...form,progress:e.target.value})}/></label><label>الحالة<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="planned">مخططة</option><option value="in_progress">قيد العلاج</option><option value="completed">مكتملة</option><option value="cancelled">ملغاة</option></select></label><label className="full-field">ملاحظات خطة العلاج<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>
   <div className="actions"><button className="ghost" onClick={()=>setOpen(false)}>إلغاء</button><button className="primary" onClick={savePlan}>حفظ خطة العلاج</button></div>
 </Modal>}
 {detail&&<TreatmentPlanDetails plan={detail} data={data} clinic={clinic} refresh={refresh} onClose={()=>setDetail(null)}/>}
 </>}
}

function TreatmentPlanDetails({plan,data,clinic,refresh,onClose}){
 const[sessions,setSessions]=useState([]),[loading,setLoading]=useState(true),[sessionOpen,setSessionOpen]=useState(false),[fileSession,setFileSession]=useState(null)
 const[notes,setNotes]=useState(plan.notes||'')
 const[sessionForm,setSessionForm]=useState({title:'جلسة علاج',starts_at:'',duration_min:30,notes:''})
 const patient=data.patients.find(p=>p.id===plan.patient_id)

 async function loadSessions(){
  setLoading(true)
  const{data:s,error}=await supabase.from('appointments').select('*,patients(full_name,phone)').eq('clinic_id',clinic.id).eq('treatment_plan_id',plan.id).order('starts_at',{ascending:false})
  if(error)toast(error.message,'error');else setSessions(s||[])
  setLoading(false)
 }
 useEffect(()=>{loadSessions()},[plan.id])
 async function saveNotes(){
  const{error}=await supabase.from('treatment_plans').update({notes}).eq('id',plan.id)
  if(error)toast(error.message,'error');else{toast('تم حفظ ملاحظات الخطة');refresh()}
 }
 async function addSession(){
  const{data:u}=await supabase.auth.getUser()
  if(!sessionForm.starts_at)return toast('أدخل تاريخ ووقت الجلسة','error')
  const{error}=await supabase.from('appointments').insert({...sessionForm,clinic_id:clinic.id,patient_id:plan.patient_id,treatment_plan_id:plan.id,created_by:u.user.id})
  if(error)toast(error.message,'error');else{toast('تمت إضافة الجلسة إلى خطة العلاج');setSessionOpen(false);setSessionForm({title:'جلسة علاج',starts_at:'',duration_min:30,notes:''});loadSessions();refresh()}
 }
 const toothRows=data.dental.filter(x=>x.patient_id===plan.patient_id&&x.status&&x.status!=='healthy')
 return <Modal title={'ملف خطة العلاج — '+(patient?.full_name||'المريض')} onClose={onClose}>
  <div className="plan-profile-head"><div><strong>{patient?.full_name}</strong><span>{patient?.phone||'بدون هاتف'}{patient?.date_of_birth?' · '+patient.date_of_birth:''}</span></div><div className="plan-profile-badge">خطة علاج</div></div>
  <div className="clinical-summary-box"><div className="summary-title"><Activity size={16}/> ملخص ما تم العمل عليه من مخطط الأسنان</div>{toothRows.length?<div className="tooth-summary-list">{toothRows.map(t=><div key={t.id||t.tooth_no} className="tooth-summary-row"><b>{t.tooth_name||'السن '+t.tooth_no}</b><span>{toothStatusLabels[t.status]||t.status}{t.treatment_done?' · '+t.treatment_done:''}{t.notes?' · '+t.notes:''}</span></div>)}</div>:<Empty text="لا توجد سجلات علاجية غير سليمة في مخطط الأسنان لهذا المريض"/>}</div>
  <div className="plan-notes-box"><div className="summary-title"><FileText size={16}/> ملاحظات خطة العلاج</div><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات عامة عن خطة العلاج والمتابعة..." /><button className="primary compact-btn" onClick={saveNotes}>حفظ الملاحظات</button></div>
  <div className="sessions-box"><div className="sessions-head"><div><h3>جلسات هذه الخطة</h3><p>كل جلسة تحتوي ملفاتها وصورها وتقاريرها الخاصة.</p></div><button className="primary compact-btn" onClick={()=>setSessionOpen(true)}><Plus/> جلسة</button></div>
   {loading?<Empty text="جاري تحميل الجلسات..."/>:sessions.length?sessions.map(s=><div className="therapy-session-row" key={s.id}><div className="session-date"><b>{new Date(s.starts_at).toLocaleDateString('ar-TR')}</b><span>{new Date(s.starts_at).toLocaleTimeString('ar-TR',{hour:'2-digit',minute:'2-digit'})}</span></div><div className="session-main"><strong>{s.title}</strong><span>{s.notes||'لا توجد ملاحظات للجلسة'}</span></div><button className="session-files-btn" onClick={()=>setFileSession(s)}><Paperclip size={14}/> الملفات</button></div>):<Empty text="لا توجد جلسات مرتبطة بهذه الخطة"/>}
  </div>
  {sessionOpen&&<Modal title="إضافة جلسة إلى خطة العلاج" onClose={()=>setSessionOpen(false)}><div className="form"><label>نوع الجلسة<input value={sessionForm.title} onChange={e=>setSessionForm({...sessionForm,title:e.target.value})}/></label><label>التاريخ والوقت<input type="datetime-local" value={sessionForm.starts_at} onChange={e=>setSessionForm({...sessionForm,starts_at:e.target.value})}/></label><label>المدة بالدقائق<input type="number" min="5" value={sessionForm.duration_min} onChange={e=>setSessionForm({...sessionForm,duration_min:Number(e.target.value)})}/></label><label className="full-field">ملاحظات الجلسة<input value={sessionForm.notes} onChange={e=>setSessionForm({...sessionForm,notes:e.target.value})}/></label></div><div className="actions"><button className="ghost" onClick={()=>setSessionOpen(false)}>إلغاء</button><button className="primary" onClick={addSession}>حفظ الجلسة</button></div></Modal>}
  {fileSession&&<SessionAttachments appointment={{...fileSession,patients:{full_name:patient?.full_name},patient_id:plan.patient_id}} clinic={clinic} onClose={()=>setFileSession(null)}/>}
 </Modal>
}
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
 const upperTeeth=toothCatalog.filter(t=>t.jaw==='الفك العلوي')
 const lowerTeeth=toothCatalog.filter(t=>t.jaw==='الفك السفلي')
 const renderTooth=(t)=>{const r=data.dental.find(x=>x.patient_id===pid&&Number(x.tooth_no)===t.no);return <button key={t.no} className={'tooth-row '+(selected===t.no?'selected ':'')+(r&&r.status!=='healthy'?'has-status':'')} onClick={()=>setSelected(t.no)}><span className="tooth-num">{t.no}</span><span className="tooth-name">{t.name}</span><span className={'tooth-status '+(r?.status||'healthy')}>{toothStatusLabels[r?.status||'healthy']}</span></button>}
 return <><Head title="مخطط الأسنان" sub="اختر المريض ثم اختر أي سن أو ضرس لعرض حالته وتفاصيل ما تم علاجه." action={<select className="patient-select" value={pid} onChange={e=>setPid(e.target.value)}><option value="">اختر المريض</option>{data.patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select>}/>
 <div className="dental-layout">
  <section className="panel dental-map-panel">
   <div className="dental-map-head"><div><h3>{currentPatient?currentPatient.full_name:'مخطط الأسنان'}</h3><p>اضغط على اسم السن لعرض حالته وتعديل سجله.</p></div><span className="dental-help">FDI</span></div>
   <div className="jaw-sections">
    <div className="jaw-section jaw-upper"><div className="jaw-title">🦷 الفك العلوي <span>16 سنًا</span></div><div className="tooth-list">{upperTeeth.map(renderTooth)}</div></div>
    <div className="jaw-section jaw-lower"><div className="jaw-title">🦷 الفك السفلي <span>16 سنًا</span></div><div className="tooth-list">{lowerTeeth.map(renderTooth)}</div></div>
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
