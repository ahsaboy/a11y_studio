import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityNodeInfo.AccessibilityAction;
import android.graphics.Rect;
import org.json.JSONObject;
import org.json.JSONArray;
import bsh.NameSpace;
import bsh.BshMethod;
import java.util.HashMap;
import java.util.List;

a11Y.set();

body = tasker.getVariable("http_request_body");
if (body == null || body == void || body.length() == 0) {
    tasker.setVariable("response_code", "400");
    tasker.setVariable("response_body", "{\"error\":\"empty body\"}");
    tasker.setVariable("response_mime_type", "application/json");
    return;
}

in = new JSONObject(body);
x = in.optInt("x", -1);
y = in.optInt("y", -1);
pathArg = in.optString("path", "");

/* ====== 查找节点（命名函数内保持 typed，避免变量泄漏到外层）====== */
findByPath(String path) {
    AccessibilityNodeInfo node = getRoot();
    if (node == null || node == void || path == null) return null;

    /* 避免使用正则表达式 split，直接用字符处理 */
    java.util.List partsList = new java.util.ArrayList();
    int start = 0;
    for (int i = 0; i <= path.length(); i++) {
        if (i == path.length() || path.charAt(i) == '.') {
            if (i > start) {
                partsList.add(path.substring(start, i));
            }
            start = i + 1;
        }
    }

    for (int i = 1; i < partsList.size(); i++) {
        int idx = Integer.parseInt((String) partsList.get(i));
        if (idx >= node.getChildCount()) return null;
        node = node.getChild(idx);
        if (node == null || node == void) return null;
    }
    return node;
}

findAtCoord(AccessibilityNodeInfo n, int x, int y, String[] outPath, String curPath) {
    if (n == null || n == void) return null;
    Rect b = new Rect();
    n.getBoundsInScreen(b);
    if (!b.contains(x, y)) return null;
    for (int i = n.getChildCount() - 1; i >= 0; i--) {
        AccessibilityNodeInfo hit = findAtCoord(n.getChild(i), x, y, outPath, curPath + "." + i);
        if (hit != null) return hit;
    }
    outPath[0] = curPath;
    return n;
}

if (pathArg.length() > 0) {
    selected = findByPath(pathArg);
    foundPath = pathArg;
} else {
    ph = new String[] { "0" };
    selected = findAtCoord(getRoot(), x, y, ph, "0");
    foundPath = ph[0];
}

if (selected == null || selected == void) {
    tasker.setVariable("response_code", "404");
    tasker.setVariable("response_body", "{\"error\":\"node not found\"}");
    tasker.setVariable("response_mime_type", "application/json");
    return;
}

/* ====== 节点属性 ====== */
props = new JSONObject();
props.put("path", foundPath);
props.put("clickable",     selected.isClickable());
props.put("longClickable", selected.isLongClickable());
props.put("editable",      selected.isEditable());
props.put("scrollable",    selected.isScrollable());
props.put("focusable",     selected.isFocusable());
props.put("checkable",     selected.isCheckable());
props.put("checked",       selected.isChecked());
props.put("enabled",       selected.isEnabled());
props.put("className", selected.getClassName() != null ? selected.getClassName().toString() : "");
props.put("viewId",    selected.getViewIdResourceName() != null ? selected.getViewIdResourceName() : "");
props.put("text",      selected.getText() != null ? selected.getText().toString() : "");
props.put("desc",      selected.getContentDescription() != null ? selected.getContentDescription().toString() : "");
r = new Rect();
selected.getBoundsInScreen(r);
bo = new JSONObject();
bo.put("left", r.left); bo.put("top", r.top);
bo.put("right", r.right); bo.put("bottom", r.bottom);
bo.put("centerX", (r.left + r.right) / 2);
bo.put("centerY", (r.top  + r.bottom) / 2);
props.put("bounds", bo);
props.put("centerX", (r.left + r.right) / 2);
props.put("centerY", (r.top  + r.bottom) / 2);

/* ====== 推荐动作（Android 内置 action → a11Y 函数）====== */
am = new HashMap();
am.put(new Integer(AccessibilityAction.ACTION_CLICK.getId()),          "click");
am.put(new Integer(AccessibilityAction.ACTION_LONG_CLICK.getId()),     "longClick");
am.put(new Integer(AccessibilityAction.ACTION_SET_TEXT.getId()),       "setText");
am.put(new Integer(AccessibilityAction.ACTION_SCROLL_FORWARD.getId()), "scrollForward");
am.put(new Integer(AccessibilityAction.ACTION_SCROLL_BACKWARD.getId()),"scrollBackward");
am.put(new Integer(AccessibilityAction.ACTION_FOCUS.getId()),          "focus");
am.put(new Integer(AccessibilityAction.ACTION_CLEAR_FOCUS.getId()),    "clearFocus");
am.put(new Integer(AccessibilityAction.ACTION_COPY.getId()),           "copy");
am.put(new Integer(AccessibilityAction.ACTION_PASTE.getId()),          "paste");
am.put(new Integer(AccessibilityAction.ACTION_CUT.getId()),            "cut");
am.put(new Integer(AccessibilityAction.ACTION_SELECT.getId()),         "select");
am.put(new Integer(AccessibilityAction.ACTION_DISMISS.getId()),        "dismiss");
am.put(new Integer(AccessibilityAction.ACTION_COLLAPSE.getId()),       "collapse");
am.put(new Integer(AccessibilityAction.ACTION_SET_SELECTION.getId()),  "setSelection");
am.put(new Integer(AccessibilityAction.ACTION_SET_PROGRESS.getId()),   "setSeekbar");
am.put(new Integer(AccessibilityAction.ACTION_SHOW_ON_SCREEN.getId()), "showOnScreen");
am.put(new Integer(AccessibilityAction.ACTION_IME_ENTER.getId()),      "imeEnter");
am.put(new Integer(AccessibilityAction.ACTION_CONTEXT_CLICK.getId()),  "contextClick");

/* ====== 从 a11Y.inspector.DECLARATION 读取预解析的函数元数据 ====== */
/* MethodInspector 在 a11Y 初始化时已对 actions/main/gestures + globalAction.java 做了完整反射并缓存 */
methodsByName = new HashMap();

inspector = a11Y.inspector;
if (inspector != null && inspector != void) {
    declaration = inspector.DECLARATION;
    if (declaration != null && declaration != void) {
        declIter = declaration.keySet().iterator();
        while (declIter.hasNext()) {
            methodName = (String) declIter.next();
            if (methodName.startsWith("_")) continue;

            overloadsList = declaration.get(methodName);
            if (overloadsList == null) continue;

            overloadsArr = new JSONArray();
            for (int oi = 0; oi < overloadsList.size(); oi++) {
                overloadMap = overloadsList.get(oi);
                overload = new JSONObject();

                paramNames = overloadMap.get("parameterNames");
                paramTypes = overloadMap.get("parameterTypes");
                params = new JSONArray();

                int pSize = (paramNames != null) ? paramNames.size() : 0;
                for (int pi = 0; pi < pSize; pi++) {
                    p = new JSONObject();
                    pType = (paramTypes != null && pi < paramTypes.size()) ? (String) paramTypes.get(pi) : null;
                    /* 简化类名：处理普通类（含点）和 JVM 数组记法（[I=int[], [[Ljava.lang.Object;=Object[][]）*/
                    if (pType != null) {
                        if (pType.length() > 0 && pType.charAt(0) == '[') {
                            /* JVM 数组类型：数出维度、解内层类型 */
                            int dims = 0;
                            String inner = pType;
                            while (inner.length() > 0 && inner.charAt(0) == '[') { dims++; inner = inner.substring(1); }
                            if (inner.length() > 1 && inner.charAt(0) == 'L' && inner.charAt(inner.length()-1) == ';') {
                                inner = inner.substring(1, inner.length() - 1);  /* 去掉 L...;  */
                            }
                            if (inner.contains(".")) inner = inner.substring(inner.lastIndexOf(".") + 1);
                            String arraySuffix = "";
                            for (int d = 0; d < dims; d++) arraySuffix += "[]";
                            pType = inner + arraySuffix;
                        } else if (pType.contains(".")) {
                            pType = pType.substring(pType.lastIndexOf(".") + 1);
                        }
                    }
                    pName = paramNames.get(pi);
                    p.put("type", pType != null ? pType : "Object");
                    p.put("name", pName != null ? (String) pName : ("arg" + pi));
                    params.put(p);
                }

                overload.put("params", params);
                retType = (String) overloadMap.get("returnType");
                if (retType != null && retType.contains(".")) {
                    retType = retType.substring(retType.lastIndexOf(".") + 1);
                }
                overload.put("returnType", retType != null ? retType : "void");
                overloadsArr.put(overload);
            }

            methodObj = new JSONObject();
            methodObj.put("name", methodName);
            methodObj.put("overloads", overloadsArr);
            methodsByName.put(methodName, methodObj);
        }
    }
}

/* ====== 补充 others/ 函数（openApp/getClipboard 等不在 DECLARATION 中）====== */
/* 注意：直接赋值 void 字段会抛 bsh.EvalError（无法被 try-catch 捕获）。
   安全方式：先用 instanceof 探测（读 void 不报错，只有赋值 void 才报错），
   确认是 String 后才赋值。退而求其次取 MAIN_DIRECTORY。 */
othersEnvPath = null;
if (a11Y.ENV_PATH instanceof String) {
    othersEnvPath = a11Y.ENV_PATH;
}
if (othersEnvPath == null && MAIN_DIRECTORY instanceof String) {
    othersEnvPath = MAIN_DIRECTORY;
}
if (othersEnvPath != null) {
    String[] othersNeeded = new String[]{"openApp", "getClipboard", "setClipboard", "currentPackage"};
    for (int oi = 0; oi < othersNeeded.length; oi++) {
        if (methodsByName.containsKey(othersNeeded[oi])) continue;
        java.io.File bshFile = new java.io.File(othersEnvPath + "/others/" + othersNeeded[oi] + ".bsh");
        if (bshFile.exists()) {
            try { source(bshFile.getAbsolutePath()); } catch (Exception ex) {}
        }
    }

    /* 从当前 namespace 反射，只收录 others 目标函数 */
    BshMethod[] callerMethods = this.namespace.getMethods();
    if (callerMethods != null) {
        for (int j = 0; j < callerMethods.length; j++) {
            m = (BshMethod) callerMethods[j];
            methodName = m.getName();

            boolean isOthersTarget = false;
            for (int oi = 0; oi < othersNeeded.length; oi++) {
                if (othersNeeded[oi].equals(methodName)) { isOthersTarget = true; break; }
            }
            if (!isOthersTarget) continue;

            methodObj = (JSONObject) methodsByName.get(methodName);
            if (methodObj == null || methodObj == void) {
                methodObj = new JSONObject();
                methodObj.put("name", methodName);
                methodObj.put("overloads", new JSONArray());
                methodsByName.put(methodName, methodObj);
            }

            overload = new JSONObject();
            Class[] types = m.getParameterTypes();
            if (types == null) types = new Class[0];
            String[] pnames = m.getParameterNames();
            params = new JSONArray();
            for (int k = 0; k < types.length; k++) {
                p = new JSONObject();
                pt = types[k];
                p.put("type", pt != null ? pt.getSimpleName() : "Object");
                p.put("name", (pnames != null && k < pnames.length && pnames[k] != null) ? pnames[k] : ("arg" + k));
                params.put(p);
            }
            overload.put("params", params);
            rt = m.getReturnType();
            overload.put("returnType", rt != null ? rt.getSimpleName() : "void");

            /* 去重：跳过已存在的同参数签名 */
            sig = "";
            for (int k = 0; k < types.length; k++) {
                sig += (types[k] != null ? types[k].getSimpleName() : "Object") + ",";
            }
            overloadsArr = methodObj.getJSONArray("overloads");
            boolean isDup = false;
            for (int si = 0; si < overloadsArr.length(); si++) {
                existParams = overloadsArr.getJSONObject(si).getJSONArray("params");
                existSig = "";
                for (int ei = 0; ei < existParams.length(); ei++) {
                    existSig += existParams.getJSONObject(ei).getString("type") + ",";
                }
                if (existSig.equals(sig)) { isDup = true; break; }
            }
            if (!isDup) {
                overloadsArr.put(overload);
            }
        }
    }
}

/* 转换为 JSONArray 并添加总重载数 */
allFunctions = new JSONArray();
methodIterator = methodsByName.values().iterator();
while (methodIterator.hasNext()) {
    methodObj = (JSONObject) methodIterator.next();
    methodObj.put("totalOverloads", methodObj.getJSONArray("overloads").length());
    allFunctions.put(methodObj);
}

/* ====== 推荐动作（Android 内置 action → a11Y 函数）====== */
recommended = new JSONArray();
actionList = selected.getActionList();
for (int i = 0; i < actionList.size(); i++) {
    aa = (AccessibilityAction) actionList.get(i);
    fname = (String) am.get(new Integer(aa.getId()));
    if (fname == null || fname == void) continue;

    /* 从已反射的函数中查找完整信息 */
    fnMeta = (JSONObject) methodsByName.get(fname);
    if (fnMeta != null && fnMeta != void) {
        /* 使用完整的函数元信息 */
        ro = new JSONObject();
        ro.put("name", fnMeta.getString("name"));
        ro.put("overloads", fnMeta.getJSONArray("overloads"));
        ro.put("totalOverloads", fnMeta.getInt("totalOverloads"));
        ro.put("label", aa.getLabel() != null ? aa.getLabel().toString() : "");
        recommended.put(ro);
    } else {
        /* 如果找不到，只返回基本信息 */
        ro = new JSONObject();
        ro.put("name", fname);
        ro.put("label", aa.getLabel() != null ? aa.getLabel().toString() : "");
        ro.put("overloads", new JSONArray());
        ro.put("totalOverloads", 0);
        recommended.put(ro);
    }
}

/* ====== 始终可用的全局/坐标函数（动态从反射结果中查找）====== */
globals = new JSONArray();
globalNames = new String[] {
    "tap", "swipe", "back", "home", "recents", "notifications", "screenshot",
    "lock", "lastapp", "wait", "waitNodes", "waitUntilGone", "currentPackage",
    "openApp", "getClipboard", "setClipboard"
};
for (int g = 0; g < globalNames.length; g++) {
    gname = globalNames[g];

    /* 从已反射的函数中查找完整信息 */
    gfnMeta = (JSONObject) methodsByName.get(gname);
    if (gfnMeta != null && gfnMeta != void) {
        globals.put(gfnMeta);
    } else {
        /* 如果找不到，创建基本条目 */
        globObj = new JSONObject();
        globObj.put("name", gname);
        globObj.put("overloads", new JSONArray());
        globObj.put("totalOverloads", 0);
        globals.put(globObj);
    }
}

resp = new JSONObject();
resp.put("props", props);
resp.put("recommended", recommended);
resp.put("allFunctions", allFunctions);
resp.put("globals", globals);

tasker.setVariable("response_code", "200");
tasker.setVariable("response_body", resp.toString());
tasker.setVariable("response_mime_type", "application/json");