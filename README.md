BloomJS
=======

A browser-based and node.js client to [BloomAPI](http://www.bloomapi.com).

# Setup

The following are steps to get BloomJS into your javascript-based project.

## Browser
Place `dist/bloom.min.js` from the GitHub project or install it with bower (`bower install bloomjs`) into your project in a location accessible from the web. Include it in your site with a script tag

    <script src="js/bloom.min.js"></script>

## Node.js

    npm install bloom-js

Use it in your node project via

    var bloomjs = require('bloom-js');
    
# Client API

**Create New Client**

`bloomjs.Client(<API Key OR options>);`

* Returns: BloomJS Client Object
* `API Key` BloomAPI access key
* `options` object can have the follow parameters
  * `url` root url of BloomAPI (e.g. http://www.bloomapi.com/api)
  * `apiKey` API Key

###BloomJS Client Object

`bloomClient.sources(<callback>)`
* Returns nothing
* `callback` a function that will be called once results retrieved. Paramters to callback include
  * `error` an object that is set if something went wrong
  * `response` an array of sources available

`bloomClient.search(<source>, <search params>, <options>, <callback>)`

* Returns nothing
* `source` is a string that matches a BloomAPI data source name (e.g. 'usgov.hhs.npi')
* `search params` is a object that represnts a query. See *Example Usage* for expected object structure. *Optional*
* `options` object with options to pass through that are not search params (e.g. 'offset' and 'limit') *Optional*
* `callback` a function that will be called once results retrieved. Parameters to callback include
  *  `error` an object that is set if something went wrong
  *  `response` an array of results found given query
  *  `info` additional information on the query/ response. Currently includes `meta` which is the metadata from the response (e.g. `rowCount` and `messages`)

`bloomClient.find(<source>, <id>, <callback>)`
* Returns nothing
* `source` is a string that matches a BloomAPI data source name (e.g. 'usgov.hhs.npi')
* `id` a string that will be used to match the ID of the dataset (e.g. the ten-digit unique NPI or an HCPCS code)
* `callback` a function that will be called once results retrieved. Parameters to callback include
  *  `error` an object that is set if something went wrong
  *  `response` an single result found given id

# Example Usage

The following will work on both the browser (using JSONP behind the scenes) and Node.js:

**Create a new client**

    // Basic
    var bloomClient = new bloomjs.Client();
    
    // If using an API Key
    var bloomClient = new bloomjs.Client('<API Key Here>');
    
    // If using your own server (with or without your own API keys)
    var bloomClient = new bloomjs.Client({
        url: "http://www.bloomapi.com/api",
        apiKey: "<API Key Here>" // Optional
    });

**Query available datasources**

      bloomClient.sources(function (error, response) {
        if (error) return console.log(error.stack);
        var source = response[0];
        console.log('=== First available source');
        console.log('Name: ' + source.source);
        console.log('Last Checked for Updates: ' + source.checked);
      });

**Search the National Provider Identifier (NPI) without parameters**

      bloomClient.search('usgov.hhs.npi', function (error, response, info) {
        if (error) return console.log(error.stack);
        console.log('=== First available NPI');
        console.log('NPI: ' + response[0].npi);
        console.log('Total NPIs: ' + info['meta']['rowCount']);
      });

**Search HCPCS Procedure Codes for the code 'C9289'**

      bloomClient.search('usgov.hhs.hcpcs', {
        'code': 'C9289'
      }, function (error, response) {
        if (error) return console.log(error.stack);
        console.log('=== HCPCS code found');
        console.log('Code: ' + response[0].code);
      });

**Page through search results**

      var bloomjs = require('bloom-js');
      var bloomClient = new bloomjs.Client();

      function searchAll(dataset, query, cb) {
        var offset = 0;

        (function searchMore(aggregate) {
          bloomClient.search(dataset, query, { 'offset': offset, 'limit': 100 }, function (err, data, info) {
            if (err) return cb(err);

            data = data.concat(aggregate);

            if (info.meta.rowCount > data.length) {
              offset += 100;
              searchMore(data);
            } else {
              cb(null, data);
            }
          });
        })([]);
      };

      searchAll('usgov.hhs.npi', {'last_name': 'murillo'}, function (err, results) {
        if (err) console.log(err.stack);
        console.log(results.length);
      });

**Search HCPCS Procedure Codes for any code with word that starts with 'ambula' in the description'**
This also specifies an offset and limit using the options parameter.

      bloomClient.search('usgov.hhs.hcpcs', {
          'long_description': {
            'prefix': 'ambula'
          }
        }, {
          'offset': 0,
          'limit': 10
        }, function (error, response) {
          if (error) return console.log(error.stack);
          console.log('=== HCPCS code starting with ambula');
          console.log('Code: ' + response[0].code);
        });

**Search for HCPCS codes with both the prefix 'ambula' and another word 'emer'**

      bloomClient.search('usgov.hhs.hcpcs', [
          {
            'long_description': { 'prefix': 'ambula' }
          },
          {
            'long_description': { 'prefix': 'emer' }
          }
        ], function (error, response, info) {
          if (error) return console.log(error.stack);
          console.log('=== HCPCS code starting with ambula AND emer');
          console.log('Code: ' + response[0].code);
        });

**Search HCPCS for both code 'L8410' and 'C9289' (Logical OR)**

      bloomClient.search('usgov.hhs.hcpcs', {
        'code': ['L8410', 'C9289']
      }, function (error, response) {
        if (error) return console.log(error.stack);
        console.log('=== HCPCS code with codes L8410 or C9289');
        console.log('Code: ' + response[0].code);
        console.log('Code: ' + response[1].code);
      });

**Find a National Provider Identifier its NPI**

    bloomClient.find('usgov.hhs.hcpcs', 1770707127, function (error, response) {
        if (error) return console.log(error.stack);
        console.log('=== NPI details for 1770707127');
        console.log('NPI: ' + response.npi);
    });
