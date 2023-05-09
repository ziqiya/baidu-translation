var http = require("http");
var https = require("https");
var url = require("url");
var querystring = require("querystring");

var root = "https://fanyi.baidu.com";
// 写死一个 Cookie 供 Node.js 端使用；浏览器端自带这个 Cookie 所以无需处理
var Cookie = "BAIDUID=6F4CC30998F677A7F1DA082EA2389A68:SL=0:NR=10:FG=1;";
// sign 需要的常量
var r = "320305.131321201";

// 请求头
var headers = {
  Cookie: Cookie,
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
};

var tokenReg = /token:\s'([^']+)'/;

/**
 * 百度支持的语种到百度自定义的语种名的映射，去掉了文言文。
 * @see http://api.fanyi.baidu.com/api/trans/product/apidoc#languageList
 */
var standard2custom = {
  en: "en",
  th: "th",
  ru: "ru",
  pt: "pt",
  el: "el",
  nl: "nl",
  pl: "pl",
  bg: "bul",
  et: "est",
  da: "dan",
  fi: "fin",
  cs: "cs",
  ro: "rom",
  sl: "slo",
  sv: "swe",
  hu: "hu",
  de: "de",
  it: "it",
  "zh-CN": "zh",
  "zh-TW": "cht",
  // 'zh-HK': 'yue',
  ja: "jp",
  ko: "kor",
  es: "spa",
  fr: "fra",
  ar: "ara",
};

/** 反转对象 */
function invert(obj) {
  var result = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[obj[key]] = key;
    }
  }
  return result;
}

/** 百度自定义的语种名到标准语种名的映射 */
var custom2standard = invert(standard2custom);

function request(options) {
  var _a = options.method,
    method = _a === void 0 ? "get" : _a;
  var urlObj = url.parse(options.url, true);
  var qs = querystring.stringify(Object.assign(urlObj.query, options.query));
  var headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36",
  };
  var body;
  if (method === "post") {
    switch (options.type) {
      case "form":
        headers["Content-Type"] =
          "application/x-www-form-urlencoded; charset=UTF-8";
        body = querystring.stringify(options.body);
        break;
      case "json":
      default:
        headers["Content-Type"] = "application/json; charset=UTF-8";
        body = JSON.stringify(options.body);
        break;
    }
    headers["Content-Length"] = String(Buffer.byteLength(body));
  }
  Object.assign(headers, options.headers);
  var httpOptions = {
    hostname: urlObj.hostname,
    method: method,
    path: urlObj.pathname + "?" + qs,
    headers: headers,
    auth: urlObj.auth,
    timeout: options.timeout || 5000,
  };
  var responseType = options.responseType || "json";
  return new Promise(function (resolve, reject) {
    var req = (urlObj.protocol === "https:" ? https.request : http.request)(
      httpOptions,
      function (res) {
        // 内置的翻译接口都以 200 作为响应码，所以不是 200 的一律视为错误
        if (res.statusCode !== 200) {
          reject(getError("API_SERVER_ERROR" /* API_SERVER_ERROR */));
          return;
        }
        res.setEncoding("utf8");
        var rawData = "";
        res.on("data", function (chunk) {
          rawData += chunk;
        });
        res.on("end", function () {
          // Node.js 端只支持 json，其余都作为 text 处理
          if (responseType === "json") {
            try {
              resolve(JSON.parse(rawData));
            } catch (e) {
              // 与浏览器端保持一致，在无法解析成 json 时报错
              reject(getError("API_SERVER_ERROR" /* API_SERVER_ERROR */));
            }
          } else {
            resolve(rawData);
          }
        });
      }
    );
    req.on("timeout", function () {
      req.abort();
      reject(getError("NETWORK_TIMEOUT" /* NETWORK_TIMEOUT */, "查询超时"));
    });
    req.on("error", function (e) {
      reject(getError("NETWORK_ERROR" /* NETWORK_ERROR */, e.message));
    });
    req.end(body);
  });
}

function n(t, e) {
  for (var n = 0; n < e.length - 2; n += 3) {
    var r = e.charAt(n + 2);
    (r = "a" <= r ? r.charCodeAt(0) - 87 : Number(r)),
      (r = "+" === e.charAt(n + 1) ? t >>> r : t << r),
      (t = "+" === e.charAt(n) ? (t + r) & 4294967295 : t ^ r);
  }
  return t;
}

// 获取 sign
function getSign(t) {
  var o,
    i = t.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
  if (null === i) {
    var a = t.length;
    a > 30 &&
      (t = ""
        .concat(t.substr(0, 10))
        .concat(t.substr(Math.floor(a / 2) - 5, 10))
        .concat(t.substr(-10, 10)));
  } else {
    for (
      var s = t.split(/[\uD800-\uDBFF][\uDC00-\uDFFF]/),
        c = 0,
        l = s.length,
        u = [];
      c < l;
      c++
    )
      "" !== s[c] &&
        u.push.apply(
          u,
          (function (t) {
            if (Array.isArray(t)) return e(t);
          })((o = s[c].split(""))) ||
            (function (t) {
              if (
                ("undefined" != typeof Symbol && null != t[Symbol.iterator]) ||
                null != t["@@iterator"]
              )
                return Array.from(t);
            })(o) ||
            (function (t, n) {
              if (t) {
                if ("string" == typeof t) return e(t, n);
                var r = Object.prototype.toString.call(t).slice(8, -1);
                return (
                  "Object" === r && t.constructor && (r = t.constructor.name),
                  "Map" === r || "Set" === r
                    ? Array.from(t)
                    : "Arguments" === r ||
                      /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)
                    ? e(t, n)
                    : void 0
                );
              }
            })(o) ||
            (function () {
              throw new TypeError(
                "Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
              );
            })()
        ),
        c !== l - 1 && u.push(i[c]);
    var p = u.length;
    p > 30 &&
      (t =
        u.slice(0, 10).join("") +
        u.slice(Math.floor(p / 2) - 5, Math.floor(p / 2) + 5).join("") +
        u.slice(-10).join(""));
  }
  for (
    var d = ""
        .concat(String.fromCharCode(103))
        .concat(String.fromCharCode(116))
        .concat(String.fromCharCode(107)),
      h = (null !== r ? r : (r = window[d] || "") || "").split("."),
      f = Number(h[0]) || 0,
      m = Number(h[1]) || 0,
      g = [],
      y = 0,
      v = 0;
    v < t.length;
    v++
  ) {
    var _ = t.charCodeAt(v);
    _ < 128
      ? (g[y++] = _)
      : (_ < 2048
          ? (g[y++] = (_ >> 6) | 192)
          : (55296 == (64512 & _) &&
            v + 1 < t.length &&
            56320 == (64512 & t.charCodeAt(v + 1))
              ? ((_ = 65536 + ((1023 & _) << 10) + (1023 & t.charCodeAt(++v))),
                (g[y++] = (_ >> 18) | 240),
                (g[y++] = ((_ >> 12) & 63) | 128))
              : (g[y++] = (_ >> 12) | 224),
            (g[y++] = ((_ >> 6) & 63) | 128)),
        (g[y++] = (63 & _) | 128));
  }
  for (
    var b = f,
      w =
        ""
          .concat(String.fromCharCode(43))
          .concat(String.fromCharCode(45))
          .concat(String.fromCharCode(97)) +
        ""
          .concat(String.fromCharCode(94))
          .concat(String.fromCharCode(43))
          .concat(String.fromCharCode(54)),
      k =
        ""
          .concat(String.fromCharCode(43))
          .concat(String.fromCharCode(45))
          .concat(String.fromCharCode(51)) +
        ""
          .concat(String.fromCharCode(94))
          .concat(String.fromCharCode(43))
          .concat(String.fromCharCode(98)) +
        ""
          .concat(String.fromCharCode(43))
          .concat(String.fromCharCode(45))
          .concat(String.fromCharCode(102)),
      x = 0;
    x < g.length;
    x++
  )
    b = n((b += g[x]), w);
  return (
    (b = n(b, k)),
    (b ^= m) < 0 && (b = 2147483648 + (2147483647 & b)),
    "".concat((b %= 1e6).toString(), ".").concat(b ^ f)
  );
}

var headers$1 = {
  "X-Requested-With": "XMLHttpRequest",
  Cookie: Cookie,
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
};
/** 请求获取 token */
const getToken = async () => {
  const htmRes = await request({
    url: "https://fanyi.baidu.com",
    headers: headers,
    responseType: "text",
  });
  const token = htmRes.match(tokenReg);
  return token[1];
};

/** 识别语言种类 */
const detect = async (options) => {
  let iso689lang;
  let query = (typeof options === "string" ? options : options.text).slice(
    0,
    73
  );
  const res = await request({
    method: "post",
    url: root + "/langdetect",
    body: {
      query: query,
    },
    type: "form",
  });
  if (res.error === 0) {
    iso689lang = custom2standard[res.lan];
    if (iso689lang) return iso689lang;
  }
  throw getError("UNSUPPORTED_LANG" /* UNSUPPORTED_LANG */);
};

/**
 * 生成百度语音地址
 * @param text 要朗读的文本
 * @param lang 文本的语种，使用百度自定义的语种名称
 */
function getAudioURI(text, lang) {
  return (
    root +
    ("/gettts?lan=" +
      lang +
      "&text=" +
      encodeURIComponent(text) +
      "&spd=3&source=web")
  );
}

/** 翻译 */
const translate = async (options) => {
  const modifiedOptions =
    typeof options === "string" ? { text: options } : options;
  let { from, to, text } = modifiedOptions || {};
  if (!from) {
    from = await detect(text);
  }
  if (!to) {
    to = from.startsWith("zh") ? "en" : "zh-CN";
  }

  let customFromLang = standard2custom[from];
  let customToLang = standard2custom[to];
  if (!customFromLang || !customToLang) {
    throw getError("UNSUPPORTED_LANG" /* UNSUPPORTED_LANG */);
  }

  const sign = getSign(text);
  const token = await getToken(text);
  let params = {
    from: customFromLang,
    to: customToLang,
    query: text,
    transtype: "translang",
    sign,
    token,
  };
  let requestOptions = {
    url: root + "/v2transapi",
    type: "form",
    method: "post",
    body: params,
    headers: headers$1,
  };

  const res1 = await request(requestOptions);
  return res1;
};

/**
 * 获取指定文本的网络语音地址
 */
const audio = async (options) => {
  const modifiedOptions =
    typeof options === "string" ? { text: options } : options;
  let { text, from } = modifiedOptions;
  if (!from) {
    from = await detect(text);
  }
  if (from === "en-GB") {
    lang = "uk";
  } else {
    lang = standard2custom[from];
    if (!lang) throw getError("UNSUPPORTED_LANG" /* UNSUPPORTED_LANG */);
  }
  return getAudioURI(text, lang);
};

// 测试执行
console.log("translate ", translate("你好"));

function getError(code, msg) {
  var e = new Error(msg);
  e.code = code;
  return e;
}

var index = /*#__PURE__*/ Object.freeze({
  __proto__: null,
  translate: translate,
  detect: detect,
  audio: audio,
});

exports.baidu = index;
