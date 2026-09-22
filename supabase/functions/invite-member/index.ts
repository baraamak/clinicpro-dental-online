import { createClient } from "jsr:@supabase/supabase-js@2.57.4"
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}
const APP_URL="https://baraamak.github.io/clinicpro-dental-online/"

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors})

  try{
    const auth=req.headers.get("Authorization")
    if(!auth) throw new Error("Unauthorized")

    const url=Deno.env.get("SUPABASE_URL")!
    const anon=Deno.env.get("SUPABASE_ANON_KEY")!
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}})
    const admin=createClient(url,service)

    const{data:{user}}=await userClient.auth.getUser()
    if(!user) throw new Error("Unauthorized")

    const{clinic_id,email,role="receptionist"}=await req.json()
    if(!clinic_id||!email) throw new Error("clinic_id and email are required")
    if(!["manager","doctor","receptionist","accountant"].includes(role)) throw new Error("Invalid role")

    const{data:member}=await admin.from("clinic_members")
      .select("role,active")
      .eq("clinic_id",clinic_id)
      .eq("user_id",user.id)
      .maybeSingle()

    if(!member?.active||!["owner","manager"].includes(member.role))
      return new Response(JSON.stringify({error:"ليس لديك صلاحية دعوة أعضاء الفريق"}),{status:403,headers:{...cors,"content-type":"application/json"}})

    // Check whether this email already has an Auth user.
    const{data:list,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000})
    if(listError) throw listError
    const existing=list?.users?.find(u=>(u.email||"").toLowerCase()===(email||"").toLowerCase())

    if(!existing){
      const{data:inv,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:APP_URL})
      if(inviteError) throw inviteError
      const{error:memberError}=await admin.from("clinic_members").upsert(
        {clinic_id,user_id:inv.user.id,role,active:true},
        {onConflict:"clinic_id,user_id"}
      )
      if(memberError) throw memberError
      return new Response(JSON.stringify({ok:true,mode:"invite",message:"تم إرسال دعوة جديدة",redirectTo:APP_URL}),{headers:{...cors,"content-type":"application/json"}})
    }

    // Existing user: grant clinic access. For already-registered users,
    // they should sign in normally; the function avoids creating a duplicate Auth user.
    const{error:memberError}=await admin.from("clinic_members").upsert(
      {clinic_id,user_id:existing.id,role,active:true},
      {onConflict:"clinic_id,user_id"}
    )
    if(memberError) throw memberError

    return new Response(JSON.stringify({
      ok:true,
      mode:"existing",
      message: existing.email_confirmed_at
        ? "هذا البريد لديه حساب مسبقًا. تم تفعيل وصوله إلى العيادة. يمكنه الدخول من صفحة تسجيل الدخول."
        : "هذا البريد لديه دعوة/حساب سابق غير مكتمل. أرسلنا الوصول إلى العيادة، ويجب إكمال تفعيل الحساب من البريد أو استخدام تسجيل الدخول."
    }),{headers:{...cors,"content-type":"application/json"}})

  }catch(e){
    return new Response(JSON.stringify({error:e?.message||"تعذر إرسال الدعوة"}),{status:200,headers:{...cors,"content-type":"application/json"}})
  }
})