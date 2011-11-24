//
//
//

var TWAS_main = {

    activities: null,

    init: function () {
        var $this = this;
        $(document).ready(function () {
            $this.installSync();
            $this.app_view = new TWAS_AppView({
                activities: $this.activities
            });
        });
        return this;
    },

    installSync: function () {
        
        this.sync = (new S3Sync({
            key_id: localStorage.getItem('AWS_KEY_ID'),
            secret_key: localStorage.getItem('AWS_SECRET_KEY'),
            bucket: 'twas',
            prefix: 'content/prod/',
            debug: true
        })).bind();
        
        Activity.prototype.sync = this.sync;
        ActivityCollection.prototype.sync = this.sync;

        if (!this.activities) {
            this.activities = new ActivityCollection();
        }
        this.activities.sync = this.sync;

    },

    EOF:null

}.init();
