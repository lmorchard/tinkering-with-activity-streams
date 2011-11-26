//
//
//
var TWAS_Feeds_Base = function () {
    return this.init.apply(this, arguments);
};
_.extend(TWAS_Feeds_Base.prototype, {
    defaults: {
        key_id: '',
        secret_key: '',
        bucket: 'twas',
        prefix: 'feeds/',
        debug: true
    },
    name: 'feed.txt',
    content_type: 'text/plain; charset=UTF-8',
    init: function (options) {
        this.options = options;
        this.s3 = new S3Ajax(options);
        _.extend(this, this.defaults, options);
    },
    publish: function (success, error) {
        var $this = this;
        $this.fetch(function (coll, items) {
            $this.render(coll, items, function (content) {
                $this.s3.put(
                    $this.bucket, $this.prefix + $this.name, content,
                    { content_type: $this.content_type },
                    success, error
                );
            }, error);
        }, error);
    },
    fetch: function (success, error) {
        /*
        var activities = new ActivityCollection();
        activities.sync = this.activities.sync;
        activities.fetch({
            limit: 15,
            success: success,
            error: error
        });
        */
        success(this.activities);
    },
    render: function (coll, items, success, error) {
        success('');
    }
});

var TWAS_Feeds_JSON = function () {
    return this.init.apply(this, arguments);
};
_.extend(TWAS_Feeds_JSON.prototype, TWAS_Feeds_Base.prototype, {
    name: 'feeds/activities.json',
    content_type: 'application/json; charset=UTF-8',
    render: function (coll, items, success, error) {
        var items = coll.chain().last(15).map(function (item) {
            return item.toJSON();
        }).value();
        items.sort(function (a, b) {
            return b.published.localeCompare(a.published);
        });
        var as = { 
            items: items
        };
        success(JSON.stringify(as));
    }
});

var TWAS_Feeds_Templated = function () {
    return this.init.apply(this, arguments);
};
_.extend(TWAS_Feeds_Templated.prototype, TWAS_Feeds_Base.prototype, {
    template: 'templates/activities.rss.tmpl',
    init: function (options) {
        TWAS_Feeds_Base.prototype.init.call(this, options);
        var $this = this;
        this.s3.get(
            this.bucket, this.template,
            function (resp, obj) {
                $this.template_compiled = _.template(resp.responseText);
            },
            function () {
                $this.template_compiled = _.template("ERROR");
            }
        );
    },
    render: function (coll, items, success, error) {
        var items = coll.chain().last(15).value();
        items.sort(function (a, b) {
            return b.get('published').localeCompare(a.get('published'));
        });
        success(this.template_compiled({ items: items }));
    }
});
