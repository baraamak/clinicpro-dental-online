# ClinicPro Dental Online
نظام إدارة عيادات أسنان متعدد المستخدمين Online، مبني بـ React + Vite + Supabase.

## Online backend
- Supabase project: `ClinicPro Dental Online`
- Region: EU Central
- PostgreSQL + Auth + Row Level Security
- Multi-tenant clinic isolation
- Roles: owner / manager / doctor / receptionist / accountant
- Dental chart, patients, appointments, treatment plans, invoices, payments, notifications
- GitHub Pages workflow included

## تشغيل محلي
```bash
npm install
npm run dev
```

## GitHub Pages
أضف Secrets في المستودع:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

ثم من Settings > Pages اختر GitHub Actions.

## الاستضافة لاحقًا
المشروع Vite static frontend، لذلك يمكن نقله إلى Vercel أو Netlify أو أي استضافة تدعم SPA/static assets. قاعدة البيانات تبقى على Supabase ويمكن تغيير الاستضافة دون نقل البيانات.

## ملاحظات الإنتاج
مفاتيح Supabase publishable/anon مسموحة في الواجهة مع RLS. لا تضع Service Role Key في GitHub أو الواجهة.


## مهم: دعوات البريد ومنع otp_expired
لأن بعض Outlook/Microsoft security scanners قد تفتح روابط Supabase ذات الاستخدام الواحد قبل المستخدم، يستخدم ClinicPro صفحة وسيطة لا تستهلك TokenHash تلقائيًا. يجب تعديل Supabase Dashboard > Authentication > Email Templates > Invite user إلى:

```html
<h2>You're invited to ClinicPro Dental</h2>
<p>لقد تمت دعوتك للانضمام إلى العيادة. افتح صفحة القبول ثم اضغط زر قبول الدعوة.</p>
<p>
  <a href="{{ .RedirectTo }}?invite=1&amp;token_hash={{ .TokenHash }}&amp;type=invite">
    قبول الدعوة
  </a>
</p>
```

يجب أن يكون **Site URL** و **Redirect URLs** متضمنين:
`https://baraamak.github.io/clinicpro-dental-online/`

عند فتح البريد يصل المستخدم أولًا إلى صفحة ClinicPro، وعند ضغطه يدويًا على "قبول الدعوة" فقط يتم استدعاء `supabase.auth.verifyOtp({ token_hash, type: 'invite' })`.
