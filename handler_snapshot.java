import android.view.accessibility.AccessibilityNodeInfo;
import android.graphics.Rect;
import android.graphics.Point;
import android.view.WindowManager;
import android.content.Context;
import org.json.JSONObject;
import org.json.JSONArray;

a11Y.set();

walkNode(AccessibilityNodeInfo node, String path, int depth, JSONArray out) {
    if (node == null || node == void) return;
    Rect r = new Rect();
    node.getBoundsInScreen(r);
    if (r.width() >= 2 && r.height() >= 2) {
        JSONObject n = new JSONObject();
        n.put("path", path);
        n.put("depth", depth);
        n.put("left", r.left);   n.put("top", r.top);
        n.put("right", r.right); n.put("bottom", r.bottom);
        n.put("centerX", (r.left + r.right) / 2);
        n.put("centerY", (r.top  + r.bottom) / 2);
        n.put("clickable",     node.isClickable());
        n.put("longClickable", node.isLongClickable());
        n.put("scrollable",    node.isScrollable());
        n.put("editable",      node.isEditable());
        n.put("focusable",     node.isFocusable());
        n.put("checkable",     node.isCheckable());
        n.put("checked",       node.isChecked());
        n.put("enabled",       node.isEnabled());
        n.put("className", node.getClassName() != null ? node.getClassName().toString() : "");
        n.put("viewId",    node.getViewIdResourceName() != null ? node.getViewIdResourceName() : "");
        n.put("text",      node.getText() != null ? node.getText().toString() : "");
        n.put("desc",      node.getContentDescription() != null ? node.getContentDescription().toString() : "");
        out.put(n);
    }
    for (int i = 0; i < node.getChildCount(); i++) {
        walkNode(node.getChild(i), path + "." + i, depth + 1, out);
    }
}

wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
sz = new Point();
wm.getDefaultDisplay().getRealSize(sz);

nodes = new JSONArray();
root = getRoot();
if (root != null) walkNode(root, "0", 0, nodes);

resp = new JSONObject();
resp.put("width", sz.x);
resp.put("height", sz.y);
resp.put("ts", System.currentTimeMillis());
resp.put("nodeCount", nodes.length());
resp.put("nodes", nodes);

tasker.setVariable("response_code", "200");
tasker.setVariable("response_body", resp.toString());
tasker.setVariable("response_mime_type", "application/json");