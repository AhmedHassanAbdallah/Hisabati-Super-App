/* أرزقي | Arzoqi — الأرضيات: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  // النوافذ والصفحات هنا بتتعمل وقت الفتح، فبنشاور على اللي فوق خالص
  function last(q) { var a = document.querySelectorAll(q); return a[a.length - 1] || null; }
  function sh(sel) { return function () { var s = last('.sheet.open'); return s && s.querySelector(sel); }; }
  function pg(sel) { return function () { var p = last('.page-overlay'); return p && p.querySelector(sel); }; }
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'flooring', name: 'الأرضيات', version: 1, keys: ['hflooring_'], more: '#view-more', home: home,
    layered: function () { return !!(history.state && history.state.hfDepth > 0); },
    steps: [
      { t: 'أهلاً بيك في قسم الأرضيات', d: 'هنعمل مثال كامل: مشروع ← بند بالمتر ← فاتورة مصنعية ← PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'مشروع جديد', d: 'عميل + بنود + حساب المصنعية والخامات والربح.', el: '#view-home [data-act="newProject"]', act: [['click', '#view-home [data-act="newProject"]'], wait] },
      { t: 'اسم المشروع والعميل', d: 'اسم يفرّق المشروع، واسم العميل وتليفونه (أو اختار عميل مسجل).', el: sh('[data-k="name"]'), act: [['fill', sh('[data-k="name"]'), 'شقة التجمع (مثال)'], ['fill', sh('[data-nc="name"]'), 'أ. محمد (مثال)']] },
      { t: 'نوع الشغل والحالة', d: 'سيراميك، بورسلين، رخام، باركيه، إنترلوك… وحالة المشروع ومواعيده.', el: sh('[data-k="type"]') },
      { t: 'حفظ المشروع', d: 'دوس «حفظ» وهيتفتح المشروع.', el: sh('[data-act="save"]'), act: [['click', sh('[data-act="save"]')], ['wait', 700]] },
      { t: 'ضيف أول بند', d: 'كل شغلانة في المشروع بند: تركيب بورسلين، وزرة، درج…', el: pg('.btn-accent[data-act="add"]'), act: [['click', pg('.btn-accent[data-act="add"]')], wait] },
      { t: 'اسم البند وطريقة الحساب', d: 'بالمتر المربع أو الطولي أو بالقطعة أو بالدرجة أو مقطوعية… ومصنعية بس أو توريد وتركيب. أو اختار من «أنواع الأعمال».', el: sh('[data-k="name"]'), act: [['fill', sh('[data-k="name"]'), 'تركيب بورسلين 60×60']] },
      { t: 'الكمية والسعر', d: 'الكمية وسعر المصنعية — والإجمالي بيتحسب لوحده.', el: sh('[data-k="qty"]'), act: [['fill', sh('[data-k="qty"]'), '40'], ['fill', sh('[data-k="laborPrice"]'), '120']] },
      { t: 'حفظ البند', d: 'دوس «حفظ البند» وضيف باقي البنود بنفس الطريقة.', el: sh('[data-act="save"]'), act: [['click', sh('[data-act="save"]')], ['wait', 700]] },
      { t: 'حساب المشروع', d: 'قيمة المشروع والمدفوع والمتبقي وصافي الربح.', el: pg('.hero') },
      { t: 'فاتورة من المشروع', d: 'الزرار ده بيعمل فاتورة أو مقايسة أو مستخلص من بنود المشروع.', el: pg('[aria-label="فاتورة من المشروع"]'), act: [['click', pg('[aria-label="فاتورة من المشروع"]')], wait] },
      { t: 'نوع المستند', d: 'فاتورة مصنعية، توريد خامات، توريد وتركيب، مقايسة، عرض سعر، مستخلص أعمال. هنختار «فاتورة مصنعية».', el: sh('[data-id="labor"]'), act: [['click', sh('[data-id="labor"]')], ['wait', 700]] },
      { t: 'الفاتورة', d: 'البنود نازلة من المشروع، وتقدر تضيف بند أو خصم أو مبلغ وتكتب ملاحظات.', el: pg('[data-k="discount"]') },
      { t: 'طلّع الفاتورة PDF', d: 'من الزرار ده بتفتح المعاينة.', el: pg('.btn-accent[data-act="print"]'), act: [['click', pg('.btn-accent[data-act="print"]')], ['wait', 800]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك واللوجو والعميل والبنود والحساب. تقدر تعدّل أي نص بالضغط عليه، وتكبّر أو تصغّر الخط من فوق.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF وتبعته للعميل. كده عرفت تطلّع الفاتورة 🎉', el: pg('[data-print]') },
      { part: 2, t: 'واتساب', d: 'ابعت الفاتورة كرسالة أو انسخها كنص، أو اعمل نسخة جديدة منها.', el: pg('[data-act="wa"]'), pre: [['back'], wait] },
      { part: 2, t: 'المساحات والخامات والمصروفات والدفعات', d: 'جوه المشروع: حاسبة المساحات، والخامات المصروفة، والمصروفات، ودفعات العميل — وكله بيدخل في صافي الربح.', el: pg('[data-tab="areas"]'), pre: [['back'], wait] },
      { part: 2, t: 'الخصم والإضافات', d: 'خصم أو مبالغ إضافية على المشروع.', el: pg('[data-act="adj"]') },
      { part: 2, t: 'فاتورة / عرض سعر', d: 'مستند جديد من غير مشروع.', el: '#view-home [data-act="newDoc"]', pre: home },
      { part: 2, t: 'المخزن', d: 'الخامات بأسعار الشراء والبيع والكميات.', el: '#view-home [data-act="newMaterial"]' },
      { part: 2, t: 'تسجيل دفعة', d: 'أي مبلغ وصلك من عميل.', el: '#view-home [data-act="newPayment"]' },
      { part: 2, t: 'الحاسبات', d: 'المساحات، البلاط، الباركيه، الإنترلوك، اللاصق، الترويبة…', el: '#navBtn-calc' },
      { part: 2, t: 'المشروعات', d: 'كل المشروعات بحالتها.', el: '#navBtn-projects' },
      { part: 2, t: 'العملاء والفواتير والعمال والتقارير', d: 'كل أدوات القسم في «المزيد».', el: '#view-more [data-act="customers"]', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو هنا بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#view-more [data-act="biz"]' },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
