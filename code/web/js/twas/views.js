//
//
//

var TWAS_Views_App = Backbone.View.extend({
    el: $('body#post-app'),
    tagName: 'body',
    
    events: {
    },

    initialize: function (options) {
        this.activities = options.activities;
        this.activity_form = new TWAS_Views_ActivityForm({
            appview: this, activities: this.activities
        });
        this.activities_section = new TWAS_Views_ActivitiesSection({
            appview: this, activities: this.activities
        });
    }

});

var TWAS_Views_ActivityForm = Backbone.View.extend({
    el: $('form#activity'),
    tagName: 'form',
    
    events: {
        'submit': 'commit',
        'click button.post': 'commit',
        'click button.reset': 'reset',
    },
    
    initialize: function (options) {
        this.appview = options.appview;
        this.activities = this.appview.activities;
    },

    alert: function(msg) {
        console.log("ACHTUNG! " + msg);
    },
    
    commit: function () {
        var $this = this;
        var new_post = this.activities.create({
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

var TWAS_Views_ActivitiesSection = Backbone.View.extend({
    el: $('section#activities'),
    tagName: 'section',
    
    events: {
    },
    
    initialize: function (options) {
        var $this = this;

        this.appview = options.appview;
        this.activities = this.appview.activities;

        _(['all', 'reset', 'add']).each(function (name) {
            $this.activities.bind(name,
                _($this['activities_'+name]).bind($this));
        });

        this.activities.fetch();
    },

    clearActivities: function () {
        this.$('.stream').empty();
    },

    appendActivity: function (activity) {
        var view = new TWAS_Views_Activity({
            parent: this,
            activity: activity
        });
        this.$('.stream').prepend(view.make());
    },

    activities_all: function (ev_name) {
        console.log("LIST EVENT", arguments);
    },

    activities_add: function (activity) {
        this.appendActivity(activity);
    },

    activities_reset: function (collection) {
        var $this = this;
        this.clearActivities();
        collection.each(function (activity) {
            $this.appendActivity(activity);
        });
    }

});

var TWAS_Views_Activity = Backbone.View.extend({
    tagName: 'li',

    template: _.template([
        '<li id="activity-<%=id%>" class="activity">',
            '<button class="delete">Delete</button>',
            '<button class="edit">Edit</button>',
            '<a href="<%=url%>"><%=object.displayName%></a>',
        '</li>'
    ].join('')),

    events: {
        'click .edit': 'edit',
        'click .delete': 'destroy'
    },

    initialize: function (options) {
        var $this = this;
        this.parent = options.parent;
        this.activity = options.activity;
        _(['all', 'change', 'remove']).each(function (name) {
            $this.activity.bind(name,
                _($this['activity_'+name]).bind($this));
        });
    },

    make: function () {
        this.el = $('<'+this.tagName+'/>');
        this.el.data('view', this);
        this.render();
        this.delegateEvents();
        return this.el;
    },

    render: function () {
        if (!this.activity) { return; }
        var data = this.activity.toJSON();
        data.url = this.activity.url();

        var ct = this.template(data);
        $(this.el).html(ct);
        return this;
    },

    activity_all: function (ev_name) {
        console.log("ACT EV", arguments);
    },
    activity_change: function (activity) { this.render(); },
    activity_remove: function (activity) { this.el.remove(); },

    edit: function () {
        return false;
    },

    destroy: function () {
        this.activity.destroy();
        return false;
    }

});
