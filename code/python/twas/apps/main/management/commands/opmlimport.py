from optparse import make_option

from django.db import connection
from django.core.management.base import BaseCommand, CommandError
from manage import path

from twas.utils import opml

from main.models import Profile, FeedSubscription


PROFILES_BY_USER_NAME_VIEW = 'main/Profile-by-user-name'
FEEDSUBSCRIPTION_BY_PROFILE_ID_VIEW = 'main/FeedSubscription-by-profile-id'


class Command(BaseCommand):
    help = 'Import OPML subscriptions'
    args = 'filename'
    option_list = BaseCommand.option_list + (
        make_option('-u', '--user',
            action='store', dest='user_name',
            default="",
            help='User name'),
    )
    can_import_settings = True

    def handle(self, *arg, **kwargs):
        if len(arg) < 1:
            raise CommandError('OPML filename required')

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

        with open(arg[0]) as fin:
            entries = opml.get_subscriptions(fin)
            for entry in entries:
                
                url = unicode(entry['xmlurl'])
                if url in subs_by_url:
                    sub = subs_by_url[url]
                    print "Updating %s" % entry['title']
                else:
                    sub = FeedSubscription.get_or_create()
                    print "Creating %s" % entry['title']

                sub.profile_id = p._id
                sub.feed_type = 'rss'
                sub.url = url
                sub.link = entry['url']
                sub.title = entry['title']
                sub.parents = [x['title'] for x in entry['parents']]

                sub.save()
