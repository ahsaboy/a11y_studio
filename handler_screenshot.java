
import java.io.File;
import java.io.FileInputStream;
import java.io.ByteArrayOutputStream;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

tasker.log("[shot] === request start ===");

/* 从 Tasker 变量 %screenshot 获取截图路径 */
screenshot_path = tasker.getVariable("screenshot");
tasker.log("[shot] screenshot_path=" + screenshot_path);
if (screenshot_path == null || screenshot_path == void) {
    tasker.log("[shot] screenshot path not set");
    tasker.setVariable("response_code", "500");
    tasker.setVariable("response_body", "Screenshot path not set");
    tasker.setVariable("response_mime_type", "text/plain");
    return;
}

/* 检查文件是否存在 */
File file = new File(screenshot_path);
if (!file.exists() || !file.isFile()) {
    tasker.log("[shot] file not found: " + screenshot_path);
    tasker.setVariable("response_code", "500");
    tasker.setVariable("response_body", "File not found: " + screenshot_path);
    tasker.setVariable("response_mime_type", "text/plain");
    return;
}

/* 读取文件内容为字节数组 */
byte[] fileBytes = null;
FileInputStream fis = null;
try {
    fis = new FileInputStream(file);
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    byte[] buffer = new byte[4096];
    int bytesRead;
    while ((bytesRead = fis.read(buffer)) != -1) {
        baos.write(buffer, 0, bytesRead);
    }
    fileBytes = baos.toByteArray();
    tasker.log("[shot] file read: " + fileBytes.length + " bytes");
} catch (Throwable t) {
    tasker.log("[shot] read failed: " + t.getClass().getSimpleName() + ": " + t.getMessage());
    tasker.setVariable("response_code", "500");
    tasker.setVariable("response_body", "Read error: " + t.getMessage());
    tasker.setVariable("response_mime_type", "text/plain");
    return;
} finally {
    if (fis != null) {
        try {
            fis.close();
        } catch (Throwable ignored) {
        }
    }
}

/* 解码为Bitmap并压缩为JPEG */
Bitmap bitmap = null;
byte[] compressedBytes = null;
try {
    /* 解码原始字节数组为Bitmap */
    bitmap = BitmapFactory.decodeByteArray(fileBytes, 0, fileBytes.length);
    if (bitmap == null) {
        tasker.log("[shot] bitmap decode failed");
        tasker.setVariable("response_code", "500");
        tasker.setVariable("response_body", "Image decode failed");
        tasker.setVariable("response_mime_type", "text/plain");
        return;
    }
    
    tasker.log("[shot] bitmap decoded: " + bitmap.getWidth() + "x" + bitmap.getHeight());

    /* 循环压缩到100KB以内：先降JPEG质量，再降分辨率 */
    int targetSize = 100 * 1024;
    int quality = 85;
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos);
    compressedBytes = baos.toByteArray();
    tasker.log("[shot] q=" + quality + " size=" + compressedBytes.length);

    while (compressedBytes.length > targetSize && quality > 15) {
        quality -= 10;
        baos.reset();
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos);
        compressedBytes = baos.toByteArray();
        tasker.log("[shot] retry q=" + quality + " size=" + compressedBytes.length);
    }

    /* 仍超 100KB 则按面积比例缩放后再次压缩 */
    if (compressedBytes.length > targetSize) {
        double scale = Math.sqrt((double) targetSize / (double) compressedBytes.length) * 0.95;
        int newW = (int)(bitmap.getWidth() * scale);
        int newH = (int)(bitmap.getHeight() * scale);
        if (newW < 1) newW = 1;
        if (newH < 1) newH = 1;
        Bitmap scaled = Bitmap.createScaledBitmap(bitmap, newW, newH, true);
        bitmap.recycle();
        bitmap = scaled;
        tasker.log("[shot] scaled to " + newW + "x" + newH);

        quality = 70;
        baos.reset();
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos);
        compressedBytes = baos.toByteArray();
        while (compressedBytes.length > targetSize && quality > 15) {
            quality -= 10;
            baos.reset();
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos);
            compressedBytes = baos.toByteArray();
            tasker.log("[shot] retry2 q=" + quality + " size=" + compressedBytes.length);
        }
    }

    tasker.log("[shot] final size=" + compressedBytes.length + " bytes (JPEG q=" + quality + ")");

} catch (Throwable t) {
    tasker.log("[shot] compress failed: " + t.getClass().getSimpleName() + ": " + t.getMessage());
    tasker.setVariable("response_code", "500");
    tasker.setVariable("response_body", "Compress error: " + t.getMessage());
    tasker.setVariable("response_mime_type", "text/plain");
    return;
} finally {
    if (bitmap != null) {
        bitmap.recycle();
    }
}

/* 转换为 Base64 编码 */
String b64 = Base64.encodeToString(compressedBytes, Base64.NO_WRAP);
tasker.log("[shot] b64 length=" + b64.length());

/* 设置响应变量 */
tasker.setVariable("response_code", "200");
tasker.setVariable("response_body", b64);
tasker.setVariable("response_mime_type", "image/jpeg");