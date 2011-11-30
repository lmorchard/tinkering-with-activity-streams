//
//
//

var TWAS_Views_App = Backbone.View.extend({

    events: {
        'click button.logout': 'logout',
        'click button.destroyPrefs': 'destroyPrefs'
    },
    
    initialize: function (options) {
        this.el = options.el;
        this.prefs = options.prefs;
        this.activities = options.activities;

        this.setupViews();
        this.setupEvents();

        var credentials = localStorage.getItem('credentials');
        if (credentials) {
            this.login_form.onValid({
                data: JSON.parse(credentials)
            });
        }
    },

    setupViews: function () {
        this.el.removeClass('logged-in');
        this.login_form = new TWAS_Views_LoginForm({
            parent: this, el: this.$('form.login'),
        });
        this.register_form = new TWAS_Views_RegisterForm({
            parent: this, el: this.$('form.register'),
        });
        this.activity_form = new TWAS_Views_ActivityForm({
            parent: this, el: this.$('form.activity'),
        });
        this.activities_section = new TWAS_Views_ActivitiesSection({
            parent: this, el: this.$('section.activities'),
        });
    },

    setupEvents: function () {
        var $this = this,
            p = this.prefs,
            login = _.bind(this.login, this);
        _.each({
            'fetch': login,
            'store': login,
            'error:fetch': function () {
                $this.alert("Problem logging in!");
                localStorage.removeItem('credentials');
            },
            'error:store': function () {
                $this.alert("Problem registering!");
            },
            'error:destroy': function () {
                $this.alert("Problem destroying account!");
            }
        }, function (cb, name) { 
            $this.prefs.bind(name, cb); 
        });
    },

    login: function () {
        this.el.addClass('logged-in');
        this.login_form.reset();
        this.register_form.reset();
    },

    logout: function () {
        this.el.removeClass('logged-in');
        localStorage.removeItem('credentials');
        this.prefs.reset();
        return false;
    },

    destroyPrefs: function (ev) {
        var $this = this;
        if (!window.confirm("Destroy account? Are you sure?")) {
            return false;
        }
        console.dir(this.prefs.data);
        this.prefs.destroy(function () {
            $this.logout();
        });
        return false;
    },
    
    alert: function(msg) {
        window.alert(msg);
        console.log("ACHTUNG! " + msg);
    }
});

var TWAS_Views_Form = Backbone.View.extend({
    initialize: function (options) {
        this.parent = options.parent;
        this.prefs = options.parent.prefs;
    },
    reset: function () {
        this.el.find('*[name]').each(function (i, raw) {
            $(raw).val('');
        });
    },
    validate: function () {
        var $this = this;
        var rv = {
            is_valid: true,
            errors: {},
            data: {}
        };
        this.el.find('*[name]').each(function (i, raw) {
            var field = $(raw),
                parent = field.parent(),
                name = field.attr('name'),
                type = field.attr('type'),
                value,
                is_valid = true;
            parent.removeClass('error');
            if ('checkbox' == type) {
                value = !!field.attr('checked');
            } else {
                value = field.val();
            }
            if (field.attr('required') && !value) {
                is_valid = false;
            }
            if (field.attr('data-confirm')) {
                var c_name = field.attr('data-confirm'),
                    c_field = $this.el.find('*[name='+c_name+']'),
                    c_value = c_field.val();
                if (c_value !== value) {
                    c_field.parent().addClass('error');
                    is_valid = false;
                }
            }
            if (!is_valid) {
                rv.is_valid = false;
                rv.errors[name] = true;
                parent.addClass('error');
            }
            rv.data[name] = value;
        });
        return rv;
    },
    submit: function (ev) {
        var rv = this.validate();
        if (!rv.is_valid) {
            return this.onError(rv);
        } else {
            return this.onValid(rv);
        }
    },
    onError: function (rv) {
        return false;
    },
    onValid: function (rv) {
        return false;
    }
});

var TWAS_Views_LoginForm = TWAS_Views_Form.extend({
    events: {
        'submit': 'submit',
        'click button.login': 'submit'
    },
    onValid: function (rv) {
        var data = rv.data;
        if (data.remember) {
            localStorage.setItem('credentials', JSON.stringify(data));
        }
        this.prefs.setOptions({
            bucket: data.bucket,
            username: data.username,
            password: data.password
        });
        this.prefs.fetch();
        return false;
    }
});

var TWAS_Views_RegisterForm = TWAS_Views_Form.extend({
    events: {
        'submit': 'submit',
        'click button.register': 'submit'
    },
    onValid: function (rv) {
        var data = rv.data;
        this.prefs.setOptions({
            bucket: data.bucket,
            username: data.username,
            password: data.password,
            key_id: data.key_id,
            secret_key: data.secret_key
        });
        this.prefs.set({
            key_id: data.key_id,
            secret_key: data.secret_key,
        });
        this.prefs.store();
        return false;
    }
});

var TWAS_Views_ActivityForm = Backbone.View.extend({
    events: {
        'submit': 'commit',
        'click button.post': 'commit',
        'click button.reset': 'reset'
    },
    
    initialize: function (options) {
        this.el = options.el;
        this.parent = options.parent;
        this.activities = this.parent.activities;
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
                $this.reset();
            },
            error: function (o, r) {
                $this.parent.alert("Error posting activity");
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
    events: {
        'click button.refresh': 'refresh'
    },
    
    initialize: function (options) {
        var $this = this;

        this.el = options.el;
        this.parent = options.parent;
        this.activities = this.parent.activities;

        _.each(['all', 'reset', 'add'], function (name) {
            $this.activities.bind(name,
                _($this['activities_'+name]).bind($this));
        });
    },

    refresh: function () {
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
        var form = this.parent.parent.activity_form;
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
