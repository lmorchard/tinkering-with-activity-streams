//
// Amazon S3 sync backend for Backbone
//

// Constructor
function S3Sync () {
    return this.init.apply(this, arguments);
}

S3Sync.prototype = {

    // Default options
    defaults: {
        bucket: 'decafbad',
        prefix: 'content/',
        debug: false,
        fetch_concurrency: 8
    },

    // Initialize object with options and an S3 instance.
    init: function (options) {
        this.options = options;
        this.s3 = new S3Ajax(options);
        for (var k in this.defaults) {
            if (this.defaults.hasOwnProperty(k)) {
                this[k] = (typeof(options[k]) !== 'undefined') ?
                    options[k] : this.defaults[k];
            }
        }
        return this;
    },

    // Bind a sync function for use by Backbone that uses this instance.
    bind: function () {
        var fn = _.bind(this.sync, this);
        fn.instance = this;
        return fn;
    },

    // Sync interface function to this instance.
    sync: function (method, model, options) {
        var fn = this['sync_'+method];
        if ('function' == typeof(fn)) {
            return fn.call(this, model, options);
        }
    },

    // Parse the JSON from an HTTP response.
    _parseResp: function (resp) {
        return JSON.parse(resp.responseText);
    },

    // Handle a sync read, for collection or model.
    sync_read: function (model, options) {
        if ('model' in model) {
            return this.sync_readCollection(model, options);
        } else {
            return this.sync_readModel(model, options);
        }
    },

    // Handle a sync read for a model.
    sync_readModel: function (model, options) {
        var $this = this,
            key = this.prefix + model.url();
        this.s3.get(
            this.bucket, key,
            function (resp, obj) {
                options.success($this._parseResp(resp));
            },
            function (req) { options.error(req); }
        );
    },

    // Handle a sync read for a collection.
    // TODO: Accept more filtering parameters
    sync_readCollection: function (collection, options) {
        var $this = this,
            sub_prefix = options.prefix || '';

        // List the keys for the collection's prefix...
        this.s3.listKeys(
            this.bucket, {prefix: this.prefix + sub_prefix},
            function (req, obj) {

                // Collect keys into an async processing queue....
                var items = obj.ListBucketResult.Contents,
                    objs = [];

                var q = async.queue(function (item, done) {
                    // Each key is processed with a simple fetch.
                    $this.s3.get(
                        $this.bucket, item.Key, 
                        function (resp, obj) {
                            objs.push($this._parseResp(resp));
                            done();
                        }
                    );
                }, $this.fetch_concurrency);

                // When the queue is drained, success is ours.
                q.drain = function () { options.success(objs); };

                // Finally, load the queue up with the listed items.
                _.each(items, function (item) { q.push(item); });

            },
            function (req) { options.error(req); }
        );
    },

    sync_create: function (model, options) {
        var data = model.toJSON(),
            content = JSON.stringify(data),
            key = this.prefix + model.url();
        this.s3.put(
            this.bucket, key, content, 
            { content_type: 'application/json; charset=UTF-8' }, 
            function (req, obj) { options.success(model, data); }, 
            function (req, obj) { options.error(model, data); }
        );
    },

    sync_update: function (model, options) {
        var data = model.toJSON(),
            content = JSON.stringify(data),
            key = this.prefix + model.url();
        this.s3.put(
            this.bucket, key, content, 
            { content_type: 'application/json; charset=UTF-8' }, 
            function (req, obj) { options.success(model, data); }, 
            function (req, obj) { options.error(model, data); }
        );
    },

    sync_delete: function (model, options) {
        var key = this.prefix + model.url();
        this.s3.deleteKey(
            this.bucket, key,
            function (req, obj) { options.success(model, req); }, 
            function (req, obj) { options.error(model, req); }
        );
    }

};
