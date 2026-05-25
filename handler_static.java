import java.io.File;
import java.io.FileInputStream;
import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import android.util.Base64;

WEB_ROOT = "/storage/emulated/0/Tasker/a11y_studio/web";

MIME = new HashMap();
MIME.put("html", "text/html; charset=utf-8");
MIME.put("js",   "application/javascript; charset=utf-8");
MIME.put("css",  "text/css; charset=utf-8");
MIME.put("json", "application/json; charset=utf-8");
MIME.put("png",  "image/png");
MIME.put("ico",  "image/x-icon");
MIME.put("svg",  "image/svg+xml");

path = tasker.getVariable("http_request_path");
if (path == null || path == void) path = "/";
if (path.equals("/") || path.length() == 0) path = "/index.html";

/* 安全检查：拒绝 .. */
if (path.contains("..")) {
    tasker.setVariable("response_code", "400");
    tasker.setVariable("response_body", "bad path");
    tasker.setVariable("response_mime_type", "text/plain");
    return;
}

f = new File(WEB_ROOT, path.startsWith("/") ? path.substring(1) : path);
if (!f.exists() || !f.isFile()) {
    tasker.setVariable("response_code", "404");
    tasker.setVariable("response_body", "not found: " + path);
    tasker.setVariable("response_mime_type", "text/plain");
    return;
}

name = f.getName();
dot = name.lastIndexOf('.');
ext = dot > 0 ? name.substring(dot + 1).toLowerCase() : "";
mime = (String) MIME.get(ext);
if (mime == null) mime = "application/octet-stream";

/* try/finally 确保异常时也能关闭文件流（Rule 6 禁止 try-with-resources）*/
fis = new FileInputStream(f);
baos = new ByteArrayOutputStream();
try {
    byte[] buf = new byte[8192];
    int n;
    while ((n = fis.read(buf)) > 0) baos.write(buf, 0, n);
} finally {
    fis.close();
}

/* 文本类直接以字符串返回，二进制以 base64（理论上我们 web 资源都是文本）*/
if (mime.startsWith("text/") || mime.startsWith("application/javascript") || mime.startsWith("application/json")) {
    tasker.setVariable("response_body", baos.toString("UTF-8"));
} else {
    /* 二进制文件：base64 编码 */
    b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
    tasker.setVariable("response_body", b64);
}
tasker.setVariable("response_code", "200");
tasker.setVariable("response_mime_type", mime);