import sys
import os
import base64
import time

from optparse import make_option

import requests

from django.db import connection
from django.core.management.base import BaseCommand, CommandError
from manage import path

from twas.utils import opml

from main.models import FeedSubscription, HttpResource

SUBS_VIEW = 'main/FeedSubscription-all'
FETCH_MAX_AGE = 60 * 60 * 1000 # 1 hour

class Command(BaseCommand):
    help = 'Refresh subscribed feeds'
    can_import_settings = True

    def handle(self, *arg, **kwargs):
        subscriptions = FeedSubscription.view(SUBS_VIEW)
        for s in subscriptions:
            self.fetchSubscription(s)

    def fetchSubscription(self, s):
        hr_id = HttpResource.new_id(s.url)
        hr = HttpResource.get_or_create(hr_id)
        hr.url = s.url

        # Check whether this resource was fetched too recently to 
        # fetch again.
        now = int(time.time() * 1000)
        if (not hr.last_error and hr.last_fetch_time and
                (now - hr.last_fetch_time) < FETCH_MAX_AGE):
            return False

        # Set up request headers for conditional GET, if the right
        # headers from last fetch are available.
        h = {}
        if 'last-modified' in hr.headers:
            h['If-Modified-Since'] = hr.headers['last-modified']
        if 'etag' in hr.headers:
            h['If-None-Match'] = hr.headers['etag']

        content, content_type = None, None
        try:
            # Try to fetch the resource...
            print "%s" % (s.url)
            r = requests.get(s.url, headers=h, timeout=10.0)
            print "\t%s" % (r.status_code)

            if 304 == r.status_code:
                # 304 Not Modified means no need to update.
                return

            if 200 == r.status_code:
                # Try grabbing response content, 
                # clear error if successful.
                hr.status = r.status_code
                hr.headers = r.headers
                hr.last_error = None

                content = r.content
                content_type = r.headers['content-type']
            
            # TODO: Handle 3xx redirects.
        
        except Exception, e:
            # If there was any exception at all, save it.
            hr.last_error = unicode(e)
            print "ERROR: %s" % e

        # Note the time of this fetch and save the record.
        hr.last_fetch_time = now
        hr.save()

        if content is not None:
            hr.put_attachment(content, 'body', content_type)

        s.last_fetch_time = now
        s.save()

        return True
