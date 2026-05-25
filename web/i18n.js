/**
 * i18n.js — A11y Studio 语言切换模块
 * 提供 t() 翻译函数、setLang() 切换逻辑，以及语言选择器初始化
 */
(function () {
  'use strict';

  /* ===== 翻译字典 ===== */
  const I18N = {
    zh: {
      /* 状态栏 */
      'status.ready':              '就绪 · 等待首次拉取',

      /* 工具栏按钮 */
      'btn.refresh':               '刷新截图',
      'btn.refresh.title':         '重新拉取截图和节点树',
      'btn.skip':                  '跳过截图',
      'btn.skip.title':            '勾选后刷新时仅拉节点树,不重新加载截图(适合截图传输慢或不需要画面的场景)',
      'btn.align.left':            '左',
      'btn.align.center':          '中',
      'btn.align.right':           '右',
      'btn.run':                   '运行脚本',
      'btn.run.title':             '运行下方代码编辑器中的内容',
      'btn.clear':                 '清空步骤',
      'btn.clear.title':           '清空步骤时间线',
      'btn.export':                '复制代码',
      'btn.export.title':          '复制当前代码到剪贴板',
      'btn.codeReset.title':       '按时间线重新生成代码，覆盖编辑内容',

      /* Aria / group labels */
      'toolbar.aria':              '主操作',
      'seg.aria':                  '截图水平对齐',
      'seg.title':                 '截图在画布区内的水平对齐位置(inspector 拖宽时尤其有用)',
      'align.left.aria':           '截图靠左',
      'align.center.aria':         '截图居中',
      'align.right.aria':          '截图靠右',
      'canvas.aria':               '截图画布',

      /* 面板标题 */
      'panel.props':               '节点属性',
      'panel.props.hint':          '在左侧截图上点击一个节点',
      'panel.actions':             '可用动作',
      'panel.actions.recommended': '推荐',
      'panel.actions.all':         '全部函数',
      'panel.form':                '参数',
      'panel.form.hint':           '先选一个动作',
      'panel.steps':               '步骤时间线',
      'panel.code':                '代码编辑器',
      'panel.code.badge':          '可编辑',
      'panel.code.reset':          '重新生成',
      'panel.exec':                '执行结果',

      /* 按钮 title / aria */
      'btn.props.collapse':        '折叠/展开',
      'btn.props.collapse.aria':   '折叠/展开节点属性',
      'btn.props.close':           '关闭',
      'btn.props.close.aria':      '关闭节点属性面板',
      'btn.props.reopen':          '重新打开节点属性面板',

      /* Inspector */
      'inspector.aria':            '节点检查器',
      'inspector.resizer.aria':    '拖动调整 inspector 宽度，双击重置',
      'inspector.resizer.title':   '拖动调整宽度 · 双击重置',

      /* 输入框 */
      'fnFilter.placeholder':      '搜索 click / setText / scrollTo ...',
      'fnFilter.aria':             '搜索函数',
      'codeEditor.aria':           '可编辑的脚本代码',
      'codeEditor.placeholder':    '// 还没有步骤\n// 在左侧选中节点 → 选择动作 → 添加到时间线\n// 或直接在此输入 BeanShell Java 代码后点击「运行脚本」',

      /* 动态消息 */
      'msg.fetching':              '正在拉取...',
      'msg.fetchingTree':          '正在拉取节点树...',
      'msg.fetch.skipped':         '· 已跳过截图',
      'msg.fetch.ok':              '节点 {n} 个 | {w}×{h}{tag}',
      'msg.fetch.fail':            '拉取失败:',
      'msg.copied':                '已复制:',
      'msg.executing':             '执行中...',
      'msg.exec.done':             '执行完成',
      'msg.exec.fail':             '执行失败',
      'msg.exec.requestFail':      '请求失败:',
      'msg.clipboard':             '代码已复制到剪贴板',
      'msg.inspect.fail':          'inspect 失败:',
      'msg.selected':              '已选中 path=',

      /* 提示文本 */
      'hint.clickAction':          '点击上方任意函数',
      'hint.noSteps':              '还没有步骤',

      /* 表单 */
      'form.overload.label':       '选择重载版本',
      'form.overload.prefix':      '重载',
      'form.selector.label':       '定位方式',
      'form.btnAddStep':           '添加到时间线',
      'form.btnRunStep':           '单独执行',

      /* hover tooltip */
      'hover.candidate':           '候选 {i}/{total} · 滚轮切层',

      /* CSS 伪元素 */
      'css.stepsEmpty':            '尚未添加任何步骤 — 在上方选择动作并点击「添加到时间线」',
      'css.execEmpty':             '未执行'
    },

    en: {
      /* status */
      'status.ready':              'Ready · Waiting for first pull',

      /* toolbar buttons */
      'btn.refresh':               'Refresh',
      'btn.refresh.title':         'Re-fetch screenshot and node tree',
      'btn.skip':                  'Skip Screenshot',
      'btn.skip.title':            'When checked, refresh only pulls node tree without screenshot (useful for slow transfer or when visuals aren’t needed)',
      'btn.align.left':            'L',
      'btn.align.center':          'C',
      'btn.align.right':           'R',
      'btn.run':                   'Run Script',
      'btn.run.title':             'Run the code in the editor below',
      'btn.clear':                 'Clear Steps',
      'btn.clear.title':           'Clear the step timeline',
      'btn.export':                'Copy Code',
      'btn.export.title':          'Copy current code to clipboard',
      'btn.codeReset.title':       'Regenerate code from timeline, overwriting edits',

      /* Aria / group labels */
      'toolbar.aria':              'Main actions',
      'seg.aria':                  'Screenshot horizontal alignment',
      'seg.title':                 'Horizontal alignment of screenshot in canvas (useful when resizing inspector)',
      'align.left.aria':           'Screenshot align left',
      'align.center.aria':         'Screenshot align center',
      'align.right.aria':          'Screenshot align right',
      'canvas.aria':               'Screenshot canvas',

      /* panel headers */
      'panel.props':               'Node Props',
      'panel.props.hint':          'Click a node on the screenshot',
      'panel.actions':             'Actions',
      'panel.actions.recommended': 'Recommended',
      'panel.actions.all':         'All Functions',
      'panel.form':                'Parameters',
      'panel.form.hint':           'Select an action first',
      'panel.steps':               'Step Timeline',
      'panel.code':                'Code Editor',
      'panel.code.badge':          'Editable',
      'panel.code.reset':          'Regenerate',
      'panel.exec':                'Result',

      /* button title / aria */
      'btn.props.collapse':        'Collapse/Expand',
      'btn.props.collapse.aria':   'Collapse/Expand node properties',
      'btn.props.close':           'Close',
      'btn.props.close.aria':      'Close node properties panel',
      'btn.props.reopen':          'Reopen node properties panel',

      /* inspector */
      'inspector.aria':            'Node inspector',
      'inspector.resizer.aria':    'Drag to resize inspector, double-click to reset',
      'inspector.resizer.title':   'Drag to resize · double-click to reset',

      /* inputs */
      'fnFilter.placeholder':      'Search click / setText / scrollTo ...',
      'fnFilter.aria':             'Search functions',
      'codeEditor.aria':           'Editable script code',
      'codeEditor.placeholder':    '// No steps yet\n// Click a node on the left → choose an action → add to timeline\n// Or type BeanShell Java code directly and click 「Run Script」',

      /* dynamic messages */
      'msg.fetching':              'Fetching...',
      'msg.fetchingTree':          'Fetching node tree...',
      'msg.fetch.skipped':         '· screenshot skipped',
      'msg.fetch.ok':              'Nodes: {n} | {w}×{h}{tag}',
      'msg.fetch.fail':            'Fetch failed:',
      'msg.copied':                'Copied:',
      'msg.executing':             'Running...',
      'msg.exec.done':             'Done',
      'msg.exec.fail':             'Failed',
      'msg.exec.requestFail':      'Request failed:',
      'msg.clipboard':             'Code copied to clipboard',
      'msg.inspect.fail':          'inspect failed:',
      'msg.selected':              'Selected path=',

      /* hints */
      'hint.clickAction':          'Click any function above',
      'hint.noSteps':              'No steps yet',

      /* form */
      'form.overload.label':       'Select overload',
      'form.overload.prefix':      'Overload',
      'form.selector.label':       'Locator',
      'form.btnAddStep':           'Add to Timeline',
      'form.btnRunStep':           'Run Only',

      /* hover tooltip */
      'hover.candidate':           'Candidate {i}/{total} · scroll to change layer',

      /* CSS pseudo-elements */
      'css.stepsEmpty':            'No steps yet — select an action above and click “Add to Timeline”',
      'css.execEmpty':             'Not executed'
    }
  };

  /* ===== 核心 API ===== */
  window.I18N_CURRENT = 'zh';

  window.t = function (key) {
    var dict = I18N[window.I18N_CURRENT];
    return (dict && dict[key]) || key;
  };

  /**
   * 格式化翻译字符串，支持 {0}, {1}, ... 或 {name} 占位符
   * 例: fmt('msg.fetch.ok', { n: 5, w: 1080, h: 1920, tag: '' })
   */
  window.fmt = function (key, vars) {
    var s = t(key);
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(vars[k]);
      });
    }
    return s;
  };

  window.setLang = function (lang) {
    if (!I18N[lang]) return;
    window.I18N_CURRENT = lang;

    /* 更新 DOM: textContent */
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      var val = t(k);
      if (el.tagName === 'TEXTAREA' && el.id === 'codePreview') {
        el.placeholder = val;
      } else {
        el.textContent = val;
      }
    });

    /* 更新 DOM: title */
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = t(el.getAttribute('data-i18n-title'));
    });

    /* 更新 DOM: aria-label */
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });

    /* 更新 DOM: placeholder */
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    /* CSS 伪元素变量 */
    document.documentElement.style.setProperty('--i18n-steps-empty', JSON.stringify(t('css.stepsEmpty')));
    document.documentElement.style.setProperty('--i18n-exec-empty', JSON.stringify(t('css.execEmpty')));

    /* html lang 属性 */
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

    /* 持久化 */
    localStorage.setItem('a11y-lang', lang);

    /* 更新选择器 */
    var sel = document.getElementById('langSelect');
    if (sel) sel.value = lang;

    /* 通知 app.js 等模块重新渲染动态内容 */
    document.dispatchEvent(new Event('langchange'));
  };

  /* ===== 初始化 ===== */
  var saved = localStorage.getItem('a11y-lang') || 'zh';
  window.I18N_CURRENT = saved;

  /* DOM 就绪后应用翻译并插入语言选择器 */
  function initI18n() {
    /* 插入语言选择器到 header */
    var toolbar = document.querySelector('.toolbar');
    if (toolbar && !document.getElementById('langSelect')) {
      var wrapper = document.createElement('div');
      wrapper.className = 'lang-switcher';
      wrapper.innerHTML =
        '<select id="langSelect" aria-label="Language">' +
          '<option value="zh">中文</option>' +
          '<option value="en">English</option>' +
        '</select>';
      toolbar.parentNode.appendChild(wrapper);
    }

    /* 应用翻译到静态 DOM */
    setLang(saved);

    /* 监听用户切换 */
    var sel = document.getElementById('langSelect');
    if (sel) {
      sel.value = saved;
      sel.addEventListener('change', function () {
        setLang(this.value);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
})();
