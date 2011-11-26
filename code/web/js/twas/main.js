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
        var $this = this;
        $(document).ready(function () {
            $this.setupModels();
            $this.setupViews();
            $this.setupFeeds();
        });
        return this;
    },

    setupModels: function () {
        this.sync = new S3Sync(_.defaults({
            prefix: 'activities/'
        }, this.config)).bind();

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
            return new cls[o.type](_.defaults(o, def_opts, $this.config));
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
