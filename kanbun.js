/* 漢文表示 JavaScript */

/* 漢文を表現するための青空文庫に倣ったマークアップ言語と、それを
   HTMLに変換するスクリプト */

/* 漢文注記記法：
   漢文     := 漢文単位+
   漢文単位 := 漢字単位 読み仮名? 送り仮名* 再読仮名? 再読送り* 竪点? 訓点?
   漢字単位 := 漢字 異体字選? | 句読点
   漢字     := "[㐀-\9fff]|[豈-\faff]|[\ud840-\ud87f][\udc00-\udfff]"
   句読点   := "[。、]"
   異体字選 := "\udb40[\udd00-\uddef]" （異体字選択子：U+E0100...U+E01EF）
   読み仮名 := 表示読み | 非表示読み
   表示読み := "《" 仮名漢字* "》"
        ※ 表示読みは、漢文・書き下し文の両方で漢字の脇に読みを表示する。
   仮名漢字 := 仮名 | 漢字
   仮名     := [ぁ-ヿ]
   非表示読 := "〈" 仮名漢字* "〉"
        ※ 非表示読みは、漢文では表示せず、書き下し文では仮名のみ表示する。
        ※ 置き字の場合は非表示読みを〈〉として再読仮名を置かない。
   送り仮名 := 仮名+ | "［＃（" 仮名漢字+ "）］"
        ※ 万葉仮名がある場合は、後者を使用する。
   再読仮名 := 表示読み | 非表示読み
   再読送り := 仮名+ | "［＃（" 仮名漢字+ "）］"
        ※ 万葉仮名がある場合は、後者を使用する。
   竪点     := "‐" ※ （仮定）竪点は２つ連続しない。
   訓点     := "［＃" 訓点文字 "］"
   訓点文字 := 順序点 | "[一上天甲]?レ"
   順序点   := [一二三四上中下天地人甲乙丙丁]
*/

/* 例
 - 引キテ［＃レ］酒ヲ且《》二〈ス〉［＃レ］飲マント［＃レ］之ヲ。
   → 引酒且飲之。（漢文）
   → 酒ヲ引キテ且二之ヲ飲マントス。（書き下し）

 - 孤之〈ノ〉有ルハ［＃二］孔明［＃一］、猶《な》ホ〈ゴト〉シ［＃二］魚之〈ノ〉有ルガ［＃一レ］水。
   → 孤之有孔明、猶魚之有水。（漢文）
   → 孤ノ孔明有ルハ、猶《な》ホ魚ノ水有ルガゴトシ。（書き下し）

 - 青ハ取リテ［＃二］之ヲ於〈〉藍ヨリ［＃一］而〈〉青シ［＃二］於〈〉藍ヨリモ［＃一］
   → 青取之於藍而青於藍（漢文）
   → 青ハ之ヲ藍ヨリ取リテ藍ヨリモ青シ（書き下し）

 - 使〈シ〉メヨ［＃人］籍《せき》ヲシテ誠《まこと》ニ不〈〉〈ズ〉［＃乙］以《もつ》テ［＃下］蓄《やしな》ヒ［＃二］妻子ヲ［＃一］憂《うれ》フルヲ［＃中］飢寒《きかん》ヲ［＃上］乱サ［＃甲レ］心ヲ、有リテ［＃レ］銭《ぜに》以《もつ》テ済《な》サ［＃地］医薬ヲ［＃天］。
   → 使籍誠不以蓄妻子憂飢寒乱心有銭以済医薬。（漢文）
   → 籍《せき》ヲシテ誠《まこと》ニ妻子ヲ蓄《やしな》ヒ飢寒《きかん》ヲ憂《うれ》フルヲ以《もつ》テ心ヲ乱サズ、銭《ぜに》有リテ以《もつ》テ医薬ヲ済《な》サシメヨ。（書き下し）
*/

/* 上記の正規表現 */

var kanji      = "[㐀-\u9fff]|[豈-\ufaff]|[\ud840-\ud87f][\udc00-\udfff]";
var vselector  = "\udb40[\udd00-\uddef]";
var kutouten   = "[。、]";
var kanji_unit = "(?:" + kanji+"(?:"+vselector+")?|"+kutouten+")";
var kana       = "[ぁ-ヿ]";
var kana_kanji = kana+"|(?:"+kanji_unit+")";
var hyouji     = "《(?:"+ kana_kanji + ")*》";
var hihyouji   = "〈(?:"+ kana_kanji + ")*〉";
var yomi       = "(?:" + hyouji +")|(?:" + hihyouji +")";
var okuri      = kana + "+|［＃（(?:" + kana_kanji + ")+）］";
var saidoku    = "(?:" + hyouji +")|(?:" + hihyouji +")";
var saiokuri      = kana + "+|［＃（(?:" + kana_kanji + ")+）］";
var tateten    = "‐";
var junjo      = "[一二三四上中下天地人甲乙丙丁]";
var kunten     = "［＃(?:"+junjo+"|[一上天甲]?レ)］";

var kanbun  = "(" +kanji_unit +")(" + yomi + ")?(" + okuri + ")?(" + saidoku +
        ")?(" + saiokuri + ")?(" + tateten +")?(" + kunten + ")?";
var kanbun_regex = new RegExp (kanbun);

// ＊＊＊＊＊＊＊＊ 関数名一覧 ＊＊＊＊＊＊＊＊
//
// kanbun_to_kanbun      元データを漢文に変換する。 
// kanbun_to_kakikudashi 元データを書き下しに変換する。 
// kanbun_html_to_kanbun      HTMLの元データを漢文に変換する。 
// kanbun_html_to_kakikudashi HTMLの元データを書き下しに変換する。 


// ＊＊＊＊＊＊＊＊ 基本機能 ＊＊＊＊＊＊＊＊

/**
 * 配列からの要素の削除
 */
Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
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
 */
Array.prototype.clone = function(){
    return Array.apply(null,this);
};


// ＊＊＊＊＊＊＊＊ 漢文の分割と関連ツール ＊＊＊＊＊＊＊＊

/**
 * 漢文を漢字単位に分割する。
 * @param {string} text 元データ
 * @returns {Array} matchの配列
 */
function kanbun_split (text) {
    var result=[];
    while (text.length > 0) {
        var match = text.match(kanbun_regex);
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
        text=text.substring(match[0].length);
        result = result.concat([match]);
    }
    return result;
}

/**
 * match の漢字・読みの部分をHTMLにする。
 * @param {Array} match
 * @param {boolean} yomi 漢字に読みを表示する
 * @param {boolean} kanbun 漢文。〈…〉は、漢字のみを表示する。
 * @returns {string} 読み付き漢字。rubyがfalseか読みがない場合は漢字のみ。
 *       〈…〉は kanbun がtrueなら漢字のみ。falseなら読みのみ。
 *       《…》なら<ruby>タグで返す。
 */
function kanbun_match_yomi(match,yomi,kanbun) {
    if (yomi == false ||  match[2] == undefined) {return match[1];}
    else if (match[2].match(/^〈/)) {
        if (kanbun) {
            return match[1];
        } else {
            return match[2].slice(1,-1);
        }
    }
    return "<ruby>"+match[1]+"<rt>"+match[2].slice(1,-1)+"</rt></ruby>";
}

/**
 * match の送り文字の部分をHTMLにする。
 * @param {Array} match
 * @returns {string} 送り文字。
 */
function kanbun_match_okuri(match) {
    if (match[3] == undefined) return "";
    if (match[3].match(/［＃（(.+?)）］/)) {
        return RegExp.$1;
    } else {
        return match[3];
    }
}


/**
 * match の訓点部分をHTMLにする。
 * @param {Array} match
 * @param {boolean} unicode
 * @returns {string} 訓点HTML。
 */
function kanbun_match_ten(match,unicode) {
    var tate= (match[6] == undefined)? "" : match[6];
    var ten = (match[7] == undefined)? "" : match[7];
    if (tate != "" || ten != "") {
        if (ten.match(/［＃(.+?)］/)) {
            ten = RegExp.$1;
            ten = (unicode)?ten.replace(/(.)/g,kanbun_unicode[RegExp.$1]):
                "<sub style='font-size: x-small;'>"+ten+"</sub>";
        }
        return tate+ten;
    } else 
        return "";
}

var kanbun_unicode = {"‐":"㆐","レ":"㆑","一":"㆒","二":"㆓",
                      "三":"㆔","四":"㆕","上":"㆖","中":"㆗",
                      "下":"㆘","甲":"㆙","乙":"㆚","丙":"㆛",
                      "丁":"㆜","天":"㆝","地":"㆞","人":"㆟"};
/**
 * 訓点をHTMLに変換する。
 * @param {string} text 入力テキスト（順序点のみ）
 * @param {boolean} unicode Unicode訓点文字を使用するか
 * @returns {string} 変換テキスト
 */
function kanbun_ten (text, unicode) {
    if (unicode) {
        return text.replace(/(.)/g,kanbun_unicode[RegExp.$1]);}
    else {
        return "<sub style='font-size: x-small;'>"+text+"</sub>";
    }
}


// ＊＊＊＊＊＊＊＊ 漢文処理 ＊＊＊＊＊＊＊＊

/**
 * 漢文をHTMLに変換する。
 * @param {string} text 元データ
 * @param {boolean} yomi 読み表示
 * @param {boolean} okuri 送り仮名表示
 * @param {boolean} ten 漢文順序点表示
 * @param {boolean} kutou 句読点表示
 * @param {boolean} unicode 漢文順序にユニコードを使用
 * @returns {string} HTMLデータ
 */
function kanbun_to_kanbun (text, yomi, okuri, ten, kutou, unicode) {
    var split=kanbun_split(text);
    var result="";
    split.forEach(function(match) {
        var kanji_part = kanbun_match_yomi(match,yomi,true);
        var okuri_part = okuri? "<sup>"+kanbun_match_okuri(match)+"</sup>" :"";
        var ten_part = ten?kanbun_match_ten(match,unicode):"";
        result+="<nobr>"+ kanji_part + okuri_part + ten_part +"</nobr>";
    });
    return result;
}

// ＊＊＊＊＊＊＊＊ 書き下し文・処理 ＊＊＊＊＊＊＊＊

/**
 * 漢文の順序を書き下し文の順序の分割した配列に変換する。
 * @param {string} text 入力
 * @param {boolean} unicode 訓点文字
 * @returns {array} 順序を入れ替えた配列
 */
function kanbun_reorder (text){
    var kunten_flag="", reten_flag=false, tate_flag=false;
    var split_text=kanbun_split (text);
    var kanbun_two=null, kanbun_three=null, kanbun_four=null;
    var kanbun_middle=null, kanbun_down=null;
    var kanbun_otsu=null, kanbun_hei=null, kanbun_tei=null;
    var kanbun_chi=null, kanbun_jin=null;
    var stock=new Array();
    var result=new Array();

    split_text.forEach(function (match) {
        var tateten=(typeof match[6] != 'undefined')?match[6]:"";
        var kunten=(typeof match[7] != 'undefined')?match[7].slice(2,-1):"";
        var saidoku = match[4];
        var saiyomi = match[5];
        if (typeof saidoku != 'undefined') {
            // 再読処理。matchをそのままresultに入れ、
            // matchはclone()してそこの読み・送りを再読・再送りにする。
            result.push(match);
            match = match.clone();
            match[2]=saidoku;
            match[3]=saiyomi;
        }
        // 前の漢字のレ点・竪点への対応
        if (reten_flag) {
            stock.unshift(match);
            reten_flag=false;
        } else if (tate_flag) {
            stock.push(match);
            tate_flag=false;
        } else {
            stock = new Array(match);
        }
        // 訓点処理
        if (kunten.match(/[一二三四上中下天地人甲乙丙丁]/)) {
            kunten_flag = RegExp.lastMatch;
        }
        if (kunten.match(/レ/)) {
            reten_flag=true; // 「一レ」の場合は reten_flag だけ true にして次に。
        } else if (tateten == "‐") {
            tate_flag=true;
        } else if (kunten_flag.length > 0) {
            // 現在漢字にレ点・竪点がない場合は訓点処理に入る
            if (kunten_flag.match(/一/)) {
                result = result.concat(stock).concat(kanbun_two);
                result = result.concat(kanbun_three).concat(kanbun_four);
                kanbun_two=null;
                kanbun_three=null;
                kanbun_four=null;}
            else if (kunten_flag.match(/二/)) kanbun_two=stock;
            else if (kunten_flag.match(/三/)) kanbun_three=stock;
            else if (kunten_flag.match(/四/)) kanbun_four=stock;
            else if (kunten_flag.match(/上/)) {
                result = result.concat(stock).concat(kanbun_middle);
                result = result.concat(kanbun_down);
                kanbun_middle=null;
                kanbun_down=null;}
            else if (kunten_flag.match(/中/)) kanbun_middle=stock;
            else if (kunten_flag.match(/下/)) kanbun_down=stock;
            else if (kunten_flag.match(/甲/)) {
                result = result.concat(stock).concat(kanbun_otsu);
                result = result.concat(kanbun_hei).concat(kanbun_tei);
                kanbun_otsu=null;
                kanbun_hei=null;
                kanbun_tei=null;
            }
            else if (kunten_flag.match(/乙/)) kanbun_otsu=stock;
            else if (kunten_flag.match(/丙/)) kanbun_hei=stock;
            else if (kunten_flag.match(/丁/)) kanbun_tei=stock;
            else if (kunten_flag.match(/天/)) {
                result = result.concat(stock).concat(kanbun_chi);
                result = result.concat(kanbun_jin);
                kanbun_chi=null;
                kanbun_jin=null;}
            else if (kunten_flag.match(/地/)) kanbun_chi=stock;
            else if (kunten_flag.match(/人/)) kanbun_jin=stock;
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
 * @param {boolean} kutou 句読点表示
 * @returns {string} HTMLデータ
 */
function kanbun_to_kakikudashi (text,yomi,kutou){
    var reordered=kanbun_reorder(text);
    var result="";
    reordered.forEach(function(match) {
        var kanji_part = kanbun_match_yomi(match,yomi,false);
        var okuri_part = (match[3] != undefined)? match[3] : "";
        result+="<nobr>"+kanji_part+okuri_part +"</nobr>";
    });
    return result;
}


// ＊＊＊＊＊＊＊＊ HTML処理（要jquery） ＊＊＊＊＊＊＊＊
//
// 元のデータを <!--XXXX--> とコメントに入れて保存する。
//

/**
 * text中の <!--XXXX--> の部分を返す。
 */
function kanbun_orig_text (text) {
    var orig_text;
    if (text.match(/<!--([^>]+)-->/)) {
        orig_text=RegExp.$1;
    } else {
        orig_text=text;
    }
    return orig_text;
};

/**
 * IDノードの、<!--XXXX--> で保存されている原データをもとに戻す。
 * @param {string} id HTML node
 * @returns {none}
 */
function kanbun_html_to_original (id) {
    $(id+"[class=kanbun]").each(function () {
        var orig_text=kanbun_orig_text($(this).html());
        $(this).html(orig_text);
    });
}

/**
 * IDノードを漢文に変換する。
 * @param {string} id HTML node
 * @param {boolean} yomi 読み仮名表示
 * @param {boolean} okuri 送り仮名表示
 * @param {boolean} ten 漢文順序点表示
 * @param {boolean} kutou 句読点表示
 * @param {boolean} unicode 漢文順序にユニコードを使用
 * @returns {none}
 */
function kanbun_html_to_kanbun (id,yomi,okuri,ten,kutou,unicode) {
    $(id+"[class=kanbun]").each(function () {
        var orig_text=kanbun_orig_text($(this).html());
        var new_text=kanbun_to_kanbun(orig_text,yomi,okuri,ten,kutou,unicode);
        $(this).html(new_text+"<!--"+orig_text+"-->");
    });
}

/**
 * IDノードを書き下し文に変換する。
 * @param {string} id HTML node
 * @param {boolean} yomi 読み表示
 * @param {boolean} kutou 句読点表示
 * @returns {none}
 */
function kanbun_html_to_kakikudashi (id,yomi,kutou) {
    $(id+"[class=kanbun]").each(function () {
        var orig_text=kanbun_orig_text($(this).html());
        var new_text=kanbun_to_kakikudashi(orig_text,yomi,kutou);
        $(this).html(new_text+"<!--"+orig_text+"-->");
    });
}
