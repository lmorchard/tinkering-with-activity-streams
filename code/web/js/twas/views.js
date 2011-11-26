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

    editActivity: function (a) {
        this.activity = a;
        
        var actor = a.get('actor');
        this.$('#actor_url').val(actor.url);
        this.$('#actor_displayName').val(actor.displayName);
        
        this.$('#verb').val(a.get('verb'));

        var object = a.get('object');
        this.$('#object_type').val(object.type);
        this.$('#object_displayName').val(object.displayName);
        this.$('#object_content').val(object.content);
    },
    
    commit: function () {
        var $this = this;
        var data = {
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
        };
        var options = {
            success: function (o, r) {
                $this.alert("Activity saved");
                $this.reset();
            },
            error: function (o, r) {
                $this.alert("Error posting activity");
            }
        };
        if (!this.activity) {
            this.activities.create(data, options);
        } else {
            this.activity.save(data, options);
        }
        return false;
    },

    reset: function () {
        this.activity = null;
        this.$('#actor_url').val('');
        this.$('#actor_displayName').val('');
        this.$('#verb').val('');
        this.$('#object_type').val('');
        this.$('#object_displayName').val('');
        this.$('#object_content').val('');
        return false;
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

        this.activities.fetch({ limit: 15 });
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
        this.el = $('#activity-template').clone();
        this.el.data('view', this);
        this.render();
        this.delegateEvents();
        return this.el;
    },

    render: function () {
        var a = this.activity;
        if (!a) { return; }

        this.el.attr('id', 'activity-' + a.get('id'));
        this.$('.published').text(a.get('published'));

        var o = a.get('object');
        this.$('.object')
            .find('.displayName')
                .attr('href', a.url())
                .text(o.displayName)
            .end()
            .find('.content')
                .html(o.content)
            .end();

        return this;
    },

    edit: function () {
        var form = this.parent.appview.activity_form;
        form.editActivity(this.activity);
        return false;
    },

    destroy: function () {
        this.activity.destroy();
        return false;
    },

    activity_all: function (ev_name) {
        console.log("ACT EV", arguments);
    },

    activity_change: function (activity) {
        this.render();
    },

    activity_remove: function (activity) { 
        this.el.remove();
    }

});
