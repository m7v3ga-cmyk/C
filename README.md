# شركة النسر الذهبي — موقع نقل الأثاث

## الملفات
- `index.html` — الواجهة الكاملة: SEO، الحاسبة، الحجز، واتساب، Gallery Lightbox، FAQ، Mobile UI.
- `api/bookings.js` — Vercel Serverless Function لحفظ طلبات الحجز في Supabase بدون كشف Service Role Key للمتصفح.
- `supabase/schema.sql` — إنشاء جدول `bookings` والفهارس وRLS.
- `.env.example` — أسماء متغيرات البيئة المطلوبة.
- `package.json` — إعداد بسيط لـ Vercel.

## إعداد Supabase
1. افتح Supabase > SQL Editor.
2. الصق محتوى `supabase/schema.sql` وشغّله.
3. من Supabase Project Settings > API خذ:
   - Project URL
   - Service Role Key
4. أضفهما في Vercel > Project > Settings > Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. فعّل المتغيرات لـ Production وPreview.
6. اعمل Redeploy.

## مهم أمنيًا
لا تضع `SUPABASE_SERVICE_ROLE_KEY` داخل `index.html` أو GitHub. المفتاح يجب أن يبقى في Vercel Environment Variables فقط.

## سلوك الحجز
- نموذج الحجز يحفظ الطلب في Supabase ثم يفتح WhatsApp.
- حاسبة السعر تحفظ الطلب أيضًا قبل فتح WhatsApp.
- إذا تعطل API، WhatsApp يظل يعمل حتى لا تضيع فرصة العميل.
- الطلبات تظهر في Supabase Table Editor داخل جدول `bookings`.
