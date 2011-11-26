//
//
//

var TWAS_main = {

    init: function () {
        var $this = this;
        this.prefs = new TWAS_Prefs();
        $(document).ready(function () {
            $this.setupModels();
            $this.setupViews();
            $this.setupFeeds();
        });
        return this;
    },

    updateSync: function () {
    },

    setupModels: function () {
        var $this = this;

        this.sync = new S3Sync({
            prefix: 'activities/'
        });
        _.each(['set', 'fetch'], function (n) {
            $this.prefs.bind(n, function () {
                $this.sync.setOptions({
                    bucket: $this.prefs.bucket,
                    key_id: $this.prefs.get('key_id'),
                    secret_key: $this.prefs.get('secret_key'),
                    prefix: 'activities/'
                });
            });
        });

        var sync_fn = this.sync.bind();
        Activity.prototype.sync = sync_fn;
        ActivityCollection.prototype.sync = sync_fn;

        this.activities = new ActivityCollection();
    },

    setupViews: function () {
        this.app_view = new TWAS_Views_App({
            prefs: this.prefs,
            activities: this.activities
        });
        window.app_view = this.app_view;
    },

    setupFeeds: function () {
        var $this = this;

        // Build a convenience mapping to feed generator classes.
        var cls = {
            json: TWAS_Feeds_JSON,
            tmpl: TWAS_Feeds_Templated
        };

        // Defaults for each feed generator.
        var def_opts = {
            activities: this.activities,
            defeat_cache: false,
            prefix: ''
        };

        // Feed generator options
        var feed_opts = [
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
        ];

        // Build all the static feed generators.
        this.feeds = _.map(feed_opts, function (o) {
            var feed = new cls[o.type](_.defaults(o, def_opts, $this.config));
            _.each(['set', 'fetch'], function (n) {
                $this.prefs.bind(n, function () {
                    feed.setOptions({
                        bucket: $this.prefs.bucket,
                        key_id: $this.prefs.get('key_id'),
                        secret_key: $this.prefs.get('secret_key'),
                        prefix: ''
                    });
                });
            });
            return feed;
        });

        // Publish all feeds when an activity is added, changed, or destroyed.
        var pf = _.bind(this.publishFeeds, this);
        _.each(['add', 'change', 'destroy'], function (n) {
            $this.activities.bind(n, pf);
        });
    },

    publishFeeds: function () {
        _.each(this.feeds, function (f) {
            f.publish();
        });
    },

    EOF:null

}.init();
