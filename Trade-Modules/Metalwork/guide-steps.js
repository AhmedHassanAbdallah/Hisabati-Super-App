/* أرزقي | Arzoqi — الحدادة وتصنيع الحديد: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'metalwork', name: 'الحدادة وتصنيع الحديد', version: 1, keys: ['hmetal_'], more: '#view-more', home: home,
    steps: [
      { t: 'أهلاً بيك في قسم الحدادة', d: 'هنعمل مثال كامل: بوابة ليزر ← المقاس والسعر ← حفظ لعميل ← الفاتورة PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'اختار نوع الشغل', d: 'بوابة ليزر، بوابة مشغولة بالكيلو، باب صاج، سقف صاج، بالقطعة، مقطوعية. هنختار «بوابة ليزر».', el: '#view-home [data-act="quickKind"][data-kind="laser"]', act: [['click', '#view-home [data-act="quickKind"][data-kind="laser"]'], wait] },
      { t: 'اسم العميل', d: 'اكتب اسم العميل (أو سيبه فاضي لحساب سريع).', el: '#f_cname', act: [['fill', '#f_cname', 'أ. محمد (مثال)'], ['fill', '#f_desc', 'بوابة الفيلا']] },
      { t: 'المقاس والسعر', d: 'الارتفاع والعرض بالمتر، وسعر المتر المربع.', el: '#f_h', act: [['fill', '#f_h', '2'], ['fill', '#f_w', '3'], ['fill', '#f_price', '500']] },
      { t: 'الإجمالي على طول', d: 'المساحة والإجمالي بيتحسبوا وانت بتكتب.', el: '#f_total' },
      { t: 'حفظ', d: 'دوس «حفظ» وهيتعمل الحساب ويتفتح.', el: '#sheet [data-act="saveItem"]', act: [['click', '#sheet [data-act="saveItem"]'], ['wait', 800]] },
      { t: 'حساب العميل', d: 'الإجمالي والمدفوع والمتبقي وصافي الربح.', el: '#jobPage .home-sum' },
      { t: 'طلّع الفاتورة PDF', d: 'من الزرار ده بتفتح الفاتورة.', el: '#jobPage [data-act="preview"][data-doc="invoice"].btn-accent', act: [['click', '#jobPage [data-act="preview"][data-doc="invoice"].btn-accent'], ['wait', 800]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك والعميل والبنود والحساب. تقدر تعدّل أي كلمة بالضغط عليها.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF وتبعته للعميل. كده عرفت تطلّع الفاتورة 🎉', el: '#pvPrint' },
      { part: 2, t: 'ضيف بنود تانية', d: 'أي نوع شغل تاني في نفس الحساب.', el: '#jobPage [data-act="addItem"]', pre: [['back'], wait] },
      { part: 2, t: 'الخامات', d: 'الحديد والصاج والدهان… بسعر الشراء علشان تعرف ربحك.', el: '#jobPage [data-act="addMat"]' },
      { part: 2, t: 'تكاليف التشغيل والهالك', d: 'لحام، قص، دهان، نقل… على العميل أو عليك.', el: '#consCard' },
      { part: 2, t: 'الدفعات', d: 'سجّل أي دفعة والمتبقي بيتحسب لوحده.', el: '#jobPage .home-sum .hs-stats' },
      { part: 2, t: 'صافي الربح', d: 'ليك انت بس ومش بيظهر للعميل.', el: '#profitCard' },
      { part: 2, t: 'عرض سعر', d: 'نفس الحساب كعرض سعر قبل ما العميل يوافق.', el: '#jobPage [data-act="preview"][data-doc="quote"]' },
      { part: 2, t: 'حساب جديد', d: 'عميل + بنود + سعر من البداية.', el: '#view-home [data-act="newJob"]', pre: home },
      { part: 2, t: 'تكاليف التشغيل والهالك', d: 'أسعارك الثابتة لتكاليف التشغيل.', el: '#view-home [data-act="quickCosts"]' },
      { part: 2, t: 'الفواتير', d: 'اختار أي حساب وطلّع فاتورته أو عرض السعر.', el: '#view-home [data-act="pickInvoice"]' },
      { part: 2, t: 'العملاء', d: 'ملف كل عميل وكشف حسابه.', el: '#navBtn-customers' },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو هنا بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#bizName', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
