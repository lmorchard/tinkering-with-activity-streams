var _ = require('underscore'),
    util = require('util'),
    timers = require('timers'),
    winston = require('winston'),
    url = require('url'),
    http = require('http'),
    https = require('https'),
    cradle = require('cradle'),
    async = require('async'),
    argv = require('optimist').argv;
    
require('bufferjs/concat');

var Play = ({

    DATABASE_NAME: 'twas',
    QUEUE_CONCURRENCY: 32,
    BUFFER_SIZE: 100 * 1024,
    FETCH_MAX_AGE: 1 * 60 * 60 * 1000,

    init: function () {
        var $this = this;

        $this.db = new(cradle.Connection)().database($this.DATABASE_NAME);
        
        $this.logger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({
                    //level: 'info',
                    level: 'debug',
                    colorize: true 
                })
            ]
        });
        $this.logger.cli();
        $this.logger.setLevels(winston.config.syslog.levels);

        $this.fetch_queue = async.queue(
            _.bind($this.fetchOneFeed, $this), 
            $this.QUEUE_CONCURRENCY
        );

        $this.logger.debug('Fetching subscriptions...');
        $this.db.view('main/FeedSubscription-all', 
            function (err, results) {
                $this.logger.info(results.length + ' subscriptions fetched.');
                for (var i=0,result; result=results[i]; i++) {
                    var sub = result.value;
                    $this.fetch_queue.push(sub);
                }
            });

        return this;
    },

    fetchOneFeed: function (sub, next) {
        var $this = this,
            now = (new Date()).getTime(),
            hr_doc_type = 'HttpResource',
            hr_doc_id = hr_doc_type + ':' + sub.url;

        // Grab the results of the hrious fetch from DB, if any.
        $this.db.get(hr_doc_id, function (err, hr) {

            // Ensure resource data, creating it from defaults if necessary.
            hr = _.extend({
                _id: hr_doc_id,
                doc_type: hr_doc_type,
                url: sub.url,
                headers: {},
                last_error: null,
                last_fetch_time: 0
            }, hr || {});

            // Check whether this resource was fetched too recently to 
            // fetch again.
            if (!hr.last_error &&
                    (now - sub.last_fetch_time) < $this.FETCH_MAX_AGE) {
                // $this.logger.debug("SKIP " + sub.url);
                return next();
            }
            hr.last_fetch_time = now;
            sub.last_fetch_time = now;

            // Set up request headers for conditional GET, if the right
            // headers from last fetch are available.
            var headers = {};
            if ('last-modified' in hr.headers) {
                headers['If-Modified-Since'] = hr.headers['last-modified'];
            }
            if ('etag' in hr.headers) {
                headers['If-None-Match'] = hr.headers['etag'];
            }

            // Prepare the HTTP GET request.
            $this.logger.debug("START " + sub.url);
            var parts = url.parse(sub.url),
                is_ssl = (parts.protocol == 'https:'),
                opts = {
                    method: 'GET',
                    host: parts.host,
                    port: parts.port || (is_ssl ? 443 : 80),
                    path: parts.path,
                    headers: headers
                },
                mod = is_ssl ? https : http;

            var req = mod.request(opts, function (res) {

                // Accumulate chunks of response data.
                var chunks = [];
                res.on('data', function (chunk) {
                    chunks.push(chunk);
                });

                // Register handler for request completion.
                res.on('end', function () {
                    $this.logger.info("("+res.statusCode+") GET " + sub.url);

                    if (304 == res.statusCode) {
                        // Skip other updates for 304.
                        hr.last_error = null;
                        return $this.updateRecords(sub, hr, null, next);
                    }

                    hr.status = res.statusCode;
                    hr.headers = res.headers;

                    if (200 == res.statusCode) {
                        hr.last_error = null;
                        var content = Buffer.concat(chunks);
                        return $this.updateRecords(sub, hr, content, next);
                    }

                    // TODO: Handle 3xx redirects.

                    return $this.updateRecords(sub, hr, null, next);
                });

            });

            // Register error handler for HTTP GET request.
            req.on('error', function (e) {
                $this.logger.error("ERROR "+sub.url+" "+e.code+" "+e);
                hr.last_error = ''+e;
                return $this.updateRecords(sub, hr, null, next);
            });

            // Fire off the HTTP GET request.
            req.end();

        });
    },

    // This utility function will be used to update or create the DB
    // record after the HTTP request.
    updateRecords: function (sub, hr, content, next) {
        var $this = this;
        async.waterfall([
            function (wf_next) {
                // First, update the subscription record.
                $this.db.save(sub._id, sub._rev, sub, 
                    function () { wf_next(); });
            },
            function (wf_next) {
                // Second, update or create the resource record.
                if (hr._rev) {
                    $this.db.save(hr._id, hr._rev, hr,
                        function (err, res) { wf_next(); });
                } else {
                    $this.db.save(hr._id, hr,
                        function (err, res) { wf_next(); });
                }
            },
            function (wf_next) {
                // Third, if we have content for the resource, 
                // save an attachment.
                if (!content) { return wf_next(); }
                $this.db.saveAttachment(hr._id, hr._rev, 
                    'body', hr.headers['content-type'],
                    content.toString(),
                    function (err, res) { wf_next(); });
            }
        ], function (err) { next(); });
    },

    EOF:null

}).init();
