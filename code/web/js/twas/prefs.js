var TWAS_Prefs = function () {
    return this.init.apply(this, arguments);
};
_.extend(TWAS_Prefs.prototype, Backbone.Events, {

    defaults: {
        prefix: 'prefs/'
    },

    init: function (options) {
        this.setOptions(options);
        this.data = {};
    },

    setOptions: function (options) {
        _.extend(this, this.defaults, options);
        this.options = options;
        this.s3 = new S3Ajax(options);
        this.trigger('options', this, options);
        return this;
    },
    
    authenticate: function (username, password) {
        this.username = username;
        this.password = password;
        this.trigger('authenticate', username, password);
    },
    
    set: function (key, value) {
        this.data[key] = value;
        this.trigger('set', this, key, value);
    },
    
    get: function (key, def) {
        var v = this.data[key];
        return _.isUndefined(v) ? def : v;
    },
    
    key: function () {
        return this.prefix + hex_sha1(this.username);
    },
    
    store: function (success, error) {
        var $this = this,
            key = this.key(),
            content = GibberishAES.enc(
                JSON.stringify(this.data),
                this.password
            );
        this.s3.put(
            this.bucket, key, content,
            { content_type: 'text/plain; charset=UTF-8' },
            function () {
                $this.trigger('store', $this);
                success()
            }, 
            error
        );
    },
    
    fetch: function (success, error) {
        var $this = this,
            key = this.key();
        this.s3.get(
            this.bucket, key,
            function (resp, obj) {
                var content = GibberishAES.dec(
                    resp.responseText,
                    $this.password
                );
                try {
                    $this.data = JSON.parse(content);
                } catch (e) {
                    $this.data = {};
                }
                $this.trigger('fetch', $this);
                success($this.data);
            },
            error
        );
    },

    destroy: function (success, error) {
        var $this = this,
            key = this.key();
        this.s3.deleteKey(
            this.bucket, key,
            function () {
                $this.trigger('destroy', this);
                success();
            }, 
            error
        );
    }

});
