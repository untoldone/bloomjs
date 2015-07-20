(function (exports) {
  "use strict";

  exports.Client = function (options) {
    this.url = "http://www.bloomapi.com/api";
    this.defaultOptions = {
      "offset": 0,
      "limit": 20
    };

    if (typeof options === "string") {
      this.apiKey = options;
    } else if (typeof options === "object" && options !== null) {
      
      if (typeof options.apiKey !== "undefined") {
        this.apiKey = options.apiKey;
      }

      if (typeof options.url !== "undefined") {
        this.url = options.url;
      }

    }
  };

  exports.Client.prototype = {
    sources: function (cb) {
      var parameters = "", callUrl;

      if (typeof this.apiKey !== "undefined") {
        if (parameters.length > 0) {
          parameters += "&";
        }

        parameters += "secret=" + this.apiKey;
      }
      
      callUrl = this.url + "/sources" + (typeof parameters !== "undefined" ? "?" + parameters : "");
      
      sendRequest(callUrl, function (err, result) {
        if (err) {
          return cb(err);
        }

        return cb(null, result.result, { "meta": result.meta });
      });
    },
    search: function (source) {
      var options = {},
          parameters = "",
          query, cb, callUrl;

      for (var optAttr in this.defaultOptions) { options[optAttr] = this.defaultOptions[optAttr]; }
      
      if (typeof arguments[arguments.length - 1] === "function") {
        cb = arguments[arguments.length - 1];
      }

      if (typeof arguments[1] === "object" && arguments[1] !== null) {
        query = arguments[1];
        try {
          parameters = toParameters(query);
        } catch (e) {
          if (cb) {
            cb(e);
          }

          return;
        }
      }

      if (typeof arguments[2] === "object" && arguments[2] !== null) {
        for (var addAttr in arguments[2]) { options[addAttr] = arguments[2][addAttr]; }

        for (var attr in options) {
          if (parameters.length > 0) {
            parameters += "&";
          }

          parameters += attr + "=" + options[attr];
        }
      }

      if (typeof this.apiKey !== "undefined") {
        if (parameters.length > 0) {
          parameters += "&";
        }

        parameters += "secret=" + this.apiKey;
      }

      callUrl = this.url + "/search/" + source + (typeof parameters !== "undefined" ? "?" + parameters : "");

      sendRequest(callUrl, function (err, result) {
        if (err) {
          return cb(err);
        }

        return cb(null, result.result, { "meta": result.meta });
      });
    },
    find: function (source, id, cb) {
      var parameters = "", callUrl;

      if (typeof this.apiKey !== "undefined") {
        if (parameters.length > 0) {
          parameters += "&";
        }
        
        parameters += "secret=" + this.apiKey;
      }
      
      callUrl = this.url + "/sources/" + source + "/" + id + (typeof parameters !== "undefined" ? "?" + parameters : "");

      sendRequest(callUrl, function (err, result) {
        if (err) {
          return cb(err);
        }

        return cb(null, result.result, { "meta": result.meta });
      });
    }
  };

  var uniqueJSONP = 0;
  function sendRequest(fullUrl, callback) {
    var agent = "BloomJS/0.0.5";

    if (typeof window !== "undefined") {
      // Assume in browser
      var name = "_jsonp_" + uniqueJSONP,
          script;

      uniqueJSONP += 1;

      if (fullUrl.match(/\?/)) {
        fullUrl += "&callback=" + name;
      } else {
        fullUrl += "?callback=" + name;
      }
      
      script = document.createElement("script");
      script.type = "text/javascript";
      script.src = fullUrl;
      
      // Setup handler
      window[name] = function (data) {
        callback.call(window, null, data);
        document.getElementsByTagName("head")[0].removeChild(script);
        script = null;
        delete window[name];
      };
      
      // Load JSON
      document.getElementsByTagName("head")[0].appendChild(script);
    } else {
      // Assume in nodejs
      var http = require("http"),
          https = require("https"),
          url  = require("url"),
          zlib = require("zlib");

      var parsed, protocol;

      parsed = url.parse(fullUrl);

      protocol = (parsed.protocol === "https:" ? https : http);

      protocol.get({
        headers: {
          "User-Agent": agent,
          "Accept-Encoding": "gzip,deflate"
        },
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.path,
        agent: false
      }, function (res) {
        var body = [];

        if (res.statusCode !== 200 && res.statusCode !== 304) {
          return callback(new Error("Non-OK http return: " + res.statusCode));
        }

        res.on("data", function (d) {
          body.push(d);
        });

        res.on("end", function () {
          var buffer = Buffer.concat(body),
              encoding = res.headers["content-encoding"],
              contents;

          if (encoding === "gzip") {
            zlib.gunzip(buffer, function (err, contents) {
              var result;

              try {
                result = JSON.parse(contents);
              } catch (e) {
                return callback(e);
              }
              
              callback(null, result);
            });
          } else if (encoding === "deflate") {
            zlib.inflate(buffer, function (err, contents) {
              var result;

              try {
                result = JSON.parse(contents);
              } catch (e) {
                return callback(e);
              }
              
              callback(null, result);
            });
          } else {
            var result;

            contents = buffer.toString();

            try {
              result = JSON.parse(contents);
            } catch (e) {
              return callback(e);
            }
            
            callback(null, result);
          }
        });
      }).on("error", function (e) {
        return callback(e);
      });
    }
  }

  function toParameters (query) {
    var parameters = "",
        index = 1,
        key, orIndex, values, op;

    if (query instanceof Array) {
      var queryPart = 0;
      for(; queryPart < query.length; queryPart++) {
        var subQuery = query[queryPart];

        for (key in subQuery) {
          if (parameters.length > 0) {
            parameters += "&";
          }

          if (typeof subQuery[key] === "string") {
            parameters += "key" + index + "=" + key;
            parameters += "&op" + index + "=eq";
            parameters += "&value" + index + "=" + subQuery[key];

            index += 1;
          } else if (subQuery[key] instanceof Array) {
            orIndex = 0;
            values = subQuery[key];

            parameters += "key" + index + "=" + key;
            parameters += "&op" + index + "=eq";
            
            for (; orIndex < values.length; orIndex += 1) {
              parameters += "&value" + index + "=" + values[orIndex];
            }

            index += 1;
          } else if (typeof subQuery[key] === "object" && typeof subQuery[key] !== null) {
            for (op in subQuery[key]) {
              if (typeof subQuery[key][op] === "string") {
                parameters += "key" + index + "=" + key;
                parameters += "&op" + index + "=" + op;
                parameters += "&value" + index + "=" + subQuery[key][op];

                index += 1;
              } else if (subQuery[key][op] instanceof Array) {
                nestOrIndex = 0;
                nestValues = subQuery[key][op];
                parameters += "key" + index + "=" + key;
                parameters += "&op" + index + "=" + op;

                for (; nestOrIndex < nestValues.length; nestOrIndex += 1) {
                  parameters += "&value" + index + "=" + nestValues[nestOrIndex];
                }

                index += 1;
              } else {
                throw new Error("Unexpected query structure");
              }
            }
          } else {
            throw new Error("Unexpected query structure");
          }
        }
      }
    } else {
      for (key in query) {
        if (parameters.length > 0) {
          parameters += "&";
        }

        if (typeof query[key] === "string") {
          parameters += "key" + index + "=" + key;
          parameters += "&op" + index + "=eq";
          parameters += "&value" + index + "=" + query[key];

          index += 1;
        } else if (query[key] instanceof Array) {
          orIndex = 0;
          values = query[key];

          parameters += "key" + index + "=" + key;
          parameters += "&op" + index + "=eq";
          
          for (; orIndex < values.length; orIndex += 1) {
            parameters += "&value" + index + "=" + values[orIndex];
          }

          index += 1;
        } else if (typeof query[key] === "object" && typeof query[key] !== null) {
          for (op in query[key]) {
            if (typeof query[key][op] === "string") {
              parameters += "key" + index + "=" + key;
              parameters += "&op" + index + "=" + op;
              parameters += "&value" + index + "=" + query[key][op];

              index += 1;
            } else if (query[key][op] instanceof Array) {
              nestOrIndex = 0;
              nestValues = query[key][op];
              parameters += "key" + index + "=" + key;
              parameters += "&op" + index + "=" + op;

              for (; nestOrIndex < nestValues.length; nestOrIndex += 1) {
                parameters += "&value" + index + "=" + nestValues[nestOrIndex];
              }

              index += 1;
            } else {
              throw new Error("Unexpected query structure");
            }
          }
        } else {
          throw new Error("Unexpected query structure");
        }
      }
    }

    return parameters;
  }

})(typeof exports === "undefined" ? window.bloomjs = {} : exports);
