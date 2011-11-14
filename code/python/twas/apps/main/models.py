from datetime import datetime

from django.db import models
from couchdbkit.ext.django.schema import (Document, StringProperty,
        IntegerProperty, DateTimeProperty, ListProperty, DictProperty)


def id_from_val(cls, val):
    return '%s:%s' % (cls.__name__, val)


class Profile(Document):
    user_name = StringProperty()
    display_name = StringProperty()
    bio = StringProperty()
    location = StringProperty()
    email = StringProperty()

    new_id = classmethod(id_from_val)


class FeedSubscription(Document):
    feed_type = StringProperty()
    title = StringProperty()
    url = StringProperty()
    parents = ListProperty()
    last_fetch_time = IntegerProperty()
    created = DateTimeProperty(default=datetime.utcnow)

    new_id = classmethod(id_from_val)


class HttpResource(Document):
    url = StringProperty()
    status = IntegerProperty()
    headers = DictProperty()
    last_fetch_time = IntegerProperty()
    last_error = StringProperty()

    new_id = classmethod(id_from_val)
