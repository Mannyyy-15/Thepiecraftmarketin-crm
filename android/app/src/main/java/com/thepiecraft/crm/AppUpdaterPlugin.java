package com.thepiecraft.crm;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final long MAX_APK_BYTES = 100L * 1024L * 1024L;
    private static final Set<String> ALLOWED_HOSTS = new HashSet<>(Arrays.asList(
        "github.com",
        "raw.githubusercontent.com",
        "objects.githubusercontent.com",
        "release-assets.githubusercontent.com",
        "crm.thepiecraftmarketing.com",
        "thepiecraft-crm.vercel.app"
    ));
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url", "");
        String expectedSha256 = call.getString("sha256", "").toLowerCase(Locale.US);
        if (!isAllowedHttpsUrl(url) || !expectedSha256.matches("^[a-f0-9]{64}$")) {
            call.reject("The update metadata is invalid.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settingsIntent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            getActivity().startActivity(settingsIntent);
            JSObject result = new JSObject();
            result.put("status", "permission_required");
            call.resolve(result);
            return;
        }

        executor.execute(() -> downloadAndOpenInstaller(call, url, expectedSha256));
    }

    private void downloadAndOpenInstaller(PluginCall call, String sourceUrl, String expectedSha256) {
        File updateDirectory = new File(getContext().getCacheDir(), "updates");
        File apkFile = new File(updateDirectory, "ThePieCraft-CRM-update.apk");
        try {
            if (!updateDirectory.exists() && !updateDirectory.mkdirs()) {
                throw new IllegalStateException("Could not prepare update storage.");
            }
            HttpURLConnection connection = openConnectionFollowingSafeRedirects(sourceUrl);
            long contentLength = connection.getContentLengthLong();
            if (contentLength <= 0 || contentLength > MAX_APK_BYTES) {
                connection.disconnect();
                throw new IllegalStateException("The update file size is invalid.");
            }

            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long downloaded = 0;
            byte[] buffer = new byte[32 * 1024];
            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(apkFile)) {
                int read;
                while ((read = input.read(buffer)) != -1) {
                    downloaded += read;
                    if (downloaded > MAX_APK_BYTES) throw new IllegalStateException("The update is too large.");
                    output.write(buffer, 0, read);
                    digest.update(buffer, 0, read);
                    JSObject progress = new JSObject();
                    progress.put("percent", (int) Math.min(100, (downloaded * 100L) / contentLength));
                    notifyListeners("downloadProgress", progress);
                }
            } finally {
                connection.disconnect();
            }

            String actualSha256 = toHex(digest.digest());
            if (!MessageDigest.isEqual(actualSha256.getBytes(), expectedSha256.getBytes())) {
                //noinspection ResultOfMethodCallIgnored
                apkFile.delete();
                throw new SecurityException("The downloaded update failed verification.");
            }

            verifyApkIdentity(apkFile);

            getActivity().runOnUiThread(() -> openInstaller(call, apkFile));
        } catch (Exception error) {
            //noinspection ResultOfMethodCallIgnored
            apkFile.delete();
            call.reject(error.getMessage() != null ? error.getMessage() : "The update download failed.");
        }
    }

    @SuppressWarnings("deprecation")
    private void verifyApkIdentity(File apkFile) throws Exception {
        PackageManager packageManager = getContext().getPackageManager();
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? PackageManager.GET_SIGNING_CERTIFICATES
            : PackageManager.GET_SIGNATURES;
        PackageInfo candidate = packageManager.getPackageArchiveInfo(apkFile.getAbsolutePath(), flags);
        PackageInfo installed = packageManager.getPackageInfo(getContext().getPackageName(), flags);
        if (candidate == null || !getContext().getPackageName().equals(candidate.packageName)) {
            throw new SecurityException("The update package does not match ThePieCraft CRM.");
        }
        long candidateVersion = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? candidate.getLongVersionCode()
            : candidate.versionCode;
        long installedVersion = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? installed.getLongVersionCode()
            : installed.versionCode;
        if (candidateVersion <= installedVersion) {
            throw new SecurityException("The downloaded APK is not a newer app version.");
        }
        Signature[] candidateSignatures = signaturesOf(candidate);
        Signature[] installedSignatures = signaturesOf(installed);
        if (candidateSignatures.length == 0 ||
            candidateSignatures.length != installedSignatures.length ||
            !sameSignatures(candidateSignatures, installedSignatures)) {
            throw new SecurityException("The update signature does not match the installed app.");
        }
    }

    @SuppressWarnings("deprecation")
    private Signature[] signaturesOf(PackageInfo packageInfo) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && packageInfo.signingInfo != null) {
            return packageInfo.signingInfo.hasMultipleSigners()
                ? packageInfo.signingInfo.getApkContentsSigners()
                : packageInfo.signingInfo.getSigningCertificateHistory();
        }
        return packageInfo.signatures != null ? packageInfo.signatures : new Signature[0];
    }

    private boolean sameSignatures(Signature[] first, Signature[] second) {
        Set<Signature> firstSet = new HashSet<>(Arrays.asList(first));
        Set<Signature> secondSet = new HashSet<>(Arrays.asList(second));
        return firstSet.equals(secondSet);
    }

    private HttpURLConnection openConnectionFollowingSafeRedirects(String sourceUrl) throws Exception {
        URL current = URI.create(sourceUrl).toURL();
        for (int redirect = 0; redirect < 6; redirect++) {
            if (!isAllowedHttpsUrl(current.toString())) throw new SecurityException("The update host is not trusted.");
            HttpURLConnection connection = (HttpURLConnection) current.openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(30_000);
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive");
            int status = connection.getResponseCode();
            if (status >= 300 && status < 400) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();
                if (location == null) throw new IllegalStateException("The update redirect is invalid.");
                current = new URL(current, location);
                continue;
            }
            if (status != HttpURLConnection.HTTP_OK) {
                connection.disconnect();
                throw new IllegalStateException("The update server returned " + status + ".");
            }
            return connection;
        }
        throw new IllegalStateException("The update server redirected too many times.");
    }

    private boolean isAllowedHttpsUrl(String value) {
        try {
            URI uri = URI.create(value);
            return "https".equalsIgnoreCase(uri.getScheme()) &&
                uri.getHost() != null &&
                ALLOWED_HOSTS.contains(uri.getHost().toLowerCase(Locale.US));
        } catch (Exception ignored) {
            return false;
        }
    }

    private void openInstaller(PluginCall call, File apkFile) {
        try {
            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apkFile
            );
            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(installIntent);
            JSObject result = new JSObject();
            result.put("status", "installer_opened");
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Android could not open the update installer.");
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) result.append(String.format(Locale.US, "%02x", value));
        return result.toString();
    }
}
