//
//
//

var TWAS_AppView = Backbone.View.extend({
    el: $('body#post-app'),
    tagName: 'body',
    
    events: {
    },

    initialize: function (options) {
        this.options = _.extend({
            activities: null
        }, options || {});
        this.activity_form = new TWAS_ActivityForm({
            appview: this,
            activities: this.options.activities
        });
        this.activities_section = new TWAS_ActivitiesSection({
            appview: this,
            activities: this.options.activities
        });
    }

});

var TWAS_ActivityForm = Backbone.View.extend({
    el: $('form#activity'),
    tagName: 'form',
    
    events: {
        'submit': 'commit',
        'click button.post': 'commit',
        'click button.reset': 'reset',
    },
    
    initialize: function (options) {
        this.options = _.extend({
            appview: null
        }, options || {});
    },

    alert: function(msg) {
        // window.alert(msg);
        console.log("ACHTUNG! " + msg);
    },
    
    commit: function () {
        var $this = this;
        var new_post = this.options.activities.create({
            actor: {
                url: this.$('#actor_url').val(),
                displayName: this.$('#actor_displayName').val()
            },
            verb: this.$('#verb').val(),
            object: {
                type: this.$('#object_type').val(),
                displayName: this.$('#object_displayName').val(),
                content: this.$('#object_content').val()
            }
        },{
            success: function (o, r) {
                console.log("POSTED!", o);
                $this.alert("Activity posted");
                $this.reset();
            },
            error: function (o, r) {
                $this.alert("Error posting activity");
            }
        });
        return false;
    },

    reset: function () {
    }

});

var TWAS_ActivitiesSection = Backbone.View.extend({
    el: $('section#activities'),
    tagName: 'section',
    
    events: {
    },
    
    initialize: function (options) {
        var $this = this;

        this.options = _.extend({
            appview: null
        }, options || {});

        this.appview = this.options.appview;
        this.activities = this.appview.options.activities;

        _(['all', 'reset', 'add']).each(function (name) {
            $this.activities.bind(name,
                _($this['activities_'+name]).bind($this));
        });

        this.activities.fetch();
    },

    clearActivities: function () {
        var stream_el = this.$('.stream');
        stream_el.empty();
    },

    appendActivity: function (activity) {
        var stream_el = this.$('.stream'),
            object = activity.get('object'),
            url = activity.url();
        stream_el.prepend([
            '<li><a href="content/prod/', url, '">',
            activity.get('object').displayName, 
            '</a></li>'
        ].join(''));
    },

    activities_all: function (ev_name) {
        console.log("LIST EVENT", arguments);
    },

    activities_reset: function (collection) {
        var $this = this;
        this.clearActivities();
        collection.each(function (activity) {
            $this.appendActivity(activity);
        });
    },

    activities_add: function (activity) {
        this.appendActivity(activity);
    },


    EOF:null

});
