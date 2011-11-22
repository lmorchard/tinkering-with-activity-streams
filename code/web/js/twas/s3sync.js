//
// Amazon S3 sync backend for Backbone
//

function S3Sync () {
    return this.init.apply(this, arguments);
}

S3Sync.prototype = {

    defaults: {
        bucket: 'decafbad',
        prefix: 'content/',
        debug: false,
        concurrent_gets: 8
    },

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

    bind: function () {
        var fn = _.bind(this.sync, this);
        fn.instance = this;
        return fn;
    },

    sync: function (method, model, options) {
        if ('function' == typeof (this['sync_'+method])) {
            if (this.debug) { console.log("METHOD " + method); }
            return this['sync_'+method](model, options);
        }
    },

    _parseResp: function (resp) {
        return JSON.parse(resp.responseText);
    },

    sync_read: function (model, options) {
        if ('model' in model) {
            return this.sync_readCollection(model, options);
        } else {
            return this.sync_readModel(model, options);
        }
    },

    sync_readModel: function (model, options) {
        if (this.debug) { console.log('readModel'); }
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

    sync_readCollection: function (collection, options) {
        if (this.debug) { console.log('readCollection'); }
        var $this = this;
        this.s3.listKeys(
            this.bucket, {prefix: this.prefix},
            function (req, obj) {
                var items = obj.ListBucketResult.Contents,
                    objs = [];
                var q = async.queue(function (item, next) {
                    $this.s3.get(
                        $this.bucket, item.Key, 
                        function (resp, obj) {
                            objs.push($this._parseResp(resp));
                            next();
                        }
                    );
                }, $this.concurrent_gets);
                q.drain = function () {
                    options.success(objs);
                };
                _.each(items, function (item) { 
                    q.push(item); 
                });
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
    },

    EOF:null
};
