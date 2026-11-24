/* أرزقي | Arzoqi — التكييف والتبريد: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'hvac', name: 'التكييف والتبريد', version: 1, keys: ['hesabati_hvac_'], more: '#view-more', home: home,
    layered: function () { return !!(history.state && history.state.ovDepth > 0); },
    steps: [
      { t: 'أهلاً بيك في قسم التكييف', d: 'هنعمل مثال كامل: فاتورة تركيب ← العميل والجهاز ← البنود ← الحساب ← الفاتورة PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'فاتورة تركيب', d: 'تركيب أجهزة + نحاس + خامات. (وفيه كمان صيانة وإصلاح ومقايسة وعرض سعر من «فاتورة / عرض سعر».)', el: '#qInstall', act: [['click', '#qInstall'], wait] },
      { t: 'بيانات العميل', d: 'اسم العميل (بيقترح من العملاء) والتليفون وعنوان الشغل.', el: '#clientName', act: [['fill', '#clientName', 'أ. محمد (مثال)'], ['fill', '#clientAddress', 'الشيخ زايد']] },
      { t: 'الجهاز والضمان', d: 'نوع الجهاز وقدرته، ومدة الضمان وشروطه — بيظهروا في الفاتورة وفي سجل الجهاز.', el: '#docDeviceText', act: [['fill', '#docDeviceText', 'سبليت 1.5 حصان']] },
      { t: 'التالي: البنود', d: 'الخطوات فوق: العميل والجهاز ← البنود ← الحساب.', el: '#ebNext', act: [['click', '#ebNext'], wait] },
      { t: 'أقسام البنود', d: 'تركيب، صيانة وتنظيف، زيارات، إصلاح، فريون، نحاس وعزل، فك ونقل، قطع غيار… أو من المخزن وقائمة الأسعار.', el: '#view-lines .chip[data-cat="install"]' },
      { t: 'ضيف بند', d: 'دوس «بند» علشان تضيف شغلانة.', el: '#addLineFab', act: [['click', '#addLineFab'], wait] },
      { t: 'اختار البند', d: 'اختار من الأسماء الجاهزة أو اكتب اسمك.', el: '#formSheet .chip[data-i="0"]', act: [['click', '#formSheet .chip[data-i="0"]']] },
      { t: 'الكمية والسعر', d: 'الكمية وطريقة الحساب (بالجهاز، بالمتر…) والسعر، وسعر التكلفة لو عايز تعرف ربحك.', el: '#lfQty', act: [['fill', '#lfPrice', '900']] },
      { t: 'حفظ البند', d: 'دوس «حفظ البند» وضيف النحاس والخامات بنفس الطريقة.', el: '#formSheet [data-f="save"]', act: [['click', '#formSheet [data-f="save"]'], ['wait', 600]] },
      { t: 'التالي: الحساب', d: 'بعد البنود روح للحساب.', el: '#ebNext', act: [['click', '#ebNext'], wait] },
      { t: 'إضافات وخصم', d: 'رسوم انتقال أو سقالة أو خصم، وتسجيل العربون أو سداد المتبقي.', el: '#docDisc' },
      { t: 'طلّع الفاتورة PDF', d: 'من الزرار ده بتفتح الفاتورة.', el: '#view-summary button[onclick="openDocPreview(false)"]', act: [['click', '#view-summary button[onclick="openDocPreview(false)"]'], ['wait', 800]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك واللوجو والعميل والبنود والحساب. تقدر تعدّل أي كلمة بالضغط عليها، وتكبّر أو تصغّر الخط.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF وتبعته للعميل. كده عرفت تطلّع الفاتورة 🎉', el: '#printPreviewModal .tb-print' },
      { part: 2, t: 'العربون والدفعات', d: 'سجّل عربون أو سداد على الفاتورة دي.', el: '#view-summary .btn-accent[onclick^="openPaymentForm"]', pre: [['back'], wait] },
      { part: 2, t: 'مصروف على الفاتورة', d: 'أي مصروف بيتخصم من ربحها.', el: '#view-summary [onclick^="openExpenseForm"]' },
      { part: 2, t: 'واتساب', d: 'ابعت الفاتورة كرسالة أو انسخ نصها.', el: '#view-summary .btn-wa' },
      { part: 2, t: 'زيارة صيانة', d: 'الزيارات بتتسجل في سجل الجهاز.', el: '#qVisit', pre: home },
      { part: 2, t: 'فاتورة / عرض سعر', d: 'صيانة، إصلاح، مقايسة، عرض سعر…', el: '#qDoc' },
      { part: 2, t: 'تسجيل دفعة', d: 'عربون أو دفعة من أي عميل.', el: '#qPay' },
      { part: 2, t: 'الحاسبات', d: 'تركيب، فريون، نحاس…', el: '#qCalc' },
      { part: 2, t: 'الأجهزة', d: 'أجهزة العملاء وسجل صيانة كل جهاز ومواعيد الصيانة الجاية.', el: '#qDevices' },
      { part: 2, t: 'الفواتير', d: 'كل المستندات.', el: '#navBtn-docs' },
      { part: 2, t: 'العملاء', d: 'حساب كل عميل ودفعاته وأجهزته.', el: '#navBtn-ledger' },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو هنا بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#bizName', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
