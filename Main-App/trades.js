/*
 * حساباتي — التطبيق الموحد
 * سجل المهن: كل مهنة بتشاور على نسخة كاملة من تطبيقها الأصلي جوه Trade-Modules/.
 * التطبيقات نفسها ما اتعدلتش — اللانشر بيفتحها زي ما هي.
 *
 * id       : معرّف ثابت (بيتستخدم في الرابط #id)
 * dir      : اسم فولدر النسخة جوه Trade-Modules/
 * source   : المستودع الأصلي اللي اتنسخ منه
 * available: false = مفيش تطبيق أصلي للمهنة دي لسه
 */
window.HISABATI_TRADES = [
  {
    id: 'electrical', dir: 'Electrical', source: 'Ezaza',
    name: 'الكهرباء', full: 'حساباتي — الكهرباء',
    desc: 'نقاط تأسيسات الكهرباء وفواتير العملاء',
    color: '#f97316', available: true
  },
  {
    id: 'plumbing', dir: 'Plumbing', source: 'Hesabaty-plumbing',
    name: 'السباكة والصحي', full: 'حساباتي — السباكة',
    desc: 'مقايسات وفواتير السباكة والصحي والصرف',
    color: '#0ea5e9', available: true
  },
  {
    id: 'hvac', dir: 'HVAC', source: 'Hesabaty-HAVC',
    name: 'التكييف والتبريد', full: 'حساباتي — HVAC',
    desc: 'تركيب وصيانة وإصلاح أجهزة التكييف',
    color: '#06b6d4', available: true
  },
  {
    id: 'painting', dir: 'Painting', source: 'Hesabaty-painting',
    name: 'النقاشة والدهانات', full: 'حساباتي — النقاشة',
    desc: 'مساحات الحوائط والأسقف والمقايسات',
    color: '#a855f7', available: true
  },
  {
    id: 'flooring', dir: 'Flooring', source: 'Hesabaty-Flooring',
    name: 'الأرضيات والتشطيبات', full: 'حساباتي — الأرضيات',
    desc: 'بلاط وباركيه ورخام وإنترلوك وسلالم',
    color: '#10b981', available: true
  },
  {
    id: 'gypsum', dir: 'Gypsum', source: 'Hesabaty-Gebsum',
    name: 'الجبس والديكورات', full: 'حساباتي — الجبس',
    desc: 'جبسون بورد وجبس بلدي وكرانيش وبانوهات',
    color: '#eab308', available: true
  },
  {
    id: 'plastering', dir: 'Plastering', source: 'Hesabaty-plaster',
    name: 'المحارة', full: 'حساباتي — المحارة',
    desc: 'لسه مفيش تطبيق للمهنة دي',
    color: '#64748b', available: false
  }
];
