/* أرزقي | Arzoqi — البناء وأعمال المباني: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'masonry', name: 'البناء وأعمال المباني', version: 1, keys: ['hmas_'], more: '#view-more', home: home,
    steps: [
      { t: 'أهلاً بيك في قسم البناء', d: 'هنعمل مثال كامل: حائط طوب ← العدد والمونة ← المصنعية ← حفظ لعميل ← الفاتورة PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'حاسبة الطوب', d: 'من هنا تحسب عدد الطوب والمونة لأي حوائط.', el: '#view-home [data-act="quickKind"][data-kind="walls"]', act: [['click', '#view-home [data-act="quickKind"][data-kind="walls"]'], wait] },
      { t: 'مقاس الحائط', d: 'الطول والارتفاع بالمتر — وتقدر تضيف حوائط وفتحات وغرف كاملة.', el: '#itemPage [data-k="walls.0.L"]', act: [['fill', '#itemPage [data-k="walls.0.L"]', '8'], ['fill', '#itemPage [data-k="walls.0.H"]', '3']] },
      { t: 'نوع الطوب', d: 'من «مكتبة الطوب» بالمقاس والسعر — كل حائط ممكن يبقى بنوع.', el: '#itemPage select[data-brick="0"]' },
      { t: 'التكاليف والنتيجة', d: 'عدد الطوب والمونة والأسمنت والرمل وتكلفتهم — بطريقة الحساب.', el: '#itRes' },
      { t: 'المصنعية', d: 'بالمتر المربع أو بالألف طوبة أو باليومية… اكتب سعرك.', el: '#itemPage [data-k="labor.price"]', act: [['fill', '#itemPage [data-k="labor.price"]', '60']] },
      { t: 'احفظ لعميل', d: 'اكتب اسم العميل واسم المشروع — أو سيبهم فاضيين لحساب سريع.', el: '#f_cname', act: [['fill', '#f_cname', 'أ. محمد (مثال)'], ['fill', '#f_jtitle', 'عمارة فيصل']] },
      { t: 'حفظ', d: 'دوس «حفظ» وهيتعمل المشروع ويتفتح.', el: '#itemPage [data-act="saveItem"]', act: [['click', '#itemPage [data-act="saveItem"]'], ['wait', 800]] },
      { t: 'حساب المشروع', d: 'الإجمالي والمدفوع والمتبقي والربح.', el: '#jobPage .home-sum' },
      { t: 'طلّع الفاتورة PDF', d: 'من الزرار ده بتفتح الفاتورة (أو عرض السعر).', el: '#jobPage .pg-foot [data-act="preview"]', act: [['click', '#jobPage .pg-foot [data-act="preview"]'], ['wait', 800]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك والعميل والبنود والحساب. تقدر تعدّل أي كلمة بالضغط عليها.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF وتبعته للعميل. كده عرفت تطلّع الفاتورة 🎉', el: '#pvPrint' },
      { part: 2, t: 'ضيف بنود تانية', d: 'طوب، بلوك، غرف، مونة، محارة، حجر، أرضيات، تكسير، مصنعية…', el: '#jobPage [data-act="addKind"]', pre: [['back'], wait] },
      { part: 2, t: 'الهالك ومصاريف البناء', d: 'خامات، هالك، عمالة، نقل، معدات… على العميل أو عليك.', el: '#costCard' },
      { part: 2, t: 'العمال واليومية', d: 'يوميات العمال على المشروع بتدخل في تكلفته.', el: '#jobPage [data-act="workersForJob"]' },
      { part: 2, t: 'الدفعات', d: 'سجّل أي دفعة والمتبقي بيتحسب لوحده.', el: '#jobPage .home-sum .hs-stats' },
      { part: 2, t: 'التكاليف والربح', d: 'ليك انت بس ومش بيظهر للعميل.', el: '#profitCard' },
      { part: 2, t: 'الحاسبات', d: 'الطوب والبلوك والغرف والمونة والمحارة والحجر والأرضيات والتكسير والمصنعية.', el: '#catTiles', pre: home },
      { part: 2, t: 'العمال واليومية', d: 'الأجور والسلف والمستحقات.', el: '#view-home [data-act="tool"][data-tool="workers"]' },
      { part: 2, t: 'مكتبة الطوب', d: 'أنواع الطوب والبلوك بمقاساتها وأسعارها.', el: '#view-home [data-act="tool"][data-tool="library"]' },
      { part: 2, t: 'الفواتير', d: 'اختار أي مشروع وطلّع فاتورته أو عرض السعر.', el: '#view-home [data-act="pickInvoice"]' },
      { part: 2, t: 'العملاء', d: 'ملف كل عميل وكشف حسابه.', el: '#navBtn-customers' },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو هنا بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#bizName', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
