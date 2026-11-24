/* أرزقي | Arzoqi — النجارة والأثاث: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  var step = function (i) { return ['click', '#sheet [data-act="goStep"][data-i="' + i + '"]']; };
  ArzoqiGuide.define({
    id: 'carpentry', name: 'النجارة والأثاث', version: 1, keys: ['hcarp_'], more: '#view-more', home: home,
    steps: [
      { t: 'أهلاً بيك في قسم النجارة', d: 'هنعمل مثال كامل: دولاب ← المقاسات ← السعر ← حفظ لعميل ← الفاتورة PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'اختار نوع الشغل', d: 'أثاث، غرف نوم، دواليب، مطابخ، أبواب، شبابيك، ديكور… هنختار «دواليب».', el: '#view-home [data-act="quickCat"][data-cat="wardrobe"]', act: [['click', '#view-home [data-act="quickCat"][data-cat="wardrobe"]'], wait] },
      { t: 'العميل والمشروع', d: 'اكتب اسم العميل واسم المشروع (أو سيبهم فاضيين لحساب سريع).', el: '#f_cname', act: [['fill', '#f_cname', 'أ. محمد (مثال)'], ['fill', '#f_jtitle', 'شقة المعادي']] },
      { t: 'نوع الدولاب', d: 'اختار النوع من الاقتراحات أو اكتبه.', el: '#sheet [data-act="setType"]', act: [['click', '#sheet [data-act="setType"]']] },
      { t: 'الخطوات', d: 'البند بيتسجل على خطوات: النوع ← المقاسات ← التفاصيل ← السعر ← الملخص.', el: '#sheet .step-bar', act: [step(1)] },
      { t: 'المقاسات', d: 'العرض والارتفاع والعمق (سم أو متر).', el: '#sheet [data-k="w"]', act: [['fill', '#sheet [data-k="w"]', '300'], ['fill', '#sheet [data-k="h"]', '240'], ['fill', '#sheet [data-k="d"]', '60'], step(3)] },
      { t: 'طريقة الحساب والسعر', d: 'بالمتر الطولي أو المربع أو بالقطعة أو مقطوعية — واكتب سعرك.', el: '#sheet [data-k="price"]', act: [['fill', '#sheet [data-k="price"]', '1500'], step(5)] },
      { t: 'الملخص', d: 'المصنعية وتكلفة الخامات والربح في البند.', el: '#itSum' },
      { t: 'حفظ', d: 'دوس «حفظ» وهيتعمل المشروع ويتفتح.', el: '#sheet [data-act="saveItem"]', act: [['click', '#sheet [data-act="saveItem"]'], ['wait', 800]] },
      { t: 'حساب المشروع', d: 'الإجمالي والمدفوع والمتبقي والربح.', el: '#jobPage .home-sum' },
      { t: 'طلّع الفاتورة PDF', d: 'من الزرار ده بتفتح الفاتورة (أو عرض السعر).', el: '#jobPage .pg-foot [data-act="preview"]', act: [['click', '#jobPage .pg-foot [data-act="preview"]'], ['wait', 800]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك والعميل والبنود والحساب. تقدر تعدّل أي كلمة بالضغط عليها.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF وتبعته للعميل. كده عرفت تطلّع الفاتورة 🎉', el: '#pvPrint' },
      { part: 2, t: 'ضيف بنود تانية', d: 'أي نوع شغل تاني في نفس المشروع.', el: '#jobPage [data-act="addItem"]', pre: [['back'], wait] },
      { part: 2, t: 'الخامات والإكسسوارات والتكاليف', d: 'خامة، إكسسوار، مستهلكات، هالك، عمالة، نقل، تركيب… على العميل أو عليك.', el: '#costCard' },
      { part: 2, t: 'تقطيع الألواح للمشروع', d: 'توزيع قطع المشروع على الألواح بأقل هالك.', el: '#jobPage [data-act="cutForJob"]' },
      { part: 2, t: 'الدفعات', d: 'سجّل أي دفعة والمتبقي بيتحسب لوحده.', el: '#jobPage .home-sum .hs-stats' },
      { part: 2, t: 'التكاليف والربح', d: 'ليك انت بس ومش بيظهر للعميل.', el: '#profitCard' },
      { part: 2, t: 'تقطيع الألواح', d: 'حاسبة توزيع القطع على الألواح بالسلاح واتجاه العروق.', el: '#view-home [data-act="tool"][data-tool="cut"]', pre: home },
      { part: 2, t: 'أنواع الشغل', d: 'كل الأنواع، وتقدر تعمل نوع جديد بتاعك.', el: '#catTiles' },
      { part: 2, t: 'الخشب الطبيعي', d: 'م³ وقدم وأنواع الخشب بأسعارها.', el: '#view-home [data-act="tool"][data-tool="wood"]' },
      { part: 2, t: 'مكتبة الخامات', d: 'أسعارك ومقاسات الألواح والإكسسوارات.', el: '#view-home [data-act="tool"][data-tool="library"]' },
      { part: 2, t: 'العملاء', d: 'ملف كل عميل وكشف حسابه.', el: '#navBtn-customers' },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو هنا بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#bizName', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
