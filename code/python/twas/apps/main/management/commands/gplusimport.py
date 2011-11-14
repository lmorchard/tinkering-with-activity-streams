from optparse import make_option

import time
import json
import requests

from django.db import connection
from django.core.management.base import BaseCommand, CommandError
from manage import path

from main.models import Profile, FeedSubscription, HttpResource

PROFILES_BY_USER_NAME_VIEW = 'main/Profile-by-user-name'
FEEDSUBSCRIPTION_BY_PROFILE_ID_VIEW = 'main/FeedSubscription-by-profile-id'

LOOKUP_URL = "https://plus.google.com/_/socialgraph/lookup/visible/?o=%5Bnull%2Cnull%2C%22{0}%22%5D"
STREAM_URL = "https://www.googleapis.com/plus/v1/people/{0}/activities/public?alt=json&pp=1&collection=public&key={1}"

class Command(BaseCommand):
    help = 'Import OPML subscriptions'
    args = 'filename'
    option_list = BaseCommand.option_list + (
        make_option('-u', '--user',
            action='store', dest='user_name',
            default="",
            help='User name'),
        make_option('-a', '--apikey',
            action='store',
            dest='apikey',
            default='AIzaSyCLDWHNVCtBSs4E5z9rKZ6i8fzQsv0Wt18',
            help='Google+ API key'),
        make_option('-s', '--stream',
            action='store',
            dest='stream',
            help='Google+ user ID or home stream URL'),
        make_option('-o', '--output',
            action='store',
            dest='output',
            default='gplus-as-friend-urls.txt',
            help='Output file for list of Google+ AS URLs'),
    )

    can_import_settings = True

    def handle(self, *arg, **kwargs):

        # Grab the profile for supplied user name
        p = Profile.view(PROFILES_BY_USER_NAME_VIEW,
                         key=kwargs['user_name']).first()
        if not p:
            raise CommandError('No profile named %s found' %
                               kwargs['user_name'])

        # Look up subscriptions for profile.
        subs = FeedSubscription.view(FEEDSUBSCRIPTION_BY_PROFILE_ID_VIEW,
                                     key=p._id).all()
        subs_by_url = dict((s.url, s) for s in subs)

        uid = kwargs['stream']
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

            stream = json.loads(r.content)
                
            if url in subs_by_url:
                sub = subs_by_url[url]
                print "Updating %s" % url
            else:
                sub = FeedSubscription.get_or_create()
                print "Creating %s" % url
            
            sub.profile_id = p._id
            sub.feed_type = 'as-json'
            sub.url = url
            sub.title = stream['title']
            sub.link = len(stream['items']) and stream['items'][0]['actor']['url'] or url
            sub.last_fetch_time = now

            sub.save()

            hr_id = HttpResource.new_id(url)
            hr = HttpResource.get_or_create(hr_id)
            hr.url = url
            hr.status = r.status_code
            hr.headers = r.headers
            hr.last_fetch_time = now
            hr.save()

            hr.put_attachment(r.content, 'body', hr.headers['content-type'])
