/* أرزقي | Arzoqi — الكهرباء: خطوات «طريقة الاستخدام» (المحرك في Shared-Assets/brand/guide.js) */
(function () {
  if (!window.ArzoqiGuide) return;
  var wait = ['wait', 450], home = [['unwind'], ['click', '#navBtn-home'], ['wait', 300]];
  ArzoqiGuide.define({
    id: 'electrical', name: 'الكهرباء', version: 1, keys: ['ahmed_elec_', 'hesabaty_'], more: '#view-more', home: home,
    layered: function () { return !!(history.state && history.state.ovDepth > 0); },
    steps: [
      { t: 'أهلاً بيك في قسم الكهرباء', d: 'هنعمل مثال كامل: عميل ← غرفة بالنقاط ← الحساب ← الفاتورة PDF. ده مثال بس، وبياناتك هترجع زي ما هي في الآخر.', el: '#view-home .home-sum' },
      { t: 'فاتورة بالنقاط', d: 'الطريقة الأساسية: الغرف بالبرايز والإسبوتات + اللوحة والصواعد، وكله بيتحسب نقاط. (وفيه كمان «فاتورة بنود» لكل شغلانة بسعرها.)', el: '#qPoints', act: [['click', '#qPoints'], wait] },
      { t: 'بيانات العميل', d: 'اسم العميل (التطبيق بيقترح من النوتة) والتليفون والعنوان.', el: '#clientName', act: [['fill', '#clientName', 'أ. محمد (مثال)'], ['fill', '#clientAddress', 'المعادي']] },
      { t: 'سعر النقطة', d: '«تسعيرة موحدة»: سعر واحد للنقطة، وسعر متر البروفايل. أو «النظام القديم» بسعر لكل نوع.', el: '#newPointPrice' },
      { t: 'التالي: الشغل', d: 'الخطوات فوق: العميل ← الغرف ← الحساب.', el: '#ebNext', act: [['click', '#ebNext'], wait] },
      { t: 'اللوحة والصواعد', d: 'عدد خطوط اللوحة والصواعد، وكل خط بكام نقطة.', el: '#mainPanelLines', act: [['fill', '#mainPanelLines', '8']] },
      { t: 'ضيف غرفة', d: 'كل غرفة بالبرايز والإسبوتات والليد.', el: '#addRoomFab', act: [['click', '#addRoomFab'], wait] },
      { t: 'اسم الغرفة', d: 'اختار من الأسماء الجاهزة أو اكتب.', el: '#roomName', act: [['fill', '#roomName', 'الصالة']] },
      { t: 'النقاط في الغرفة', d: 'عدد البرايز والإسبوتات ومتر الليد — والإجمالي بيتحسب وانت بتكتب.', el: '#roomSockets', act: [['fill', '#roomSockets', '6'], ['fill', '#roomSpots', '8']] },
      { t: 'حفظ الغرفة', d: 'دوس «حفظ الغرفة» وضيف باقي الغرف بنفس الطريقة.', el: '#saveRoomBtn', act: [['click', '#saveRoomBtn'], ['wait', 600]] },
      { t: 'التالي: الحساب', d: 'بعد الغرف روح للحساب.', el: '#ebNext', act: [['click', '#ebNext'], wait] },
      { t: 'المدفوع والخصم', d: 'اكتب اللي اندفع والخصم لو فيه، والمتبقي بيتحسب لوحده.', el: '#paidAmount' },
      { t: 'طلّع الفاتورة PDF', d: 'من الزرار ده بتفتح الفاتورة.', el: '#view-summary button[onclick="openSinglePagePreview(false)"]', act: [['click', '#view-summary button[onclick="openSinglePagePreview(false)"]'], ['wait', 800]] },
      { t: 'ده شكل الفاتورة', d: 'بياناتك واللوجو والعميل والغرف والحساب. تقدر تعدّل أي كلمة بالضغط عليها، وتكبّر أو تصغّر الخط.', el: '#printViewport' },
      { t: 'اطبع أو احفظ PDF', d: 'من هنا بتطبع أو بتحفظ PDF وتبعته للعميل. كده عرفت تطلّع الفاتورة 🎉', el: '#printPreviewModal .tb-print' },
      { part: 2, t: 'واتساب', d: 'ابعت الفاتورة كرسالة واتساب أو انسخ نصها.', el: '#view-summary .btn-wa', pre: [['back'], wait] },
      { part: 2, t: 'حفظ', d: '«تم ✓ حفظ» والفاتورة بتتسجل في النوتة على حساب العميل.', el: '#ebNext' },
      { part: 2, t: 'فاتورة بنود', d: 'كل شغلانة بسعرها: تقفيل لوحة، سحب خط، تركيب نجفة…', el: '#qItems', pre: home },
      { part: 2, t: 'كشف خامات', d: 'الخامات المطلوبة للطباعة، أو على حسابك وتتحاسب عليها.', el: '#qMat' },
      { part: 2, t: 'تسجيل دفعة', d: 'أي فلوس استلمتها من عميل بتنزل في النوتة.', el: '#qPay' },
      { part: 2, t: 'زرار +', d: 'من أي مكان: فاتورة، كشف خامات، دفعة، أو عميل جديد.', el: '#navPlus' },
      { part: 2, t: 'الفواتير', d: 'كل الفواتير وكشوف الخامات.', el: '#navBtn-docs' },
      { part: 2, t: 'العملاء (النوتة)', d: 'حساب كل عميل: الفواتير والدفعات والمتبقي واليومية.', el: '#navBtn-ledger' },
      { part: 2, t: 'بياناتك في الفواتير', d: 'الاسم والتليفون واللوجو هنا بيظهروا في فواتير القسم ده، واللي فاضي بيتاخد من «بياناتي».', el: '#techName', pre: [['click', '#navBtn-more'], wait] },
      { part: 2, t: 'طريقة الاستخدام', d: 'الشرح ده هنا دايماً — ارجعله في أي وقت.', el: '.azg-more' }
    ]
  });
})();
