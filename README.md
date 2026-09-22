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
