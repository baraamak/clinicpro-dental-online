import {createClient} from "jsr:@supabase/supabase-js@2.57.4"
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}
const APP_URL="https://baraamak.github.io/clinicpro-dental-online/"

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors})
  try{
    const auth=req.headers.get("Authorization")
    if(!auth) throw new Error("Unauthorized")
    const url=Deno.env.get("SUPABASE_URL")
    const anon=Deno.env.get("SUPABASE_ANON_KEY")
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}})
    const admin=createClient(url,service)
    const{data:{user}}=await userClient.auth.getUser()
    if(!user) throw new Error("Unauthorized")

    const{clinic_id,email,role="receptionist"}=await req.json()
    if(!clinic_id||!email) throw new Error("clinic_id and email are required")
    if(!["manager","doctor","receptionist","accountant"].includes(role)) throw new Error("Invalid role")

    const{data:m}=await admin.from("clinic_members").select("role,active").eq("clinic_id",clinic_id).eq("user_id",user.id).maybeSingle()
    if(!m?.active||!["owner","manager"].includes(m.role))
      return new Response(JSON.stringify({error:"Not allowed"}),{status:403,headers:{...cors,"content-type":"application/json"}})

    const{data:i,error:e}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:APP_URL})
    if(e) throw e

    const{error:me}=await admin.from("clinic_members").upsert(
      {clinic_id,user_id:i.user.id,role,active:true},
      {onConflict:"clinic_id,user_id"}
    )
    if(me) throw me

    return new Response(JSON.stringify({ok:true,redirectTo:APP_URL}),{headers:{...cors,"content-type":"application/json"}})
  }catch(e){
    return new Response(JSON.stringify({error:e.message||"Invite failed"}),{status:500,headers:{...cors,"content-type":"application/json"}})
  }
})
