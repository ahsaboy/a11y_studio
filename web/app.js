'use strict';

const state = {
  width: 0, height: 0, nodes: [],
  selectedPath: null, selectedNode: null,
  steps: [],
  scale: 1,
  /* hover 深度过滤:鼠标位置下按面积升序的候选节点栈,Ctrl+滚轮切层 */
  hoverPath: null,
  hoverCandidates: [],
  hoverIndex: 0,
  hoverKey: '',
  /* 是否拉取并显示截图(由工具栏 #noScreenshot 控制,redraw 时决定背景画截图还是空白) */
  hasScreenshot: false
};

const $ = sel => document.querySelector(sel);
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const imgEl = new Image();

function setStatus(msg) { $('#status').textContent = msg; }

/* ===== 1. 加载截图(base64) + 节点树 ===== */
async function refresh() {
  const skipShot = !!($('#noScreenshot') && $('#noScreenshot').checked);
  setStatus(skipShot ? t('msg.fetchingTree') : t('msg.fetching'));
  try {
    const snapPromise = fetch('/snapshot').then(r => r.json());
    const shotPromise = skipShot ? Promise.resolve(null)
                                 : fetch('/screenshot').then(r => r.text());
    const [snap, b64] = await Promise.all([snapPromise, shotPromise]);
    state.width = snap.width;
    state.height = snap.height;
    state.nodes = snap.nodes;
    /* 节点列表变更后 hover 状态失效,清掉避免画到旧 path */
    state.hoverPath = null;
    state.hoverCandidates = [];
    state.hoverIndex = 0;
    state.hoverKey = '';

    if (skipShot) {
      state.hasScreenshot = false;
    } else {
      await new Promise((res, rej) => {
        imgEl.onload = res;
        imgEl.onerror = rej;
        imgEl.src = 'data:image/jpeg;base64,' + b64.trim();
      });
      state.hasScreenshot = true;
    }

    const pane = $('#canvasPane');
    const maxW = pane.clientWidth - 32;
    const maxH = pane.clientHeight - 32;
    state.scale = Math.min(1, maxW / state.width, maxH / state.height);
    canvas.width = state.width;
    canvas.height = state.height;
    canvas.style.width = (state.width * state.scale) + 'px';
    canvas.style.height = (state.height * state.scale) + 'px';

    redraw();
    const tag = skipShot ? (' ' + t('msg.fetch.skipped')) : '';
    setStatus(fmt('msg.fetch.ok', { n: state.nodes.length, w: state.width, h: state.height, tag: tag }));
  } catch (e) {
    setStatus(t('msg.fetch.fail') + ' ' + e.message);
  }
}

/* 仅按当前 pane 尺寸重算 canvas 缩放，不重新拉数据 */
function fitCanvas() {
  if (!state.width || !state.height) return;
  const pane = $('#canvasPane');
  const maxW = pane.clientWidth - 32;
  const maxH = pane.clientHeight - 32;
  state.scale = Math.min(1, maxW / state.width, maxH / state.height);
  canvas.style.width  = (state.width  * state.scale) + 'px';
  canvas.style.height = (state.height * state.scale) + 'px';
}
window.fitCanvas = fitCanvas;
window.addEventListener('resize', fitCanvas);

/* ===== 2. 重绘 canvas ===== */
function redraw() {
  if (state.hasScreenshot && imgEl.complete && imgEl.naturalWidth > 0) {
    ctx.drawImage(imgEl, 0, 0);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  ctx.lineWidth = 2;
  for (const n of state.nodes) {
    const isSel   = n.path === state.selectedPath;
    const isHover = !isSel && n.path === state.hoverPath;
    if (isSel) {
      ctx.strokeStyle = '#f59e0b';
      ctx.fillStyle   = 'rgba(245, 158, 11, 0.18)';
    } else if (isHover) {
      ctx.strokeStyle = '#10b981';
      ctx.fillStyle   = 'rgba(16, 185, 129, 0.15)';
    } else {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.35)';
      ctx.fillStyle   = 'transparent';
    }
    ctx.strokeRect(n.left, n.top, n.right - n.left, n.bottom - n.top);
    if (isSel || isHover) ctx.fillRect(n.left, n.top, n.right - n.left, n.bottom - n.top);
  }
}

/* ===== 3. canvas hover ===== */
function getHitsAt(x, y) {
  const hits = state.nodes.filter(n =>
    x >= n.left && x < n.right && y >= n.top && y < n.bottom
  );
  hits.sort((a, b) => {
    const aArea = (a.right - a.left) * (a.bottom - a.top);
    const bArea = (b.right - b.left) * (b.bottom - b.top);
    return aArea - bArea;
  });
  return hits;
}

function setHoverFromCanvas(clientX, clientY) {
  if (state.nodes.length === 0) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.round((clientX - rect.left) / state.scale);
  const y = Math.round((clientY - rect.top)  / state.scale);
  const hits = getHitsAt(x, y);
  const key  = hits.map(h => h.path).join('|');

  if (hits.length === 0) {
    if (state.hoverPath !== null) {
      state.hoverPath = null;
      state.hoverCandidates = [];
      state.hoverIndex = 0;
      state.hoverKey = '';
      redraw();
    }
    hideHoverTooltip();
    return;
  }
  if (key !== state.hoverKey) {
    state.hoverCandidates = hits;
    state.hoverKey   = key;
    state.hoverIndex = 0;
  }
  state.hoverPath = state.hoverCandidates[state.hoverIndex].path;
  redraw();
  updateHoverTooltip(clientX, clientY);
}

const hoverTipEl = $('#hoverTooltip');

function hideHoverTooltip() {
  if (hoverTipEl) hoverTipEl.hidden = true;
}

function updateHoverTooltip(clientX, clientY) {
  if (!hoverTipEl) return;
  const arr = state.hoverCandidates;
  if (arr.length === 0) { hideHoverTooltip(); return; }
  const n = arr[state.hoverIndex];
  const text = n.text || n.desc || '';
  const rows = [
    ['id',    n.viewId    || ''],
    ['class', n.className || ''],
    ['text',  text],
    ['depth', n.depth != null ? String(n.depth) : '']
  ];
  const rowsHtml = rows.map(([k, v]) => {
    const cls = v ? 'v' : 'v empty';
    const shown = v || '—';
    return `<div class="row"><span class="k">${k}</span><span class="${cls}" title="${escapeAttr(shown)}">${escapeHtml(shown)}</span></div>`;
  }).join('');
  const meta = arr.length > 1
    ? `<div class="meta">${fmt('hover.candidate', { i: state.hoverIndex + 1, total: arr.length })}</div>`
    : '';
  hoverTipEl.innerHTML = rowsHtml + meta;
  hoverTipEl.hidden = false;

  /* 定位 */
  const margin = 14;
  const tw = hoverTipEl.offsetWidth;
  const th = hoverTipEl.offsetHeight;
  let left = clientX + margin;
  let top  = clientY - th - margin;
  if (top < 8) top = clientY + margin;
  if (left + tw > window.innerWidth - 8) left = clientX - tw - margin;
  if (left < 8) left = 8;
  hoverTipEl.style.left = left + 'px';
  hoverTipEl.style.top  = top  + 'px';
}

let hoverRafId = 0, pendingHoverEv = null;
canvas.addEventListener('mousemove', (ev) => {
  pendingHoverEv = ev;
  if (hoverRafId) return;
  hoverRafId = requestAnimationFrame(() => {
    hoverRafId = 0;
    const e = pendingHoverEv;
    pendingHoverEv = null;
    if (e) setHoverFromCanvas(e.clientX, e.clientY);
  });
});

canvas.addEventListener('mouseleave', () => {
  hideHoverTooltip();
  if (state.hoverPath === null) return;
  state.hoverPath = null;
  state.hoverCandidates = [];
  state.hoverIndex = 0;
  state.hoverKey = '';
  redraw();
});

canvas.addEventListener('wheel', (ev) => {
  if (state.hoverCandidates.length <= 1) return;
  ev.preventDefault();
  const last = state.hoverCandidates.length - 1;
  if (ev.deltaY > 0) {
    state.hoverIndex = Math.min(state.hoverIndex + 1, last);
  } else {
    state.hoverIndex = Math.max(state.hoverIndex - 1, 0);
  }
  state.hoverPath = state.hoverCandidates[state.hoverIndex].path;
  redraw();
  updateHoverTooltip(ev.clientX, ev.clientY);
}, { passive: false });

/* ===== 4. canvas 点击 → inspect ===== */
canvas.addEventListener('click', async (ev) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.round((ev.clientX - rect.left) / state.scale);
  const y = Math.round((ev.clientY - rect.top) / state.scale);

  const usePath = state.hoverPath != null;
  const body = usePath ? { path: state.hoverPath } : { x, y };
  setStatus(usePath ? `inspect ${state.hoverPath}...` : `inspect (${x}, ${y})...`);

  try {
    const res = await fetch('/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json());
    if (res.error) { setStatus(res.error); return; }
    state.selectedPath = res.props.path;
    state.selectedNode = state.nodes.find(n => n.path === res.props.path);
    renderProps(res.props);
    renderActions(res.recommended, res.allFunctions, res.globals);
    $('#formBody').innerHTML = `<p class="hint">${t('hint.clickAction')}</p>`;
    redraw();
    setStatus(t('msg.selected') + res.props.path);
  } catch (e) {
    setStatus(t('msg.inspect.fail') + ' ' + e.message);
  }
});

/* ===== 4. 渲染节点属性 ===== */
function renderProps(p) {
  const fields = ['path','viewId','className','text','desc','clickable','longClickable',
                  'editable','scrollable','focusable','checkable','checked','enabled'];
  const html = fields.map(k => {
    const v = p[k];
    return `<div class="row"><span class="k">${k}</span><span class="v" data-copy="${escapeAttr(String(v))}">${escapeHtml(String(v))}</span></div>`;
  }).join('');
  const b = p.bounds;
  const extra = `<div class="row"><span class="k">bounds</span><span class="v">[${b.left},${b.top},${b.right},${b.bottom}]</span></div>`;
  $('#propsBody').innerHTML = html + extra;
  $('#propsBody').querySelectorAll('.v[data-copy]').forEach(el => {
    el.addEventListener('click', () => {
      navigator.clipboard.writeText(el.dataset.copy);
      setStatus(t('msg.copied') + ' ' + el.dataset.copy.slice(0, 40));
    });
  });
}

/* ===== 5. 渲染动作列表 ===== */
function renderActions(recommended, allFns, globals) {
  const recHtml = recommended.map(a =>
    `<span class="fnChip recommended" data-fn="${a.name}" data-meta='${escapeAttr(JSON.stringify(a))}'>${a.name}</span>`
  ).join('');
  const globHtml = globals.map(g =>
    `<span class="fnChip global" data-fn="${g.name}" data-meta='${escapeAttr(JSON.stringify(g))}'>${g.name}</span>`
  ).join('');
  $('#actionsBody').innerHTML = recHtml + globHtml;

  const fnHtml = allFns.map(f => {
    const overloadBadge = f.totalOverloads > 1 ? `<span class="overload-badge" title="${f.totalOverloads} ${t('form.overload.prefix')}">${f.totalOverloads}</span>` : '';
    return `<span class="fnChip" data-fn="${f.name}" data-meta='${escapeAttr(JSON.stringify(f))}'>${f.name}${overloadBadge}</span>`;
  }).join('');
  $('#allFnsBody').innerHTML = fnHtml;

  $('#fnFilter').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    $('#allFnsBody').querySelectorAll('.fnChip').forEach(c => {
      c.style.display = c.dataset.fn.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  document.querySelectorAll('.fnChip').forEach(c => {
    c.addEventListener('click', () => {
      const fnName = c.dataset.fn;
      const meta = c.dataset.meta ? JSON.parse(c.dataset.meta) : findFnMeta(fnName, allFns);
      renderForm(fnName, meta);
    });
  });
}

function findFnMeta(name, allFns) {
  const fn = allFns.find(f => f.name === name);
  if (fn) return fn;
  return {
    name,
    overloads: [{ params: [], returnType: 'void' }],
    totalOverloads: 1
  };
}

/* ===== 6. 参数表单 ===== */
function paramDefault(p, node) {
  const tp = p.type;
  const nm = p.name;
  const isNum = ['int','long','float','double'].includes(tp);
  if (!node) {
    if (tp === 'boolean') return 'false';
    if (isNum) return '0';
    return '';
  }
  const cx = (node.centerX != null) ? node.centerX : Math.round((node.left + node.right) / 2);
  const cy = (node.centerY != null) ? node.centerY : Math.round((node.top  + node.bottom) / 2);

  if (tp === 'String') {
    if (nm === 'key') {
      if (node.viewId)    return 'id';
      if (node.text)      return 'text';
      if (node.desc)      return 'text';
      if (node.className) return 'class';
      return 'text';
    }
    if (nm === 'value') {
      return node.viewId || node.text || node.desc || node.className || '';
    }
    if (nm === 'text' || nm === 'searchText') return node.text || node.desc || '';
    if (nm === 'id' || nm === 'viewId')       return node.viewId || '';
    if (nm === 'className' || nm === 'cls')   return node.className || '';
    return '';
  }
  if (isNum) {
    if (['x','cx','startX','fromX','x1','endX','toX','x2'].includes(nm)) return String(cx);
    if (['y','cy','startY','fromY','y1','endY','toY','y2'].includes(nm)) return String(cy);
    if (['index','depth','idx'].includes(nm))                            return '0';
    if (['duration','durationMs','timeout','timeoutMs'].includes(nm))    return '500';
    return '0';
  }
  if (tp === 'boolean') return 'false';
  return '';
}

function renderForm(fnName, meta, selectedOverloadIndex = 0) {
  const node = state.selectedNode;
  const hasNode = !!node;

  const formBody = $('#formBody');
  formBody.innerHTML = '';

  const overloads = meta.overloads || [];
  const currentOverload = overloads[selectedOverloadIndex] || { params: [], returnType: 'void' };

  const sig = document.createElement('div');
  sig.innerHTML = `<b>${fnName}</b> <span class="hint">→ ${currentOverload.returnType || 'void'}</span>`;
  formBody.appendChild(sig);

  if (overloads.length > 1) {
    const lbl = document.createElement('label');
    lbl.textContent = t('form.overload.label');
    formBody.appendChild(lbl);

    const olOpts = overloads.map((ol, i) => {
      const paramsStr = ol.params.map(p => `${p.type} ${p.name}`).join(', ');
      return { value: String(i), label: `${t('form.overload.prefix')} ${i + 1}: ${paramsStr}` };
    });
    const olDd = createDropdown(olOpts, String(selectedOverloadIndex), (val) => {
      renderForm(fnName, meta, parseInt(val));
    });
    olDd.id = 'overloadSelector';
    formBody.appendChild(olDd);
  }

  const needsSelector = hasNode && currentOverload.params.some(p =>
    p.type === 'AccessibilityNodeInfo' || p.type === 'NodeInfo'
  );
  if (needsSelector) {
    const selOpts = [];
    if (node.text)      selOpts.push({k:'text',  v:node.text,      label:`text: ${node.text.slice(0,40)}`});
    if (node.viewId)    selOpts.push({k:'id',    v:node.viewId,    label:`id: ${node.viewId.slice(0,40)}`});
    if (node.desc)      selOpts.push({k:'text',  v:node.desc,      label:`desc: ${node.desc.slice(0,40)}`});
    if (node.className) selOpts.push({k:'class', v:node.className, label:`class: ${node.className.slice(0,40)}`});
    selOpts.push({k:'coord', v:`${Math.round((node.left+node.right)/2)},${Math.round((node.top+node.bottom)/2)}`, label:`coord: ${Math.round((node.left+node.right)/2)},${Math.round((node.top+node.bottom)/2)}`});

    const lbl = document.createElement('label');
    lbl.textContent = t('form.selector.label');
    formBody.appendChild(lbl);

    const ddItems = selOpts.map(o => ({ value: o.k + '|' + o.v, label: o.label }));
    const selDd = createDropdown(ddItems, ddItems[0].value, () => {});
    selDd.id = 'selectorMode';
    selDd._kvList = selOpts;
    formBody.appendChild(selDd);
  }

  const extraParams = (currentOverload.params || []).filter(p => {
    if (['AccessibilityNodeInfo','NodeInfo','ArrayList','List','HashMap','Map','Object'].includes(p.type)) return false;
    if (p.type.endsWith('[]')) return false;
    if (['argsConfigs','root','nodes','nodesMap'].includes(p.name)) return false;
    if (needsSelector && (p.name === 'key' || p.name === 'value')) return false;
    return true;
  });

  extraParams.forEach(p => {
    const def = paramDefault(p, node);
    const lbl = document.createElement('label');
    lbl.textContent = `${p.name} (${p.type})`;
    formBody.appendChild(lbl);

    if (p.type === 'boolean') {
      const boolOpts = [{ value: 'true', label: 'true' }, { value: 'false', label: 'false' }];
      const boolDd = createDropdown(boolOpts, def || 'false', () => {});
      boolDd.dataset.pname = p.name;
      boolDd.dataset.ptype = p.type;
      formBody.appendChild(boolDd);
    } else {
      const inp = document.createElement('input');
      inp.type = (p.type === 'int' || p.type === 'long') ? 'number'
               : (p.type === 'double' || p.type === 'float') ? 'number'
               : 'text';
      if (p.type === 'double' || p.type === 'float') inp.step = '0.01';
      inp.dataset.pname = p.name;
      inp.dataset.ptype = p.type;
      inp.value = def || ((p.type === 'int' || p.type === 'long' || p.type === 'double' || p.type === 'float') ? '0' : '');
      formBody.appendChild(inp);
    }
  });

  const btnRow = document.createElement('div');
  btnRow.className = 'btnRow';
  const btnAdd = document.createElement('button');
  btnAdd.id = 'btnAddStep';
  btnAdd.textContent = t('form.btnAddStep');
  const btnRun = document.createElement('button');
  btnRun.id = 'btnRunStep';
  btnRun.className = 'secondary';
  btnRun.textContent = t('form.btnRunStep');
  btnRow.appendChild(btnAdd);
  btnRow.appendChild(btnRun);
  formBody.appendChild(btnRow);

  btnAdd.onclick = () => addStep(buildCallCode(fnName, meta, selectedOverloadIndex));
  btnRun.onclick = async () => executeCode(buildCallCode(fnName, meta, selectedOverloadIndex));
}

/* ===== 7. 拼接调用代码 ===== */
function buildCallCode(fnName, meta, selectedOverloadIndex = 0) {
  const args = [];
  const overloads = meta.overloads || [];
  const currentOverload = overloads[selectedOverloadIndex] || { params: [] };

  const needsSelector = currentOverload.params.some(p =>
    p.type === 'AccessibilityNodeInfo' || p.type === 'NodeInfo'
  );

  if (needsSelector) {
    const selDd = $('#selectorMode');
    if (selDd && selDd._kvList) {
      const val = selDd.getValue();
      const kv = selDd._kvList.find(o => o.k + '|' + o.v === val);
      if (kv) {
        if (kv.k === 'coord') {
          const [cx, cy] = kv.v.split(',');
          return `tap(${cx}, ${cy});`;
        } else {
          args.push(`"${kv.k}"`, jsonStr(kv.v));
        }
      }
    }
  }

  document.querySelectorAll('#formBody .dropdown[data-pname]').forEach(el => {
    const pt = el.dataset.ptype;
    const raw = el.getValue();
    if (pt === 'boolean') args.push(raw);
    else args.push(jsonStr(raw));
  });
  document.querySelectorAll('#formBody input[data-pname]').forEach(el => {
    const pt = el.dataset.ptype;
    const raw = el.value;
    if (pt === 'String') args.push(jsonStr(raw));
    else args.push(raw || '0');
  });

  return `${fnName}(${args.join(', ')});`;
}

function jsonStr(s) { return JSON.stringify(s == null ? '' : String(s)); }

/* ===== 8. 步骤时间线 ===== */
function addStep(code) {
  state.steps.push({ code });
  renderSteps();
}
function removeStep(i) {
  state.steps.splice(i, 1);
  renderSteps();
}
function renderSteps() {
  const html = state.steps.map((s, i) =>
    `<li><span class="code">${escapeHtml(s.code)}</span>
     <button data-i="${i}" class="del">×</button></li>`
  ).join('');
  $('#stepsList').innerHTML = html;
  $('#stepsList').querySelectorAll('.del').forEach(b => {
    b.addEventListener('click', () => removeStep(parseInt(b.dataset.i)));
  });
  $('#codePreview').value = generateFullCode();
}

function generateFullCode() {
  if (state.steps.length === 0) return '// ' + t('hint.noSteps');
  const lines = ['a11Y.set();', 'waitNodesTimeout = 10000;', ''];
  for (const s of state.steps) lines.push(s.code);
  return lines.join('\n');
}
window.generateFullCode = generateFullCode;

/* ===== 9. 执行代码 ===== */
async function executeCode(code) {
  setStatus(t('msg.executing'));
  const resultEl = $('#execResult');
  resultEl.textContent = '';
  resultEl.className = '';
  try {
    const res = await fetch('/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    }).then(r => r.json());
    if (res.ok) {
      resultEl.className = 'ok';
      resultEl.textContent =
        '✓ result=' + res.result +
        (res.stdout ? '\nstdout: ' + res.stdout : '');
      setStatus(t('msg.exec.done'));
    } else {
      resultEl.className = 'err';
      resultEl.textContent = '✗ ' + res.error + '\n' + (res.trace || '');
      setStatus(t('msg.exec.fail'));
    }
  } catch (e) {
    resultEl.className = 'err';
    resultEl.textContent = '✗ ' + e.message;
    setStatus(t('msg.exec.requestFail') + ' ' + e.message);
  }
  setTimeout(refresh, 500);
}

/* ===== 10. 工具栏 ===== */
$('#btnRefresh').onclick = refresh;
$('#btnRun').onclick = () => {
  const code = $('#codePreview').value || generateFullCode();
  executeCode(code);
};
$('#btnClear').onclick = () => { state.steps = []; renderSteps(); };
$('#btnExport').onclick = () => {
  navigator.clipboard.writeText($('#codePreview').value || generateFullCode());
  setStatus(t('msg.clipboard'));
};

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
}
function escapeAttr(s) {
  return s.replace(/'/g, '&#39;').replace(/"/g, '"');
}

/* ===== checkbox: 跳过截图(localStorage 记忆) ===== */
(function() {
  const el = $('#noScreenshot');
  if (!el) return;
  el.checked = localStorage.getItem('a11y-no-screenshot') === '1';
  el.addEventListener('change', () => {
    localStorage.setItem('a11y-no-screenshot', el.checked ? '1' : '0');
  });
})();

/* ===== 截图水平对齐 左/中/右(localStorage 记忆) ===== */
(function() {
  const pane = $('#canvasPane');
  const btns = document.querySelectorAll('.seg-btn[data-align]');
  if (!pane || btns.length === 0) return;
  const KEY = 'a11y-canvas-align';
  function apply(align) {
    pane.classList.remove('align-left', 'align-center', 'align-right');
    pane.classList.add('align-' + align);
    btns.forEach(b => b.classList.toggle('active', b.dataset.align === align));
    localStorage.setItem(KEY, align);
  }
  btns.forEach(b => b.addEventListener('click', () => apply(b.dataset.align)));
  apply(localStorage.getItem(KEY) || 'center');
})();

refresh();

/* ===== 语言切换时重新渲染动态内容 ===== */
document.addEventListener('langchange', function () {
  renderSteps();
});