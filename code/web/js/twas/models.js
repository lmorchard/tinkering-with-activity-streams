//
//
//
var Activity = Backbone.Model.extend({

    defaults: {
        published: '',
        actor: {},
        verb: 'post',
        object: {},
        target: null
    },

    initialize: function (attributes, options) {
        if (!attributes.published) {
            this.set({published: this.isodt()});
        }
        if (!attributes.id) {
            var id = '' +
                (new Date()).getTime() + 
                '-' + 
                parseInt(Math.random()*1000);
            this.set({id: id});
        }
    },

    _pad: function (n) { return n<10 ? '0'+n : n },

    url: function() {
        var base = this.collection.url();
        if (this.isNew()) return base;
        var parts = this.id.split('-'),
            d = new Date(parseInt(parts[0])),
            path = d.getUTCFullYear() + '/'
                + this._pad(d.getUTCMonth()+1) + '/'
                + this._pad(d.getUTCDate());
        return base + '/' + path + '/' + encodeURIComponent(this.id);
    },
    
    isodt: function (d) {
        if (!d) { d = new Date(); }
        return d.getUTCFullYear()+'-'
            + this._pad(d.getUTCMonth()+1)+'-'
            + this._pad(d.getUTCDate())+'T'
            + this._pad(d.getUTCHours())+':'
            + this._pad(d.getUTCMinutes())+':'
            + this._pad(d.getUTCSeconds())+'Z';
    }

});

var ActivityCollection = Backbone.Collection.extend({
    model: Activity,
    comparator: function (activity) {
        return activity.get('published');
    },
    url: function () {
        var u = 'activities';
        if (this.sync.instance && this.sync.instance.prefix) {
            u = this.sync.instance.prefix + u;
        }
        return u;
    }
});
