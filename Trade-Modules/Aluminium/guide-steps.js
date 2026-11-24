/* أرزقي | Arzoqi — الألوميتال وUPVC: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'aluminium', name: 'الألوميتال وUPVC', version: 1, keys: ['halu_'], more: '#view-more', home: home,
    steps: [
      { t: 'أهلاً بيك في قسم الألوميتال وUPVC', d: 'هنعمل مثال كامل: عميل ← شباك جرار ← القطاعات والزجاج ← الفاتورة PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'ابدأ بـ «مقايسة جديدة»', d: 'أي طلب بيبدأ من هنا: العميل ومقاسات الفتحات والسعر.', el: '#view-home [data-act="newSurvey"]', act: [['click', '#view-home [data-act="newSurvey"]']] },
      { t: 'اسم العميل والمشروع', d: 'اكتب اسم العميل واسم المشروع والموقع.', el: '#f_cname', act: [['fill', '#f_cname', 'أ. محمد (مثال)'], ['fill', '#f_jtitle', 'شقة المهندسين'], ['fill', '#f_site', 'المهندسين']] },
      { t: 'ابدأ الطلب', d: 'دوس «ابدأ» وهيتفتح الطلب.', el: '#sheet [data-act="createJob"]', act: [['click', '#sheet [data-act="createJob"]'], wait] },
      { t: 'ضيف فتحة', d: 'كل شباك أو باب أو واجهة بيبقى بند لوحده.', el: '#jobPage [data-act="addSystem"]', act: [['click', '#jobPage [data-act="addSystem"]']] },
      { t: 'اختار نوع الفتحة', d: 'جرار، مفصلي، Tilt & Turn، ثابت، أبواب، فولدنج، واجهات، شتر، شاور… هنختار «جرار».', el: '#sheet [data-act="pickKind"][data-kind="sliding"]', act: [['click', '#sheet [data-act="pickKind"][data-kind="sliding"]'], wait] },
      { t: 'مقاس الفتحة', d: 'العرض والارتفاع (والوحدة سم/مم/م من فوق)، والعدد لو فيه فتحات متطابقة.', el: '#itemPage [data-k="in.W"]', act: [['fill', '#itemPage [data-k="in.room"]', 'الصالة'], ['fill', '#itemPage [data-k="in.W"]', '150'], ['fill', '#itemPage [data-k="in.H"]', '120']] },
      { t: 'النظام (القطاع)', d: 'كل نظام ليه معادلات قص من كتالوج الشركة. الأنظمة الجاهزة «تقديرية» لحد ما تكتب خصومات قطاعك.', el: '#itemPage select[data-k="in.sys"]' },
      { t: 'النتيجة: قايمة القطع والزجاج', d: 'أطوال القطع والزجاج والإكسسوارات وخطة القص على الأعواد — وكل رقم اتحسب إزاي.', el: '#calcRes' },
      { t: 'طبّق الكميات على الخامات', d: 'الكميات المحسوبة بتنزل في الخامات بأسعار المكتبة، وتقدر تعدّلها.', el: '#itemPage [data-act="applySug"]', act: [['click', '#itemPage [data-act="applySug"]'], wait] },
      { t: 'الأسعار', d: 'سعر الشراء والبيع لكل سطر (أو من المكتبة)، والهالك لو فيه.', el: '#linesCard', act: [['fill', '#itemPage [data-k="lines.0.cost"]', '600'], ['fill', '#itemPage [data-k="lines.0.price"]', '700']] },
      { t: 'المصنعية', d: 'بالشباك أو بالمتر أو بالضلفة… والكمية بتتحسب لوحدها.', el: '#itemPage [data-k="labor.0.price"]', act: [['fill', '#itemPage [data-k="labor.0.price"]', '400']] },
      { t: 'التكلفة والسعر والربح', d: 'تكلفتك وسعر العميل وربحك في الفتحة دي.', el: '#itRes' },
      { t: 'احفظ', d: 'دوس «حفظ» والفتحة هتتضاف للطلب.', el: '#itemPage [data-act="saveItem"]', act: [['click', '#itemPage [data-act="saveItem"]'], ['wait', 700]] },
      { t: 'حساب الطلب', d: 'الإجمالي والمدفوع والمتبقي والربح.', el: '#jobPage .home-sum' },
      { t: 'طلّع المستند PDF', d: 'المقايسة أو عرض السعر أو الفاتورة حسب حالة الطلب.', el: '#jobPage .pg-foot [data-act="preview"]', act: [['click', '#jobPage .pg-foot [data-act="preview"]'], ['wait', 800]] },
      { t: 'ده شكل المستند', d: 'بياناتك واللوجو والعميل والفتحات بالمقاسات والحساب. تقدر تعدّل أي كلمة بالضغط عليها.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ الملف PDF وتبعته للعميل. كده عرفت تطلّع الفاتورة 🎉', el: '#pvPrint' },
      { part: 2, t: 'مراحل الطلب', d: 'من تسجيل العميل لحد التحصيل — دوس على المرحلة اللي وصلتلها.', el: '#jobPage .stages', pre: [['back'], wait] },
      { part: 2, t: 'مقايسة ← عرض سعر ← فاتورة', d: 'لما العميل يوافق حوّلها لعرض سعر وبعدين فاتورة.', el: '#jobPage [data-act="toQuote"]' },
      { part: 2, t: 'الدفعات', d: 'العربون والدفعات بطريقة الدفع والرقم المرجعي، والمتبقي بيتحسب لوحده.', el: '#jobPage .home-sum .hs-stats' },
      { part: 2, t: 'خطة القص للطلب', d: 'قطع كل الفتحات على أعواد كل قطاع، والبواقي بتتسجل في المخزن.', el: '#jobPage [data-act="jobRemnants"]' },
      { part: 2, t: 'النقل والتركيب والمصروفات', d: 'على العميل (في الفاتورة) أو عليك (في الربح بس).', el: '#costCard' },
      { part: 2, t: 'تكلفة وربح الطلب', d: 'ليك انت بس: التكاليف والربح وهامشه.', el: '#profitCard' },
      { part: 2, t: 'كل المستندات', d: 'مقايسة، عرض سعر، فاتورة، أمر تشغيل بخطة القص، كشف مقاسات، قايمة خامات، وتكاليف داخلي.', el: '#jobPage .doc-grid' },
      { part: 2, t: 'الحاسبات المستقلة', d: '32 حاسبة من غير مشروع: مساحات، زجاج، قطاعات، أعواد، هالك، شتر، شاور، سعر وربح…', el: '#view-home [data-act="tool"][data-tool="calcs"]', pre: home },
      { part: 2, t: 'احسب فتحة على طول', d: 'أي نوع فتحة من هنا من غير ما تعمل مقايسة.', el: '#catTiles' },
      { part: 2, t: 'الأنظمة والقطاعات', d: 'اكتب معادلات القص لكل نظام من كتالوج شركتك — مفيش معادلة واحدة لكل الشركات.', el: '#view-home [data-act="tool"][data-tool="systems"]' },
      { part: 2, t: 'مكتبة الخامات', d: 'قطاعات (طول العود والسعر)، زجاج، إكسسوارات، جوانات ومستهلكات.', el: '#view-home [data-act="tool"][data-tool="library"]' },
      { part: 2, t: 'المخزن والبواقي', d: 'البواقي بتتستخدم في القص قبل العود الجديد.', el: '#view-home [data-act="tool"][data-tool="inventory"]' },
      { part: 2, t: 'العمال', d: 'الأجور والسلف والمستحقات.', el: '#view-home [data-act="tool"][data-tool="workers"]' },
      { part: 2, t: 'التقارير', d: 'المبيعات والربح والشبابيك والأبواب والمتأخر.', el: '#view-home [data-act="tool"][data-tool="reports"]' },
      { part: 2, t: 'المصنعية والإعدادات', d: 'طرق المصنعية وأسعارها، وطرق الدفع، ومراحل الطلب، والسلاح.', el: '#view-home [data-act="tool"][data-tool="labor"]' },
      { part: 2, t: 'العملاء', d: 'ملف كل عميل وطلباته ومدفوعاته وكشف حسابه.', el: '#navBtn-customers' },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو هنا بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#bizName', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
