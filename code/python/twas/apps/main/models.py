from datetime import datetime

from django.db import models
from couchdbkit.ext.django.schema import (Document, StringProperty,
        IntegerProperty, BooleanProperty, DateTimeProperty, 
        ListProperty, DictProperty)


def id_from_args(cls, *args):
    return ':'.join((cls.__name__,) + args)


class Profile(Document):
    user_name = StringProperty()
    display_name = StringProperty()
    bio = StringProperty()
    location = StringProperty()
    email = StringProperty()

    new_id = classmethod(id_from_args)


class FeedSubscription(Document):
    profile_id = StringProperty()
    feed_type = StringProperty()
    title = StringProperty()
    url = StringProperty()
    parents = ListProperty()
    last_fetch_time = IntegerProperty()
    disabled = BooleanProperty()
    created = DateTimeProperty(default=datetime.utcnow)

    new_id = classmethod(id_from_args)

class HttpResource(Document):
    url = StringProperty()
    status = IntegerProperty()
    headers = DictProperty()
    last_fetch_time = IntegerProperty()
    last_error = StringProperty()
    history = ListProperty()

    new_id = classmethod(id_from_args)
