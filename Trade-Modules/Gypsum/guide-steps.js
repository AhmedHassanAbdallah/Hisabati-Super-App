/* أرزقي | Arzoqi — الجبس والجبسون بورد: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  function last(q) { var a = document.querySelectorAll(q); return a[a.length - 1] || null; }
  function pg(sel) { return function () { var p = last('.page-overlay.open'); return p && p.querySelector(sel); }; }
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'gypsum', name: 'الجبس والجبسون بورد', version: 1, keys: ['hgyp_'], more: '#view-more', home: home,
    layered: function () { return typeof overlayCount === 'function' && overlayCount() > 0 && !!(history.state && history.state.hg); },
    steps: [
      { t: 'أهلاً بيك في قسم الجبس', d: 'هنعمل مثال كامل: مشروع ← حاسبة الأسقف ← السعر ← الفاتورة PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'مشروع جديد', d: 'عميل + بنود + حسابات المشروع كلها في مكان واحد.', el: '#view-home button[onclick="openProjectEdit(null)"]', act: [['click', '#view-home button[onclick="openProjectEdit(null)"]'], wait] },
      { t: 'العميل والمشروع', d: 'اسم العميل (أو اختار من العملاء) وتليفونه واسم المشروع وعنوانه.', el: '#sheet [data-k="custName"]', act: [['fill', '#sheet [data-k="custName"]', 'أ. محمد (مثال)'], ['fill', '#sheet [data-k="name"]', 'شقة المعادي (مثال)']] },
      { t: 'نطاق الشغل', d: 'مصنعية بس، أو توريد خامات، أو توريد وتركيب — وده بيحدد إيه اللي يظهر في الفاتورة.', el: '#sheet [data-k="scope"]' },
      { t: 'حفظ المشروع', d: 'دوس «حفظ» وهيتفتح المشروع.', el: '#sheet button[onclick^="saveProjectEdit"]', act: [['click', '#sheet button[onclick^="saveProjectEdit"]'], ['wait', 700]] },
      { t: 'من الحاسبات', d: 'أسهل طريقة: احسب بالحاسبة وهي تضيف البنود والخامات للمشروع لوحدها. (أو «بند يدوي».)', el: pg('button[onclick^="addFromCalc"]'), act: [['click', pg('button[onclick^="addFromCalc"]')], wait] },
      { t: 'اختار الحاسبة', d: 'أسقف معلقة، قواطيع، بيت نور، تكسية حوائط وأعمدة، جبس بلدي، كرانيش، بانوهات، روزتات… هنختار «الأسقف المعلقة».', el: '#sheet .calc-tile', act: [['click', '#sheet .calc-tile'], ['wait', 600]] },
      { t: 'مقاسات الغرفة', d: 'اسم الغرفة والطول والعرض — وتقدر تضيف غرف تانية.', el: pg('[data-k="L"]'), act: [['fill', pg('[data-k="name"]'), 'الصالة'], ['fill', pg('[data-k="L"]'), '5'], ['fill', pg('[data-k="W"]'), '4']] },
      { t: 'النظام ونوع اللوح', d: 'القطاعات والتصميم ونوع اللوح وسُمكه والهالك والعزل — والقيم الافتراضية جاهزة.', el: pg('[data-k="system"]') },
      { t: 'النتيجة', d: 'الألواح والقطاعات والمسامير والمعجون والشريط بالكمية — وتقدر تبعتها واتساب.', el: '#calcResult' },
      { t: 'إضافة للمشروع', d: 'البنود والخامات بتنزل في المشروع.', el: pg('button[onclick="calcToProject()"]'), act: [['click', pg('button[onclick="calcToProject()"]')], ['wait', 700]] },
      { t: 'البند اتضاف', d: 'دوس على البند علشان تكتب سعر المصنعية وتراجع الخامات وأسعارها.', el: pg('.item-card'), act: [['click', pg('.item-card')], wait] },
      { t: 'سعر المصنعية', d: 'سعر المتر — والإجمالي بيتحسب لوحده.', el: '#sheet [data-k="laborRate"]', act: [['fill', '#sheet [data-k="laborRate"]', '180']] },
      { t: 'حفظ البند', d: 'دوس «حفظ».', el: '#sheet button[onclick^="saveItem"]', act: [['click', '#sheet button[onclick^="saveItem"]'], ['wait', 700]] },
      { t: 'حساب المشروع', d: 'الإجمالي والمستلم والمتبقي وصافي الربح.', el: pg('.hero') },
      { t: 'المستندات', d: 'من الزرار ده بتعمل أي مستند للمشروع.', el: pg('button[onclick^="openDocBuilder"]'), act: [['click', pg('button[onclick^="openDocBuilder"]')], wait] },
      { t: 'اختار المستند', d: 'فاتورة توريد وتركيب، مصنعية، توريد خامات، عرض سعر، مقايسة، مستخلص، تقرير تكلفة داخلي. هنختار «فاتورة توريد وتركيب».', el: '#sheet .create-opt.dark', act: [['click', '#sheet .create-opt.dark'], wait] },
      { t: 'الخصم والمدفوع', d: 'خصم أو إضافات أو مبلغ مدفوع على الفاتورة، وملاحظات.', el: '#sheet [data-k="discount"]' },
      { t: 'طلّع الفاتورة PDF', d: 'دوس «معاينة وحفظ».', el: '#sheet button[onclick^="createDoc"]', act: [['click', '#sheet button[onclick^="createDoc"]'], ['wait', 900]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك واللوجو والعميل والبنود والحساب. تقدر تعدّل أي كلمة بالضغط عليها.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF، ومن فوق تبعتها واتساب أو تنسخها. كده عرفت تطلّع الفاتورة 🎉', el: '#printPreviewModal .tb-print' },
      { part: 2, t: 'الحسابات والمدفوعات والتكاليف', d: 'جوه المشروع: الحسابات، ودفعات العميل، وتكاليف العمال والمصروفات — وكله في صافي الربح.', el: pg('button[onclick*="\'acc\'"]'), pre: [['back'], wait] },
      { part: 2, t: 'فاتورة / مقايسة', d: 'من أي مشروع موجود.', el: '#view-home button[onclick="quickInvoice()"]', pre: home },
      { part: 2, t: 'المخزون', d: 'الخامات بأسعار الشراء والبيع، والناقص منها.', el: '#view-home button[onclick="openStockEdit(null)"]' },
      { part: 2, t: 'تسجيل دفعة', d: 'أي مبلغ من عميل.', el: '#view-home button[onclick="openPaymentSheet(null)"]' },
      { part: 2, t: 'الحاسبات', d: 'كل الحاسبات تشتغل لوحدها كمان من غير مشروع.', el: '#navBtn-calc' },
      { part: 2, t: 'المشروعات', d: 'كل المشروعات بحالتها.', el: '#navBtn-projects' },
      { part: 2, t: 'العملاء والفواتير والعمال والتقارير', d: 'كل أدوات القسم في «المزيد».', el: '#view-more button[onclick="openCustomersPage()"]', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو في «بيانات النشاط» بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#view-more button[onclick="openSettingsPage()"]' },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
