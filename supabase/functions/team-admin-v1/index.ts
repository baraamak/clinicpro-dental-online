import { createClient } from "jsr:@supabase/supabase-js@2.57.4"
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors})
  try{
    const auth=req.headers.get("Authorization")
    if(!auth) throw new Error("Unauthorized")
    const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}}), admin=createClient(url,service)
    const {data:{user}}=await userClient.auth.getUser()
    if(!user) throw new Error("Unauthorized")
    const body=await req.json(), action=body.action||"create", clinic_id=body.clinic_id
    if(!clinic_id) throw new Error("clinic_id is required")
    const {data:caller}=await admin.from("clinic_members").select("role,active").eq("clinic_id",clinic_id).eq("user_id",user.id).maybeSingle()
    if(!caller?.active||!["owner","manager"].includes(caller.role)) throw new Error("ليس لديك صلاحية إدارة حسابات الفريق")

    if(action==="list"){
      const {data:members,error:me}=await admin.from("clinic_members").select("id,user_id,role,active,created_at").eq("clinic_id",clinic_id).order("created_at",{ascending:true}); if(me)throw me
      const {data:users,error:ue}=await admin.auth.admin.listUsers({page:1,perPage:1000}); if(ue)throw ue
      const rows=(members||[]).map(m=>{const u=users.users.find(x=>x.id===m.user_id);return {member_id:m.id,user_id:m.user_id,role:m.role,active:m.active,email:u?.email||"",full_name:u?.user_metadata?.full_name||"",created_at:m.created_at}})
      return new Response(JSON.stringify({ok:true,users:rows}),{headers:{...cors,"content-type":"application/json"}})
    }

    if(action==="create"||action==="reset"){
      const {email,password,full_name="",role="receptionist",user_id}=body
      if(!email||!password) throw new Error("الإيميل وكلمة المرور مطلوبان")
      if(password.length<8) throw new Error("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
      if(!["manager","doctor","receptionist","accountant"].includes(role)) throw new Error("الدور غير صالح")
      if(role==="manager"&&caller.role!=="owner") throw new Error("إنشاء حساب مدير متاح للمالك فقط")
      if(action==="reset"){
        if(!user_id)throw new Error("user_id مطلوب لإعادة تعيين كلمة المرور")
        const {data:em}=await admin.from("clinic_members").select("role").eq("clinic_id",clinic_id).eq("user_id",user_id).maybeSingle()
        if(!em)throw new Error("المستخدم غير موجود ضمن فريق هذه العيادة")
        if(em.role==="owner")throw new Error("لا يمكن إعادة تعيين حساب مالك العيادة من هنا")
        const {error}=await admin.auth.admin.updateUserById(user_id,{password}); if(error)throw error
        return new Response(JSON.stringify({ok:true,mode:"reset",message:"تم تحديث كلمة مرور الموظف"}),{headers:{...cors,"content-type":"application/json"}})
      }
      const {data:users,error:ue}=await admin.auth.admin.listUsers({page:1,perPage:1000}); if(ue)throw ue
      const existing=users.users.find(u=>(u.email||"").toLowerCase()===(email||"").toLowerCase())
      if(existing)throw new Error("هذا البريد لديه حساب بالفعل. استخدم بريدًا جديدًا لإنشاء موظف، أو استخدم زر إعادة تعيين للحساب الموجود داخل هذه العيادة.")
      const {data:created,error:ce}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name}}); if(ce)throw ce
      const {error:pe}=await admin.from("profiles").upsert({id:created.user.id,full_name:full_name||email}); if(pe)throw pe
      const {error:me}=await admin.from("clinic_members").upsert({clinic_id,user_id:created.user.id,role,active:true},{onConflict:"clinic_id,user_id"}); if(me)throw me
      return new Response(JSON.stringify({ok:true,mode:"created",message:"تم إنشاء حساب الموظف بنجاح",user_id:created.user.id}),{headers:{...cors,"content-type":"application/json"}})
    }

    if(action==="toggle"){
      const {user_id,active}=body
      if(!user_id)throw new Error("user_id is required")
      const {data:m}=await admin.from("clinic_members").select("role").eq("clinic_id",clinic_id).eq("user_id",user_id).maybeSingle()
      if(m?.role==="owner")throw new Error("لا يمكن تعطيل مالك العيادة")
      const {error}=await admin.from("clinic_members").update({active:Boolean(active)}).eq("clinic_id",clinic_id).eq("user_id",user_id); if(error)throw error
      return new Response(JSON.stringify({ok:true,message:active?"تم تفعيل الحساب":"تم تعطيل الحساب"}),{headers:{...cors,"content-type":"application/json"}})
    }
    throw new Error("Unknown action")
  }catch(e){return new Response(JSON.stringify({ok:false,error:e?.message||"تعذر تنفيذ العملية"}),{status:200,headers:{...cors,"content-type":"application/json"}})}
})