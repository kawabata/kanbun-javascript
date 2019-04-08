/** @fileoverview
 * 漢文訓読 JavaScript -- 
 * 注記を施した漢文を、漢文または書き下し文のHTMLに変換する。
 *
 * @author Teruyuki Kobayashi
 * @author KAWABATA, Taichi
 * @version 0.2
 */

/*
 漢文注記記法：
   漢文       := 漢文単位+
   漢文単位   := 漢字単位 読み仮名? 送り仮名* 再読仮名? 再読送り* 竪点? 訓点?
   漢字単位   := 漢字 異体字選択? | 句読点
   漢字       := "[㐀-\9fff]|[豈-\faff]|[\ud840-\ud87f][\udc00-\udfff]"
   句読点     := "[。、]"
   異体字選択 := "\udb40[\udd00-\uddef]" （異体字選択子：U+E0100...U+E01EF）
   読み仮名   := 表示読み | 非表示読み
   表示読み   := "《" 仮名漢字* "》"
        ※ 表示読みは、漢文・書き下し文の両方で漢字の脇に読みを表示する。
   仮名漢字   := 仮名 | 漢字
   仮名       := [ぁ-ヿ]
   非表示読み := "〈" 仮名漢字* "〉"
        ※ 非表示読みは、漢文では読みを表示せず、書き下し文では読みのみ表示する。
        ※ 置き字は非表示読みを空の〈〉として表現する。
   送り仮名   := 仮名+ | "［＃（" 仮名漢字+ "）］"
        ※ 万葉仮名がある場合は、後者を使用する。
   再読仮名   := 表示読み | 非表示読み
   再読送り   := 仮名+ | "［＃（" 仮名漢字+ "）］"
        ※ 万葉仮名がある場合は、後者を使用する。
   竪点       := "‐" ※ （仮定）竪点は２つ連続しない。
   訓点       := "［＃" 訓点文字 "］"
   訓点文字   := 順序点 | "[一上天甲]?レ"
   順序点     := [一二三四上中下天地人甲乙丙丁]
*/

function kanbun_regex_setup() {
    const kanji      = "[㐀-\u9fff]|[豈-\ufaff]|[\ud840-\ud87f][\udc00-\udfff]";
    const vselector  = "\udb40[\udd00-\uddef]";
    const kutouten   = "[。、]";
    const kanji_unit = "(?:" + kanji+"(?:"+vselector+")?|"+kutouten+")";
    const kana       = "[ぁ-ヿ]";
    const kana_kanji = kana+"|(?:"+kanji_unit+")";
    const hyouji     = "《(?:"+ kana_kanji + ")*》";
    const hihyouji   = "〈(?:"+ kana_kanji + ")*〉";
    const yomi       = "(?:" + hyouji +")|(?:" + hihyouji +")";
    const okuri      = kana + "+|［＃（(?:" + kana_kanji + ")+）］";
    const saidoku    = "(?:" + hyouji +")|(?:" + hihyouji +")";
    const saiokuri      = kana + "+|［＃（(?:" + kana_kanji + ")+）］";
    const tateten    = "‐";
    const junjo      = "[一二三四上中下天地人甲乙丙丁]";
    const kunten     = "［＃(?:"+junjo+"|[一上天甲]?レ)］";

    const kanbun  = "(" +kanji_unit +")(" + yomi + ")?(" + okuri + ")?(" + saidoku +
        ")?(" + saiokuri + ")?(" + tateten +")?(" + kunten + ")?";
    return new RegExp (kanbun);
}

// ＊＊＊＊＊＊＊＊ 基本機能 ＊＊＊＊＊＊＊＊

/**
 * 配列からの要素の削除
 * @private
 */
Array.prototype.remove = function() {
    let what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

/**
 * 配列の複製（配列要素の複製はしない）
 * @private
 */
Array.prototype.clone = function(){
    return Array.apply(null,this);
};


// ＊＊＊＊＊＊＊＊ 漢文の分割と関連ツール ＊＊＊＊＊＊＊＊

/**
 * 漢文を漢字単位に分割する。
 * @private
 * @param {string} text 元データ
 * @returns matchの配列
 * @type {Array} 
 */
function kanbun_split(text) {
    let result = [];
    const kanbun_regex = kanbun_regex_setup();
    while (text.length > 0) {
        const match = text.match(kanbun_regex);
        if (match == null) {
            console.log(text);
            alert("Parse Error! see console log.");
            return -1;
        }
        if (match["index"]!=0) {
            console.log(match);
            alert("Parse Error! see console log.");
            return -1;
        }
        text = text.substring(match[0].length);
        result = result.concat([match]);
    }
    return result;
}

/**
 * match の漢字・読みの部分をHTMLにする。
 * @private
 * @param {Array} match
 * @param {boolean} yomi_p 漢字に読みを表示する。
 * @param {boolean} kanbun_p 漢文ならtrue, 書き下し文ならfalse。
 *   trueなら、〈…〉は、漢字のみを表示し、falseなら仮名のみを表示する。
 * @param {boolean} saidoku_p 再読文字をHTML5 左ルビ仕様で表示する。
 * @returns {string} 読み付き漢字。rubyがfalseか読みがない場合は漢字のみ。
 *       〈…〉は kanbun がtrueなら漢字のみ。falseなら読みのみ。
 *       《…》なら<ruby>タグで返す。
 */
// TODO 再読文字の左ルビは未対応。
function kanbun_match_yomi(match,yomi_p,kanbun_p) {
    const kanji = match[1];
    const yomi = match[2];
    const saidoku = match[4];
    // 特殊ケース
    if (yomi != undefined && yomi.match(/^〈/)) {
        if (kanbun_p) {
            return kanji;
        } else {
            return yomi.slice(1,-1);
        }
    } else if (!yomi_p) return kanji;
    // ruby 
    if (yomi == undefined && saidoku == undefined) {return kanji;}
    const result="<ruby>"+kanji+
            ((yomi == undefined)?
             "<rt></rt>":"<rp>（</rp><rt>"+yomi.slice(1,-1)+"</rt><rp>）</rp>")+
            // 書き下しでは再読文字にルビは入れない。
            ((kanbun_p == false || saidoku == undefined)?
             "":"<rp>［</rp><rt>"+saidoku.slice(1,-1)+"</rt><rp>］</rp>")+
            "</ruby>";
    return result;
}

const kanbun_unicode = {"‐":"㆐","レ":"㆑","一":"㆒","二":"㆓",
                      "三":"㆔","四":"㆕","上":"㆖","中":"㆗",
                      "下":"㆘","甲":"㆙","乙":"㆚","丙":"㆛",
                      "丁":"㆜","天":"㆝","地":"㆞","人":"㆟"};

/**
 * match の送り仮名部分を返す。
 * （送り仮名がない場合は空文字を返す。）
 * @private
 * @param {Array} match
 * @returns {string} 送り仮名部分
 */
function kanbun_match_okuri (match) {
    const okuri = (match[3] != undefined)? match[3] : "";
    return (okuri.match(/^［＃（/)) ? okuri.slice(3,-2):okuri;
}

/**
 * match の送り・訓点部分をHTMLにする。（漢文訓読）
 * @private
 * @param {Array} match
 * @param {boolean} unicode_p 訓点をUniocodeで表示する
 * @param {boolean} okuri_p 送り仮名を表示する
 * @param {boolean} ten_p 訓点を表示する
 * @returns {string} 訓点HTML。
 */
function kanbun_match_okuri_ten(match,unicode_p,okuri_p,ten_p) {
    // 送り文字
    let okuri = (okuri_p == false) ? "" : kanbun_match_okuri(match);
    let tate = ((ten_p == false) || (match[6] == undefined))? "" : match[6];
    let ten = ((ten_p == false) || (match[7] == undefined))? "" : match[7].slice(2,-1);

    if (okuri == "" && ten != "") okuri = "　";
    if (okuri != "" && ten == "") ten = "　";
    if (okuri != "" && ten != "") {
        return "<table cellspacing='0' cellpadding='0' style='vertical-align: middle; display: inline-block; font-size: 50%;'><tr><td>"
            + okuri + "</td></tr><tr><td>" + ten + "</td></tr></table>";
        // TODO tate shori.
    } else 
        return "";
}

// ＊＊＊＊＊＊＊＊ 漢文 ＊＊＊＊＊＊＊＊

/**
 * 文字列中のカタカナを平仮名にする。
 * @private
 * @param {string} text 元文字列
 * @returns 変換文字列
 * @type string
 */
function kanbun_katakana_to_hiragana (text) {
    const result = text.replace(/[ァ-ヶ]/g, whole=>{
        const hiragana = whole.charCodeAt(0)-96;
        return String.fromCharCode(hiragana);
    });
    return result;
}

/**
 * 句読点の前の<wbr>を除去する。
 * @private
 * @param {string} html 元HTML
 * @returns 変換HTML
 * @type string
 */
function kanbun_remove_kutou_break(html) {
    const result = html.replace(/<\/nobr><wbr\/><nobr>([。、])/g,"$1");
    return result;
}

/**
 * 漢文をHTMLに変換する。
 * @param {string} text 元データ
 * @param {boolean} yomi 読み表示
 * @param {boolean} okuri 送り仮名表示
 * @param {boolean} ten 漢文順序点表示
 * @param {boolean} kutou 句読点表示
 * @param {boolean} unicode 漢文順序にユニコードを使用
 * @returns HTMLデータ
 * @type string
 */
function kanbun_to_kanbun (text, yomi, okuri, ten, kutou, unicode) {
    const split = kanbun_split(text);
    let result = "";
    split.forEach(match=>{
        if (!(!kutou && match[1].match(/[。、]/))) {
            const kanji_part = kanbun_match_yomi(match,yomi,true);
            const okuri_ten_part = kanbun_match_okuri_ten(match,unicode,okuri,ten);
            result+="<nobr>"+ kanji_part + okuri_ten_part +"</nobr><wbr/>";
        }
    });
    return kanbun_remove_kutou_break(result);
}

// ＊＊＊＊＊＊＊＊ 書き下し文 ＊＊＊＊＊＊＊＊

/**
 * 漢文の順序を書き下し文の順序の分割した配列に変換する。
 * @private
 * @param {string} text 入力
 * @param {boolean} unicode 訓点文字
 * @returns {array} 順序を入れ替えた配列
 */
function kanbun_reorder(text){
    let kunten_flag = "", reten_flag = false, tate_flag = false;
    let split_text = kanbun_split(text);
    let kanbun_two = null, kanbun_three = null, kanbun_four = null;
    let kanbun_middle = null, kanbun_down = null;
    let kanbun_otsu = null, kanbun_hei = null, kanbun_tei = null;
    let kanbun_chi = null, kanbun_jin = null;
    let stock = new Array();
    let result = new Array();

    split_text.forEach(match=>{
        const tateten = (typeof match[6] != 'undefined')?match[6]:"";
        const kunten = (typeof match[7] != 'undefined')?match[7].slice(2,-1):"";
        const saidoku = match[4];
        const saiyomi = match[5];
        if (typeof saidoku != 'undefined') {
            // 再読処理。matchをそのままresultに入れ、
            // matchはclone()してそこの読み・送りを再読・再送りにする。
            result.push(match);
            match = match.clone();
            match[2] = saidoku;
            match[3] = saiyomi;
        }
        // 前の漢字のレ点・竪点への対応
        if (reten_flag) {
            stock.unshift(match);
            reten_flag = false;
        } else if (tate_flag) {
            stock.push(match);
            tate_flag = false;
        } else {
            stock = new Array(match);
        }
        // 訓点処理
        if (kunten.match(/[一二三四上中下天地人甲乙丙丁]/)) {
            kunten_flag = RegExp.lastMatch;
        }
        if (kunten.match(/レ/)) {
            reten_flag = true; // 「一レ」の場合は reten_flag だけ true にして次に。
        } else if (tateten == "‐") {
            tate_flag = true;
        } else if (kunten_flag.length > 0) {
            // 現在漢字にレ点・竪点がない場合は訓点処理に入る
            if (kunten_flag.match(/一/)) {
                result = result.concat(stock).concat(kanbun_two);
                result = result.concat(kanbun_three).concat(kanbun_four);
                kanbun_two = null;
                kanbun_three = null;
                kanbun_four = null;}
            else if (kunten_flag.match(/二/)) kanbun_two = stock;
            else if (kunten_flag.match(/三/)) kanbun_three = stock;
            else if (kunten_flag.match(/四/)) kanbun_four = stock;
            else if (kunten_flag.match(/上/)) {
                result = result.concat(stock).concat(kanbun_middle);
                result = result.concat(kanbun_down);
                kanbun_middle=null;
                kanbun_down=null;}
            else if (kunten_flag.match(/中/)) kanbun_middle = stock;
            else if (kunten_flag.match(/下/)) kanbun_down = stock;
            else if (kunten_flag.match(/甲/)) {
                result = result.concat(stock).concat(kanbun_otsu);
                result = result.concat(kanbun_hei).concat(kanbun_tei);
                kanbun_otsu = null;
                kanbun_hei = null;
                kanbun_tei = null;
            }
            else if (kunten_flag.match(/乙/)) kanbun_otsu = stock;
            else if (kunten_flag.match(/丙/)) kanbun_hei = stock;
            else if (kunten_flag.match(/丁/)) kanbun_tei = stock;
            else if (kunten_flag.match(/天/)) {
                result = result.concat(stock).concat(kanbun_chi);
                result = result.concat(kanbun_jin);
                kanbun_chi = null;
                kanbun_jin = null;}
            else if (kunten_flag.match(/地/)) kanbun_chi = stock;
            else if (kunten_flag.match(/人/)) kanbun_jin = stock;
            else console.log ("error! match="+match);
            kunten_flag="";
        } else {
            result = result.concat(stock);
        }
    });
    return result.remove(null);
}

/**
 * 漢文を書き下し文に変換する。
 * @param {string} text 元データ
 * @param {boolean} yomi 読み表示
 * @param {boolean} hiragana カタカナを平仮名に変換
 * @returns HTMLデータ
 * @type string
 */
function kanbun_to_kakikudashi(text,yomi,hiragana){
    const reordered = kanbun_reorder(text);
    let result="";
    reordered.forEach(match=>{
        const kanji_part = kanbun_match_yomi(match,yomi,false);
        const okuri_part = kanbun_match_okuri(match);
        result+="<nobr>"+kanji_part+okuri_part +"</nobr><wbr/>";
    });
    if (hiragana) result=kanbun_katakana_to_hiragana(result);
    return kanbun_remove_kutou_break(result);
}


// ＊＊＊＊＊＊＊＊ HTML処理 ＊＊＊＊＊＊＊＊
//
// 元のデータを <!--XXXX--> とコメントに入れて保存する。
//

/**
 * text中の <!--XXXX--> の部分を返す。
 * @private
 */
function kanbun_orig_text (text) {
    let orig_text;
    if (text.match(/<!--([^>]+)-->/)) {
        orig_text = RegExp.$1;
    } else {
        orig_text = text;
    }
    return orig_text;
};

/**
 * HTMLのIDノードの、<!--XXXX--> で保存されている原データをもとに戻す。
 * @private
 * @param {string} id HTML node
 * @returns {none}
 */
function kanbun_html_to_original (id) {
    document.querySelectorAll(id+"[class=kanbun]").forEach(elm=>{
        const orig_text = kanbun_orig_text(elm.innerHTML);
        elm.innerHTML = orig_text;
    });
}

/**
 * HTMLのIDノードを漢文に変換する。
 * @param {string} id HTML node
 * @param {boolean} yomi 読み仮名表示
 * @param {boolean} okuri 送り仮名表示
 * @param {boolean} ten 漢文順序点表示
 * @param {boolean} kutou 句読点表示
 * @param {boolean} unicode 漢文順序にユニコードを使用
 * @type {none}
 */
function kanbun_html_to_kanbun (id,yomi,okuri,ten,kutou,unicode) {
    document.querySelectorAll(id+"[class=kanbun]").forEach(elm=>{
        const orig_text = kanbun_orig_text(elm.innerHTML);
        const new_text = kanbun_to_kanbun(orig_text,yomi,okuri,ten,kutou,unicode);
        elm.innerHTML = new_text+"<!--"+orig_text+"-->";
    });
}

/**
 * HTMLのIDノードを書き下し文に変換する。
 * @param {string} id HTML node
 * @param {boolean} yomi 読み表示
 * @param {boolean} hiragana カタカナを平仮名に変換
 * @type {none}
 */
function kanbun_html_to_kakikudashi (id,yomi,hiragana) {
    document.querySelectorAll(id+"[class=kanbun]").forEach(elm=>{
        const orig_text = kanbun_orig_text(elm.innerHTML);
        const new_text = kanbun_to_kakikudashi(orig_text,yomi,hiragana);
        elm.innerHTML = new_text+"<!--"+orig_text+"-->";
    });
}