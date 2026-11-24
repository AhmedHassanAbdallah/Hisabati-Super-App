/* أرزقي | Arzoqi — المحارة والواجهات: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  // القسم ده بيتنقل بالـ # في العنوان، وكل الصفحات بتترسم جوه #main
  var wait = ['wait', 450];
  var closeDoc = ['eval', function () { var b = document.querySelector('#printModal [data-act="closeDoc"]'); if (b && b.getBoundingClientRect().width) b.click(); }];
  var closeSheet = ['eval', function () { var b = document.querySelector('#sheet [data-act="closeSheet"]'); if (b && b.getBoundingClientRect().width) b.click(); }];
  // جوه المشروع شريط التنقل اللي تحت مخفي، فبنرجع للرئيسية بنفس طريقة القسم (العنوان #/home)
  var home = [closeDoc, closeSheet, ['eval', function () { if (location.hash !== '#/home') location.hash = '#/home'; }], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'plastering', name: 'المحارة والواجهات', version: 1, keys: ['hplaster_'], home: home,
    more: function () { return /^#\/more\/?$/.test(location.hash) ? document.getElementById('main') : null; },
    steps: [
      { t: 'أهلاً بيك في قسم المحارة', d: 'هنعمل مثال كامل: مشروع ← غرفة بالمقاسات ← بند محارة ← فاتورة مصنعية PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#main .hero' },
      { t: 'مشروع جديد', d: 'عميل + مساحات + بنود — وكل الحسابات بتطلع لوحدها.', el: '#main .q-tile[data-act="newProject"]', act: [['click', '#main .q-tile[data-act="newProject"]'], wait] },
      { t: 'اسم المشروع والعميل', d: 'اسم المشروع، واختار العميل أو «عميل جديد»، والعنوان ونوع المبنى.', el: '#f_name', act: [['fill', '#f_name', 'فيلا التجمع (مثال)']] },
      { t: 'طريقة التسعير', d: 'بالبنود (مجموع البنود) أو مقاولة كاملة بمبلغ — والخصم ونسبة الضمان.', el: '#f_pricing' },
      { t: 'حفظ المشروع', d: 'دوس «حفظ» وهيتفتح المشروع.', el: '#formSave', act: [['click', '#formSave'], ['wait', 700]] },
      { t: 'ضيف منطقة', d: 'كل غرفة أو واجهة أو سور أو سلم منطقة لوحدها بمقاساتها.', el: '#main [data-act="addZone"]', act: [['click', '#main [data-act="addZone"]'], wait] },
      { t: 'نوع المنطقة', d: 'غرفة، حوائط وأسقف بأشكال، واجهات، سور، بلكونات، أعمدة، كرانيش، منور، سلالم… هنختار «غرفة».', el: '#sheet [data-oi="0"]', act: [['click', '#sheet [data-oi="0"]'], wait] },
      { t: 'مقاسات الغرفة', d: 'الطول والعرض والارتفاع — والحوائط والسقف بيتحسبوا لوحدهم، وتقدر تخصم الأبواب والشبابيك.', el: '#main [data-bind="zn:measure.room.l"]', act: [['fill', '#main [data-bind="zn:measure.room.l"]', '5'], ['fill', '#main [data-bind="zn:measure.room.w"]', '4'], ['fill', '#main [data-bind="zn:measure.room.h"]', '3']] },
      { t: 'ضيف بند', d: 'البند هو الشغل اللي هيتعمل في المنطقة دي. (وللواجهات فيه «نظام تشطيب جاهز» بيضيف كذا بند مرة واحدة.)', el: '#main [data-act="addItem"]', act: [['click', '#main [data-act="addItem"]'], wait] },
      { t: 'نوع الشغل', d: 'محارة داخلية وخارجية، جرافيت، دهارة ومعجون، تشطيبات واجهات، تكاليف الموقع… هنختار «المحارة الداخلية».', el: '#sheet [data-oi="0"]', act: [['click', '#sheet [data-oi="0"]'], wait] },
      { t: 'البند بالظبط', d: 'هنختار «محارة أسمنتية تقليدية».', el: '#sheet [data-oi="0"]', act: [['click', '#sheet [data-oi="0"]'], ['wait', 600]] },
      { t: 'الكمية من المقاسات', d: 'الكمية بتتاخد من مقاس الغرفة لوحدها (الصافي أو الحوائط بس أو السقف بس).', el: '#main [data-bind="it:qtySource"]' },
      { t: 'الخامات', d: 'السُمك ونسبة الخلط والهالك — والأسمنت والرمل بيتحسبوا، وتقدر تربطهم بالمخزن.', el: '#main [data-bind="it:calc.cement.thickness"]' },
      { t: 'سعر المصنعية', d: 'مصنعية بس أو توريد وتنفيذ، واكتب سعر المتر.', el: '#main [data-bind="it:laborRate"]', act: [['fill', '#main [data-bind="it:laborRate"]', '90']] },
      { t: 'رجوع للمشروع', d: 'كل حاجة بتتحفظ لوحدها. ارجع للمشروع.', el: '#appHeader [data-act="back"]', act: [['click', '#appHeader [data-act="back"]'], ['wait', 400], ['click', '#appHeader [data-act="back"]'], wait] },
      { t: 'المنطقة بحسابها', d: 'المساحة والبنود وقيمتها.', el: '#main [data-act="openZone"]' },
      { t: 'المستندات', d: 'من الزرار ده بتوصل لكل مستندات المشروع.', el: '#appHeader [data-act="projDocs"]', act: [['click', '#appHeader [data-act="projDocs"]'], wait] },
      { t: 'اختار المستند', d: 'مقايسات (أعمال، محارة، جرافيت، واجهات)، عرض سعر، فواتير، مستخلص، كشف حساب، تقرير تكلفة، كشف خامات. هنختار «فاتورة مصنعية».', el: '#main [data-act="openDoc"][data-type="inv_labor"]', act: [['click', '#main [data-act="openDoc"][data-type="inv_labor"]'], ['wait', 900]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك واللوجو والعميل والبنود والحساب. تقدر تعدّل أي كلمة بالضغط عليها.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF، أو تبعتها واتساب من جنبه. كده عرفت تطلّع الفاتورة 🎉', el: '#printModal [data-act="printDoc"]' },
      { part: 2, t: 'المراحل والحسابات', d: 'جوه المشروع: مراحل التنفيذ ونسبة الإنجاز، والحسابات: الدفعات والمصروفات والعمال والربح.', el: '#main [data-act="projTab"][data-tab="money"]', pre: [closeDoc, wait] },
      { part: 2, t: 'الملخص', d: 'ملخص المشروع: القيمة والمدفوع والمتبقي والتكلفة والربح.', el: '#main [data-act="projTab"][data-tab="sum"]' },
      { part: 2, t: 'حاسبة سريعة', d: 'محارة، جرافيت، معجون، واجهات — من غير مشروع.', el: '#main .q-tile[data-view="calc"]', pre: home },
      { part: 2, t: 'تسجيل دفعة', d: 'دفعة من عميل على مشروع.', el: '#main .q-tile[data-act="quickPayment"]' },
      { part: 2, t: 'حركة مخزن', d: 'شراء، بيع، صرف خامات للمشروع.', el: '#main .q-tile[data-act="quickMove"]' },
      { part: 2, t: 'العمال والعملاء والتقارير', d: 'اليوميات والسلف، وكشف حساب كل عميل، والأرباح.', el: '#main .q-tile[data-view="workers"]' },
      { part: 2, t: 'المشروعات', d: 'كل المشروعات بحالتها.', el: '.nav-item[data-tab="projects"]' },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو في «الإعدادات وبيانات المستندات» بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#main [data-view="settings"]', pre: [['click', '.nav-item[data-tab="more"]'], wait] },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
