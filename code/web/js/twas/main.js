//
//
//

var TWAS_main = {

    config: {
        key_id: localStorage.getItem('AWS_KEY_ID'),
        secret_key: localStorage.getItem('AWS_SECRET_KEY'),
        bucket: 'twas',
        debug: true
    },

    init: function () {
        $(document).ready(_(this.ready).bind(this));
        return this;
    },

    ready: function () {
        this.setupModels();
        this.setupViews();
        this.setupFeeds();
    },

    setupModels: function () {
        this.sync = (new S3Sync(_.defaults({
            prefix: 'activities/'
        }, this.config))).bind();

        Activity.prototype.sync = this.sync;
        ActivityCollection.prototype.sync = this.sync;

        this.activities = new ActivityCollection();
    },

    setupViews: function () {
        this.app_view = new TWAS_Views_App({
            activities: this.activities
        });
    },

    setupFeeds: function () {
        var $this = this;

        var feed_cls = {
            json: TWAS_Feeds_JSON,
            tmpl: TWAS_Feeds_Templated
        };
        this.feeds = _.map([
            { type: 'json',
                name: 'feeds/activities.json',
                content_type: 'application/json; charset=UTF-8' },
            { type: 'tmpl',
                name: 'feeds/activities.rss',
                content_type: 'application/rss+xml; charset=UTF-8',
                template: 'templates/activities.rss.tmpl' },
            { type: 'tmpl',
                name: 'feeds/activities.atom',
                content_type: 'application/atom+xml; charset=UTF-8',
                template: 'templates/activities.atom.tmpl' },
            { type: 'tmpl',
                name: 'index.html',
                content_type: 'text/html; charset=UTF-8',
                template: 'templates/index.html.tmpl' }
        ], function (o) {
            return new feed_cls[o.type](_.defaults(o, {
                activities: $this.activities,
                defeat_cache: false,
                prefix: '',
            }, $this.config));
        });
        
        var pf = _.bind(this.publishFeeds, this)
        this.activities.bind('change', pf);
        this.activities.bind('destroy', pf);
    },

    publishFeeds: function () {
        _.each(this.feeds, function (f) {
            f.publish();
        });
    },

    EOF:null

}.init();
