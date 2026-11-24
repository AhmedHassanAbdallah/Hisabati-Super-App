/* أرزقي | Arzoqi — التيار الخفيف وأنظمة الدش: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'lowcurrent', name: 'التيار الخفيف وأنظمة الدش', version: 1, keys: ['hlow_'], more: '#view-more', home: home,
    steps: [
      { t: 'أهلاً بيك في قسم التيار الخفيف', d: 'هنعمل مثال كامل: كاميرات مراقبة ← الكميات والأسعار ← حفظ لعميل ← الفاتورة PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'اختار النظام', d: 'كاميرات، شبكات، فايبر، حريق، أبواب، إنتركم، صوتيات، سنترال، دش… هنختار «كاميرات المراقبة».', el: '#catTiles [data-sys="cctv"]', act: [['click', '#catTiles [data-sys="cctv"]']] },
      { t: 'اختار الحاسبة', d: 'كل نظام ليه حاسباته. هنفتح «حاسبة الكاميرات».', el: '#sheet [data-act="quickKindSheet"][data-kind="cctv"]', act: [['click', '#sheet [data-act="quickKindSheet"][data-kind="cctv"]'], wait] },
      { t: 'عدد الكاميرات وطول الكابل', d: 'اكتب عدد الكاميرات ومتوسط طول الكابل لكل كاميرا.', el: '#itemPage [data-k="in.cams.0.count"]', act: [['fill', '#itemPage [data-k="in.cams.0.count"]', '4'], ['fill', '#itemPage [data-k="in.cams.0.len"]', '20']] },
      { t: 'جهاز التسجيل', d: 'عدد قنوات الجهاز — والحاسبة بتنبهك لو الكاميرات أكتر من القنوات.', el: '#itemPage [data-k="in.rec.channels"]', act: [['fill', '#itemPage [data-k="in.rec.channels"]', '4']] },
      { t: 'النتيجة وطريقة الحساب', d: 'الكميات المقترحة (كاميرات، جهاز، كابل، هارد…) وكل رقم اتحسب إزاي.', el: '#calcRes' },
      { t: 'طبّق على الخامات', d: 'الكميات بتنزل في الخامات بأسعار المكتبة وتقدر تعدّلها.', el: '#itemPage [data-act="applySug"]', act: [['click', '#itemPage [data-act="applySug"]'], wait] },
      { t: 'الأسعار', d: 'سعر الشراء والبيع لكل سطر (أو من المكتبة).', el: '#linesCard', act: [['fill', '#itemPage [data-k="lines.0.cost"]', '900'], ['fill', '#itemPage [data-k="lines.0.price"]', '1200']] },
      { t: 'المصنعية', d: 'بالنقطة أو بالجهاز أو بالمتر أو مقطوعية — والكمية بتتحسب لوحدها.', el: '#itemPage [data-k="labor.0.price"]', act: [['fill', '#itemPage [data-k="labor.0.price"]', '150']] },
      { t: 'التكلفة والسعر والربح', d: 'تكلفتك وسعر العميل وربحك.', el: '#itRes' },
      { t: 'احفظ لعميل', d: 'اكتب اسم العميل واسم المشروع — أو سيبهم فاضيين لحساب سريع.', el: '#f_cname', act: [['fill', '#f_cname', 'أ. محمد (مثال)'], ['fill', '#f_jtitle', 'فيلا التجمع']] },
      { t: 'حفظ', d: 'دوس «حفظ» وهيتعمل المشروع ويتفتح.', el: '#itemPage [data-act="saveItem"]', act: [['click', '#itemPage [data-act="saveItem"]'], ['wait', 800]] },
      { t: 'حساب المشروع', d: 'الإجمالي والمدفوع والمتبقي والربح.', el: '#jobPage .home-sum' },
      { t: 'طلّع الفاتورة PDF', d: 'من الزرار ده بتفتح الفاتورة (أو عرض السعر).', el: '#jobPage .pg-foot [data-act="preview"]', act: [['click', '#jobPage .pg-foot [data-act="preview"]'], ['wait', 800]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك والعميل والأنظمة والحساب. تقدر تعدّل أي كلمة بالضغط عليها.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF وتبعته للعميل. كده عرفت تطلّع الفاتورة 🎉', el: '#pvPrint' },
      { part: 2, t: 'ضيف أنظمة تانية', d: 'المشروع ممكن يبقى فيه أكتر من نظام: كاميرات وشبكة ودش…', el: '#jobPage [data-act="addSystem"]', pre: [['back'], wait] },
      { part: 2, t: 'عرض سعر / جاري / خلصان', d: 'حالة المشروع.', el: '#jobPage [data-act="setStatus"]' },
      { part: 2, t: 'العمال والمصروفات والهالك', d: 'على العميل أو عليك.', el: '#costCard' },
      { part: 2, t: 'الدفعات', d: 'سجّل أي دفعة والمتبقي بيتحسب لوحده.', el: '#jobPage .home-sum .hs-stats' },
      { part: 2, t: 'التكاليف والربح', d: 'ليك انت بس ومش بيظهر للعميل.', el: '#profitCard' },
      { part: 2, t: 'الصيانة والضمان', d: 'سجّل الأجهزة والضمان والزيارات للمشروع.', el: '#jobPage [data-act="maintForJob"]' },
      { part: 2, t: 'الحاسبات والأدوات', d: '27 حاسبة من غير مشروع.', el: '#view-home [data-act="tool"][data-tool="calcs"]', pre: home },
      { part: 2, t: 'الخامات والأجهزة', d: 'أسعارك بالماركة والموديل.', el: '#view-home [data-act="tool"][data-tool="library"]' },
      { part: 2, t: 'المصنعية', d: 'طرق وأسعار المصنعية.', el: '#view-home [data-act="tool"][data-tool="labor"]' },
      { part: 2, t: 'الصيانة والضمان', d: 'سجل الصيانة وعقودها لكل العملاء.', el: '#view-home [data-act="tool"][data-tool="maint"]' },
      { part: 2, t: 'التقارير', d: 'القيمة والربح والمستحقات.', el: '#view-home [data-act="tool"][data-tool="reports"]' },
      { part: 2, t: 'النوتة', d: 'أي حساب تحفظه «للنوتة» بيبقى هنا.', el: '#view-home [data-act="tool"][data-tool="notes"]' },
      { part: 2, t: 'العملاء', d: 'ملف كل عميل وكشف حسابه.', el: '#navBtn-customers' },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو هنا بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#bizName', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
