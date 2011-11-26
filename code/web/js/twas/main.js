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
        
        var feed_opts = {
            activities: this.activities,
            key_id: this.config.key_id,
            secret_key: this.config.secret_key,
            bucket: this.config.bucket,
            prefix: 'feeds/',
            debug: this.config.debug
        };

        this.as_feed = new TWAS_Feeds_ActivityStream(feed_opts);
        this.rss_feed = new TWAS_Feeds_RSS(feed_opts);
        
        var feed_publish = _(function () {
            this.as_feed.publish();
            this.rss_feed.publish();
        }).bind(this);

        this.activities.bind('change', feed_publish);
        this.activities.bind('delete', feed_publish);

    },

    EOF:null

}.init();
