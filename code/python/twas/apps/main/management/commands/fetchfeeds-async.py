import sys
import os
import base64
import time

from optparse import make_option

import requests
import requests.async

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
        print "Loading subs..."
        subscriptions = FeedSubscription.view(SUBS_VIEW)
        print "\t%s loaded" % len(subscriptions)

        if False:
            for s in subscriptions:
                self.fetchSubscription(s)

        if True:
            reqs = [x for x in [
                self.scheduleFetch(s)
                for s in subscriptions
            ] if x]
            rs = requests.async.map(reqs, size=16)
            print "DONE"

    def scheduleFetch(self, s):
        rs = self.resourceForSubscription(s)
        now = self.isFresh(rs)
        if False == now:
            return

        sys.stdout.write('.')
        sys.stdout.flush()

        h = self.buildConditionalGetHeaders(rs)
        req = requests.async.get(s.url, headers=h, hooks={
            "response": lambda r: self.processFetch(now, s, r, rs)
        })
        return req

    def fetchSubscription(self, s):
        rs = self.resourceForSubscription(s)
        now = self.isFresh(rs)
        if False == now:
            return

        h = self.buildConditionalGetHeaders(rs)

        try:
            # Try to fetch the resource...
            r = requests.get(s.url, headers=h)
        
        except Exception, e:
            # If there was any exception at all, save it.
            r = None
            rs.last_error = unicode(e)
            print "ERROR: %s" % e

        self.processFetch(now, s, r, rs)

    def processFetch(self, now, s, r, rs):
        if r:
            try:
                print "(%s) %s" % (r.status_code, s.url)

                if 200 == r.status_code:

                    # Capture some metadata about the resource
                    rs.url = s.url
                    rs.status = r.status_code
                    rs.headers = r.headers

                    # Try grabbing the resource content
                    rs.content = r.content

                    # If we made it here, we can forget the last error
                    rs.last_error = None
            
            except Exception, e:
                # If there was any exception at all, save it.
                rs.last_error = unicode(e)
                print "ERROR: %s" % e

        # Note the time of this fetch and save the record.
        rs.last_fetch_time = now
        rs.save()

    def isFresh(self, rs):
        """Check whether this resource has been fetched too 
        recently to fetch again."""
        now = int(time.time() * 1000)
        if not rs.last_fetch_time:
            return now
        if rs.last_error:
            return now
        if (now - rs.last_fetch_time) < FETCH_MAX_AGE:
            return now
        return False

    def resourceForSubscription(self, s):
        """Get a record for this resource, creating if necessary."""
        rs_id = HttpResource.new_id(s.url)
        rs = HttpResource.get_or_create(rs_id)
        return rs

    def buildConditionalGetHeaders(self, rs):
        """Set up request headers for conditional GET, if the right
        headers from last fetch are available."""
        h = {}
        if 'last-modified' in rs.headers:
            h['If-Modified-Since'] = rs.headers['last-modified']
        if 'etag' in rs.headers:
            h['If-None-Match'] = rs.headers['etag']
        return h
