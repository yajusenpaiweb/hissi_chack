// ---- 設定 ----
var API_URL = DEFAULT_API_URL;

(function init() {
  var params = new URLSearchParams(location.search);
  if (params.get('id')) {
    document.getElementById('q-id').value = params.get('id');
    if (params.get('date')) document.getElementById('q-date').value = params.get('date');
    if (params.get('board')) document.getElementById('q-board').value = params.get('board');
    if (API_URL) doSearch();
  }
})();

// ---- タブ切り替え ----
function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(function(el) { el.style.display = 'none'; });
  document.querySelectorAll('.tabs button').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('tab-' + name).style.display = '';
  btn.classList.add('active');
}

// ---- API呼び出し ----
function callApi(params) {
  if (!API_URL) {
    alert('先にAPI設定でGASのURLを入力してください');
    return Promise.reject('no url');
  }
  var qs = Object.keys(params).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');

  return fetch(API_URL + '?' + qs, { redirect: 'follow' })
    .then(function(res) { return res.json(); });
}

function callApiPost(body) {
  if (!API_URL) {
    alert('先にAPI設定でGASのURLを入力してください');
    return Promise.reject('no url');
  }
  return fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body)
  }).then(function(res) { return res.json(); });
}

// ---- エスケープ ----
function esc(s) {
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

// ---- ID検索 ----
function doSearch() {
  var userId = document.getElementById('q-id').value.trim();
  if (!userId) { alert('IDを入力してください'); return; }

  var box = document.getElementById('search-result');
  box.innerHTML = '<div class="loading">検索中</div>';

  var params = { action: 'search', id: userId };
  var d = document.getElementById('q-date').value.trim();
  var b = document.getElementById('q-board').value.trim();
  if (d) params.date = d;
  if (b) params.board = b;

  callApi(params).then(function(data) {
    if (data.error) {
      box.innerHTML = '<div class="empty">エラー: ' + esc(data.error) + '</div>';
      return;
    }
    renderSearchResult(box, data);
  }).catch(function(err) {
    box.innerHTML = '<div class="empty">通信エラー: ' + esc(String(err)) + '</div>';
  });
}

function renderSearchResult(box, data) {
  if (data.total_posts === 0) {
    box.innerHTML = '<div class="empty">該当するIDの書き込みは見つかりませんでした</div>';
    return;
  }

  var html = '';
  html += '<div class="status">';
  html += 'ID:<b>' + esc(data.user_id) + '</b> の書き込み ';
  html += '<span class="count">' + data.total_posts + '件</span>';
  html += ' (' + data.thread_count + 'スレッド)';
  html += '</div>';

  var threads = data.threads || [];
  for (var i = 0; i < threads.length; i++) {
    var th = threads[i];
    html += '<div class="thread-block">';
    html += '<div class="thread-head">';
    if (th.board) html += '<span class="board-tag">' + esc(th.board) + '</span>';
    html += esc(th.thread_title || th.thread_id || '(不明)');
    html += ' (' + th.posts.length + '件)';
    html += '</div>';
    for (var j = 0; j < th.posts.length; j++) {
      var p = th.posts[j];
      html += '<div class="post">';
      html += '<div class="post-meta">';
      html += '<span class="post-no">' + p.post_no + '</span>';
      html += esc(p.user_name) + ' ';
      html += esc(p.timestamp) + ' ';
      html += '<span class="uid">ID:' + esc(p.user_id) + '</span>';
      html += '</div>';
      html += '<div class="post-body">' + esc(p.body) + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  box.innerHTML = html;
}

// ---- ランキング ----
function doRanking() {
  var box = document.getElementById('ranking-result');
  box.innerHTML = '<div class="loading">取得中</div>';

  var params = { action: 'ranking' };
  var d = document.getElementById('r-date').value.trim();
  var b = document.getElementById('r-board').value.trim();
  if (d) params.date = d;
  if (b) params.board = b;

  callApi(params).then(function(data) {
    if (data.error) {
      box.innerHTML = '<div class="empty">エラー: ' + esc(data.error) + '</div>';
      return;
    }
    renderRanking(box, data);
  }).catch(function(err) {
    box.innerHTML = '<div class="empty">通信エラー: ' + esc(String(err)) + '</div>';
  });
}

function renderRanking(box, data) {
  var list = data.ranking || [];
  if (list.length === 0) {
    box.innerHTML = '<div class="empty">データがありません</div>';
    return;
  }

  var html = '<div class="status">書き込み数ランキング';
  if (data.date) html += ' [' + esc(data.date) + ']';
  if (data.board) html += ' [' + esc(data.board) + ']';
  html += '</div>';
  html += '<table class="rank-table"><thead><tr><th>#</th><th>ID</th><th>件数</th></tr></thead><tbody>';

  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    html += '<tr>';
    html += '<td class="r-num">' + (i + 1) + '</td>';
    html += '<td class="r-id" onclick="jumpToId(\'' + esc(r.user_id) + '\')">' + esc(r.user_id) + '</td>';
    html += '<td class="r-count">' + r.count + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table>';
  box.innerHTML = html;
}

function jumpToId(uid) {
  document.getElementById('q-id').value = uid;
  var d = document.getElementById('r-date').value.trim();
  if (d) document.getElementById('q-date').value = d;
  switchTab('search', document.querySelector('.tabs button'));
  doSearch();
}

// ---- ログインポート ----
function doImport() {
  var raw = document.getElementById('imp-raw').value;
  if (!raw.trim()) { alert('ログデータを入力してください'); return; }

  var msgEl = document.getElementById('import-msg');
  msgEl.innerHTML = '<div class="import-msg ok">送信中...</div>';

  var payload = {
    action: 'import',
    raw: raw,
    board: document.getElementById('imp-board').value.trim(),
    thread_id: document.getElementById('imp-tid').value.trim(),
    thread_title: document.getElementById('imp-title').value.trim()
  };

  callApiPost(payload).then(function(data) {
    if (data.error) {
      msgEl.innerHTML = '<div class="import-msg ng">エラー: ' + esc(data.error) + '</div>';
      return;
    }
    msgEl.innerHTML = '<div class="import-msg ok">✓ ' + data.imported + '件のレスをインポートしました</div>';
  }).catch(function(err) {
    msgEl.innerHTML = '<div class="import-msg ng">通信エラー: ' + esc(String(err)) + '</div>';
  });
}

// Enterキーで検索
document.getElementById('q-id').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doSearch();
});
