import bsh.Interpreter;
import bsh.EvalError;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.io.StringWriter;

body = tasker.getVariable("http_request_body");
resp = new JSONObject();

if (body == null || body == void || body.length() == 0) {
    resp.put("ok", false);
    resp.put("error", "empty body");
    tasker.setVariable("response_code", "400");
    tasker.setVariable("response_body", resp.toString());
    tasker.setVariable("response_mime_type", "application/json");
    return;
}

in = new JSONObject(body);
code = in.optString("code", "");
if (code.length() == 0) {
    resp.put("ok", false);
    resp.put("error", "empty code");
    tasker.setVariable("response_code", "400");
    tasker.setVariable("response_body", resp.toString());
    tasker.setVariable("response_mime_type", "application/json");
    return;
}

/* 沙盒执行用户代码：仅捕获 EvalError(BeanShell 语法/求值错误) 和 Exception(运行时)
   不再用 catch(Throwable)，避免吞掉 Error 类异常 */
try {
    ip = new Interpreter();
    stdoutBuf = new ByteArrayOutputStream();
    ps = new PrintStream(stdoutBuf, true, "UTF-8");
    ip.setOut(ps);
    ip.setErr(ps);
    ip.set("tasker", tasker);
    ip.set("context", context);

    /* 让用户代码能直接用 click/getNode/... */
    ip.eval("a11Y = tasker.getJavaVariable(\"a11Y\");");
    ip.eval("a11Y.set();");

    result = ip.eval(code);

    resp.put("ok", true);
    resp.put("result", result == null ? JSONObject.NULL : result.toString());
    resp.put("stdout", stdoutBuf.toString("UTF-8"));
    tasker.setVariable("response_code", "200");
} catch (EvalError ee) {
    resp.put("ok", false);
    resp.put("error", ee.getMessage() != null ? ee.getMessage() : ee.toString());
    StringWriter sw = new StringWriter();
    ee.printStackTrace(new PrintWriter(sw));
    resp.put("trace", sw.toString());
    tasker.setVariable("response_code", "500");
} catch (Exception ex) {
    resp.put("ok", false);
    resp.put("error", ex.getMessage() != null ? ex.getMessage() : ex.toString());
    StringWriter sw = new StringWriter();
    ex.printStackTrace(new PrintWriter(sw));
    resp.put("trace", sw.toString());
    tasker.setVariable("response_code", "500");
}

tasker.setVariable("response_body", resp.toString());
tasker.setVariable("response_mime_type", "application/json");