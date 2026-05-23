package pl.krezus.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    private static final String SERVER_URL = "https://krezus.vercel.app";

    private static final String OFFLINE_HTML =
        "<!DOCTYPE html><html><head>" +
        "<meta charset='UTF-8'>" +
        "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
        "<style>" +
        "* { margin:0; padding:0; box-sizing:border-box; }" +
        "body { background:#0f1117; color:#e2e8f0; font-family:system-ui,sans-serif;" +
        "  display:flex; flex-direction:column; align-items:center; justify-content:center;" +
        "  min-height:100vh; text-align:center; padding:32px; }" +
        ".icon { margin-bottom:24px; }" +
        "h1 { font-size:22px; font-weight:600; margin-bottom:12px; }" +
        "p { font-size:15px; color:#94a3b8; line-height:1.6; margin-bottom:32px; }" +
        "button { background:#6366f1; color:#fff; border:none; border-radius:12px;" +
        "  padding:14px 32px; font-size:16px; cursor:pointer; }" +
        "</style></head><body>" +
        "<div class='icon'><svg width='64' height='64' viewBox='0 0 24 24' fill='none'" +
        " stroke='#6366f1' stroke-width='1.5' stroke-linecap='round'>" +
        "<path d='M1 6c5.5-5.5 14.5-5.5 20 0'/>" +
        "<path d='M5 10c3.5-3.5 9.5-3.5 13 0'/>" +
        "<path d='M9 14c1.5-1.5 4.5-1.5 6 0'/>" +
        "<circle cx='12' cy='18' r='1.5' fill='#6366f1' stroke='none'/>" +
        "<line x1='2' y1='2' x2='22' y2='22' stroke='#e74c3c' stroke-width='2'/>" +
        "</svg></div>" +
        "<h1>Brak polaczenia z internetem</h1>" +
        "<p>Krezus wymaga dostepu do sieci.<br>Sprawdz Wi-Fi lub dane mobilne.</p>" +
        "<button onclick='location.href=\"" + SERVER_URL + "\"'>Odswiez</button>" +
        "</body></html>";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean offlinePageShown = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    offlinePageShown = true;
                    view.loadDataWithBaseURL(null, OFFLINE_HTML, "text/html", "UTF-8", null);
                } else {
                    super.onReceivedError(view, request, error);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith(SERVER_URL)) {
                    offlinePageShown = false;
                }
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                offlinePageShown = false;
                mainHandler.post(() -> view.loadUrl(SERVER_URL));
                return true;
            }
        });

        registerNetworkCallback();
    }

    @Override
    protected void onResume() {
        super.onResume();
        WebView webView = bridge.getWebView();
        String url = webView.getUrl();
        if (url == null || url.isEmpty() || "about:blank".equals(url)) {
            offlinePageShown = false;
            webView.loadUrl(SERVER_URL);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm != null && networkCallback != null) {
            cm.unregisterNetworkCallback(networkCallback);
        }
    }

    private void registerNetworkCallback() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return;

        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onCapabilitiesChanged(Network network, NetworkCapabilities caps) {
                if (caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
                    mainHandler.post(() -> {
                        if (offlinePageShown) {
                            offlinePageShown = false;
                            bridge.getWebView().loadUrl(SERVER_URL);
                        }
                    });
                }
            }

            @Override
            public void onLost(Network network) {
                mainHandler.post(() -> {
                    if (!isNetworkAvailable() && !offlinePageShown) {
                        offlinePageShown = true;
                        bridge.getWebView().loadDataWithBaseURL(null, OFFLINE_HTML, "text/html", "UTF-8", null);
                    }
                });
            }
        };

        cm.registerNetworkCallback(
            new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build(),
            networkCallback
        );
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        Network activeNetwork = cm.getActiveNetwork();
        if (activeNetwork == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(activeNetwork);
        return caps != null
            && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }
}
