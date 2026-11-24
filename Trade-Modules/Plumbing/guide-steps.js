/* أرزقي | Arzoqi — السباكة: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'plumbing', name: 'السباكة', version: 1, keys: ['hesabati_plumbing_'], more: '#view-more', home: home,
    layered: function () { return !!(history.state && history.state.ovDepth > 0); },
    steps: [
      { t: 'أهلاً بيك في قسم السباكة', d: 'هنعمل مثال كامل: فاتورة ← العميل ← بند نقاط ← الحساب ← الفاتورة PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'فاتورة / عرض سعر', d: 'من هنا تعمل فاتورة أعمال أو توريد وتركيب أو صيانة أو ختامية، أو مقايسة أو عرض سعر.', el: '#qDoc', act: [['click', '#qDoc'], wait] },
      { t: 'اختار نوع المستند', d: 'الفواتير بتتسجل على حساب العميل، والمقايسات وعروض الأسعار للعرض بس. هنختار «فاتورة أعمال سباكة».', el: '#docTypeSheet [data-t="invoice"]', act: [['click', '#docTypeSheet [data-t="invoice"]'], wait] },
      { t: 'بيانات العميل', d: 'اسم العميل (بيقترح من العملاء) والتليفون وعنوان الشغل.', el: '#clientName', act: [['fill', '#clientName', 'أ. محمد (مثال)'], ['fill', '#clientAddress', 'مدينة نصر']] },
      { t: 'تفاصيل الشغل', d: 'وصف المكان ونطاق الشغل والشامل وغير الشامل والمدة وشروط الدفع والضمان — كلها اختيارية وبتظهر في المستند.', el: '#docScope' },
      { t: 'التالي: البنود', d: 'الخطوات فوق: العميل والمشروع ← البنود ← الحساب.', el: '#ebNext', act: [['click', '#ebNext'], wait] },
      { t: 'أقسام البنود', d: 'نقاط، سباكة منزلية، تغذية، صرف، تركيب أدوات، سخانات، طلمبات، فلاتر، صيانة، مواسير، وصلات… أو من المخزن وقائمة الأسعار.', el: '#view-lines .chip[data-cat="points"]' },
      { t: 'ضيف بند', d: 'دوس «بند» علشان تضيف شغلانة.', el: '#addLineFab', act: [['click', '#addLineFab'], wait] },
      { t: 'اختار البند', d: 'اختار من الأسماء الجاهزة (نقطة حوض، قاعدة، دش…) أو اكتب اسمك.', el: '#formSheet .chip[data-i="0"]', act: [['click', '#formSheet .chip[data-i="0"]']] },
      { t: 'الكمية والسعر', d: 'الكمية وطريقة الحساب (بالنقطة، بالحمام، بالمتر…) والسعر. وسعر التكلفة لو عايز تعرف ربحك.', el: '#lfQty', act: [['fill', '#lfQty', '6'], ['fill', '#lfPrice', '150']] },
      { t: 'حفظ البند', d: 'دوس «حفظ البند» وضيف باقي البنود بنفس الطريقة.', el: '#formSheet [data-f="save"]', act: [['click', '#formSheet [data-f="save"]'], ['wait', 600]] },
      { t: 'التالي: الحساب', d: 'بعد البنود روح للحساب.', el: '#ebNext', act: [['click', '#ebNext'], wait] },
      { t: 'إضافات وخصم', d: 'أعمال إضافية أو خصم، وتسجيل عربون أو سداد المتبقي من هنا.', el: '#docDisc' },
      { t: 'طلّع الفاتورة PDF', d: 'من الزرار ده بتفتح الفاتورة.', el: '#view-summary button[onclick="openDocPreview(false)"]', act: [['click', '#view-summary button[onclick="openDocPreview(false)"]'], ['wait', 800]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك واللوجو والعميل والبنود والحساب. تقدر تعدّل أي كلمة بالضغط عليها، وتكبّر أو تصغّر الخط.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF وتبعته للعميل. كده عرفت تطلّع الفاتورة 🎉', el: '#printPreviewModal .tb-print' },
      { part: 2, t: 'العربون والدفعات', d: 'سجّل عربون أو سداد على الفاتورة دي.', el: '#view-summary .btn-accent[onclick^="openPaymentForm"]', pre: [['back'], wait] },
      { part: 2, t: 'مصروف على الشغلانة', d: 'أي مصروف بيتخصم من ربح الفاتورة.', el: '#view-summary [onclick^="openExpenseForm"]' },
      { part: 2, t: 'واتساب', d: 'ابعت الفاتورة كرسالة أو انسخ نصها.', el: '#view-summary .btn-wa' },
      { part: 2, t: 'مقايسة تأسيس', d: 'نقاط + مواسير + وصلات للعرض على العميل.', el: '#qEstimate', pre: home },
      { part: 2, t: 'زيارة صيانة', d: 'الزيارات بتتسجل في سجل العميل.', el: '#qVisit' },
      { part: 2, t: 'تسجيل دفعة', d: 'عربون أو دفعة من أي عميل.', el: '#qPay' },
      { part: 2, t: 'الحاسبات', d: 'نقاط، حمامات، مواسير، حفر…', el: '#qCalc' },
      { part: 2, t: 'المشروعات', d: 'حصر ومصروفات وأرباح كل مشروع.', el: '#qProjects' },
      { part: 2, t: 'الفواتير', d: 'كل المستندات.', el: '#navBtn-docs' },
      { part: 2, t: 'العملاء', d: 'حساب كل عميل ودفعاته وزياراته.', el: '#navBtn-ledger' },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو هنا بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#bizName', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
