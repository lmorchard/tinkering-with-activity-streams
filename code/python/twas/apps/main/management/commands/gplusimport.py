from optparse import make_option

import time
import json
import requests

from django.db import connection
from django.core.management.base import BaseCommand, CommandError
from manage import path

from main.models import FeedSubscription, HttpResource

LOOKUP_URL = "https://plus.google.com/_/socialgraph/lookup/visible/?o=%5Bnull%2Cnull%2C%22{0}%22%5D"
STREAM_URL = "https://www.googleapis.com/plus/v1/people/{0}/activities/public?alt=json&pp=1&collection=public&key={1}"

class Command(BaseCommand):
    help = 'Import OPML subscriptions'
    args = 'filename'
    option_list = BaseCommand.option_list + (
        make_option('-a', '--apikey',
            action='store',
            dest='apikey',
            default='AIzaSyCLDWHNVCtBSs4E5z9rKZ6i8fzQsv0Wt18',
            help='Google+ API key'),
        make_option('-u', '--uid',
            action='store',
            dest='uid',
            help='Google+ user ID or home stream URL'),
        make_option('-o', '--output',
            action='store',
            dest='output',
            default='gplus-as-friend-urls.txt',
            help='Output file for list of Google+ AS URLs'),
    )

    can_import_settings = True

    def handle(self, *arg, **kwargs):

        uid = kwargs['uid']
        if uid.startswith('https://plus.google.com'):
            uid = uid.split('/')[3]

        lookup_url = LOOKUP_URL.format(uid)

        r = requests.get(lookup_url)
        ids = [line.split('"')[1] 
               for line in r.content.split("\n") 
               if line.startswith(',[[,,')]
        urls = [STREAM_URL.format(id, kwargs['apikey'])
                for id in ids]
        
        open(kwargs['output'], 'w').write("\n".join(urls))

        for url in urls:
            
            r = requests.get(url)
            print "(%s) %s" % (r.status_code, url)
            if 200 != r.status_code:
                continue

            now = int(time.time() * 1000)

            hr_id = HttpResource.new_id(url)
            hr = HttpResource.get_or_create(hr_id)
            hr.url = url
            hr.status = r.status_code
            hr.headers = r.headers
            hr.last_fetch_time = now
            hr.save()

            hr.put_attachment(r.content, 'body', hr.headers['content-type'])

            stream = json.loads(r.content)
            
            sub_id = FeedSubscription.new_id(url)
            sub = FeedSubscription.get_or_create(sub_id)
            sub.feed_type = 'as-json'
            sub.url = url
            sub.title = stream['title']
            sub.link = len(stream['items']) and stream['items'][0]['actor']['url'] or url
            sub.last_fetch_time = now
            sub.save()
