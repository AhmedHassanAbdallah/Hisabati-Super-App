/* أرزقي | Arzoqi — النقاشة والدهانات: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'painting', name: 'النقاشة والدهانات', version: 1, keys: ['hpaint_'], more: '#view-more', home: home,
    layered: function () { return !!(history.state && history.state.ovDepth > 0); },
    steps: [
      { t: 'أهلاً بيك في قسم النقاشة', d: 'هنعمل مثال كامل: مشروع ← غرفة بالمقاسات ← التكاليف ← الحساب ← الفاتورة PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'مقايسة بالمقاسات', d: 'حوائط وغرف وأسقف بالمتر. (وفيه كمان «مقاولة إجمالية» بمبلغ متفق عليه.)', el: '#qMeasure', act: [['click', '#qMeasure'], wait] },
      { t: 'العميل والمشروع', d: 'اسم العميل (بيقترح من النوتة) والتليفون والعنوان واسم المشروع.', el: '#clientName', act: [['fill', '#clientName', 'أ. محمد (مثال)'], ['fill', '#projectName', 'تشطيب شقة الدور الثالث']] },
      { t: 'وصف الشغل والشروط', d: 'المراحل (معجون، سيلر، بلاستيك…) والشروط بتظهر في المستندات.', el: '#projectDesc' },
      { t: 'قايمة الأسعار', d: 'اختار قايمة أسعارك للمشروع ده — أو عدّلها من الزرار جنبها.', el: '#projPriceList' },
      { t: 'التالي: الأعمال', d: 'الخطوات فوق: المشروع ← الأعمال ← التكاليف ← الحساب.', el: '#ebNext', act: [['click', '#ebNext'], wait] },
      { t: 'ضيف بند', d: 'كل غرفة أو حائط أو سقف بند لوحده.', el: '#addRoomFab', act: [['click', '#addRoomFab'], wait] },
      { t: 'نوع البند', d: 'غرفة، حائط، سقف، متر مربع، متر طولي، بالقطعة…', el: '#wType' },
      { t: 'مقاسات الغرفة', d: 'الطول والعرض والارتفاع — والحوائط والسقف بيتحسبوا لوحدهم. وتقدر تخصم باب أو شباك أو تضيف جبسون وديكور.', el: '#workSheet [data-k="length"]', act: [['fill', '#workSheet [data-k="length"]', '5'], ['fill', '#workSheet [data-k="width"]', '4'], ['fill', '#workSheet [data-k="height"]', '3']] },
      { t: 'سعر المتر', d: 'اكتب السعر أو اختاره من «قائمة أسعاري».', el: '#wPrice', act: [['fill', '#wPrice', '60']] },
      { t: 'حفظ البند', d: 'دوس «حفظ البند» وضيف باقي الغرف بنفس الطريقة.', el: '#saveWorkBtn', act: [['click', '#saveWorkBtn'], ['wait', 600]] },
      { t: 'التالي: التكاليف', d: 'بعد الأعمال روح للتكاليف.', el: '#ebNext', act: [['click', '#ebNext'], wait] },
      { t: 'العمال والمصروفات', d: 'اليوميات والمصروفات وكشف الخامات للمشروع — علشان تعرف صافي ربحك.', el: '#view-costs button[onclick="openWorker(null)"]' },
      { t: 'التالي: الحساب', d: 'آخر خطوة.', el: '#ebNext', act: [['click', '#ebNext'], wait] },
      { t: 'المدفوع والخصم', d: 'اللي اندفع والخصم، وأعمال إضافية خارج الاتفاق — والمتبقي بيتحسب لوحده.', el: '#paidAmount' },
      { t: 'طلّع الفاتورة PDF', d: 'من الزرار ده بتفتح فاتورة الأعمال.', el: '#view-summary button[onclick="openProjectDoc(\'invoice\')"]', act: [['click', '#view-summary button[onclick="openProjectDoc(\'invoice\')"]'], ['wait', 800]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك واللوجو والعميل والغرف والحساب. تقدر تعدّل أي كلمة بالضغط عليها، وتكبّر أو تصغّر الخط.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF وتبعته للعميل. كده عرفت تطلّع الفاتورة 🎉', el: '#printPreviewModal .tb-print' },
      { part: 2, t: 'كل المستندات', d: 'مقايسة، عرض سعر، فاتورة ختامية، كشف حساب… من هنا.', el: '#view-summary button.btn-primary[onclick="openActions()"]', pre: [['back'], wait] },
      { part: 2, t: 'واتساب', d: 'ابعت الفاتورة كرسالة أو انسخ نصها.', el: '#view-summary .btn-wa' },
      { part: 2, t: 'مقاولة إجمالية', d: 'مبلغ متفق عليه + عربون ودفعات.', el: '#qContract', pre: home },
      { part: 2, t: 'كشف خامات', d: 'معجون وبلاستيك وأدوات — للطباعة أو على حسابك.', el: '#qMat' },
      { part: 2, t: 'تسجيل دفعة', d: 'عربون أو دفعة من أي عميل.', el: '#qPay' },
      { part: 2, t: 'المشاريع', d: 'كل المشاريع الجارية والمنتهية.', el: '#navBtn-docs' },
      { part: 2, t: 'العملاء', d: 'حساب كل عميل: المشاريع والدفعات والمتبقي.', el: '#navBtn-ledger' },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو هنا بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#techName', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
