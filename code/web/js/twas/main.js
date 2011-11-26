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
        var $this = this;

        this.sync = (new S3Sync({
            key_id: this.config.key_id,
            secret_key: this.config.secret_key,
            bucket: this.config.bucket,
            prefix: 'activities/',
            debug: this.config.debug
        })).bind();

        Activity.prototype.sync = this.sync;
        ActivityCollection.prototype.sync = this.sync;

        this.activities = new ActivityCollection();

        this.app_view = new TWAS_Views_App({
            activities: this.activities
        });
        
        var base_feed_opts = {
            activities: this.activities,
            key_id: this.config.key_id,
            secret_key: this.config.secret_key,
            bucket: this.config.bucket,
            prefix: '',
            debug: this.config.debug
        };

        this.feeds = [
            new TWAS_Feeds_JSON(_.defaults({
                name: 'feeds/activities.json',
                content_type: 'application/json; charset=UTF-8',
            }, base_feed_opts)),
            new TWAS_Feeds_Templated(_.defaults({
                name: 'feeds/activities.rss',
                content_type: 'application/rss+xml; charset=UTF-8',
                template: 'templates/activities.rss.tmpl'
            }, base_feed_opts)),
            new TWAS_Feeds_Templated(_.defaults({
                name: 'feeds/activities.atom',
                content_type: 'application/atom+xml; charset=UTF-8',
                template: 'templates/activities.atom.tmpl'
            }, base_feed_opts)),
            new TWAS_Feeds_Templated(_.defaults({
                name: 'index.html',
                content_type: 'text/html; charset=UTF-8',
                template: 'templates/index.html.tmpl'
            }, base_feed_opts))
        ];
        
        var feed_publish = _(function () {
            _.each(this.feeds, function (feed) {
                feed.publish();
            });
        }).bind(this);

        this.activities.bind('change', feed_publish);
        this.activities.bind('delete', feed_publish);

    },

    EOF:null

}.init();
