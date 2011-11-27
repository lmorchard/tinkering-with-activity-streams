import sys
import os
import base64
import time
import json
from uuid import uuid4

from datetime import tzinfo, timedelta, datetime
from optparse import make_option

import requests

from django.db import connection
from django.core.management.base import BaseCommand, CommandError
from manage import path

from twas.utils import opml

import couchdb
from main.models import Profile, FeedSubscription, HttpResource


PROFILES_BY_USER_NAME_VIEW = 'main/Profile-by-user-name'
FEEDSUBSCRIPTION_BY_PROFILE_ID_VIEW = 'main/FeedSubscription-by-profile-id'
ITEMS_BY_STREAM_URL = 'main/ActivityStreamItem-by-stream-url'
FETCH_MAX_AGE = 60 * 60 * 1000 # 1 hour


class TZ(tzinfo):
    def utcoffset(self, dt):
        return timedelta(minutes=0)


class Command(BaseCommand):
    help = 'Refresh subscribed feeds'
    option_list = BaseCommand.option_list + (
        make_option('-u', '--user',
            action='store', dest='user_name',
            default="",
            help='User name'),
    )
    can_import_settings = True

    def handle(self, *arg, **kwargs):

        self.couch = couchdb.Server()
        self.db = self.couch['twas']

        # Grab the profile for supplied user name
        p = Profile.view(PROFILES_BY_USER_NAME_VIEW,
                         key=kwargs['user_name']).first()
        if not p:
            raise CommandError('No profile named %s found' %
                               kwargs['user_name'])

        subs = FeedSubscription.view(FEEDSUBSCRIPTION_BY_PROFILE_ID_VIEW,
                                     key=p._id).all()
        for s in subs:
            if s['feed_type'] == 'as-json':
                self.parseJSON(s)

    def parseJSON(self, s):
        dt_now = datetime.utcnow().replace(tzinfo=TZ()).isoformat()

        # Fetch the HttpResource
        hr_id = HttpResource.new_id(s.url)
        hr = HttpResource.get(hr_id)
        if hr.status != 200:
            return False

        # Parse the JSON from the HttpResource
        content = hr.fetch_attachment('body')
        data = json.loads(content)
        print "Parsed %s items from %s" % (len(data['items']), s.url)

        # Fetch previous items for this stream URL, if any.
        prev_items = self.db.view(ITEMS_BY_STREAM_URL,
                                  key=s.url)
        items_by_id = dict((i.id, i.value) for i in prev_items)

        # Create / update items in DB from the stream.
        new_items = []
        for item in data['items']:
            _id = 'ActivityStreamItem:%s:%s' % (s.url, item['id'])
            db_item = items_by_id.get(_id, {})
            db_item.update(item)
            db_item['_id'] = _id
            db_item['doc_type'] = 'ActivityStreamItem'
            db_item['stream_url'] = s.url
            if 'parsed_first_at' not in db_item:
                db_item['parsed_first_at'] = dt_now
            db_item['parsed_update_at'] = dt_now
            new_items.append(db_item)

        results = self.db.update(new_items)
