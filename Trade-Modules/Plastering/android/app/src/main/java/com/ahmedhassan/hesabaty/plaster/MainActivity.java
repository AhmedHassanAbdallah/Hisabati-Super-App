/*
 * HESABATI PLASTER - تطبيق أندرويد
 * يعرض ملفات التطبيق المضمّنة داخله (يعمل بالكامل بدون إنترنت) ويضيف:
 *  - الطباعة وحفظ PDF عن طريق نظام أندرويد
 *  - حفظ النسخ الاحتياطية في مجلد التنزيلات
 *  - فتح روابط واتساب في تطبيقها
 * بيانات هذا التطبيق منفصلة تماماً عن تطبيق حساباتي للكهرباء (معرّف تطبيق مختلف).
 */
package com.ahmedhassan.hesabaty.plaster;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
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
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + APP_HOST + "/index.html";
    private static final int REQ_FILE_CHOOSER = 1001;
    private static final int REQ_STORAGE = 1002;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String[] pendingSave;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0b1b33"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);

        webView.addJavascriptInterface(new Bridge(), "PlasterApp");
        webView.setWebViewClient(new AppClient());
        webView.setWebChromeClient(new AppChromeClient());

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl(START_URL);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    /** زر الرجوع: يقفل النافذة المفتوحة في التطبيق أولاً، ثم يرجع للصفحة السابقة، ثم يخرج */
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (webView == null) { super.onBackPressed(); return; }
        webView.evaluateJavascript("(window.onAndroidBack && window.onAndroidBack()) ? 'handled' : 'no'", new ValueCallback<String>() {
            @Override public void onReceiveValue(String value) {
                if (value != null && value.contains("handled")) return;
                if (webView.canGoBack()) webView.goBack();
                else MainActivity.super.onBackPressed();
            }
        });
    }

    private void toast(final String msg) {
        handler.post(new Runnable() {
            @Override public void run() { Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show(); }
        });
    }

    private class AppClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return intercept(request.getUrl());
        }

        @SuppressWarnings("deprecation")
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleLink(Uri.parse(url));
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleLink(request.getUrl());
        }
    }

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
                if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
                return asset("www" + path, mimeFor(path), false);
            }
            if ("fonts.googleapis.com".equals(host)) {
                WebResourceResponse r = asset("fonts/cairo.css", "text/css", true);
                if (r != null) return r;
            }
            if ("fonts.gstatic.com".equals(host)) {
                String name = uri.getLastPathSegment();
                if (name != null) {
                    WebResourceResponse r = asset("fonts/" + name, mimeFor(name), true);
                    if (r != null) return r;
                }
            }
        } catch (Exception ignored) { }
        return null;
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
            if (path.startsWith("www/")) {
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
            }
            return null;
        }
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    /* اختيار الملفات (اللوجو + استعادة النسخة الاحتياطية) */
    private class AppChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filePathCallback != null) filePathCallback.onReceiveValue(null);
            filePathCallback = callback;
            Intent intent;
            try { intent = params.createIntent(); }
            catch (Exception e) {
                intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
            }
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
        super.onActivityResult(requestCode, resultCode, data);
    }

    /* الجسر بين صفحة التطبيق وأندرويد: window.PlasterApp */
    private class Bridge {
        @JavascriptInterface
        public String versionName() {
            try {
                PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
                return pi.versionName;
            } catch (Exception e) { return "0"; }
        }

        @JavascriptInterface
        public void openExternal(final String url) {
            handler.post(new Runnable() { @Override public void run() { openExternalUri(Uri.parse(url)); } });
        }

        @JavascriptInterface
        public void print(final String title) {
            handler.post(new Runnable() { @Override public void run() { doPrint(title); } });
        }

        @JavascriptInterface
        public void saveFile(final String name, final String mime, final String text) {
            handler.post(new Runnable() { @Override public void run() { doSaveFile(name, mime, text); } });
        }
    }

    private void doPrint(String title) {
        try {
            PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
            String job = (title == null || title.trim().isEmpty()) ? "HESABATI PLASTER" : title.trim();
            PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(job);
            PrintAttributes attrs = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();
            pm.print(job, adapter, attrs);
        } catch (Exception e) {
            toast("تعذر فتح الطباعة على هذا الجهاز");
        }
    }

    private void doSaveFile(String name, String mime, String text) {
        String safeName = name == null ? "hesabati-plaster.json" : name.replaceAll("[\\\\/:*?\"<>|]", "_");
        byte[] bytes = (text == null ? "" : text).getBytes(Charset.forName("UTF-8"));
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = getContentResolver();
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName);
                v.put(MediaStore.MediaColumns.MIME_TYPE, mime == null ? "application/json" : mime);
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/HesabatiPlaster");
                Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (uri == null) throw new IOException("insert failed");
                OutputStream out = cr.openOutputStream(uri);
                if (out == null) throw new IOException("stream failed");
                out.write(bytes);
                out.close();
                toast("✔ تم الحفظ في التنزيلات ← HesabatiPlaster\n" + safeName);
                return;
            }
            if (Build.VERSION.SDK_INT >= 23
                    && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                pendingSave = new String[]{name, mime, text};
                requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
                return;
            }
            File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "HesabatiPlaster");
            if (!dir.exists() && !dir.mkdirs()) throw new IOException("mkdir failed");
            FileOutputStream out = new FileOutputStream(new File(dir, safeName));
            out.write(bytes);
            out.close();
            toast("✔ تم الحفظ في التنزيلات ← HesabatiPlaster\n" + safeName);
        } catch (Exception e) {
            try {
                File f = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), safeName);
                FileOutputStream out = new FileOutputStream(f);
                out.write(bytes);
                out.close();
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
}
