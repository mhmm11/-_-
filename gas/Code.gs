/**
 * skin note お問い合わせフォーム用 Google Apps Script
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  とてもかんたん：なにをしているか
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  ホームページの「お問い合わせフォーム」で書いた内容を、
 *  Google の「表（スプレッドシート）」に 1 行ずつメモするためのプログラムです。
 *
 *  流れはこの 3 つだけです。
 *    ① ホームページ → ② このプログラム（GAS） → ③ スプレッドシート
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  はじめてのときにやること（上から順に）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  【ステップ1】表（スプレッドシート）を用意する
 *    Google のスプレッドシートを 1 つ作る（空っぽで OK）。
 *
 *  【ステップ2】表の「住所」をコピーする
 *    スプレッドシートを開いたときの、いちばん上のアドレスばー（URL）を見る。
 *    例：https://docs.google.com/spreadsheets/d/【ここの文字のかたまり】/edit
 *    「d/」と「/edit」のあいだにある長い英数字だけが「表の住所」（SPREADSHEET_ID）。
 *
 *  【ステップ3】このプログラムに「表の住所」を教える
 *    左の ⚙「プロジェクトの設定」→ 下の「スクリプト プロパティ」
 *    ・プロパティ：SPREADSHEET_ID
 *    ・値：ステップ2でコピーした長い英数字
 *    を追加して保存。
 *
 *  （おまけ）どの「シートのタブ」に書くか決めたいとき
 *    表の下にあるタブの名前が「シート1」なら、その名前をそのまま教える。
 *    ・プロパティ：SHEET_TAB_NAME
 *    ・値：シート1（※自分のタブ名と同じ字で）
 *    を追加。書かなくても、プログラムがよしなに探します。
 *
 *  【ステップ4】インターネットに「受け口」をつける（デプロイ）
 *    右上「デプロイ」→「新しいデプロイ」→ 種類「ウェブ アプリ」
 *    ・次のユーザーとして実行：自分
 *    ・アクセスできるユーザー：全員（※ホームページから誰でも送れるようにする）
 *    「デプロイ」を押すと、すごく長い URL（…/exec で終わる）が出る。それをコピー。
 *
 *  【ステップ5】ホームページに URL を貼る
 *    index.html の <form … data-gas-url="https://script.google.com/macros/s/AKfycby_CUf6U_rXrJPhBKS1ACFDlyk8s3ZPc-lxWzc1GtG9JCjVUQPyjLr2NEBa4DCRRlYt/exec"> に、ステップ4の URL を貼る。
 *
 *  【ステップ6】コードを直したあと必ずやること
 *    「デプロイ」→「デプロイを管理」→ 鉛筆マーク「編集」
 *    →「バージョン」を「新バージョン」にして、もう一度デプロイ。
 *    （古いままだと、直したのに動きが変わりません）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  うまく表に書かれないとき（ここだけ見る）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  ① テストボタン（手動テスト）
 *    この画面の上のほう「関数を選択」で testWriteRowToSpreadsheet を選び、「実行」▶。
 *    ・表に「【テスト】」の行が増えた → 表の住所と権限は OK。次は ② へ。
 *    ・エラーが出た → 表の住所（SPREADSHEET_ID）か、Google の許可が足りません。
 *
 *  ② 本当にフォームから届いているか
 *    左の時計マーク「実行数」→ doPost を開く。
 *    ・何もない → ホームページの data-gas-url が違うか、「全員」デプロイになっていないかも。
 *
 *  ③ 表の「下のタブ」をちゃんと見る
 *    ファイル名ではなく、下のタブ名（シート1 など）に行が増えます。
 *    タブがたくさんあるときは、いちばん右の「お問い合わせ」タブも確認。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

var SHEET_NAME = "お問い合わせ";

var HEADER_ROW = [
  "タイムスタンプ",
  "お名前",
  "メールアドレス",
  "お問い合わせ内容",
  "送信元URL",
];

/** 動作確認用 */
function doGet() {
  return ContentService.createTextOutput(
    "skin note contact endpoint OK (GET)"
  ).setMimeType(ContentService.MimeType.TEXT);
}

/**
 * フォーム POST を受け取りスプレッドシートに 1 行追加
 * iframe 埋め込みのため HtmlService + ALLOWALL で返す
 */
function doPost(e) {
  e = e || {};
  var p;
  var pageTitle = "送信完了";
  var pageBody =
    "<p>フォームを受け付けました。このタブは閉じて構いません。</p>";
  var isError = false;

  try {
    p = normalizePostParams_(e);

    try {
      console.log(
        "doPost keys: " +
          JSON.stringify(Object.keys(p)) +
          " postData.type=" +
          (e.postData ? e.postData.type : "(none)")
      );
      if (e.postData && e.postData.contents) {
        var snip = e.postData.contents.substring(0, 120);
        console.log("postData snippet: " + snip);
      }
    } catch (logErr) {}

    if (Object.keys(p).length === 0) {
      isError = true;
      pageTitle = "エラー";
      pageBody =
        "<p>送信データを受け取れませんでした（postData / parameter が空）。フォームの method と Web アプリ URL を確認してください。</p>";
    } else {
      var company = (p.company || "").toString().trim();
      if (company) {
        return htmlOut_(pageTitle, pageBody, false);
      }

      var name = (p.name || "").toString().trim();
      var email = (p.email || "").toString().trim();
      var message = (p.message || "").toString().trim();
      var sourceUrl = (p.sourceUrl || "").toString().trim();

      if (!name || !email || !message) {
        isError = true;
        pageTitle = "入力エラー";
        pageBody =
          "<p>必須項目（お名前・メール・お問い合わせ内容）が不足しています。ブラウザに戻り、もう一度お試しください。</p><p>GAS の実行ログに post のキー一覧が出ていますので、name / email / message が届いているか確認してください。</p>";
      } else if (!isValidEmail_(email)) {
        isError = true;
        pageTitle = "入力エラー";
        pageBody = "<p>メールアドレスの形式が正しくありません。</p>";
      } else {
        var sheet = getOrCreateSheet_();
        sheet.appendRow([new Date(), name, email, message, sourceUrl]);
        SpreadsheetApp.flush();
      }
    }
  } catch (err) {
    isError = true;
    pageTitle = "サーバーエラー";
    pageBody =
      "<p>" +
      String(err) +
      "</p><p>SPREADSHEET_ID・シート権限・実行ユーザー（デプロイの「次のユーザーとして実行：自分」）を確認してください。</p>";
  }

  return htmlOut_(pageTitle, pageBody, isError);
}

/**
 * e.parameter / e.parameters / e.postData.contents をまとめて 1 つの連想配列にする
 * （環境により parameter が空で postData にしか来ないことがある）
 */
function normalizePostParams_(e) {
  var p = {};

  if (e.parameter) {
    for (var k in e.parameter) {
      if (Object.prototype.hasOwnProperty.call(e.parameter, k)) {
        p[k] = e.parameter[k];
      }
    }
  }

  if (e.parameters) {
    for (var k2 in e.parameters) {
      if (
        Object.prototype.hasOwnProperty.call(e.parameters, k2) &&
        e.parameters[k2].length
      ) {
        p[k2] = e.parameters[k2][0];
      }
    }
  }

  if (e.postData && e.postData.contents) {
    var ct = (e.postData.type || "").toLowerCase();
    if (
      ct.indexOf("application/x-www-form-urlencoded") !== -1 ||
      ct === "" ||
      ct.indexOf("multipart") === -1
    ) {
      var raw = e.postData.contents;
      if (raw && raw.indexOf("=") !== -1) {
        var pairs = raw.split("&");
        for (var i = 0; i < pairs.length; i++) {
          var pair = pairs[i];
          if (!pair) continue;
          var eq = pair.indexOf("=");
          var key =
            eq === -1
              ? decodeURIComponent(pair.replace(/\+/g, " "))
              : decodeURIComponent(
                  pair.substring(0, eq).replace(/\+/g, " ")
                );
          var val =
            eq === -1
              ? ""
              : decodeURIComponent(
                  pair.substring(eq + 1).replace(/\+/g, " ")
                );
          if (p[key] === undefined || p[key] === "") {
            p[key] = val;
          }
        }
      }
    }
  }

  return p;
}

function htmlOut_(title, bodyHtml, isError) {
  var color = isError ? "#8f4f5a" : "#2c2624";
  var okJs = isError ? "false" : "true";
  var pm =
    "<script>setTimeout(function(){try{parent.postMessage({type:'skin-note-contact',ok:" +
    okJs +
    "},'*');}catch(e){}},0);<\/script>";
  var html =
    "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>" +
    title +
    "</title></head><body style='font-family:sans-serif;padding:1.25rem;color:" +
    color +
    ";'>" +
    "<h1 style='font-size:1.1rem'>" +
    title +
    "</h1>" +
    bodyHtml +
    pm +
    "</body></html>";
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL
  );
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getOrCreateSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SPREADSHEET_ID");
  if (!id) {
    throw new Error("スクリプトプロパティ SPREADSHEET_ID が未設定です");
  }
  var ss = SpreadsheetApp.openById(id);
  var sheet;

  var customTab = (props.getProperty("SHEET_TAB_NAME") || "").toString().trim();
  if (customTab) {
    sheet = ss.getSheetByName(customTab);
    if (!sheet) {
      sheet = ss.insertSheet(customTab);
    }
    ensureHeaderRow_(sheet);
    return sheet;
  }

  sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet =
      ss.getSheetByName("シート1") ||
      ss.getSheetByName("Sheet1") ||
      (ss.getSheets().length ? ss.getSheets()[0] : null);
  }
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  ensureHeaderRow_(sheet);
  return sheet;
}

function ensureHeaderRow_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER_ROW);
  }
}

/**
 * エディタから「実行」してテスト（権限・ID・シート名の確認）
 * 1 行付けば doPost 側の openById / append も通る見込みが高い
 */
function testWriteRowToSpreadsheet() {
  var sheet = getOrCreateSheet_();
  sheet.appendRow([
    new Date(),
    "【テスト】GAS 手動実行",
    "test@example.com",
    "エディタからのテスト行です。表示されたら SPREADSHEET_ID とシートは問題ありません。",
    "",
  ]);
  SpreadsheetApp.flush();
  return "OK: 最終行番号=" + sheet.getLastRow();
}
