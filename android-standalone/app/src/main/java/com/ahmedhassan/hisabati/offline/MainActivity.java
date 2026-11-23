/*
 * أرزقي | Arzoqi — لحسابات المصنعية: تطبيق أندرويد مستقل بالكامل
 * تصميم وتطوير: أحمد حسن عبدالله  |  واتساب: +201015421255
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * كل ملفات أرزقي (الواجهة الرئيسية + الأقسام الـ 12) جوه التطبيق وبتشتغل من غير إنترنت.
 * الأقسام نفسها ما اتعدلتش: التطبيق بيقدّم لكل قسم نفس "الجسر" اللي تطبيقه الأصلي كان بيقدّمه
 * (HesabatyApp / HesabatiPlumbingApp / HesabatiHvacApp / HFloorApp / PlasterApp) بنفس الوظائف:
 *   الطباعة وحفظ PDF، حفظ النسخ الاحتياطية في التنزيلات، فتح واتساب وفيسبوك، رقم الإصدار.
 * وبيضيف:
 *   - كل قسم بيتفتح كصفحة كاملة، وفوقه شريط "كل المهن" للرجوع للرئيسية.
 *   - تسجيل الدخول بجوجل وصلاحية درايف بشكل أصلي (HisabatiNative) — جوجل بتمنعه جوه WebView.
 *   - زرار الرجوع: يقفل نافذة القسم الأول، وبعدها يرجع للصفحة السابقة، وبعدها يخرج.
 */
package com.ahmedhassan.hisabati.offline;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Insets;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.text.TextUtils;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;

import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.common.api.Scope;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

public class MainActivity extends Activity {

    private static final String TAG = "Hisabati";
    /** نطاق داخلي لعرض ملفات التطبيق (مش بيتصل بالإنترنت) */
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String BASE = "https://" + APP_HOST + "/";
    private static final String HOME_URL = BASE + "Main-App/index.html";
    private static final String RELEASES_URL = "https://github.com/AhmedHassanAbdallah/Hisabati-Super-App/releases";
    private static final int NAVY = Color.parseColor("#002624");
    private static final int REQ_FILE_CHOOSER = 1001;
    private static final int REQ_STORAGE = 1002;
    private static final int REQ_AUTH = 1003;

    /** فولدرات الأقسام وأسماؤها (لشريط "كل المهن") */
    private static final String[][] SECTIONS = {
            {"Electrical", "الكهرباء"}, {"Plumbing", "السباكة والصحي"}, {"HVAC", "التكييف والتبريد"},
            {"Painting", "النقاشة والدهانات"}, {"Flooring", "الأرضيات والتشطيبات"},
            {"Gypsum", "الجبس والديكورات"}, {"Plastering", "المحارة والواجهات"},
            {"Metalwork", "الحدادة وتصنيع الحديد"}, {"Carpentry", "النجارة والأثاث"},
            {"Masonry", "البناء وأعمال المباني"},
            {"LowCurrent", "التيار الخفيف وأنظمة الدش"},
            {"Aluminium", "الألوميتال وUPVC"},
            {"Marble", "الرخام والجرانيت"}
    };
    /** أسماء الجسور زي ما كل قسم بيدوّر عليها في تطبيقه الأصلي */
    private static final String[] SECTION_BRIDGES = {"HesabatyApp", "HesabatiPlumbingApp", "HesabatiHvacApp", "HFloorApp", "PlasterApp"};
    private static final Pattern SAFE_PATH = Pattern.compile("^[A-Za-z0-9/_.-]{1,200}$");

    private WebView webView;
    private LinearLayout sectionBar;
    private TextView sectionTitle;
    private ImageView sectionIcon;
    private ValueCallback<Uri[]> filePathCallback;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, String> sectionVersions = new HashMap<>();
    private volatile String currentUrl = HOME_URL;
    private boolean clearHistoryOnLoad;
    private String pendingAuthId;
    private String[] pendingSave; // {name, mime, text}

    /* ================================================================
       الواجهة
       ================================================================ */
    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(NAVY);
        getWindow().setNavigationBarColor(NAVY);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(NAVY);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        root.addView(buildSectionBar(), new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)));

        webView = new WebView(this);
        webView.setBackgroundColor(NAVY);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);

        // أندرويد 15+ بيرسم التطبيق تحت شريط الحالة: نسيب مسافة قد الأشرطة والكيبورد
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout());
                v.setPadding(i.left, i.top, i.right, i.bottom);
                return WindowInsets.CONSUMED;
            });
        }

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(true);

        SectionBridge bridge = new SectionBridge();
        for (String name : SECTION_BRIDGES) webView.addJavascriptInterface(bridge, name);
        webView.addJavascriptInterface(new NativeBridge(), "HisabatiNative");
        webView.setWebViewClient(new AppClient());
        webView.setWebChromeClient(new AppChromeClient());

        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else if (!openFromIntent(getIntent())) webView.loadUrl(HOME_URL);
    }

    private View buildSectionBar() {
        sectionBar = new LinearLayout(this);
        sectionBar.setOrientation(LinearLayout.HORIZONTAL);
        sectionBar.setGravity(Gravity.CENTER_VERTICAL);
        sectionBar.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        sectionBar.setPadding(dp(10), 0, dp(10), 0);
        sectionBar.setBackgroundColor(Color.parseColor("#001715"));
        sectionBar.setVisibility(View.GONE);

        TextView home = new TextView(this);
        home.setText("▦  كل المهن");
        home.setTextColor(Color.WHITE);
        home.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        home.setTypeface(Typeface.DEFAULT_BOLD);
        home.setGravity(Gravity.CENTER);
        home.setPadding(dp(12), 0, dp(12), 0);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.argb(20, 255, 255, 255));
        bg.setStroke(dp(1), Color.argb(46, 255, 255, 255));
        bg.setCornerRadius(dp(11));
        home.setBackground(bg);
        home.setContentDescription("الرجوع لكل المهن");
        home.setOnClickListener(v -> goHome());
        sectionBar.addView(home, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(38)));

        sectionIcon = new ImageView(this);
        LinearLayout.LayoutParams ip = new LinearLayout.LayoutParams(dp(26), dp(26));
        ip.setMarginStart(dp(10));
        sectionBar.addView(sectionIcon, ip);

        sectionTitle = new TextView(this);
        sectionTitle.setTextColor(Color.WHITE);
        sectionTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        sectionTitle.setTypeface(Typeface.DEFAULT_BOLD);
        sectionTitle.setSingleLine(true);
        sectionTitle.setEllipsize(TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        tp.setMarginStart(dp(8));
        sectionBar.addView(sectionTitle, tp);
        return sectionBar;
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    /** القسم المفتوح من الرابط (أو null للواجهة الرئيسية) */
    private static String sectionDir(String url) {
        if (url == null || !url.startsWith(BASE + "Trade-Modules/")) return null;
        String rest = url.substring((BASE + "Trade-Modules/").length());
        int slash = rest.indexOf('/');
        return slash > 0 ? rest.substring(0, slash) : null;
    }

    private void updateSectionBar(String url) {
        String dir = sectionDir(url);
        if (dir == null) { sectionBar.setVisibility(View.GONE); return; }
        String name = dir;
        for (String[] sec : SECTIONS) if (sec[0].equals(dir)) name = sec[1];
        sectionTitle.setText(name);
        try (InputStream in = getAssets().open("www/Trade-Modules/" + dir + "/icons/icon-192.png")) {
            Bitmap b = BitmapFactory.decodeStream(in);
            sectionIcon.setImageBitmap(b);
        } catch (IOException e) { sectionIcon.setImageDrawable(null); }
        sectionBar.setVisibility(View.VISIBLE);
    }

    /** "كل المهن": يرجع للواجهة الرئيسية ويمسح سجل الرجوع بتاع القسم */
    private void goHome() {
        clearHistoryOnLoad = true;
        webView.loadUrl(HOME_URL);
    }

    /** للاختبار الآلي على المحاكي: am start ... -e path Trade-Modules/Electrical/ */
    private boolean openFromIntent(Intent intent) {
        if (intent == null) return false;
        String path = intent.getStringExtra("path");
        if (path == null || !SAFE_PATH.matcher(path).matches() || path.contains("..")) return false;
        webView.loadUrl(BASE + path);
        return true;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openFromIntent(intent);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        js("window.onAppResume && window.onAppResume()");
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    /* ---------- زرار الرجوع ---------- */
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() { handleBack(); } // أندرويد 12 وأقدم

    private void handleBack() {
        if (webView == null) { finish(); return; }
        // قسم المحارة بيقفل نوافذه بنفسه عن طريق onAndroidBack (زي تطبيقه الأصلي)
        webView.evaluateJavascript("(window.onAndroidBack && window.onAndroidBack()) ? 'handled' : 'no'", value -> {
            if (value != null && value.contains("handled")) return;
            if (webView.canGoBack()) webView.goBack();
            else finish();
        });
    }

    private void js(final String code) {
        if (webView == null) return;
        handler.post(() -> { if (webView != null) webView.evaluateJavascript(code, null); });
    }

    private void toast(final String msg) {
        handler.post(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
    }

    /* ================================================================
       عرض الملفات من داخل التطبيق
       ================================================================ */
    private class AppClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return intercept(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleLink(request.getUrl());
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            currentUrl = url;
            updateSectionBar(url);
        }

        @Override
        public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
            currentUrl = url;
            updateSectionBar(url);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (clearHistoryOnLoad && url != null && url.startsWith(HOME_URL)) {
                clearHistoryOnLoad = false;
                view.clearHistory();
            }
            Log.i(TAG, "HISABATI_PAGE " + url);
            // تشخيص للاختبار الآلي بس (بيقرا، ما بيغيرش أي حاجة في الصفحة)
            view.evaluateJavascript("(function(){var n=['HesabatyApp','HesabatiPlumbingApp','HesabatiHvacApp','HFloorApp','PlasterApp']"
                    + ".filter(function(k){return window[k]&&typeof window[k].versionName==='function'}).length;"
                    + "return JSON.stringify({title:document.title,bridges:n,body:document.body?document.body.childElementCount:0})})()",
                    v -> Log.i(TAG, "HISABATI_CHECK " + url + " " + v));
        }
    }

    /** أي رابط خارج التطبيق (واتساب، فيسبوك، جيت هب) يفتح في التطبيق المناسب */
    private boolean handleLink(Uri uri) {
        if (uri == null) return false;
        if (APP_HOST.equals(uri.getHost())) return false;
        openExternalUri(uri);
        return true;
    }

    private void openExternalUri(Uri uri) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, uri);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            toast("لا يوجد تطبيق لفتح هذا الرابط");
        }
    }

    private WebResourceResponse intercept(Uri uri) {
        String host = uri.getHost();
        if (host == null) return null;
        try {
            if (APP_HOST.equals(host)) {
                String path = uri.getPath();
                if (path == null || path.isEmpty() || path.equals("/")) path = "/Main-App/index.html";
                if (path.endsWith("/")) path = path + "index.html";
                // الملفات كلها جوه التطبيق: مفيش داعي لـ Service Worker (وكده كمان مفيش نسخ قديمة متخزنة)
                if (path.endsWith("/service-worker.js")) return notFound();
                return asset("www" + path, mimeFor(path), false);
            }
            // خط Cairo مضمّن جوه التطبيق علشان الشكل يفضل زي ما هو من غير إنترنت
            if ("fonts.googleapis.com".equals(host)) {
                String name = uri.getLastPathSegment();
                if (name != null && name.endsWith(".woff2")) return asset("www/Shared-Assets/fonts/" + name, "font/woff2", true);
                return asset("www/Shared-Assets/fonts/cairo.css", "text/css", true);
            }
        } catch (Exception ignored) { }
        return null;
    }

    private WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    private WebResourceResponse asset(String path, String mime, boolean cors) {
        try {
            InputStream in = getAssets().open(path);
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            if (cors) headers.put("Access-Control-Allow-Origin", "*");
            String enc = mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") ? "utf-8" : null;
            return new WebResourceResponse(mime, enc, 200, "OK", headers, in);
        } catch (IOException e) {
            return path.startsWith("www/") ? notFound() : null;
        }
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    /* ================================================================
       اختيار الملفات (اللوجو + استعادة النسخة الاحتياطية) + رسائل الصفحة
       ================================================================ */
    private class AppChromeClient extends WebChromeClient {
        @Override
        public boolean onConsoleMessage(ConsoleMessage m) {
            int level = m.messageLevel() == ConsoleMessage.MessageLevel.ERROR ? Log.ERROR : Log.INFO;
            Log.println(level, "HisabatiWeb", m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")");
            return true;
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filePathCallback != null) filePathCallback.onReceiveValue(null);
            filePathCallback = callback;
            Intent intent;
            try {
                intent = params.createIntent();
            } catch (Exception e) {
                intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
            }
            // ملفات النسخة الاحتياطية بتظهر بأنواع مختلفة على بعض الأجهزة
            String t = intent.getType();
            if (t != null && t.contains("json")) intent.setType("*/*");
            try {
                startActivityForResult(Intent.createChooser(intent, "اختيار ملف"), REQ_FILE_CHOOSER);
            } catch (ActivityNotFoundException e) {
                filePathCallback = null;
                toast("لا يوجد تطبيق لاختيار الملفات");
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER) {
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                filePathCallback = null;
            }
            return;
        }
        if (requestCode == REQ_AUTH) {
            String id = pendingAuthId;
            pendingAuthId = null;
            if (id == null) return;
            if (resultCode != RESULT_OK) { deliverAuth(id, null, null, "access_denied"); return; }
            try {
                AuthorizationResult r = Identity.getAuthorizationClient(this).getAuthorizationResultFromIntent(data);
                deliverAuth(id, r.getAccessToken(), TextUtils.join(" ", r.getGrantedScopes()), null);
            } catch (ApiException e) {
                deliverAuth(id, null, null, authError(e));
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    /* ================================================================
       جسر الأقسام — نفس وظائف التطبيقات الأصلية بالظبط
       ================================================================ */
    private class SectionBridge {
        /** رقم إصدار القسم المفتوح (من version.json بتاعه)، علشان القسم ما يفتكرش إن فيه تحديث */
        @JavascriptInterface
        public String versionName() {
            String dir = sectionDir(currentUrl);
            if (dir != null) {
                String v = sectionVersion(dir);
                if (v != null) return v;
            }
            return appVersion();
        }

        @JavascriptInterface
        public int sdk() { return Build.VERSION.SDK_INT; }

        @JavascriptInterface
        public void openExternal(final String url) {
            handler.post(() -> openExternalUri(Uri.parse(url)));
        }

        @JavascriptInterface
        public void print(final String title) {
            handler.post(() -> doPrint(title));
        }

        @JavascriptInterface
        public void saveFile(final String name, final String mime, final String text) {
            handler.post(() -> doSaveFile(name, mime, text));
        }

        /** تحديثات الأقسام بتوصل مع تحديث تطبيق أرزقي نفسه */
        @JavascriptInterface
        public void downloadUpdate(final String url, final String version) {
            handler.post(() -> {
                toast("التحديثات بتوصل مع تحديث تطبيق أرزقي | Arzoqi");
                js("window.onAppUpdateProgress && window.onAppUpdateProgress(0,'failed')");
                openExternalUri(Uri.parse(RELEASES_URL));
            });
        }
    }

    private String sectionVersion(String dir) {
        synchronized (sectionVersions) {
            if (sectionVersions.containsKey(dir)) return sectionVersions.get(dir);
            String v = null;
            try (InputStream in = getAssets().open("www/Trade-Modules/" + dir + "/version.json")) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                v = new JSONObject(out.toString("UTF-8")).optString("version", null);
            } catch (Exception ignored) { }
            sectionVersions.put(dir, v);
            return v;
        }
    }

    private String appVersion() {
        try {
            PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
            return pi.versionName;
        } catch (Exception e) {
            return "0";
        }
    }

    /* ---------- الطباعة / حفظ PDF ---------- */
    private void doPrint(String title) {
        try {
            PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
            String job = (title == null || title.trim().isEmpty()) ? "أرزقي" : title.trim();
            // هوامش الورقة في الـ PDF بتتلوّن بلون خلفية الـ WebView نفسه (الكحلي) مش بلون الصفحة،
            // فده اللي كان بيعمل الإطار الغامق حوالين الفاتورة. بنخليها بيضا طول ما الطباعة شغالة،
            // وبنرجّعها لما نظام الطباعة يخلص (onFinish).
            webView.setBackgroundColor(Color.WHITE);
            final PrintDocumentAdapter inner = webView.createPrintDocumentAdapter(job);
            PrintDocumentAdapter adapter = new PrintDocumentAdapter() {
                @Override public void onStart() { inner.onStart(); }
                @Override public void onLayout(PrintAttributes o, PrintAttributes n, android.os.CancellationSignal c,
                                               LayoutResultCallback cb, Bundle extras) { inner.onLayout(o, n, c, cb, extras); }
                @Override public void onWrite(android.print.PageRange[] pages, android.os.ParcelFileDescriptor dest,
                                              android.os.CancellationSignal c, WriteResultCallback cb) { inner.onWrite(pages, dest, c, cb); }
                @Override public void onFinish() {
                    inner.onFinish();
                    handler.post(() -> webView.setBackgroundColor(NAVY));
                }
            };
            PrintAttributes attrs = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();
            pm.print(job, adapter, attrs);
        } catch (Exception e) {
            webView.setBackgroundColor(NAVY);
            toast("تعذر فتح الطباعة على هذا الجهاز");
        }
    }

    /* ---------- حفظ النسخة الاحتياطية في التنزيلات ---------- */
    private void doSaveFile(String name, String mime, String text) {
        String safeName = name == null ? "arzaqi.json" : name.replaceAll("[\\\\/:*?\"<>|]", "_");
        byte[] bytes = (text == null ? "" : text).getBytes(StandardCharsets.UTF_8);
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = getContentResolver();
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName);
                v.put(MediaStore.MediaColumns.MIME_TYPE, mime == null ? "application/json" : mime);
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Arzoqi");
                Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (uri == null) throw new IOException("insert failed");
                try (OutputStream out = cr.openOutputStream(uri)) {
                    if (out == null) throw new IOException("stream failed");
                    out.write(bytes);
                }
                toast("✔ تم الحفظ في التنزيلات ← Arzoqi\n" + safeName);
                return;
            }
            if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                pendingSave = new String[]{name, mime, text};
                requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
                return;
            }
            File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Arzoqi");
            if (!dir.exists() && !dir.mkdirs()) throw new IOException("mkdir failed");
            try (FileOutputStream out = new FileOutputStream(new File(dir, safeName))) { out.write(bytes); }
            toast("✔ تم الحفظ في التنزيلات ← Arzoqi\n" + safeName);
        } catch (Exception e) {
            try {
                File f = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), safeName);
                try (FileOutputStream out = new FileOutputStream(f)) { out.write(bytes); }
                toast("✔ تم الحفظ في:\n" + f.getAbsolutePath());
            } catch (Exception e2) {
                toast("⚠ تعذر حفظ الملف");
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == REQ_STORAGE && pendingSave != null) {
            String[] p = pendingSave;
            pendingSave = null;
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) doSaveFile(p[0], p[1], p[2]);
            else toast("⚠ لازم توافق على صلاحية التخزين علشان تحفظ النسخة");
        }
    }

    /* ================================================================
       جسر الواجهة الرئيسية: تسجيل الدخول بجوجل وصلاحية درايف
       ================================================================ */
    private class NativeBridge {
        @JavascriptInterface
        public boolean isNative() { return true; }

        @JavascriptInterface
        public String appVersion() { return MainActivity.this.appVersion(); }

        /** بيرجّع التوكن للصفحة عن طريق window.__hisabatiAuthResult(id, token, scopes, error) */
        @JavascriptInterface
        public void googleAuthorize(final String id, final String scopes, final boolean interactive) {
            handler.post(() -> authorize(id, scopes, interactive));
        }
    }

    private void authorize(String id, String scopes, boolean interactive) {
        List<Scope> list = new ArrayList<>();
        for (String sc : (scopes == null ? "" : scopes).split(" ")) if (!sc.isEmpty()) list.add(new Scope(sc));
        AuthorizationRequest req = AuthorizationRequest.builder().setRequestedScopes(list).build();
        Identity.getAuthorizationClient(this).authorize(req)
                .addOnSuccessListener(r -> {
                    if (r.hasResolution()) {
                        if (!interactive || r.getPendingIntent() == null) { deliverAuth(id, null, null, "consent-required"); return; }
                        try {
                            pendingAuthId = id;
                            IntentSender sender = r.getPendingIntent().getIntentSender();
                            startIntentSenderForResult(sender, REQ_AUTH, null, 0, 0, 0);
                        } catch (IntentSender.SendIntentException e) {
                            pendingAuthId = null;
                            deliverAuth(id, null, null, "popup_failed_to_open");
                        }
                    } else {
                        deliverAuth(id, r.getAccessToken(), TextUtils.join(" ", r.getGrantedScopes()), null);
                    }
                })
                .addOnFailureListener(e -> deliverAuth(id, null, null, authError(e)));
    }

    private static String authError(Exception e) {
        if (e instanceof ApiException) {
            int c = ((ApiException) e).getStatusCode();
            if (c == CommonStatusCodes.NETWORK_ERROR) return "offline";
            if (c == CommonStatusCodes.DEVELOPER_ERROR) return "android-not-configured";
            if (c == CommonStatusCodes.CANCELED) return "access_denied";
        }
        Log.w(TAG, "google auth failed", e);
        return "auth-failed";
    }

    private void deliverAuth(String id, String token, String scopes, String error) {
        js("window.__hisabatiAuthResult && window.__hisabatiAuthResult(" + q(id) + "," + q(token) + "," + q(scopes) + "," + q(error) + ")");
    }

    private static String q(String s) { return s == null ? "null" : JSONObject.quote(s); }
}
